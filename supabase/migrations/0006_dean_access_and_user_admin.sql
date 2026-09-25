-- (Already applied to the live database on 2026-09-25.)
-- 1. Role "dean": read/write all research content in every department.
--    Settings and user accounts remain admin-only.
-- 2. Only admins may change anyone's role, department or active flag.
-- 3. Admin-only functions used by Configuration → Users & Roles.

do $$
declare t text;
begin
  foreach t in array array['works','phases','tasks','subtasks','milestones','risks','cost_entries',
                           'deliverables','work_updates','researchers','venues','review_rounds',
                           'submissions','submission_history','attachments','acceptance_targets']
  loop
    execute format('drop policy if exists "dean write all" on public.%I', t);
    execute format('create policy "dean write all" on public.%I for all to authenticated using (public.my_role() = ''dean''::user_role) with check (public.my_role() = ''dean''::user_role)', t);
  end loop;
end $$;

create or replace function public.profiles_guard_privileged()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() is distinct from 'admin'::user_role
     and (new.role is distinct from old.role
          or new.department is distinct from old.department
          or new.active is distinct from old.active) then
    raise exception 'Only an administrator can change roles, departments or account status.';
  end if;
  return new;
end $$;
revoke execute on function public.profiles_guard_privileged() from public, anon, authenticated;
drop trigger if exists profiles_guard_privileged on public.profiles;
create trigger profiles_guard_privileged before update on public.profiles
  for each row execute function public.profiles_guard_privileged();

create or replace function public.admin_create_user(p_email text, p_password text, p_full_name text, p_role user_role default 'dean', p_department text default null)
returns uuid language plpgsql security definer set search_path = public, extensions, auth as $$
declare new_id uuid := gen_random_uuid(); em text := lower(trim(p_email));
begin
  if public.my_role() is distinct from 'admin'::user_role then raise exception 'Only an administrator can add users.'; end if;
  if em is null or em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Please enter a valid email address.'; end if;
  if length(coalesce(p_password,'')) < 8 then raise exception 'The password must be at least 8 characters.'; end if;
  if exists (select 1 from auth.users where lower(email) = em) then raise exception 'A user with this email already exists.'; end if;
  insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,
    confirmation_token,recovery_token,email_change_token_new,email_change,email_change_token_current,phone_change,phone_change_token,reauthentication_token,is_sso_user,is_anonymous)
  values ('00000000-0000-0000-0000-000000000000',new_id,'authenticated','authenticated',em,crypt(p_password, gen_salt('bf',10)),now(),
    '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('full_name',p_full_name,'email_verified',true), now(), now(),
    '','','','','','','','',false,false);
  insert into auth.identities (id,provider_id,user_id,identity_data,provider,created_at,updated_at)
  values (gen_random_uuid(), new_id::text, new_id, jsonb_build_object('sub',new_id::text,'email',em,'email_verified',true,'phone_verified',false),'email',now(),now());
  insert into public.profiles (id, full_name, role, department, active)
  values (new_id, coalesce(nullif(trim(p_full_name),''), split_part(em,'@',1)), p_role, nullif(trim(p_department),''), true);
  return new_id;
end $$;

create or replace function public.admin_update_user(p_user_id uuid, p_full_name text, p_role user_role, p_department text, p_active boolean)
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if public.my_role() is distinct from 'admin'::user_role then raise exception 'Only an administrator can edit users.'; end if;
  if p_user_id = auth.uid() and (p_role <> 'admin' or not p_active) then raise exception 'You cannot remove your own admin access.'; end if;
  update public.profiles set full_name = coalesce(nullif(trim(p_full_name),''), full_name), role = p_role,
    department = nullif(trim(p_department),''), active = p_active where id = p_user_id;
  if not found then raise exception 'User not found.'; end if;
  update auth.users set banned_until = case when p_active then null else 'infinity'::timestamptz end, updated_at = now() where id = p_user_id;
end $$;

create or replace function public.admin_reset_user_password(p_user_id uuid, p_password text)
returns void language plpgsql security definer set search_path = public, extensions, auth as $$
begin
  if public.my_role() is distinct from 'admin'::user_role then raise exception 'Only an administrator can reset passwords.'; end if;
  if length(coalesce(p_password,'')) < 8 then raise exception 'The password must be at least 8 characters.'; end if;
  update auth.users set encrypted_password = crypt(p_password, gen_salt('bf',10)), updated_at = now() where id = p_user_id;
  if not found then raise exception 'User not found.'; end if;
end $$;

create or replace function public.admin_delete_user(p_user_id uuid)
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if public.my_role() is distinct from 'admin'::user_role then raise exception 'Only an administrator can remove users.'; end if;
  if p_user_id = auth.uid() then raise exception 'You cannot remove your own account.'; end if;
  begin
    delete from public.profiles where id = p_user_id;
    delete from auth.identities where user_id = p_user_id;
    delete from auth.users where id = p_user_id;
  exception when foreign_key_violation then
    raise exception 'This user is linked to existing records, so they can''t be removed. Deactivate them instead.';
  end;
