/*
# Stage 3 — References library, Research Committee workspace, research calendar
(Applied to the live database on 2026-09-29.)

1. Master Themes, Definitions & References (Appendix 3): shared library everyone can read;
   Admin / Research Coordinator maintain it. Entries can be attached to a paper as its
   personalised reference extract. Seeded with the Appendix 3 sample (Agency Theory).
2. Research Committee (Appendix 4): monthly meetings with decisions, and action items with
   owner / due date / status. Readable by Admin, Coordinator and Dean; written by Admin and Coordinator.
3. Research calendar (Appendix 8): month-by-month coordination checklist for 2026–2027 plus
   dated activities (writing sessions, journal club, showcase…). Everyone reads; Admin and
   Coordinator maintain.
*/

-- ---------- references library ----------
create table if not exists public.research_themes (
  id uuid primary key default gen_random_uuid(),
  theory text default '',
  theme text not null,
  definition text default '',
  reference text default '',
  link text default '',
  source_quality text default '',
  created_at timestamptz not null default now()
);
alter table public.research_themes enable row level security;
create policy "themes read" on public.research_themes for select to authenticated using (public.my_role() is not null);
create policy "themes write" on public.research_themes for all to authenticated
  using (public.my_role() in ('admin','research_admin')) with check (public.my_role() in ('admin','research_admin'));

create table if not exists public.work_themes (
  work_id uuid not null references public.works(id) on delete cascade,
  theme_id uuid not null references public.research_themes(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (work_id, theme_id)
);
alter table public.work_themes enable row level security;
create policy "read via work" on public.work_themes for select to authenticated using (public.can_read_work(work_id));
create policy "write via work" on public.work_themes for all to authenticated
  using (public.can_write_work(work_id)) with check (public.can_write_work(work_id));

insert into public.research_themes (theory, theme, definition, reference, link)
select * from (values
  ('Agency Theory','Information Asymmetry','“Information asymmetry is a condition wherein one party in a relationship has more or better information than another.”','Bergh, D. D., Ketchen, D. J., Orlandi, I., Heugens, P. P. M. A. R., & Boyd, B. K. (2018). Information Asymmetry in Management Research: Past Accomplishments and Future Opportunities. Journal of Management, 45(1), 122–158.','https://doi.org/10.1177/0149206318798026'),
  ('Agency Theory','Moral Hazard','The problem that arises after a contract is made: the insured may change behaviour (take more risk) because they do not bear the full costs of risk.','Powell, D., & Goldman, D. (2021). Disentangling moral hazard and adverse selection in private health insurance. Journal of Econometrics, 222(1), 141–160.','https://doi.org/10.1016/j.jeconom.2020.07.030'),
  ('Agency Theory','Adverse Selection','A problem before the contract is signed: one party has private information (e.g. about risk type) which the other does not, causing selection issues.','Powell, D., & Goldman, D. (2021). Disentangling moral hazard and adverse selection in private health insurance. Journal of Econometrics, 222(1), 141–160.','https://doi.org/10.1016/j.jeconom.2020.07.030'),
  ('Agency Theory','Incentive Alignment','Physician–hospital alignment: a physician’s perception that their financial incentives, goals, and values and those of their hospital are mutually supporting and reinforcing rather than in conflict with one another.','Brinsfield, C. T., Priore, R. J., & Wehbi, N. K. (2024). Physician–hospital alignment: A definition and framework grounded in physicians’ perception. Health Care Management Review, 49(1), 74–84.','')
) v(theory, theme, definition, reference, link)
where not exists (select 1 from public.research_themes);

-- ---------- research committee ----------
create table if not exists public.committee_meetings (
  id uuid primary key default gen_random_uuid(),
  meeting_date date not null default current_date,
  title text not null default 'Monthly meeting',
  attendees text default '',
  notes text default '',
  decisions text default '',
  created_at timestamptz not null default now()
);
create table if not exists public.committee_actions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references public.committee_meetings(id) on delete set null,
  action text not null,
  owner text default '',
  due date,
  status text not null default 'Open',
  created_at timestamptz not null default now()
);
alter table public.committee_meetings enable row level security;
alter table public.committee_actions enable row level security;
do $$ declare t text; begin
  foreach t in array array['committee_meetings','committee_actions'] loop
    execute format('create policy "committee read" on public.%I for select to authenticated using (public.my_role() in (''admin'',''research_admin'',''dean''))', t);
    execute format('create policy "committee write" on public.%I for all to authenticated using (public.my_role() in (''admin'',''research_admin'')) with check (public.my_role() in (''admin'',''research_admin''))', t);
  end loop;
end $$;

