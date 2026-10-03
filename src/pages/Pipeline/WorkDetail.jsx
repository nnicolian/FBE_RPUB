import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { badgeClass, deriveHealth } from '../../lib/health'
import { useAuth } from '../../context/AuthContext'
import { canManageWork } from '../../lib/roles'
import { useToast } from '../../context/ToastContext'

import OverviewTab from './tabs/OverviewTab'
import HierarchyTab from './tabs/HierarchyTab'
import AuthorsTab from './tabs/AuthorsTab'
import VenueTab from './tabs/VenueTab'
import FilesTab from './tabs/FilesTab'
import FinanceTab from './tabs/FinanceTab'
import MilestonesTab from './tabs/MilestonesTab'
import RisksTab from './tabs/RisksTab'
import UpdatesTab from './tabs/UpdatesTab'
import MsTab from './tabs/MsTab'
import NavigatorWorkspace from '../../components/navigator/Navigator'
import { FileText } from 'lucide-react'

// Committee Reviews tab removed: the pipeline is self-reported, with no approvals.
const TABS = [
  ['overview', 'Overview'], ['hierarchy', 'Pipeline Progress'], ['authors', 'Authors'],
  ['venue', 'Venue & Submission'], ['files', 'Deliverables & Files'],
  ['finance', 'Costs & Funding'], ['milestones', 'Milestones'], ['risks', 'Risks & Issues'], ['updates', 'Updates'], ['navigator', 'Research Navigator']
]
const STATUSES = ['Pre-Submission', 'Submitted', 'Submitted Abstract', 'Under Review', 'R&R', 'Resubmitted', 'Accepted', 'Published', 'Returned']

