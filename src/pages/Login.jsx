import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true); setError('')
    const { error } = await signIn(email, password)
    setBusy(false)
    if (error) setError(error.message)
    else nav('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy to-brand p-4">
      <form onSubmit={onSubmit} className="card w-full max-w-sm space-y-4">
        <div>
          <div className="text-4xl mb-2">🎓</div>
          <h1 className="text-xl font-bold">AUST, FBE Research & Publications</h1>
          <p className="text-sm text-slate-500">Sign in to continue</p>
        </div>
        {error && <div className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{error}</div>}
        <div>
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div>
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        <button className="btn btn-blue w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="text-xs text-slate-400">Accounts are created by the Research Office admin and assigned a role (Chair, Committee, Dean, Viewer).</p>
      </form>
    </div>
  )
}
