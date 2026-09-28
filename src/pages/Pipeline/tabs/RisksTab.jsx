import { useState } from 'react'
import RecordEditor from '../../../components/RecordEditor'
import { useToast } from '../../../context/ToastContext'
import { supabase } from '../../../lib/supabaseClient'
import { badgeClass } from '../../../lib/health'
import FileList from '../../../components/FileList'

export default function RisksTab({ work, risks, canEdit, onReload }) {
  const { showToast } = useToast()
  const [editingId, setEditingId] = useState(null)
  async function saveRow(table, id, fields) {
    const { error } = await supabase.from(table).update(fields).eq('id', id)
    showToast(error ? `Could not save: ${error.message}` : 'Saved', error ? 'error' : 'success')
    if (!error) { setEditingId(null); onReload() }
    return !error
  }
  async function addRisk() {
    const type = confirm('Is this an Issue (OK) or a Risk (Cancel)?') ? 'Issue' : 'Risk'
    const title = prompt(`${type} title?`); if (!title) return
    const impact = prompt('Impact (Low / Medium / High)?', 'Medium') || 'Medium'
    const action = prompt('Mitigation / action (optional)?') || ''
    await supabase.from('risks').insert({ work_id: work.id, type, title, impact, action, status: 'Open', description: title })
    onReload()
  }
  async function closeRisk(id) {
    await supabase.from('risks').update({ status: 'Closed' }).eq('id', id)
    onReload()
  }
  async function removeRisk(id) {
    if (!confirm('Delete this risk/issue?')) return
    await supabase.from('risks').delete().eq('id', id)
    onReload()
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold">Risks & Issues</h3>
        {canEdit && <button className="btn btn-soft" onClick={addRisk}>+ Risk / Issue</button>}
      </div>
      {risks.length === 0 ? <p className="text-slate-400 text-sm">No risks/issues.</p> : (
        <div className="space-y-2">
          {risks.map(r => (
            editingId === r.id ? (
              <RecordEditor key={r.id} record={r} onCancel={() => setEditingId(null)} onSave={f => saveRow('risks', r.id, f)}
                fields={[{ key: 'title', label: 'Title', required: true, wide: true }, { key: 'type', label: 'Type', type: 'select', options: ['Risk', 'Issue'] },
                  { key: 'impact', label: 'Impact', type: 'select', options: ['Low', 'Medium', 'High'] }, { key: 'status', label: 'Status', type: 'select', options: ['Open', 'Closed'] },
                  { key: 'description', label: 'Description', type: 'textarea' }, { key: 'action', label: 'Mitigation / action', type: 'textarea' }]} />
            ) : <div key={r.id} className="flex justify-between items-center border border-slate-200 rounded-lg p-2">
              <div>
                <strong className="text-sm">{r.type}: {r.title || r.description}</strong>
                <div className="text-xs text-slate-400">{r.impact} impact · {r.action || 'No action logged'}</div>
                <FileList entityType="risk" entityId={r.id} canEdit={canEdit} />
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge ${badgeClass(r.status)}`}>{r.status}</span>
                {canEdit && r.status === 'Open' && <button className="text-xs text-brand font-semibold" onClick={() => closeRisk(r.id)}>Close</button>}
                {canEdit && <button className="btn btn-ghost !py-1 !px-2 text-xs" onClick={() => setEditingId(r.id)}>✎ Edit</button>}
                {canEdit && <button className="text-xs text-rose-500" onClick={() => removeRisk(r.id)}>Delete</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
