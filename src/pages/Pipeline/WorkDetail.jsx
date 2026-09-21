import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { badgeClass, deriveHealth } from '../../lib/health'
import { useAuth } from '../../context/AuthContext'
import { canManageWork, canReviewAsCommittee } from '../../lib/roles'

const STATUSES = ['Pre-Submission', 'Submitted', 'Under Review', 'R&R', 'Resubmitted', 'Accepted', 'Published', 'Returned']
const TASK_STATUSES = ['Not Started', 'In Progress', 'Completed', 'Blocked']

export default function WorkDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { profile } = useAuth()
  const [work, setWork] = useState(null)
  const [phases, setPhases] = useState([])
  const [milestones, setMilestones] = useState([])
  const [risks, setRisks] = useState([])
  const [updates, setUpdates] = useState([])
  const [tab, setTab] = useState('overview')
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const [{ data: w }, { data: p }, { data: m }, { data: r }, { data: u }] = await Promise.all([
      supabase.from('works').select('*').eq('id', id).single(),
      supabase.from('phases').select('*, tasks(*, subtasks(*)), review_rounds(*)').eq('work_id', id).order('seq'),
      supabase.from('milestones').select('*').eq('work_id', id),
      supabase.from('risks').select('*').eq('work_id', id),
      supabase.from('work_updates').select('*').eq('work_id', id).order('update_date', { ascending: false })
    ])
    setWork(w); setPhases(p || []); setMilestones(m || []); setRisks(r || []); setUpdates(u || [])
    setLoading(false)
  }

  if (loading) return <div className="text-slate-500">Loading…</div>
  if (!work) return <div className="text-rose-600">Work not found (or you don't have access to it).</div>

  const canEdit = canManageWork(profile, work)
  const health = deriveHealth(work, { phases, milestones, risks, updates })

  async function patchWork(fields) {
    const { error } = await supabase.from('works').update(fields).eq('id', work.id)
    if (!error) setWork(w => ({ ...w, ...fields }))
  }

  async function addPhase() {
    const name = prompt('Phase name?')
    if (!name) return
    const { data } = await supabase.from('phases').insert({ work_id: work.id, name, seq: phases.length }).select().single()
    setPhases(p => [...p, { ...data, tasks: [], review_rounds: [] }])
  }

  async function addTask(phaseId) {
    const name = prompt('Task name?')
    if (!name) return
    const { data } = await supabase.from('tasks').insert({ phase_id: phaseId, name }).select().single()
    setPhases(ps => ps.map(p => p.id === phaseId ? { ...p, tasks: [...(p.tasks || []), { ...data, subtasks: [] }] } : p))
  }

  async function updateTaskStatus(phaseId, taskId, status) {
    await supabase.from('tasks').update({ status }).eq('id', taskId)
    setPhases(ps => ps.map(p => p.id !== phaseId ? p : {
      ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, status } : t)
    }))
  }

  async function updatePhaseProgress(phaseId, progress) {
    await supabase.from('phases').update({ progress }).eq('id', phaseId)
    setPhases(ps => ps.map(p => p.id === phaseId ? { ...p, progress } : p))
  }

  async function addReviewRound(phase) {
    const reviewer = prompt('Reviewer name?')
    if (!reviewer) return
    const round = (phase.review_rounds?.length || 0) + 1
    const { data } = await supabase.from('review_rounds').insert({
      phase_id: phase.id, round, reviewer, status: 'Pending', review_date: new Date().toISOString().slice(0, 10)
    }).select().single()
    setPhases(ps => ps.map(p => p.id === phase.id ? { ...p, review_rounds: [...(p.review_rounds || []), data] } : p))
  }

  async function decideReviewRound(phase, roundRow, status) {
    await supabase.from('review_rounds').update({ status }).eq('id', roundRow.id)
    await supabase.from('phases').update({ committee_status: status, committee_date: new Date().toISOString().slice(0, 10) }).eq('id', phase.id)
    setPhases(ps => ps.map(p => p.id !== phase.id ? p : {
      ...p,
      committee_status: status,
      review_rounds: p.review_rounds.map(r => r.id === roundRow.id ? { ...r, status } : r)
    }))
  }

  async function addUpdate() {
    const note = prompt('Update note?')
    if (!note) return
    const { data } = await supabase.from('work_updates').insert({
      work_id: work.id, note, author: profile?.full_name, update_date: new Date().toISOString().slice(0, 10)
    }).select().single()
    setUpdates(u => [data, ...u])
  }

  async function addRisk() {
    const description = prompt('Risk/issue description?')
    if (!description) return
    const { data } = await supabase.from('risks').insert({ work_id: work.id, description, type: 'Risk', impact: 'Medium', status: 'Open' }).select().single()
    setRisks(r => [...r, data])
  }

  async function closeRisk(riskId) {
    await supabase.from('risks').update({ status: 'Closed' }).eq('id', riskId)
    setRisks(r => r.map(x => x.id === riskId ? { ...x, status: 'Closed' } : x))
  }

  return (
    <div className="space-y-4">
      <button className="text-sm text-brand font-semibold" onClick={() => nav('/pipeline')}>&larr; Back to pipeline</button>

      <div className="card">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold">{work.title}</h1>
            <p className="text-sm text-slate-500">{work.department} · {work.lead || 'No lead set'} · {work.research_type || 'Type not set'}</p>
          </div>
          <div className="text-right space-y-1">
            <span className={`badge ${badgeClass(work.submission_status)}`}>{work.submission_status}</span>
            <div><span className={`badge ${badgeClass(health.status)}`}>{health.status} health</span></div>
          </div>
        </div>
        {health.reasons.length > 0 && (
          <p className="text-xs text-amber-700 mt-2">{health.reasons.join('; ')}</p>
        )}
        {canEdit && (
          <div className="flex gap-3 mt-4 flex-wrap items-end">
            <div>
              <label>Submission status</label>
              <select value={work.submission_status} onChange={e => patchWork({ submission_status: e.target.value })}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label>Venue</label>
              <input defaultValue={work.venue} onBlur={e => patchWork({ venue: e.target.value })} />
            </div>
            <div>
              <label>Ethics</label>
              <select value={work.ethics} onChange={e => patchWork({ ethics: e.target.value })}>
                {['N/A', 'Pending', 'Approved'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {['overview', 'phases', 'committee', 'risks', 'updates'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`btn ${tab === t ? 'btn-blue' : 'btn-ghost'} capitalize`}>{t}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="card">
          <h3 className="font-bold mb-3">Milestones</h3>
          <table>
            <thead><tr><th>Milestone</th><th>Due</th><th>Status</th></tr></thead>
            <tbody>
              {milestones.map(m => (
                <tr key={m.id}><td>{m.name}</td><td>{m.due || '—'}</td>
                  <td><span className={`badge ${badgeClass(m.status)}`}>{m.status}</span></td></tr>
              ))}
              {milestones.length === 0 && <tr><td colSpan={3} className="text-slate-400 text-center py-4">No milestones yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'phases' && (
        <div className="space-y-3">
          {canEdit && <button className="btn btn-soft" onClick={addPhase}>+ Add Phase</button>}
          {phases.map(p => (
            <div key={p.id} className="card">
              <div className="flex justify-between items-center">
                <h3 className="font-bold">{p.name}</h3>
                <div className="flex items-center gap-2">
                  {canEdit && (
                    <input type="number" min={0} max={100} value={p.progress}
                      className="!w-20" onChange={e => updatePhaseProgress(p.id, Number(e.target.value))} />
                  )}
                  <span className={`badge ${badgeClass(p.status)}`}>{p.status}</span>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {(p.tasks || []).map(t => (
                  <div key={t.id} className="flex justify-between items-center border-b border-slate-100 py-1.5 text-sm">
                    <span>{t.name} {t.owner && <span className="text-slate-400">· {t.owner}</span>}</span>
                    {canEdit ? (
                      <select className="!w-40 !py-1" value={t.status} onChange={e => updateTaskStatus(p.id, t.id, e.target.value)}>
                        {TASK_STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    ) : <span className={`badge ${badgeClass(t.status)}`}>{t.status}</span>}
                  </div>
                ))}
                {canEdit && <button className="text-xs text-brand font-semibold mt-1" onClick={() => addTask(p.id)}>+ Add task</button>}
              </div>
            </div>
          ))}
          {phases.length === 0 && <p className="text-slate-400 text-sm">No phases defined yet.</p>}
        </div>
      )}

      {tab === 'committee' && (
        <div className="space-y-3">
          {phases.filter(p => p.committee_required).map(p => (
            <div key={p.id} className="card">
              <div className="flex justify-between items-center">
                <h3 className="font-bold">{p.name}</h3>
                <span className={`badge ${badgeClass(p.committee_status)}`}>{p.committee_status}</span>
              </div>
              <table className="mt-2">
                <thead><tr><th>Round</th><th>Reviewer</th><th>Date</th><th>Status</th>{canReviewAsCommittee(profile) && <th></th>}</tr></thead>
                <tbody>
                  {(p.review_rounds || []).map(r => (
                    <tr key={r.id}>
                      <td>{r.round}</td><td>{r.reviewer}</td><td>{r.review_date || '—'}</td>
                      <td><span className={`badge ${badgeClass(r.status)}`}>{r.status}</span></td>
                      {canReviewAsCommittee(profile) && (
                        <td className="space-x-1">
                          <button className="btn btn-ghost !py-1 !px-2 text-xs" onClick={() => decideReviewRound(p, r, 'Blessed')}>Bless</button>
                          <button className="btn btn-ghost !py-1 !px-2 text-xs" onClick={() => decideReviewRound(p, r, 'Changes Requested')}>Request changes</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {canReviewAsCommittee(profile) && (
                <button className="text-xs text-brand font-semibold mt-2" onClick={() => addReviewRound(p)}>+ New review round</button>
              )}
            </div>
          ))}
          {phases.filter(p => p.committee_required).length === 0 && (
            <p className="text-slate-400 text-sm">No phases in this work require committee review.</p>
          )}
        </div>
      )}

      {tab === 'risks' && (
        <div className="card">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold">Risks & Issues</h3>
            {canEdit && <button className="btn btn-soft" onClick={addRisk}>+ Add</button>}
          </div>
          <table>
            <thead><tr><th>Description</th><th>Type</th><th>Impact</th><th>Status</th>{canEdit && <th></th>}</tr></thead>
            <tbody>
              {risks.map(r => (
                <tr key={r.id}>
                  <td>{r.description}</td><td>{r.type}</td><td>{r.impact}</td>
                  <td><span className={`badge ${badgeClass(r.status)}`}>{r.status}</span></td>
                  {canEdit && r.status === 'Open' && <td><button className="btn btn-ghost !py-1 !px-2 text-xs" onClick={() => closeRisk(r.id)}>Close</button></td>}
                </tr>
              ))}
              {risks.length === 0 && <tr><td colSpan={5} className="text-center text-slate-400 py-4">No risks logged.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'updates' && (
        <div className="card">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold">Progress Updates</h3>
            {canEdit && <button className="btn btn-soft" onClick={addUpdate}>+ Add update</button>}
          </div>
          <ul className="space-y-2 text-sm">
            {updates.map(u => (
              <li key={u.id} className="border-b border-slate-100 pb-2">
                <span className="text-slate-400">{u.update_date}</span> — {u.note} <span className="text-slate-400">({u.author})</span>
              </li>
            ))}
            {updates.length === 0 && <p className="text-slate-400">No updates logged yet.</p>}
          </ul>
        </div>
      )}
    </div>
  )
}
