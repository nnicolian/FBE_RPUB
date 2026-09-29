// Shared option lists for a research work's fields.
export const RESEARCH_TYPES = ['Journal Article', 'Conference Abstract', 'Conference Full Paper', 'Extended Paper / Book Chapter', 'Book', 'Book Chapter', 'Case Study', 'Working Paper', 'Technical / Policy Report', 'Other']
export const MATURITY_LEVELS = ['Not Classified', 'Idea', 'Work in Progress', 'Conference-ready', 'Extended-publication-ready', 'Journal-ready']
// Pipeline phases (Research Strategy, Appendix 6). A paper's phase is set automatically
// from its sub-task progress: the first phase not yet at 100%, or "Published" when all are done.
export const PHASES = ['Initiate', 'Build', 'Refine', 'Publish']
export const STAGES = [...PHASES, 'Published']
export const ETHICS = ['N/A', 'Pending', 'Approved']
export const ITEM_STATUSES = ['Not Started', 'In Progress', 'Completed', 'Blocked']
