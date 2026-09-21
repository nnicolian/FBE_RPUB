import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

const FIELDS = [['q1', 'Q1'], ['q2plus', 'Q2+'], ['q3plus', 'Q3+'], ['q4plus', 'Q4+'], ['conference', 'Conference']]

export default function Targets() {
  const [targets, setTargets] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: t }, { data: d }] = await Promise.all([
      supabase.from('acceptance_targets').select('*'),
      supabase.from('departments').select('*').eq('active', true)
    ])
    // ensure every department has a row to edit, even if not yet in the table
    const existing = new Map((t || []).map(x => [x.department, x]))
    const merged = d.filter(dep => dep.name !== 'Dean / Faculty-wide').map(dep =>
      existing.get(dep.name) || { department: dep.name, q1: 0, q2plus: 2, q3plus: 0, q4plus: 0, conference: 0 })
    setTargets(merged)
    setDepartments(d || [])
    setLoading(false)
  }

  async function save(dept, fields) {
    await supabase.from('acceptance_targets').upsert({ department: dept, ...fields })
    setTargets(ts => ts.map(t => t.department === dept ? { ...t, ...fields } : t))
  }

  return (
    <div className="card">
      <h3 className="font-bold mb-1">Quality-Tier Acceptance Targets</h3>
      <p className="text-xs text-slate-500 mb-3">Targets are cumulative thresholds: Q1 counts toward Q2-or-better, Q3-or-better, and Q4-or-better.</p>
      {loading ? <p className="text-slate-400 text-sm">Loading…</p> : (
        <table>
          <thead><tr><th>Department</th>{FIELDS.map(([, l]) => <th key={l}>{l}</th>)}</tr></thead>
          <tbody>
            {targets.map(t => (
              <tr key={t.department}>
                <td className="font-semibold">{t.department}</td>
                {FIELDS.map(([key]) => (
                  <td key={key}>
                    <input type="number" min={0} className="!w-20 !py-1" defaultValue={t[key]}
                      onBlur={e => save(t.department, { [key]: Number(e.target.value) })} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
