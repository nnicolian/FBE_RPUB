// Central place for role logic so permission rules stay in one file.
// The database (row-level security) is the real gatekeeper; this just drives the UI.
//
// Access model (Research Strategy §5 "Role-Based Access"):
//   admin           – full access, including Configuration and user accounts
//   research_admin  – Research Coordinator: sees and edits every paper, no user management
//   dean            – read-only oversight of every paper
//   chair           – sees and edits their department's papers (and papers they author)
//   author          – sees and edits only their own papers
// A paper is "yours" when you created it or your linked researcher name is its lead or a co-author.

export const ROLES = ['admin', 'research_admin', 'dean', 'chair', 'author']

export const ROLE_LABELS = {
  admin: 'Administrator',
  research_admin: 'Research Coordinator',
  dean: 'Dean (read-only oversight)',
  chair: 'Department Chair',
  author: 'Author (own papers)',
  committee: 'Research Committee (retired)',
  viewer: 'No access'
}

// Admin and the Research Coordinator can edit research content in every department.
export function hasFullContentAccess(profile) {
  return ['admin', 'research_admin'].includes(profile?.role)
}

// Can see every paper (the Dean sees all, read-only).
export function canSeeAllWorks(profile) {
  return hasFullContentAccess(profile) || profile?.role === 'dean'
}

// Configuration (users, master data, settings) is admin-only.
export function canManageSettings(profile) {
  return profile?.role === 'admin'
}

export function canCreateWork(profile) {
  return hasFullContentAccess(profile) || ['chair', 'author'].includes(profile?.role)
}

// UI hint only. The paper page asks the database (can_write_work) for the exact answer,
// which also covers chairs editing papers they co-author in other departments.
export function canManageWork(profile, work) {
  if (!profile) return false
  if (hasFullContentAccess(profile)) return true
  if (profile.role === 'chair') {
    const depts = [work?.department, ...(work?.departments || [])].filter(Boolean)
    return depts.includes(profile.department) || work?.created_by === profile.id
  }
  // Authors can only ever load their own papers, so any paper they see is theirs.
  if (profile.role === 'author') return true
  return false
}

export function canManageAdmin(profile) {
  return profile?.role === 'admin'
}

// Retired with the move to self-reporting (kept so older screens still compile).
export function canDecideSubmissions(profile) {
  return hasFullContentAccess(profile)
}
export function canReviewAsCommittee(profile) {
  return hasFullContentAccess(profile)
}
export function canEditSubmissionDraft(profile) {
  return hasFullContentAccess(profile)
}
