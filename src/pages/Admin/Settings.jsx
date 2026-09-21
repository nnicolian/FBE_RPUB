import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

const FIELDS = [
  { key: 'stale_days', label: 'Days before an update is considered stale' },
  { key: 'severe_overdue_days', label: 'Days overdue before a milestone is "severely" overdue' },
  { key: 'committee_pending_days', label: 'Days before a pending committee review is flagged' },
  { key: 'under_review_days', label: 'Days under external review before flagged as extended' }
]

export default function Settings() {
  const [settings, setSettings] = useState(null)

  useEffect(() => {
    supabase.from('oversight_settings').select('*').single().then(({ data }) => setSettings(data))
  }, [])

  async function save() {
    const { id, ...rest } = settings
    await supabase.from('oversight_settings').update(rest).eq('id', 1)
    alert('Saved.')
  }

  if (!settings) return <div className="card text-slate-400 text-sm">Loading…</div>

  return (
    <div className="card space-y-3 max-w-lg">
      <h3 className="font-bold">Oversight Settings</h3>
      <p className="text-xs text-slate-500">These thresholds drive the Green / Amber / Red health status and notifications across the pipeline.</p>
      {FIELDS.map(f => (
        <div key={f.key}>
          <label>{f.label}</label>
          <input type="number" min={1} value={settings[f.key]}
            onChange={e => setSettings(s => ({ ...s, [f.key]: Number(e.target.value) }))} />
        </div>
      ))}
      <button className="btn btn-blue" onClick={save}>Save</button>
    </div>
  )
}
