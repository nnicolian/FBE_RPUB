import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { RESEARCH_AREAS } from '../lib/workOptions'
import { HeartHandshake } from 'lucide-react'

// Faculty Research Interest Survey (Research Strategy, Appendix 1) — part-time and full-time faculty.
// Public page — no sign-in needed. Responses are visible only to the Research Coordinator and Admin.

const ACADEMIC_YEAR = '2026–2027'
const Q = {
  department: ['Management', 'Marketing', 'Finance & Accounting', 'Hospitality Management', 'Management Information Systems (MIS)', 'Economics', 'Other'],
  faculty_type: ['Full-time faculty', 'Part-time faculty'],
  mentor_interest: ['Yes — happy to co-author with / mentor a part-time colleague', 'Maybe — depending on the topic', 'Not at this time'],
  ms_supervision: ['Yes — I can supervise MS research papers this year', 'Maybe — one student at most', 'Not this year'],
  semesters_teaching: ['1 semester', '2–3 semesters', '4–6 semesters', '7+ semesters'],
  qualification: ["Bachelor's", "Master's / MBA", 'DBA', 'PhD'],
  published_recently: ['Yes — in a Scopus-indexed journal', 'Yes — in a conference proceeding', 'Yes — in a non-indexed journal', 'No, I have not published'],
  publication_count: ['None', '1–2', '3–5', '6 or more'],
  currently_researching: ['Yes — actively writing', 'Yes — in early stages', 'No — but I have an idea', 'No — not currently'],
  experience: [
    'I am an experienced researcher and have led papers independently',
    'I have co-authored papers but not led one independently',
    'I have contributed to research (data, review) but not co-authored formally',
    'I have limited research experience but am willing to learn'
  ],
  approach: ['Quantitative', 'Qualitative', 'Mixed methods', 'Conceptual', 'No preference'],
  hours_per_week: ['1–2 hrs', '3–4 hrs', '5+ hrs', 'Flexible / depends on the project'],
  semesters: ['Fall', 'Spring', 'Summer', 'All semesters'],
  contributions: ['Co-authoring a full paper', 'Writing a literature review section', 'Co-writing one section of a paper', 'Reviewing data or methodology', 'Proofreading and feedback'],
  wants_match: ['Yes — please suggest a match', 'Yes — I already have a colleague or topic in mind', 'Not at this time'],
  interested_activities: ['Personalised reference list for my topic', 'Journal targeting guidance (Scopus, quartile and ABS ratings)', 'Bi-weekly faculty writing sessions', 'Monthly journal club', 'Annual Research Showcase', 'None at the moment']
}
const EMPTY = {
  faculty_type: '', mentor_interest: '', ms_supervision: '', current_projects: '',
  full_name: '', email: '', phone: '', department: '', employment_status: '', semesters_teaching: '', qualification: '',
  published_recently: '', publication_count: '', currently_researching: '', experience: '', research_areas: [], other_area: '',
  topics: '', approach: '', hours_per_week: '', semesters: [], contributions: [], wants_match: '', colleague_in_mind: '',
  current_work: '', interested_activities: [], anything_else: ''
}

function Single({ name, label, value, onChange, options }) {
  return (
    <fieldset className="space-y-1">
      <legend className="font-semibold text-sm mb-1">{label}</legend>
      {options.map(o => (
        <label key={o} className="!mb-0 flex items-start gap-2 text-sm font-normal">
          <input type="radio" className="!w-auto mt-1" name={name} checked={value === o} onChange={() => onChange(o)} />{o}
        </label>
      ))}
    </fieldset>
  )
}
function Multi({ label, hint, value, onChange, options }) {
  const toggle = o => onChange(value.includes(o) ? value.filter(x => x !== o) : [...value, o])
  return (
    <fieldset className="space-y-1">
      <legend className="font-semibold text-sm mb-1">{label}{hint && <span className="block text-xs font-normal text-slate-500">{hint}</span>}</legend>
      {options.map(o => (
        <label key={o} className="!mb-0 flex items-start gap-2 text-sm font-normal">
          <input type="checkbox" className="!w-auto mt-1" checked={value.includes(o)} onChange={() => toggle(o)} />{o}
        </label>
      ))}
    </fieldset>
  )
}

