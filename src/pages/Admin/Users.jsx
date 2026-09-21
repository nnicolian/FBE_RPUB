import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { ROLES, ROLE_LABELS } from '../../lib/roles'

export default function Users() {
  const [profiles, setProfiles] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: p }, { data: d }] = await Promise.all([
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('departments').select('*').eq('active', true)
    ])
    setProfiles(p || []); setDepartments(d || [])
    setLoading(false)
  }

  async function update(id, fields) {
    await supabase.from('profiles').update(fields).eq('id', id)
    setProfiles(ps => ps.map(p => p.id === id ? { ...p, ...fields } : p))
  }

  return (
    <div className="card space-y-3">
      <div>
        <h3 className="font-bold">Users & Roles</h3>
        <p className="text-xs text-slate-500">
          New accounts sign up on the Login screen with a default "Viewer" role, or are invited from the
          Supabase Dashboard (Authentication → Users). Assign each person's real role and department here.
        </p>
      </div>
      {loading ? <p className="text-slate-400 text-sm">Loading…</p> : (
        <table>
          <thead><tr><th>Name</th><th>Role</th><th>Department</th><th>Active</th></tr></thead>
          <tbody>
            {profiles.map(p => (
              <tr key={p.id}>
                <td className="font-semibold">{p.full_name}</td>
                <td>
                  <select value={p.role} onChange={e => update(p.id, { role: e.target.value })}>
                    {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                </td>
                <td>
                  <select value={p.department || ''} onChange={e => update(p.id, { department: e.target.value || null })}>
                    <option value="">— None —</option>
                    {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </td>
                <td><input type="checkbox" checked={p.active} onChange={e => update(p.id, { active: e.target.checked })} /></td>
              </tr>
            ))}
            {profiles.length === 0 && <tr><td colSpan={4} className="text-center text-slate-400 py-4">No users yet.</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  )
}
