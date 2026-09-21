import { useState } from 'react'
import SimpleCrudTable from '../../components/SimpleCrudTable'
import Users from './Users'
import Settings from './Settings'

const TABS = ['Users & Roles', 'Departments', 'Researchers', 'Venues', 'Academic Years', 'Committee', 'Oversight Settings']

export default function AdminHome() {
  const [tab, setTab] = useState(TABS[0])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Configuration</h1>
        <p className="text-slate-500 text-sm">Master data, user roles, and oversight thresholds for the whole app.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`btn ${tab === t ? 'btn-blue' : 'btn-ghost'}`}>{t}</button>
        ))}
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
      {tab === 'Venues' && (
        <SimpleCrudTable table="venues" title="Venues"
          fields={[{ key: 'name', label: 'Name', required: true }, { key: 'type', label: 'Type', default: 'Journal' }, { key: 'quality', label: 'Quality (Q1-Q4/Conf)' }, { key: 'publisher', label: 'Publisher' }]} />
      )}
      {tab === 'Academic Years' && (
        <SimpleCrudTable table="academic_years" title="Academic Years"
          fields={[{ key: 'name', label: 'Name', required: true }]} />
      )}
      {tab === 'Committee' && (
        <SimpleCrudTable table="committee_members" title="Committee Members"
          fields={[{ key: 'name', label: 'Name', required: true }, { key: 'role', label: 'Role', default: 'Member' }]} />
      )}
      {tab === 'Oversight Settings' && <Settings />}
    </div>
  )
}
