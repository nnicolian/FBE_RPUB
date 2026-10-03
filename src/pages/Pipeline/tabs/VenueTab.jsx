import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { badgeClass } from '../../../lib/health'
import { JOURNAL_FIELDS, quartileTarget, absTarget, isScopus, venueWarnings } from '../../../lib/journals'
import { scimagoSearch, SCOPUS_SOURCES, ABS_GUIDE } from '../../../lib/journalLinks'
import { AlertTriangle, Check, CheckCircle2, Circle, ExternalLink, Pencil } from 'lucide-react'

function TargetBadges({ quality, abs }) {
  const q = quartileTarget(quality)
  const a = absTarget(abs)
  return (
    <span className="inline-flex flex-wrap gap-1">
      {q && <span className={`badge ${q.tone}`}>{quality} · {q.label}</span>}
      {a && <span className={`badge ${a.tone}`}>{abs} · {a.label}</span>}
    </span>
  )
}

function draftFrom(work) {
  return {
    venue: work.venue || '', venue_quality: work.venue_quality || '', manuscript_id: work.manuscript_id || '',
    target_submission: work.target_submission || '', actual_submission: work.actual_submission || '',
    venue_selection_rationale: work.venue_selection_rationale || '',
    scope_match_confirmed: !!work.scope_match_confirmed, author_guidelines_reviewed: !!work.author_guidelines_reviewed,
    scopus_indexed: !!work.scopus_indexed, published_on: work.published_on || '', doi: work.doi || ''
  }
}

