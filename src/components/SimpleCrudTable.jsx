import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// Generic editable table for small master-data lists (departments, researchers,
// venues, academic years, committee members). `fields` describes the columns.
export default function SimpleCrudTable({ table, fields, title, orderBy = 'name' }) {
  const [rows, setRows] = useState([])
  const [draft, setDraft] = useState(() => Object.fromEntries(fields.map(f => [f.key, f.default ?? ''])))
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from(table).select('*').order(orderBy)
    setRows(data || [])
    setLoading(false)
  }

  async function addRow() {
    if (fields.some(f => f.required && !draft[f.key])) return
    const { error } = await supabase.from(table).insert(draft)
    if (!error) {
      setDraft(Object.fromEntries(fields.map(f => [f.key, f.default ?? ''])))
      load()
    }
  }

  async function updateRow(id, key, value) {
    await supabase.from(table).update({ [key]: value }).eq('id', id)
    setRows(rs => rs.map(r => r.id === id ? { ...r, [key]: value } : r))
  }

  async function toggleActive(row) {
    await updateRow(row.id, 'active', !row.active)
  }

  return (
    <div className="card">
      <h3 className="font-bold mb-3">{title}</h3>
      {loading ? <p className="text-slate-400 text-sm">Loading…</p> : (
        <table>
          <thead><tr>{fields.map(f => <th key={f.key}>{f.label}</th>)}<th>Active</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                {fields.map(f => (
                  <td key={f.key}>
                    <input defaultValue={r[f.key]} className="!py-1 !border-0 focus:!border focus:!border-slate-300"
                      onBlur={e => e.target.value !== r[f.key] && updateRow(r.id, f.key, e.target.value)} />
                  </td>
                ))}
                <td>
                  <input type="checkbox" checked={!!r.active} onChange={() => toggleActive(r)} />
                </td>
              </tr>
            ))}
            <tr>
              {fields.map(f => (
                <td key={f.key}>
                  <input placeholder={f.label} value={draft[f.key]} onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))} />
                </td>
              ))}
              <td><button className="btn btn-soft !py-1 !px-2 text-xs" onClick={addRow}>+ Add</button></td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  )
}
