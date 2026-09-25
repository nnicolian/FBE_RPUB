import { useState } from 'react'
import SimpleCrudTable from '../../components/SimpleCrudTable'
import Users from './Users'
import Settings from './Settings'
import Targets from './Targets'
import VenuesFull from './VenuesFull'
import LifecycleTemplate from './LifecycleTemplate'
import PageHeader from '../../components/PageHeader'

// Configuration is admin-only (route guard in App.jsx and the database policies).
const TABS = ['Users & Roles', 'Departments', 'Researchers', 'Venues', 'Academic Years', 'Committee', 'Acceptance Targets', 'Oversight Settings', 'Lifecycle Template']

export default function AdminHome() {
  const [tab, setTab] = useState(TABS[0])

  return (
    <div className="space-y-4">
      <PageHeader icon="⚙️" title="Configuration" subtitle="Master data, user roles, and oversight thresholds for the whole app." />

      <div className="border-b border-slate-200 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-2 text-sm font-semibold border-b-2 transition whitespace-nowrap ${tab === t ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === 'Users & Roles' && <Users />}
      {tab === 'Departments' && (
        <SimpleCrudTable table="departments" title="Departments"
          fields={[{ key: 'code', label: 'Code', required: true }, { key: 'name', label: 'Name', required: true }, { key: 'chair_name', label: 'Chair' }]} />
      )}
      {tab === 'Researchers' && (
        <SimpleCrudTable table="researchers" title="Researchers"
          fields={[{ key: 'name', label: 'Name', required: true }, { key: 'department', label: 'Department' }, { key: 'type', label: 'Type', default: 'Internal' }, { key: 'email', label: 'Email' }]} />
      )}
      {tab === 'Venues' && <VenuesFull />}
      {tab === 'Academic Years' && (
        <SimpleCrudTable table="academic_years" title="Academic Years"
          fields={[{ key: 'name', label: 'Name', required: true }]} />
      )}
      {tab === 'Committee' && (
        <SimpleCrudTable table="committee_members" title="Committee Members"
          fields={[{ key: 'name', label: 'Name', required: true }, { key: 'role', label: 'Role', default: 'Member' }]} />
      )}
      {tab === 'Acceptance Targets' && <Targets />}
      {tab === 'Oversight Settings' && <Settings />}
      {tab === 'Lifecycle Template' && <LifecycleTemplate />}
    </div>
  )
}