export default function VenueTab({ work, canEdit, onPatch }) {
  const [venues, setVenues] = useState([])
  const [editing, setEditing] = useState(false)
  const [field, setField] = useState('')
  const [draft, setDraft] = useState(() => draftFrom(work))

  useEffect(() => {
    supabase.from('venues').select('*').eq('active', true).order('name').then(({ data }) => setVenues(data || []))
  }, [])

  const find = name => venues.find(v => v.name.toLowerCase() === String(name || '').toLowerCase()
    || (v.full_name || '').toLowerCase() === String(name || '').toLowerCase()) || null
  const venue = find(work.venue)
  const draftVenue = find(draft.venue)
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }))

  // Picking a listed journal fills in its quartile and Scopus status.
  function chooseVenue(name) {
    const v = find(name)
    setDraft(d => ({ ...d, venue: name, ...(v ? { venue_quality: v.quality || d.venue_quality, scopus_indexed: isScopus(v) } : {}) }))
  }

  async function save() {
    const fields = { ...draft, target_submission: draft.target_submission || null, actual_submission: draft.actual_submission || null, published_on: draft.published_on || null }
    const ok = await onPatch(fields)
    if (ok !== false) setEditing(false)
  }

  const warnings = venueWarnings(work, venue)
  const suggestions = venues.filter(v => !field || v.field === field)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canEdit && !editing && <button className="btn btn-soft" onClick={() => { setDraft(draftFrom(work)); setEditing(true) }}><Pencil className="h-3.5 w-3.5" /> Edit Venue / Submission</button>}
      </div>

      {editing ? (
        <div className="card space-y-3">
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label>Browse journals by field</label>
              <select value={field} onChange={e => setField(e.target.value)}>
                <option value="">All fields</option>
                {JOURNAL_FIELDS.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label>Target Venue</label>
              <input list="venue-options" value={draft.venue} onChange={e => chooseVenue(e.target.value)} placeholder="Start typing a journal name, or N/A" />
              <datalist id="venue-options">
                {suggestions.map(v => <option key={v.id} value={v.name}>{[v.quality, v.abs, v.indexing].filter(Boolean).join(' · ')}</option>)}
              </datalist>
              {draftVenue && <div className="mt-1"><TargetBadges quality={draftVenue.quality} abs={draftVenue.abs} /></div>}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label>Venue Quality</label>
              <select value={draft.venue_quality} onChange={e => set('venue_quality', e.target.value)}>
                <option value="">—</option>{['Q1', 'Q2', 'Q3', 'Q4', 'Conference'].map(q => <option key={q}>{q}</option>)}
              </select>
            </div>
            <div><label>Manuscript ID</label><input value={draft.manuscript_id} onChange={e => set('manuscript_id', e.target.value)} /></div>
            <div><label>Target Submission</label><input type="date" value={draft.target_submission} onChange={e => set('target_submission', e.target.value)} /></div>
            <div><label>Actual Submission</label><input type="date" value={draft.actual_submission} onChange={e => set('actual_submission', e.target.value)} /></div>
            <div><label>Publication Date</label><input type="date" value={draft.published_on} onChange={e => set('published_on', e.target.value)} /></div>
            <div className="col-span-2"><label>DOI</label><input value={draft.doi} onChange={e => set('doi', e.target.value)} placeholder="10.xxxx/…" /></div>
          </div>
          <div><label>Venue Selection Rationale</label><textarea value={draft.venue_selection_rationale} onChange={e => set('venue_selection_rationale', e.target.value)} /></div>
          <div className="flex flex-wrap gap-4">
            <label className="!mb-0 flex items-center gap-2 text-sm font-normal"><input type="checkbox" className="!w-auto" checked={draft.scopus_indexed} onChange={e => set('scopus_indexed', e.target.checked)} /> Venue is Scopus-indexed (required to count toward the KPI)</label>
            <label className="!mb-0 flex items-center gap-2 text-sm font-normal"><input type="checkbox" className="!w-auto" checked={draft.scope_match_confirmed} onChange={e => set('scope_match_confirmed', e.target.checked)} /> Scope matches the intended venue</label>
            <label className="!mb-0 flex items-center gap-2 text-sm font-normal"><input type="checkbox" className="!w-auto" checked={draft.author_guidelines_reviewed} onChange={e => set('author_guidelines_reviewed', e.target.checked)} /> Author guidelines reviewed</label>
          </div>
          <div className="flex gap-2"><button className="btn btn-blue" onClick={save}>Save</button><button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button></div>
        </div>
      ) : (
        <>
          {warnings.length > 0 && (
            <div className="note text-sm space-y-1">
              <strong>Journal targeting</strong>
              {warnings.map(w => <div key={w} className="flex items-start gap-1.5"><AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> {w}</div>)}
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="card">
              <h3 className="font-bold mb-2">Venue</h3>
              <table><tbody>
                <tr><th>Target Venue</th><td>{work.venue || '—'}</td></tr>
                <tr><th>Targeting</th><td><TargetBadges quality={work.venue_quality || venue?.quality} abs={venue?.abs} />{!venue && !work.venue_quality && '—'}</td></tr>
                <tr><th>Scopus-indexed</th><td>{work.scopus_indexed ? <span className="inline-flex items-center gap-1"><Check className="h-4 w-4 text-success-600" /> Yes — counts toward the KPI once published</span> : 'Not confirmed'}</td></tr>
                <tr><th>Field</th><td>{venue?.field || '—'}</td></tr>
                <tr><th>Publisher</th><td>{venue?.publisher || '—'}</td></tr>
                <tr><th>APC / Fee</th><td>{venue?.apc || '—'}</td></tr>
                <tr><th>Average Turnaround</th><td>{venue?.turnaround || '—'}</td></tr>
                <tr><th>Last Verification</th><td>{venue?.verified_on || '—'}{venue?.verified_by ? ` · ${venue.verified_by}` : ''}</td></tr>
                <tr><th>Manuscript ID</th><td>{work.manuscript_id || '—'}</td></tr>
              </tbody></table>
            </div>
            <div className="card">
              <h3 className="font-bold mb-2">Submission & Publication</h3>
              <table><tbody>
                <tr><th>Target Submission</th><td>{work.target_submission || '—'}</td></tr>
                <tr><th>Actual Submission</th><td>{work.actual_submission || '—'}</td></tr>
                <tr><th>Status</th><td><span className={`badge ${badgeClass(work.submission_status)}`}>{work.submission_status}</span></td></tr>
                <tr><th>Publication Date</th><td>{work.published_on || '—'}</td></tr>
                <tr><th>DOI</th><td>{work.doi ? <a className="text-brand underline" href={`https://doi.org/${work.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//, '')}`} target="_blank" rel="noreferrer">{work.doi}</a> : '—'}</td></tr>
              </tbody></table>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="card">
              <h3 className="font-bold mb-2">Venue Selection Rationale</h3>
              <div className="note">{work.venue_selection_rationale || 'No venue-selection rationale recorded.'}</div>
            </div>
            <div className="card">
              <h3 className="font-bold mb-2">Submission Readiness Checks</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">{work.scope_match_confirmed ? <CheckCircle2 className="h-4 w-4 text-success-600" /> : <Circle className="h-4 w-4 text-ink-300" />} Scope matches the intended venue</div>
                <div className="flex items-center gap-2">{work.author_guidelines_reviewed ? <CheckCircle2 className="h-4 w-4 text-success-600" /> : <Circle className="h-4 w-4 text-ink-300" />} Author guidelines reviewed</div>
              </div>
              {venue?.prior_publication_policy && <div className="note mt-2"><strong>Prior-publication policy:</strong> {venue.prior_publication_policy}</div>}
              <p className="text-xs text-slate-400 mt-3">Journal rankings change every year — verify the current Scopus status, quartile and ABS rating before submitting.</p>
              {work.venue && work.venue !== 'N/A' && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <a className="btn btn-soft !py-1 text-xs" href={scimagoSearch(venue?.full_name || work.venue)} target="_blank" rel="noreferrer">Check on Scimago <ExternalLink className="h-3 w-3" /></a>
                  <a className="btn btn-soft !py-1 text-xs" href={SCOPUS_SOURCES} target="_blank" rel="noreferrer">Scopus Sources <ExternalLink className="h-3 w-3" /></a>
                  <a className="btn btn-soft !py-1 text-xs" href={ABS_GUIDE} target="_blank" rel="noreferrer">ABS Guide <ExternalLink className="h-3 w-3" /></a>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
