import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { badgeClass } from '../lib/health'

function toCsv(rows) {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const lines = [headers.join(',')]
  rows.forEach(r => lines.push(headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')))
  return lines.join('\n')
}

function Bar({ label, value, max }) {
  const pct = max ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="w-40 text-xs font-semibold shrink-0">{label}</div>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-brand" style={{ width: `${pct}%` }} /></div>
      <div className="w-8 text-xs text-slate-400 text-right">{value}</div>
    </div>
  )
}
function money(v) { return Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

const MATURITY_LEVELS = ['Not Classified', 'Idea', 'Work in Progress', 'Conference-ready', 'Extended-publication-ready', 'Journal-ready']
const STAGES = ['Onboarding', 'Execution', 'Advisory Review', 'Submission', 'Under Review', 'R&R', 'Accepted', 'Published']

export default function Reports() {
  const [works, setWorks] = useState([])
  const [researchers, setResearchers] = useState([])
  const [departments, setDepartments] = useState([])
  const [costEntries, setCostEntries] = useState([])
  const [filters, setFilters] = useState({ department: '', year: '', quality: '' })
  const [years, setYears] = useState([])
  const [customLabel, setCustomLabel] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: w }, { data: r }, { data: d }, { data: y }, { data: c }] = await Promise.all([
      supabase.from('works').select('*'),
      supabase.from('researchers').select('*').eq('active', true),
      supabase.from('departments').select('*').eq('active', true),
      supabase.from('academic_years').select('*').eq('active', true),
      supabase.from('cost_entries').select('*')
    ])
    setWorks(w || []); setResearchers(r || []); setDepartments(d || []); setYears(y || []); setCostEntries(c || [])
  }

  const filtered = works.filter(w =>
    (!filters.department || w.department === filters.department || (w.departments || []).includes(filters.department)) &&
    (!filters.year || w.academic_year === filters.year) &&
    (!filters.quality || w.venue_quality === filters.quality)
  )

  function exportCsv() {
    const rows = filtered.map(w => ({
      Title: w.title, Department: w.department, Lead: w.lead, Type: w.research_type,
      Venue: w.venue, Quality: w.venue_quality, Status: w.submission_status, Year: w.academic_year
    }))
    const blob = new Blob([toCsv(rows)], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'research_register.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const maxDept = Math.max(1, ...departments.map(d => filtered.filter(w => w.department === d.name || (w.departments || []).includes(d.name)).length))
  const maxStage = Math.max(1, ...STAGES.map(s => filtered.filter(w => w.stage === s).length))
  const maxMaturity = Math.max(1, ...MATURITY_LEVELS.map(m => filtered.filter(w => (w.research_maturity || 'Not Classified') === m).length))
  const maxQuality = Math.max(1, ...departments.map(d => filtered.filter(w => (w.department === d.name || (w.departments || []).includes(d.name)) && w.venue_quality).length))

  const leadRows = researchers.map(r => ({
    name: r.name, department: r.department,
    leadCount: filtered.filter(w => w.lead === r.name).length,
    coauthorCount: filtered.filter(w => (w.coauthors || []).includes(r.name)).length,
    acceptedCount: filtered.filter(w => ['Accepted', 'Published'].includes(w.submission_status) && (w.lead === r.name || (w.coauthors || []).includes(r.name))).length
  })).filter(r => r.leadCount || r.coauthorCount)

  const outcomeStatuses = ['Pre-Submission', 'Submitted Abstract', 'Submitted', 'Under Review', 'R&R', 'Accepted', 'Published', 'Returned']
  const maxOutcome = Math.max(1, ...outcomeStatuses.map(s => filtered.filter(w => w.submission_status === s).length))

  const worksCostTotal = w => costEntries.filter(c => c.work_id === w.id).reduce((n, c) => n + Number(c.amount || 0), 0)
  const totalCosts = filtered.reduce((n, w) => n + worksCostTotal(w), 0)
  const totalFunding = filtered.reduce((n, w) => n + Number(w.funding?.amountReceived || 0), 0)

  const allCustomLabels = [...new Set(filtered.flatMap(w => (w.custom_fields || []).map(cf => cf.label).filter(Boolean)))]
  const customRows = customLabel ? filtered.filter(w => (w.custom_fields || []).some(cf => cf.label === customLabel && cf.value)) : []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-slate-500 text-sm">Detailed analytics across the research portfolio.</p>
        </div>
        <button className="btn btn-blue" onClick={exportCsv}>Export CSV</button>
      </div>

      <div className="card flex flex-wrap gap-3">
        <select className="!w-48" value={filters.department} onChange={e => setFilters(f => ({ ...f, department: e.target.value }))}>
          <option value="">All departments</option>
          {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
        </select>
        <select className="!w-48" value={filters.year} onChange={e => setFilters(f => ({ ...f, year: e.target.value }))}>
          <option value="">All academic years</option>
          {years.map(y => <option key={y.id} value={y.name}>{y.name}</option>)}
        </select>
        <select className="!w-48" value={filters.quality} onChange={e => setFilters(f => ({ ...f, quality: e.target.value }))}>
          <option value="">All venue quality</option>
          {['Q1', 'Q2', 'Q3', 'Q4', 'Conference'].map(q => <option key={q}>{q}</option>)}
        </select>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-bold mb-2">Research by Department</h3>
          {departments.map(d => <Bar key={d.id} label={d.name} max={maxDept} value={filtered.filter(w => w.department === d.name || (w.departments || []).includes(d.name)).length} />)}
        </div>
        <div className="card">
          <h3 className="font-bold mb-2">Research by Stage</h3>
          {STAGES.map(s => <Bar key={s} label={s} max={maxStage} value={filtered.filter(w => w.stage === s).length} />)}
        </div>
      </div>

      <div className="card">
        <h3 className="font-bold mb-2">Research Maturity Distribution</h3>
        {MATURITY_LEVELS.map(m => <Bar key={m} label={m} max={maxMaturity} value={filtered.filter(w => (w.research_maturity || 'Not Classified') === m).length} />)}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-bold mb-2">Lead Researcher Pipeline</h3>
          {leadRows.length === 0 ? <p className="text-slate-400 text-sm">No matching researchers.</p> : (
            <table>
              <thead><tr><th>Researcher</th><th>Lead</th><th>Co-author</th><th>Accepted</th></tr></thead>
              <tbody>{leadRows.map(r => <tr key={r.name}><td className="font-semibold">{r.name}</td><td>{r.leadCount}</td><td>{r.coauthorCount}</td><td>{r.acceptedCount}</td></tr>)}</tbody>
            </table>
          )}
        </div>
        <div className="card">
          <h3 className="font-bold mb-2">Submission / Acceptance Outcomes</h3>
          {outcomeStatuses.map(s => <Bar key={s} label={s} max={maxOutcome} value={filtered.filter(w => w.submission_status === s).length} />)}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-bold mb-2">Venue Quality Distribution by Department</h3>
          {departments.map(d => {
            const deptWorks = filtered.filter(w => w.department === d.name || (w.departments || []).includes(d.name))
            const withQuality = deptWorks.filter(w => w.venue_quality).length
            return <Bar key={d.id} label={d.name} max={maxQuality} value={withQuality} />
          })}
        </div>
        <div className="card">
          <h3 className="font-bold mb-2">Research Costs and Funding Summary</h3>
          <table><tbody>
            <tr><th>Total Costs</th><td className="font-semibold">{money(totalCosts)}</td></tr>
            <tr><th>Total Funding</th><td className="font-semibold">{money(totalFunding)}</td></tr>
            <tr><th>Net Faculty Cost</th><td className="font-semibold">{money(totalCosts - totalFunding)}</td></tr>
          </tbody></table>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">Custom Field Report</h3>
        </div>
        <select className="!w-64 mb-3" value={customLabel} onChange={e => setCustomLabel(e.target.value)}>
          <option value="">Select custom field</option>
          {allCustomLabels.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        {customLabel && (
          customRows.length === 0 ? <p className="text-slate-400 text-sm">No works have a value for this field.</p> : (
            <table>
              <thead><tr><th>Title</th><th>Department</th><th>Value</th></tr></thead>
              <tbody>{customRows.map(w => (
                <tr key={w.id}>
                  <td className="font-semibold">{w.title}</td><td>{w.department}</td>
                  <td>{(w.custom_fields || []).find(cf => cf.label === customLabel)?.value || '—'}</td>
                </tr>
              ))}</tbody>
            </table>
          )
        )}
      </div>

      <div className="card">
        <h3 className="font-bold mb-2">Detailed Research Register</h3>
        <table>
          <thead><tr><th>Title</th><th>Department</th><th>Lead</th><th>Venue</th><th>Quality</th><th>Status</th><th>Year</th></tr></thead>
          <tbody>
            {filtered.map(w => (
              <tr key={w.id}>
                <td className="font-semibold">{w.title}</td><td>{w.department}</td><td>{w.lead}</td>
                <td>{w.venue || '—'}</td><td>{w.venue_quality || '—'}</td>
                <td><span className={`badge ${badgeClass(w.submission_status)}`}>{w.submission_status}</span></td>
                <td>{w.academic_year || '—'}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="text-center text-slate-400 py-6">No works match these filters.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
