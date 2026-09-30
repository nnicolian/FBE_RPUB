import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { hasFullContentAccess } from '../lib/roles'
import { Markdown } from '../lib/markdown'
import { scimagoSearch, SCOPUS_SOURCES, ABS_GUIDE } from '../lib/journalLinks'
import FileList from '../components/FileList'
import PageHeader from '../components/PageHeader'

// Tools, Resources & Techniques (Research Strategy §2): external tools, the strategy
// documents, the journal targeting list, and original files shared by the Coordinator.

const RESOURCE_FILES_ID = '00000000-0000-0000-0000-00000000f11e' // fixed id for files attached to this page

const TOOLS = [
  { icon: '📊', name: 'Scimago Journal Rank (SJR)', what: 'Free tool for finding Scopus-indexed journals by field, quartile (Q1–Q4) and h-index.', when: 'Choosing and verifying a target journal (sub-task 1.2).', links: [['Open Scimago', 'https://www.scimagojr.com/']] },
  { icon: '🔎', name: 'Scopus Sources', what: 'The authoritative list of Scopus-indexed journals and proceedings. Only Scopus-indexed publications count toward the Faculty KPI.', when: 'Confirming current Scopus status before submitting.', links: [['Open Scopus Sources', SCOPUS_SOURCES]] },
  { icon: '⭐', name: 'ABS Academic Journal Guide', what: 'Chartered ABS star ratings (1–4*) for business and management journals; ABS 2* and above is the preferred benchmark. Free registration required.', when: 'Confirming a journal\'s quality rating.', links: [['Open the AJG', ABS_GUIDE]] },
  { icon: '📚', name: 'Zotero / Mendeley', what: 'Recommended reference managers for building long-term citation libraries. Import references from Google Scholar with one click.', when: 'Literature review (sub-task 2.1) and formatting (3.3).', links: [['Zotero (free)', 'https://www.zotero.org/download/'], ['Mendeley', 'https://www.mendeley.com/download-reference-manager/']] },
  { icon: '🧩', name: 'Rapid Journal Quality Check', what: 'Browser extension that shows journal rankings (SJR, ABS, ABDC…) and h-index next to Google Scholar results.', when: 'Scanning the literature and spotting strong sources and venues.', links: [['Add to Chrome / Edge', 'https://chromewebstore.google.com/detail/mfkbhgdamgfcifnhcdebfahkgnbkagmo']] }
]

