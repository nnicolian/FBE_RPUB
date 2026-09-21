import { supabase } from '../../../lib/supabaseClient'
import { badgeClass } from '../../../lib/health'

export default function RisksTab({ work, risks, canEdit, onReload }) {
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
            <div key={r.id} className="flex justify-between items-center border border-slate-200 rounded-lg p-2">
              <div>
                <strong className="text-sm">{r.type}: {r.title || r.description}</strong>
                <div className="text-xs text-slate-400">{r.impact} impact · {r.action || 'No action logged'}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge ${badgeClass(r.status)}`}>{r.status}</span>
                {canEdit && r.status === 'Open' && <button className="text-xs text-brand font-semibold" onClick={() => closeRisk(r.id)}>Close</button>}
                {canEdit && <button className="text-xs text-rose-500" onClick={() => removeRisk(r.id)}>Delete</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
