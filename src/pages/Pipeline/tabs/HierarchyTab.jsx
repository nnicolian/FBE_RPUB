import { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { badgeClass } from '../../../lib/health'
import FileList from '../../../components/FileList'

const STATUSES = ['Not Started', 'In Progress', 'Completed', 'Blocked']

function DateField({ label, value, onChange }) {
  return <div><label>{label}</label><input type="date" defaultValue={value || ''} onBlur={e => onChange(e.target.value || null)} /></div>
}

function SubtaskRow({ s, canEdit, onUpdate, onDelete }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="ml-8 mt-2 bg-slate-50 border border-slate-200 rounded-lg p-2">
      <div className="flex justify-between items-center text-sm">
        <button className="text-left font-semibold" onClick={() => setOpen(o => !o)}>↳ {s.name}</button>
        <div className="flex items-center gap-2">
          <span className={`badge ${badgeClass(s.status)}`}>{s.status}</span>
          {canEdit && (
            <>
              <select className="!w-36 !py-1" value={s.status} onChange={e => onUpdate({ status: e.target.value })}>
                {STATUSES.map(x => <option key={x}>{x}</option>)}
              </select>
              <button className="text-xs text-rose-500" onClick={onDelete}>Delete</button>
            </>
          )}
        </div>
      </div>
      {open && (
        <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
          <DateField label="Planned Start" value={s.planned_start} onChange={v => onUpdate({ planned_start: v })} />
          <DateField label="Planned End" value={s.planned_end} onChange={v => onUpdate({ planned_end: v })} />
          <DateField label="Actual Start" value={s.actual_start} onChange={v => onUpdate({ actual_start: v })} />
          <DateField label="Actual End" value={s.actual_end} onChange={v => onUpdate({ actual_end: v })} />
          <div className="col-span-4"><label>Comments</label><textarea defaultValue={s.comments} onBlur={e => onUpdate({ comments: e.target.value })} /></div>
          <div className="col-span-4"><FileList entityType="subtask" entityId={s.id} canEdit={canEdit} /></div>
        </div>
      )}
    </div>
  )
}

function TaskRow({ t, canEdit, onUpdateTask, onDeleteTask, onAddSubtask, onUpdateSubtask, onDeleteSubtask }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="ml-6 mt-2 border border-slate-200 rounded-lg p-2 bg-white">
      <div className="flex justify-between items-center text-sm">
        <button className="text-left font-semibold" onClick={() => setOpen(o => !o)}>{t.name}</button>
        <div className="flex items-center gap-2">
          <span className={`badge ${badgeClass(t.status)}`}>{t.status}</span>
          {canEdit && (
            <>
              <select className="!w-36 !py-1" value={t.status} onChange={e => onUpdateTask({ status: e.target.value })}>
                {STATUSES.map(x => <option key={x}>{x}</option>)}
              </select>
              <button className="text-xs text-rose-500" onClick={onDeleteTask}>Delete</button>
            </>
          )}
        </div>
      </div>
      {open && (
        <div className="mt-2 space-y-2">
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div><label>Owner</label><input defaultValue={t.owner} onBlur={e => onUpdateTask({ owner: e.target.value })} /></div>
            <DateField label="Planned Start" value={t.planned_start} onChange={v => onUpdateTask({ planned_start: v })} />
            <DateField label="Planned End" value={t.planned_end} onChange={v => onUpdateTask({ planned_end: v })} />
            <DateField label="Due" value={t.due} onChange={v => onUpdateTask({ due: v })} />
            <DateField label="Actual Start" value={t.actual_start} onChange={v => onUpdateTask({ actual_start: v })} />
            <DateField label="Actual End" value={t.actual_end} onChange={v => onUpdateTask({ actual_end: v })} />
          </div>
          <div><label>Comments</label><textarea defaultValue={t.comments} onBlur={e => onUpdateTask({ comments: e.target.value })} /></div>
          <FileList entityType="task" entityId={t.id} canEdit={canEdit} />
          {(t.subtasks || []).map(s => (
            <SubtaskRow key={s.id} s={s} canEdit={canEdit} onUpdate={fields => onUpdateSubtask(s.id, fields)} onDelete={() => onDeleteSubtask(s.id)} />
          ))}
          {canEdit && <button className="ml-8 text-xs text-brand font-semibold" onClick={() => onAddSubtask(t.id)}>+ Sub-task</button>}
        </div>
      )}
    </div>
  )
}

