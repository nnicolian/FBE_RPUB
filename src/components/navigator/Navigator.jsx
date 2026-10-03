import { useEffect, useMemo, useState } from 'react'
import {
  Compass, Search, Copy, Check, ClipboardPaste, ShieldCheck, AlertTriangle, Loader2, ExternalLink, Trash2, ThumbsUp, ThumbsDown,
  ChevronDown, ChevronRight, FileText, Lock, Download, Pin, X,
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { searchTopic, journalRecent, numberSources, topVenues, doiUrl } from '../../lib/navigator/scholarly'
import {
  TOOLS, STAGE_ORDER, toolByKey, stageOf, buildRequest, verifyAnswer, DECISION_FIELDS, earlierContext, earlierCitedSources, toBibtex, toRis,
} from '../../lib/navigator/tools'

// Research Navigator workspace — used inside a paper (work) and on the researcher's own Navigator page (no work).
// "Bring your own AI": gather verified sources → copy the request into ChatGPT / Claude → paste the answer back →
// every cited source is checked → save to the paper. Nothing is sent anywhere unless the researcher does it.

const AIS = ['ChatGPT', 'Claude', 'Gemini', 'Other']

export default function NavigatorWorkspace({ work = null, canEdit = false, onPatchWork }) {
  const { profile } = useAuth()
  const stage = stageOf(work)
  const tools = work ? TOOLS.filter((t) => t.key !== 'landscape') : TOOLS.filter((t) => t.key === 'landscape')
  const [toolKey, setToolKey] = useState(work ? (tools.find((t) => t.stage === stage) || tools[0]).key : 'landscape')
  const [outputs, setOutputs] = useState(null)
  const [openOut, setOpenOut] = useState(null)

  const loadOutputs = async () => {
    let q = supabase.from('navigator_outputs').select('*').order('created_at', { ascending: false })
    q = work ? q.eq('work_id', work.id) : q.is('work_id', null).eq('created_by', profile?.id)
    const { data } = await q
    setOutputs(data || [])
  }
  useEffect(() => { loadOutputs() }, [work?.id, profile?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const grouped = STAGE_ORDER.map((s) => ({ stage: s, list: tools.filter((t) => t.stage === s) })).filter((g) => g.list.length)

  return (
    <div className="space-y-4">
      <div className="note text-sm flex items-start gap-2">
        <Compass className="h-4 w-4 text-accent-600 shrink-0 mt-0.5" />
        <span>
          <b>Research Navigator</b> gathers verified scholarly sources (OpenAlex, with DOIs) and prepares a request for <b>your own AI</b> — your AUST ChatGPT, or Claude.
          Paste its answer back and every reference is checked against those sources before it's saved{work ? ' to this paper' : ''}.
          It advises and assesses; it doesn't write your manuscript. Remember to follow the journal's AI-disclosure rules.
        </span>
      </div>

      {work && (
        <div className="flex flex-wrap gap-3">
          {grouped.map((g) => (
            <div key={g.stage} className="min-w-[180px]">
              <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${g.stage === stage ? 'text-accent-700' : 'text-slate-400'}`}>
                {g.stage}{g.stage === stage ? ' · current stage' : ''}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {g.list.map((t) => (
                  <button key={t.key} onClick={() => setToolKey(t.key)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${toolKey === t.key ? 'bg-ink-900 text-white' : g.stage === stage ? 'bg-accent-50 text-accent-700 hover:bg-accent-100' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    {t.title}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {work && <DecisionsCard work={work} canEdit={canEdit} onPatchWork={onPatchWork} />}

      <Runner key={toolKey} toolKey={toolKey} work={work} canEdit={canEdit} onPatchWork={onPatchWork} onSaved={loadOutputs} outputs={outputs || []} />

      <div className="card">
        <h3 className="font-bold mb-2">Saved results{outputs ? ` (${outputs.length})` : ''}</h3>
        {outputs === null ? <p className="text-sm text-slate-400">Loading…</p>
          : outputs.length === 0 ? <p className="text-sm text-slate-400">Nothing saved yet.</p>
          : (
            <div className="divide-y divide-slate-100">
              {outputs.map((o) => (
                <div key={o.id} className="py-2">
                  <button className="w-full flex items-center gap-2 text-left" onClick={() => setOpenOut(openOut === o.id ? null : o.id)}>
                    {openOut === o.id ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                    <span className="font-medium text-sm flex-1">{toolByKey(o.tool)?.title || o.tool}{o.title ? ` — ${o.title}` : ''}</span>
                    <VerifyBadge v={o.verification} />
                    <span className="text-xs text-slate-400 whitespace-nowrap">{new Date(o.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}{o.ai_used ? ` · ${o.ai_used}` : ''}</span>
                  </button>
                  {openOut === o.id && <SavedOutput o={o} mine={o.created_by === profile?.id} onChanged={loadOutputs} work={work} canEdit={canEdit} onPatchWork={onPatchWork} />}
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------------------------
function Runner({ toolKey, work, canEdit, onPatchWork, onSaved, outputs }) {
  const tool = toolByKey(toolKey)
  const { profile } = useAuth()
  const { showToast } = useToast()
  const [topic, setTopic] = useState(work ? [work.title, work.abstract].filter(Boolean).join('. ').slice(0, 400) : '')
  const [journals, setJournals] = useState(work?.venue ? [work.venue] : [])
  const [extraJournal, setExtraJournal] = useState('')
  const [reviews, setReviews] = useState('')
  const [venues, setVenues] = useState([])
  const [researchers, setResearchers] = useState([])
  const [step, setStep] = useState('inputs') // inputs → gathering → request → check → saved
  const [sources, setSources] = useState([])
  const [request, setRequest] = useState('')
  const [copied, setCopied] = useState(false)
  const [answer, setAnswer] = useState('')
  const [ai, setAi] = useState('ChatGPT')
  const [check, setCheck] = useState(null)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('venues').select('*').eq('active', true).order('name').then(({ data }) => setVenues(data || []))
    supabase.from('researchers').select('id, name, department, research_areas, active, profile_id').eq('active', true).then(({ data }) => setResearchers(data || []))
  }, [])

  const me = researchers.find((r) => r.profile_id === profile?.id)
  const needsDraft = tool.needs.includes('draft')
  const needsJournal = tool.needs.includes('journal')
  const needsJournals = tool.needs.includes('journals')
  const needsReviews = tool.needs.includes('reviews')
  const consented = !!work?.ai_draft_consent_at

  const ready = topic.trim().length > 3 && (!needsJournal || journals.length >= 1) && (!needsJournals || journals.length >= 1)
    && (!needsReviews || reviews.trim().length > 20) && (!needsDraft || consented)

  async function gather() {
    setError(null); setStep('gathering')
    try {
      let list = await searchTopic(topic)
      const journalInfo = []
      if (needsJournal || needsJournals) {
        for (const j of journals.slice(0, 5)) {
          const r = await journalRecent(j, topic, { n: 6 })
          if (r.journal) journalInfo.push(r.journal)
          list = [...r.papers, ...list]
        }
      }
      // Sources the paper's earlier results relied on come first, so the next answer can build on them.
      const prior = work ? earlierCitedSources(outputs, toolKey, 20) : []
      list = [...prior, ...list]
      const seen = new Set()
      list = list.filter((s) => { const k = s.openalex; if (seen.has(k)) return false; seen.add(k); return true })
      const numbered = numberSources(list, 60)
      const sidByOa = new Map(numbered.map((s) => [s.openalex, s.sid]))
      const earlier = work ? earlierContext(outputs, toolKey, 1800, (src) => sidByOa.get(src.openalex)) : []
      // Faculty context: the Venue Library entries that matter for this tool, and colleagues for collaborator suggestions.
      const venueNames = new Set([...journals, ...topVenues(numbered, 12).map((v) => v.name)].map((n) => n.toLowerCase()))
      const relevantVenues = ['landscape', 'ladder', 'fit', 'guidelines', 'cover', 'retarget'].includes(toolKey)
        ? venues.filter((v) => venueNames.has((v.full_name || '').toLowerCase()) || venueNames.has((v.name || '').toLowerCase())).slice(0, 25)
        : []
      let colleagues = []
      if (toolKey === 'collaborators') {
        const { data: ws } = await supabase.from('works').select('title, lead, stage').neq('stage', 'Published')
        colleagues = researchers.filter((r) => r.profile_id !== profile?.id).map((r) => ({
          ...r, papers: (ws || []).filter((w) => (w.lead || '').toLowerCase() === (r.name || '').toLowerCase()).map((w) => w.title).slice(0, 4),
        })).filter((r) => r.research_areas || r.papers.length).slice(0, 40)
      }
      const req = buildRequest(toolKey, {
        topic, work, researcher: me ? { name: me.name, research_areas: me.research_areas } : null,
        colleagues, venues: relevantVenues, journals, journalInfo, reviews: needsReviews ? reviews : '', sources: numbered,
        decisions: work?.navigator_decisions || {}, earlier,
      })
      setSources(numbered); setRequest(req); setStep('request')
    } catch (e) {
      setError(`Could not gather sources: ${e.message || e}`); setStep('inputs')
    }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(request); setCopied(true); setTimeout(() => setCopied(false), 2500) }
    catch { setError('Copy failed — select the text in the box and copy it manually.') }
  }

  function runCheck() { setCheck(verifyAnswer(answer, sources)); setStep('check') }

  async function save() {
    setSaving(true)
    const { error: e } = await supabase.from('navigator_outputs').insert({
      work_id: work?.id ?? null, tool: toolKey, title: !work ? topic.slice(0, 120) : (journals.length && (needsJournal || needsJournals) ? journals.join(', ') : ''),
      inputs: { topic, journals, reviews: needsReviews ? reviews : undefined }, sources,
      response: answer, verification: check || {}, ai_used: ai,
    })
    setSaving(false)
    if (e) { setError(e.message); return }
    showToast('Saved')
    setStep('saved'); onSaved()
  }

  async function giveConsent() {
    if (!work || !onPatchWork) return
    await onPatchWork({ ai_draft_consent_at: new Date().toISOString(), ai_draft_consent_by: profile?.id })
  }

  return (
    <div className="card space-y-4">
      <div>
        <h3 className="text-lg font-bold flex items-center gap-2"><Compass className="h-5 w-5 text-accent-600" /> {tool.title}</h3>
        <p className="text-sm text-slate-500">{tool.blurb}</p>
      </div>
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      {/* 1. Inputs */}
      {(step === 'inputs' || step === 'gathering') && (
        <div className="space-y-3">
          <label>{work ? 'Topic used to search the literature (edit to focus it)' : 'Your research interest'}
            <textarea className="min-h-[70px]" value={topic} onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. AI-enabled organizational decision making" />
          </label>
          {(needsJournal || needsJournals) && (
            <div>
              <label>{needsJournals ? 'Candidate journals (2–5)' : 'Journal'}</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {journals.map((j) => (
                  <span key={j} className="badge badge-gray">{j}<button className="ml-1" onClick={() => setJournals(journals.filter((x) => x !== j))}>×</button></span>
                ))}
              </div>
              <div className="flex gap-2">
                <select value="" onChange={(e) => { const v = e.target.value; if (v && !journals.includes(v)) setJournals(needsJournals ? [...journals, v].slice(0, 5) : [v]) }}>
                  <option value="">Add from the Venue Library…</option>
                  {venues.filter((v) => (v.type || 'Journal') === 'Journal').map((v) => <option key={v.id} value={v.full_name || v.name}>{v.full_name || v.name}{v.quality ? ` · ${v.quality}` : ''}{v.abs ? ` · ABS ${v.abs}` : ''}</option>)}
                </select>
                <input placeholder="…or type a journal name" value={extraJournal} onChange={(e) => setExtraJournal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && extraJournal.trim()) { setJournals(needsJournals ? [...journals, extraJournal.trim()].slice(0, 5) : [extraJournal.trim()]); setExtraJournal('') } }} />
              </div>
            </div>
          )}
          {needsReviews && (
            <label>Reviewer / editor comments (paste them in)
              <textarea className="min-h-[140px]" value={reviews} onChange={(e) => setReviews(e.target.value)} />
            </label>
          )}
          {needsDraft && (
            consented ? (
              <p className="text-sm text-emerald-700 flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> Draft review allowed for this paper — you'll attach the manuscript file in your AI chat.</p>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <p className="flex items-center gap-1.5 font-semibold"><Lock className="h-4 w-4" /> Consent needed</p>
                <p className="mt-1">This tool asks you to attach the manuscript to your own AI chat. The authors should agree before drafts of this paper are shared with an AI service.</p>
                {canEdit
                  ? <button className="btn btn-soft mt-2" onClick={giveConsent}>I confirm the authors agree</button>
                  : <p className="mt-1 text-xs">Ask the lead author to give consent on this tab.</p>}
              </div>
            )
          )}
          <button className="btn btn-blue" disabled={!ready || step === 'gathering'} onClick={gather}>
            {step === 'gathering' ? <><Loader2 className="h-4 w-4 animate-spin" /> Searching the literature…</> : <><Search className="h-4 w-4" /> Gather sources &amp; prepare the request</>}
          </button>
        </div>
      )}

      {/* 2. Request */}
      {(step === 'request' || step === 'check') && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-600">{work && (outputs.length > 0 || Object.keys(work.navigator_decisions || {}).length > 0) && <span className="block text-xs text-accent-700 mb-1">Includes this paper's decisions and earlier results, so the answer builds on them.</span>}<b>Step 1.</b> Copy this request{needsDraft ? ', open your AI, attach the manuscript file' : ' into your AI'} and send it. {sources.length} verified sources are included.</p>
            <div className="flex gap-2">
              <button className="btn btn-blue" onClick={copy}>{copied ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy request</>}</button>
              <a className="btn btn-ghost" href="https://chatgpt.com/" target="_blank" rel="noreferrer">ChatGPT <ExternalLink className="h-3.5 w-3.5" /></a>
              <a className="btn btn-ghost" href="https://claude.ai/new" target="_blank" rel="noreferrer">Claude <ExternalLink className="h-3.5 w-3.5" /></a>
            </div>
          </div>
          <details className="rounded-lg border border-slate-200">
            <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-slate-500">Show the request ({Math.round(request.length / 1000)}k characters) and the sources</summary>
            <textarea readOnly className="min-h-[220px] font-mono text-[11px] border-0" value={request} />
          </details>
          <label><b>Step 2.</b> Paste your AI's answer here
            <textarea className="min-h-[200px]" value={answer} onChange={(e) => { setAnswer(e.target.value); if (step === 'check') setStep('request') }} placeholder="Paste the whole answer…" />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <select className="!w-auto" value={ai} onChange={(e) => setAi(e.target.value)}>{AIS.map((a) => <option key={a}>{a}</option>)}</select>
            <button className="btn btn-blue" disabled={answer.trim().length < 50} onClick={runCheck}><ClipboardPaste className="h-4 w-4" /> Check the answer</button>
            <button className="btn btn-ghost" onClick={() => { setStep('inputs'); setAnswer(''); setCheck(null) }}>Start over</button>
          </div>
        </div>
      )}

      {/* 3. Check + save */}
      {step === 'check' && check && (
        <div className="space-y-3">
          <CheckReport v={check} />
          <RenderedAnswer text={answer} sources={sources} />
          <div className="flex gap-2">
            <button className="btn btn-blue" disabled={saving} onClick={save}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save{work ? ' to this paper' : ''}</button>
            {!check.ok && <p className="text-xs text-amber-700 self-center">You can still save — unverified references stay flagged.</p>}
          </div>
        </div>
      )}
      {step === 'saved' && (
        <div className="flex items-center gap-3">
          <p className="text-sm text-emerald-700 flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> Saved below.</p>
          <button className="btn btn-ghost" onClick={() => { setStep('inputs'); setAnswer(''); setCheck(null) }}>Run again</button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------------------------------------------
function VerifyBadge({ v }) {
  if (!v || v.ok === undefined) return null
  return v.ok
    ? <span className="badge badge-green"><ShieldCheck className="h-3 w-3" /> Sources verified</span>
    : <span className="badge badge-amber"><AlertTriangle className="h-3 w-3" /> Unverified items</span>
}

function CheckReport({ v }) {
  return (
    <div className={`rounded-lg border p-3 text-sm ${v.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
      <p className="font-semibold flex items-center gap-1.5">
        {v.ok ? <ShieldCheck className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
        {v.ok ? `All references check out — ${v.cited.length} verified sources cited.` : 'Some references could not be verified'}
      </p>
      {!v.ok && (
        <ul className="mt-1 list-disc pl-5 space-y-0.5">
          {v.cited.length > 0 && <li>{v.cited.length} verified sources cited.</li>}
          {v.invalid.length > 0 && <li>Source numbers that don't exist: {v.invalid.join(', ')}</li>}
          {v.unknown_dois.length > 0 && <li>DOIs not among the sources: {v.unknown_dois.join(', ')}</li>}
          {v.unmatched_citations.length > 0 && <li>Author–year citations that match no source: {v.unmatched_citations.join('; ')}</li>}
          <li>Treat those items as unconfirmed, or ask your AI to answer using only the numbered sources.</li>
        </ul>
      )}
    </div>
  )
}

/** Light formatting of the answer (headings, bullets, tables, bold) with source numbers linked to their DOI. */
function RenderedAnswer({ text, sources }) {
  const byId = useMemo(() => new Map(sources.map((s) => [s.sid, s])), [sources])
  const inline = (s, k) => {
    const parts = s.split(/(\[S\d+(?:\s*[,;–-]\s*S?\d+)*\]|\*\*[^*]+\*\*)/g)
    return parts.map((p, i) => {
      if (/^\*\*.+\*\*$/.test(p)) return <b key={`${k}-${i}`}>{p.slice(2, -2)}</b>
      const m = p.match(/^\[(.+)\]$/)
      if (m && /^S\d/i.test(m[1])) {
        return <span key={`${k}-${i}`} className="whitespace-nowrap">[{m[1].split(/[,;]/).map((x, j) => {
          const id = x.trim().toUpperCase().startsWith('S') ? x.trim().toUpperCase() : `S${x.trim()}`
          const src = byId.get(id)
          return <span key={j}>{j > 0 && ', '}{src
            ? <a className="text-accent-700 hover:underline" href={doiUrl(src.doi) || src.openalex} target="_blank" rel="noreferrer" title={`${src.authors.join(', ')} (${src.year}). ${src.title}. ${src.venue}`}>{id}</a>
            : <span className="text-rose-600 font-semibold" title="Not among the sources">{id}?</span>}</span>
        })}]</span>
      }
      return <span key={`${k}-${i}`}>{p}</span>
    })
  }
  const lines = text.split('\n')
  const out = []
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    if (/^\s*\|/.test(l)) {
      const rows = []
      while (i < lines.length && /^\s*\|/.test(lines[i])) { if (!/^\s*\|[\s:|-]+\|\s*$/.test(lines[i])) rows.push(lines[i]); i++ }
      i--
      const cells = rows.map((r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()))
      out.push(
        <div key={`t${i}`} className="overflow-x-auto my-2"><table className="text-xs">
          <thead><tr>{(cells[0] || []).map((c, j) => <th key={j}>{inline(c, `h${i}${j}`)}</th>)}</tr></thead>
          <tbody>{cells.slice(1).map((r, ri) => <tr key={ri}>{r.map((c, j) => <td key={j} className="align-top">{inline(c, `c${i}${ri}${j}`)}</td>)}</tr>)}</tbody>
        </table></div>,
      )
      continue
    }
    const h = l.match(/^(#{1,4})\s+(.*)/)
    if (h) { out.push(<p key={i} className={`font-bold text-ink-900 ${h[1].length <= 2 ? 'text-base mt-3' : 'text-sm mt-2'}`}>{inline(h[2], i)}</p>); continue }
    const b = l.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)/)
    if (b) { out.push(<p key={i} className="text-sm pl-4 relative before:content-['•'] before:absolute before:left-1 before:text-slate-400">{inline(b[1], i)}</p>); continue }
    if (!l.trim()) { out.push(<div key={i} className="h-2" />); continue }
    out.push(<p key={i} className="text-sm">{inline(l, i)}</p>)
  }
  return <div className="rounded-lg border border-slate-200 p-4 max-h-[600px] overflow-y-auto">{out}</div>
}

function SavedOutput({ o, mine, onChanged, work, canEdit, onPatchWork }) {
  const [showSources, setShowSources] = useState(false)
  const rate = async (r) => { await supabase.from('navigator_outputs').update({ rating: o.rating === r ? null : r }).eq('id', o.id); onChanged() }
  const remove = async () => { if (!confirm('Delete this saved result?')) return; await supabase.from('navigator_outputs').delete().eq('id', o.id); onChanged() }
  return (
    <div className="mt-2 space-y-2">
      {o.verification && o.verification.ok === false && <CheckReport v={o.verification} />}
      <RenderedAnswer text={o.response} sources={o.sources || []} />
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button className="btn btn-ghost !py-1" onClick={() => setShowSources(!showSources)}><FileText className="h-3.5 w-3.5" /> {showSources ? 'Hide' : 'Show'} sources ({(o.sources || []).length})</button>
        {mine && <>
          <button className={`btn !py-1 ${o.rating === 1 ? 'btn-soft' : 'btn-ghost'}`} onClick={() => rate(1)}><ThumbsUp className="h-3.5 w-3.5" /> Helpful</button>
          <button className={`btn !py-1 ${o.rating === -1 ? 'btn-soft' : 'btn-ghost'}`} onClick={() => rate(-1)}><ThumbsDown className="h-3.5 w-3.5" /> Not helpful</button>
          <button className="btn btn-ghost !py-1 text-rose-600" onClick={remove}><Trash2 className="h-3.5 w-3.5" /> Delete</button>
        </>}
      </div>
      {work && canEdit && <AdoptPanel o={o} work={work} onPatchWork={onPatchWork} />}
      {showSources && (
        <ul className="text-xs space-y-1">
          {(o.sources || []).map((s) => (
            <li key={s.sid}><b>{s.sid}</b> {s.authors.join(', ')} ({s.year}). {s.title}. <i>{s.venue}</i>.{' '}
              {s.doi ? <a className="text-accent-700 hover:underline" href={doiUrl(s.doi)} target="_blank" rel="noreferrer">{s.doi}</a> : null} · {s.cites} citations</li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------------------------------------------
const download = (name, text, type) => {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** The paper's adopted decisions: shown on top of the tab, used by every later request, editable by authors. */
function DecisionsCard({ work, canEdit, onPatchWork }) {
  const d = work.navigator_decisions || {}
  const [edit, setEdit] = useState(false)
  const [draft, setDraft] = useState(d)
  useEffect(() => { setDraft(work.navigator_decisions || {}) }, [work.navigator_decisions])
  const refs = d.key_references || []
  const any = DECISION_FIELDS.some((f) => d[f.key]) || refs.length || d.ladder?.A || d.ladder?.B || d.ladder?.C
  const save = async () => { await onPatchWork({ navigator_decisions: draft }); setEdit(false) }
  const removeRef = (doiOrId) => onPatchWork({ navigator_decisions: { ...d, key_references: refs.filter((r) => (r.doi || r.openalex) !== doiOrId) } })
  return (
    <div className="card">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="font-bold flex items-center gap-2"><Pin className="h-4 w-4 text-accent-600" /> Paper decisions</h3>
        {canEdit && !edit && <button className="btn btn-ghost !py-1 text-xs" onClick={() => setEdit(true)}>Edit</button>}
      </div>
      {!any && !edit && <p className="text-sm text-slate-400">Nothing adopted yet. Open a saved result below and use <b>Adopt into the paper</b> — every later tool then builds on these decisions.</p>}
      {edit ? (
        <div className="space-y-2">
          {DECISION_FIELDS.map((f) => (
            <label key={f.key}>{f.label}<textarea className="min-h-[48px]" value={draft[f.key] || ''} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} /></label>
          ))}
          <div className="grid grid-cols-3 gap-2">
            {['A', 'B', 'C'].map((k) => <label key={k}>Target {k}<input value={draft.ladder?.[k] || ''} onChange={(e) => setDraft({ ...draft, ladder: { ...(draft.ladder || {}), [k]: e.target.value } })} /></label>)}
          </div>
          <label>Ladder notes<input value={draft.ladder?.notes || ''} onChange={(e) => setDraft({ ...draft, ladder: { ...(draft.ladder || {}), notes: e.target.value } })} /></label>
          <div className="flex gap-2"><button className="btn btn-blue" onClick={save}>Save decisions</button><button className="btn btn-ghost" onClick={() => { setDraft(d); setEdit(false) }}>Cancel</button></div>
        </div>
      ) : any ? (
        <div className="space-y-1.5 text-sm">
          {DECISION_FIELDS.filter((f) => d[f.key]).map((f) => <p key={f.key}><b className="text-slate-500 font-semibold">{f.label}:</b> {d[f.key]}</p>)}
          {(d.ladder?.A || d.ladder?.B || d.ladder?.C) && (
            <p><b className="text-slate-500 font-semibold">Journal Target Ladder:</b> A {d.ladder.A || '—'} · B {d.ladder.B || '—'} · C {d.ladder.C || '—'}{d.ladder.notes ? <span className="text-slate-500"> — {d.ladder.notes}</span> : null}</p>
          )}
          {refs.length > 0 && (
            <div className="pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <b className="text-slate-500 font-semibold">Key references ({refs.length})</b>
                <button className="btn btn-ghost !py-0.5 text-xs" onClick={() => download('key_references.bib', toBibtex(refs), 'application/x-bibtex')}><Download className="h-3 w-3" /> BibTeX</button>
                <button className="btn btn-ghost !py-0.5 text-xs" onClick={() => download('key_references.ris', toRis(refs), 'application/x-research-info-systems')}><Download className="h-3 w-3" /> RIS</button>
              </div>
              <ul className="mt-1 space-y-0.5 text-xs">
                {refs.map((r) => (
                  <li key={r.doi || r.openalex} className="flex items-start gap-1.5">
                    <span className="flex-1">{(r.authors || []).join(', ')} ({r.year}). {r.title}. <i>{r.venue}</i>.{' '}
                      {r.doi && <a className="text-accent-700 hover:underline" href={doiUrl(r.doi)} target="_blank" rel="noreferrer">{r.doi}</a>}</span>
                    {canEdit && <button className="text-slate-300 hover:text-rose-600" title="Remove" onClick={() => removeRef(r.doi || r.openalex)}><X className="h-3 w-3" /></button>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

/** Adopt what's useful from a saved result into the paper's decisions (and optionally its target venue). */
function AdoptPanel({ o, work, onPatchWork }) {
  const [open, setOpen] = useState(false)
  const d = work.navigator_decisions || {}
  const fields = DECISION_FIELDS.filter((f) => f.from.includes(o.tool))
  const isLadder = o.tool === 'ladder' || o.tool === 'retarget'
  const cited = new Set(o.verification?.cited || [])
  const citedSources = (o.sources || []).filter((s) => cited.has(s.sid))
  const have = new Set((d.key_references || []).map((r) => r.doi || r.openalex))
  const [vals, setVals] = useState({})
  const [ladder, setLadder] = useState(d.ladder || {})
  const [setVenue, setSetVenue] = useState(false)
  const [pick, setPick] = useState(() => new Set())
  const journals = o.inputs?.journals || []
  const adopt = async () => {
    const next = { ...d }
    for (const f of fields) if ((vals[f.key] || '').trim()) next[f.key] = vals[f.key].trim()
    if (isLadder) next.ladder = ladder
    const add = citedSources.filter((s) => pick.has(s.sid) && !have.has(s.doi || s.openalex))
      .map(({ sid, abstract, ...rest }) => rest) // eslint-disable-line no-unused-vars
    if (add.length) next.key_references = [...(d.key_references || []), ...add]
    const patch = { navigator_decisions: next }
    if (isLadder && setVenue && ladder.A) patch.venue = ladder.A
    await onPatchWork(patch)
    setOpen(false); setVals({}); setPick(new Set())
  }
  if (!open) return <button className="btn btn-soft !py-1 text-xs" onClick={() => setOpen(true)}><Pin className="h-3.5 w-3.5" /> Adopt into the paper</button>
  return (
    <div className="rounded-lg border border-accent-100 bg-accent-50/50 p-3 space-y-2">
      <p className="text-xs text-slate-600">Copy what you decided from this result (paste the line you chose, or write your own). It's saved on the paper and every later tool builds on it.</p>
      {fields.map((f) => (
        <label key={f.key}>{f.label}{d[f.key] ? <span className="font-normal text-slate-400"> — now: {String(d[f.key]).slice(0, 80)}{String(d[f.key]).length > 80 ? '…' : ''}</span> : null}
          <textarea className="min-h-[48px]" value={vals[f.key] || ''} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} />
        </label>
      ))}
      {isLadder && (
        <>
          <div className="grid grid-cols-3 gap-2">
            {['A', 'B', 'C'].map((k) => (
              <label key={k}>Target {k}
                <input list={`ladder-${o.id}`} value={ladder[k] || ''} onChange={(e) => setLadder({ ...ladder, [k]: e.target.value })} />
              </label>
            ))}
            <datalist id={`ladder-${o.id}`}>{journals.map((j) => <option key={j} value={j} />)}</datalist>
          </div>
          <label>Ladder notes<input value={ladder.notes || ''} onChange={(e) => setLadder({ ...ladder, notes: e.target.value })} placeholder="e.g. A needs a stronger theoretical contribution" /></label>
          <label className="flex items-center gap-2 text-sm font-normal text-slate-700"><input type="checkbox" checked={setVenue} onChange={(e) => setSetVenue(e.target.checked)} /> Make Target A the paper's target venue (Venue &amp; Submission)</label>
        </>
      )}
      {citedSources.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-1">Add cited sources to the paper's key references</p>
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {citedSources.map((s) => {
              const already = have.has(s.doi || s.openalex)
              return (
                <label key={s.sid} className="flex items-start gap-2 text-xs font-normal text-slate-700">
                  <input type="checkbox" disabled={already} checked={already || pick.has(s.sid)}
                    onChange={(e) => { const n = new Set(pick); if (e.target.checked) n.add(s.sid); else n.delete(s.sid); setPick(n) }} />
                  <span>{s.sid} · {(s.authors[0] || '').split(' ').pop()} ({s.year}) {s.title}{already ? ' — already in key references' : ''}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <button className="btn btn-blue" onClick={adopt}>Adopt</button>
        <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  )
}
