import {
  LayoutDashboard, BookOpen, BarChart3, Landmark, Wrench, CalendarDays, Users, Handshake, Settings,
} from 'lucide-react'

// Sidebar menu, grouped like SAIP / FIP. `roles: null` = everyone signed in.
// Department submissions were retired with the move to self-reporting (no approvals).
export const NAV_GROUPS = ['Main', 'Library', 'Governance', 'Administration']

export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, group: 'Main', roles: null },
  { to: '/pipeline', label: 'Research Pipeline', icon: BookOpen, group: 'Main', roles: null },
  { to: '/reports', label: 'Reports', icon: BarChart3, group: 'Main', roles: null },
  { to: '/venues', label: 'Venue Library', icon: Landmark, group: 'Library', roles: null },
  { to: '/resources', label: 'Tools & Resources', icon: Wrench, group: 'Library', roles: null },
  { to: '/calendar', label: 'Research Calendar', icon: CalendarDays, group: 'Library', roles: null },
  { to: '/committee', label: 'Research Committee', icon: Users, group: 'Governance', roles: ['admin', 'research_admin', 'dean'] },
  { to: '/part-time', label: 'Faculty Survey', icon: Handshake, group: 'Governance', roles: ['admin', 'research_admin'] },
  { to: '/admin', label: 'Configuration', icon: Settings, group: 'Administration', roles: ['admin'] },
]

// The Faculty Intelligence Platform (SAIP).
export const SAIP_URL = 'https://www.fbesaip.online'

/**
 * "Return to SAIP": SAIP opens this app in its own tab, so going back means closing this tab — the browser
 * then shows the SAIP tab it came from, exactly where the user left it. When this tab wasn't opened from
 * SAIP (a bookmark, a typed address) or the browser won't close it, SAIP opens in this same tab instead —
 * never a new one.
 */
export function returnToSaip() {
  const opener = window.opener
  if (opener && !opener.closed) {
    try { opener.focus() } catch { /* other site: focusing may be refused */ }
    window.close()
    // If the browser refused to close the tab, fall back to SAIP in this tab.
    setTimeout(() => { if (!window.closed) window.location.href = SAIP_URL }, 300)
  } else {
    window.location.href = SAIP_URL
  }
}

export const visibleItems = (profile) => NAV_ITEMS.filter((l) => !l.roles || l.roles.includes(profile?.role))
