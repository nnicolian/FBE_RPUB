// Journal targeting rules (Research Strategy, Appendices 2, 5 and 7).

export const JOURNAL_FIELDS = [
  'Management & Organisational Behaviour', 'Marketing & Consumer Behaviour', 'Finance & Accounting',
  'Economics', 'MIS & Technology Management', 'Hospitality Management', 'Entrepreneurship',
  'Operations & Supply Chain', 'Crisis & Resilience'
]

const QUARTILE = {
  Q1: { label: 'Strongly preferred', tone: 'badge-green' },
  Q2: { label: 'Preferred', tone: 'badge-green' },
  Q3: { label: 'Acceptable', tone: 'badge-amber' },
  Q4: { label: 'Minimum only', tone: 'badge-red' }
}
const ABS = {
  '4*': { label: 'Aspirational', tone: 'badge-green' },
  '4': { label: 'Strongly preferred', tone: 'badge-green' },
  '3': { label: 'Preferred', tone: 'badge-green' },
  '2': { label: 'Acceptable', tone: 'badge-amber' },
  '1': { label: 'Minimum only', tone: 'badge-red' }
}

// "ABS 4*" / "4*" / "ABS/AJG 3" → "4*" / "3"; anything else → null
export function absGrade(abs) {
  const m = String(abs || '').match(/([1-4])\s*(\*?)/)
  return m ? `${m[1]}${m[2]}` : null
}

export const quartileTarget = q => QUARTILE[q] || null
export const absTarget = abs => ABS[absGrade(abs)] || null
export const isScopus = venue => /scopus/i.test(venue?.indexing || '')

// Warnings for a paper's chosen venue. `venue` is the venues row (or null),
// `work` supplies quality/category/Scopus flag.
export function venueWarnings(work, venue) {
  const w = []
  if (!work.venue || work.venue === 'N/A') return ['No target venue chosen yet (sub-task 1.2).']
  const scopus = venue ? isScopus(venue) : !!work.scopus_indexed
  if (!scopus) w.push('Not confirmed as Scopus-indexed — only Scopus-indexed publications count toward the Faculty KPI.')
  const q = work.venue_quality || venue?.quality
  if (q === 'Q4') w.push('Q4 counts toward the KPI but is not encouraged; Q1–Q2 are preferred.')
  if (q === 'Conference') w.push('Conference papers count only if published in Scopus-indexed proceedings.')
  const g = absGrade(venue?.abs)
  if (g === '1') w.push('ABS 1 is the minimum; ABS 2* and above is the preferred benchmark for business journals.')
  if (work.kpi_category === 'MS Student') {
    const okQ = ['Q1', 'Q2', 'Q3'].includes(q)
    const okAbs = g && Number(g[0]) >= 2
    if (!okQ && !okAbs) w.push('MS papers need at least Q1–Q3 or ABS 2* (MS guidelines).')
  }
  return w
}