export default function Survey() {
  const [f, setF] = useState(EMPTY)
  const [err, setErr] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const set = k => v => setF(x => ({ ...x, [k]: v }))
  const text = k => e => setF(x => ({ ...x, [k]: e.target.value }))

  async function submit() {
    if (!f.faculty_type) { setErr('Please say whether you are full-time or part-time faculty (question A1).'); window.scrollTo(0, 0); return }
    if (f.full_name.trim().length < 2) { setErr('Please enter your full name.'); return }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) { setErr('Please enter a valid email address.'); return }
    setSending(true); setErr('')
    // Insert only (no read-back): respondents can't read any responses.
    const faculty_type = f.faculty_type.startsWith('Full') ? 'Full-time' : 'Part-time'
    const { error } = await supabase.from('pt_survey_responses').insert({ ...f, faculty_type, employment_status: `${faculty_type} faculty`, full_name: f.full_name.trim(), email: f.email.trim(), academic_year: ACADEMIC_YEAR })
    setSending(false)
    if (error) { setErr('Sorry, your response could not be sent. Please try again.'); return }
    setDone(true); window.scrollTo(0, 0)
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="bg-ink-900 rounded-2xl p-6 text-white shadow-card">
          <div className="text-sm text-white/80">AUST – Faculty of Business & Economics</div>
          <h1 className="text-2xl font-bold">Faculty Research Interest Survey</h1>
          <div className="text-sm text-white/80">{ACADEMIC_YEAR} · Confidential</div>
        </div>

        {done ? (
          <div className="card text-center space-y-2 py-10">
            <div className="mx-auto h-12 w-12 rounded-xl bg-accent-50 flex items-center justify-center"><HeartHandshake className="h-6 w-6 text-accent-600" /></div>
            <h2 className="text-xl font-bold">Thank you.</h2>
            <p className="text-slate-600">The Research Coordinator will follow up individually with all interested respondents.</p>
          </div>
        ) : (
          <>
            <div className="card text-sm text-slate-600">
              This survey takes about 5 minutes and is for all FBE faculty — full-time and part-time. It helps the Research Coordinator
              pair colleagues with related interests, find MS supervisors, and support collaboration between part-time and full-time faculty. All responses are confidential and used solely to match research interests and
              facilitate co-authorship invitations. There is no obligation to participate in any research activity.
            </div>

            <div className="card space-y-4">
              <h2 className="font-bold">A · Personal information</h2>
              <Single name="faculty_type" label="A1. Are you full-time or part-time faculty at AUST? *" value={f.faculty_type} onChange={set('faculty_type')} options={Q.faculty_type} />
              <Single name="department" label="A2. What is your department?" value={f.department} onChange={set('department')} options={Q.department} />
              <Single name="semesters_teaching" label="A3. How many semesters have you been teaching at AUST?" value={f.semesters_teaching} onChange={set('semesters_teaching')} options={Q.semesters_teaching} />
              <Single name="qualification" label="A4. What is your highest academic qualification?" value={f.qualification} onChange={set('qualification')} options={Q.qualification} />
            </div>

            <div className="card space-y-4">
              <h2 className="font-bold">B · Research background</h2>
              <Single name="published_recently" label="B1. Have you published any academic research in the past 5 years?" value={f.published_recently} onChange={set('published_recently')} options={Q.published_recently} />
              <Single name="publication_count" label="B2. Approximately how many publications do you have in total? (journal articles, conference papers, book chapters)" value={f.publication_count} onChange={set('publication_count')} options={Q.publication_count} />
              <Single name="currently_researching" label="B3. Are you currently working on any research?" value={f.currently_researching} onChange={set('currently_researching')} options={Q.currently_researching} />
              <Single name="experience" label="B4. Which best describes your research experience?" value={f.experience} onChange={set('experience')} options={Q.experience} />
            </div>

            <div className="card space-y-4">
              <h2 className="font-bold">C · Research interests</h2>
              <Multi label="C1. Which areas are closest to your research interests?" hint="Select all that apply" value={f.research_areas} onChange={set('research_areas')} options={RESEARCH_AREAS} />
              <div><label>Other area (please specify)</label><input value={f.other_area} onChange={text('other_area')} /></div>
              <div><label>C2. In a few words, what specific topics or themes do you work on or would like to explore?</label>
                <textarea rows={2} value={f.topics} onChange={text('topics')} placeholder="e.g. consumer trust in online retail, corporate governance in family firms, SME digitalisation" /></div>
              <Single name="approach" label="C3. Which research approach are you most comfortable with?" value={f.approach} onChange={set('approach')} options={Q.approach} />
            </div>

            {f.faculty_type.startsWith('Full') ? (
              <div className="card space-y-4">
                <h2 className="font-bold">D · Collaboration & supervision (full-time faculty)</h2>
                <Single name="mentor_interest" label="D1. Would you co-author with, or mentor, a part-time colleague working in a related area? (small, well-defined contributions)" value={f.mentor_interest} onChange={set('mentor_interest')} options={Q.mentor_interest} />
                <Single name="ms_supervision" label="D2. Are you available to supervise MS student research papers this year?" value={f.ms_supervision} onChange={set('ms_supervision')} options={Q.ms_supervision} />
                <Single name="hours_per_week" label="D3. How many hours per week can you give to research collaboration?" value={f.hours_per_week} onChange={set('hours_per_week')} options={Q.hours_per_week} />
                <div><label>D4. Papers you are currently working on (titles or topics, optional)</label><textarea rows={2} value={f.current_projects} onChange={text('current_projects')} /></div>
              </div>
            ) : (
              <div className="card space-y-4">
              <h2 className="font-bold">D · Collaboration availability</h2>
              <Single name="hours_per_week" label="D1. How many hours per week could you realistically give to research collaboration, outside your teaching?" value={f.hours_per_week} onChange={set('hours_per_week')} options={Q.hours_per_week} />
              <Multi label="D2. Which semester(s) work best for you?" value={f.semesters} onChange={set('semesters')} options={Q.semesters} />
              <Multi label="D3. Which kinds of contribution would you be comfortable with?" hint="Contributions are kept small and well-defined to suit part-time schedules" value={f.contributions} onChange={set('contributions')} options={Q.contributions} />
              <Single name="wants_match" label="D4. Would you like to be introduced to a full-time colleague working in a related area?" value={f.wants_match} onChange={set('wants_match')} options={Q.wants_match} />
              {f.wants_match.includes('in mind') && <div><label>Colleague or topic you have in mind</label><input value={f.colleague_in_mind} onChange={text('colleague_in_mind')} /></div>}
            </div>

            )}
            <div className="card space-y-4">
              <h2 className="font-bold">E · Current work & support</h2>
              <div><label>E1. If you are working on research now, what is it about? (optional)</label><textarea rows={2} value={f.current_work} onChange={text('current_work')} /></div>
              <Multi label="E2. Which Faculty research activities would you like to hear about?" hint="Select all that apply" value={f.interested_activities} onChange={set('interested_activities')} options={Q.interested_activities} />
              <div><label>E3. Anything else you would like the Research Coordinator to know?</label><textarea rows={2} value={f.anything_else} onChange={text('anything_else')} /></div>
            </div>

            <div className="card space-y-3">
              <h2 className="font-bold">F · Contact details for follow-up</h2>
              <div className="grid md:grid-cols-3 gap-3">
                <div><label>Full name *</label><input value={f.full_name} onChange={text('full_name')} /></div>
                <div><label>Email address *</label><input type="email" value={f.email} onChange={text('email')} /></div>
                <div><label>Phone / WhatsApp (optional)</label><input value={f.phone} onChange={text('phone')} /></div>
              </div>
              {err && <p className="text-sm text-rose-600">{err}</p>}
              <button className="btn btn-blue" disabled={sending} onClick={submit}>{sending ? 'Sending…' : 'Submit survey'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
