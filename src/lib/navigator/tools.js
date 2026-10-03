// Research Navigator — the research tools, the request each one builds for the researcher's own AI
// (ChatGPT, Claude …), and the check of the answer pasted back. Every reference must be one of the numbered
// sources [S1]…[Sn] gathered from OpenAlex; anything else is flagged as unverified.

export const STAGE_ORDER = ['Interest', 'Initiate', 'Build', 'Refine', 'Publish', 'Revisions']

// needs: what the tool asks for besides the topic. draft = the manuscript file is attached in the AI (consent needed);
// journal = one journal; reviews = reviewers' comments pasted in; journals = candidate journals (ladder).
export const TOOLS = [
  { key: 'landscape', stage: 'Interest', title: 'Research landscape', needs: [],
    blurb: 'Seminal and recent theories, competing lenses, foundational and emerging authors, key articles, research streams, common methods, gaps and plausible journals.' },
  { key: 'questions', stage: 'Initiate', title: 'Research question refiner', needs: [],
    blurb: 'Sharper research questions with the reasoning for each, and what each would contribute.' },
  { key: 'theories', stage: 'Initiate', title: 'Theoretical lenses', needs: [],
    blurb: 'Seminal and recent theories that fit the topic, how they have been applied, and which to choose.' },
  { key: 'contribution', stage: 'Initiate', title: 'Contribution framing', needs: [],
    blurb: 'Theoretical, empirical and practical contribution options, and how to position against recent work.' },
  { key: 'collaborators', stage: 'Initiate', title: 'Collaborators', needs: [],
    blurb: 'Colleagues here with matching research areas or overlapping papers, and leading external authors in the literature.' },
  { key: 'literature', stage: 'Build', title: 'Literature architecture', needs: [],
    blurb: 'Research streams, key papers in each, how they connect, and the gap your paper sits in.' },
  { key: 'methods', stage: 'Build', title: 'Methodology advisor', needs: [],
    blurb: 'Common designs in this stream, exemplar papers, typical data sources and what reviewers expect.' },
  { key: 'assessment', stage: 'Refine', title: 'Pre-submission assessment', needs: ['draft'],
    blurb: 'Argument, theory, contribution, method, how current the literature is, novelty risk and what to strengthen.' },
  { key: 'fit', stage: 'Refine', title: 'Journal fit check', needs: ['journal'],
    blurb: 'How well the paper fits one journal — scope, theory, method, recent similar articles — and what to change.' },
  { key: 'ladder', stage: 'Publish', title: 'Journal Target Ladder', needs: ['journals'],
    blurb: 'Target A, B and C with reasons, positioning advice for each, and the retargeting path if rejected.' },
  { key: 'guidelines', stage: 'Publish', title: 'Author-guidelines checklist', needs: ['journal'],
    blurb: 'A submission checklist for one journal (to confirm against its current author guidelines).' },
  { key: 'cover', stage: 'Publish', title: 'Cover-letter outline', needs: ['journal'],
    blurb: 'The points a cover letter to this journal should make, in order.' },
  { key: 'reviews', stage: 'Revisions', title: 'Reviewer-response matrix', needs: ['reviews'],
    blurb: 'Each reviewer comment, its type, a suggested response, the manuscript change and the effort.' },
  { key: 'retarget', stage: 'Revisions', title: 'Retargeting after rejection', needs: ['journals', 'reviews'],
    blurb: 'Where to send it next, and how to reposition it using the rejection feedback.' },
]
export const toolByKey = (k) => TOOLS.find((t) => t.key === k)

/** Decisions authors can adopt from results into the paper (works.navigator_decisions). */
export const DECISION_FIELDS = [
  { key: 'research_question', label: 'Research question', from: ['questions', 'landscape'] },
  { key: 'theory', label: 'Theoretical lens', from: ['theories', 'landscape'] },
  { key: 'contribution', label: 'Contribution statement', from: ['contribution'] },
  { key: 'gap', label: 'Research gap', from: ['literature', 'landscape', 'questions'] },
  { key: 'method', label: 'Research design', from: ['methods'] },
]

// Renumbered refs stay as [S#]; refs not in this request become (Author, year).
const fmtRefs = (parts) => {
  const nums = parts.filter((p) => p.startsWith('['))
  const ay = parts.filter((p) => !p.startsWith('['))
  return [nums.join(' '), ay.length ? `(${ay.join('; ')})` : ''].filter(Boolean).join(' ')
}

