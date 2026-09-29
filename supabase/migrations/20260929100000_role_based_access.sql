/*
# Role-based access (Research Strategy §5 "Role-Based Access")
(Applied to the live database on 2026-09-29. The enum value 'author' was added
 first, on its own: alter type public.user_role add value if not exists 'author' after 'chair';)

  admin           – full access, including Configuration and users
  research_admin  – Research Coordinator: reads and edits every paper (no user management)
  dean            – read-only oversight of every paper
  chair           – reads and edits papers of their department
  author          – reads and edits only their own papers
Everyone (chairs included) can also read and edit the papers they author.
A paper is "yours" when you created it, or your linked researcher name is its lead or a co-author.
Deactivated accounts get no access at all.
*/

-- ---------- link logins to researcher names ----------
alter table public.researchers add column if not exists profile_id uuid references public.profiles(id) on delete set null;

-- Inactive accounts have no role, so every policy denies them.
create or replace function public.my_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid() and active;
$$;

create or replace function public.is_my_work(w_created_by uuid, w_lead text, w_coauthors text[])
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and public.my_role() is not null and (
    w_created_by = auth.uid()
    or exists (select 1 from researchers r where r.profile_id = auth.uid()
               and (r.name = w_lead or r.name = any(coalesce(w_coauthors, '{}'))))
  );
$$;

create or replace function public.can_read_work_row(w works)
returns boolean language sql stable security definer set search_path = public as $$
  select public.my_role() in ('admin','research_admin','dean')
      or (public.my_role() = 'chair' and public.work_in_my_department(w.department, w.departments))
      or public.is_my_work(w.created_by, w.lead, w.coauthors);
$$;

create or replace function public.can_write_work_row(w works)
returns boolean language sql stable security definer set search_path = public as $$
  select public.my_role() in ('admin','research_admin')
      or (public.my_role() = 'chair' and public.work_in_my_department(w.department, w.departments))
      or (public.my_role() in ('chair','author') and public.is_my_work(w.created_by, w.lead, w.coauthors));
$$;

create or replace function public.can_read_work(p_work uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select public.can_read_work_row(w) from works w where w.id = p_work), false);
$$;
create or replace function public.can_write_work(p_work uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select public.can_write_work_row(w) from works w where w.id = p_work), false);
$$;

