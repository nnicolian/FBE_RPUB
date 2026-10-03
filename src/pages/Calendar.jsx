import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { hasFullContentAccess } from '../lib/roles'
import PageHeader from '../components/PageHeader'
import { BarChart3, CalendarDays, Landmark, Mic, Newspaper, PenLine, Pin, Star, Wrench, X } from 'lucide-react'

// Faculty Research Calendar (Research Strategy, Appendix 8): the month-by-month coordination
// checklist plus dated activities (writing sessions, journal club, showcase…).

const MONTHS = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7]
const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July–August', 'August', 'September', 'October', 'November', 'December']
const KINDS = ['Writing session', 'Journal club', 'Research Showcase', 'Committee meeting', 'KPI review', 'Workshop', 'Other']
const KIND_ICON = { 'Writing session': PenLine, 'Journal club': Newspaper, 'Research Showcase': Mic, 'Committee meeting': Landmark, 'KPI review': BarChart3, Workshop: Wrench, Other: Pin }
const KindIcon = ({ kind }) => { const I = KIND_ICON[kind] || Pin; return <I className="h-3.5 w-3.5 inline -mt-0.5 text-accent-600" /> }
const EMPTY = { activity_date: new Date().toISOString().slice(0, 10), start_time: '', kind: 'Writing session', title: '', location: '', presenter: '', notes: '' }