-- ---------- research calendar ----------
create table if not exists public.calendar_tasks (
  id uuid primary key default gen_random_uuid(),
  academic_year text not null,
  month int not null check (month between 1 and 12),
  seq int not null default 0,
  activity text not null,
  is_fixed boolean not null default false,
  done boolean not null default false,
  done_on date,
  notes text default ''
);
create table if not exists public.research_activities (
  id uuid primary key default gen_random_uuid(),
  activity_date date not null,
  start_time text default '',
  kind text not null default 'Other',
  title text not null,
  location text default '',
  presenter text default '',
  notes text default '',
  created_at timestamptz not null default now()
);
alter table public.calendar_tasks enable row level security;
alter table public.research_activities enable row level security;
do $$ declare t text; begin
  foreach t in array array['calendar_tasks','research_activities'] loop
    execute format('create policy "calendar read" on public.%I for select to authenticated using (public.my_role() is not null)', t);
    execute format('create policy "calendar write" on public.%I for all to authenticated using (public.my_role() in (''admin'',''research_admin'')) with check (public.my_role() in (''admin'',''research_admin''))', t);
  end loop;
end $$;

insert into public.calendar_tasks (academic_year, month, seq, activity, is_fixed)
select * from (values
  ('2026–2027',9,0,'Distribute part-time faculty interest survey (Appendix 1)',false),
  ('2026–2027',9,1,'Research Coordinator meets individually with each Department Chair',false),
  ('2026–2027',9,2,'MS students begin supervisor selection',false),
  ('2026–2027',9,3,'Faculty briefed on annual KPI target (14 papers)',false),
  ('2026–2027',9,4,'Research tracking platform opens for new paper registration',false),
  ('2026–2027',9,5,'Research Committee opening meeting of the academic year',true),
  ('2026–2027',10,0,'Part-time faculty survey responses analysed; collaboration matches proposed',false),
  ('2026–2027',10,1,'All MS supervisor pairings confirmed and entered into the platform',false),
  ('2026–2027',10,2,'New papers formally enter pipeline at Phase 1',false),
  ('2026–2027',10,3,'Personalised reference extracts distributed to requesting faculty',false),
  ('2026–2027',10,4,'First journal club session of the year',false),
  ('2026–2027',11,0,'Monthly pipeline review — check all papers for movement',false),
  ('2026–2027',11,1,'Proactive outreach to any paper stationary for 30+ days',false),
  ('2026–2027',11,2,'Research Committee monthly meeting',true),
  ('2026–2027',11,3,'Journal club session',false),
  ('2026–2027',12,0,'Mid-semester pipeline summary submitted to Dean',false),
  ('2026–2027',12,1,'Faculty encouraged to use semester break for writing (Phase 2 focus)',false),
  ('2026–2027',12,2,'Research Committee monthly meeting',true),
  ('2026–2027',12,3,'Year-end writing session hosted by Research Coordinator',false),
  ('2026–2027',1,0,'Pipeline status reviewed at semester start',false),
  ('2026–2027',1,1,'New papers may be added for Spring semester',false),
  ('2026–2027',1,2,'Part-time faculty collaboration check-in',false),
  ('2026–2027',1,3,'Research Committee monthly meeting',true),
  ('2026–2027',1,4,'Journal club session',false),
  ('2026–2027',2,0,'FORMAL MID-YEAR KPI REVIEW — Research Coordinator presents pipeline status to Dean',true),
  ('2026–2027',2,1,'At-risk papers identified; intervention plan agreed',false),
  ('2026–2027',2,2,'MS progress check: all MS papers in Phase 2 by end of February',false),
  ('2026–2027',2,3,'Research Committee monthly meeting',true),
  ('2026–2027',3,0,'Monthly pipeline review and proactive outreach',false),
  ('2026–2027',3,1,'Phase 3 papers encouraged to target submission by May',false),
  ('2026–2027',3,2,'Annual Research Showcase date confirmed and communicated',false),
  ('2026–2027',3,3,'Research Committee monthly meeting',true),
  ('2026–2027',3,4,'Journal club session',false),
  ('2026–2027',4,0,'Monthly pipeline review',false),
  ('2026–2027',4,1,'Showcase presenters finalise their abstracts',false),
  ('2026–2027',4,2,'Submission push: Phase 3 papers targeted for journal submission',false),
  ('2026–2027',4,3,'Research Committee monthly meeting',true),
  ('2026–2027',4,4,'Journal club session',false),
  ('2026–2027',5,0,'ANNUAL RESEARCH SHOWCASE — work-in-progress and recent publications',true),
  ('2026–2027',5,1,'Monthly pipeline review',false),
  ('2026–2027',5,2,'MS papers: supervisors confirm submission status for year-end reporting',false),
  ('2026–2027',5,3,'Research Committee monthly meeting',true),
  ('2026–2027',6,0,'FULL-YEAR KPI REVIEW — annual research report submitted to Dean',true),
  ('2026–2027',6,1,'Published papers tallied against the 14-paper target',false),
  ('2026–2027',6,2,'Research Committee submits annual report',true),
  ('2026–2027',6,3,'Planning begins for next academic year (targets, strategy review)',false),
  ('2026–2027',6,4,'Published faculty acknowledged in Dean''s end-of-year communication',false),
  ('2026–2027',7,0,'Summer break — Research Coordinator available for queries',false),
  ('2026–2027',7,1,'Phase 4 papers continue to update the platform as journal decisions arrive',false),
  ('2026–2027',7,2,'Next year''s research calendar drafted and shared with Dean for approval',false)
) v(academic_year, month, seq, activity, is_fixed)
where not exists (select 1 from public.calendar_tasks where academic_year = '2026–2027');