create or replace function public.phase_work(p_phase uuid) returns uuid
language sql stable security definer set search_path = public as $$ select work_id from phases where id = p_phase $$;
create or replace function public.task_work(p_task uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select p.work_id from tasks t join phases p on p.id = t.phase_id where t.id = p_task $$;

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
  end $$;

do $$ declare f text; begin
  foreach f in array array['is_my_work(uuid,text,text[])','can_read_work_row(works)','can_write_work_row(works)',
    'can_read_work(uuid)','can_write_work(uuid)','phase_work(uuid)','task_work(uuid)','attachment_work(text,uuid)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- ---------- drop every existing policy on research content ----------
do $$ declare r record; begin
  for r in select tablename, policyname from pg_policies where schemaname = 'public'
    and tablename in ('works','phases','tasks','subtasks','milestones','risks','cost_entries','deliverables',
                      'work_updates','attachments','review_rounds','submissions','submission_history')
  loop execute format('drop policy %I on public.%I', r.policyname, r.tablename); end loop;
end $$;

-- ---------- works ----------
create policy "works read" on public.works for select to authenticated using (public.can_read_work_row(works));
create policy "works insert" on public.works for insert to authenticated with check (
  public.my_role() in ('admin','research_admin')
  or (public.my_role() = 'chair' and department = public.my_department())
  or (public.my_role() in ('chair','author') and created_by = auth.uid()));
create policy "works update" on public.works for update to authenticated
  using (public.can_write_work_row(works)) with check (public.can_write_work_row(works));
create policy "works delete" on public.works for delete to authenticated using (
  public.my_role() in ('admin','research_admin')
  or (public.my_role() = 'chair' and public.work_in_my_department(department, departments))
  or (public.my_role() in ('chair','author') and created_by = auth.uid()));

-- ---------- tables hanging directly off a work ----------
do $$ declare t text; begin
  foreach t in array array['phases','milestones','risks','cost_entries','deliverables','work_updates'] loop
    execute format('create policy "read via work" on public.%I for select to authenticated using (public.can_read_work(work_id))', t);
    execute format('create policy "write via work" on public.%I for all to authenticated using (public.can_write_work(work_id)) with check (public.can_write_work(work_id))', t);
  end loop;
end $$;

create policy "read via work" on public.tasks for select to authenticated using (public.can_read_work(public.phase_work(phase_id)));
create policy "write via work" on public.tasks for all to authenticated
  using (public.can_write_work(public.phase_work(phase_id))) with check (public.can_write_work(public.phase_work(phase_id)));

create policy "read via work" on public.subtasks for select to authenticated using (public.can_read_work(public.task_work(task_id)));
create policy "write via work" on public.subtasks for all to authenticated
  using (public.can_write_work(public.task_work(task_id))) with check (public.can_write_work(public.task_work(task_id)));

-- Retired (no approvals): readable for the record, no longer writable except by admin / coordinator.
create policy "read via work" on public.review_rounds for select to authenticated using (public.can_read_work(public.phase_work(phase_id)));
create policy "coordinator write" on public.review_rounds for all to authenticated
  using (public.my_role() in ('admin','research_admin')) with check (public.my_role() in ('admin','research_admin'));
create policy "oversight read" on public.submissions for select to authenticated using (public.my_role() in ('admin','research_admin','dean'));
create policy "coordinator write" on public.submissions for all to authenticated
  using (public.my_role() in ('admin','research_admin')) with check (public.my_role() in ('admin','research_admin'));
create policy "oversight read" on public.submission_history for select to authenticated using (public.my_role() in ('admin','research_admin','dean'));
create policy "coordinator write" on public.submission_history for all to authenticated
  using (public.my_role() in ('admin','research_admin')) with check (public.my_role() in ('admin','research_admin'));

-- ---------- attachments (file records) ----------
create policy "attachments read" on public.attachments for select to authenticated using (
  public.my_role() in ('admin','research_admin','dean') or uploaded_by = auth.uid()
  or public.can_read_work(public.attachment_work(entity_type, entity_id)));
create policy "attachments insert" on public.attachments for insert to authenticated with check (
  public.my_role() in ('admin','research_admin')
  or public.can_write_work(public.attachment_work(entity_type, entity_id)));
create policy "attachments delete" on public.attachments for delete to authenticated using (
  public.my_role() in ('admin','research_admin') or uploaded_by = auth.uid());

-- ---------- role assignments (2026-09-29) ----------
update public.profiles p set role = v.role::user_role, department = v.dept, active = true
from (values
  ('nnicolian@aust.edu.lb','admin',null),
  ('mdaaboul@aust.edu.lb','research_admin',null),
  ('makaram@aust.edu.lb','chair','Hospitality Management'),
  ('rhage@aust.edu.lb','chair','Management'),
  ('rhassoun@aust.edu.lb','author',null),
  ('cakhras@aust.edu.lb','author',null),
  ('jbahmad@aust.edu.lb','author',null),
  ('gkazzy@aust.edu.lb','author',null),
  ('izeineddine@aust.edu.lb','author',null)
) v(email, role, dept), auth.users u
where u.id = p.id and lower(u.email) = v.email;

-- No access: deactivated (kept, not deleted, so they can be re-enabled later).
update public.profiles p set role = 'viewer', active = false
from auth.users u where u.id = p.id and lower(u.email) in
  ('atazian@aust.edu.lb','ctabet@aust.edu.lb','mgermany@aust.edu.lb','ssader@aust.edu.lb');
update auth.users set banned_until = 'infinity' where lower(email) in
  ('atazian@aust.edu.lb','ctabet@aust.edu.lb','mgermany@aust.edu.lb','ssader@aust.edu.lb');

-- Researcher names used on papers → logins
update public.researchers r set profile_id = u.id
from (values ('Nicolian','nnicolian@aust.edu.lb'),('Daaboul','mdaaboul@aust.edu.lb'),('Karam','makaram@aust.edu.lb'),
             ('Hassoun','rhassoun@aust.edu.lb'),('Akhras','cakhras@aust.edu.lb'),('Bahmad','jbahmad@aust.edu.lb'),
             ('Kazzi','gkazzy@aust.edu.lb')) v(name, email), auth.users u
where r.name = v.name and lower(u.email) = v.email;
