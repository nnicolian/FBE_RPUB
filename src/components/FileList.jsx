import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { listAttachments, uploadAttachment, deleteAttachment, getAttachmentUrl } from '../lib/attachments'

// Drop-in file list + uploader for any entity (work, phase, task, subtask,
// deliverable, cost_entry, review_round). Requires a Supabase Storage
// bucket named "attachments" to exist (see README).
export default function FileList({ entityType, entityId, canEdit = true }) {
  const { profile } = useAuth()
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [entityType, entityId])

  async function load() {
    try {
      setFiles(await listAttachments(entityType, entityId))
    } catch (e) { /* bucket may not exist yet; fail quietly in UI */ }
  }

  async function onUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true); setError('')
    try {
      await uploadAttachment(entityType, entityId, file, profile?.id)
      await load()
    } catch (err) {
      setError('Upload failed — has the "attachments" storage bucket been created in Supabase yet?')
    }
    setBusy(false)
    e.target.value = ''
  }

  async function onOpen(f) {
    try {
      const url = await getAttachmentUrl(f.storage_path)
      window.open(url, '_blank')
    } catch { setError('Could not open file.') }
  }

  async function onDelete(f) {
    if (!confirm(`Delete "${f.file_name}"?`)) return
    await deleteAttachment(f)
    load()
  }

  return (
    <div className="flex flex-wrap gap-1 items-center mt-1">
      {files.map(f => (
        <span key={f.id} className="filechip inline-flex items-center gap-1 !cursor-default">
          <button className="!bg-transparent !border-0 !p-0 underline" onClick={() => onOpen(f)}>📎 {f.file_name}</button>
          {canEdit && <button className="!bg-transparent !border-0 !p-0 text-rose-500" onClick={() => onDelete(f)}>✕</button>}
        </span>
      ))}
      {canEdit && (
        <label className="text-xs text-brand font-semibold cursor-pointer">
          {busy ? 'Uploading…' : '+ Add file'}
          <input type="file" className="hidden" onChange={onUpload} />
        </label>
      )}
      {error && <div className="text-xs text-rose-500 w-full">{error}</div>}
    </div>
  )
}
