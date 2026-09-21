import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { deriveHealth, badgeClass } from '../lib/health'

export default function Dashboard() {
  const nav = useNavigate()
  const [works, setWorks] = useState([])
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: w }, { data: s }] = await Promise.all([
      supabase.from('works').select(`
        *, phases(*), milestones(*), risks(*), work_updates(*)
      `),
      supabase.from('oversight_settings').select('*').single()
    ])
    setWorks(w || [])
    setSettings(s)
    setLoading(false)
  }

  if (loading) return <div className="text-slate-500">Loading dashboard…</div>

  const withHealth = works.map(w => ({
    ...w,
    health: deriveHealth(w, { phases: w.phases, milestones: w.milestones, risks: w.risks, updates: w.work_updates }, settings)
  }))

  const metrics = [
    { label: 'Total works', value: works.length },
    { label: 'In pipeline', value: works.filter(w => !['Accepted', 'Published'].includes(w.submission_status)).length },
    { label: 'Accepted / Published', value: works.filter(w => ['Accepted', 'Published'].includes(w.submission_status)).length },
    { label: 'Under review', value: works.filter(w => w.submission_status === 'Under Review').length },
    { label: 'Red health', value: withHealth.filter(w => w.health.status === 'Red').length },
    { label: 'Amber health', value: withHealth.filter(w => w.health.status === 'Amber').length },
    { label: 'Open risks/issues', value: works.reduce((n, w) => n + (w.risks || []).filter(r => r.status === 'Open').length, 0) }
  ]

  const attention = withHealth.filter(w => w.health.status !== 'Green').sort((a, b) => (a.health.status === 'Red' ? -1 : 1))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-slate-500 text-sm">Overview of the research pipeline across all departments.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {metrics.map(m => (
          <div key={m.label} className="card">
            <b className="text-2xl block">{m.value}</b>
            <span className="text-xs text-slate-400">{m.label}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">Management Attention</h3>
          <button className="btn btn-soft" onClick={() => nav('/pipeline')}>Open Pipeline</button>
        </div>
        {attention.length === 0 ? (
          <p className="text-sm text-slate-400">Nothing needs attention right now.</p>
        ) : (
          <table>
            <thead><tr><th>Title</th><th>Department</th><th>Health</th><th>Reasons</th><th></th></tr></thead>
            <tbody>
              {attention.map(w => (
                <tr key={w.id}>
                  <td className="font-semibold">{w.title}</td>
                  <td>{w.department}</td>
                  <td><span className={`badge ${badgeClass(w.health.status)}`}>{w.health.status}</span></td>
                  <td className="text-xs text-slate-500">{w.health.reasons.join('; ') || '—'}</td>
                  <td><button className="btn btn-ghost !py-1 !px-2 text-xs" onClick={() => nav(`/pipeline/${w.id}`)}>Open</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
