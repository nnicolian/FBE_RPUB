import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { useToast } from '../../../context/ToastContext'

// Personalised reference extract (Appendix 3): entries from the shared library attached to
// this paper, ready to use in the literature review (sub-tasks 1.1 and 2.1).

export default function ReferencesTab({ work, canEdit }) {
  const { showToast } = useToast()
  const [library, setLibrary] = useState([])
  const [attached, setAttached] = useState([])
  const [q, setQ] = useState('')

  useEffect(() => { load() }, [work.id])
  async function load() {
    const [{ data: lib }, { data: wt }] = await Promise.all([
      supabase.from('research_themes').select('*').order('theory').order('theme'),
      supabase.from('work_themes').select('theme_id').eq('work_id', work.id)
    ])
    setLibrary(lib || []); setAttached((wt || []).map(x => x.theme_id))
  }
  async function add(id) {
    const { error } = await supabase.from('work_themes').insert({ work_id: work.id, theme_id: id })
    if (error) showToast(`Could not add: ${error.message}`, 'error'); else setAttached(a => [...a, id])
  }
  async function remove(id) {
    await supabase.from('work_themes').delete().eq('work_id', work.id).eq('theme_id', id)
    setAttached(a => a.filter(x => x !== id))
  }

  const mine = library.filter(r => attached.includes(r.id))
  const refs = [...new Set(mine.map(r => r.reference).filter(Boolean))].sort()
  const results = q.length < 2 ? [] : library.filter(r => !attached.includes(r.id) &&
    ['theory', 'theme', 'definition', 'reference'].some(c => (r[c] || '').toLowerCase().includes(q.toLowerCase()))).slice(0, 20)

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold">Reference extract for this paper</h3>
          {refs.length > 0 && <button className="btn btn-soft" onClick={() => { navigator.clipboard?.writeText(refs.join('\n\n')); showToast(`${refs.length} references copied (APA)`) }}>Copy all references</button>}
        </div>
        {mine.length === 0 ? <p className="text-sm text-slate-400">No entries attached yet.{canEdit && ' Search the library below to add themes and references.'}</p> : (
          <div className="space-y-2">
            {mine.map(r => (
              <div key={r.id} className="border border-slate-200 rounded-lg p-3">
                <div className="flex justify-between gap-2">
                  <strong className="text-sm">{r.theory ? `${r.theory} — ` : ''}{r.theme}</strong>
                  {canEdit && <button className="text-xs text-rose-500 shrink-0" onClick={() => remove(r.id)}>Remove</button>}
                </div>
                {r.definition && <p className="text-sm text-slate-700 mt-1">{r.definition}</p>}
                {r.reference && <p className="text-xs text-slate-500 mt-1">{r.reference}</p>}
                {r.link && <a className="text-xs text-brand underline break-all" href={r.link} target="_blank" rel="noreferrer">{r.link}</a>}
              </div>
            ))}
          </div>
        )}
      </div>

      {canEdit && (
        <div className="card space-y-2">
          <h3 className="font-bold">Add from the References Library</h3>
          <input placeholder="Search a theory, theme or author (2+ letters)…" value={q} onChange={e => setQ(e.target.value)} />
          {results.map(r => (
            <div key={r.id} className="flex justify-between items-start gap-3 border-b border-slate-100 py-2">
              <div><div className="text-sm font-semibold">{r.theory ? `${r.theory} — ` : ''}{r.theme}</div><div className="text-xs text-slate-500">{r.reference}</div></div>
              <button className="btn btn-soft !py-1 !px-2 text-xs shrink-0" onClick={() => add(r.id)}>+ Add</button>
            </div>
          ))}
          {q.length >= 2 && results.length === 0 && <p className="text-sm text-slate-400">No matching entries. Ask the Research Coordinator to add sources for your topic.</p>}
        </div>
      )}
    </div>
  )
}