end $$;

create or replace function public.admin_list_users()
returns table (id uuid, email text, full_name text, role user_role, department text, active boolean, created_at timestamptz, last_sign_in_at timestamptz)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if public.my_role() is distinct from 'admin'::user_role then raise exception 'Only an administrator can list users.'; end if;
  return query select p.id, u.email::text, p.full_name, p.role, p.department, p.active, p.created_at, u.last_sign_in_at
    from public.profiles p join auth.users u on u.id = p.id order by p.full_name;
end $$;

do $$ declare f text; begin
  foreach f in array array['admin_create_user(text,text,text,user_role,text)','admin_update_user(uuid,text,user_role,text,boolean)',
    'admin_reset_user_password(uuid,text)','admin_delete_user(uuid)','admin_list_users()'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Role "research_admin" (added 2026-09-25): admin rights on all research content
-- and system settings, but NOT user accounts. First holder: Dr. Mayssam Daaboul.
-- ---------------------------------------------------------------------------
alter type public.user_role add value if not exists 'research_admin' after 'admin';
-- (run the enum change on its own first; the rest in a second step)

create or replace function public.profiles_guard_privileged()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() is null only for server-side maintenance (migrations, dashboard SQL).
  if auth.uid() is not null
     and public.my_role() is distinct from 'admin'::user_role
     and (new.role is distinct from old.role
          or new.department is distinct from old.department
          or new.active is distinct from old.active) then
    raise exception 'Only an administrator can change roles, departments or account status.';
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['works','phases','tasks','subtasks','milestones','risks','cost_entries',
                           'deliverables','work_updates','researchers','venues','review_rounds',
                           'submissions','submission_history','attachments','acceptance_targets',
                           'academic_years','departments','committee_members','lifecycle_template','oversight_settings']
  loop
    execute format('drop policy if exists "research admin all" on public.%I', t);
    execute format('create policy "research admin all" on public.%I for all to authenticated using (public.my_role() = ''research_admin''::user_role) with check (public.my_role() = ''research_admin''::user_role)', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- (Added 2026-09-25) Configuration is admin-only, and papers can copy another
-- paper's lifecycle hierarchy when created.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['researchers','venues','acceptance_targets','academic_years','departments',
                           'committee_members','lifecycle_template','oversight_settings']
  loop
    execute format('drop policy if exists "dean write all" on public.%I', t);
    execute format('drop policy if exists "research admin all" on public.%I', t);
  end loop;
end $$;
drop policy if exists "researchers write" on public.researchers;
create policy "researchers write" on public.researchers for all to authenticated
  using (public.my_role() = 'admin'::user_role) with check (public.my_role() = 'admin'::user_role);
drop policy if exists "venues write" on public.venues;
create policy "venues write" on public.venues for all to authenticated
  using (public.my_role() = 'admin'::user_role) with check (public.my_role() = 'admin'::user_role);
drop policy if exists "targets write" on public.acceptance_targets;
create policy "targets write" on public.acceptance_targets for all to authenticated
  using (public.my_role() = 'admin'::user_role) with check (public.my_role() = 'admin'::user_role);

create or replace function public.copy_work_hierarchy(p_source_work uuid, p_target_work uuid, p_owner text default '')
returns integer language plpgsql security invoker set search_path = public as $$
declare ph record; tk record; new_phase uuid; new_task uuid; n int := 0; first_seq int;
begin
  if p_source_work = p_target_work then raise exception 'Choose a different paper to copy from.'; end if;
  if exists (select 1 from phases where work_id = p_target_work) then
    raise exception 'This paper already has a hierarchy.';
  end if;
  select min(seq) into first_seq from phases where work_id = p_source_work;
  for ph in select * from phases where work_id = p_source_work order by seq, name loop
    insert into phases (work_id, name, seq, optional, committee_required, status, comments, committee_status)
    values (p_target_work, ph.name, ph.seq, ph.optional, ph.committee_required,
            case when ph.seq = first_seq then 'In Progress' else 'Not Started' end::item_status,
            ph.comments, case when ph.committee_required then 'Pending' else 'Optional / Not Requested' end)
    returning id into new_phase;
    n := n + 1;
    for tk in select * from tasks where phase_id = ph.id order by seq, name loop
      insert into tasks (phase_id, name, seq, owner, comments)
      values (new_phase, tk.name, tk.seq, coalesce(p_owner, ''), tk.comments)
      returning id into new_task;
      insert into subtasks (task_id, name, seq, owner, comments)
      select new_task, s.name, s.seq, coalesce(p_owner, ''), s.comments from subtasks s where s.task_id = tk.id order by s.seq, s.name;
    end loop;
  end loop;
  return n;
end $$;
revoke execute on function public.copy_work_hierarchy(uuid, uuid, text) from public, anon;
grant execute on function public.copy_work_hierarchy(uuid, uuid, text) to authenticated;
