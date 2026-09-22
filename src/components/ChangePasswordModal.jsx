import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import PasswordInput from './PasswordInput'

export default function ChangePasswordModal({ onClose }) {
  const { updatePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h3 className="font-bold">Change Password</h3>
          <button className="text-slate-400" onClick={onClose}>✕</button>
        </div>
        {done ? (
          <div className="space-y-3">
            <div className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">Password updated successfully.</div>
            <button className="btn btn-blue w-full" onClick={onClose}>Done</button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            {error && <div className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{error}</div>}
            <div>
              <label>New Password</label>
              <PasswordInput value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
            </div>
            <div>
              <label>Confirm New Password</label>
              <PasswordInput value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" />
            </div>
            <div className="flex gap-2">
              <button className="btn btn-blue" disabled={busy}>{busy ? 'Saving…' : 'Update Password'}</button>
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
