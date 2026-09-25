// Central place for role logic so permission rules stay in one file
// (mirrors the RLS policies in supabase/migrations/0002_rls.sql —
// the DB is the real gatekeeper, this just drives the UI).

export const ROLES = ['admin', 'research_admin', 'dean', 'chair', 'committee', 'viewer']

export const ROLE_LABELS = {
  admin: 'Research Office Admin',
  research_admin: 'Research Admin (no user management)',
  dean: 'Dean / Faculty-wide',
  chair: 'Department Chair',
  committee: 'Research Committee',
  viewer: 'Viewer'
}

// Admin and Dean can read and write all research content in every department.
// Only Admin manages users and system settings.
export function hasFullContentAccess(profile) {
  return ['admin', 'research_admin', 'dean'].includes(profile?.role)
}

// Admin and Research Admin manage system settings; only Admin manages users.
export function canManageSettings(profile) {
  return profile?.role === 'admin' || profile?.role === 'research_admin'
}

export function canCreateWork(profile) {
  return hasFullContentAccess(profile) || profile?.role === 'chair'
}

export function canManageWork(profile, work) {
  if (!profile) return false
  if (hasFullContentAccess(profile)) return true
  if (profile.role === 'chair') {
    const depts = [work?.department, ...(work?.departments || [])].filter(Boolean)
    return depts.includes(profile.department)
  }
  return false
}

export function canManageAdmin(profile) {
  return profile?.role === 'admin'
}

export function canDecideSubmissions(profile) {
  return hasFullContentAccess(profile)
}

export function canReviewAsCommittee(profile) {
  return hasFullContentAccess(profile) || profile?.role === 'committee'
}

export function canEditSubmissionDraft(profile, department) {
  return hasFullContentAccess(profile) || (profile?.department === department && profile?.role === 'chair')
}
