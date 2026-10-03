import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../context/ToastContext'
import { PHASES, MS_TIMELINE, MIN_MEETINGS_PER_PHASE } from '../../../lib/workOptions'
import { Check, Pencil } from 'lucide-react'

// MS student paper (Research Strategy §3, Appendix 5). The student is first author and has no
// login; the supervisor is co-author and keeps the paper's progress up to date here.

const today = () => new Date().toISOString().slice(0, 10)

export default function MsTab({ work, phases, meetings, canEdit, onPatch, onReload }) {
  const { profile } = useAuth()
  const { showToast } = useToast()
  const [supervisors, setSupervisors] = useState([])
  const [editing, setEditing] = useState(false)
  const [d, setD] = useState({ student_name: work.student_name || '', student_email: work.student_email || '', supervisor: work.supervisor || '', deanApproved: false })
  const [m, setM] = useState({ meeting_date: today(), phase: PHASES.includes(work.stage) ? work.stage : 'Initiate', notes: '' })

  useEffect(() => {
    supabase.from('researchers').select('name, department, research_areas, accepts_ms_students, type').eq('active', true).order('name')
      .then(({ data }) => setSupervisors((data || []).filter(r => r.type === 'Internal')))
  }, [])

  const initiateDone = phases.some(p => /initiate/i.test(p.name) && p.progress === 100)
  const supervisorChanging = !!work.supervisor && d.supervisor !== work.supervisor
  const needsDean = supervisorChanging && initiateDone

  async function save() {
    if (!d.student_name.trim()) { showToast('Enter the student\'s name.', 'error'); return }
    if (!d.supervisor) { showToast('Choose the supervisor.', 'error'); return }
    if (needsDean && !d.deanApproved) { showToast('Changing supervisor after Phase 1 needs Dean approval — tick the box once it is obtained.', 'error'); return }
    const others = (work.coauthors || []).filter(a => a && a !== work.supervisor && a !== d.supervisor)
    const ok = await onPatch({
      student_name: d.student_name.trim(), student_email: d.student_email.trim(), supervisor: d.supervisor,
      lead: d.student_name.trim(), coauthors: [d.supervisor, ...others]
    })
    if (ok === false) return
    if (supervisorChanging) {
      await supabase.from('work_updates').insert({
        work_id: work.id, update_date: today(), author: profile?.full_name || '',
        note: `Supervisor changed from ${work.supervisor} to ${d.supervisor}${needsDean ? ' (after Phase 1 — Dean approval recorded)' : ''}.`
      })
    }
    setEditing(false)
    onReload()
  }

  async function addMeeting() {
    const { error } = await supabase.from('supervision_meetings').insert({ work_id: work.id, ...m })
    showToast(error ? `Could not save: ${error.message}` : 'Meeting logged', error ? 'error' : 'success')
    if (!error) { setM(x => ({ ...x, notes: '' })); onReload() }
  }
  async function deleteMeeting(id) {
    if (!confirm('Delete this meeting record?')) return
    await supabase.from('supervision_meetings').delete().eq('id', id)
    onReload()
  }

  const counts = Object.fromEntries(PHASES.map(p => [p, meetings.filter(x => x.phase === p).length]))
  const sup = supervisors.find(s => s.name === work.supervisor)

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold">MS Student Paper</h3>
          {canEdit && !editing && <button className="btn btn-soft" onClick={() => { setD({ student_name: work.student_name || '', student_email: work.student_email || '', supervisor: work.supervisor || '', deanApproved: false }); setEditing(true) }}><Pencil className="h-3.5 w-3.5" /> Edit</button>}
        </div>
        {editing ? (
          <div className="space-y-3">
            <div className="grid md:grid-cols-3 gap-3">
              <div><label>Student (first author)</label><input value={d.student_name} onChange={e => setD(x => ({ ...x, student_name: e.target.value }))} /></div>
              <div><label>Student email</label><input type="email" value={d.student_email} onChange={e => setD(x => ({ ...x, student_email: e.target.value }))} /></div>
              <div>
                <label>Supervisor (co-author)</label>
                <select value={d.supervisor} onChange={e => setD(x => ({ ...x, supervisor: e.target.value }))}>
                  <option value="">— Choose —</option>
                  {supervisors.map(s => <option key={s.name} value={s.name}>{s.name}{s.accepts_ms_students ? ' · accepting MS students' : ''}</option>)}
                </select>
              </div>
            </div>
            {needsDean && (
              <label className="!mb-0 flex items-center gap-2 text-sm font-normal note">
                <input type="checkbox" className="!w-auto" checked={d.deanApproved} onChange={e => setD(x => ({ ...x, deanApproved: e.target.checked }))} />
                Phase 1 is complete, so a change of supervisor needs Dean approval. I confirm it has been obtained.
              </label>
            )}
            <div className="flex gap-2"><button className="btn btn-blue" onClick={save}>Save</button><button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button></div>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3"><div className="text-xs text-slate-400">Student · first author</div><div className="font-semibold text-sm mt-1">{work.student_name || '—'}</div><div className="text-xs text-slate-500">{work.student_email}</div></div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3"><div className="text-xs text-slate-400">Supervisor · co-author, updates progress</div><div className="font-semibold text-sm mt-1">{work.supervisor || '— not paired yet'}</div>{sup?.department && <div className="text-xs text-slate-500">{sup.department}</div>}</div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3"><div className="text-xs text-slate-400">Current phase</div><div className="font-semibold text-sm mt-1">{work.stage || '—'}</div><div className="text-xs text-slate-500">Target venue: Scopus, Q1–Q3 or ABS 2* minimum</div></div>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="font-bold mb-1">Supervision Meetings</h3>
        <p className="text-xs text-slate-500 mb-3">At least {MIN_MEETINGS_PER_PHASE} meetings per phase (8 across the full pipeline). Written feedback on drafts within two weeks.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          {PHASES.map(p => (
            <div key={p} className={`rounded-lg border p-2 ${counts[p] >= MIN_MEETINGS_PER_PHASE ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-slate-50'}`}>
              <div className="text-xs font-semibold">{p}</div>
              <div className="text-lg font-bold">{counts[p]} / {MIN_MEETINGS_PER_PHASE}{counts[p] >= MIN_MEETINGS_PER_PHASE && <Check className="h-4 w-4 inline ml-1 text-success-600" />}</div>
            </div>
          ))}
        </div>
        {canEdit && (
          <div className="grid md:grid-cols-6 gap-2 items-end mb-3">
            <div><label>Date</label><input type="date" value={m.meeting_date} onChange={e => setM(x => ({ ...x, meeting_date: e.target.value }))} /></div>
            <div><label>Phase</label><select value={m.phase} onChange={e => setM(x => ({ ...x, phase: e.target.value }))}>{PHASES.map(p => <option key={p}>{p}</option>)}</select></div>
            <div className="md:col-span-3"><label>Notes / feedback given</label><input value={m.notes} onChange={e => setM(x => ({ ...x, notes: e.target.value }))} /></div>
            <button className="btn btn-blue" onClick={addMeeting}>+ Log meeting</button>
          </div>
        )}
        {meetings.length === 0 ? <p className="text-sm text-slate-400">No meetings logged yet.</p> : (
          <table>
            <thead><tr><th>Date</th><th>Phase</th><th>Notes</th><th></th></tr></thead>
            <tbody>
              {meetings.slice().sort((a, b) => b.meeting_date.localeCompare(a.meeting_date)).map(x => (
                <tr key={x.id}>
                  <td className="whitespace-nowrap">{x.meeting_date}</td><td>{x.phase}</td><td className="text-sm">{x.notes || '—'}</td>
                  <td>{canEdit && <button className="text-xs text-rose-500" onClick={() => deleteMeeting(x.id)}>Delete</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3 className="font-bold mb-2">Indicative Timeline</h3>
        <table>
          <thead><tr><th>Phase</th><th>Expected</th><th>Milestone</th><th>Status</th></tr></thead>
          <tbody>
            {MS_TIMELINE.map(t => {
              const p = phases.find(ph => ph.name.toLowerCase().includes(t.phase.toLowerCase()))
              return (
                <tr key={t.phase}>
                  <td className="font-semibold">{t.phase}</td><td>{t.weeks}</td><td className="text-sm">{t.milestone}</td>
                  <td>{p ? <>{p.progress}%{p.progress === 100 && <Check className="h-3.5 w-3.5 inline ml-1 text-success-600" />}</> : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="note text-xs mt-3">
          <strong>Authorship rules:</strong> the student is always first author; the supervisor is co-author (never first).
          No other authors may be added without both agreeing and notifying the Research Coordinator. Ghost authorship is prohibited.
          All MS papers should be in the Build phase by the end of February.
        </div>
      </div>
    </div>
  )
}
