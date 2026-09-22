import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { badgeClass } from '../lib/health'
import { useAuth } from '../context/AuthContext'
import { canDecideSubmissions } from '../lib/roles'
import PageHeader from '../components/PageHeader'

function acceptedCounts(works, dept) {
  const a = works.filter(w => (w.department === dept || (w.departments || []).includes(dept)) && ['Accepted', 'Published'].includes(w.submission_status))
  return {
    q1: a.filter(w => w.research_type === 'Journal Article' && w.venue_quality === 'Q1').length,
    q2plus: a.filter(w => w.research_type === 'Journal Article' && ['Q1', 'Q2'].includes(w.venue_quality)).length,
    q3plus: a.filter(w => w.research_type === 'Journal Article' && ['Q1', 'Q2', 'Q3'].includes(w.venue_quality)).length,
    q4plus: a.filter(w => w.research_type === 'Journal Article' && ['Q1', 'Q2', 'Q3', 'Q4'].includes(w.venue_quality)).length,
    conference: a.filter(w => (w.research_type || '').toLowerCase().includes('conference') || w.venue_quality === 'Conference').length
  }
}

export default function Submissions() {
  const { profile } = useAuth()
  const [rows, setRows] = useState([])
  const [works, setWorks] = useState([])
  const [targets, setTargets] = useState([])
  const [history, setHistory] = useState({})
  const [openHistory, setOpenHistory] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: s }, { data: w }, { data: t }, { data: h }, { data: depts }] = await Promise.all([
      supabase.from('submissions').select('*').order('department'),
      supabase.from('works').select('*'),
      supabase.from('acceptance_targets').select('*'),
      supabase.from('submission_history').select('*').order('event_date', { ascending: false }),
      supabase.from('departments').select('*').eq('active', true)
    ])
    let submissionRows = s || []
    // Self-heal: make sure every active department (except Dean / Faculty-wide) has a
    // submissions row, in case one was added after the initial seed migration ran.
    const existingNames = new Set(submissionRows.map(r => r.department))
    const missing = (depts || []).filter(d => d.name !== 'Dean / Faculty-wide' && !existingNames.has(d.name))
    if (missing.length) {
      const { data: inserted } = await supabase.from('submissions').insert(
        missing.map(d => ({ department: d.name, status: 'Draft' }))
      ).select()
      submissionRows = [...submissionRows, ...(inserted || [])].sort((a, b) => a.department.localeCompare(b.department))
    }
    setRows(submissionRows); setWorks(w || []); setTargets(t || [])
    const grouped = {}
    ;(h || []).forEach(row => { (grouped[row.department] ||= []).push(row) })
    setHistory(grouped)
    setLoading(false)
  }

  async function submitForReview(row) {
    const stamp = new Date().toISOString().slice(0, 10)
    const sequence = row.sequence + 1
    await supabase.from('submissions').update({
      status: 'Submitted', submitted_date: stamp, prepared_by: profile.full_name, sequence
    }).eq('department', row.department)
    await supabase.from('submission_history').insert({
      department: row.department, sequence, status: 'Submitted', by_whom: profile.full_name, comments: row.comments
    })
    load()
  }

  async function decide(row, status) {
    const comments = prompt(`${status === 'Accepted' ? 'Acceptance' : 'Return'} comments (optional):`, row.comments || '') ?? row.comments
    await supabase.from('submissions').update({
      status, comments, attestation_confirmed: status === 'Accepted',
      attested_by: profile.full_name, attested_on: new Date().toISOString().slice(0, 10)
    }).eq('department', row.department)
    await supabase.from('submission_history').insert({
      department: row.department, sequence: row.sequence, status, by_whom: profile.full_name, comments
    })
    load()
  }

  function exportSubmission(row) {
    const deptWorks = works.filter(w => w.department === row.department || (w.departments || []).includes(row.department))
    const payload = { submission: row, works: deptWorks, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${row.department.replace(/\s+/g, '_')}_submission.json`; a.click()
    URL.revokeObjectURL(url)
  }

  const canDecide = canDecideSubmissions(profile)
  const canPrep = row => profile?.role === 'admin' || (profile?.role === 'chair' && profile.department === row.department)

  return (
    <div className="space-y-4">
      <PageHeader icon="📤" title="Submissions" subtitle="Each department's chair prepares and attests their research submission; the Dean reviews and decides." />
      <div className="card">
        {loading ? <p className="text-slate-400 text-sm">Loading…</p> : (
          <table>
            <thead><tr><th>Department</th><th>Status</th><th>Prepared by</th><th>Submitted</th><th>Comments</th><th></th></tr></thead>
            <tbody>
              {rows.map(r => (
                <React.Fragment key={r.department}>
                  <tr>
                    <td className="font-semibold">{r.department}</td>
                    <td><span className={`badge ${badgeClass(r.status)}`}>{r.status}</span></td>
                    <td>{r.prepared_by || '—'}</td>
                    <td>{r.submitted_date || '—'}</td>
                    <td className="text-xs text-slate-500 max-w-xs">{r.comments || '—'}</td>
                    <td className="space-x-1 whitespace-nowrap">
                      {canPrep(r) && r.status === 'Draft' && (
                        <button className="btn btn-soft !py-1 !px-2 text-xs" onClick={() => submitForReview(r)}>Submit for review</button>
                      )}
                      {canDecide && r.status === 'Submitted' && (
                        <>
                          <button className="btn btn-blue !py-1 !px-2 text-xs" onClick={() => decide(r, 'Accepted')}>Accept</button>
                          <button className="btn btn-ghost !py-1 !px-2 text-xs" onClick={() => decide(r, 'Returned')}>Return</button>
                        </>
                      )}
                      <button className="btn btn-ghost !py-1 !px-2 text-xs" onClick={() => exportSubmission(r)}>Attest & Export</button>
                      <button className="btn btn-ghost !py-1 !px-2 text-xs" onClick={() => setOpenHistory(openHistory === r.department ? null : r.department)}>
                        History ({(history[r.department] || []).length})
                      </button>
                    </td>
                  </tr>
                  {openHistory === r.department && (
                    <tr>
                      <td colSpan={6} className="bg-slate-50">
                        {(history[r.department] || []).length === 0 ? (
                          <p className="text-xs text-slate-400 py-2">No history yet.</p>
                        ) : (
                          <table className="my-2">
                            <thead><tr><th>Seq</th><th>Status</th><th>By</th><th>When</th><th>Comments</th></tr></thead>
                            <tbody>
                              {history[r.department].map(h => (
                                <tr key={h.id}><td>{h.sequence}</td><td>{h.status}</td><td>{h.by_whom}</td>
                                  <td className="text-xs">{new Date(h.event_date).toLocaleString()}</td><td className="text-xs">{h.comments || '—'}</td></tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3 className="font-bold mb-2">Consolidated Department Comparison</h3>
        <table>
          <thead><tr><th>Department</th><th>Q1</th><th>Q2+</th><th>Q3+</th><th>Q4+</th><th>Conference</th></tr></thead>
          <tbody>
            {rows.map(r => {
              const c = acceptedCounts(works, r.department)
              const t = targets.find(x => x.department === r.department) || { q1: 0, q2plus: 2, q3plus: 0, q4plus: 0, conference: 0 }
              return (
                <tr key={r.department}>
                  <td className="font-semibold">{r.department}</td>
                  <td>{c.q1}/{t.q1}</td><td>{c.q2plus}/{t.q2plus}</td><td>{c.q3plus}/{t.q3plus}</td>
                  <td>{c.q4plus}/{t.q4plus}</td><td>{c.conference}/{t.conference}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
