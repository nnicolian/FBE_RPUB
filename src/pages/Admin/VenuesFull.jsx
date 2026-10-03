import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { JOURNAL_FIELDS, quartileTarget, absTarget } from '../../lib/journals'
import { scimagoSearch } from '../../lib/journalLinks'
import { ExternalLink, Pencil } from 'lucide-react'

const CHECKLIST_ITEMS = [
  ['indexing', 'Indexing verified'], ['quality', 'Quality tier confirmed'], ['publisher', 'Publisher verified'],
  ['fees', 'Fees / APC reviewed'], ['peerReview', 'Peer review process reviewed'], ['scope', 'Scope fit reviewed']
]

function EMPTY_VENUE() {
  return {
    name: '', full_name: '', type: 'Journal', quality: '', publisher: '', indexing: 'Scopus', abs: '', cite_score: '',
    apc: '', turnaround: '', prior_publication_policy: '', peer_review_process: '', scope_fit_guidance: '', field: '',
    verification_checklist: { indexing: false, quality: false, publisher: false, fees: false, peerReview: false, scope: false },
    verified_on: '', verified_by: '', floor: false, active: true
  }
}

export default function VenuesFull() {
  const [venues, setVenues] = useState([])
  const [editing, setEditing] = useState(null) // venue id being edited, or 'new'
  const [draft, setDraft] = useState(EMPTY_VENUE())
  const [loading, setLoading] = useState(true)
  const [field, setField] = useState('')
  const [q, setQ] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('venues').select('*').order('name')
    setVenues(data || [])
    setLoading(false)
  }

  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }))
  function startEdit(v) { setDraft(v ? { ...EMPTY_VENUE(), ...v } : EMPTY_VENUE()); setEditing(v ? v.id : 'new') }

  async function save() {
    if (!draft.name) return
    const { id, ...rest } = draft
    rest.verified_on = rest.verified_on || null
    if (editing === 'new') await supabase.from('venues').insert(rest)
    else await supabase.from('venues').update(rest).eq('id', editing)
    setEditing(null)
    load()
  }

  function verified(v) {
    const c = v.verification_checklist || {}
    return !!(v.verified_on && v.verified_by && CHECKLIST_ITEMS.every(([k]) => c[k]))
  }

  const shown = venues.filter(v => (!field || v.field === field) &&
    (!q || `${v.name} ${v.full_name}`.toLowerCase().includes(q.toLowerCase())))

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-3 gap-2 flex-wrap">
        <div>
          <h3 className="font-bold">Venues / Journals</h3>
          <p className="text-xs text-slate-500">Starter list from the Journal Targeting Reference Sheet. Rankings change yearly — verify before targeting.</p>
        </div>
        <button className="btn btn-soft" onClick={() => startEdit(null)}>+ Venue</button>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <input className="!w-64" placeholder="Search journals…" value={q} onChange={e => setQ(e.target.value)} />
        <select className="!w-64" value={field} onChange={e => setField(e.target.value)}>
          <option value="">All fields</option>
          {JOURNAL_FIELDS.map(f => <option key={f}>{f}</option>)}
        </select>
      </div>

      {editing && (
        <div className="border border-slate-200 rounded-lg p-3 mb-4 space-y-3">
          <div className="grid md:grid-cols-3 gap-3">
            <div><label>Name (short)</label><input value={draft.name} onChange={e => set('name', e.target.value)} /></div>
            <div><label>Full Name</label><input value={draft.full_name} onChange={e => set('full_name', e.target.value)} /></div>
            <div>
              <label>Type</label>
              <select value={draft.type} onChange={e => set('type', e.target.value)}>
                <option>Journal</option><option>Conference</option>
              </select>
            </div>
            <div>
              <label>Field</label>
              <select value={draft.field || ''} onChange={e => set('field', e.target.value)}>
                <option value="">—</option>{JOURNAL_FIELDS.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label>SJR Quartile</label>
              <select value={draft.quality} onChange={e => set('quality', e.target.value)}>
                <option value="">—</option>{['Q1', 'Q2', 'Q3', 'Q4', 'Conference'].map(x => <option key={x}>{x}</option>)}
              </select>
            </div>
            <div><label>ABS/AJG</label><input value={draft.abs} onChange={e => set('abs', e.target.value)} placeholder="e.g. ABS 3" /></div>
            <div><label>Indexing</label><input value={draft.indexing} onChange={e => set('indexing', e.target.value)} placeholder="Scopus" /></div>
            <div><label>Publisher</label><input value={draft.publisher} onChange={e => set('publisher', e.target.value)} /></div>
            <div><label>CiteScore</label><input value={draft.cite_score} onChange={e => set('cite_score', e.target.value)} /></div>
            <div><label>APC / Fee</label><input value={draft.apc} onChange={e => set('apc', e.target.value)} /></div>
            <div><label>Average Turnaround</label><input value={draft.turnaround} onChange={e => set('turnaround', e.target.value)} /></div>
            <div><label>Verified On</label><input type="date" value={draft.verified_on || ''} onChange={e => set('verified_on', e.target.value)} /></div>
            <div><label>Verified By</label><input value={draft.verified_by} onChange={e => set('verified_by', e.target.value)} /></div>
          </div>
          <div><label>Prior-Publication Policy</label><textarea value={draft.prior_publication_policy} onChange={e => set('prior_publication_policy', e.target.value)} /></div>
          <div><label>Peer Review Process</label><textarea value={draft.peer_review_process} onChange={e => set('peer_review_process', e.target.value)} /></div>
          <div><label>Scope Fit Guidance</label><textarea value={draft.scope_fit_guidance} onChange={e => set('scope_fit_guidance', e.target.value)} /></div>
          <div className="flex flex-wrap gap-4">
            <label className="!mb-0 flex items-center gap-2 text-sm font-normal"><input type="checkbox" className="!w-auto" checked={draft.floor} onChange={e => set('floor', e.target.checked)} /> Meets university floor (Scopus-indexed)</label>
            <label className="!mb-0 flex items-center gap-2 text-sm font-normal"><input type="checkbox" className="!w-auto" checked={draft.active} onChange={e => set('active', e.target.checked)} /> Active (offered when choosing a venue)</label>
          </div>
          <div>
            <label>Verification Checklist</label>
            <div className="grid grid-cols-2 gap-2">
              {CHECKLIST_ITEMS.map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm font-normal bg-slate-50 border border-slate-200 rounded-lg p-2">
                  <input type="checkbox" className="!w-auto" checked={!!draft.verification_checklist?.[key]}
                    onChange={e => set('verification_checklist', { ...draft.verification_checklist, [key]: e.target.checked })} />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2"><button className="btn btn-blue" onClick={save}>Save</button><button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button></div>
        </div>
      )}

      {loading ? <p className="text-slate-400 text-sm">Loading…</p> : (
        <div className="overflow-x-auto">
          <table>
            <thead><tr><th>Venue</th><th>Field</th><th>Quartile</th><th>ABS/AJG</th><th>Indexing</th><th>Verification</th><th></th></tr></thead>
            <tbody>
              {shown.map(v => {
                const qt = quartileTarget(v.quality), at = absTarget(v.abs)
                return (
                  <tr key={v.id} className={v.active ? '' : 'opacity-50'}>
                    <td className="font-semibold">{v.name}{v.full_name && v.full_name !== v.name && <div className="text-xs text-slate-400 font-normal">{v.full_name}</div>}</td>
                    <td className="text-xs">{v.field || '—'}</td>
                    <td>{v.quality || '—'}{qt && <div className="text-xs text-slate-400">{qt.label}</div>}</td>
                    <td>{v.abs || '—'}{at && <div className="text-xs text-slate-400">{at.label}</div>}</td>
                    <td>{v.indexing || '—'}</td>
                    <td>
                      <span className={`badge ${verified(v) ? 'badge-green' : 'badge-amber'}`}>{verified(v) ? 'Verified' : 'Not verified'}</span>
                      <div className="text-xs text-slate-400">{v.verified_on || 'No verification date'}{v.verified_by ? ` · ${v.verified_by}` : ''}</div>
                    </td>
                    <td className="whitespace-nowrap">
                      <a className="inline-flex items-center gap-1 text-xs text-accent-700 hover:underline mr-2" href={scimagoSearch(v.full_name || v.name)} target="_blank" rel="noreferrer">Scimago <ExternalLink className="h-3 w-3" /></a>
                      <button className="btn btn-ghost !py-1 !px-2 text-xs" onClick={() => startEdit(v)}><Pencil className="h-3.5 w-3.5" /> Edit</button>
                    </td>
                  </tr>
                )
              })}
              {shown.length === 0 && <tr><td colSpan={7} className="text-center text-slate-400 py-6">No venues match.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
