import { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { badgeClass } from '../../../lib/health'
import FileList from '../../../components/FileList'
import { useToast } from '../../../context/ToastContext'
import { Check, Pencil } from 'lucide-react'

// Self-reporting pipeline (Research Strategy, Appendix 6): authors set a percentage per
// sub-task. Sub-task status, phase progress, the phase milestone and the paper's
// Pipeline Phase all update automatically in the database — no submissions or approvals.

const STEPS = [0, 25, 50, 75, 100]
const fmtDate = v => v || '—'
const bySeq = (a, b) => (a.seq ?? 0) - (b.seq ?? 0)

function ProgressBar({ value }) {
  return (
    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full ${value === 100 ? 'bg-emerald-500' : 'bg-brand'}`} style={{ width: `${value || 0}%` }} />
    </div>
  )
}

function ProgressControl({ value, onChange }) {
  const [custom, setCustom] = useState('')
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {STEPS.map(v => (
        <button key={v} onClick={() => onChange(v)}
          className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${value === v ? 'bg-brand text-white border-brand' : 'bg-white border-slate-200 text-slate-600 hover:border-brand'}`}>
          {v}%
        </button>
      ))}
      <input type="number" min={0} max={100} placeholder="%" value={custom} className="!w-16 !py-0.5 text-xs"
        onChange={e => setCustom(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && custom !== '') { onChange(Math.max(0, Math.min(100, Math.round(Number(custom))))); setCustom('') } }}
        onBlur={() => { if (custom !== '') { onChange(Math.max(0, Math.min(100, Math.round(Number(custom))))); setCustom('') } }} />
    </div>
  )
}

