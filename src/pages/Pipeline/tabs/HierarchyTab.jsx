import { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { badgeClass } from '../../../lib/health'
import { ITEM_STATUSES } from '../../../lib/workOptions'
import FileList from '../../../components/FileList'
import { useToast } from '../../../context/ToastContext'

// Every level (phase, task, sub-task) works the same way: view mode shows the
// values; "✎ Edit" opens a form, and nothing is saved until "Save changes".

const FIELDS = {
  phase: ['name', 'status', 'planned_start', 'planned_end', 'actual_start', 'actual_end', 'comments', 'optional', 'committee_required'],
  task: ['name', 'status', 'owner', 'planned_start', 'planned_end', 'due', 'actual_start', 'actual_end', 'comments'],
  subtask: ['name', 'status', 'owner', 'planned_start', 'planned_end', 'actual_start', 'actual_end', 'comments']
}
const LABELS = {
  name: 'Name', status: 'Status', owner: 'Owner', planned_start: 'Planned Start', planned_end: 'Planned End',
  due: 'Due', actual_start: 'Actual Start', actual_end: 'Actual End', comments: 'Comments',
  optional: 'Optional phase (no penalty if skipped)', committee_required: 'Committee review required'
}
const DATE_FIELDS = ['planned_start', 'planned_end', 'due', 'actual_start', 'actual_end']
const fmtDate = v => v || '—'

function pick(item, level) {
  const d = {}
  for (const f of FIELDS[level]) {
    if (f === 'optional' || f === 'committee_required') d[f] = !!item[f]
    else d[f] = item[f] ?? ''
  }
  return d
}

function EditForm({ item, level, onSave, onCancel }) {
  const [draft, setDraft] = useState(() => pick(item, level))
  const [err, setErr] = useState(null)
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }))

  async function save() {
    if (!String(draft.name).trim()) { setErr('The name cannot be empty.'); return }
    for (const [a, b] of [['planned_start', 'planned_end'], ['actual_start', 'actual_end']]) {
      if (draft[a] && draft[b] && draft[b] < draft[a]) { setErr(`${LABELS[b]} can't be before ${LABELS[a]}.`); return }
    }
    const fields = { ...draft, name: String(draft.name).trim() }
    for (const f of DATE_FIELDS) if (f in fields) fields[f] = fields[f] || null
    setSaving(true)
    const ok = await onSave(fields)
    setSaving(false)
    if (!ok) setErr('Could not save. Please try again.')
  }

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-blue-200 bg-blue-50/40 p-3 text-sm">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="col-span-2"><label>Name</label><input value={draft.name} onChange={e => set('name', e.target.value)} /></div>
        <div><label>Status</label>
          <select value={draft.status} onChange={e => set('status', e.target.value)}>
            {ITEM_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select></div>
        {'owner' in draft && <div><label>Owner</label><input value={draft.owner} onChange={e => set('owner', e.target.value)} /></div>}
        {DATE_FIELDS.filter(f => f in draft).map(f => (
          <div key={f}><label>{LABELS[f]}</label><input type="date" value={draft[f] || ''} onChange={e => set(f, e.target.value)} /></div>
        ))}
      </div>
      {'optional' in draft && (
        <div className="flex flex-wrap gap-4">
          {['optional', 'committee_required'].map(f => (
            <label key={f} className="!mb-0 flex items-center gap-2 font-normal">
              <input type="checkbox" className="!w-auto" checked={draft[f]} onChange={e => set(f, e.target.checked)} />{LABELS[f]}
            </label>
          ))}
        </div>
      )}
      <div><label>Comments</label><textarea rows={3} value={draft.comments} onChange={e => set('comments', e.target.value)} /></div>
      {err && <p className="text-rose-600">{err}</p>}
      <div className="flex gap-2">
        <button className="btn btn-blue" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save changes'}</button>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

function Details({ item, level }) {
  const dates = DATE_FIELDS.filter(f => FIELDS[level].includes(f))
  return (
    <div className="mt-2 space-y-2 text-xs">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        {FIELDS[level].includes('owner') && <div><div className="text-slate-400">Owner</div><div className="font-semibold">{item.owner || '—'}</div></div>}
        {dates.map(f => <div key={f}><div className="text-slate-400">{LABELS[f]}</div><div className="font-semibold">{fmtDate(item[f])}</div></div>)}
      </div>
      {item.comments && <div className="note whitespace-pre-wrap">{item.comments}</div>}
    </div>
  )
}

function ItemActions({ canEdit, editing, onEdit, onDelete, deleteLabel = 'Delete' }) {
  if (!canEdit || editing) return null
  return (
    <>
      <button className="btn btn-ghost !py-1 !px-2 text-xs" onClick={onEdit}>✎ Edit</button>
      <button className="text-xs text-rose-500" onClick={onDelete}>{deleteLabel}</button>
    </>
  )
}

function SubtaskRow({ s, canEdit, onSave, onDelete }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  return (
    <div className="ml-8 mt-2 bg-slate-50 border border-slate-200 rounded-lg p-2">
      <div className="flex justify-between items-center text-sm gap-2">
        <button className="text-left font-semibold" onClick={() => setOpen(o => !o)}>{open ? '▾' : '▸'} ↳ {s.name}</button>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`badge ${badgeClass(s.status)}`}>{s.status}</span>
          <ItemActions canEdit={canEdit} editing={editing} onEdit={() => { setOpen(true); setEditing(true) }} onDelete={onDelete} />
        </div>
      </div>
      {editing ? (
        <EditForm item={s} level="subtask" onCancel={() => setEditing(false)}
          onSave={async f => { const ok = await onSave(f); if (ok) setEditing(false); return ok }} />
      ) : open && (
        <>
          <Details item={s} level="subtask" />
          <div className="mt-2"><FileList entityType="subtask" entityId={s.id} canEdit={canEdit} /></div>
        </>
      )}
    </div>
  )
}

