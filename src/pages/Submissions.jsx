import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { badgeClass } from '../lib/health'
import { useAuth } from '../context/AuthContext'
import { canDecideSubmissions } from '../lib/roles'

export default function Submissions() {
  const { profile } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('submissions').select('*').order('department')
    setRows(data || [])
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

  const canDecide = canDecideSubmissions(profile)
  const canPrep = row => profile?.role === 'admin' || (profile?.role === 'chair' && profile.department === row.department)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Submissions</h1>
        <p className="text-slate-500 text-sm">Each department's chair prepares and attests their research submission; the Dean reviews and decides.</p>
      </div>
      <div className="card">
        {loading ? <p className="text-slate-400 text-sm">Loading…</p> : (
          <table>
            <thead><tr><th>Department</th><th>Status</th><th>Prepared by</th><th>Submitted</th><th>Comments</th><th></th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.department}>
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
