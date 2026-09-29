import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { hasFullContentAccess } from '../lib/roles'
import PageHeader from '../components/PageHeader'
import PipelineSummary from '../components/PipelineSummary'

// FBE Research Committee (Research Strategy §1, Appendix 4): advisory and facilitative,
// meets monthly (September–June), keeps a brief record of decisions and action items,
// reports to the Dean quarterly and annually. Admin and Coordinator write; the Dean reads.

const today = () => new Date().toISOString().slice(0, 10)
const ACTION_STATUSES = ['Open', 'In progress', 'Done', 'Dropped']
const EMPTY_MEETING = { meeting_date: today(), title: 'Monthly meeting', attendees: '', notes: '', decisions: '' }

function Meeting({ m, actions, canEdit, onChanged }) {
  const { showToast } = useToast()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [d, setD] = useState(m)
  const [a, setA] = useState({ action: '', owner: '', due: '' })

  async function save() {
    const { id, created_at, ...row } = d
    const { error } = await supabase.from('committee_meetings').update(row).eq('id', m.id)
    showToast(error ? `Could not save: ${error.message}` : 'Saved', error ? 'error' : 'success')
    if (!error) { setEditing(false); onChanged() }
  }
  async function addAction() {
    if (!a.action.trim()) return
    const { error } = await supabase.from('committee_actions').insert({ meeting_id: m.id, action: a.action.trim(), owner: a.owner, due: a.due || null })
    if (!error) { setA({ action: '', owner: '', due: '' }); onChanged() }
  }
  async function remove() {
    if (!confirm('Delete this meeting record? Its action items are kept.')) return
    await supabase.from('committee_meetings').delete().eq('id', m.id); onChanged()
  }

  return (
    <div className="border border-slate-200 rounded-lg p-3 bg-white">
      <div className="flex justify-between gap-3">
        <button className="text-left font-semibold" onClick={() => setOpen(o => !o)}>{open ? '▾' : '▸'} {m.meeting_date} · {m.title}</button>
        <span className="text-xs text-slate-400">{actions.filter(x => x.status !== 'Done' && x.status !== 'Dropped').length} open actions</span>
      </div>
      {open && (
        <div className="mt-3 space-y-3">
          {editing ? (
            <div className="space-y-2">
              <div className="grid md:grid-cols-3 gap-2">
                <div><label>Date</label><input type="date" value={d.meeting_date} onChange={e => setD(x => ({ ...x, meeting_date: e.target.value }))} /></div>
                <div><label>Title</label><input value={d.title} onChange={e => setD(x => ({ ...x, title: e.target.value }))} /></div>
                <div><label>Attendees</label><input value={d.attendees} onChange={e => setD(x => ({ ...x, attendees: e.target.value }))} /></div>
              </div>
              <div><label>Discussion notes</label><textarea rows={3} value={d.notes} onChange={e => setD(x => ({ ...x, notes: e.target.value }))} /></div>
              <div><label>Decisions</label><textarea rows={3} value={d.decisions} onChange={e => setD(x => ({ ...x, decisions: e.target.value }))} /></div>
              <div className="flex gap-2"><button className="btn btn-blue" onClick={save}>Save</button><button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button></div>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              {m.attendees && <div><span className="text-xs text-slate-400">Attendees:</span> {m.attendees}</div>}
              {m.notes && <div className="whitespace-pre-wrap"><div className="text-xs text-slate-400">Notes</div>{m.notes}</div>}
              {m.decisions && <div className="note whitespace-pre-wrap"><strong>Decisions:</strong> {m.decisions}</div>}
              {canEdit && <div className="flex gap-3"><button className="btn btn-ghost !py-1 !px-2 text-xs" onClick={() => { setD(m); setEditing(true) }}>✎ Edit</button><button className="text-xs text-rose-500" onClick={remove}>Delete</button></div>}
            </div>
          )}
          {canEdit && (
            <div className="grid md:grid-cols-6 gap-2 items-end">
              <div className="md:col-span-3"><label>New action item</label><input value={a.action} onChange={e => setA(x => ({ ...x, action: e.target.value }))} /></div>
              <div><label>Owner</label><input value={a.owner} onChange={e => setA(x => ({ ...x, owner: e.target.value }))} /></div>
              <div><label>Due</label><input type="date" value={a.due} onChange={e => setA(x => ({ ...x, due: e.target.value }))} /></div>
              <button className="btn btn-soft" onClick={addAction}>+ Action</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Committee() {
  const { profile } = useAuth()
  const canEdit = hasFullContentAccess(profile)
  const [meetings, setMeetings] = useState([])
  const [actions, setActions] = useState([])
  const [members, setMembers] = useState([])
  const [adding, setAdding] = useState(false)
  const [nm, setNm] = useState(EMPTY_MEETING)
  const [report, setReport] = useState('')
  const [showDone, setShowDone] = useState(false)

  useEffect(() => { load() }, [])
  async function load() {
    const [{ data: m }, { data: a }, { data: mem }] = await Promise.all([
      supabase.from('committee_meetings').select('*').order('meeting_date', { ascending: false }),
      supabase.from('committee_actions').select('*').order('due', { ascending: true, nullsFirst: false }),
      supabase.from('committee_members').select('*').eq('active', true)
    ])
    setMeetings(m || []); setActions(a || []); setMembers(mem || [])
  }
  async function addMeeting() {
    const { error } = await supabase.from('committee_meetings').insert(nm)
    if (!error) { setAdding(false); setNm(EMPTY_MEETING); load() }
  }
  async function setStatus(id, status) {
    await supabase.from('committee_actions').update({ status }).eq('id', id); load()
  }

  const openActions = actions.filter(a => showDone || !['Done', 'Dropped'].includes(a.status))
  const overdue = a => a.due && a.due < today() && !['Done', 'Dropped'].includes(a.status)

  const committeeExtra = (
    <div className="card">
      <h3 className="font-bold mb-2">Committee activity</h3>
      <p className="text-sm">{meetings.length} meeting{meetings.length === 1 ? '' : 's'} recorded · {actions.filter(a => a.status === 'Done').length} actions completed · {actions.filter(a => !['Done', 'Dropped'].includes(a.status)).length} open</p>
      {meetings.slice(0, 3).map(m => m.decisions && <div key={m.id} className="text-sm mt-2"><strong>{m.meeting_date}:</strong> {m.decisions}</div>)}
    </div>
  )

  return (
    <div className="space-y-4">
      <PageHeader icon="🏛️" title="Research Committee" subtitle="Monthly meetings, decisions, action items and reports to the Dean." />

      <div className="grid md:grid-cols-3 gap-4 print:hidden">
        <div className="card md:col-span-2 text-sm space-y-1">
          <h3 className="font-bold">Terms of reference (summary)</h3>
          <p>Advisory and facilitative — not managerial. Chaired by the Research Coordinator, with a nominated Faculty Representative; the Dean is ex-officio with final approval authority.</p>
          <p>Meets monthly, September–June; decisions by consensus, escalated to the Dean if needed. Quarterly progress report and an annual report in June.</p>
        </div>
        <div className="card text-sm">
          <h3 className="font-bold mb-1">Members</h3>
          {members.length === 0 ? <p className="text-slate-400">Add members in Configuration → Committee.</p> : members.map(m => <div key={m.id}>{m.name} <span className="text-slate-400">· {m.role}</span></div>)}
        </div>
      </div>

      <div className="card space-y-2 print:hidden">
        <div className="flex justify-between items-center">
          <h3 className="font-bold">Action items</h3>
          <label className="!mb-0 flex items-center gap-2 text-xs font-normal"><input type="checkbox" className="!w-auto" checked={showDone} onChange={e => setShowDone(e.target.checked)} /> Show completed</label>
        </div>
        {openActions.length === 0 ? <p className="text-sm text-slate-400">No open action items.</p> : (
          <table>
            <thead><tr><th>Action</th><th>Owner</th><th>Due</th><th>From meeting</th><th>Status</th></tr></thead>
            <tbody>
              {openActions.map(a => (
                <tr key={a.id}>
                  <td className="text-sm">{a.action}</td><td>{a.owner || '—'}</td>
                  <td className={overdue(a) ? 'text-rose-600 font-semibold' : ''}>{a.due || '—'}</td>
                  <td className="text-xs">{meetings.find(m => m.id === a.meeting_id)?.meeting_date || '—'}</td>
                  <td>{canEdit ? <select className="!py-1" value={a.status} onChange={e => setStatus(a.id, e.target.value)}>{ACTION_STATUSES.map(s => <option key={s}>{s}</option>)}</select> : a.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card space-y-2 print:hidden">
        <div className="flex justify-between items-center">
          <h3 className="font-bold">Meetings</h3>
          {canEdit && !adding && <button className="btn btn-soft" onClick={() => setAdding(true)}>+ Meeting</button>}
        </div>
        {adding && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
            <div className="grid md:grid-cols-3 gap-2">
              <div><label>Date</label><input type="date" value={nm.meeting_date} onChange={e => setNm(x => ({ ...x, meeting_date: e.target.value }))} /></div>
              <div><label>Title</label><input value={nm.title} onChange={e => setNm(x => ({ ...x, title: e.target.value }))} /></div>
              <div><label>Attendees</label><input value={nm.attendees} onChange={e => setNm(x => ({ ...x, attendees: e.target.value }))} /></div>
            </div>
            <div><label>Discussion notes</label><textarea rows={2} value={nm.notes} onChange={e => setNm(x => ({ ...x, notes: e.target.value }))} /></div>
            <div><label>Decisions</label><textarea rows={2} value={nm.decisions} onChange={e => setNm(x => ({ ...x, decisions: e.target.value }))} /></div>
            <div className="flex gap-2"><button className="btn btn-blue" onClick={addMeeting}>Save meeting</button><button className="btn btn-ghost" onClick={() => setAdding(false)}>Cancel</button></div>
          </div>
        )}
        {meetings.length === 0 ? <p className="text-sm text-slate-400">No meetings recorded yet.</p>
          : meetings.map(m => <Meeting key={m.id} m={m} actions={actions.filter(a => a.meeting_id === m.id)} canEdit={canEdit} onChanged={load} />)}
      </div>

      <div className="card flex flex-wrap items-center gap-3 print:hidden">
        <strong className="text-sm">Reports to the Dean:</strong>
        <button className={`btn ${report === 'quarterly' ? 'btn-blue' : 'btn-soft'}`} onClick={() => setReport(r => r === 'quarterly' ? '' : 'quarterly')}>Quarterly progress report</button>
        <button className={`btn ${report === 'annual' ? 'btn-blue' : 'btn-soft'}`} onClick={() => setReport(r => r === 'annual' ? '' : 'annual')}>Annual report (June)</button>
      </div>
      {report && <PipelineSummary type={report} extra={committeeExtra} />}
    </div>
  )
}
