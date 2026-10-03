import { useState } from 'react'
import RecordEditor from '../../../components/RecordEditor'
import { useToast } from '../../../context/ToastContext'
import { supabase } from '../../../lib/supabaseClient'
import { badgeClass } from '../../../lib/health'
import FileList from '../../../components/FileList'
import { Pencil } from 'lucide-react'

const STATUSES = ['Not Started', 'In Progress', 'Completed', 'Blocked']

export default function MilestonesTab({ work, milestones, canEdit, onReload }) {
  const { showToast } = useToast()
  const [editingId, setEditingId] = useState(null)
  async function saveRow(table, id, fields) {
    const { error } = await supabase.from(table).update(fields).eq('id', id)
    showToast(error ? `Could not save: ${error.message}` : 'Saved', error ? 'error' : 'success')
    if (!error) { setEditingId(null); onReload() }
    return !error
  }
  async function addMilestone() {
    const name = prompt('Milestone name?'); if (!name) return
    const due = prompt('Due date (YYYY-MM-DD)?') || null
    await supabase.from('milestones').insert({ work_id: work.id, name, due })
    onReload()
  }
  async function updateStatus(id, status) {
    await supabase.from('milestones').update({ status }).eq('id', id)
    onReload()
  }
  async function removeMilestone(id) {
    if (!confirm('Delete this milestone?')) return
    await supabase.from('milestones').delete().eq('id', id)
    onReload()
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold">Milestones</h3>
        {canEdit && <button className="btn btn-soft" onClick={addMilestone}>+ Milestone</button>}
      </div>
      {milestones.length === 0 ? <p className="text-slate-400 text-sm">No milestones.</p> : (
        <div className="space-y-2">
          {milestones.map(m => (
            editingId === m.id ? (
              <RecordEditor key={m.id} record={m} onCancel={() => setEditingId(null)} onSave={f => saveRow('milestones', m.id, f)}
                fields={[{ key: 'name', label: 'Name', required: true, wide: true }, { key: 'due', label: 'Due', type: 'date' }, { key: 'status', label: 'Status', type: 'select', options: STATUSES }]} />
            ) : <div key={m.id} className="flex justify-between items-center border border-slate-200 rounded-lg p-2">
              <div>
                <strong className="text-sm">◆ {m.name}</strong>
                <div className="text-xs text-slate-400">{m.status} · {m.due || '—'}</div>
                <FileList entityType="milestone" entityId={m.id} canEdit={canEdit} />
              </div>
              {canEdit && (
                <div className="flex items-center gap-2">
                  <select className="!w-36 !py-1" value={m.status} onChange={e => updateStatus(m.id, e.target.value)}>
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                  <button className="btn btn-ghost !py-1 !px-2 text-xs" onClick={() => setEditingId(m.id)}><Pencil className="h-3.5 w-3.5" /> Edit</button>
                  <button className="text-xs text-rose-500" onClick={() => removeMilestone(m.id)}>Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
