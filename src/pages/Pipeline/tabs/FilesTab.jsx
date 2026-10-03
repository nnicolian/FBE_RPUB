import { useState } from 'react'
import RecordEditor from '../../../components/RecordEditor'
import { useToast } from '../../../context/ToastContext'
import { supabase } from '../../../lib/supabaseClient'
import { badgeClass } from '../../../lib/health'
import FileList from '../../../components/FileList'
import { Pencil } from 'lucide-react'

const STATUSES = ['Not Started', 'In Progress', 'Completed', 'Blocked']

export default function FilesTab({ work, deliverables, canEdit, onReload }) {
  const { showToast } = useToast()
  const [editingId, setEditingId] = useState(null)
  async function saveRow(table, id, fields) {
    const { error } = await supabase.from(table).update(fields).eq('id', id)
    showToast(error ? `Could not save: ${error.message}` : 'Saved', error ? 'error' : 'success')
    if (!error) { setEditingId(null); onReload() }
    return !error
  }
  async function addDeliverable() {
    const name = prompt('Deliverable name?'); if (!name) return
    await supabase.from('deliverables').insert({ work_id: work.id, name })
    onReload()
  }
  async function updateStatus(id, status) {
    await supabase.from('deliverables').update({ status }).eq('id', id)
    onReload()
  }
  async function removeDeliverable(id) {
    if (!confirm('Delete this deliverable?')) return
    await supabase.from('deliverables').delete().eq('id', id)
    onReload()
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <h3 className="font-bold mb-2">Research-Level Files</h3>
        <FileList entityType="work" entityId={work.id} canEdit={canEdit} />
      </div>
      <div className="card">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold">Deliverables</h3>
          {canEdit && <button className="btn btn-soft" onClick={addDeliverable}>+ Deliverable</button>}
        </div>
        {deliverables.length === 0 ? <p className="text-slate-400 text-sm">No deliverables.</p> : (
          <div className="space-y-2">
            {deliverables.map(d => (
              editingId === d.id ? (
                <RecordEditor key={d.id} record={d} onCancel={() => setEditingId(null)} onSave={f => saveRow('deliverables', d.id, f)}
                  fields={[{ key: 'name', label: 'Name', required: true, wide: true }, { key: 'status', label: 'Status', type: 'select', options: STATUSES }]} />
              ) : <div key={d.id} className="border border-slate-200 rounded-lg p-2">
                <div className="flex justify-between items-center">
                  <strong className="text-sm">{d.name}</strong>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${badgeClass(d.status)}`}>{d.status}</span>
                    {canEdit && (
                      <>
                        <select className="!w-36 !py-1" value={d.status} onChange={e => updateStatus(d.id, e.target.value)}>
                          {STATUSES.map(s => <option key={s}>{s}</option>)}
                        </select>
                        <button className="btn btn-ghost !py-1 !px-2 text-xs" onClick={() => setEditingId(d.id)}><Pencil className="h-3.5 w-3.5" /> Edit</button>
                        <button className="text-xs text-rose-500" onClick={() => removeDeliverable(d.id)}>Delete</button>
                      </>
                    )}
                  </div>
                </div>
                <FileList entityType="deliverable" entityId={d.id} canEdit={canEdit} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
