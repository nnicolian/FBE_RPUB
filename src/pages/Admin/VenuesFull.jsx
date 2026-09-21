import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

const CHECKLIST_ITEMS = [
  ['indexing', 'Indexing verified'], ['quality', 'Quality tier confirmed'], ['publisher', 'Publisher verified'],
  ['fees', 'Fees / APC reviewed'], ['peerReview', 'Peer review process reviewed'], ['scope', 'Scope fit reviewed']
]

function EMPTY_VENUE() {
  return {
    name: '', full_name: '', type: 'Journal', quality: '', publisher: '', indexing: '', abs: '', cite_score: '',
    apc: '', turnaround: '', prior_publication_policy: '', peer_review_process: '', scope_fit_guidance: '',
    verification_checklist: { indexing: false, quality: false, publisher: false, fees: false, peerReview: false, scope: false },
    verified_on: '', verified_by: '', floor: false, active: true
  }
}

export default function VenuesFull() {
  const [venues, setVenues] = useState([])
  const [editing, setEditing] = useState(null) // venue being edited (or 'new')
  const [draft, setDraft] = useState(EMPTY_VENUE())
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('venues').select('*').order('name')
    setVenues(data || [])
    setLoading(false)
  }

  function startEdit(v) { setDraft(v ? { ...v } : EMPTY_VENUE()); setEditing(v ? v.id : 'new') }

  async function save() {
    if (!draft.name) return
    if (editing === 'new') {
      const { id, ...rest } = draft
      await supabase.from('venues').insert(rest)
    } else {
      await supabase.from('venues').update(draft).eq('id', editing)
    }
    setEditing(null)
    load()
  }

  function verified(v) {
    const c = v.verification_checklist || {}
    return !!(v.verified_on && v.verified_by && CHECKLIST_ITEMS.every(([k]) => c[k]))
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold">Venues / Journals</h3>
        <button className="btn btn-soft" onClick={() => startEdit(null)}>+ Venue</button>
      </div>

      {editing && (
        <div className="border border-slate-200 rounded-lg p-3 mb-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div><label>Name (short)</label><input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} /></div>
            <div><label>Full Name</label><input value={draft.full_name} onChange={e => setDraft(d => ({ ...d, full_name: e.target.value }))} /></div>
            <div>
              <label>Type</label>
              <select value={draft.type} onChange={e => setDraft(d => ({ ...d, type: e.target.value }))}>
                <option>Journal</option><option>Conference</option>
              </select>
            </div>
            <div>
              <label>Quality</label>
              <select value={draft.quality} onChange={e => setDraft(d => ({ ...d, quality: e.target.value }))}>
                <option value="">—</option>{['Q1', 'Q2', 'Q3', 'Q4', 'Conference'].map(q => <option key={q}>{q}</option>)}
              </select>
            </div>
            <div><label>Publisher</label><input value={draft.publisher} onChange={e => setDraft(d => ({ ...d, publisher: e.target.value }))} /></div>
            <div><label>Indexing</label><input value={draft.indexing} onChange={e => setDraft(d => ({ ...d, indexing: e.target.value }))} /></div>
            <div><label>ABS/AJG</label><input value={draft.abs} onChange={e => setDraft(d => ({ ...d, abs: e.target.value }))} /></div>
            <div><label>CiteScore</label><input value={draft.cite_score} onChange={e => setDraft(d => ({ ...d, cite_score: e.target.value }))} /></div>
            <div><label>APC / Fee</label><input value={draft.apc} onChange={e => setDraft(d => ({ ...d, apc: e.target.value }))} /></div>
            <div><label>Average Turnaround</label><input value={draft.turnaround} onChange={e => setDraft(d => ({ ...d, turnaround: e.target.value }))} /></div>
            <div><label>Verified On</label><input type="date" value={draft.verified_on || ''} onChange={e => setDraft(d => ({ ...d, verified_on: e.target.value }))} /></div>
            <div><label>Verified By</label><input value={draft.verified_by} onChange={e => setDraft(d => ({ ...d, verified_by: e.target.value }))} /></div>
          </div>
          <div><label>Prior-Publication Policy</label><textarea value={draft.prior_publication_policy} onChange={e => setDraft(d => ({ ...d, prior_publication_policy: e.target.value }))} /></div>
          <div><label>Peer Review Process</label><textarea value={draft.peer_review_process} onChange={e => setDraft(d => ({ ...d, peer_review_process: e.target.value }))} /></div>
          <div><label>Scope Fit Guidance</label><textarea value={draft.scope_fit_guidance} onChange={e => setDraft(d => ({ ...d, scope_fit_guidance: e.target.value }))} /></div>
          <div>
            <label>University Floor</label>
            <label className="flex items-center gap-2 text-sm font-normal"><input type="checkbox" checked={draft.floor} onChange={e => setDraft(d => ({ ...d, floor: e.target.checked }))} /> Meets university floor</label>
          </div>
          <div>
            <label>Verification Checklist</label>
            <div className="grid grid-cols-2 gap-2">
              {CHECKLIST_ITEMS.map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm font-normal bg-slate-50 border border-slate-200 rounded-lg p-2">
                  <input type="checkbox" checked={!!draft.verification_checklist?.[key]}
                    onChange={e => setDraft(d => ({ ...d, verification_checklist: { ...d.verification_checklist, [key]: e.target.checked } }))} />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2"><button className="btn btn-blue" onClick={save}>Save</button><button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button></div>
        </div>
      )}

      {loading ? <p className="text-slate-400 text-sm">Loading…</p> : (
        <table>
          <thead><tr><th>Venue</th><th>Full Name</th><th>Quality</th><th>ABS/AJG</th><th>Verification</th><th>Floor</th><th></th></tr></thead>
          <tbody>
            {venues.map(v => (
              <tr key={v.id}>
                <td className="font-semibold">{v.name}</td><td>{v.full_name}</td><td>{v.quality}</td><td>{v.abs || '—'}</td>
                <td>
                  <span className={`badge ${verified(v) ? 'badge-green' : 'badge-amber'}`}>{verified(v) ? 'Verified' : 'Incomplete'}</span>
                  <div className="text-xs text-slate-400">{v.verified_on || 'No verification date'}{v.verified_by ? ` · ${v.verified_by}` : ''}</div>
                </td>
                <td>{v.floor ? 'Yes' : 'Review'}</td>
                <td><button className="btn btn-ghost !py-1 !px-2 text-xs" onClick={() => startEdit(v)}>✎ Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