/** Sources the paper's earlier results actually cited (latest result of each other tool) — re-included in new requests. */
export function earlierCitedSources(outputs, currentTool, max = 20) {
  const latest = new Map()
  for (const o of outputs || []) if (o.tool !== currentTool && !latest.has(o.tool)) latest.set(o.tool, o)
  const out = []
  const seen = new Set()
  for (const o of latest.values()) {
    const cited = new Set(o.verification?.cited || [])
    for (const src of o.sources || []) if (cited.has(src.sid) && !seen.has(src.openalex)) { seen.add(src.openalex); out.push(src) }
  }
  return out.slice(0, max)
}

/**
 * Earlier saved results of a paper, condensed for the next request: the latest result of each other tool,
 * its [S#] numbers turned into author–year (those numbers belong to that result's own sources).
 */
export function earlierContext(outputs, currentTool, maxChars = 1800, newSidOf = () => null) {
  const latest = new Map()
  for (const o of outputs || []) if (o.tool !== currentTool && !latest.has(o.tool)) latest.set(o.tool, o)
  return [...latest.values()].slice(0, 6).map((o) => {
    const byId = new Map((o.sources || []).map((s) => [s.sid, s]))
    const text = (o.response || '').replace(/\[(S\d+(?:\s*[,;–-]\s*S?\d+)*)\]/gi, (_, ids) =>
      fmtRefs(ids.split(/[,;]/).map((x) => {
        const id = x.trim().toUpperCase().startsWith('S') ? x.trim().toUpperCase() : `S${x.trim()}`
        const s = byId.get(id)
        if (!s) return ''
        const now = newSidOf(s)   // the same paper's number in this request, when it is included again
        return now ? `[${now}]` : `${(s.authors[0] || '').split(' ').pop()}, ${s.year}`
      }).filter(Boolean)))
    return {
      title: toolByKey(o.tool)?.title || o.tool,
      date: new Date(o.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      text: text.length > maxChars ? `${text.slice(0, maxChars)}… [shortened]` : text,
    }
  })
}

/** Key references as BibTeX / RIS, for Zotero, Mendeley or EndNote. */
export function toBibtex(refs) {
  return refs.map((r, i) => {
    const key = `${(r.authors?.[0] || 'ref').split(' ').pop().replace(/[^A-Za-z]/g, '')}${r.year || ''}${String.fromCharCode(97 + (i % 26))}`
    const f = [
      `  author = {${(r.authors || []).join(' and ')}}`, `  title = {${r.title}}`, r.venue && `  journal = {${r.venue}}`,
      r.year && `  year = {${r.year}}`, r.doi && `  doi = {${r.doi}}`,
    ].filter(Boolean)
    return `@article{${key},\n${f.join(',\n')}\n}`
  }).join('\n\n')
}
export function toRis(refs) {
  return refs.map((r) => [
    'TY  - JOUR', ...(r.authors || []).map((a) => `AU  - ${a}`), `TI  - ${r.title}`, r.venue && `JO  - ${r.venue}`,
    r.year && `PY  - ${r.year}`, r.doi && `DO  - ${r.doi}`, 'ER  - ',
  ].filter(Boolean).join('\n')).join('\n\n')
}

/** The stage a paper is in, for suggesting tools first. */
export function stageOf(work) {
  if (!work) return 'Interest'
  if (['R&R', 'Returned', 'Resubmitted'].includes(work.submission_status)) return 'Revisions'
  return STAGE_ORDER.includes(work.stage) ? work.stage : 'Initiate'
}

const RULES = `RULES — follow strictly:
1. Use ONLY the numbered sources below as evidence. Cite them inline as [S1], [S12] etc.
2. Never cite, name or invent any paper, author, theory origin or statistic that is not in the sources. If something important is not covered by the sources, say "not covered by the retrieved sources" instead of filling the gap.
3. You may use general scholarly knowledge to reason and structure, but every factual claim about the literature needs a source number.
4. Be specific and practical; avoid generic advice. Write in clear academic English.
5. Do not write manuscript text for the authors; assess, recommend and outline.`

const fmtSource = (s) =>
  `[${s.sid}] ${s.authors.join(', ')}${s.authors.length >= 4 ? ' et al.' : ''} (${s.year ?? 'n.d.'}). ${s.title}. ${s.venue || '—'}. ` +
  `Citations: ${s.cites}.${s.doi ? ` DOI: ${s.doi}.` : ''}${s.abstract ? `\n    Abstract: ${s.abstract}` : ''}`

const TASKS = {
  landscape: `TASK: Map the research landscape for this interest. Use these headings:
## Seminal theories (with how they apply here)
## Recent theoretical developments
## Competing theoretical lenses (and when each is preferable)
## Foundational authors / ## Emerging authors (only authors appearing in the sources)
## Highly relevant articles (8–12, each with one line on why)
## Current research streams (3–5, with their key sources)
## Common methodologies
## Possible research gaps (4–6, each grounded in what the sources do and don't cover)
## Plausible journals (from the journals in the sources and the faculty's Venue Library list; note ranking where given)`,
  questions: `TASK: Propose 4–6 sharpened research questions for this paper. For each: the question, why it is researchable, the gap it addresses [S#], the likely contribution, and the main risk. End with your recommendation and why.`,
  theories: `TASK: Recommend theoretical lenses. For each of 3–5 lenses: core idea, how prior work used it on this topic [S#], what it would let this paper explain, and its limits. Then recommend one primary lens (and optionally a complementary one) with reasons.`,
  contribution: `TASK: Frame the contribution. Give: (a) 2–3 theoretical contribution options, (b) empirical contribution, (c) practical/managerial contribution, (d) how to position against the closest recent work [S#] — what is new relative to it, (e) the one-sentence contribution statement you'd recommend.`,
  collaborators: `TASK: Suggest collaborators. (a) From the FACULTY COLLEAGUES list only: who fits and why (expertise, overlapping active papers). (b) From the sources only: 3–6 leading external authors on this topic, what each is known for here [S#]. Do not suggest anyone not listed.`,
  literature: `TASK: Build the literature architecture. Identify 3–5 research streams; for each: its question, key papers [S#], main findings, and debates. Then show how the streams connect, where they disagree, and precisely where this paper's gap sits. End with a recommended reading order (10–15 sources).`,
  methods: `TASK: Advise on methodology. Summarise designs used in this stream (with exemplar papers [S#]), typical data sources and measures, analysis techniques, common weaknesses reviewers flag, and recommend a design for this paper with its main threats to validity and how to address them.`,
  assessment: `TASK: Pre-submission assessment of the ATTACHED MANUSCRIPT (the author attached the file to this chat). Assess: (1) research question and motivation, (2) theory and its use, (3) contribution — is it clear and new relative to the closest recent work [S#], (4) literature — current enough? missing streams? [S#], (5) method and evidence, (6) structure and clarity, (7) novelty risk. For each: rating (Strong / Adequate / Needs work), the specific issue, and the fix. End with the top 5 changes in priority order. If no manuscript is attached, say so and stop.`,
  fit: `TASK: Assess fit with the TARGET JOURNAL. Cover: scope fit, theoretical fit, methodological fit, recent similar articles in this journal (evidence of fit and novelty risk) [S#], ranking/indexing (from the Venue Library data), APC/open access, typical contribution expectations, and exactly what to change in the manuscript to improve fit. Give an overall fit rating (Strong / Moderate / Weak) and a go / revise-first / look elsewhere recommendation.`,
  ladder: `TASK: Build a Journal Target Ladder from the CANDIDATE JOURNALS. Output:
## Target A / ## Target B / ## Target C — for each: why it fits (scope, theory, method), recent similar articles [S#], ranking/indexing (Venue Library), APC/open access, contribution expectations, and the positioning change the manuscript needs for this journal (e.g. "emphasise theoretical contribution X rather than managerial contribution Y").
## Retargeting path — if A rejects: what to change before B; if B rejects: before C.
## Journals considered but not recommended — one line each.
Prefer journals that meet the university floor (Scopus-indexed) unless there is a strong reason.`,
  guidelines: `TASK: Produce an author-guidelines submission checklist for the TARGET JOURNAL: manuscript type and length, abstract and keywords, structure, referencing style, figures/tables, anonymisation for review, data/ethics statements, AI-use disclosure, cover letter, suggested reviewers, APC/open access. Mark each item "Confirm on the journal's current guidelines page" — do not state specific numbers unless they are in the Venue Library data provided.`,
  cover: `TASK: Outline a cover letter to the TARGET JOURNAL: opening, the problem and why it matters to this journal's readers, the contribution in two sentences, fit with recent articles in the journal [S#], method in one line, statements (originality, not under review elsewhere, AI-use disclosure), suggested reviewers (only authors in the sources, if appropriate). Bullet points, not finished prose.`,
  reviews: `TASK: Build a reviewer-response matrix from the REVIEWER COMMENTS. For every comment, a table row: Reviewer · Comment (short) · Type (major / minor / clarification / disagreement) · Suggested response · Manuscript change · Effort (low / medium / high) · Supporting sources [S#] where literature is requested. Then: overall revision strategy, comments to push back on politely (with reasons), and the order to tackle the changes.`,
  retarget: `TASK: The paper was rejected. Using the REVIEWER / EDITOR FEEDBACK and the CANDIDATE JOURNALS: diagnose why it was rejected, what to fix before resubmitting anywhere, and recommend the next journal with the repositioning it needs. Then a fallback option.`,
}

/**
 * The full request the researcher pastes into their own AI.
 * ctx: { topic, work?, researcher?, colleagues?, venues?, journals?, journalInfo?, reviews?, sources }
 */
export function buildRequest(toolKey, ctx) {
  const t = toolByKey(toolKey)
  const w = ctx.work
  const lines = []
  lines.push(`You are an expert research advisor in business and economics, supporting a faculty researcher at AUST (Faculty of Business & Economics). Tool: ${t.title}.`)
  lines.push('')
  lines.push(RULES)
  lines.push('')
  if (w) {
    lines.push('PAPER')
    lines.push(`Title: ${w.title}`)
    if (w.abstract) lines.push(`Abstract / idea: ${w.abstract}`)
    lines.push(`Stage: ${w.stage} · Submission status: ${w.submission_status || '—'} · Research type: ${w.research_type || '—'} · Department: ${w.department || '—'}`)
    if (w.venue) lines.push(`Current target venue: ${w.venue}${w.venue_quality ? ` (${w.venue_quality})` : ''}`)
    if (w.venue_selection_rationale) lines.push(`Venue rationale so far: ${w.venue_selection_rationale}`)
  } else {
    lines.push(`RESEARCH INTEREST: ${ctx.topic}`)
  }
  if (ctx.researcher) lines.push(`Researcher: ${ctx.researcher.name}${ctx.researcher.research_areas ? ` · research areas: ${ctx.researcher.research_areas}` : ''}`)
  lines.push('')
  if (ctx.colleagues?.length) {
    lines.push('FACULTY COLLEAGUES (from the faculty research app)')
    ctx.colleagues.forEach((c) => lines.push(`- ${c.name} (${c.department || '—'}): ${c.research_areas || 'no areas listed'}${c.papers?.length ? ` · active papers: ${c.papers.join('; ')}` : ''}`))
    lines.push('')
  }
  if (ctx.venues?.length) {
    lines.push("FACULTY VENUE LIBRARY (ranking/indexing — authoritative)")
    ctx.venues.forEach((v) => lines.push(`- ${v.full_name || v.name}: indexing ${v.indexing || '—'}, SJR ${v.quality || '—'}, ABS ${v.abs || '—'}${v.apc ? `, APC ${v.apc}` : ''}${v.turnaround ? `, turnaround ${v.turnaround}` : ''}${v.scope_fit_guidance ? `, scope: ${v.scope_fit_guidance}` : ''}`))
    lines.push('')
  }
  if (ctx.journalInfo?.length) {
    lines.push('JOURNAL DATA (OpenAlex)')
    ctx.journalInfo.forEach((j) => lines.push(`- ${j.name}: publisher ${j.publisher || '—'}, open access ${j.oa ? 'yes' : 'no'}${j.apc_usd ? `, APC about USD ${j.apc_usd}` : ''}, ${j.works} works`))
    lines.push('')
  }
  if (ctx.journals?.length) lines.push(`${toolKey === 'ladder' || toolKey === 'retarget' ? 'CANDIDATE JOURNALS' : 'TARGET JOURNAL'}: ${ctx.journals.join('; ')}`, '')
  if (ctx.reviews) lines.push('REVIEWER / EDITOR COMMENTS', ctx.reviews, '')
  // What the authors have already decided, and earlier results for this paper — so each tool builds on the last.
  const d = ctx.decisions || {}
  const decided = DECISION_FIELDS.filter((f) => d[f.key]).map((f) => `- ${f.label}: ${d[f.key]}`)
  if (d.ladder && (d.ladder.A || d.ladder.B || d.ladder.C)) decided.push(`- Journal Target Ladder: A ${d.ladder.A || '—'} · B ${d.ladder.B || '—'} · C ${d.ladder.C || '—'}${d.ladder.notes ? ` (${d.ladder.notes})` : ''}`)
  if (d.key_references?.length) decided.push(`- Key references chosen: ${d.key_references.slice(0, 25).map((r) => `${(r.authors?.[0] || '').split(' ').pop()} (${r.year}) ${r.title}`).join('; ')}`)
  if (decided.length) lines.push("AUTHORS' DECISIONS SO FAR (respect these; build on them, or say clearly if you'd challenge one)", ...decided, '')
  if (ctx.earlier?.length) {
    lines.push('EARLIER RESULTS FOR THIS PAPER (summaries from previous tools; references already renumbered to the sources below where included)')
    ctx.earlier.forEach((e) => lines.push(`--- ${e.title} (${e.date})`, e.text, ''))
  }
  if (t.needs.includes('draft')) lines.push('MANUSCRIPT: attached to this chat by the author.', '')
  lines.push(`SOURCES (${ctx.sources.length}, retrieved from OpenAlex; the only references you may use)`)
  ctx.sources.forEach((s) => lines.push(fmtSource(s)))
  lines.push('')
  lines.push(TASKS[toolKey])
  lines.push('')
  lines.push('Finish with a line "Sources used:" listing the [S#] numbers you cited.')
  return lines.join('\n')
}

/**
 * Check a pasted answer: which numbered sources it cites, references to numbers that don't exist,
 * DOIs that aren't among the sources, and author-year citations that don't match any source.
 */
export function verifyAnswer(text, sources) {
  const ids = new Set(sources.map((s) => s.sid))
  const dois = new Set(sources.map((s) => s.doi).filter(Boolean))
  const cited = new Set()
  const invalid = new Set()
  for (const m of text.matchAll(/\[(S\d+(?:\s*[,;–-]\s*S?\d+)*)\]/gi)) {
    for (const part of m[1].split(/[,;]/)) {
      const range = part.trim().match(/^S?(\d+)\s*[–-]\s*S?(\d+)$/i)
      const nums = range ? Array.from({ length: Math.max(0, +range[2] - +range[1] + 1) }, (_, i) => +range[1] + i) : [+(part.trim().replace(/^S/i, ''))]
      for (const n of nums) { const id = `S${n}`; if (ids.has(id)) cited.add(id); else invalid.add(id) }
    }
  }
  const foundDois = [...text.matchAll(/\b10\.\d{4,9}\/[^\s"<>)\],;]+/gi)].map((m) => m[0].replace(/[.]+$/, '').toLowerCase())
  const unknownDois = [...new Set(foundDois.filter((d) => !dois.has(d)))]
  // "Smith et al. (2019)" / "(Smith, 2019)" style citations whose author+year match no source.
  const surnames = sources.flatMap((s) => s.authors.map((a) => ({ last: (a.split(/\s+/).pop() || '').toLowerCase(), year: s.year })))
  const authorYear = [...text.matchAll(/\b([A-Z][A-Za-z'’-]+)(?: et al\.?| and [A-Z][A-Za-z'’-]+)?,? \(?((?:19|20)\d{2})\)?/g)]
    .map((m) => ({ name: m[1], year: +m[2], raw: m[0] }))
    .filter((c) => !['In', 'The', 'By', 'Since', 'From', 'Until', 'Fall', 'Spring', 'Summer'].includes(c.name))
  const unmatched = [...new Set(authorYear.filter((c) => !surnames.some((s) => s.last === c.name.toLowerCase() && Math.abs((s.year || 0) - c.year) <= 1)).map((c) => c.raw))]
  return {
    cited: [...cited].sort((a, b) => +a.slice(1) - +b.slice(1)),
    invalid: [...invalid],
    unknown_dois: unknownDois,
    unmatched_citations: unmatched.slice(0, 20),
    ok: invalid.size === 0 && unknownDois.length === 0 && unmatched.length === 0,
  }
}
