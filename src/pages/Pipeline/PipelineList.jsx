import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { badgeClass } from '../../lib/health'
import { useAuth } from '../../context/AuthContext'
import { canManageWork } from '../../lib/roles'

const EMPTY_WORK = {
  title: '', department: '', research_type: '', submission_status: 'Pre-Submission',
  lead: '', venue: '', academic_year: ''
}

export default function PipelineList() {
  const nav = useNavigate()
  const { profile } = useAuth()
  const [searchParams] = useSearchParams()
  const [works, setWorks] = useState([])
  const [departments, setDepartments] = useState([])
  const [filters, setFilters] = useState({
    q: '', department: searchParams.get('department') || '', status: searchParams.get('status') || '',
    stage: searchParams.get('stage') || ''
  })
  const [showNew, setShowNew] = useState(false)
  const [draft, setDraft] = useState(EMPTY_WORK)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: w }, { data: d }] = await Promise.all([
      supabase.from('works').select('*').order('created_at', { ascending: false }),
      supabase.from('departments').select('*').eq('active', true)
    ])
    setWorks(w || [])
    setDepartments(d || [])
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
    if (!error) {
      setShowNew(false); setDraft(EMPTY_WORK)
      nav(`/pipeline/${data.id}`)
    }
  }

  const filtered = works.filter(w =>
    (!filters.q || w.title.toLowerCase().includes(filters.q.toLowerCase())) &&
    (!filters.department || w.department === filters.department || (w.departments || []).includes(filters.department)) &&
    (!filters.status || w.submission_status === filters.status) &&
    (!filters.stage || w.stage === filters.stage)
  )

  const canCreate = profile?.role === 'admin' || profile?.role === 'chair'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Research Pipeline</h1>
          <p className="text-slate-500 text-sm">All research outputs in progress or completed.</p>
        </div>
        {canCreate && <button className="btn btn-blue" onClick={() => setShowNew(true)}>+ New Work</button>}
      </div>

      <div className="card flex flex-wrap gap-3">
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
      </div>

      {showNew && (
        <div className="card space-y-3">
          <h3 className="font-bold">New Work</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label>Title</label><input value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} /></div>
            <div>
              <label>Department</label>
              <select value={draft.department} disabled={profile?.role === 'chair'}
                onChange={e => setDraft(d => ({ ...d, department: e.target.value }))}>
                <option value="">— Select —</option>
                {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <div><label>Lead Researcher</label><input value={draft.lead} onChange={e => setDraft(d => ({ ...d, lead: e.target.value }))} /></div>
            <div><label>Research Type</label><input value={draft.research_type} onChange={e => setDraft(d => ({ ...d, research_type: e.target.value }))} /></div>
          </div>
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
                  <td className="font-semibold">{w.title}</td>
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
