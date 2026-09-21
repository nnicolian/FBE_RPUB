-- Row Level Security for FBE Research & Publications
-- Model: admin (full) / dean (read-all, decide submissions) /
--        chair (manage own department's works + submission) /
--        committee (read works needing review, write review_rounds) /
--        viewer (read-only)

alter table profiles enable row level security;
alter table departments enable row level security;
alter table researchers enable row level security;
alter table venues enable row level security;
alter table academic_years enable row level security;
alter table committee_members enable row level security;
alter table acceptance_targets enable row level security;
alter table oversight_settings enable row level security;
alter table lifecycle_template enable row level security;
alter table works enable row level security;
alter table phases enable row level security;
alter table review_rounds enable row level security;
alter table tasks enable row level security;
alter table subtasks enable row level security;
alter table milestones enable row level security;
alter table risks enable row level security;
alter table cost_entries enable row level security;
alter table work_updates enable row level security;
alter table submissions enable row level security;
alter table submission_history enable row level security;

-- ---- helper functions (SECURITY DEFINER so they can read profiles regardless of RLS) ----
create or replace function my_role() returns user_role
language sql security definer stable as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function my_department() returns text
language sql security definer stable as $$
  select department from profiles where id = auth.uid();
$$;

create or replace function is_admin_or_dean() returns boolean
language sql security definer stable as $$
  select my_role() in ('admin','dean');
$$;

create or replace function work_in_my_department(w_department text, w_departments text[])
returns boolean language sql security definer stable as $$
  select my_role() = 'admin'
    or w_department = my_department()
    or my_department() = any(w_departments);
$$;

-- ---- profiles ----
create policy "profiles self read" on profiles for select using (id = auth.uid() or is_admin_or_dean());
create policy "profiles admin write" on profiles for insert with check (my_role() = 'admin');
create policy "profiles admin update" on profiles for update using (my_role() = 'admin' or id = auth.uid());
create policy "profiles admin delete" on profiles for delete using (my_role() = 'admin');

-- ---- master data: everyone signed in can read; only admin (and dean for targets) can write ----
create policy "master read" on departments for select using (auth.uid() is not null);
create policy "master write" on departments for all using (my_role() = 'admin') with check (my_role() = 'admin');

create policy "researchers read" on researchers for select using (auth.uid() is not null);
create policy "researchers write" on researchers for all using (my_role() in ('admin','chair')) with check (my_role() in ('admin','chair'));

create policy "venues read" on venues for select using (auth.uid() is not null);
create policy "venues write" on venues for all using (my_role() in ('admin','chair')) with check (my_role() in ('admin','chair'));

create policy "years read" on academic_years for select using (auth.uid() is not null);
create policy "years write" on academic_years for all using (my_role() = 'admin') with check (my_role() = 'admin');

create policy "committee read" on committee_members for select using (auth.uid() is not null);
create policy "committee write" on committee_members for all using (my_role() = 'admin') with check (my_role() = 'admin');

create policy "targets read" on acceptance_targets for select using (auth.uid() is not null);
create policy "targets write" on acceptance_targets for all using (is_admin_or_dean()) with check (is_admin_or_dean());

create policy "oversight read" on oversight_settings for select using (auth.uid() is not null);
create policy "oversight write" on oversight_settings for all using (my_role() = 'admin') with check (my_role() = 'admin');

create policy "lifecycle read" on lifecycle_template for select using (auth.uid() is not null);
create policy "lifecycle write" on lifecycle_template for all using (my_role() = 'admin') with check (my_role() = 'admin');

-- ---- works: chairs manage their own department's works; committee/dean/viewer read all; admin full ----
create policy "works read all" on works for select using (auth.uid() is not null);
create policy "works insert" on works for insert with check (
  my_role() = 'admin' or (my_role() = 'chair' and department = my_department())
);
create policy "works update" on works for update using (
  my_role() = 'admin' or (my_role() = 'chair' and work_in_my_department(department, departments))
);
create policy "works delete" on works for delete using (
  my_role() = 'admin' or (my_role() = 'chair' and department = my_department())
);

-- ---- phases / tasks / subtasks: follow parent work's department rule; committee can update committee fields ----
create policy "phases read" on phases for select using (auth.uid() is not null);
create policy "phases write" on phases for all using (
  my_role() = 'admin'
  or my_role() = 'committee'
  or (my_role() = 'chair' and exists (
        select 1 from works w where w.id = phases.work_id
        and work_in_my_department(w.department, w.departments)))
) with check (
  my_role() = 'admin'
  or my_role() = 'committee'
  or (my_role() = 'chair' and exists (
        select 1 from works w where w.id = phases.work_id
        and work_in_my_department(w.department, w.departments)))
);

create policy "review_rounds read" on review_rounds for select using (auth.uid() is not null);
create policy "review_rounds write" on review_rounds for all using (
  my_role() in ('admin','committee')
) with check (my_role() in ('admin','committee'));

create policy "tasks read" on tasks for select using (auth.uid() is not null);
create policy "tasks write" on tasks for all using (
  my_role() = 'admin' or (my_role() = 'chair' and exists (
    select 1 from phases p join works w on w.id = p.work_id
    where p.id = tasks.phase_id and work_in_my_department(w.department, w.departments)))
) with check (
  my_role() = 'admin' or (my_role() = 'chair' and exists (
    select 1 from phases p join works w on w.id = p.work_id
    where p.id = tasks.phase_id and work_in_my_department(w.department, w.departments)))
);

create policy "subtasks read" on subtasks for select using (auth.uid() is not null);
create policy "subtasks write" on subtasks for all using (
  my_role() = 'admin' or (my_role() = 'chair' and exists (
    select 1 from tasks t join phases p on p.id = t.phase_id join works w on w.id = p.work_id
    where t.id = subtasks.task_id and work_in_my_department(w.department, w.departments)))
) with check (
  my_role() = 'admin' or (my_role() = 'chair' and exists (
    select 1 from tasks t join phases p on p.id = t.phase_id join works w on w.id = p.work_id
    where t.id = subtasks.task_id and work_in_my_department(w.department, w.departments)))
);

-- ---- milestones / risks / cost_entries / updates: same department rule as works ----
create policy "milestones read" on milestones for select using (auth.uid() is not null);
create policy "milestones write" on milestones for all using (
  my_role() = 'admin' or (my_role() = 'chair' and exists (
    select 1 from works w where w.id = milestones.work_id and work_in_my_department(w.department, w.departments)))
) with check (
  my_role() = 'admin' or (my_role() = 'chair' and exists (
    select 1 from works w where w.id = milestones.work_id and work_in_my_department(w.department, w.departments)))
);

create policy "risks read" on risks for select using (auth.uid() is not null);
create policy "risks write" on risks for all using (
  my_role() = 'admin' or (my_role() = 'chair' and exists (
    select 1 from works w where w.id = risks.work_id and work_in_my_department(w.department, w.departments)))
) with check (
  my_role() = 'admin' or (my_role() = 'chair' and exists (
    select 1 from works w where w.id = risks.work_id and work_in_my_department(w.department, w.departments)))
);

create policy "costs read" on cost_entries for select using (auth.uid() is not null);
create policy "costs write" on cost_entries for all using (
  my_role() = 'admin' or (my_role() = 'chair' and exists (
    select 1 from works w where w.id = cost_entries.work_id and work_in_my_department(w.department, w.departments)))
) with check (
  my_role() = 'admin' or (my_role() = 'chair' and exists (
    select 1 from works w where w.id = cost_entries.work_id and work_in_my_department(w.department, w.departments)))
);

create policy "updates read" on work_updates for select using (auth.uid() is not null);
create policy "updates write" on work_updates for all using (
  my_role() = 'admin' or (my_role() = 'chair' and exists (
    select 1 from works w where w.id = work_updates.work_id and work_in_my_department(w.department, w.departments)))
) with check (
  my_role() = 'admin' or (my_role() = 'chair' and exists (
    select 1 from works w where w.id = work_updates.work_id and work_in_my_department(w.department, w.departments)))
);

-- ---- submissions: chair manages own department's draft; dean/admin decide (accept/return) ----
create policy "submissions read" on submissions for select using (auth.uid() is not null);
create policy "submissions chair write" on submissions for update using (
  my_role() = 'admin' or is_admin_or_dean() or (my_role() = 'chair' and department = my_department())
) with check (
  my_role() = 'admin' or is_admin_or_dean() or (my_role() = 'chair' and department = my_department())
);
create policy "submissions insert" on submissions for insert with check (my_role() = 'admin');

create policy "submission_history read" on submission_history for select using (auth.uid() is not null);
create policy "submission_history write" on submission_history for insert with check (
  my_role() = 'admin' or is_admin_or_dean() or (my_role() = 'chair' and department = my_department())
);
