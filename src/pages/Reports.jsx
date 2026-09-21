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

export default function Reports() {
  const [works, setWorks] = useState([])
  const [filters, setFilters] = useState({ department: '', year: '', quality: '' })
  const [departments, setDepartments] = useState([])
  const [years, setYears] = useState([])

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: w }, { data: d }, { data: y }] = await Promise.all([
      supabase.from('works').select('*'),
      supabase.from('departments').select('*').eq('active', true),
      supabase.from('academic_years').select('*').eq('active', true)
    ])
    setWorks(w || []); setDepartments(d || []); setYears(y || [])
  }

  const filtered = works.filter(w =>
    (!filters.department || w.department === filters.department) &&
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-slate-500 text-sm">Detailed research register, filterable and exportable.</p>
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

      <div className="card">
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
