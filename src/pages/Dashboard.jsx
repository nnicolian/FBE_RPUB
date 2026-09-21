import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { deriveHealth, badgeClass } from '../lib/health'

function Bar({ label, value, max, onClick }) {
  const pct = max ? (value / max) * 100 : 0
  return (
    <div className={`flex items-center gap-2 py-1 ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
      <div className="w-36 text-xs font-semibold shrink-0">{label}</div>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-brand" style={{ width: `${pct}%` }} /></div>
      <div className="w-8 text-xs text-slate-400 text-right">{value}</div>
    </div>
  )
}

const MATURITY_LEVELS = ['Not Classified', 'Idea', 'Work in Progress', 'Conference-ready', 'Extended-publication-ready', 'Journal-ready']
const MAJOR_STAGES = ['Onboarding', 'Execution', 'Submission', 'Accepted']

export default function Dashboard() {
  const nav = useNavigate()
  const [works, setWorks] = useState([])
  const [departments, setDepartments] = useState([])
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: w }, { data: s }, { data: d }] = await Promise.all([
      supabase.from('works').select(`*, phases(*), milestones(*), risks(*), work_updates(*)`),
      supabase.from('oversight_settings').select('*').single(),
      supabase.from('departments').select('*').eq('active', true)
    ])
    setWorks(w || [])
    setSettings(s)
    setDepartments(d || [])
    setLoading(false)
  }

  if (loading) return <div className="text-slate-500">Loading dashboard…</div>

  const withHealth = works.map(w => ({
    ...w,
    health: deriveHealth(w, { phases: w.phases, milestones: w.milestones, risks: w.risks, updates: w.work_updates }, settings)
  }))

  const goFiltered = (params) => nav(`/pipeline?${new URLSearchParams(params).toString()}`)

  const metrics = [
    { label: 'Total works', value: works.length, go: () => nav('/pipeline') },
    { label: 'Pre-Submission', value: works.filter(w => w.submission_status === 'Pre-Submission').length, go: () => goFiltered({ status: 'Pre-Submission' }) },
    { label: 'Submitted', value: works.filter(w => ['Submitted', 'Submitted Abstract', 'Under Review', 'R&R'].includes(w.submission_status)).length, go: () => nav('/pipeline') },
    { label: 'Accepted', value: works.filter(w => w.submission_status === 'Accepted').length, go: () => goFiltered({ status: 'Accepted' }) },
    { label: 'Published', value: works.filter(w => w.submission_status === 'Published').length, go: () => goFiltered({ status: 'Published' }) },
    { label: 'Q1 Targets', value: works.filter(w => w.venue_quality === 'Q1').length, go: () => nav('/pipeline') },
    { label: 'Open Risks', value: works.reduce((n, w) => n + (w.risks || []).filter(r => r.status === 'Open').length, 0), go: () => nav('/pipeline') }
  ]

  const maxDept = Math.max(1, ...departments.map(d => works.filter(w => w.department === d.name || (w.departments || []).includes(d.name)).length))
  const maxMaturity = Math.max(1, ...MATURITY_LEVELS.map(m => works.filter(w => (w.research_maturity || 'Not Classified') === m).length))
  const journalCount = works.filter(w => w.research_type === 'Journal Article').length
  const confCount = works.filter(w => (w.research_type || '').toLowerCase().includes('conference')).length
  const q1Count = works.filter(w => w.venue_quality === 'Q1').length
  const q2plusCount = works.filter(w => ['Q1', 'Q2'].includes(w.venue_quality)).length

  const usedVenueWorks = works.filter(w => w.venue && w.venue !== 'N/A')
  const verifiedCount = usedVenueWorks.length // simplified: verification lookup omitted for performance; treat presence of venue as counted
  const attention = withHealth.filter(w => w.health.status !== 'Green').sort((a, b) => (a.health.status === 'Red' ? -1 : 1))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-slate-500 text-sm">Overview of the research pipeline across all departments.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {metrics.map(m => (
          <div key={m.label} className="card cursor-pointer hover:shadow-md transition" onClick={m.go}>
            <b className="text-2xl block">{m.value}</b>
            <span className="text-xs text-slate-400">{m.label}</span>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-bold mb-2">Pipeline by Major Stage</h3>
          <div className="grid grid-cols-2 gap-2">
            {MAJOR_STAGES.map(s => (
              <div key={s} className="bg-slate-50 border border-slate-200 rounded-lg p-2 cursor-pointer" onClick={() => goFiltered({ stage: s })}>
                <b className="text-lg block">{works.filter(w => w.stage === s).length}</b>
                <span className="text-xs text-slate-400">{s}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3 className="font-bold mb-2">Research by Department</h3>
          {departments.map(d => (
            <Bar key={d.id} label={d.name} max={maxDept}
              value={works.filter(w => w.department === d.name || (w.departments || []).includes(d.name)).length}
              onClick={() => goFiltered({ department: d.name })} />
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-bold mb-2">Research Type / Venue Quality</h3>
          <Bar label="Journal Articles" value={journalCount} max={Math.max(1, works.length)} />
          <Bar label="Conference Works" value={confCount} max={Math.max(1, works.length)} />
          <Bar label="Q1" value={q1Count} max={Math.max(1, works.length)} />
          <Bar label="Q2+" value={q2plusCount} max={Math.max(1, works.length)} />
        </div>
        <div className="card">
          <h3 className="font-bold mb-2">Research Maturity Distribution</h3>
          {MATURITY_LEVELS.map(m => (
            <Bar key={m} label={m} max={maxMaturity}
              value={works.filter(w => (w.research_maturity || 'Not Classified') === m).length} />
          ))}
        </div>
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
