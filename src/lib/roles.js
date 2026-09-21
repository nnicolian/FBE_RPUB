// Central place for role logic so permission rules stay in one file
// (mirrors the RLS policies in supabase/migrations/0002_rls.sql —
// the DB is the real gatekeeper, this just drives the UI).

export const ROLES = ['admin', 'dean', 'chair', 'committee', 'viewer']

export const ROLE_LABELS = {
  admin: 'Research Office Admin',
  dean: 'Dean / Faculty-wide',
  chair: 'Department Chair',
  committee: 'Research Committee',
  viewer: 'Viewer'
}

export function canManageWork(profile, work) {
  if (!profile) return false
  if (profile.role === 'admin') return true
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
  return profile?.role === 'admin' || profile?.role === 'dean'
}

export function canReviewAsCommittee(profile) {
  return profile?.role === 'admin' || profile?.role === 'committee'
}

export function canEditSubmissionDraft(profile, department) {
  return profile?.role === 'admin' || profile?.department === department && profile?.role === 'chair'
}
