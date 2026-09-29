import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useToast } from '../../context/ToastContext'
import { RESEARCH_AREAS, RESEARCHER_TYPES, researcherTypeLabel } from '../../lib/workOptions'

// Researchers are the names used as lead / co-author / supervisor on papers.
// Linking a researcher to a login lets that person see and update the papers they author.

const EMPTY = { name: '', type: 'Internal', department: '', email: '', profile_id: '', research_areas: [], accepts_ms_students: false, active: true }

export default function ResearchersAdmin() {
  const { showToast } = useToast()
  const [rows, setRows] = useState([])
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [editing, setEditing] = useState(null) // id or 'new'
  const [d, setD] = useState(EMPTY)

  useEffect(() => { load() }, [])
  async function load() {
    const [{ data: r }, { data: u }, { data: dep }] = await Promise.all([
      supabase.from('researchers').select('*').order('name'),
      supabase.rpc('admin_list_users'),
      supabase.from('departments').select('name').eq('active', true).order('name')
    ])
    setRows(r || []); setUsers((u || []).filter(x => x.active)); setDepartments((dep || []).map(x => x.name))
  }

  const userName = id => users.find(u => u.id === id)?.full_name
  const set = (k, v) => setD(x => ({ ...x, [k]: v }))
  const toggleArea = a => set('research_areas', d.research_areas.includes(a) ? d.research_areas.filter(x => x !== a) : [...d.research_areas, a])

  function start(r) { setD(r ? { ...EMPTY, ...r, profile_id: r.profile_id || '' } : EMPTY); setEditing(r ? r.id : 'new') }

  async function save() {
    if (!d.name.trim()) { showToast('Enter a name.', 'error'); return }
    const { id, ...rest } = d
    const row = { ...rest, name: d.name.trim(), profile_id: d.profile_id || null }
    const { error } = editing === 'new'
      ? await supabase.from('researchers').insert(row)
      : await supabase.from('researchers').update(row).eq('id', editing)
    showToast(error ? `Could not save: ${error.message}` : 'Saved', error ? 'error' : 'success')
    if (!error) { setEditing(null); load() }
  }

  return (
    <div className="card space-y-3">
      <div className="flex justify-between items-start gap-3">
        <div>
          <h3 className="font-bold">Researchers</h3>
          <p className="text-xs text-slate-500">
            Names used as lead, co-author or supervisor on papers. Link each one to its login so that person sees and updates
            their own papers. Research areas drive the part-time faculty matches and the list of available MS supervisors.
          </p>
        </div>
        {!editing && <button className="btn btn-soft whitespace-nowrap" onClick={() => start(null)}>+ Researcher</button>}
      </div>

      {editing && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
          <div className="grid md:grid-cols-3 gap-3">
            <div><label>Name (as used on papers)</label><input value={d.name} onChange={e => set('name', e.target.value)} /></div>
            <div><label>Type</label><select value={d.type} onChange={e => set('type', e.target.value)}>{RESEARCHER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
            <div><label>Department</label><select value={d.department || ''} onChange={e => set('department', e.target.value)}><option value="">—</option>{departments.map(x => <option key={x}>{x}</option>)}</select></div>
            <div><label>Email</label><input value={d.email || ''} onChange={e => set('email', e.target.value)} /></div>
            <div>
              <label>Login (app account)</label>
              <select value={d.profile_id} onChange={e => set('profile_id', e.target.value)}>
                <option value="">— Not linked —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.full_name} · {u.email}</option>)}
              </select>
            </div>
            <div className="flex flex-col justify-end gap-1">
              <label className="!mb-0 flex items-center gap-2 text-sm font-normal"><input type="checkbox" className="!w-auto" checked={d.accepts_ms_students} onChange={e => set('accepts_ms_students', e.target.checked)} /> Available to supervise MS papers</label>
              <label className="!mb-0 flex items-center gap-2 text-sm font-normal"><input type="checkbox" className="!w-auto" checked={d.active} onChange={e => set('active', e.target.checked)} /> Active</label>
            </div>
          </div>
          <div>
            <label>Research areas</label>
            <div className="flex flex-wrap gap-2">
              {RESEARCH_AREAS.map(a => (
                <button key={a} type="button" onClick={() => toggleArea(a)}
                  className={`px-2 py-1 rounded-full text-xs border ${d.research_areas.includes(a) ? 'bg-brand text-white border-brand' : 'bg-white border-slate-200 text-slate-600'}`}>{a}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-2"><button className="btn btn-blue" onClick={save}>Save</button><button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button></div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table>
          <thead><tr><th>Name</th><th>Type</th><th>Department</th><th>Login</th><th>Research areas</th><th>MS supervisor</th><th></th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className={r.active ? '' : 'opacity-50'}>
                <td className="font-semibold">{r.name}<div className="text-xs text-slate-400 font-normal">{r.email}</div></td>
                <td>{researcherTypeLabel(r.type)}</td>
                <td>{r.department || '—'}</td>
                <td>{r.profile_id ? (userName(r.profile_id) || 'Linked') : <span className="text-amber-600 text-xs">Not linked</span>}</td>
                <td className="text-xs">{(r.research_areas || []).join(' · ') || '—'}</td>
                <td>{r.accepts_ms_students ? '✓' : '—'}</td>
                <td><button className="btn btn-ghost !py-1 !px-2 text-xs" onClick={() => start(r)}>✎ Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
