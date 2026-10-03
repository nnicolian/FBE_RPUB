// Verified scholarly sources from OpenAlex (free, open, no key needed): papers with DOI, year, journal,
// authors, citation counts and abstracts. Everything the Research Navigator says must come from these records.
// https://docs.openalex.org — the "mailto" parameter puts requests in OpenAlex's faster "polite pool".

const BASE = 'https://api.openalex.org'
const MAILTO = 'nnicolian@aust.edu.lb'
const SELECT = 'id,doi,display_name,publication_year,cited_by_count,authorships,primary_location,abstract_inverted_index,type,open_access'

async function get(path, params) {
  const qs = new URLSearchParams({ ...params, mailto: MAILTO })
  const res = await fetch(`${BASE}${path}?${qs}`)
  if (!res.ok) throw new Error(`OpenAlex ${res.status}: ${await res.text().catch(() => '')}`.slice(0, 200))
  return res.json()
}

/** OpenAlex stores abstracts as an inverted index; rebuild the text (shortened). */
function abstractOf(inv, max = 700) {
  if (!inv) return ''
  const words = []
  for (const [w, positions] of Object.entries(inv)) for (const p of positions) words[p] = w
  const text = words.filter(Boolean).join(' ')
  return text.length > max ? `${text.slice(0, max)}…` : text
}

function toSource(w) {
  const src = w.primary_location?.source
  return {
    openalex: w.id,
    doi: w.doi ? w.doi.replace(/^https?:\/\/doi\.org\//i, '').toLowerCase() : null,
    title: w.display_name || '',
    year: w.publication_year || null,
    venue: src?.display_name || '',
    venue_id: src?.id || null,
    authors: (w.authorships || []).slice(0, 4).map((a) => a.author?.display_name).filter(Boolean),
    author_ids: (w.authorships || []).slice(0, 4).map((a) => a.author?.id).filter(Boolean),
    cites: w.cited_by_count || 0,
    open_access: !!w.open_access?.is_oa,
    abstract: abstractOf(w.abstract_inverted_index),
  }
}

/** Most relevant papers on a topic: a mix of the most cited (foundations) and recent highly cited (current work). */
export async function searchTopic(query, { foundational = 25, recent = 25, sinceYears = 4 } = {}) {
  const since = `${new Date().getFullYear() - sinceYears}-01-01`
  const [a, b] = await Promise.all([
    get('/works', { search: query, 'per-page': String(foundational), sort: 'cited_by_count:desc', select: SELECT, filter: 'type:article|review|book-chapter' }),
    get('/works', { search: query, 'per-page': String(recent), sort: 'relevance_score:desc', select: SELECT, filter: `from_publication_date:${since},type:article|review` }),
  ])
  const seen = new Set()
  const out = []
  for (const w of [...(a.results || []), ...(b.results || [])]) {
    if (seen.has(w.id)) continue
    seen.add(w.id)
    out.push(toSource(w))
  }
  return out
}

/** Recent papers in one journal close to the topic — evidence of fit (and novelty risk). */
export async function journalRecent(journalName, query, { n = 6, sinceYears = 4 } = {}) {
  const s = await get('/sources', { search: journalName, 'per-page': '1', select: 'id,display_name,issn_l,works_count,is_oa,apc_usd,host_organization_name' })
  const src = s.results?.[0]
  if (!src) return { journal: null, papers: [] }
  const since = `${new Date().getFullYear() - sinceYears}-01-01`
  const w = await get('/works', {
    search: query, 'per-page': String(n), sort: 'relevance_score:desc', select: SELECT,
    filter: `primary_location.source.id:${src.id.split('/').pop()},from_publication_date:${since}`,
  })
  return {
    journal: { id: src.id, name: src.display_name, issn: src.issn_l, works: src.works_count, oa: src.is_oa, apc_usd: src.apc_usd, publisher: src.host_organization_name },
    papers: (w.results || []).map(toSource),
  }
}

/** Journals publishing most on a topic among the retrieved sources. */
export function topVenues(sources, n = 10) {
  const m = new Map()
  for (const s of sources) if (s.venue) m.set(s.venue, (m.get(s.venue) || 0) + 1)
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([name, count]) => ({ name, count }))
}

/** Leading authors among the retrieved sources (by number of papers, then citations). */
export function topAuthors(sources, n = 12) {
  const m = new Map()
  for (const s of sources) for (const a of s.authors) {
    const e = m.get(a) || { name: a, papers: 0, cites: 0, recent: 0 }
    e.papers++; e.cites += s.cites; if (s.year && s.year >= new Date().getFullYear() - 4) e.recent++
    m.set(a, e)
  }
  return [...m.values()].sort((a, b) => b.papers - a.papers || b.cites - a.cites).slice(0, n)
}

/** Number the sources S1…Sn (the only references the AI may use). */
export function numberSources(list, max = 60) {
  return list.slice(0, max).map((s, i) => ({ ...s, sid: `S${i + 1}` }))
}

export const doiUrl = (doi) => (doi ? `https://doi.org/${doi}` : null)
