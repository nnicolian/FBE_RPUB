import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ROLE_LABELS } from '../lib/roles'
import ChangePasswordModal from './ChangePasswordModal'

const LINKS = [
  { to: '/', label: 'Dashboard', icon: '📊', roles: null },
  { to: '/pipeline', label: 'Research Pipeline', icon: '📚', roles: null },
  { to: '/submissions', label: 'Submissions', icon: '📤', roles: null },
  { to: '/reports', label: 'Reports', icon: '📈', roles: null },
  { to: '/admin', label: 'Configuration', icon: '⚙️', roles: ['admin', 'research_admin', 'dean'] }
]

export default function Sidebar() {
  const { profile, signOut } = useAuth()
  const [showChangePw, setShowChangePw] = useState(false)

  return (
    <aside className="w-60 shrink-0 bg-navy text-white min-h-screen flex flex-col">
      <div className="p-5 border-b border-white/10 flex items-center gap-3">
        <div className="text-3xl leading-none">🎓</div>
        <div className="font-bold text-base leading-tight">AUST<br />FBE Research & Publications</div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {LINKS.filter(l => !l.roles || l.roles.includes(profile?.role)).map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold ${isActive ? 'bg-white/15' : 'hover:bg-white/10 text-white/85'}`
            }
          >
            <span>{l.icon}</span>{l.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-white/10 text-xs">
        <div className="font-semibold">{profile?.full_name}</div>
        <div className="text-white/60">{ROLE_LABELS[profile?.role] || '—'}{profile?.department ? ` · ${profile.department}` : ''}</div>
        <button onClick={() => setShowChangePw(true)} className="mt-3 btn btn-ghost w-full !bg-white/10 !border-white/20 !text-white">Change Password</button>
        <button onClick={signOut} className="mt-2 btn btn-ghost w-full !bg-white/10 !border-white/20 !text-white">Sign out</button>
      </div>
      {showChangePw && <ChangePasswordModal onClose={() => setShowChangePw(false)} />}
    </aside>
  )
}
