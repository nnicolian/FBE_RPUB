-- Schema additions to reach feature parity with the original prototype:
-- deliverables, generic file attachments, extra date fields on tasks/subtasks,
-- and a few missing work-level fields.

-- ---- Extra fields on tasks/subtasks (actual start/end were missing) ----
alter table tasks add column if not exists actual_start date;
alter table tasks add column if not exists actual_end date;
alter table subtasks add column if not exists actual_start date;
alter table subtasks add column if not exists actual_end date;

-- ---- Deliverables (per work) ----
create table if not exists deliverables (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references works(id) on delete cascade,
  name text not null,
  status item_status not null default 'Not Started',
  created_at timestamptz not null default now()
);
alter table deliverables enable row level security;
create policy "deliverables read" on deliverables for select using (auth.uid() is not null);
create policy "deliverables write" on deliverables for all using (
  my_role() = 'admin' or (my_role() = 'chair' and exists (
    select 1 from works w where w.id = deliverables.work_id and work_in_my_department(w.department, w.departments)))
) with check (
  my_role() = 'admin' or (my_role() = 'chair' and exists (
    select 1 from works w where w.id = deliverables.work_id and work_in_my_department(w.department, w.departments)))
);

-- ---- Generic file attachments ----
-- entity_type identifies what this file is attached to: 'work' (research-level file),
-- 'phase', 'task', 'subtask', 'deliverable', 'cost_entry', 'review_round'.
-- entity_id is that row's id. Actual bytes live in Supabase Storage in the
-- 'attachments' bucket (create it once in the Supabase dashboard — see README);
-- this table just indexes what's there.
create table if not exists attachments (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  file_name text not null,
  storage_path text not null,
  uploaded_by uuid references profiles(id),
  uploaded_at timestamptz not null default now()
);
create index if not exists attachments_entity_idx on attachments(entity_type, entity_id);
alter table attachments enable row level security;
create policy "attachments read" on attachments for select using (auth.uid() is not null);
create policy "attachments write" on attachments for insert with check (auth.uid() is not null);
create policy "attachments delete" on attachments for delete using (
  my_role() = 'admin' or uploaded_by = auth.uid()
);

-- ---- Missing work-level fields (abstract, manuscript id, target submission) ----
alter table works add column if not exists abstract text default '';
alter table works add column if not exists manuscript_id text default '';
alter table works add column if not exists target_submission date;
alter table works add column if not exists author_order text default '';

-- ---- Missing fields on risks (title, action) and work_updates (status) ----
alter table risks add column if not exists title text default '';
alter table risks add column if not exists action text default '';
alter table work_updates add column if not exists status text default '';
