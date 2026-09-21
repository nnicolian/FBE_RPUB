import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ children, roles }) {
  const { session, profile, loading } = useAuth()
  if (loading) return <div className="p-8 text-center text-slate-500">Loading…</div>
  if (!session) return <Navigate to="/login" replace />
  if (roles && profile && !roles.includes(profile.role)) {
    return <div className="p-8 text-center text-rose-600">You don't have access to this page.</div>
  }
  return children
}
