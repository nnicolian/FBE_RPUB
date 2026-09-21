import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { badgeClass, deriveHealth } from '../../lib/health'
import { useAuth } from '../../context/AuthContext'
import { canManageWork } from '../../lib/roles'

import OverviewTab from './tabs/OverviewTab'
import HierarchyTab from './tabs/HierarchyTab'
import AuthorsTab from './tabs/AuthorsTab'
import VenueTab from './tabs/VenueTab'
import CommitteeTab from './tabs/CommitteeTab'
import FilesTab from './tabs/FilesTab'
import FinanceTab from './tabs/FinanceTab'
import MilestonesTab from './tabs/MilestonesTab'
import RisksTab from './tabs/RisksTab'
import UpdatesTab from './tabs/UpdatesTab'

const TABS = [
  ['overview', 'Overview'], ['hierarchy', 'Hierarchy'], ['authors', 'Authors'],
  ['venue', 'Venue & Submission'], ['committee', 'Committee Reviews'], ['files', 'Deliverables & Files'],
  ['finance', 'Costs & Funding'], ['milestones', 'Milestones'], ['risks', 'Risks & Issues'], ['updates', 'Updates']
]
const STATUSES = ['Pre-Submission', 'Submitted', 'Submitted Abstract', 'Under Review', 'R&R', 'Resubmitted', 'Accepted', 'Published', 'Returned']

export default function WorkDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { profile } = useAuth()
  const [work, setWork] = useState(null)
  const [phases, setPhases] = useState([])
  const [milestones, setMilestones] = useState([])
  const [risks, setRisks] = useState([])
  const [updates, setUpdates] = useState([])
  const [deliverables, setDeliverables] = useState([])
  const [costEntries, setCostEntries] = useState([])
  const [tab, setTab] = useState('overview')
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const [{ data: w }, { data: p }, { data: m }, { data: r }, { data: u }, { data: d }, { data: c }] = await Promise.all([
      supabase.from('works').select('*').eq('id', id).single(),
      supabase.from('phases').select('*, tasks(*, subtasks(*)), review_rounds(*)').eq('work_id', id).order('seq'),
      supabase.from('milestones').select('*').eq('work_id', id),
      supabase.from('risks').select('*').eq('work_id', id),
      supabase.from('work_updates').select('*').eq('work_id', id).order('update_date', { ascending: false }),
      supabase.from('deliverables').select('*').eq('work_id', id),
      supabase.from('cost_entries').select('*').eq('work_id', id)
    ])
    setWork(w); setPhases(p || []); setMilestones(m || []); setRisks(r || []); setUpdates(u || [])
    setDeliverables(d || []); setCostEntries(c || [])
    setLoading(false)
  }

  if (loading) return <div className="text-slate-500">Loading…</div>
  if (!work) return <div className="text-rose-600">Work not found (or you don't have access to it).</div>

  const canEdit = canManageWork(profile, work)
  const health = deriveHealth(work, { phases, milestones, risks, updates }, null)

  async function patchWork(fields) {
    const { error } = await supabase.from('works').update(fields).eq('id', work.id)
    if (!error) setWork(w => ({ ...w, ...fields }))
  }

  return (
    <div className="space-y-4">
      <button className="text-sm text-brand font-semibold" onClick={() => nav('/pipeline')}>&larr; Back to pipeline</button>

      <div className="card">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h1 className="text-xl font-bold">Research Paper Workspace — {work.title}</h1>
            <p className="text-sm text-slate-500">{work.author_order || work.lead || 'No lead set'} · {[work.department, ...(work.departments || []).filter(d => d !== work.department)].join(' + ')} · {work.research_type || 'Type not set'}</p>
          </div>
          <div className="text-right space-y-1 shrink-0">
            {canEdit ? (
              <select className="!w-44" value={work.submission_status} onChange={e => patchWork({ submission_status: e.target.value })}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : <span className={`badge ${badgeClass(work.submission_status)}`}>{work.submission_status}</span>}
            <div><span className={`badge ${badgeClass(health.status)}`}>{health.status} health</span></div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {TABS.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`btn ${tab === key ? 'btn-blue' : 'btn-ghost'} !text-xs`}>{label}</button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab work={work} health={health} canEdit={canEdit} onPatch={patchWork} />}
      {tab === 'hierarchy' && <HierarchyTab work={work} phases={phases} canEdit={canEdit} onReload={load} />}
      {tab === 'authors' && <AuthorsTab work={work} canEdit={canEdit} onPatch={patchWork} />}
      {tab === 'venue' && <VenueTab work={work} canEdit={canEdit} onPatch={patchWork} />}
      {tab === 'committee' && <CommitteeTab phases={phases} onReload={load} />}
      {tab === 'files' && <FilesTab work={work} deliverables={deliverables} canEdit={canEdit} onReload={load} />}
      {tab === 'finance' && <FinanceTab work={work} costEntries={costEntries} canEdit={canEdit} onPatch={patchWork} onReload={load} />}
      {tab === 'milestones' && <MilestonesTab work={work} milestones={milestones} canEdit={canEdit} onReload={load} />}
      {tab === 'risks' && <RisksTab work={work} risks={risks} canEdit={canEdit} onReload={load} />}
      {tab === 'updates' && <UpdatesTab work={work} updates={updates} canEdit={canEdit} onReload={load} />}
    </div>
  )
}
