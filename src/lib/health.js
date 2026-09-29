// Port of the prototype's deriveHealth / notification logic.

export function daysFrom(dateStr) {
  if (!dateStr) return 0
  const d = new Date(dateStr)
  if (isNaN(d)) return 0
  return Math.floor((new Date() - d) / 86400000)
}

export function overdueMilestones(milestones = []) {
  const now = new Date()
  return milestones.filter(m => m.due && m.status !== 'Completed' && new Date(m.due) < now)
}

// Kept for compatibility; committee review is no longer used, so this is always empty.
export function pendingCommitteeReviews(phases = []) {
  return phases.filter(p => p.committee_required && (p.committee_status || 'Pending') === 'Pending')
}

// The most recent sign of movement: a progress change on the pipeline or a written update.
export function latestUpdateDate(work, updates = []) {
  const dates = [
    ...updates.map(u => u.update_date),
    work.last_progress_at ? String(work.last_progress_at).slice(0, 10) : null
  ].filter(Boolean).sort()
  return dates.at(-1) || work.actual_submission || work.start_date || ''
}

export function deriveHealth(work, { milestones = [], risks = [], updates = [] } = {}, settings) {
  const s = settings || { stale_days: 30, severe_overdue_days: 14, under_review_days: 120 }
  const reasons = []
  const red = []

  const overdue = overdueMilestones(milestones)
  if (overdue.length) {
    reasons.push(`${overdue.length} overdue milestone${overdue.length === 1 ? '' : 's'}`)
    if (overdue.some(m => daysFrom(m.due) > s.severe_overdue_days)) red.push('severely overdue milestone')
  }
  if (!work.venue || work.venue === 'N/A') reasons.push('target venue missing')

  const openRisks = risks.filter(r => r.status === 'Open')
  if (openRisks.length) {
    reasons.push(`${openRisks.length} open risk/issue${openRisks.length === 1 ? '' : 's'}`)
    if (openRisks.some(r => r.type === 'Issue' && r.impact === 'High')) red.push('high-impact open issue')
  }
  if (work.ethics === 'Pending') reasons.push('ethics status pending')

  // Stationary papers: the Coordinator reaches out after 30 days without movement (Appendix 6).
  const active = !['Accepted', 'Published'].includes(work.submission_status) && work.stage !== 'Published'
  const stale = active ? daysFrom(latestUpdateDate(work, updates)) : 0
  if (active && stale > s.stale_days) reasons.push(`no movement for ${stale} days`)
  if (active && stale > s.stale_days * 2) red.push('stationary for a long time')

  // MS papers should be in Build by the end of February (Research Calendar, Appendix 8).
  if (work.kpi_category === 'MS Student' && work.stage === 'Initiate') {
    const endYear = Number(String(work.academic_year || '').match(/(\d{4})\D+(\d{4})/)?.[2])
    if (endYear && new Date() > new Date(`${endYear}-02-28T23:59:59`)) reasons.push('MS paper still in Initiate after February')
  }

  return { status: red.length ? 'Red' : reasons.length ? 'Amber' : 'Green', reasons }
}

export function badgeClass(status) {
  const map = {
    Accepted: 'badge-green', Published: 'badge-green',
    Submitted: 'badge-purple', Resubmitted: 'badge-purple', 'Under Review': 'badge-purple',
    'Pre-Submission': 'badge-gray', 'R&R': 'badge-amber', Returned: 'badge-red',
    Green: 'badge-green', Amber: 'badge-amber', Red: 'badge-red',
    Completed: 'badge-green', 'In Progress': 'badge-purple', Blocked: 'badge-red', Pending: 'badge-amber'
  }
  return map[status] || 'badge-gray'
}
