import { useState } from 'react'

export default function AuthorsTab({ work, canEdit, onPatch }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({
    lead: work.lead || '', corresponding: work.corresponding || '',
    author_order: work.author_order || '', coauthors: (work.coauthors || []).join(', '),
    abstract: work.abstract || ''
  })

  function save() {
    onPatch({
      lead: draft.lead, corresponding: draft.corresponding, author_order: draft.author_order,
      coauthors: draft.coauthors.split(',').map(s => s.trim()).filter(Boolean),
      abstract: draft.abstract
    })
    setEditing(false)
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="card">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold">Authorship</h3>
          {canEdit && !editing && <button className="btn btn-ghost !py-1 !px-2 text-xs" onClick={() => setEditing(true)}>✎ Edit</button>}
        </div>
        {!editing ? (
          <table>
            <tbody>
              <tr><th>Lead / Primary Author</th><td>{work.lead || '—'}</td></tr>
              <tr><th>Co-authors</th><td>{(work.coauthors || []).join(', ') || '—'}</td></tr>
              <tr><th>Corresponding Author</th><td>{work.corresponding || '—'}</td></tr>
              <tr><th>Author Order</th><td>{work.author_order || '—'}</td></tr>
            </tbody>
          </table>
        ) : (
          <div className="space-y-2">
            <div><label>Lead / Primary Author</label><input value={draft.lead} onChange={e => setDraft(d => ({ ...d, lead: e.target.value }))} /></div>
            <div><label>Co-authors (comma-separated)</label><input value={draft.coauthors} onChange={e => setDraft(d => ({ ...d, coauthors: e.target.value }))} /></div>
            <div><label>Corresponding Author</label><input value={draft.corresponding} onChange={e => setDraft(d => ({ ...d, corresponding: e.target.value }))} /></div>
            <div><label>Author Order</label><input value={draft.author_order} onChange={e => setDraft(d => ({ ...d, author_order: e.target.value }))} /></div>
            <div className="flex gap-2"><button className="btn btn-blue" onClick={save}>Save</button><button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button></div>
          </div>
        )}
      </div>
      <div className="card">
        <h3 className="font-bold mb-2">Paper Description</h3>
        {!editing ? (
          <div className="note">{work.abstract || 'No abstract/description entered.'}</div>
        ) : (
          <textarea rows={6} value={draft.abstract} onChange={e => setDraft(d => ({ ...d, abstract: e.target.value }))} />
        )}
      </div>
    </div>
  )
}
