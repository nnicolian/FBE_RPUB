import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { GraduationCap, ChevronDown, ExternalLink } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { NAV_GROUPS, SAIP_URL, visibleItems } from './navConfig'

// Sidebar in the SAIP / FIP style: white, grouped sections that open and close (remembered per browser);
// the section holding the current page is always open. Account actions are in the top bar (TopBar.jsx).

const STORAGE_KEY = 'rpub.sidebar.openGroups'
const readOpen = () => {
  try { const raw = localStorage.getItem(STORAGE_KEY); return new Set(raw ? JSON.parse(raw) : NAV_GROUPS) } catch { return new Set(NAV_GROUPS) }
}
const isActivePath = (to, path) => (to === '/' ? path === '/' : path === to || path.startsWith(`${to}/`))

export default function Sidebar() {
  const { profile } = useAuth()
  const { pathname } = useLocation()
  const items = visibleItems(profile)
  const [open, setOpen] = useState(readOpen)
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...open])) } catch { /* private mode */ } }, [open])
  const activeGroup = items.find((i) => isActivePath(i.to, pathname))?.group
  const toggle = (g) => setOpen((o) => { const n = new Set(o); if (n.has(g)) n.delete(g); else n.add(g); return n })

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-ink-100 bg-white min-h-screen sticky top-0 h-screen print:hidden">
      <div className="flex items-center gap-3 px-5 h-16 border-b border-ink-100 shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-900 text-white">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink-900 tracking-tight leading-tight">Research &amp; Publications</p>
          <p className="text-[10px] text-ink-400 leading-tight truncate">AUST · Faculty of Business &amp; Economics</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_GROUPS.map((g) => {
          const groupItems = items.filter((i) => i.group === g)
          if (!groupItems.length) return null
          const isOpen = activeGroup === g || open.has(g)
          return (
            <div key={g} className="pt-2 first:pt-0">
              <button onClick={() => toggle(g)} className="flex w-full items-center gap-1 px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-400 hover:text-ink-600">
                <span className="flex-1 text-left">{g}</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
              </button>
              {isOpen && (
                <div className="space-y-1">
                  {groupItems.map((l) => {
                    const Icon = l.icon
                    return (
                      <NavLink key={l.to} to={l.to} end={l.to === '/'}
                        className={({ isActive }) => `nav-item ${isActive || isActivePath(l.to, pathname) ? 'nav-item-active' : 'nav-item-inactive'}`}>
                        <Icon className="h-[18px] w-[18px] shrink-0" />
                        <span className="truncate">{l.label}</span>
                      </NavLink>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        <div className="pt-4">
          <a href={SAIP_URL} target="_blank" rel="noreferrer" className="nav-item nav-item-inactive">
            <GraduationCap className="h-[18px] w-[18px] shrink-0" />
            <span className="truncate">Faculty Intelligence Platform</span>
            <ExternalLink className="ml-auto h-3.5 w-3.5 text-ink-300" />
          </a>
        </div>
      </nav>

      <div className="px-4 py-4 border-t border-ink-100">
        <div className="rounded-xl bg-ink-50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">Version</p>
          {/* Bump this label with each release to confirm the live site is up to date. */}
          <p className="mt-0.5 text-xs font-medium text-ink-700">2026-10-03 · FIP look &amp; feel</p>
        </div>
      </div>
    </aside>
  )
}
