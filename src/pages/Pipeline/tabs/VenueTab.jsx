import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { badgeClass } from '../../../lib/health'

export default function VenueTab({ work, canEdit, onPatch }) {
  const [venue, setVenue] = useState(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({
    venue: work.venue || '', venue_quality: work.venue_quality || '', manuscript_id: work.manuscript_id || '',
    target_submission: work.target_submission || '', actual_submission: work.actual_submission || '',
    venue_selection_rationale: work.venue_selection_rationale || '',
    scope_match_confirmed: work.scope_match_confirmed, author_guidelines_reviewed: work.author_guidelines_reviewed
  })

  useEffect(() => {
    if (work.venue) supabase.from('venues').select('*').eq('name', work.venue).single().then(({ data }) => setVenue(data))
  }, [work.venue])

  function save() { onPatch(draft); setEditing(false) }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canEdit && !editing && <button className="btn btn-soft" onClick={() => setEditing(true)}>✎ Edit Venue / Submission</button>}
      </div>
      {editing ? (
        <div className="card grid grid-cols-2 gap-3">
          <div><label>Target Venue</label><input value={draft.venue} onChange={e => setDraft(d => ({ ...d, venue: e.target.value }))} /></div>
          <div>
            <label>Venue Quality</label>
            <select value={draft.venue_quality} onChange={e => setDraft(d => ({ ...d, venue_quality: e.target.value }))}>
              <option value="">—</option>{['Q1', 'Q2', 'Q3', 'Q4', 'Conference'].map(q => <option key={q}>{q}</option>)}
            </select>
          </div>
          <div><label>Manuscript ID</label><input value={draft.manuscript_id} onChange={e => setDraft(d => ({ ...d, manuscript_id: e.target.value }))} /></div>
          <div><label>Target Submission</label><input type="date" value={draft.target_submission || ''} onChange={e => setDraft(d => ({ ...d, target_submission: e.target.value }))} /></div>
          <div><label>Actual Submission</label><input type="date" value={draft.actual_submission || ''} onChange={e => setDraft(d => ({ ...d, actual_submission: e.target.value }))} /></div>
          <div className="col-span-2"><label>Venue Selection Rationale</label><textarea value={draft.venue_selection_rationale} onChange={e => setDraft(d => ({ ...d, venue_selection_rationale: e.target.value }))} /></div>
          <label className="flex items-center gap-2 text-sm font-normal"><input type="checkbox" checked={draft.scope_match_confirmed} onChange={e => setDraft(d => ({ ...d, scope_match_confirmed: e.target.checked }))} /> Scope matches the intended venue</label>
          <label className="flex items-center gap-2 text-sm font-normal"><input type="checkbox" checked={draft.author_guidelines_reviewed} onChange={e => setDraft(d => ({ ...d, author_guidelines_reviewed: e.target.checked }))} /> Author guidelines reviewed</label>
          <div className="col-span-2 flex gap-2"><button className="btn btn-blue" onClick={save}>Save</button><button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="card">
              <h3 className="font-bold mb-2">Venue</h3>
              <table><tbody>
                <tr><th>Target Venue</th><td>{work.venue || '—'}</td></tr>
                <tr><th>Publisher</th><td>{venue?.publisher || '—'}</td></tr>
                <tr><th>Indexing</th><td>{venue?.indexing || '—'}</td></tr>
                <tr><th>Quality</th><td>{work.venue_quality || '—'}{venue?.cite_score ? ` · CiteScore ${venue.cite_score}` : ''}</td></tr>
                <tr><th>APC / Fee</th><td>{venue?.apc || '—'}</td></tr>
                <tr><th>Average Turnaround</th><td>{venue?.turnaround || '—'}</td></tr>
                <tr><th>Last Verification</th><td>{venue?.verified_on || '—'}{venue?.verified_by ? ` · ${venue.verified_by}` : ''}</td></tr>
                <tr><th>Manuscript ID</th><td>{work.manuscript_id || '—'}</td></tr>
              </tbody></table>
            </div>
            <div className="card">
              <h3 className="font-bold mb-2">Submission Dates & Outcome</h3>
              <table><tbody>
                <tr><th>Target Submission</th><td>{work.target_submission || '—'}</td></tr>
                <tr><th>Actual Submission</th><td>{work.actual_submission || '—'}</td></tr>
                <tr><th>Status</th><td><span className={`badge ${badgeClass(work.submission_status)}`}>{work.submission_status}</span></td></tr>
              </tbody></table>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="card">
              <h3 className="font-bold mb-2">Venue Selection Rationale</h3>
              <div className="note">{work.venue_selection_rationale || 'No venue-selection rationale recorded.'}</div>
            </div>
            <div className="card">
              <h3 className="font-bold mb-2">Submission Readiness Checks</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">{work.scope_match_confirmed ? '✓' : '○'} Scope matches the intended venue</div>
                <div className="flex items-center gap-2">{work.author_guidelines_reviewed ? '✓' : '○'} Author guidelines reviewed</div>
              </div>
              {venue?.prior_publication_policy && <div className="note mt-2"><strong>Prior-publication policy:</strong> {venue.prior_publication_policy}</div>}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
