// Shared option lists for a research work's fields.
export const RESEARCH_TYPES = ['Journal Article', 'Conference Abstract', 'Conference Full Paper', 'Extended Paper / Book Chapter', 'Book', 'Book Chapter', 'Case Study', 'Working Paper', 'Technical / Policy Report', 'Other']
export const MATURITY_LEVELS = ['Not Classified', 'Idea', 'Work in Progress', 'Conference-ready', 'Extended-publication-ready', 'Journal-ready']
// Pipeline phases (Research Strategy, Appendix 6). A paper's phase is set automatically
// from its sub-task progress: the first phase not yet at 100%, or "Published" when all are done.
export const PHASES = ['Initiate', 'Build', 'Refine', 'Publish']
export const STAGES = [...PHASES, 'Published']
export const ETHICS = ['N/A', 'Pending', 'Approved']
export const ITEM_STATUSES = ['Not Started', 'In Progress', 'Completed', 'Blocked']

// Faculty KPI categories (Research Strategy, Appendix 2): 6 + 2 + 2 + 4 = 14 Scopus papers a year.
export const KPI_CATEGORIES = [
  { value: 'FT Independent', label: 'Full-time faculty — independent', hint: 'Individual or cross-department papers' },
  { value: 'FT Collaborative', label: 'Full-time faculty — collaborative', hint: 'Cross-Faculty or external collaborations' },
  { value: 'PT Co-authored', label: 'Part-time faculty — co-authored', hint: 'Part-time faculty paired with full-time faculty' },
  { value: 'MS Student', label: 'MS student paper', hint: 'Student as first author; supervisor co-author and tracks progress' },
  { value: 'Not counted', label: 'Not counted toward the KPI', hint: 'e.g. teaching cases, reports, non-indexed outputs' }
]
export const kpiLabel = v => KPI_CATEGORIES.find(c => c.value === v)?.label || v || 'Not set'

// Research areas (Research Strategy, Appendix 2 & survey question C1).
export const RESEARCH_AREAS = [
  'Management, leadership & organisational behaviour',
  'Marketing, consumer behaviour & digital business',
  'Finance, accounting & corporate governance',
  'Economics & public policy',
  'Entrepreneurship & innovation',
  'Management information systems & technology adoption',
  'Hospitality & tourism management'
]

// "Internal" = full-time faculty (kept for existing records).
export const RESEARCHER_TYPES = [
  { value: 'Internal', label: 'Full-time faculty' },
  { value: 'Part-time', label: 'Part-time faculty' },
  { value: 'MS Student', label: 'MS student' },
  { value: 'External', label: 'External collaborator' }
]
export const researcherTypeLabel = v => RESEARCHER_TYPES.find(t => t.value === v)?.label || v || '—'

// MS paper guidelines (Appendix 5).
export const MS_TIMELINE = [
  { phase: 'Initiate', weeks: 'Weeks 1–3', milestone: 'Topic confirmed, journal selected, supervisor formally paired' },
  { phase: 'Build', weeks: 'Weeks 4–12', milestone: 'Full draft completed and shared with supervisor' },
  { phase: 'Refine', weeks: 'Weeks 13–18', milestone: 'Revised manuscript ready for submission' },
  { phase: 'Publish', weeks: 'Weeks 19+', milestone: 'Paper submitted; revisions addressed; acceptance confirmed' }
]
export const MIN_MEETINGS_PER_PHASE = 2

export const PT_STATUSES = ['New', 'Match proposed', 'Introduced', 'Collaborating', 'Not now']