export default function WorkDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { profile } = useAuth()
  const { showToast } = useToast()
  const [work, setWork] = useState(null)
  const [phases, setPhases] = useState([])
  const [milestones, setMilestones] = useState([])
  const [risks, setRisks] = useState([])
  const [updates, setUpdates] = useState([])
  const [deliverables, setDeliverables] = useState([])
  const [costEntries, setCostEntries] = useState([])
  const [settings, setSettings] = useState(null)
  const [meetings, setMeetings] = useState([])
  const [dbCanEdit, setDbCanEdit] = useState(null)
  const [tab, setTab] = useState('overview')
  const [loading, setLoading] = useState(true)

  useEffect(() => { load(true) }, [id])

  // The first load shows a spinner; reloads after an edit refresh in place.
  async function load(initial = false) {
    if (initial) setLoading(true)
    const [{ data: w }, { data: p }, { data: m }, { data: r }, { data: u }, { data: d }, { data: c }, { data: s }, { data: sm }] = await Promise.all([
      supabase.from('works').select('*').eq('id', id).single(),
      supabase.from('phases').select('*, tasks(*)').eq('work_id', id).order('seq'),
      supabase.from('milestones').select('*').eq('work_id', id),
      supabase.from('risks').select('*').eq('work_id', id),
      supabase.from('work_updates').select('*').eq('work_id', id).order('update_date', { ascending: false }),
      supabase.from('deliverables').select('*').eq('work_id', id),
      supabase.from('cost_entries').select('*').eq('work_id', id),
      supabase.from('oversight_settings').select('*').single(),
      supabase.from('supervision_meetings').select('*').eq('work_id', id)
    ])
    setMeetings(sm || [])
    // Ask the database whether this user may edit this paper — it applies the exact
    // access rules (own papers, department for chairs, everything for the Coordinator).
    const { data: ok } = await supabase.rpc('can_write_work', { p_work: id })
    setDbCanEdit(ok === true)
    setWork(w); setPhases(p || []); setMilestones(m || []); setRisks(r || []); setUpdates(u || [])
    setDeliverables(d || []); setCostEntries(c || []); setSettings(s)
    setLoading(false)
  }

  if (loading) return <div className="text-slate-500">Loading…</div>
  if (!work) return <div className="text-rose-600">Work not found (or you don't have access to it).</div>

  const canEdit = dbCanEdit ?? canManageWork(profile, work)
  const health = deriveHealth(work, { phases, milestones, risks, updates }, settings)

  // Returns false when the save failed, so edit forms can stay open.
  async function patchWork(fields) {
    const { error } = await supabase.from('works').update(fields).eq('id', work.id)
    if (!error) setWork(w => ({ ...w, ...fields }))
    showToast(error ? `Could not save: ${error.message}` : 'Saved', error ? 'error' : 'success')
    return !error
  }

  async function deleteWork() {
    if (!confirm(`Delete "${work.title}"? This removes the paper and everything under it (phases, sub-tasks, milestones, risks, updates, files). This cannot be undone.`)) return
    await supabase.from('works').delete().eq('id', work.id)
    showToast('Paper deleted')
    nav('/pipeline')
  }

  return (
    <div className="space-y-4">
      <button className="text-sm text-brand font-semibold" onClick={() => nav('/pipeline')}>&larr; Back to pipeline</button>

      <div className="card bg-gradient-to-br from-white to-blue-50/60">
        <div className="flex justify-between items-start gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-ink-900 text-white flex items-center justify-center shrink-0"><FileText className="h-5 w-5" /></div>
            <div>
              <h1 className="text-xl font-bold leading-tight">{work.title}</h1>
              <p className="text-sm text-slate-500">{work.author_order || work.lead || 'No lead set'} · {[work.department, ...(work.departments || []).filter(d => d !== work.department)].join(' + ')} · {work.research_type || 'Type not set'}</p>
              <p className="text-xs text-slate-500 mt-1">Pipeline phase: <strong>{work.stage || '—'}</strong></p>
            </div>
          </div>
          <div className="text-right space-y-1 shrink-0">
            {canEdit ? (
              <select className="!w-44" value={work.submission_status} onChange={e => patchWork({ submission_status: e.target.value })}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : <span className={`badge ${badgeClass(work.submission_status)}`}>{work.submission_status}</span>}
            <div><span className={`badge ${badgeClass(health.status)}`}>{health.status} health</span></div>
            {canEdit && <button className="text-xs text-rose-500 font-semibold" onClick={deleteWork}>Delete this paper</button>}
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {(work.kpi_category === 'MS Student' ? [TABS[0], TABS[1], ['ms', 'MS Supervision'], ...TABS.slice(2)] : TABS).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-3 py-2 text-sm font-semibold border-b-2 transition whitespace-nowrap ${tab === key ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'ms' && <MsTab work={work} phases={phases} meetings={meetings} canEdit={canEdit} onPatch={patchWork} onReload={() => load()} />}
      {tab === 'overview' && <OverviewTab work={work} health={health} canEdit={canEdit} onPatch={patchWork} />}
      {tab === 'hierarchy' && <HierarchyTab work={work} phases={phases} canEdit={canEdit} onReload={() => load()} />}
      {tab === 'authors' && <AuthorsTab work={work} canEdit={canEdit} onPatch={patchWork} />}
      {tab === 'venue' && <VenueTab work={work} canEdit={canEdit} onPatch={patchWork} />}
      {tab === 'files' && <FilesTab work={work} deliverables={deliverables} canEdit={canEdit} onReload={() => load()} />}
      {tab === 'finance' && <FinanceTab work={work} costEntries={costEntries} canEdit={canEdit} onPatch={patchWork} onReload={() => load()} />}
      {tab === 'milestones' && <MilestonesTab work={work} milestones={milestones} canEdit={canEdit} onReload={() => load()} />}
      {tab === 'risks' && <RisksTab work={work} risks={risks} canEdit={canEdit} onReload={() => load()} />}
      {tab === 'navigator' && <NavigatorWorkspace work={work} canEdit={canEdit} onPatchWork={patchWork} />}
      {tab === 'updates' && <UpdatesTab work={work} updates={updates} canEdit={canEdit} onReload={() => load()} />}
    </div>
  )
}
