import { badgeClass } from '../../../lib/health'
import FileList from '../../../components/FileList'

export default function OverviewTab({ work, health, canEdit, onPatch }) {
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
      </div>

      <div className="card">
        <h3 className="font-bold mb-2">Research-Level Files</h3>
        <FileList entityType="work" entityId={work.id} canEdit={canEdit} />
      </div>

      {canEdit && (
        <div className="card space-y-3">
          <h3 className="font-bold">Edit General Attributes</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label>Research Maturity</label>
              <select defaultValue={work.research_maturity} onBlur={e => onPatch({ research_maturity: e.target.value })}>
                {['Not Classified', 'Idea', 'Work in Progress', 'Conference-ready', 'Extended-publication-ready', 'Journal-ready'].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label>Stage</label>
              <select defaultValue={work.stage} onBlur={e => onPatch({ stage: e.target.value })}>
                {['Onboarding', 'Execution', 'Advisory Review', 'Submission', 'Under Review', 'R&R', 'Accepted', 'Published'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div><label>Manuscript ID</label><input defaultValue={work.manuscript_id} onBlur={e => onPatch({ manuscript_id: e.target.value })} /></div>
            <div><label>Research Type</label><input defaultValue={work.research_type} onBlur={e => onPatch({ research_type: e.target.value })} /></div>
          </div>
        </div>
      )}

      {customFields.length > 0 && (
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
