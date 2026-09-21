import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

const DEFAULT_TEMPLATE = [
  { id: 'p1', name: '1. Onboarding', optional: false, committeeRequired: true, instructions: '',
    tasks: [{ id: 't1', name: 'Chair or Committee Referral', instructions: '', subtasks: [] }] },
  { id: 'p2', name: '2. Execution', optional: false, committeeRequired: true, instructions: '', tasks: [] },
  { id: 'p3', name: '3. Advisory Review', optional: true, committeeRequired: false, instructions: '', tasks: [] },
  { id: 'p4', name: '4. Submission', optional: false, committeeRequired: true, instructions: '', tasks: [] }
]
const uid = () => Math.random().toString(36).slice(2, 9)

export default function LifecycleTemplate() {
  const [template, setTemplate] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('lifecycle_template').select('*').single()
    const t = data?.template
    setTemplate(Array.isArray(t) && t.length ? t : DEFAULT_TEMPLATE)
    setLoading(false)
  }

  async function persist(next) {
    setTemplate(next)
    await supabase.from('lifecycle_template').update({ template: next }).eq('id', 1)
  }

  function addPhase() {
    persist([...template, { id: uid(), name: 'New Phase', optional: false, committeeRequired: false, instructions: '', tasks: [] }])
  }
  function updatePhase(pid, fields) {
    persist(template.map(p => p.id === pid ? { ...p, ...fields } : p))
  }
  function removePhase(pid) {
    if (!confirm('Remove this phase from the template?')) return
    persist(template.filter(p => p.id !== pid))
  }
  function addTask(pid) {
    const name = prompt('Task name?'); if (!name) return
    persist(template.map(p => p.id === pid ? { ...p, tasks: [...p.tasks, { id: uid(), name, instructions: '', subtasks: [] }] } : p))
  }
  function removeTask(pid, tid) {
    persist(template.map(p => p.id === pid ? { ...p, tasks: p.tasks.filter(t => t.id !== tid) } : p))
  }
  function resetDefault() {
    if (!confirm('Reset to the default lifecycle template? This does not affect existing papers.')) return
    persist(DEFAULT_TEMPLATE)
  }

  if (loading) return <div className="card text-slate-400 text-sm">Loading…</div>

  return (
    <div className="card space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold">Standard Research Lifecycle</h3>
          <p className="text-xs text-slate-500">Editable master template used only when creating new papers. Existing papers are never changed automatically.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-soft" onClick={addPhase}>+ Phase</button>
          <button className="btn btn-ghost" onClick={resetDefault}>Reset Default</button>
        </div>
      </div>
      <div className="note text-xs">
        <strong>Important:</strong> changes here apply to future papers using "Standard Research Lifecycle." Existing papers keep their current hierarchy.
      </div>
      <div className="space-y-3">
        {template.map(p => (
          <div key={p.id} className="border border-slate-200 rounded-lg p-3">
            <div className="flex justify-between items-center gap-2">
              <input className="font-semibold !border-0 !p-1" defaultValue={p.name} onBlur={e => updatePhase(p.id, { name: e.target.value })} />
              <div className="flex items-center gap-3 text-xs shrink-0">
                <label className="flex items-center gap-1"><input type="checkbox" checked={p.optional} onChange={e => updatePhase(p.id, { optional: e.target.checked })} /> Optional</label>
                <label className="flex items-center gap-1"><input type="checkbox" checked={p.committeeRequired} onChange={e => updatePhase(p.id, { committeeRequired: e.target.checked })} /> Committee required</label>
                <button className="text-rose-500" onClick={() => removePhase(p.id)}>Delete Phase</button>
              </div>
            </div>
            <textarea className="mt-2" placeholder="Instructions for this phase" defaultValue={p.instructions} onBlur={e => updatePhase(p.id, { instructions: e.target.value })} />
            <div className="mt-2 space-y-1">
              {p.tasks.map(t => (
                <div key={t.id} className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm">
                  <span>{t.name}</span>
                  <button className="text-xs text-rose-500" onClick={() => removeTask(p.id, t.id)}>Delete</button>
                </div>
              ))}
              <button className="text-xs text-brand font-semibold" onClick={() => addTask(p.id)}>+ Task</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
