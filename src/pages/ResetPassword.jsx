import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import PasswordInput from '../components/PasswordInput'

export default function ResetPassword() {
  const { updatePassword } = useAuth()
  const nav = useNavigate()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    // Supabase fires a PASSWORD_RECOVERY event once it parses the token from
    // the email link's URL and establishes a temporary recovery session.
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    // If a session already exists by the time this mounts (link processed fast), allow it through too.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) return setError('Password must be at least 6 characters.')
    if (password !== confirm) return setError('Passwords do not match.')
    setBusy(true)
    const { error } = await updatePassword(password)
    setBusy(false)
    if (error) setError(error.message)
    else setDone(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy to-brand p-4">
      <div className="card w-full max-w-sm space-y-4">
        <div>
          <div className="text-4xl mb-2">🎓</div>
          <h1 className="text-xl font-bold">Set a new password</h1>
        </div>

        {!ready && !done && (
          <p className="text-sm text-slate-500">Waiting for the reset link to verify… if this doesn't update within a few seconds, the link may have expired — request a new one from the sign-in page.</p>
        )}

        {ready && !done && (
          <form onSubmit={onSubmit} className="space-y-4">
            {error && <div className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{error}</div>}
            <div>
              <label>New Password</label>
              <PasswordInput value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
            </div>
            <div>
              <label>Confirm New Password</label>
              <PasswordInput value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" />
            </div>
            <button className="btn btn-blue w-full" disabled={busy}>{busy ? 'Saving…' : 'Set new password'}</button>
          </form>
        )}

        {done && (
          <div className="space-y-3">
            <div className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">Password updated. You can now sign in with your new password.</div>
            <button className="btn btn-blue w-full" onClick={() => nav('/login')}>Go to sign in</button>
          </div>
        )}
      </div>
    </div>
  )
}
