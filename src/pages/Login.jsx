import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PasswordInput from '../components/PasswordInput'
import AuthShell from '../components/AuthShell'

export default function Login() {
  const { signIn, resetPassword } = useAuth()
  const nav = useNavigate()
  const [mode, setMode] = useState('signin') // 'signin' | 'forgot'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true); setError('')
    const { error } = await signIn(email, password)
    setBusy(false)
    if (error) setError(error.message)
    else nav('/')
  }

  async function onForgot(e) {
    e.preventDefault()
    setBusy(true); setError(''); setInfo('')
    const { error } = await resetPassword(email)
    setBusy(false)
    if (error) setError(error.message)
    else setInfo('If an account exists for that email, a password reset link has been sent. Check your inbox.')
  }

  return (
    <AuthShell>
      <form onSubmit={mode === 'signin' ? onSubmit : onForgot} className="space-y-4">
        <div className="text-center">
          <h2 className="text-lg font-bold text-ink-900">{mode === 'signin' ? 'Welcome back' : 'Reset your password'}</h2>
          <p className="text-xs text-ink-400 mt-1">{mode === 'signin' ? 'Sign in to continue' : 'We will email you a reset link'}</p>
        </div>
        {error && <div className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{error}</div>}
        {info && <div className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">{info}</div>}

        <div>
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>

        {mode === 'signin' && (
          <div>
            <label>Password</label>
            <PasswordInput value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
        )}

        <button className="btn btn-blue w-full !py-2.5" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Send reset link'}
        </button>

        {mode === 'signin' ? (
          <button type="button" className="block mx-auto text-xs text-accent-700 font-medium hover:underline" onClick={() => { setMode('forgot'); setError(''); setInfo('') }}>
            Forgot your password?
          </button>
        ) : (
          <button type="button" className="block mx-auto text-xs text-accent-700 font-medium hover:underline" onClick={() => { setMode('signin'); setError(''); setInfo('') }}>
            &larr; Back to sign in
          </button>
        )}

        <p className="text-xs text-slate-400">Accounts are created by the Faculty administrator. Part-time faculty: the research interest survey needs no account — use the link you received.</p>
      </form>
    </AuthShell>
  )
}
