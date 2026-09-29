import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useToast } from '../context/ToastContext'
import PageHeader from '../components/PageHeader'
import { PT_STATUSES } from '../lib/workOptions'

// Part-Time Faculty Engagement (Research Strategy §4): survey responses → suggested
// full-time matches → introduction → collaboration. Admin and Research Coordinator only.

const statusTone = s => ({ New: 'badge-amber', 'Match proposed': 'badge-purple', Introduced: 'badge-purple', Collaborating: 'badge-green', 'Not now': 'badge-gray' }[s] || 'badge-gray')

function Answer({ label, value }) {
  const v = Array.isArray(value) ? value.join('; ') : value
  if (!v) return null
  return <div><div className="text-xs text-slate-400">{label}</div><div className="text-sm">{v}</div></div>
}

function ResponseCard({ r, researchers, onSaved }) {
  const { showToast } = useToast()
  const [open, setOpen] = useState(false)
  const [d, setD] = useState({ status: r.status, matched_researcher: r.matched_researcher || '', coordinator_notes: r.coordinator_notes || '' })

  const fullTime = researchers.filter(x => x.type === 'Internal')
  const matches = fullTime
    .map(x => ({ ...x, overlap: (x.research_areas || []).filter(a => (r.research_areas || []).includes(a)) }))
    .filter(x => x.overlap.length)
    .sort((a, b) => b.overlap.length - a.overlap.length)
  const inResearchers = r.researcher_id || researchers.some(x => (x.email || '').toLowerCase() === r.email.toLowerCase())

  async function save() {
    const { error } = await supabase.from('pt_survey_responses').update(d).eq('id', r.id)
    showToast(error ? `Could not save: ${error.message}` : 'Saved', error ? 'error' : 'success')
    if (!error) onSaved()
  }
  async function addResearcher() {
    const { data, error } = await supabase.from('researchers').insert({
      name: r.full_name, email: r.email, type: 'Part-time', department: r.department || '',
      research_areas: r.research_areas || [], active: true
    }).select().single()
    if (error) { showToast(`Could not add: ${error.message}`, 'error'); return }
    await supabase.from('pt_survey_responses').update({ researcher_id: data.id }).eq('id', r.id)
    showToast(`${r.full_name} added to researchers — they can now be named as a co-author`)
    onSaved()
  }

  return (
    <div className="border border-slate-200 rounded-lg p-3 bg-white">
      <div className="flex justify-between items-start gap-3">
        <button className="text-left" onClick={() => setOpen(o => !o)}>
          <div className="font-semibold">{open ? '▾' : '▸'} {r.full_name} <span className="text-xs font-normal text-slate-400">· {r.department || 'Department not given'}</span></div>
          <div className="text-xs text-slate-500 ml-4">{(r.research_areas || []).join(' · ') || 'No areas selected'}{r.hours_per_week ? ` · ${r.hours_per_week}/week` : ''}</div>
        </button>
        <div className="flex items-center gap-2 shrink-0">
          {r.matched_researcher && <span className="text-xs text-slate-500">↔ {r.matched_researcher}</span>}
          <span className={`badge ${statusTone(r.status)}`}>{r.status}</span>
        </div>
      </div>
      {open && (
        <div className="mt-3 ml-4 space-y-3">
          <div className="grid md:grid-cols-3 gap-3">
            <Answer label="Email" value={r.email} /><Answer label="Phone / WhatsApp" value={r.phone} />
            <Answer label="Qualification" value={r.qualification} /><Answer label="Teaching at AUST" value={r.semesters_teaching} />
            <Answer label="Published in past 5 years" value={r.published_recently} /><Answer label="Publications" value={r.publication_count} />
            <Answer label="Currently researching" value={r.currently_researching} /><Answer label="Experience" value={r.experience} />
            <Answer label="Approach" value={r.approach} /><Answer label="Semesters" value={r.semesters} />
            <Answer label="Comfortable contributing" value={r.contributions} /><Answer label="Wants a match" value={r.wants_match} />
            <Answer label="Colleague / topic in mind" value={r.colleague_in_mind} /><Answer label="Other area" value={r.other_area} />
            <Answer label="Interested in" value={r.interested_activities} />
          </div>
          <Answer label="Topics" value={r.topics} />
          <Answer label="Current work" value={r.current_work} />
          <Answer label="Anything else" value={r.anything_else} />

          <div className="note text-xs">
            <strong>Suggested full-time matches</strong> (shared research areas):{' '}
            {matches.length ? matches.slice(0, 5).map(m => `${m.name} (${m.overlap.length})`).join(', ')
              : 'none yet — add research areas to full-time researchers in Configuration → Researchers.'}
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <div><label>Status</label><select value={d.status} onChange={e => setD(x => ({ ...x, status: e.target.value }))}>{PT_STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
            <div>
              <label>Matched with</label>
              <select value={d.matched_researcher} onChange={e => setD(x => ({ ...x, matched_researcher: e.target.value }))}>
                <option value="">—</option>
                {matches.map(m => <option key={m.name} value={m.name}>{m.name} · {m.overlap.length} shared</option>)}
                {fullTime.filter(x => !matches.some(m => m.name === x.name)).map(x => <option key={x.name} value={x.name}>{x.name}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              {inResearchers ? <span className="text-xs text-emerald-700">✓ In the researcher list</span>
                : <button className="btn btn-soft" onClick={addResearcher}>+ Add to researchers</button>}
            </div>
          </div>
          <div><label>Coordinator notes (contribution agreed, follow-ups)</label><textarea rows={2} value={d.coordinator_notes} onChange={e => setD(x => ({ ...x, coordinator_notes: e.target.value }))} /></div>
          <button className="btn btn-blue" onClick={save}>Save</button>
        </div>
      )}
    </div>
  )
}

export default function PartTime() {
  const { showToast } = useToast()
  const [rows, setRows] = useState([])
  const [researchers, setResearchers] = useState([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const surveyUrl = `${window.location.origin}/survey`

  useEffect(() => { load() }, [])
  async function load() {
    const [{ data: r }, { data: x }] = await Promise.all([
      supabase.from('pt_survey_responses').select('*').order('submitted_at', { ascending: false }),
      supabase.from('researchers').select('*').eq('active', true).order('name')
    ])
    setRows(r || []); setResearchers(x || []); setLoading(false)
  }

  const shown = rows.filter(r => !filter || r.status === filter)

  return (
    <div className="space-y-4">
      <PageHeader icon="🤝" title="Part-Time Faculty" subtitle="Research interest survey, suggested co-author matches and collaboration follow-up." />

      <div className="card space-y-2">
        <h3 className="font-bold">Survey link</h3>
        <p className="text-xs text-slate-500">Send this link to part-time faculty at the start of the year (September). No sign-in needed; only you and the Admin see responses.</p>
        <div className="flex gap-2">
          <input readOnly value={surveyUrl} onFocus={e => e.target.select()} />
          <button className="btn btn-soft whitespace-nowrap" onClick={() => { navigator.clipboard?.writeText(surveyUrl); showToast('Link copied') }}>Copy link</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {PT_STATUSES.map(s => (
          <button key={s} onClick={() => setFilter(f => f === s ? '' : s)}
            className={`card text-left ${filter === s ? 'ring-2 ring-brand' : ''}`}>
            <b className="text-2xl block">{rows.filter(r => r.status === s).length}</b>
            <span className="text-xs text-slate-400">{s}</span>
          </button>
        ))}
      </div>

      <div className="card space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="font-bold">Responses{filter ? ` · ${filter}` : ''}</h3>
          {filter && <button className="text-xs text-brand underline" onClick={() => setFilter('')}>show all</button>}
        </div>
        {loading ? <p className="text-sm text-slate-400">Loading…</p>
          : shown.length === 0 ? <p className="text-sm text-slate-400">No responses yet.</p>
          : shown.map(r => <ResponseCard key={r.id} r={r} researchers={researchers} onSaved={load} />)}
      </div>
    </div>
  )
}
