import { supabase } from '../../../lib/supabaseClient'
import { badgeClass } from '../../../lib/health'
import FileList from '../../../components/FileList'

const STATUSES = ['Not Started', 'In Progress', 'Completed', 'Blocked']

export default function FilesTab({ work, deliverables, canEdit, onReload }) {
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
              <div key={d.id} className="border border-slate-200 rounded-lg p-2">
                <div className="flex justify-between items-center">
                  <strong className="text-sm">{d.name}</strong>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${badgeClass(d.status)}`}>{d.status}</span>
                    {canEdit && (
                      <>
                        <select className="!w-36 !py-1" value={d.status} onChange={e => updateStatus(d.id, e.target.value)}>
                          {STATUSES.map(s => <option key={s}>{s}</option>)}
                        </select>
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
