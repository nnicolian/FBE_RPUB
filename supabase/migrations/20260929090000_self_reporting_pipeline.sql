/*
# Self-reporting 4-phase pipeline (Research Strategy, Appendix 6)
(Applied to the live database on 2026-09-29.)

1. No approvals: committee review is switched off on every phase and in the
   template. Old committee / review / department-submission tables are kept
   (nothing deleted) but no longer used by the app.
2. New pipeline: 1. Initiate → 2. Build → 3. Refine → 4. Publish, each with the
   4 sub-tasks from Appendix 6. Each sub-task carries its "What 100% looks like"
   text as guidance.
3. Authors report a percentage per sub-task. A trigger rolls it up automatically:
   sub-task status, phase progress/status/dates (milestone = phase reaches 100%),
   the paper's Pipeline Phase (works.stage) and its last-progress time.
4. A paper is flagged when it hasn't moved for 30 days.
5. The 12 existing papers (whose phases were empty) were rebuilt on the new
   pipeline, carried over from their previous stage and submission status.
*/

-- ---------- columns ----------
alter table public.tasks add column if not exists guidance text default '';
alter table public.tasks add column if not exists updated_at timestamptz not null default now();
alter table public.works add column if not exists last_progress_at timestamptz;

-- ---------- master template ----------
update public.lifecycle_template set template = '[
 {"id":"p1","name":"1. Initiate","optional":false,"committeeRequired":false,
  "instructions":"Milestone: paper formally entered into the pipeline and visible to the Research Coordinator and Dean.",
  "tasks":[
   {"id":"t11","name":"1.1 Define the research question and scope","instructions":"A clear, focused research question is written and agreed with co-authors or supervisor.","subtasks":[]},
   {"id":"t12","name":"1.2 Select target journal","instructions":"A Scopus-indexed journal has been identified; its scope, quartile, and ABS rating confirmed.","subtasks":[]},
   {"id":"t13","name":"1.3 Draft the paper outline","instructions":"A structured outline (sections, key arguments, proposed methodology) is complete.","subtasks":[]},
   {"id":"t14","name":"1.4 Confirm co-authors and roles","instructions":"All authors are named; each person''s contribution is agreed and documented.","subtasks":[]}]},
 {"id":"p2","name":"2. Build","optional":false,"committeeRequired":false,
  "instructions":"Milestone: full draft completed and shared internally.",
  "tasks":[
   {"id":"t21","name":"2.1 Complete the literature review","instructions":"All key sources reviewed; gaps identified; theoretical framework established.","subtasks":[]},
   {"id":"t22","name":"2.2 Finalise methodology","instructions":"Research design, data collection method, and analytical approach are confirmed.","subtasks":[]},
   {"id":"t23","name":"2.3 Collect and analyse data","instructions":"Data collected, cleaned, and fully analysed; results are ready to write up.","subtasks":[]},
   {"id":"t24","name":"2.4 Write the first full draft","instructions":"A complete manuscript exists: introduction through conclusion, references included.","subtasks":[]}]},
 {"id":"p3","name":"3. Refine","optional":false,"committeeRequired":false,
  "instructions":"Milestone: paper ready for submission.",
  "tasks":[
   {"id":"t31","name":"3.1 Conduct internal peer review","instructions":"Draft has been read and commented on by a colleague not on the author list.","subtasks":[]},
   {"id":"t32","name":"3.2 Incorporate feedback and revise","instructions":"All substantive comments addressed; manuscript updated accordingly.","subtasks":[]},
   {"id":"t33","name":"3.3 Format to journal guidelines","instructions":"Paper length, structure, citation style, and layout match the target journal''s author guidelines exactly.","subtasks":[]},
   {"id":"t34","name":"3.4 Prepare submission materials","instructions":"Cover letter written; author bios, conflict of interest statements, and any required declarations are ready.","subtasks":[]}]},
 {"id":"p4","name":"4. Publish","optional":false,"committeeRequired":false,
  "instructions":"Milestone: publication confirmed — paper counts toward the Faculty KPI.",
  "tasks":[
   {"id":"t41","name":"4.1 Submit to target journal","instructions":"Submission confirmed; journal reference number received.","subtasks":[]},
   {"id":"t42","name":"4.2 Respond to reviewer comments","instructions":"Reviewer comments received and fully addressed in a point-by-point response letter.","subtasks":[]},
   {"id":"t43","name":"4.3 Submit revised manuscript","instructions":"Revised paper resubmitted to the journal; revision confirmed.","subtasks":[]},
   {"id":"t44","name":"4.4 Confirm acceptance and publication","instructions":"Acceptance letter received; paper assigned DOI or publication date.","subtasks":[]}]}
]'::jsonb where id = 1;

update public.oversight_settings set stale_days = 30 where id = 1;
update public.phases set committee_required = false, committee_status = 'Optional / Not Requested';

-- ---------- automatic roll-up ----------
create or replace function public.task_set_status()
returns trigger language plpgsql as $$
begin
  new.progress := greatest(0, least(100, coalesce(new.progress, 0)));
  if new.progress = 100 then new.status := 'Completed';
  elsif new.status = 'Blocked' then null;
  elsif new.progress > 0 then new.status := 'In Progress';
  else new.status := 'Not Started';
  end if;
  if new.progress > 0 and new.actual_start is null then new.actual_start := current_date; end if;
  if new.progress = 100 and new.actual_end is null then new.actual_end := current_date; end if;
  if new.progress < 100 then new.actual_end := null; end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists task_set_status on public.tasks;
