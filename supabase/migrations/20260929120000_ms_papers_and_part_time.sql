/*
# Stage 2 — MS student papers, part-time faculty engagement, researcher ↔ login links
(Applied to the live database on 2026-09-29.)

1. MS papers (Appendix 5): student (first author, no login), supervisor (co-author who
   tracks progress), supervision meeting log (≥ 2 per phase). The supervisor can see and
   update the paper like any author.
2. Researchers: research areas, accepting MS supervisions (the "available supervisors" list).
3. Part-time faculty survey (Appendix 1): public form (no login) writes responses; only the
   Admin and Research Coordinator can read them and record matches.
*/

-- ---------- MS papers ----------
alter table public.works add column if not exists student_name text default '';
alter table public.works add column if not exists student_email text default '';
alter table public.works add column if not exists supervisor text default '';

create table if not exists public.supervision_meetings (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.works(id) on delete cascade,
  meeting_date date not null default current_date,
  phase text not null default '',
  notes text default '',
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.supervision_meetings enable row level security;
create policy "read via work" on public.supervision_meetings for select to authenticated using (public.can_read_work(work_id));
create policy "write via work" on public.supervision_meetings for all to authenticated
  using (public.can_write_work(work_id)) with check (public.can_write_work(work_id));

-- The supervisor counts as an author of the paper.
create or replace function public.can_read_work_row(w works)
returns boolean language sql stable security definer set search_path = public as $$
  select public.my_role() in ('admin','research_admin','dean')
      or (public.my_role() = 'chair' and public.work_in_my_department(w.department, w.departments))
      or public.is_my_work(w.created_by, w.lead, coalesce(w.coauthors,'{}') || coalesce(nullif(w.supervisor,''), w.lead));
$$;
create or replace function public.can_write_work_row(w works)
returns boolean language sql stable security definer set search_path = public as $$
  select public.my_role() in ('admin','research_admin')
      or (public.my_role() = 'chair' and public.work_in_my_department(w.department, w.departments))
      or (public.my_role() in ('chair','author')
          and public.is_my_work(w.created_by, w.lead, coalesce(w.coauthors,'{}') || coalesce(nullif(w.supervisor,''), w.lead)));
$$;

create or replace function public.attachment_work(p_type text, p_id uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select case p_type
    when 'work' then p_id
    when 'phase' then (select work_id from phases where id = p_id)
    when 'task' then (select p.work_id from tasks t join phases p on p.id = t.phase_id where t.id = p_id)
    when 'subtask' then (select p.work_id from subtasks s join tasks t on t.id = s.task_id join phases p on p.id = t.phase_id where s.id = p_id)
    when 'review_round' then (select p.work_id from review_rounds r join phases p on p.id = r.phase_id where r.id = p_id)
    when 'work_update' then (select work_id from work_updates where id = p_id)
    when 'milestone' then (select work_id from milestones where id = p_id)
    when 'risk' then (select work_id from risks where id = p_id)
    when 'deliverable' then (select work_id from deliverables where id = p_id)
    when 'cost_entry' then (select work_id from cost_entries where id = p_id)
    when 'supervision_meeting' then (select work_id from supervision_meetings where id = p_id)
  end $$;

-- ---------- researchers ----------
alter table public.researchers add column if not exists research_areas text[] not null default '{}';
alter table public.researchers add column if not exists accepts_ms_students boolean not null default false;

-- ---------- part-time faculty survey ----------
create table if not exists public.pt_survey_responses (
  id uuid primary key default gen_random_uuid(),
  submitted_at timestamptz not null default now(),
  academic_year text default '',
  full_name text not null,
  email text not null,
  phone text default '',
  department text default '',
  employment_status text default '',
  semesters_teaching text default '',
  qualification text default '',
  published_recently text default '',
  publication_count text default '',
  currently_researching text default '',
  experience text default '',
  research_areas text[] not null default '{}',
  other_area text default '',
  topics text default '',
  approach text default '',
  hours_per_week text default '',
  semesters text[] not null default '{}',
  contributions text[] not null default '{}',
  wants_match text default '',
  colleague_in_mind text default '',
  current_work text default '',
  interested_activities text[] not null default '{}',
  anything_else text default '',
  -- Research Coordinator follow-up
  status text not null default 'New',
  matched_researcher text default '',
  coordinator_notes text default '',
  researcher_id uuid references public.researchers(id) on delete set null
);
alter table public.pt_survey_responses enable row level security;
grant insert on public.pt_survey_responses to anon, authenticated;
create policy "anyone can respond" on public.pt_survey_responses for insert to anon, authenticated
  with check (status = 'New' and coalesce(matched_researcher,'') = '' and coalesce(coordinator_notes,'') = '' and researcher_id is null
              and length(full_name) between 2 and 200 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');
create policy "coordinator read" on public.pt_survey_responses for select to authenticated
  using (public.my_role() in ('admin','research_admin'));
create policy "coordinator update" on public.pt_survey_responses for update to authenticated
  using (public.my_role() in ('admin','research_admin')) with check (public.my_role() in ('admin','research_admin'));
create policy "coordinator delete" on public.pt_survey_responses for delete to authenticated
  using (public.my_role() in ('admin','research_admin'));

-- The Coordinator can add part-time faculty to the researcher list (to name them as co-authors).
drop policy if exists "researchers coordinator insert" on public.researchers;
create policy "researchers coordinator insert" on public.researchers for insert to authenticated
  with check (public.my_role() = 'research_admin');
