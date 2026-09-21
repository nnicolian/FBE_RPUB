import { supabase } from '../../../lib/supabaseClient'
import { badgeClass } from '../../../lib/health'
import { canReviewAsCommittee } from '../../../lib/roles'
import { useAuth } from '../../../context/AuthContext'
import FileList from '../../../components/FileList'

export default function CommitteeTab({ phases, onReload }) {
  const { profile } = useAuth()
  const canReview = canReviewAsCommittee(profile)
  const committeePhases = phases.filter(p => p.committee_required)

  async function addRound(phase) {
    const reviewer = prompt('Reviewer name?'); if (!reviewer) return
    const round = (phase.review_rounds?.length || 0) + 1
    await supabase.from('review_rounds').insert({
      phase_id: phase.id, round, reviewer, status: 'Pending', review_date: new Date().toISOString().slice(0, 10)
    })
    onReload()
  }
  async function setAssessment(round, field, value) {
    await supabase.from('review_rounds').update({ [field]: value }).eq('id', round.id)
    onReload()
  }
  async function decide(phase, round, status) {
    await supabase.from('review_rounds').update({ status }).eq('id', round.id)
    await supabase.from('phases').update({ committee_status: status, committee_date: new Date().toISOString().slice(0, 10) }).eq('id', phase.id)
    onReload()
  }
  async function respond(round) {
    const researcher_response = prompt('Researcher response?'); if (researcher_response == null) return
    await supabase.from('review_rounds').update({ researcher_response, response_date: new Date().toISOString().slice(0, 10) }).eq('id', round.id)
    onReload()
  }

  const ASSESS = ['Not Assessed', 'Satisfactory', 'Needs Work', 'Unsatisfactory']

  return (
    <div className="space-y-3">
      {committeePhases.map(p => (
        <div key={p.id} className="card">
          <div className="flex justify-between items-center">
            <strong>{p.name}</strong>
            <span className={`badge ${badgeClass(p.committee_status)}`}>{p.committee_status}</span>
          </div>
          {(p.review_rounds || []).length === 0 ? (
            <p className="text-slate-400 text-sm mt-2">No review rounds recorded.</p>
          ) : (p.review_rounds || []).map(r => (
            <div key={r.id} className="border border-slate-200 rounded-lg p-2 mt-2">
              <div className="flex justify-between items-center">
                <div>
                  <strong className="text-sm">Round {r.round} · {r.reviewer || 'Reviewer not recorded'}</strong>
                  <div className="text-xs text-slate-400">{r.review_date || 'No review date'}</div>
                </div>
                <span className={`badge ${badgeClass(r.status)}`}>{r.status}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                {[['Research Problem', 'research_problem'], ['Methodology', 'methodology'], ['Submission Readiness', 'submission_readiness']].map(([label, field]) => (
                  <div key={field}>
                    <label>{label}</label>
                    {canReview ? (
                      <select className="!py-1" value={r[field]} onChange={e => setAssessment(r, field, e.target.value)}>
                        {ASSESS.map(a => <option key={a}>{a}</option>)}
                      </select>
                    ) : <div className="font-semibold">{r[field]}</div>}
                  </div>
                ))}
              </div>
              {canReview ? (
                <div className="mt-2"><label>Committee Comments</label><textarea defaultValue={r.committee_comments} onBlur={e => setAssessment(r, 'committee_comments', e.target.value)} /></div>
              ) : (
                r.committee_comments && <div className="note mt-2 text-xs"><strong>Committee feedback:</strong> {r.committee_comments}</div>
              )}
              {r.researcher_response && <div className="note mt-2 text-xs"><strong>Researcher response:</strong> {r.researcher_response}</div>}
              <FileList entityType="review_round" entityId={r.id} />
              <div className="flex gap-2 mt-2">
                {canReview && <button className="btn btn-ghost !py-1 !px-2 text-xs" onClick={() => decide(p, r, 'Blessed')}>Bless</button>}
                {canReview && <button className="btn btn-ghost !py-1 !px-2 text-xs" onClick={() => decide(p, r, 'Changes Requested')}>Request changes</button>}
                <button className="btn btn-ghost !py-1 !px-2 text-xs" onClick={() => respond(r)}>Researcher Response</button>
              </div>
            </div>
          ))}
          {canReview && <button className="text-xs text-brand font-semibold mt-2" onClick={() => addRound(p)}>+ Review Round</button>}
        </div>
      ))}
      {committeePhases.length === 0 && <p className="text-slate-400 text-sm">No phases in this work require committee review.</p>}
    </div>
  )
}