export default function Calendar() {
  const { profile } = useAuth()
  const { showToast } = useToast()
  const canEdit = hasFullContentAccess(profile)
  const [year, setYear] = useState('2026–2027')
  const [years, setYears] = useState(['2026–2027'])
  const [tasks, setTasks] = useState([])
  const [acts, setActs] = useState([])
  const [adding, setAdding] = useState(false)
  const [d, setD] = useState(EMPTY)
  const nowMonth = new Date().getMonth() + 1

  useEffect(() => {
    supabase.from('academic_years').select('name').eq('active', true).order('name').then(({ data }) => data?.length && setYears(data.map(y => y.name)))
  }, [])
  useEffect(() => { load() }, [year])

  const [y1, y2] = (year.match(/\d{4}/g) || ['2026', '2027']).map(Number)
  async function load() {
    const [{ data: t }, { data: a }] = await Promise.all([
      supabase.from('calendar_tasks').select('*').eq('academic_year', year).order('month').order('seq'),
      supabase.from('research_activities').select('*').gte('activity_date', `${y1}-09-01`).lte('activity_date', `${y2}-08-31`).order('activity_date')
    ])
    setTasks(t || []); setActs(a || [])
  }

  async function toggle(t) {
    const { error } = await supabase.from('calendar_tasks').update({ done: !t.done, done_on: !t.done ? new Date().toISOString().slice(0, 10) : null }).eq('id', t.id)
    if (!error) setTasks(ts => ts.map(x => x.id === t.id ? { ...x, done: !t.done } : x))
  }
  async function addTask(month) {
    const activity = prompt(`Add a coordination task for ${MONTH_NAMES[month]}:`); if (!activity?.trim()) return
    await supabase.from('calendar_tasks').insert({ academic_year: year, month, seq: 99, activity: activity.trim() }); load()
  }
  async function saveActivity() {
    if (!d.title.trim()) { showToast('Enter a title.', 'error'); return }
    const { error } = await supabase.from('research_activities').insert({ ...d, title: d.title.trim() })
    showToast(error ? `Could not save: ${error.message}` : 'Activity added', error ? 'error' : 'success')
    if (!error) { setAdding(false); setD(EMPTY); load() }
  }
  async function removeActivity(id) {
    if (!confirm('Delete this activity?')) return
    await supabase.from('research_activities').delete().eq('id', id); load()
  }

  const monthOf = dateStr => Number(dateStr.slice(5, 7))
  const done = tasks.filter(t => t.done).length

  return (
    <div className="space-y-4">
      <PageHeader icon={CalendarDays} title="Research Calendar" subtitle="Month-by-month coordination activities and research events for the academic year."
        action={<div className="flex gap-2">
          <select className="!w-36" value={year} onChange={e => setYear(e.target.value)}>{years.map(y => <option key={y}>{y}</option>)}</select>
          {canEdit && <button className="btn btn-blue" onClick={() => setAdding(a => !a)}>+ Activity</button>}
        </div>} />

      {adding && (
        <div className="card space-y-2">
          <div className="grid md:grid-cols-4 gap-2">
            <div><label>Date</label><input type="date" value={d.activity_date} onChange={e => setD(x => ({ ...x, activity_date: e.target.value }))} /></div>
            <div><label>Time</label><input type="time" value={d.start_time} onChange={e => setD(x => ({ ...x, start_time: e.target.value }))} /></div>
            <div><label>Type</label><select value={d.kind} onChange={e => setD(x => ({ ...x, kind: e.target.value }))}>{KINDS.map(k => <option key={k}>{k}</option>)}</select></div>
            <div><label>Location</label><input value={d.location} onChange={e => setD(x => ({ ...x, location: e.target.value }))} /></div>
            <div className="md:col-span-2"><label>Title</label><input value={d.title} onChange={e => setD(x => ({ ...x, title: e.target.value }))} placeholder="e.g. Protected writing block (2 hours)" /></div>
            <div className="md:col-span-2"><label>Presenter / host</label><input value={d.presenter} onChange={e => setD(x => ({ ...x, presenter: e.target.value }))} /></div>
          </div>
          <div><label>Notes</label><input value={d.notes} onChange={e => setD(x => ({ ...x, notes: e.target.value }))} /></div>
          <div className="flex gap-2"><button className="btn btn-blue" onClick={saveActivity}>Save</button><button className="btn btn-ghost" onClick={() => setAdding(false)}>Cancel</button></div>
        </div>
      )}

      <div className="card text-sm flex flex-wrap gap-4 items-center">
        <span><b>{done}</b> of {tasks.length} coordination tasks done</span>
        <span className="text-slate-400">·</span>
        <span><b>{acts.length}</b> scheduled activities</span>
        <span className="text-xs text-slate-400">Fixed dates (committee meetings, showcase, KPI reviews) are marked with <Star className="h-3 w-3 inline -mt-0.5 fill-warning-500 text-warning-500" />; other activities are indicative.</span>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {MONTHS.map(m => {
          const mt = tasks.filter(t => t.month === m)
          const ma = acts.filter(a => m === 7 ? [7, 8].includes(monthOf(a.activity_date)) : monthOf(a.activity_date) === m)
          const current = m === nowMonth || (m === 7 && nowMonth === 8)
          return (
            <div key={m} className={`card ${current ? 'ring-2 ring-brand' : ''}`}>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold">{MONTH_NAMES[m]} <span className="text-xs text-slate-400 font-normal">{m >= 9 ? y1 : y2}</span></h3>
                {current && <span className="badge badge-purple">This month</span>}
              </div>
              <div className="space-y-1">
                {mt.map(t => (
                  <label key={t.id} className={`!mb-0 flex items-start gap-2 text-sm font-normal ${t.done ? 'text-slate-400 line-through' : ''}`}>
                    <input type="checkbox" className="!w-auto mt-1" checked={t.done} disabled={!canEdit} onChange={() => toggle(t)} />
                    <span>{t.is_fixed && <Star className="h-3.5 w-3.5 inline -mt-0.5 mr-1 fill-warning-500 text-warning-500" />}{t.activity}</span>
                  </label>
                ))}
                {canEdit && <button className="text-xs text-brand font-semibold" onClick={() => addTask(m)}>+ Task</button>}
              </div>
              {ma.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-100 space-y-1">
                  {ma.map(a => (
                    <div key={a.id} className="text-sm flex justify-between gap-2">
                      <span><KindIcon kind={a.kind} /> <b>{a.activity_date.slice(8)}/{a.activity_date.slice(5, 7)}</b>{a.start_time && ` ${a.start_time}`} · {a.title}
                        {(a.location || a.presenter) && <span className="text-xs text-slate-400"> · {[a.presenter, a.location].filter(Boolean).join(' · ')}</span>}</span>
                      {canEdit && <button className="text-xs text-rose-500 shrink-0" onClick={() => removeActivity(a.id)} aria-label="Remove"><X className="h-3.5 w-3.5" /></button>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