create trigger task_set_status before insert or update of progress, status on public.tasks
  for each row execute function public.task_set_status();

create or replace function public.rollup_work_progress(p_work uuid)
returns void language plpgsql security definer set search_path = public as $$
declare ph record; avg_p int; cur text;
begin
  for ph in select id from phases where work_id = p_work loop
    select coalesce(round(avg(progress)), 0) into avg_p from tasks where phase_id = ph.id;
    update phases set
      progress = avg_p,
      status = (case when avg_p = 100 then 'Completed' when avg_p > 0 then 'In Progress' else 'Not Started' end)::item_status,
      actual_start = case when avg_p > 0 then coalesce(actual_start, current_date) else actual_start end,
      actual_end = case when avg_p = 100 then coalesce(actual_end, current_date) else null end
    where id = ph.id;
  end loop;
  -- Pipeline Phase = first phase not yet at 100%; "Published" when all are complete.
  select regexp_replace(name, '^\d+\.\s*', '') into cur
    from phases where work_id = p_work and progress < 100 order by seq limit 1;
  update works set stage = coalesce(cur, case when exists (select 1 from phases where work_id = p_work) then 'Published' else stage end),
                   last_progress_at = now()
   where id = p_work;
end $$;

create or replace function public.tasks_after_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare w uuid;
begin
  select work_id into w from phases where id = coalesce(new.phase_id, old.phase_id);
  if w is not null then perform public.rollup_work_progress(w); end if;
  return null;
end $$;

drop trigger if exists tasks_after_change on public.tasks;
create trigger tasks_after_change after insert or update of progress, status or delete on public.tasks
  for each row execute function public.tasks_after_change();

-- Copying another paper's hierarchy: carry guidance, no committee review.
create or replace function public.copy_work_hierarchy(p_source_work uuid, p_target_work uuid, p_owner text default '')
returns integer language plpgsql security invoker set search_path = public as $$
declare ph record; tk record; new_phase uuid; new_task uuid; n int := 0;
begin
  if p_source_work = p_target_work then raise exception 'Choose a different paper to copy from.'; end if;
  if exists (select 1 from phases where work_id = p_target_work) then
    raise exception 'This paper already has a hierarchy.';
  end if;
  for ph in select * from phases where work_id = p_source_work order by seq, name loop
    insert into phases (work_id, name, seq, optional, committee_required, status, comments, committee_status)
    values (p_target_work, ph.name, ph.seq, ph.optional, false, 'Not Started', ph.comments, 'Optional / Not Requested')
    returning id into new_phase;
    n := n + 1;
    for tk in select * from tasks where phase_id = ph.id order by seq, name loop
      insert into tasks (phase_id, name, seq, owner, comments, guidance)
      values (new_phase, tk.name, tk.seq, coalesce(p_owner, ''), '', tk.guidance)
      returning id into new_task;
      insert into subtasks (task_id, name, seq, owner, comments)
      select new_task, s.name, s.seq, coalesce(p_owner, ''), s.comments from subtasks s where s.task_id = tk.id order by s.seq, s.name;
    end loop;
  end loop;
  perform public.rollup_work_progress(p_target_work);
  return n;
end $$;
revoke execute on function public.copy_work_hierarchy(uuid, uuid, text) from public, anon;
grant execute on function public.copy_work_hierarchy(uuid, uuid, text) to authenticated;
revoke execute on function public.rollup_work_progress(uuid) from public, anon;
grant execute on function public.rollup_work_progress(uuid) to authenticated;

-- ---------- rebuild the existing papers on the new pipeline ----------
-- Their old phases were empty shells (no tasks, dates or comments), so nothing is lost.
do $$
declare w record; tp jsonb; tk jsonb; i int; j int; new_phase uuid; prog int; lvl text;
begin
  select template into tp from lifecycle_template where id = 1;
  for w in select * from works loop
    if exists (select 1 from tasks t join phases p on p.id = t.phase_id where p.work_id = w.id) then continue; end if;
    delete from phases where work_id = w.id;
    -- carry-over level from the old stage / submission status
    lvl := case
      when w.submission_status = 'Published' then 'published'
      when w.submission_status = 'Accepted' then 'accepted'
      when w.submission_status in ('Submitted','Submitted Abstract','Under Review','R&R','Resubmitted') then 'submitted'
      when w.stage in ('Execution','Advisory Review') then 'build'
      else 'initiate' end;
    for i in 0 .. jsonb_array_length(tp) - 1 loop
      insert into phases (work_id, name, seq, optional, committee_required, status, comments, committee_status)
      values (w.id, tp->i->>'name', i, false, false, 'Not Started', coalesce(tp->i->>'instructions',''), 'Optional / Not Requested')
      returning id into new_phase;
      for j in 0 .. jsonb_array_length(tp->i->'tasks') - 1 loop
        tk := tp->i->'tasks'->j;
        prog := case lvl
          when 'published' then 100
          when 'accepted'  then case when i < 3 then 100 when j < 3 then 100 else 50 end
          when 'submitted' then case when i < 3 then 100 when j = 0 then 100 else 0 end
          when 'build'     then case when i = 0 then 100 else 0 end
          else 0 end;
        insert into tasks (phase_id, name, seq, owner, comments, guidance, progress)
        values (new_phase, tk->>'name', j, coalesce(w.lead,''), '', tk->>'instructions', prog);
      end loop;
    end loop;
    perform rollup_work_progress(w.id);
  end loop;
end $$;
