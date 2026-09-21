import { supabase } from './supabaseClient'

const BUCKET = 'attachments'

// entityType: 'work' | 'phase' | 'task' | 'subtask' | 'deliverable' | 'cost_entry' | 'review_round'
export async function listAttachments(entityType, entityId) {
  const { data, error } = await supabase
    .from('attachments')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('uploaded_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function uploadAttachment(entityType, entityId, file, uploadedBy) {
  const path = `${entityType}/${entityId}/${Date.now()}_${file.name}`
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file)
  if (upErr) throw upErr
  const { data, error } = await supabase.from('attachments').insert({
    entity_type: entityType, entity_id: entityId,
    file_name: file.name, storage_path: path, uploaded_by: uploadedBy
  }).select().single()
  if (error) throw error
  return data
}

export async function deleteAttachment(attachment) {
  await supabase.storage.from(BUCKET).remove([attachment.storage_path])
  await supabase.from('attachments').delete().eq('id', attachment.id)
}

export async function getAttachmentUrl(storagePath) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 60 * 10)
  if (error) throw error
  return data.signedUrl
}
