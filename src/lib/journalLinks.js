// Quick verification links for a journal (Appendix 7: always verify current status).
export const scimagoSearch = name => `https://www.scimagojr.com/journalsearch.php?q=${encodeURIComponent(name || '')}`
export const scholarSearch = name => `https://scholar.google.com/scholar?q=${encodeURIComponent(`source:"${name || ''}"`)}`
export const SCOPUS_SOURCES = 'https://www.scopus.com/sources'
export const ABS_GUIDE = 'https://charteredabs.org/academic-journal-guide/'
// Google Scholar: articles published in the journal, and its Scholar Metrics (h5-index) entry.
export const scholarJournal = name => `https://scholar.google.com/scholar?as_publication=${encodeURIComponent(`"${name || ''}"`)}`
export const scholarMetrics = name => `https://scholar.google.com/citations?view_op=search_venues&vq=${encodeURIComponent(name || '')}`
