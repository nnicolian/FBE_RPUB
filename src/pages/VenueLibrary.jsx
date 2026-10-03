import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { hasFullContentAccess } from '../lib/roles'
import { JOURNAL_FIELDS, quartileTarget, absTarget, isScopus } from '../lib/journals'
import { scimagoSearch, scholarJournal, scholarMetrics, SCOPUS_SOURCES, ABS_GUIDE } from '../lib/journalLinks'
import PageHeader from '../components/PageHeader'
import VenuesFull from './Admin/VenuesFull'
import { Check, ExternalLink, Landmark, Pencil } from 'lucide-react'

// Venue Library: every journal / conference in SAIP-Rpub with its quality ratings and quick links to
// Google Scholar, Scimago, Scopus and the ABS guide. The Research Coordinator and Admin maintain it.

const QUARTILES = ['Q1', 'Q2', 'Q3', 'Q4', 'Conference']
const absNum = abs => Number((String(abs || '').match(/[1-4]/) || [0])[0])

export default function VenueLibrary() {
  const { profile } = useAuth()
  const canEdit = hasFullContentAccess(profile)
  const [venues, setVenues] = useState([])
  const [manage, setManage] = useState(false)
  const [f, setF] = useState({ q: '', field: '', quality: '', absMin: 0, scopus: false })

  useEffect(() => { if (!manage) load() }, [manage])
  async function load() {
    const { data } = await supabase.from('venues').select('*').eq('active', true).order('name')
    setVenues(data || [])
  }
  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const shown = venues.filter(v =>
    (!f.q || `${v.name} ${v.full_name} ${v.publisher}`.toLowerCase().includes(f.q.toLowerCase())) &&
    (!f.field || v.field === f.field) && (!f.quality || v.quality === f.quality) &&
    (!f.absMin || absNum(v.abs) >= f.absMin) && (!f.scopus || isScopus(v)))

  const L = ({ href, children }) => <a className="inline-flex items-center gap-1 text-xs text-accent-700 hover:underline whitespace-nowrap" href={href} target="_blank" rel="noreferrer">{children}<ExternalLink className="h-3 w-3" /></a>

  return (
    <div className="space-y-4">
      <PageHeader icon={Landmark} title="Venue Library" subtitle="Journals and conferences with their Scopus status, SJR quartile and ABS rating — and links to check them on Google Scholar, Scimago, Scopus and the ABS guide."
        action={canEdit && <button className="btn btn-soft" onClick={() => setManage(m => !m)}>{manage ? 'Back to the library' : <><Pencil className="h-3.5 w-3.5" /> Manage venues</>}</button>} />

      {manage ? <VenuesFull /> : (
        <>
          <div className="card flex flex-wrap gap-3 items-center">
            <input className="!w-64" placeholder="Search a journal or publisher…" value={f.q} onChange={e => set('q', e.target.value)} />
            <select className="!w-60" value={f.field} onChange={e => set('field', e.target.value)}>
              <option value="">All fields</option>{JOURNAL_FIELDS.map(x => <option key={x}>{x}</option>)}
            </select>
            <select className="!w-36" value={f.quality} onChange={e => set('quality', e.target.value)}>
              <option value="">Any quartile</option>{QUARTILES.map(x => <option key={x}>{x}</option>)}
            </select>
            <select className="!w-36" value={f.absMin} onChange={e => set('absMin', Number(e.target.value))}>
              <option value={0}>Any ABS</option>{[1, 2, 3, 4].map(n => <option key={n} value={n}>ABS {n}+</option>)}
            </select>
            <label className="!mb-0 flex items-center gap-2 text-sm font-normal"><input type="checkbox" className="!w-auto" checked={f.scopus} onChange={e => set('scopus', e.target.checked)} /> Scopus-indexed only</label>
            <span className="text-xs text-slate-400 ml-auto">{shown.length} of {venues.length}</span>
          </div>

          <div className="card overflow-x-auto">
            <table>
              <thead><tr><th>Venue</th><th>Field</th><th>Scopus</th><th>SJR quartile</th><th>ABS</th><th>Check it on</th></tr></thead>
              <tbody>
                {shown.map(v => {
                  const q = quartileTarget(v.quality), a = absTarget(v.abs), name = v.full_name || v.name
                  return (
                    <tr key={v.id}>
                      <td className="font-semibold">{v.name}{v.full_name && v.full_name !== v.name && <div className="text-xs text-slate-400 font-normal">{v.full_name}</div>}{v.publisher && <div className="text-xs text-slate-400 font-normal">{v.publisher}</div>}</td>
                      <td className="text-xs">{v.field || '—'}</td>
                      <td>{isScopus(v) ? <Check className="h-4 w-4 text-success-600 inline" /> : <span className="text-xs text-slate-400">{v.indexing || '—'}</span>}</td>
                      <td>{v.quality || '—'}{q && <div className="text-xs text-slate-400">{q.label}</div>}</td>
                      <td>{v.abs || '—'}{a && <div className="text-xs text-slate-400">{a.label}</div>}</td>
                      <td>
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          <L href={scholarJournal(name)}>Google Scholar</L>
                          <L href={scholarMetrics(name)}>Scholar Metrics</L>
                          <L href={scimagoSearch(name)}>Scimago</L>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {shown.length === 0 && <tr><td colSpan={6} className="text-center text-slate-400 py-6">No venues match.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="card text-xs text-slate-500 flex flex-wrap gap-4 items-center">
            <span>Also useful:</span>
            <L href={SCOPUS_SOURCES}>Scopus Sources</L>
            <L href={ABS_GUIDE}>ABS Academic Journal Guide</L>
            <L href="https://scholar.google.com/citations?view_op=top_venues&vq=bus">Google Scholar top business venues</L>
            <span>Rankings change yearly — verify before submitting.</span>
          </div>
        </>
      )}
    </div>
  )
}
