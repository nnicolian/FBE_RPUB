import { supabase } from '../../../lib/supabaseClient'
import { useAuth } from '../../../context/AuthContext'

export default function UpdatesTab({ work, updates, canEdit, onReload }) {
  const { profile } = useAuth()
  async function addUpdate() {
    const text = prompt('Update note?'); if (!text) return
    const status = prompt('Status label (optional)?') || ''
    await supabase.from('work_updates').insert({
      work_id: work.id, note: text, status, author: profile?.full_name, update_date: new Date().toISOString().slice(0, 10)
    })
    onReload()
  }
  async function removeUpdate(id) {
    if (!confirm('Delete this update?')) return
    await supabase.from('work_updates').delete().eq('id', id)
    onReload()
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold">Updates</h3>
        {canEdit && <button className="btn btn-soft" onClick={addUpdate}>+ Update</button>}
      </div>
      {updates.length === 0 ? <p className="text-slate-400 text-sm">No updates.</p> : (
        <div className="space-y-2">
          {updates.map(u => (
            <div key={u.id} className="flex justify-between items-center border border-slate-200 rounded-lg p-2">
              <div>
                <strong className="text-sm">{u.update_date} {u.status ? `· ${u.status}` : ''}</strong>
                <div className="text-xs text-slate-500">{u.note} <span className="text-slate-400">({u.author})</span></div>
              </div>
              {canEdit && <button className="text-xs text-rose-500" onClick={() => removeUpdate(u.id)}>Delete</button>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
