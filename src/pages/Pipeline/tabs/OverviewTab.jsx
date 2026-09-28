import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { badgeClass } from '../../../lib/health'
import { RESEARCH_TYPES, MATURITY_LEVELS, STAGES, ETHICS } from '../../../lib/workOptions'
import FileList from '../../../components/FileList'

// Keeps the current value selectable even if it isn't in the standard list.
const withCurrent = (list, v) => (v && !list.includes(v) ? [v, ...list] : list)

function draftFrom(work) {
  return {
    title: work.title || '',
    research_type: work.research_type || '',
    research_maturity: work.research_maturity || 'Not Classified',
    department: work.department || '',
    collaborating: (work.departments || []).filter(d => d !== work.department),
    stage: work.stage || '',
    ethics: work.ethics || 'N/A',
    lead: work.lead || '',
    corresponding: work.corresponding || '',
    venue: work.venue || '',
    manuscript_id: work.manuscript_id || '',
    custom_fields: (work.custom_fields || []).map(cf => ({ label: cf.label || '', type: cf.type || 'Text', value: cf.value || '' }))
  }
}

export default function OverviewTab({ work, health, canEdit, onPatch }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(() => draftFrom(work))
  const [departments, setDepartments] = useState([])
  const [err, setErr] = useState(null)

  useEffect(() => {
    supabase.from('departments').select('name').eq('active', true).order('name').then(({ data }) => setDepartments((data || []).map(d => d.name)))
  }, [])

  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }))
  const startEdit = () => { setDraft(draftFrom(work)); setErr(null); setEditing(true) }

  async function save() {
    if (!draft.title.trim()) { setErr('The title cannot be empty.'); return }
    if (!draft.department) { setErr('Choose a primary department.'); return }
    const collab = draft.collaborating.filter(d => d && d !== draft.department)
    const ok = await onPatch({
      title: draft.title.trim(), research_type: draft.research_type, research_maturity: draft.research_maturity,
      department: draft.department, departments: [draft.department, ...collab],
      stage: draft.stage || null, ethics: draft.ethics, lead: draft.lead, corresponding: draft.corresponding,
      venue: draft.venue, manuscript_id: draft.manuscript_id,
      custom_fields: draft.custom_fields.filter(cf => cf.label.trim() || cf.value.trim())
    })
    if (ok !== false) setEditing(false)
  }

  const boxes = [
    ['Research Type', work.research_type || '—'],
    ['Research Maturity', work.research_maturity || 'Not Classified'],
    ['Primary Department', work.department],
    ['Collaborating Departments', (work.departments || []).filter(d => d !== work.department).join(', ') || '—'],
    ['Major Stage', work.stage || '—'],
    ['Ethics Status', work.ethics || 'N/A'],
    ['Lead / Primary Author', work.lead || '—'],
    ['Corresponding Author', work.corresponding || '—'],
    ['Venue', work.venue || '—'],
    ['Manuscript ID', work.manuscript_id || '—']
  ]
  const customFields = (work.custom_fields || []).filter(cf => cf.label || cf.value)

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold">General Attributes</h3>
          {canEdit && !editing && <button className="btn btn-soft" onClick={startEdit}>✎ Edit</button>}
        </div>

        {!editing ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {boxes.map(([label, value]) => (
              <div key={label} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="text-xs text-slate-400">{label}</div>
                <div className="font-semibold text-sm mt-1">{value}</div>
              </div>
            ))}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="text-xs text-slate-400">Automatically Derived Health</div>
              <span className={`badge ${badgeClass(health.status)} mt-1`}>{health.status}</span>
              <div className="text-xs text-slate-500 mt-1">{health.reasons.join('; ') || 'No attention criteria triggered'}</div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div><label>Title</label><input value={draft.title} onChange={e => set('title', e.target.value)} /></div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div><label>Research Type</label>
                <select value={draft.research_type} onChange={e => set('research_type', e.target.value)}>
                  {withCurrent(RESEARCH_TYPES, draft.research_type).map(t => <option key={t}>{t}</option>)}
                </select></div>
              <div><label>Research Maturity</label>
                <select value={draft.research_maturity} onChange={e => set('research_maturity', e.target.value)}>
                  {withCurrent(MATURITY_LEVELS, draft.research_maturity).map(t => <option key={t}>{t}</option>)}
                </select></div>
              <div><label>Major Stage</label>
                <select value={draft.stage} onChange={e => set('stage', e.target.value)}>
                  <option value="">—</option>
                  {withCurrent(STAGES, draft.stage).map(t => <option key={t}>{t}</option>)}
                </select></div>
              <div><label>Primary Department</label>
                <select value={draft.department} onChange={e => set('department', e.target.value)}>
                  <option value="">— Choose —</option>
                  {withCurrent(departments, draft.department).map(d => <option key={d}>{d}</option>)}
                </select></div>
              <div className="md:col-span-2"><label>Collaborating Departments</label>
                <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                  {departments.filter(d => d !== draft.department).map(d => (
                    <label key={d} className="!mb-0 flex items-center gap-1 font-normal text-sm">
                      <input type="checkbox" className="!w-auto" checked={draft.collaborating.includes(d)}
                        onChange={e => set('collaborating', e.target.checked ? [...draft.collaborating, d] : draft.collaborating.filter(x => x !== d))} />
                      {d}
                    </label>
                  ))}
                </div></div>
              <div><label>Ethics Status</label>
                <select value={draft.ethics} onChange={e => set('ethics', e.target.value)}>
                  {withCurrent(ETHICS, draft.ethics).map(t => <option key={t}>{t}</option>)}
                </select></div>
              <div><label>Lead / Primary Author</label><input value={draft.lead} onChange={e => set('lead', e.target.value)} /></div>
              <div><label>Corresponding Author</label><input value={draft.corresponding} onChange={e => set('corresponding', e.target.value)} /></div>
              <div><label>Venue</label><input value={draft.venue} onChange={e => set('venue', e.target.value)} /></div>
              <div><label>Manuscript ID</label><input value={draft.manuscript_id} onChange={e => set('manuscript_id', e.target.value)} /></div>
            </div>

            <div>
              <label>Custom Fields</label>
              <div className="space-y-2">
                {draft.custom_fields.map((cf, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2">
                    <input className="col-span-4" placeholder="Label" value={cf.label}
                      onChange={e => set('custom_fields', draft.custom_fields.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />
                    <input className="col-span-7" placeholder="Value" value={cf.value}
                      onChange={e => set('custom_fields', draft.custom_fields.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} />
                    <button className="col-span-1 text-xs text-rose-500" onClick={() => set('custom_fields', draft.custom_fields.filter((_, j) => j !== i))}>Remove</button>
                  </div>
                ))}
                <button className="text-xs text-brand font-semibold" onClick={() => set('custom_fields', [...draft.custom_fields, { label: '', type: 'Text', value: '' }])}>+ Custom field</button>
              </div>
            </div>

            {err && <p className="text-sm text-rose-600">{err}</p>}
            <div className="flex gap-2">
              <button className="btn btn-blue" onClick={save}>Save changes</button>
              <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="font-bold mb-2">Research-Level Files</h3>
        <FileList entityType="work" entityId={work.id} canEdit={canEdit} />
      </div>

      {!editing && customFields.length > 0 && (
        <div className="card">
          <h3 className="font-bold mb-3">Custom Fields</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {customFields.map((cf, i) => (
              <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="text-xs text-slate-400">{cf.label || 'Custom Field'} · {cf.type || 'Text'}</div>
                <div className="font-semibold text-sm mt-1">{cf.value || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="note text-xs">
        <strong>Governance:</strong> Chair/committee referral and lead assignment begin the work. Venue should meet the
        university floor (Scopus; Q1–Q4 count; preferably ABS/AJG 1*+). Default path is Onboarding → Execution → Submission.
        Advisory Review is optional. Submission = 100% completion; Under Review / R&R / Accepted remain outcome/status words.
      </div>
    </div>
  )
}
