import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

// The Faculty's 4-phase pipeline (Research Strategy, Appendix 6). Each sub-task's
// "instructions" is its "What 100% looks like" guidance, shown to authors.
const T = (id, name, instructions) => ({ id, name, instructions, subtasks: [] })
const DEFAULT_TEMPLATE = [
  { id: 'p1', name: '1. Initiate', optional: false, committeeRequired: false,
    instructions: 'Milestone: paper formally entered into the pipeline and visible to the Research Coordinator and Dean.',
    tasks: [
      T('t11', '1.1 Define the research question and scope', 'A clear, focused research question is written and agreed with co-authors or supervisor.'),
      T('t12', '1.2 Select target journal', 'A Scopus-indexed journal has been identified; its scope, quartile, and ABS rating confirmed.'),
      T('t13', '1.3 Draft the paper outline', 'A structured outline (sections, key arguments, proposed methodology) is complete.'),
      T('t14', '1.4 Confirm co-authors and roles', "All authors are named; each person's contribution is agreed and documented.")
    ] },
  { id: 'p2', name: '2. Build', optional: false, committeeRequired: false,
    instructions: 'Milestone: full draft completed and shared internally.',
    tasks: [
      T('t21', '2.1 Complete the literature review', 'All key sources reviewed; gaps identified; theoretical framework established.'),
      T('t22', '2.2 Finalise methodology', 'Research design, data collection method, and analytical approach are confirmed.'),
      T('t23', '2.3 Collect and analyse data', 'Data collected, cleaned, and fully analysed; results are ready to write up.'),
      T('t24', '2.4 Write the first full draft', 'A complete manuscript exists: introduction through conclusion, references included.')
    ] },
  { id: 'p3', name: '3. Refine', optional: false, committeeRequired: false,
    instructions: 'Milestone: paper ready for submission.',
    tasks: [
      T('t31', '3.1 Conduct internal peer review', 'Draft has been read and commented on by a colleague not on the author list.'),
      T('t32', '3.2 Incorporate feedback and revise', 'All substantive comments addressed; manuscript updated accordingly.'),
      T('t33', '3.3 Format to journal guidelines', "Paper length, structure, citation style, and layout match the target journal's author guidelines exactly."),
      T('t34', '3.4 Prepare submission materials', 'Cover letter written; author bios, conflict of interest statements, and any required declarations are ready.')
    ] },
  { id: 'p4', name: '4. Publish', optional: false, committeeRequired: false,
    instructions: 'Milestone: publication confirmed — paper counts toward the Faculty KPI.',
    tasks: [
      T('t41', '4.1 Submit to target journal', 'Submission confirmed; journal reference number received.'),
      T('t42', '4.2 Respond to reviewer comments', 'Reviewer comments received and fully addressed in a point-by-point response letter.'),
      T('t43', '4.3 Submit revised manuscript', 'Revised paper resubmitted to the journal; revision confirmed.'),
      T('t44', '4.4 Confirm acceptance and publication', 'Acceptance letter received; paper assigned DOI or publication date.')
    ] }
]
const uid = () => Math.random().toString(36).slice(2, 9)

export default function LifecycleTemplate() {
  const [template, setTemplate] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('lifecycle_template').select('*').single()
    const t = data?.template
    setTemplate(Array.isArray(t) && t.length ? t : DEFAULT_TEMPLATE)
    setLoading(false)
  }

  async function persist(next) {
    setTemplate(next)
    await supabase.from('lifecycle_template').update({ template: next }).eq('id', 1)
  }

  const updatePhase = (pid, fields) => persist(template.map(p => p.id === pid ? { ...p, ...fields } : p))
  const updateTask = (pid, tid, fields) => persist(template.map(p => p.id === pid
    ? { ...p, tasks: p.tasks.map(t => t.id === tid ? { ...t, ...fields } : t) } : p))

  function addPhase() {
    persist([...template, { id: uid(), name: `${template.length + 1}. New Phase`, optional: false, committeeRequired: false, instructions: '', tasks: [] }])
  }
  function removePhase(pid) {
    if (!confirm('Remove this phase from the template?')) return
    persist(template.filter(p => p.id !== pid))
  }
  function addTask(pid) {
    const name = prompt('Sub-task name?'); if (!name) return
    persist(template.map(p => p.id === pid ? { ...p, tasks: [...p.tasks, { id: uid(), name, instructions: '', subtasks: [] }] } : p))
  }
  function removeTask(pid, tid) {
    persist(template.map(p => p.id === pid ? { ...p, tasks: p.tasks.filter(t => t.id !== tid) } : p))
  }
  function resetDefault() {
    if (!confirm('Reset to the Faculty 4-phase pipeline (Initiate → Build → Refine → Publish)? This does not affect existing papers.')) return
    persist(DEFAULT_TEMPLATE)
  }

  if (loading) return <div className="card text-slate-400 text-sm">Loading…</div>

  return (
    <div className="card space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold">Standard Research Lifecycle</h3>
          <p className="text-xs text-slate-500">Master template used when creating new papers. Existing papers are never changed automatically.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-soft" onClick={addPhase}>+ Phase</button>
          <button className="btn btn-ghost" onClick={resetDefault}>Reset Default</button>
        </div>
      </div>
      <div className="note text-xs">
        Authors self-report a percentage per sub-task; there are no submissions or approvals.
        A phase's milestone completes automatically when all its sub-tasks reach 100%.
      </div>
      <div className="space-y-3">
        {template.map(p => (
          <div key={p.id} className="border border-slate-200 rounded-lg p-3">
            <div className="flex justify-between items-center gap-2">
              <input className="font-semibold !border-0 !p-1" defaultValue={p.name} onBlur={e => updatePhase(p.id, { name: e.target.value })} />
              <button className="text-xs text-rose-500 shrink-0" onClick={() => removePhase(p.id)}>Delete Phase</button>
            </div>
            <label className="mt-2">Milestone / phase note</label>
            <textarea rows={2} defaultValue={p.instructions} onBlur={e => updatePhase(p.id, { instructions: e.target.value })} />
            <div className="mt-2 space-y-2">
              {p.tasks.map(t => (
                <div key={t.id} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm">
                  <div className="flex justify-between items-center gap-2">
                    <input className="font-semibold !border-0 !p-1 !bg-transparent" defaultValue={t.name} onBlur={e => updateTask(p.id, t.id, { name: e.target.value })} />
                    <button className="text-xs text-rose-500 shrink-0" onClick={() => removeTask(p.id, t.id)}>Delete</button>
                  </div>
                  <input className="text-xs mt-1" placeholder="What 100% looks like" defaultValue={t.instructions}
                    onBlur={e => updateTask(p.id, t.id, { instructions: e.target.value })} />
                </div>
              ))}
              <button className="text-xs text-brand font-semibold" onClick={() => addTask(p.id)}>+ Sub-task</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
