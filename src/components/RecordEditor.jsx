import { useState } from 'react'

// Small Edit → Save/Cancel form used for rows in the work tabs (milestones,
// risks, updates, deliverables, costs). `fields` = [{ key, label, type, options, required, min }].
export default function RecordEditor({ record, fields, onSave, onCancel }) {
  const [draft, setDraft] = useState(() => Object.fromEntries(fields.map(f => [f.key, record[f.key] ?? ''])))
  const [err, setErr] = useState(null)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }))

  async function save() {
    const out = {}
    for (const f of fields) {
      let v = draft[f.key]
      if (typeof v === 'string') v = v.trim()
      if (f.required && (v === '' || v == null)) { setErr(`${f.label} is required.`); return }
      if (f.type === 'number') {
        v = v === '' ? 0 : Number(v)
        if (!Number.isFinite(v)) { setErr(`${f.label} must be a number.`); return }
        if (f.min != null && v < f.min) { setErr(`${f.label} can't be less than ${f.min}.`); return }
      }
      if (f.type === 'date') v = v || null
      out[f.key] = v
    }
    setSaving(true); setErr(null)
    const ok = await onSave(out)
    setSaving(false)
    if (ok === false) setErr('Could not save. Please try again.')
  }

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-blue-200 bg-blue-50/40 p-3 text-sm w-full">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {fields.map(f => (
          <div key={f.key} className={f.type === 'textarea' || f.wide ? 'col-span-2 md:col-span-4' : ''}>
            <label>{f.label}</label>
            {f.type === 'select' ? (
              <select value={draft[f.key]} onChange={e => set(f.key, e.target.value)}>
                {(draft[f.key] && !f.options.includes(draft[f.key]) ? [draft[f.key], ...f.options] : f.options).map(o => <option key={o}>{o}</option>)}
              </select>
            ) : f.type === 'textarea' ? (
              <textarea rows={3} value={draft[f.key]} onChange={e => set(f.key, e.target.value)} />
            ) : (
              <input type={f.type || 'text'} min={f.min} step={f.type === 'number' ? 'any' : undefined}
                value={draft[f.key] ?? ''} onChange={e => set(f.key, e.target.value)} />
            )}
          </div>
        ))}
      </div>
      {err && <p className="text-rose-600">{err}</p>}
      <div className="flex gap-2">
        <button className="btn btn-blue" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save changes'}</button>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}