function TaskRow({ t, canEdit, onSaveTask, onDeleteTask, onAddSubtask, onSaveSubtask, onDeleteSubtask }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  return (
    <div className="ml-6 mt-2 border border-slate-200 rounded-lg p-2 bg-white">
      <div className="flex justify-between items-center text-sm gap-2">
        <button className="text-left font-semibold" onClick={() => setOpen(o => !o)}>{open ? '▾' : '▸'} {t.name}</button>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`badge ${badgeClass(t.status)}`}>{t.status}</span>
          <ItemActions canEdit={canEdit} editing={editing} onEdit={() => { setOpen(true); setEditing(true) }} onDelete={onDeleteTask} />
        </div>
      </div>
      {editing && (
        <EditForm item={t} level="task" onCancel={() => setEditing(false)}
          onSave={async f => { const ok = await onSaveTask(f); if (ok) setEditing(false); return ok }} />
      )}
      {open && (
        <div className="mt-2 space-y-2">
          {!editing && <Details item={t} level="task" />}
          <FileList entityType="task" entityId={t.id} canEdit={canEdit} />
          {(t.subtasks || []).slice().sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0)).map(s => (
            <SubtaskRow key={s.id} s={s} canEdit={canEdit} onSave={f => onSaveSubtask(s.id, f)} onDelete={() => onDeleteSubtask(s.id)} />
          ))}
          {canEdit && <button className="ml-8 text-xs text-brand font-semibold" onClick={() => onAddSubtask(t.id)}>+ Sub-task</button>}
        </div>
      )}
    </div>
  )
}

