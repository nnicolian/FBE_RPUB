import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { badgeClass } from '../../lib/health'
import { useAuth } from '../../context/AuthContext'
import { canCreateWork, canSeeAllWorks } from '../../lib/roles'
import { STAGES, KPI_CATEGORIES } from '../../lib/workOptions'
import PageHeader from '../../components/PageHeader'

const EMPTY_WORK = {
  title: '', department: '', research_type: 'Journal Article', submission_status: 'Pre-Submission',
  lead: '', corresponding: '', venue: '', venue_quality: '', academic_year: '', ethics: 'N/A', kpi_category: 'FT Independent',
  student_name: '', supervisor: ''
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
  // 'template' = Configuration → Lifecycle Template, 'none' = start empty, otherwise a work id to copy from
  const [hierarchySource, setHierarchySource] = useState('template')
  const [createError, setCreateError] = useState(null)
  const [creating, setCreating] = useState(false)
  const [years, setYears] = useState([])
  const [supervisors, setSupervisors] = useState([])
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
    supabase.from('researchers').select('name, type, accepts_ms_students').eq('active', true).order('name')
      .then(({ data: r }) => setSupervisors((r || []).filter(x => x.type === 'Internal')))
    if (profile?.role === 'chair' && profile.department) {
      setDraft(prev => ({ ...prev, department: profile.department }))
    }
    setLoading(false)
  }

  async function createWork() {
    if (!draft.title || !draft.department) { setCreateError('Enter a title and choose a department.'); return }
    const isMs = draft.kpi_category === 'MS Student'
    if (isMs && (!draft.student_name.trim() || !draft.supervisor)) { setCreateError('For an MS paper, enter the student and choose the supervisor.'); return }
    setCreating(true); setCreateError(null)
    // MS papers: the student is first author and the supervisor co-author (Appendix 5).
    const row = isMs
      ? { ...draft, lead: draft.student_name.trim(), coauthors: [draft.supervisor], student_name: draft.student_name.trim() }
      : { ...draft, student_name: '', supervisor: '' }
    const { data, error } = await supabase.from('works').insert({
      ...row, departments: [draft.department], created_by: profile?.id
    }).select().single()
    if (error) { setCreating(false); setCreateError(error.message); return }

    if (hierarchySource !== 'template' && hierarchySource !== 'none') {
      // Copy phases → tasks → subtasks from another paper (fresh statuses and dates).
      const { error: copyErr } = await supabase.rpc('copy_work_hierarchy', {
        p_source_work: hierarchySource, p_target_work: data.id, p_owner: draft.lead || ''
      })
      if (copyErr) {
        setCreating(false)
        setCreateError(`The paper was created, but its hierarchy couldn't be copied: ${copyErr.message}`)
        return
      }
    }

    // Apply the lifecycle template: the 4 phases and their sub-tasks, each sub-task
    // carrying its "What 100% looks like" guidance. Progress rolls up automatically.
    const { data: lt } = hierarchySource === 'template'
      ? await supabase.from('lifecycle_template').select('template').single()
      : { data: null }
    const template = Array.isArray(lt?.template) && lt.template.length ? lt.template : null
    if (template) {
      for (let i = 0; i < template.length; i++) {
        const p = template[i]
        const { data: phase, error: phErr } = await supabase.from('phases').insert({
          work_id: data.id, name: p.name, seq: i, optional: !!p.optional,
          committee_required: false, committee_status: 'Optional / Not Requested',
          status: 'Not Started', comments: p.instructions || ''
        }).select().single()
        if (phErr) { setCreating(false); setCreateError(`The paper was created, but its phases couldn't be added: ${phErr.message}`); return }
        const tasks = (p.tasks || []).map((t, j) => ({
          phase_id: phase.id, name: t.name, seq: j, owner: draft.lead || '', guidance: t.instructions || '', comments: ''
        }))
        if (tasks.length) await supabase.from('tasks').insert(tasks)
      }
    }

    setCreating(false)
    setShowNew(false); setDraft(EMPTY_WORK); setHierarchySource('template')
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
      <PageHeader icon="📚" title="Research Pipeline" subtitle={canSeeAllWorks(profile) ? "All research outputs in progress or completed." : profile?.role === 'chair' ? `Papers in ${profile.department || 'your department'} and papers you author.` : "Your papers — the ones you lead or co-author."}
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
          <option value="">All phases</option>
          {STAGES.map(s =>
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
            {draft.kpi_category !== 'MS Student' && <div><label>Lead Researcher</label><input value={draft.lead} onChange={e => setDraft(d => ({ ...d, lead: e.target.value }))} /></div>}
            <div><label>Corresponding Author</label><input value={draft.corresponding} onChange={e => setDraft(d => ({ ...d, corresponding: e.target.value }))} /></div>
            <div>
              <label>Research Type</label>
              <select value={draft.research_type} onChange={e => setDraft(d => ({ ...d, research_type: e.target.value }))}>
                {RESEARCH_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label>KPI Category</label>
              <select value={draft.kpi_category} onChange={e => setDraft(d => ({ ...d, kpi_category: e.target.value }))}>
                {KPI_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            {draft.kpi_category === 'MS Student' && (
              <>
                <div><label>MS Student (first author)</label><input value={draft.student_name} onChange={e => setDraft(d => ({ ...d, student_name: e.target.value }))} /></div>
                <div>
                  <label>Supervisor (co-author)</label>
                  <select value={draft.supervisor} onChange={e => setDraft(d => ({ ...d, supervisor: e.target.value }))}>
                    <option value="">— Choose —</option>
                    {supervisors.map(r => <option key={r.name} value={r.name}>{r.name}{r.accepts_ms_students ? ' · accepting MS students' : ''}</option>)}
                  </select>
                </div>
              </>
            )}
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
          <div>
            <label>Pipeline (phases and sub-tasks)</label>
            <select value={hierarchySource} onChange={e => setHierarchySource(e.target.value)}>
              <option value="template">Standard lifecycle template</option>
              <optgroup label="Copy from another paper">
                {works.map(w => <option key={w.id} value={w.id}>{w.title}{w.department ? ` — ${w.department}` : ''}</option>)}
              </optgroup>
              <option value="none">Start empty</option>
            </select>
            <p className="text-xs text-slate-400 mt-1">
              {hierarchySource === 'template' ? 'The Faculty 4-phase pipeline: Initiate → Build → Refine → Publish (Configuration → Lifecycle Template).'
                : hierarchySource === 'none' ? 'No phases are added; you can build the hierarchy yourself.'
                : "Copies that paper's phases and sub-tasks with their names and guidance. Progress and dates start fresh, and owners are set to the lead researcher."}
            </p>
          </div>
          {createError && <p className="text-sm text-rose-600">{createError}</p>}
          <div className="flex gap-2">
            <button className="btn btn-blue" disabled={creating} onClick={createWork}>{creating ? 'Creating…' : 'Create'}</button>
            <button className="btn btn-ghost" onClick={() => { setShowNew(false); setCreateError(null) }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card">
        {loading ? <p className="text-slate-400 text-sm">Loading…</p> : (
          <table>
            <thead><tr><th>Title</th><th>Department</th><th>Lead</th><th>Phase</th><th>Venue</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {filtered.map(w => (
                <tr key={w.id}>
                  <td className="font-semibold"><button className="text-brand hover:underline text-left" onClick={() => nav(`/pipeline/${w.id}`)}>{w.title}</button></td>
                  <td>{w.department}</td>
                  <td>{w.lead}</td>
                  <td>{w.stage || '—'}</td>
                  <td>{w.venue || '—'}</td>
                  <td><span className={`badge ${badgeClass(w.submission_status)}`}>{w.submission_status}</span></td>
                  <td><button className="btn btn-ghost !py-1 !px-2 text-xs" onClick={() => nav(`/pipeline/${w.id}`)}>Open</button></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="text-center text-slate-400 py-6">No works match these filters.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
