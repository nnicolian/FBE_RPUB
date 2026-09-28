import { useState } from 'react'
import RecordEditor from '../../../components/RecordEditor'
import { useToast } from '../../../context/ToastContext'
import { supabase } from '../../../lib/supabaseClient'
import { useAuth } from '../../../context/AuthContext'
import FileList from '../../../components/FileList'

export default function UpdatesTab({ work, updates, canEdit, onReload }) {
  const { profile } = useAuth()
  const { showToast } = useToast()
  const [editingId, setEditingId] = useState(null)
  async function saveRow(table, id, fields) {
    const { error } = await supabase.from(table).update(fields).eq('id', id)
    showToast(error ? `Could not save: ${error.message}` : 'Saved', error ? 'error' : 'success')
    if (!error) { setEditingId(null); onReload() }
    return !error
  }
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
            editingId === u.id ? (
              <RecordEditor key={u.id} record={u} onCancel={() => setEditingId(null)} onSave={f => saveRow('work_updates', u.id, f)}
                fields={[{ key: 'update_date', label: 'Date', type: 'date', required: true }, { key: 'status', label: 'Status label' },
                  { key: 'author', label: 'Author' }, { key: 'note', label: 'Note', type: 'textarea', required: true }]} />
            ) : <div key={u.id} className="flex justify-between items-center border border-slate-200 rounded-lg p-2">
              <div>
                <strong className="text-sm">{u.update_date} {u.status ? `· ${u.status}` : ''}</strong>
                <div className="text-xs text-slate-500">{u.note} <span className="text-slate-400">({u.author})</span></div>
                <FileList entityType="work_update" entityId={u.id} canEdit={canEdit} />
              </div>
              {canEdit && (
                <div className="flex items-center gap-2">
                  <button className="btn btn-ghost !py-1 !px-2 text-xs" onClick={() => setEditingId(u.id)}>✎ Edit</button>
                  <button className="text-xs text-rose-500" onClick={() => removeUpdate(u.id)}>Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