function PhaseCard({ p, canEdit, h }) {
  const [editing, setEditing] = useState(false)
  return (
    <div className="card">
      <div className="flex justify-between items-center gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <strong>{p.name}</strong>
          {p.optional && <span className="badge badge-purple">Optional · no penalty</span>}
          {p.committee_required ? <span className={`badge ${badgeClass(p.committee_status)}`}>{p.committee_status}</span> : <span className="badge badge-gray">Committee comment only if requested</span>}
          <span className={`badge ${badgeClass(p.status)}`}>{p.status}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ItemActions canEdit={canEdit} editing={editing} onEdit={() => setEditing(true)} onDelete={() => h.deletePhase(p.id)} deleteLabel="Delete Phase" />
        </div>
      </div>
      {editing ? (
        <EditForm item={p} level="phase" onCancel={() => setEditing(false)}
          onSave={async f => { const ok = await h.savePhase(p.id, f); if (ok) setEditing(false); return ok }} />
      ) : <Details item={p} level="phase" />}
      <div className="mt-2"><FileList entityType="phase" entityId={p.id} canEdit={canEdit} /></div>
      {(p.tasks || []).slice().sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0)).map(t => (
        <TaskRow key={t.id} t={t} canEdit={canEdit}
          onSaveTask={f => h.saveTask(t.id, f)}
          onDeleteTask={() => h.deleteTask(t.id)}
          onAddSubtask={h.addSubtask}
          onSaveSubtask={h.saveSubtask}
          onDeleteSubtask={h.deleteSubtask} />
      ))}
      {canEdit && <button className="ml-6 mt-2 text-xs text-brand font-semibold" onClick={() => h.addTask(p.id, (p.tasks || []).length)}>+ Task</button>}
    </div>
  )
}

export default function HierarchyTab({ work, phases, canEdit, onReload }) {
  const { showToast } = useToast()

  async function run(promise, okMsg) {
    const { error } = await promise
    showToast(error ? `Could not save: ${error.message}` : okMsg, error ? 'error' : 'success')
    if (!error) onReload()
    return !error
  }

  const h = {
    addPhase: () => { const name = prompt('Phase name?'); if (name?.trim()) run(supabase.from('phases').insert({ work_id: work.id, name: name.trim(), seq: phases.length }), 'Phase added') },
    deletePhase: id => { if (confirm('Delete this phase and everything under it (tasks, subtasks, files)?')) run(supabase.from('phases').delete().eq('id', id), 'Phase deleted') },
    addTask: (phaseId, seq) => { const name = prompt('Task name?'); if (name?.trim()) run(supabase.from('tasks').insert({ phase_id: phaseId, name: name.trim(), seq }), 'Task added') },
    deleteTask: id => { if (confirm('Delete this task and its subtasks?')) run(supabase.from('tasks').delete().eq('id', id), 'Task deleted') },
    addSubtask: taskId => { const name = prompt('Sub-task name?'); if (name?.trim()) run(supabase.from('subtasks').insert({ task_id: taskId, name: name.trim() }), 'Sub-task added') },
    deleteSubtask: id => { if (confirm('Delete this sub-task?')) run(supabase.from('subtasks').delete().eq('id', id), 'Sub-task deleted') },
    savePhase: (id, fields) => run(supabase.from('phases').update(fields).eq('id', id), 'Phase saved'),
    saveTask: (id, fields) => run(supabase.from('tasks').update(fields).eq('id', id), 'Task saved'),
    saveSubtask: (id, fields) => run(supabase.from('subtasks').update(fields).eq('id', id), 'Sub-task saved')
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold">Paper Hierarchy</h3>
        {canEdit && <button className="btn btn-soft" onClick={h.addPhase}>+ Phase</button>}
      </div>

      <div className="card">
        <h3 className="font-bold mb-2">Research Progress Summary</h3>
        <div className="overflow-x-auto">
          <table>
            <thead><tr><th>Phase</th><th>Planned Start</th><th>Planned End</th><th>Actual Start</th><th>Actual End</th><th>Status</th><th>Progress</th></tr></thead>
            <tbody>
              {phases.map(p => (
                <tr key={p.id}>
                  <td className="font-semibold">{p.name}{p.optional && <span className="badge badge-purple ml-1">Optional</span>}</td>
                  <td>{fmtDate(p.planned_start)}</td><td>{fmtDate(p.planned_end)}</td>
                  <td>{fmtDate(p.actual_start)}</td><td>{fmtDate(p.actual_end)}</td>
                  <td><span className={`badge ${badgeClass(p.status)}`}>{p.status}</span></td>
                  <td>{p.progress}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {phases.length === 0 && <div className="card text-sm text-slate-400">No phases yet.{canEdit && ' Use “+ Phase” to add one.'}</div>}
      {phases.map(p => <PhaseCard key={p.id} p={p} canEdit={canEdit} h={h} />)}
    </div>
  )
}