function TaskEditForm({ t, onSave, onCancel }) {
  const [d, setD] = useState({ name: t.name || '', owner: t.owner || '', due: t.due || '', guidance: t.guidance || '', comments: t.comments || '', blocked: t.status === 'Blocked' })
  const [err, setErr] = useState(null)
  const set = (k, v) => setD(x => ({ ...x, [k]: v }))
  async function save() {
    if (!d.name.trim()) { setErr('The name cannot be empty.'); return }
    const fields = { name: d.name.trim(), owner: d.owner, due: d.due || null, guidance: d.guidance, comments: d.comments }
    // Blocked is the only status set by hand; the rest follows the percentage.
    if (d.blocked && t.status !== 'Blocked') fields.status = 'Blocked'
    if (!d.blocked && t.status === 'Blocked') fields.status = 'In Progress'
    const ok = await onSave(fields)
    if (!ok) setErr('Could not save. Please try again.')
  }
  return (
    <div className="mt-2 space-y-2 rounded-lg border border-blue-200 bg-blue-50/40 p-3 text-sm">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="col-span-2"><label>Sub-task</label><input value={d.name} onChange={e => set('name', e.target.value)} /></div>
        <div><label>Owner</label><input value={d.owner} onChange={e => set('owner', e.target.value)} /></div>
        <div><label>Target date (optional)</label><input type="date" value={d.due} onChange={e => set('due', e.target.value)} /></div>
      </div>
      <div><label>What 100% looks like</label><input value={d.guidance} onChange={e => set('guidance', e.target.value)} /></div>
      <div><label>Notes</label><textarea rows={2} value={d.comments} onChange={e => set('comments', e.target.value)} /></div>
      <label className="!mb-0 flex items-center gap-2 font-normal">
        <input type="checkbox" className="!w-auto" checked={d.blocked} onChange={e => set('blocked', e.target.checked)} />
        Blocked — I need help to move this forward (flags it for the Research Coordinator)
      </label>
      {err && <p className="text-rose-600">{err}</p>}
      <div className="flex gap-2">
        <button className="btn btn-blue" onClick={save}>Save changes</button>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

function TaskRow({ t, canEdit, h }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  return (
    <div className="border border-slate-200 rounded-lg p-3 bg-white">
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0 flex-1">
          <button className="text-left font-semibold text-sm" onClick={() => setOpen(o => !o)}>{open ? '▾' : '▸'} {t.name}</button>
          {t.guidance && <p className="text-xs text-slate-500 mt-0.5 ml-4"><span className="text-slate-400">100% =</span> {t.guidance}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`badge ${badgeClass(t.status)}`}>{t.status}</span>
          <span className="text-sm font-bold w-10 text-right">{t.progress}%</span>
        </div>
      </div>
      <div className="mt-2 ml-4 grid md:grid-cols-2 gap-2 items-center">
        <ProgressBar value={t.progress} />
        {canEdit && <ProgressControl value={t.progress} onChange={v => h.setProgress(t.id, v)} />}
      </div>
      {editing && <TaskEditForm t={t} onCancel={() => setEditing(false)} onSave={async f => { const ok = await h.saveTask(t.id, f); if (ok) setEditing(false); return ok }} />}
      {open && !editing && (
        <div className="mt-2 ml-4 space-y-2 text-xs">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div><div className="text-slate-400">Owner</div><div className="font-semibold">{t.owner || '—'}</div></div>
            <div><div className="text-slate-400">Target date</div><div className="font-semibold">{fmtDate(t.due)}</div></div>
            <div><div className="text-slate-400">Started</div><div className="font-semibold">{fmtDate(t.actual_start)}</div></div>
            <div><div className="text-slate-400">Completed</div><div className="font-semibold">{fmtDate(t.actual_end)}</div></div>
          </div>
          {t.comments && <div className="note whitespace-pre-wrap">{t.comments}</div>}
          <FileList entityType="task" entityId={t.id} canEdit={canEdit} />
          {canEdit && (
            <div className="flex gap-3">
              <button className="btn btn-ghost !py-1 !px-2 text-xs" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" /> Edit</button>
              <button className="text-xs text-rose-500" onClick={() => h.deleteTask(t.id)}>Delete sub-task</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PhaseCard({ p, canEdit, h }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(p.name)
  const [note, setNote] = useState(p.comments || '')
  const tasks = (p.tasks || []).slice().sort(bySeq)
  const done = p.progress === 100
  return (
    <div className="card">
      <div className="flex justify-between items-center gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <strong>{p.name}</strong>
          <span className={`badge ${badgeClass(p.status)}`}>{p.status}</span>
          {done && <span className="badge badge-green"><Check className="h-3 w-3" /> Milestone reached{p.actual_end ? ` · ${p.actual_end}` : ''}</span>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm font-bold">{p.progress}%</span>
          {canEdit && !editing && <button className="btn btn-ghost !py-1 !px-2 text-xs" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" /> Edit</button>}
          {canEdit && !editing && <button className="text-xs text-rose-500" onClick={() => h.deletePhase(p.id)}>Delete Phase</button>}
        </div>
      </div>
      <div className="mt-2"><ProgressBar value={p.progress} /></div>
      {editing ? (
        <div className="mt-2 space-y-2 rounded-lg border border-blue-200 bg-blue-50/40 p-3 text-sm">
          <div><label>Phase name</label><input value={name} onChange={e => setName(e.target.value)} /></div>
          <div><label>Milestone / phase note</label><textarea rows={2} value={note} onChange={e => setNote(e.target.value)} /></div>
          <div className="flex gap-2">
            <button className="btn btn-blue" onClick={async () => { if (!name.trim()) return; const ok = await h.savePhase(p.id, { name: name.trim(), comments: note }); if (ok) setEditing(false) }}>Save changes</button>
            <button className="btn btn-ghost" onClick={() => { setName(p.name); setNote(p.comments || ''); setEditing(false) }}>Cancel</button>
          </div>
        </div>
      ) : p.comments && <p className="text-xs text-slate-500 mt-2">{p.comments}</p>}
      <div className="mt-3 space-y-2">
        {tasks.map(t => <TaskRow key={t.id} t={t} canEdit={canEdit} h={h} />)}
        {tasks.length === 0 && <p className="text-xs text-slate-400">No sub-tasks in this phase.</p>}
      </div>
      {canEdit && <button className="mt-2 text-xs text-brand font-semibold" onClick={() => h.addTask(p.id, tasks.length)}>+ Sub-task</button>}
      <div className="mt-2"><FileList entityType="phase" entityId={p.id} canEdit={canEdit} /></div>
    </div>
  )
}

export default function HierarchyTab({ work, phases, canEdit, onReload }) {
  const { showToast } = useToast()
  const sorted = phases.slice().sort(bySeq)

  async function run(promise, okMsg) {
    const { error } = await promise
    showToast(error ? `Could not save: ${error.message}` : okMsg, error ? 'error' : 'success')
    if (!error) onReload()
    return !error
  }

  const h = {
    setProgress: (id, progress) => run(supabase.from('tasks').update({ progress }).eq('id', id), `Progress set to ${progress}%`),
    saveTask: (id, fields) => run(supabase.from('tasks').update(fields).eq('id', id), 'Sub-task saved'),
    addTask: (phaseId, seq) => { const name = prompt('Sub-task name?'); if (name?.trim()) run(supabase.from('tasks').insert({ phase_id: phaseId, name: name.trim(), seq, owner: work.lead || '' }), 'Sub-task added') },
    deleteTask: id => { if (confirm('Delete this sub-task?')) run(supabase.from('tasks').delete().eq('id', id), 'Sub-task deleted') },
    savePhase: (id, fields) => run(supabase.from('phases').update(fields).eq('id', id), 'Phase saved'),
    addPhase: () => { const name = prompt('Phase name?'); if (name?.trim()) run(supabase.from('phases').insert({ work_id: work.id, name: name.trim(), seq: phases.length, committee_required: false, committee_status: 'Optional / Not Requested' }), 'Phase added') },
    deletePhase: id => { if (confirm('Delete this phase and its sub-tasks and files?')) run(supabase.from('phases').delete().eq('id', id), 'Phase deleted') }
  }

  const overall = sorted.length ? Math.round(sorted.reduce((n, p) => n + (p.progress || 0), 0) / sorted.length) : 0

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 className="font-bold">Research Pipeline</h3>
            <p className="text-xs text-slate-500">
              Set a percentage for each sub-task as you go. Milestones and the paper's phase update automatically —
              there's nothing to submit or get approved.
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs text-slate-400">Current phase</div>
            <div className="font-bold">{work.stage || '—'}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {sorted.map(p => (
            <div key={p.id} className={`rounded-lg border p-3 ${p.progress === 100 ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-slate-50'}`}>
              <div className="text-xs font-semibold">{p.name}</div>
              <div className="text-lg font-bold">{p.progress}%{p.progress === 100 && <Check className="h-4 w-4 inline ml-1 text-success-600" />}</div>
              <ProgressBar value={p.progress} />
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-2">Overall: {overall}% across {sorted.length} phase{sorted.length === 1 ? '' : 's'}.</p>
      </div>

      {sorted.length === 0 && <div className="card text-sm text-slate-400">No phases yet.{canEdit && ' Use “+ Phase” to add one.'}</div>}
      {sorted.map(p => <PhaseCard key={p.id} p={p} canEdit={canEdit} h={h} />)}
      {canEdit && <button className="btn btn-soft" onClick={h.addPhase}>+ Phase</button>}
    </div>
  )
}