export default function HierarchyTab({ work, phases, canEdit, onReload }) {
  async function addPhase() {
    const name = prompt('Phase name?'); if (!name) return
    await supabase.from('phases').insert({ work_id: work.id, name, seq: phases.length })
    onReload()
  }
  async function deletePhase(phaseId) {
    if (!confirm('Delete this phase and everything under it (tasks, subtasks, files)?')) return
    await supabase.from('phases').delete().eq('id', phaseId)
    onReload()
  }
  async function addTask(phaseId) {
    const name = prompt('Task name?'); if (!name) return
    await supabase.from('tasks').insert({ phase_id: phaseId, name })
    onReload()
  }
  async function deleteTask(taskId) {
    if (!confirm('Delete this task and its subtasks?')) return
    await supabase.from('tasks').delete().eq('id', taskId)
    onReload()
  }
  async function addSubtask(taskId) {
    const name = prompt('Sub-task name?'); if (!name) return
    await supabase.from('subtasks').insert({ task_id: taskId, name })
    onReload()
  }
  async function deleteSubtask(subtaskId) {
    if (!confirm('Delete this sub-task?')) return
    await supabase.from('subtasks').delete().eq('id', subtaskId)
    onReload()
  }
  async function updatePhase(phaseId, fields) {
    await supabase.from('phases').update(fields).eq('id', phaseId)
    onReload()
  }
  async function updateTask(taskId, fields) {
    await supabase.from('tasks').update(fields).eq('id', taskId)
    onReload()
  }
  async function updateSubtask(subtaskId, fields) {
    await supabase.from('subtasks').update(fields).eq('id', subtaskId)
    onReload()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold">Paper Hierarchy</h3>
        {canEdit && <button className="btn btn-soft" onClick={addPhase}>+ Phase</button>}
      </div>

      <div className="card">
        <h3 className="font-bold mb-2">Research Progress Summary</h3>
        <table>
          <thead><tr><th>Phase</th><th>Planned Start</th><th>Planned End</th><th>Actual Start</th><th>Actual End</th><th>Status</th><th>Progress</th></tr></thead>
          <tbody>
            {phases.map(p => (
              <tr key={p.id}>
                <td className="font-semibold">{p.name}{p.optional && <span className="badge badge-purple ml-1">Optional</span>}</td>
                <td>{p.planned_start || '—'}</td><td>{p.planned_end || '—'}</td>
                <td>{p.actual_start || '—'}</td><td>{p.actual_end || '—'}</td>
                <td><span className={`badge ${badgeClass(p.status)}`}>{p.status}</span></td>
                <td>{p.progress}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {phases.map(p => (
        <div key={p.id} className="card">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <strong>{p.name}</strong>
              {p.optional && <span className="badge badge-purple">Optional · no penalty</span>}
              {p.committee_required ? <span className={`badge ${badgeClass(p.committee_status)}`}>{p.committee_status}</span> : <span className="badge badge-gray">Committee comment only if requested</span>}
              <span className={`badge ${badgeClass(p.status)}`}>{p.status}</span>
            </div>
            {canEdit && (
              <div className="flex items-center gap-2">
                <select className="!w-40 !py-1" value={p.status} onChange={e => updatePhase(p.id, { status: e.target.value })}>
                  {STATUSES.map(x => <option key={x}>{x}</option>)}
                </select>
                <button className="text-xs text-rose-500" onClick={() => deletePhase(p.id)}>Delete Phase</button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2 text-xs mt-2">
            <DateField label="Planned Start" value={p.planned_start} onChange={v => updatePhase(p.id, { planned_start: v })} />
            <DateField label="Planned End" value={p.planned_end} onChange={v => updatePhase(p.id, { planned_end: v })} />
            <DateField label="Actual Start" value={p.actual_start} onChange={v => updatePhase(p.id, { actual_start: v })} />
            <DateField label="Actual End" value={p.actual_end} onChange={v => updatePhase(p.id, { actual_end: v })} />
          </div>
          <div className="mt-2"><label>Comments</label><textarea defaultValue={p.comments} onBlur={e => updatePhase(p.id, { comments: e.target.value })} /></div>
          <FileList entityType="phase" entityId={p.id} canEdit={canEdit} />
          {(p.tasks || []).map(t => (
            <TaskRow key={t.id} t={t} canEdit={canEdit}
              onUpdateTask={fields => updateTask(t.id, fields)}
              onDeleteTask={() => deleteTask(t.id)}
              onAddSubtask={addSubtask}
              onUpdateSubtask={updateSubtask}
              onDeleteSubtask={deleteSubtask} />
          ))}
          {canEdit && <button className="ml-6 mt-2 text-xs text-brand font-semibold" onClick={() => addTask(p.id)}>+ Task</button>}
        </div>
      ))}
    </div>
  )
}