function DocReader({ doc, canEdit, onSaved }) {
  const { showToast } = useToast()
  const [editing, setEditing] = useState(false)
  const [d, setD] = useState(doc)
  async function save() {
    const { error } = await supabase.from('resource_documents').update({ title: d.title, description: d.description, content: d.content, audience: d.audience, updated_at: new Date().toISOString() }).eq('id', doc.id)
    showToast(error ? `Could not save: ${error.message}` : 'Saved', error ? 'error' : 'success')
    if (!error) { setEditing(false); onSaved() }
  }
  return (
    <div className="card">
      <div className="flex justify-between items-start gap-3 mb-2">
        <div>
          <div className="text-xs text-slate-400">{doc.appendix}{doc.audience === 'leadership' && ' · Leadership only'}</div>
          <h3 className="font-bold">{doc.title}</h3>
        </div>
        <div className="flex gap-2 shrink-0">
          {canEdit && !editing && <button className="btn btn-ghost !py-1 !px-2 text-xs" onClick={() => { setD(doc); setEditing(true) }}>✎ Edit</button>}
          <button className="btn btn-ghost !py-1 !px-2 text-xs" onClick={() => window.print()}>🖨 Print</button>
        </div>
      </div>
      {editing ? (
        <div className="space-y-2">
          <div className="grid md:grid-cols-3 gap-2">
            <div className="md:col-span-2"><label>Title</label><input value={d.title} onChange={e => setD(x => ({ ...x, title: e.target.value }))} /></div>
            <div><label>Visible to</label><select value={d.audience} onChange={e => setD(x => ({ ...x, audience: e.target.value }))}><option value="all">Everyone signed in</option><option value="leadership">Leadership (Admin, Coordinator, Dean)</option></select></div>
          </div>
          <div><label>Short description</label><input value={d.description} onChange={e => setD(x => ({ ...x, description: e.target.value }))} /></div>
          <div><label>Content (Markdown: # heading, - bullet, **bold**, | tables |)</label><textarea rows={18} className="font-mono text-xs" value={d.content} onChange={e => setD(x => ({ ...x, content: e.target.value }))} /></div>
          <div className="flex gap-2"><button className="btn btn-blue" onClick={save}>Save</button><button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button></div>
        </div>
      ) : (
        <div className="print-area">
          <style>{`@media print { body * { visibility: hidden; } .print-area, .print-area * { visibility: visible; } .print-area { position: absolute; left: 0; top: 0; width: 100%; } }`}</style>
          <Markdown text={doc.content} />
        </div>
      )}
    </div>
  )
}

export default function Resources() {
  const { profile } = useAuth()
  const canEdit = hasFullContentAccess(profile)
  const [docs, setDocs] = useState([])
  const [open, setOpen] = useState(null)
  const [check, setCheck] = useState('')

  useEffect(() => { load() }, [])
  async function load() {
    const { data: d } = await supabase.from('resource_documents').select('*').order('sort')
    setDocs(d || [])
  }


  const openDoc = docs.find(x => x.id === open)

  return (
    <div className="space-y-4">
      <PageHeader icon="🧰" title="Tools & Resources" subtitle="The tools, guidance documents and journal list that support the Faculty research strategy." />

      <div className="card space-y-3">
        <div>
          <h3 className="text-lg font-bold">📑 Research Strategy & Appendices</h3>
          <p className="text-xs text-slate-500">The Faculty's research framework and its appendices — open any one to read it here, print it, or download the original from Files below.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {docs.map(d => (
            <button key={d.id} onClick={() => setOpen(o => o === d.id ? null : d.id)}
              className={`text-left rounded-xl border-2 p-4 transition hover:shadow-md ${open === d.id ? 'border-brand bg-blue-50/60 shadow-md' : 'border-slate-200 bg-white hover:border-brand'}`}>
              <div className="flex items-center gap-3 mb-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-navy to-brand text-white text-sm font-bold shrink-0">{d.appendix.startsWith('Appendix') ? d.appendix.replace('Appendix ', 'A') : '★'}</span>
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-wide text-slate-400">{d.appendix}{d.audience === 'leadership' && ' · Leadership only'}</div>
                  <div className="font-bold text-sm leading-tight">{d.title}</div>
                </div>
              </div>
              <div className="text-xs text-slate-500">{d.description}</div>
              <div className="mt-2 text-xs font-semibold text-brand">{open === d.id ? 'Close ▲' : 'Read ▸'}</div>
            </button>
          ))}
        </div>
      </div>
      {openDoc && <DocReader key={openDoc.id} doc={openDoc} canEdit={canEdit} onSaved={load} />}

      <div className="card">
        <h3 className="font-bold mb-2">Check a journal</h3>
        <div className="flex flex-wrap gap-2">
          <input className="!w-80" placeholder="Journal name…" value={check} onChange={e => setCheck(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && check.trim()) window.open(scimagoSearch(check.trim()), '_blank') }} />
          <a className={`btn btn-blue ${!check.trim() ? 'pointer-events-none opacity-50' : ''}`} href={scimagoSearch(check.trim())} target="_blank" rel="noreferrer">Search Scimago</a>
          <a className="btn btn-soft" href={SCOPUS_SOURCES} target="_blank" rel="noreferrer">Scopus Sources</a>
          <a className="btn btn-soft" href={ABS_GUIDE} target="_blank" rel="noreferrer">ABS Guide</a>
        </div>
        <p className="text-xs text-slate-400 mt-2">Rankings change every year — verify the current Scopus status, quartile and ABS rating before targeting a journal.</p>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {TOOLS.map(t => (
          <div key={t.name} className="card flex flex-col">
            <div className="text-2xl">{t.icon}</div>
            <h3 className="font-bold mt-1">{t.name}</h3>
            <p className="text-sm text-slate-600 mt-1">{t.what}</p>
            <p className="text-xs text-slate-400 mt-1"><strong>Use it for:</strong> {t.when}</p>
            <div className="flex flex-wrap gap-2 mt-auto pt-3">
              {t.links.map(([label, url]) => <a key={url} className="btn btn-soft !py-1 text-xs" href={url} target="_blank" rel="noreferrer">{label} ↗</a>)}
            </div>
          </div>
        ))}
        <div className="card flex flex-col">
          <div className="text-2xl">🏛️</div>
          <h3 className="font-bold mt-1">Venue Library</h3>
          <p className="text-sm text-slate-600 mt-1">All journals and conferences with Scopus status, SJR quartile and ABS rating — with Google Scholar, Scholar Metrics and Scimago links.</p>
          <p className="text-xs text-slate-400 mt-1"><strong>Use it for:</strong> choosing and verifying a target journal (sub-task 1.2).</p>
          <div className="mt-auto pt-3"><Link className="btn btn-soft !py-1 text-xs" to="/venues">Open the Venue Library</Link></div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-bold mb-1">Files</h3>
        <p className="text-xs text-slate-500 mb-2">Original Word versions, templates and other files shared by the Research Coordinator.</p>
        <FileList entityType="resource" entityId={RESOURCE_FILES_ID} canEdit={canEdit} />
      </div>
    </div>
  )
}
