import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { ROLES, ROLE_LABELS } from '../../lib/roles'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

// Admin-only user management. Accounts are created and changed through
// database functions (admin_create_user, admin_update_user, ...) that check
// the caller is an admin, so nothing here needs a service key.

const blankDraft = { email: '', full_name: '', password: '', role: 'dean', department: '' }

export default function Users() {
  const { profile: me } = useAuth()
  const { showToast } = useToast()
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [draft, setDraft] = useState(blankDraft)
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: u, error: e }, { data: d }] = await Promise.all([
      supabase.rpc('admin_list_users'),
      supabase.from('departments').select('*').eq('active', true).order('name')
    ])
    if (e) setError(e.message)
    else { setUsers(u || []); setError(null) }
    setDepartments(d || [])
    setLoading(false)
  }

  async function save(user, changes) {
    const next = { ...user, ...changes }
    const { error: e } = await supabase.rpc('admin_update_user', {
      p_user_id: user.id, p_full_name: next.full_name, p_role: next.role,
      p_department: next.department || null, p_active: next.active
    })
    if (e) { showToast(e.message, 'error'); return }
    setUsers(us => us.map(x => x.id === user.id ? next : x))
    showToast('Saved')
  }

  async function addUser() {
    if (!draft.email.trim() || !draft.full_name.trim()) { showToast('Enter a name and email.', 'error'); return }
    if (draft.password.length < 8) { showToast('The password must be at least 8 characters.', 'error'); return }
    setBusy(true)
    const { error: e } = await supabase.rpc('admin_create_user', {
      p_email: draft.email, p_password: draft.password, p_full_name: draft.full_name,
      p_role: draft.role, p_department: draft.department || null
    })
    setBusy(false)
    if (e) { showToast(e.message, 'error'); return }
    showToast(`Added ${draft.full_name}`)
    setDraft(blankDraft); setAdding(false)
    load()
  }

  async function resetPassword(user) {
    const pw = window.prompt(`New password for ${user.full_name} (at least 8 characters):`)
    if (pw == null) return
    const { error: e } = await supabase.rpc('admin_reset_user_password', { p_user_id: user.id, p_password: pw })
    if (e) showToast(e.message, 'error')
    else showToast(`Password changed for ${user.full_name}. Let them know the new one.`)
  }

  async function removeUser(user) {
    if (!window.confirm(`Remove ${user.full_name} (${user.email})? They will no longer be able to sign in. This can't be undone.`)) return
    const { error: e } = await supabase.rpc('admin_delete_user', { p_user_id: user.id })
    if (e) { showToast(e.message, 'error'); return }
    setUsers(us => us.filter(x => x.id !== user.id))
    showToast(`Removed ${user.full_name}`)
  }

  const fmt = ts => ts ? new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never'

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold">Users & Roles</h3>
          <p className="text-xs text-slate-500">
            Add people, set their role and department, reset passwords, or deactivate accounts.
            Deactivated users can't sign in. Deans can read and edit all research content;
            only administrators manage users and settings.
          </p>
        </div>
        {!adding && <button className="btn btn-blue whitespace-nowrap" onClick={() => setAdding(true)}>+ Add user</button>}
      </div>

      {adding && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
          <div className="grid gap-2 md:grid-cols-3">
            <input placeholder="Full name" value={draft.full_name} onChange={e => setDraft(d => ({ ...d, full_name: e.target.value }))} />
            <input placeholder="Email" type="email" value={draft.email} onChange={e => setDraft(d => ({ ...d, email: e.target.value }))} />
            <input placeholder="Temporary password (8+ characters)" value={draft.password} onChange={e => setDraft(d => ({ ...d, password: e.target.value }))} />
            <select value={draft.role} onChange={e => setDraft(d => ({ ...d, role: e.target.value }))}>
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            <select value={draft.department} onChange={e => setDraft(d => ({ ...d, department: e.target.value }))}>
              <option value="">— No department —</option>
              {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
            <div className="flex gap-2">
              <button className="btn btn-blue" disabled={busy} onClick={addUser}>{busy ? 'Adding…' : 'Add'}</button>
              <button className="btn btn-ghost" onClick={() => { setAdding(false); setDraft(blankDraft) }}>Cancel</button>
            </div>
          </div>
          <p className="text-xs text-slate-500">Share the temporary password with the person; they can change it after signing in.</p>
        </div>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {loading ? <p className="text-slate-400 text-sm">Loading…</p> : (
        <div className="overflow-x-auto">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Active</th><th>Last sign-in</th><th></th></tr></thead>
            <tbody>
              {users.map(u => {
                const isMe = u.id === me?.id
                return (
                  <tr key={u.id} className={u.active ? '' : 'opacity-60'}>
                    <td>
                      <input defaultValue={u.full_name} className="!py-1 !border-0 focus:!border focus:!border-slate-300 font-semibold"
                        onBlur={e => e.target.value.trim() && e.target.value !== u.full_name && save(u, { full_name: e.target.value.trim() })} />
                    </td>
                    <td className="text-xs text-slate-500">{u.email}</td>
                    <td>
                      <select value={u.role} disabled={isMe} title={isMe ? "You can't change your own role" : ''} onChange={e => save(u, { role: e.target.value })}>
                        {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </select>
                    </td>
                    <td>
                      <select value={u.department || ''} onChange={e => save(u, { department: e.target.value || null })}>
                        <option value="">— None —</option>
                        {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                      </select>
                    </td>
                    <td><input type="checkbox" checked={!!u.active} disabled={isMe} onChange={e => save(u, { active: e.target.checked })} /></td>
                    <td className="text-xs text-slate-500 whitespace-nowrap">{fmt(u.last_sign_in_at)}</td>
                    <td className="whitespace-nowrap">
                      <button className="btn btn-ghost !py-1 !px-2 text-xs" onClick={() => resetPassword(u)}>Reset password</button>
                      {!isMe && <button className="btn btn-ghost !py-1 !px-2 text-xs text-rose-500 ml-1" onClick={() => removeUser(u)}>Remove</button>}
                    </td>
                  </tr>
                )
              })}
              {users.length === 0 && <tr><td colSpan={7} className="text-center text-slate-400 py-4">No users yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
