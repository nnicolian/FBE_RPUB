import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { GraduationCap, Shield, LogOut, KeyRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ROLE_LABELS } from '../lib/roles'
import ChangePasswordModal from './ChangePasswordModal'
import { NAV_GROUPS, returnToSaip, visibleItems } from './navConfig'

// Top bar in the SAIP / FIP style: the signed-in user, Change Password and Sign out.
// On small screens it also carries the menu (the sidebar is hidden there).

export default function TopBar() {
  const { profile, signOut } = useAuth()
  const [showChangePw, setShowChangePw] = useState(false)
  const nav = useNavigate()
  const { pathname } = useLocation()
  const items = visibleItems(profile)
  const current = items.find((i) => (i.to === '/' ? pathname === '/' : pathname.startsWith(i.to)))?.to ?? '/'
  const initials = (profile?.full_name || profile?.email || '')
    .split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? '').join('')

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-ink-100 print:hidden">
      <div className="px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-3">
        {/* Small screens: logo + menu */}
        <div className="lg:hidden flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-900 text-white shrink-0">
            <GraduationCap className="h-4 w-4" />
          </div>
          <select className="!w-auto !py-1.5" value={current} onChange={(e) => { if (e.target.value === 'saip') returnToSaip(); else nav(e.target.value) }}>
            {NAV_GROUPS.map((g) => {
              const groupItems = items.filter((i) => i.group === g)
              return groupItems.length ? <optgroup key={g} label={g}>{groupItems.map((i) => <option key={i.to} value={i.to}>{i.label}</option>)}</optgroup> : null
            })}
            <option value="saip">← Return to SAIP</option>
          </select>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
          <div className="h-8 w-8 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center text-xs font-semibold">{initials || '?'}</div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-medium text-ink-900 leading-tight">{profile?.full_name || 'User'}</p>
            <p className="text-[10px] text-ink-400 leading-tight flex items-center gap-1">
              <Shield className="h-2.5 w-2.5" /> {ROLE_LABELS[profile?.role] || '—'}{profile?.department ? ` · ${profile.department}` : ''}
            </p>
          </div>
        </div>
        <button onClick={() => setShowChangePw(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-800 transition-colors px-2 py-1.5 rounded-lg hover:bg-ink-50">
          <KeyRound className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Change Password</span>
        </button>
        <button onClick={signOut}
          className="flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-800 transition-colors px-2 py-1.5 rounded-lg hover:bg-ink-50">
          <LogOut className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
      {showChangePw && <ChangePasswordModal onClose={() => setShowChangePw(false)} />}
    </header>
  )
}
