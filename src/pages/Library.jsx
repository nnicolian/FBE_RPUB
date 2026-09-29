import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { hasFullContentAccess } from '../lib/roles'
import PageHeader from '../components/PageHeader'

// Master Themes, Definitions & References Table (Research Strategy §2, Appendix 3).
// Everyone can search it; the Research Coordinator and Admin maintain it.

const EMPTY = { theory: '', theme: '', definition: '', reference: '', link: '', source_quality: '' }
const COLS = ['theory', 'theme', 'definition', 'reference', 'link']

// Paste from Excel (tab-separated) or CSV: Theory | Theme | Definition | Reference | Link.
// Blank theory cells inherit the one above (Appendix 3 merges theory cells).
function parseRows(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  const sep = lines.some(l => l.includes('\t')) ? '\t' : ','
  const split = l => sep === '\t' ? l.split('\t') : (l.match(/("([^"]|"")*"|[^,]*)(,|$)/g) || []).map(c => c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"'))
  let theory = ''
  const out = []
  for (const [i, l] of lines.entries()) {
    const c = split(l).map(x => (x || '').trim())
    if (i === 0 && /theor/i.test(c[0]) && /theme/i.test(c[1] || '')) continue // header row
    if (c[0]) theory = c[0]
    if (!c[1]) continue
    out.push({ theory, theme: c[1], definition: c[2] || '', reference: c[3] || '', link: c[4] || '' })
  }
  return out
}

export default function Library() {
  const { profile } = useAuth()
  const { showToast } = useToast()
  const canEdit = hasFullContentAccess(profile)
  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [theory, setTheory] = useState('')
  const [editing, setEditing] = useState(null)
  const [d, setD] = useState(EMPTY)
  const [importing, setImporting] = useState(false)
  const [paste, setPaste] = useState('')

  useEffect(() => { load() }, [])
  async function load() {
    const { data } = await supabase.from('research_themes').select('*').order('theory').order('theme')
    setRows(data || [])
  }

  async function save() {
    if (!d.theme.trim()) { showToast('Enter the theme.', 'error'); return }
    const { id, created_at, ...row } = d
    const { error } = editing === 'new' ? await supabase.from('research_themes').insert(row) : await supabase.from('research_themes').update(row).eq('id', editing)
    showToast(error ? `Could not save: ${error.message}` : 'Saved', error ? 'error' : 'success')
    if (!error) { setEditing(null); load() }
  }
  async function remove(id) {
    if (!confirm('Delete this entry? It will also be removed from any paper it is attached to.')) return
    await supabase.from('research_themes').delete().eq('id', id); load()
  }
  async function doImport() {
    const parsed = parseRows(paste)
    if (!parsed.length) { showToast('Nothing to import — paste rows with at least a Theory and Theme column.', 'error'); return }
    const { error } = await supabase.from('research_themes').insert(parsed)
    showToast(error ? `Import failed: ${error.message}` : `Imported ${parsed.length} entr${parsed.length === 1 ? 'y' : 'ies'}`, error ? 'error' : 'success')
    if (!error) { setPaste(''); setImporting(false); load() }
  }

  const theories = [...new Set(rows.map(r => r.theory || 'Core framework'))].sort()
  const shown = rows.filter(r => (!theory || (r.theory || 'Core framework') === theory) &&
    (!q || COLS.some(c => (r[c] || '').toLowerCase().includes(q.toLowerCase()))))
  const grouped = shown.reduce((m, r) => { const k = r.theory || 'Core framework'; (m[k] ||= []).push(r); return m }, {})

  return (
    <div className="space-y-4">
      <PageHeader icon="📖" title="References Library" subtitle="Master themes, working definitions and vetted references to ground the literature review (Phases 1–2)."
        action={canEdit && (
          <div className="flex gap-2">
            <button className="btn btn-soft" onClick={() => setImporting(i => !i)}>⇪ Import rows</button>
            <button className="btn btn-blue" onClick={() => { setD(EMPTY); setEditing('new') }}>+ Entry</button>
          </div>
        )} />

      {importing && (
        <div className="card space-y-2">
          <h3 className="font-bold">Import from the Master Table</h3>
          <p className="text-xs text-slate-500">Copy rows from the Excel Themes worksheet (columns: Theory, Theme, Definition, Reference, Link) and paste them below. Blank Theory cells take the theory above.</p>
          <textarea rows={8} value={paste} onChange={e => setPaste(e.target.value)} placeholder={'Agency Theory\tInformation Asymmetry\t"…definition…"\tBergh, D. D. … (2018) …\thttps://doi.org/…'} />
          <p className="text-xs text-slate-400">{paste ? `${parseRows(paste).length} rows detected` : ''}</p>
          <div className="flex gap-2"><button className="btn btn-blue" onClick={doImport}>Import</button><button className="btn btn-ghost" onClick={() => setImporting(false)}>Cancel</button></div>
        </div>
      )}

      {editing && (
        <div className="card space-y-2">
          <div className="grid md:grid-cols-2 gap-3">
            <div><label>Theory</label><input list="theory-list" value={d.theory} onChange={e => setD(x => ({ ...x, theory: e.target.value }))} /><datalist id="theory-list">{theories.map(t => <option key={t} value={t} />)}</datalist></div>
            <div><label>Theme</label><input value={d.theme} onChange={e => setD(x => ({ ...x, theme: e.target.value }))} /></div>
          </div>
          <div><label>Working definition</label><textarea rows={3} value={d.definition} onChange={e => setD(x => ({ ...x, definition: e.target.value }))} /></div>
          <div><label>Reference (APA)</label><textarea rows={2} value={d.reference} onChange={e => setD(x => ({ ...x, reference: e.target.value }))} /></div>
          <div className="grid md:grid-cols-2 gap-3">
            <div><label>DOI / link</label><input value={d.link} onChange={e => setD(x => ({ ...x, link: e.target.value }))} /></div>
            <div><label>Source quality (Scopus / ABS)</label><input value={d.source_quality} onChange={e => setD(x => ({ ...x, source_quality: e.target.value }))} placeholder="e.g. Scopus Q1 · ABS 4*" /></div>
          </div>
          <div className="flex gap-2"><button className="btn btn-blue" onClick={save}>Save</button><button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button></div>
        </div>
      )}

      <div className="card flex flex-wrap gap-3 items-center">
        <input className="!w-72" placeholder="Search themes, definitions, authors…" value={q} onChange={e => setQ(e.target.value)} />
        <select className="!w-64" value={theory} onChange={e => setTheory(e.target.value)}>
          <option value="">All theories ({rows.length} entries)</option>
          {theories.map(t => <option key={t}>{t}</option>)}
        </select>
        <span className="text-xs text-slate-400">Want a personalised extract for your paper? Open the paper → References tab.</span>
      </div>

      {Object.keys(grouped).length === 0 && <div className="card text-sm text-slate-400">No entries match.</div>}
      {Object.entries(grouped).map(([t, list]) => (
        <div key={t} className="card">
          <h3 className="font-bold mb-2">{t}</h3>
          <div className="space-y-2">
            {list.map(r => (
              <div key={r.id} className="border border-slate-200 rounded-lg p-3">
                <div className="flex justify-between gap-3">
                  <strong className="text-sm">{r.theme}</strong>
                  <div className="flex gap-2 shrink-0 text-xs">
                    {r.source_quality && <span className="badge badge-gray">{r.source_quality}</span>}
                    <button className="text-brand" onClick={() => { navigator.clipboard?.writeText(r.reference); showToast('Reference copied') }}>Copy reference</button>
                    {canEdit && <button className="text-brand" onClick={() => { setD({ ...EMPTY, ...r }); setEditing(r.id) }}>Edit</button>}
                    {canEdit && <button className="text-rose-500" onClick={() => remove(r.id)}>Delete</button>}
                  </div>
                </div>
                {r.definition && <p className="text-sm text-slate-700 mt-1">{r.definition}</p>}
                {r.reference && <p className="text-xs text-slate-500 mt-1">{r.reference}</p>}
                {r.link && <a className="text-xs text-brand underline break-all" href={r.link} target="_blank" rel="noreferrer">{r.link}</a>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
