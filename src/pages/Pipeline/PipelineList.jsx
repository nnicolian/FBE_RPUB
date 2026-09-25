import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { badgeClass } from '../../lib/health'
import { useAuth } from '../../context/AuthContext'
import { canManageWork, canCreateWork } from '../../lib/roles'
import PageHeader from '../../components/PageHeader'

const EMPTY_WORK = {
  title: '', department: '', research_type: 'Journal Article', submission_status: 'Pre-Submission',
  lead: '', corresponding: '', venue: '', venue_quality: '', academic_year: '', ethics: 'N/A'
}
const RESEARCH_TYPES = ['Journal Article', 'Conference Abstract', 'Conference Full Paper', 'Extended Paper / Book Chapter', 'Book', 'Book Chapter', 'Case Study', 'Working Paper', 'Technical / Policy Report', 'Other']

export default function PipelineList() {
  const nav = useNavigate()
  const { profile } = useAuth()
  const [searchParams] = useSearchParams()
  const [works, setWorks] = useState([])
  const [departments, setDepartments] = useState([])
  const [filters, setFilters] = useState({
    q: '', department: searchParams.get('department') || '', status: searchParams.get('status') || '',
    stage: searchParams.get('stage') || '', lead: searchParams.get('lead') || '', maturity: searchParams.get('maturity') || ''
  })
  const [showNew, setShowNew] = useState(false)
  const [draft, setDraft] = useState(EMPTY_WORK)
  const [years, setYears] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: w }, { data: d }, { data: y }] = await Promise.all([
      supabase.from('works').select('*').order('created_at', { ascending: false }),
      supabase.from('departments').select('*').eq('active', true),
      supabase.from('academic_years').select('*').eq('active', true)
    ])
    setWorks(w || [])
    setDepartments(d || [])
    setYears(y || [])
    if (profile?.role === 'chair' && profile.department) {
      setDraft(prev => ({ ...prev, department: profile.department }))
    }
    setLoading(false)
  }

  async function createWork() {
    if (!draft.title || !draft.department) return
    const { data, error } = await supabase.from('works').insert({
      ...draft, departments: [draft.department], created_by: profile?.id
    }).select().single()
    if (error) return

    // Apply the lifecycle template so the new paper starts with its standard phases,
    // matching the prototype's behavior instead of leaving Hierarchy empty.
    const { data: lt } = await supabase.from('lifecycle_template').select('template').single()
    const template = Array.isArray(lt?.template) && lt.template.length ? lt.template : null
    if (template) {
      for (let i = 0; i < template.length; i++) {
        const p = template[i]
        const { data: phase } = await supabase.from('phases').insert({
          work_id: data.id, name: p.name, seq: i, optional: !!p.optional,
          committee_required: !!p.committeeRequired, status: i === 0 ? 'In Progress' : 'Not Started',
          comments: p.instructions || '', committee_status: p.committeeRequired ? 'Pending' : 'Optional / Not Requested'
        }).select().single()
        for (const t of (p.tasks || [])) {
          await supabase.from('tasks').insert({ phase_id: phase.id, name: t.name, owner: draft.lead, comments: t.instructions || '' })
        }
      }
    }

    setShowNew(false); setDraft(EMPTY_WORK)
    nav(`/pipeline/${data.id}`)
  }

  const filtered = works.filter(w =>
    (!filters.q || w.title.toLowerCase().includes(filters.q.toLowerCase())) &&
    (!filters.department || w.department === filters.department || (w.departments || []).includes(filters.department)) &&
    (!filters.status || w.submission_status === filters.status) &&
    (!filters.stage || w.stage === filters.stage) &&
    (!filters.lead || w.lead === filters.lead || (w.coauthors || []).includes(filters.lead)) &&
    (!filters.maturity || (w.research_maturity || 'Not Classified') === filters.maturity)
  )

  const canCreate = canCreateWork(profile)

  return (
    <div className="space-y-4">
      <PageHeader icon="📚" title="Research Pipeline" subtitle="All research outputs in progress or completed."
        action={canCreate && <button className="btn btn-blue" onClick={() => setShowNew(true)}>+ New Work</button>} />

      <div className="card flex flex-wrap gap-3 items-center">
        <input placeholder="Search title…" className="!w-64" value={filters.q}
          onChange={e => setFilters(f => ({ ...f, q: e.target.value }))} />
        <select className="!w-48" value={filters.department} onChange={e => setFilters(f => ({ ...f, department: e.target.value }))}>
          <option value="">All departments</option>
          {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
        </select>
        <select className="!w-48" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="">All statuses</option>
          {['Pre-Submission', 'Submitted', 'Submitted Abstract', 'Under Review', 'R&R', 'Resubmitted', 'Accepted', 'Published', 'Returned'].map(s =>
            <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="!w-48" value={filters.stage} onChange={e => setFilters(f => ({ ...f, stage: e.target.value }))}>
          <option value="">All stages</option>
          {['Onboarding', 'Execution', 'Advisory Review', 'Submission', 'Under Review', 'R&R', 'Accepted', 'Published'].map(s =>
            <option key={s} value={s}>{s}</option>)}
        </select>
        {(filters.lead || filters.maturity) && (
          <span className="text-xs text-slate-500">
            {filters.lead && <>Lead/co-author: <strong>{filters.lead}</strong> </>}
            {filters.maturity && <>Maturity: <strong>{filters.maturity}</strong> </>}
            <button className="text-brand underline ml-1" onClick={() => setFilters(f => ({ ...f, lead: '', maturity: '' }))}>clear</button>
          </span>
        )}
      </div>

      {showNew && (
        <div className="card space-y-3">
          <h3 className="font-bold">New Work</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2"><label>Title</label><input value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} /></div>
            <div>
              <label>Department</label>
              <select value={draft.department} disabled={profile?.role === 'chair'}
                onChange={e => setDraft(d => ({ ...d, department: e.target.value }))}>
                <option value="">— Select —</option>
                {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <div><label>Lead Researcher</label><input value={draft.lead} onChange={e => setDraft(d => ({ ...d, lead: e.target.value }))} /></div>
            <div><label>Corresponding Author</label><input value={draft.corresponding} onChange={e => setDraft(d => ({ ...d, corresponding: e.target.value }))} /></div>
            <div>
              <label>Research Type</label>
              <select value={draft.research_type} onChange={e => setDraft(d => ({ ...d, research_type: e.target.value }))}>
                {RESEARCH_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label>Academic Year</label>
              <select value={draft.academic_year} onChange={e => setDraft(d => ({ ...d, academic_year: e.target.value }))}>
                <option value="">— Select —</option>
                {years.map(y => <option key={y.id} value={y.name}>{y.name}</option>)}
              </select>
            </div>
            <div><label>Target Venue</label><input value={draft.venue} onChange={e => setDraft(d => ({ ...d, venue: e.target.value }))} placeholder="N/A if not yet decided" /></div>
            <div>
              <label>Venue Quality</label>
              <select value={draft.venue_quality} onChange={e => setDraft(d => ({ ...d, venue_quality: e.target.value }))}>
                <option value="">—</option>{['Q1', 'Q2', 'Q3', 'Q4', 'Conference'].map(q => <option key={q}>{q}</option>)}
              </select>
            </div>
            <div>
              <label>Ethics Status</label>
              <select value={draft.ethics} onChange={e => setDraft(d => ({ ...d, ethics: e.target.value }))}>
                {['N/A', 'Pending', 'Approved'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <p className="text-xs text-slate-400">The standard research lifecycle (phases and tasks) will be added automatically — edit Configuration → Lifecycle Template to change what gets applied.</p>
          <div className="flex gap-2">
            <button className="btn btn-blue" onClick={createWork}>Create</button>
            <button className="btn btn-ghost" onClick={() => setShowNew(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card">
        {loading ? <p className="text-slate-400 text-sm">Loading…</p> : (
          <table>
            <thead><tr><th>Title</th><th>Department</th><th>Lead</th><th>Venue</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {filtered.map(w => (
                <tr key={w.id}>
                  <td className="font-semibold"><button className="text-brand hover:underline text-left" onClick={() => nav(`/pipeline/${w.id}`)}>{w.title}</button></td>
                  <td>{w.department}</td>
                  <td>{w.lead}</td>
                  <td>{w.venue || '—'}</td>
                  <td><span className={`badge ${badgeClass(w.submission_status)}`}>{w.submission_status}</span></td>
                  <td><button className="btn btn-ghost !py-1 !px-2 text-xs" onClick={() => nav(`/pipeline/${w.id}`)}>Open</button></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="text-center text-slate-400 py-6">No works match these filters.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
