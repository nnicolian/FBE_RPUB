import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { deriveHealth, badgeClass, daysFrom, latestUpdateDate } from '../lib/health'
import { STAGES, kpiLabel } from '../lib/workOptions'

// Printable pipeline summary for the Dean (Research Strategy, Appendices 2, 4 and 8):
// monthly summary, mid-year KPI review (February), full-year review (June), committee reports.
// Shows the papers the signed-in user can open; KPI numbers are Faculty-wide.

export const REPORT_TYPES = {
  monthly: { title: 'Monthly Pipeline Summary', intro: 'Paper count by phase and department, papers needing outreach, and recent publications.' },
  midyear: { title: 'Mid-Year KPI Review (February)', intro: 'Progress against the annual KPI, at-risk papers and the intervention plan. MS papers should be in Build by the end of February.' },
  annual: { title: 'Full-Year Research Report (June)', intro: 'Published papers tallied against the 14-paper target; the basis for next year\'s research plan.' },
  quarterly: { title: 'Research Committee — Quarterly Progress Report', intro: 'Quarterly report of the Research Committee to the Dean.' }
}

export default function PipelineSummary({ type = 'monthly', year = '2026–2027', extra = null }) {
  const nav = useNavigate()
  const [works, setWorks] = useState(null)
  const [settings, setSettings] = useState(null)
  const [kpi, setKpi] = useState([])

  useEffect(() => {
    Promise.all([
      supabase.from('works').select('*, milestones(*), risks(*), work_updates(*)'),
      supabase.from('oversight_settings').select('*').single(),
      supabase.rpc('kpi_summary', { p_year: year })
    ]).then(([{ data: w }, { data: s }, { data: k }]) => { setWorks(w || []); setSettings(s); setKpi(k || []) })
  }, [year])

  if (!works) return <p className="text-sm text-slate-400">Preparing report…</p>

  const meta = REPORT_TYPES[type] || REPORT_TYPES.monthly
  const inYear = works.filter(w => !w.academic_year || w.academic_year === year)
  const withHealth = inYear.map(w => ({ ...w, health: deriveHealth(w, { milestones: w.milestones, risks: w.risks, updates: w.work_updates }, settings) }))
  const depts = [...new Set(inYear.map(w => w.department).filter(Boolean))].sort()
  const atRisk = withHealth.filter(w => w.health.status !== 'Green' && w.stage !== 'Published').sort((a, b) => (a.health.status === 'Red' ? -1 : 1))
  const stationary = withHealth.filter(w => w.stage !== 'Published' && !['Accepted', 'Published'].includes(w.submission_status) && daysFrom(latestUpdateDate(w, w.work_updates)) > (settings?.stale_days || 30))
  const ms = inYear.filter(w => w.kpi_category === 'MS Student')
  const published = inYear.filter(w => w.submission_status === 'Published').sort((a, b) => String(b.published_on || '').localeCompare(String(a.published_on || '')))
  const recent = published.filter(w => w.published_on && daysFrom(w.published_on) <= 45)
  const showcase = inYear.filter(w => w.stage === 'Refine')
  const counting = kpi.filter(r => r.category !== 'Not counted')
  const target = counting.reduce((n, r) => n + r.target, 0)
  const counted = counting.reduce((n, r) => n + r.counted, 0)
  const accepted = counting.reduce((n, r) => n + r.accepted, 0)

  const Paper = ({ w, children }) => (
    <tr className="cursor-pointer hover:bg-slate-50 print:cursor-auto" onClick={() => nav(`/pipeline/${w.id}`)}>
      <td className="font-semibold">{w.title}</td><td>{w.department}</td><td>{w.lead}</td><td>{w.stage || '—'}</td>{children}
    </tr>
  )

  return (
    <div className="print-area space-y-4 print:space-y-3">
      {/* Print only the report, whatever page it sits on. */}
      <style>{`@media print { body * { visibility: hidden; } .print-area, .print-area * { visibility: visible; } .print-area { position: absolute; left: 0; top: 0; width: 100%; } }`}</style>
      <div className="card print:shadow-none print:border-0">
        <div className="flex justify-between items-start gap-3">
          <div>
            <div className="text-xs text-slate-400">AUST · Faculty of Business & Economics · {year}</div>
            <h2 className="text-xl font-bold">{meta.title}</h2>
            <p className="text-sm text-slate-500">{meta.intro}</p>
            <p className="text-xs text-slate-400 mt-1">Prepared {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <button className="btn btn-soft print:hidden" onClick={() => window.print()}>🖨 Print / Save as PDF</button>
        </div>
      </div>

      <div className="card">
        <h3 className="font-bold mb-2">KPI — Scopus-indexed publications</h3>
        <p className="text-sm mb-2"><b className="text-lg">{counted}</b> of {target} published · {accepted} accepted (likely) · {Math.max(0, target - counted - accepted)} still needed</p>
        <table>
          <thead><tr><th>Category</th><th>Target</th><th>Published</th><th>Accepted</th><th>Submitted</th><th>In progress</th></tr></thead>
          <tbody>{kpi.map(r => <tr key={r.category}><td>{kpiLabel(r.category)}</td><td>{r.target}</td><td>{r.counted}</td><td>{r.accepted}</td><td>{r.submitted}</td><td>{r.in_progress}</td></tr>)}</tbody>
        </table>
      </div>

      <div className="card">
        <h3 className="font-bold mb-2">Papers by phase and department</h3>
        <div className="overflow-x-auto">
          <table>
            <thead><tr><th>Department</th>{STAGES.map(s => <th key={s}>{s}</th>)}<th>Total</th></tr></thead>
            <tbody>
              {depts.map(d => (
                <tr key={d}><td className="font-semibold">{d}</td>
                  {STAGES.map(s => <td key={s}>{inYear.filter(w => w.department === d && w.stage === s).length || '·'}</td>)}
                  <td className="font-semibold">{inYear.filter(w => w.department === d).length}</td></tr>
              ))}
              <tr className="font-bold"><td>All</td>{STAGES.map(s => <td key={s}>{inYear.filter(w => w.stage === s).length}</td>)}<td>{inYear.length}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 className="font-bold mb-2">At-risk papers — proactive outreach</h3>
        {atRisk.length === 0 ? <p className="text-sm text-slate-400">No papers need attention.</p> : (
          <table>
            <thead><tr><th>Title</th><th>Department</th><th>Lead</th><th>Phase</th><th>Health</th><th>Reasons</th></tr></thead>
            <tbody>{atRisk.map(w => <Paper key={w.id} w={w}><td><span className={`badge ${badgeClass(w.health.status)}`}>{w.health.status}</span></td><td className="text-xs">{w.health.reasons.join('; ')}</td></Paper>)}</tbody>
          </table>
        )}
        <p className="text-xs text-slate-400 mt-2">{stationary.length} paper{stationary.length === 1 ? '' : 's'} without movement for more than {settings?.stale_days || 30} days.</p>
      </div>

      {(type !== 'monthly' || ms.length > 0) && (
        <div className="card">
          <h3 className="font-bold mb-2">MS student papers</h3>
          {ms.length === 0 ? <p className="text-sm text-slate-400">No MS papers registered yet.</p> : (
            <table>
              <thead><tr><th>Title</th><th>Department</th><th>Student</th><th>Phase</th><th>Supervisor</th><th>Status</th></tr></thead>
              <tbody>{ms.map(w => <Paper key={w.id} w={w}><td>{w.supervisor || '—'}</td><td><span className={`badge ${badgeClass(w.submission_status)}`}>{w.submission_status}</span></td></Paper>)}</tbody>
            </table>
          )}
        </div>
      )}

      <div className="card">
        <h3 className="font-bold mb-2">{type === 'annual' ? 'Published this year' : 'Recently published — for the research bulletin'}</h3>
        {(type === 'annual' ? published : recent).length === 0 ? <p className="text-sm text-slate-400">No publications {type === 'annual' ? 'recorded this year' : 'in the last 45 days'}.</p> : (
          <table>
            <thead><tr><th>Title</th><th>Department</th><th>Authors</th><th>Phase</th><th>Venue</th><th>Published</th><th>Counts</th></tr></thead>
            <tbody>{(type === 'annual' ? published : recent).map(w => (
              <Paper key={w.id} w={w}><td>{w.venue}</td><td>{w.published_on || '—'}</td><td>{w.scopus_indexed && w.kpi_category !== 'Not counted' ? '✓' : '—'}</td></Paper>
            ))}</tbody>
          </table>
        )}
      </div>

      {(type === 'monthly' || type === 'midyear') && (
        <div className="card">
          <h3 className="font-bold mb-2">Phase 3 papers — submission push & showcase candidates</h3>
          {showcase.length === 0 ? <p className="text-sm text-slate-400">No papers in Refine.</p> : (
            <table>
              <thead><tr><th>Title</th><th>Department</th><th>Lead</th><th>Phase</th><th>Target venue</th></tr></thead>
              <tbody>{showcase.map(w => <Paper key={w.id} w={w}><td>{w.venue || '—'}</td></Paper>)}</tbody>
            </table>
          )}
        </div>
      )}

      {extra}
    </div>
  )
}
