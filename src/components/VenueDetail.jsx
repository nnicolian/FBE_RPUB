import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Check, Circle, ExternalLink, Landmark, BookOpen } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { quartileTarget, absTarget, isScopus } from '../lib/journals'
import { scimagoSearch, scholarJournal, scholarMetrics } from '../lib/journalLinks'
import { badgeClass } from '../lib/health'

// Venue Library → click a venue: everything the library holds about it, quick links, and the papers in the
// pipeline that target it (only the papers this user may open — the database decides, as everywhere else).

const CHECKLIST_ITEMS = [
  ['indexing', 'Indexing verified'], ['quality', 'Quality tier confirmed'], ['publisher', 'Publisher verified'],
  ['fees', 'Fees / APC reviewed'], ['peerReview', 'Peer review process reviewed'], ['scope', 'Scope fit reviewed'],
]

function Row({ label, value }) {
  if (!value) return null
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-ink-50 last:border-0">
      <dt className="text-xs font-semibold text-ink-500">{label}</dt>
      <dd className="col-span-2 text-sm text-ink-800 whitespace-pre-line">{value}</dd>
    </div>
  )
}

export default function VenueDetail({ venue: v, onClose }) {
  const nav = useNavigate()
  const [papers, setPapers] = useState(null)
  const name = v.full_name || v.name

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    setPapers(null)
    const names = [v.name, v.full_name].filter(Boolean)
    supabase.from('works').select('id, title, lead, department, submission_status, stage').in('venue', names)
      .order('created_at', { ascending: false })
      .then(({ data }) => setPapers(data || []))
  }, [v.id, v.name, v.full_name])

  const q = quartileTarget(v.quality), a = absTarget(v.abs)
  const checklist = v.verification_checklist || {}
  const L = ({ href, children }) => (
    <a className="btn btn-soft !py-1 text-xs" href={href} target="_blank" rel="noreferrer">{children} <ExternalLink className="h-3 w-3" /></a>
  )

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink-950/40 backdrop-blur-sm" onClick={onClose}>
      <aside className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-float animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-start gap-3 border-b border-ink-100 bg-white/95 backdrop-blur px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-900 text-white shrink-0"><Landmark className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-ink-900 leading-tight">{v.name}</h2>
            {v.full_name && v.full_name !== v.name && <p className="text-sm text-ink-500">{v.full_name}</p>}
            <p className="text-xs text-ink-400 mt-0.5">{[v.type, v.publisher, v.field].filter(Boolean).join(' · ')}</p>
          </div>
          <button className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-50 hover:text-ink-700" onClick={onClose} aria-label="Close"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-5 px-5 py-5">
          {/* Ratings */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-ink-50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">Scopus</p>
              <p className="mt-1 text-sm font-bold text-ink-900">{isScopus(v) ? 'Indexed' : 'Not indexed'}</p>
              {v.indexing && <p className="text-[11px] text-ink-500">{v.indexing}</p>}
            </div>
            <div className="rounded-xl bg-ink-50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">SJR quartile</p>
              <p className="mt-1 text-sm font-bold text-ink-900">{v.quality || '—'}</p>
              {q && <p className="text-[11px] text-ink-500">{q.label}</p>}
            </div>
            <div className="rounded-xl bg-ink-50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">ABS</p>
              <p className="mt-1 text-sm font-bold text-ink-900">{v.abs || '—'}</p>
              {a && <p className="text-[11px] text-ink-500">{a.label}</p>}
            </div>
          </div>

          {/* Details */}
          <dl>
            <Row label="CiteScore" value={v.cite_score} />
            <Row label="APC / fees" value={v.apc} />
            <Row label="Turnaround" value={v.turnaround} />
            <Row label="Peer review" value={v.peer_review_process} />
            <Row label="Prior publication policy" value={v.prior_publication_policy} />
            <Row label="Scope fit guidance" value={v.scope_fit_guidance} />
            <Row label="University floor" value={v.floor ? 'Meets the floor (Scopus-indexed)' : ''} />
          </dl>

          {/* Verification */}
          <div>
            <h3 className="text-sm font-bold mb-2">Verification</h3>
            <div className="grid grid-cols-2 gap-1.5">
              {CHECKLIST_ITEMS.map(([key, label]) => (
                <div key={key} className="flex items-center gap-2 text-sm text-ink-700">
                  {checklist[key] ? <Check className="h-4 w-4 text-success-600" /> : <Circle className="h-4 w-4 text-ink-300" />}{label}
                </div>
              ))}
            </div>
            {(v.verified_on || v.verified_by) && (
              <p className="mt-2 text-xs text-ink-400">Verified{v.verified_on ? ` on ${v.verified_on}` : ''}{v.verified_by ? ` by ${v.verified_by}` : ''}</p>
            )}
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-bold mb-2">Check it on</h3>
            <div className="flex flex-wrap gap-2">
              <L href={scholarJournal(name)}>Google Scholar</L>
              <L href={scholarMetrics(name)}>Scholar Metrics</L>
              <L href={scimagoSearch(name)}>Scimago</L>
            </div>
            <p className="mt-2 text-xs text-ink-400">Rankings change yearly — verify before submitting.</p>
          </div>

          {/* Papers */}
          <div>
            <h3 className="text-sm font-bold mb-2 flex items-center gap-2"><BookOpen className="h-4 w-4 text-accent-600" /> Papers targeting this venue</h3>
            {papers === null ? <p className="text-sm text-ink-400">Loading…</p>
              : papers.length === 0 ? <p className="text-sm text-ink-400">No papers in the pipeline that you can open target this venue.</p>
              : (
                <ul className="divide-y divide-ink-50">
                  {papers.map((p) => (
                    <li key={p.id}>
                      <button className="w-full text-left py-2 hover:bg-ink-50 rounded-lg px-2 -mx-2" onClick={() => nav(`/pipeline/${p.id}`)}>
                        <p className="text-sm font-medium text-accent-700">{p.title}</p>
                        <p className="text-xs text-ink-400 flex flex-wrap items-center gap-2 mt-0.5">
                          {p.lead && <span>{p.lead}</span>}{p.department && <span>· {p.department}</span>}{p.stage && <span>· {p.stage}</span>}
                          {p.submission_status && <span className={`badge ${badgeClass(p.submission_status)}`}>{p.submission_status}</span>}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
          </div>
        </div>
      </aside>
    </div>
  )
}
