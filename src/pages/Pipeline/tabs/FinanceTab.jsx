import { useState } from 'react'
import RecordEditor from '../../../components/RecordEditor'
import { useToast } from '../../../context/ToastContext'
import { supabase } from '../../../lib/supabaseClient'
import FileList from '../../../components/FileList'

function money(v) { return Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

export default function FinanceTab({ work, costEntries, canEdit, onPatch, onReload }) {
  const [editingFunding, setEditingFunding] = useState(false)
  const { showToast } = useToast()
  const [editingId, setEditingId] = useState(null)
  async function saveRow(table, id, fields) {
    const { error } = await supabase.from(table).update(fields).eq('id', id)
    showToast(error ? `Could not save: ${error.message}` : 'Saved', error ? 'error' : 'success')
    if (!error) { setEditingId(null); onReload() }
    return !error
  }
  const funding = work.funding || { funderName: '', grantReference: '', amountReceived: 0 }
  const [draft, setDraft] = useState(funding)

  const totalCosts = costEntries.reduce((n, c) => n + Number(c.amount || 0), 0)
  const totalFunding = Number(funding.amountReceived || 0)

  function saveFunding() {
    onPatch({ funding: draft })
    setEditingFunding(false)
  }

  async function addCost() {
    const description = prompt('Cost description?', 'Research cost'); if (!description) return
    const amount = Number(prompt('Amount?', '0') || 0)
    await supabase.from('cost_entries').insert({ work_id: work.id, description, amount, entry_date: new Date().toISOString().slice(0, 10) })
    onReload()
  }
  async function removeCost(id) {
    if (!confirm('Delete this cost entry?')) return
    await supabase.from('cost_entries').delete().eq('id', id)
    onReload()
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold">Funding</h3>
            {canEdit && !editingFunding && <button className="btn btn-ghost !py-1 !px-2 text-xs" onClick={() => setEditingFunding(true)}>✎ Edit</button>}
          </div>
          {!editingFunding ? (
            <table><tbody>
              <tr><th>Funder</th><td>{funding.funderName || '—'}</td></tr>
              <tr><th>Grant Reference</th><td>{funding.grantReference || '—'}</td></tr>
              <tr><th>Amount Received</th><td className="font-semibold">{money(funding.amountReceived)}</td></tr>
            </tbody></table>
          ) : (
            <div className="space-y-2">
              <div><label>Funder Name</label><input value={draft.funderName || ''} onChange={e => setDraft(d => ({ ...d, funderName: e.target.value }))} /></div>
              <div><label>Grant Reference</label><input value={draft.grantReference || ''} onChange={e => setDraft(d => ({ ...d, grantReference: e.target.value }))} /></div>
              <div><label>Amount Received</label><input type="number" value={draft.amountReceived || 0} onChange={e => setDraft(d => ({ ...d, amountReceived: Number(e.target.value) }))} /></div>
              <div className="flex gap-2"><button className="btn btn-blue" onClick={saveFunding}>Save</button><button className="btn btn-ghost" onClick={() => setEditingFunding(false)}>Cancel</button></div>
            </div>
          )}
        </div>
        <div className="card">
          <h3 className="font-bold mb-2">Financial Summary</h3>
          <table><tbody>
            <tr><th>Total Costs</th><td className="font-semibold">{money(totalCosts)}</td></tr>
            <tr><th>Total Funding</th><td className="font-semibold">{money(totalFunding)}</td></tr>
            <tr><th>Net Faculty Cost</th><td className="font-semibold">{money(totalCosts - totalFunding)}</td></tr>
          </tbody></table>
        </div>
      </div>
      <div className="card">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold">Cost Log</h3>
          {canEdit && <button className="btn btn-soft" onClick={addCost}>+ Cost Entry</button>}
        </div>
        {costEntries.length === 0 ? <p className="text-slate-400 text-sm">No research costs recorded.</p> : (
          <table>
            <thead><tr><th>Description</th><th>Date</th><th>Amount</th><th>Proof of Payment</th>{canEdit && <th></th>}</tr></thead>
            <tbody>
              {costEntries.map(c => editingId === c.id ? (
                <tr key={c.id}><td colSpan={canEdit ? 5 : 4}>
                  <RecordEditor record={c} onCancel={() => setEditingId(null)} onSave={f => saveRow('cost_entries', c.id, f)}
                    fields={[{ key: 'description', label: 'Description', required: true, wide: true }, { key: 'entry_date', label: 'Date', type: 'date' },
                      { key: 'amount', label: 'Amount', type: 'number', min: 0 }]} />
                </td></tr>
              ) : (
                <tr key={c.id}>
                  <td>{c.description}</td><td>{c.entry_date || '—'}</td><td className="font-semibold">{money(c.amount)}</td>
                  <td><FileList entityType="cost_entry" entityId={c.id} canEdit={canEdit} /></td>
                  {canEdit && <td className="whitespace-nowrap"><button className="btn btn-ghost !py-1 !px-2 text-xs" onClick={() => setEditingId(c.id)}>✎ Edit</button> <button className="text-xs text-rose-500 ml-1" onClick={() => removeCost(c.id)}>Delete</button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
