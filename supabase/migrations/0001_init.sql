-- FBE Research & Publications — schema, roles, RLS
-- Run in Supabase SQL editor (or via CLI: supabase db push)

-- ========== ROLES ==========
-- admin      : Research Office / super-admin, full access
-- dean       : Dean / faculty-wide oversight, reviews department submissions
-- chair      : Department Chair, manages works + submission for own department(s)
-- committee  : Research committee member, reviews phases flagged committeeRequired
-- viewer     : Read-only (faculty / general staff)

create type user_role as enum ('admin','dean','chair','committee','viewer');
create type item_status as enum ('Not Started','In Progress','Completed','Blocked');

-- ========== PROFILES (extends auth.users) ==========
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role user_role not null default 'viewer',
  department text,               -- home department, relevant for 'chair'
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ========== MASTER DATA ==========
create table departments (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null unique,
  chair_name text default '',
  active boolean not null default true
);

create table researchers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  department text default '',
  type text default 'Internal',       -- Internal / External
  institution text default 'AUST',
  role text default 'Faculty',
  email text default '',
  active boolean not null default true
);

create table venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  full_name text default '',
  type text default 'Journal',        -- Journal / Conference
  publisher text default '',
  indexing text default '',
  quality text default '',            -- Q1-Q4 / Conference
  abs text default '',
  cite_score text default '',
  apc text default '',
  turnaround text default '',
  prior_publication_policy text default '',
  peer_review_process text default '',
  scope_fit_guidance text default '',
  verification_checklist jsonb not null default '{"indexing":false,"quality":false,"publisher":false,"fees":false,"peerReview":false,"scope":false}',
  verified_on date,
  verified_by text default '',
  floor boolean not null default false,
  active boolean not null default true
);

create table academic_years (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true
);

create table committee_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text default 'Member',
  active boolean not null default true
);

create table acceptance_targets (
  department text primary key,
  q1 int default 0,
  q2plus int default 2,
  q3plus int default 0,
  q4plus int default 0,
  conference int default 0
);

create table oversight_settings (
  id int primary key default 1,
  stale_days int not null default 21,
  severe_overdue_days int not null default 14,
  committee_pending_days int not null default 10,
  under_review_days int not null default 120,
  constraint singleton check (id = 1)
);
insert into oversight_settings (id) values (1);

create table lifecycle_template (
  id int primary key default 1,
  template jsonb not null default '[]',
  constraint singleton_lt check (id = 1)
);
insert into lifecycle_template (id) values (1);

-- ========== WORKS (papers / research outputs) ==========
create table works (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  department text not null,           -- primary department (accountable)
  departments text[] not null default '{}',  -- collaborating departments
  lead text default '',
  corresponding text default '',
  coauthors text[] not null default '{}',
  research_type text default '',
  research_maturity text default 'Not Classified',
  venue text default '',
  venue_quality text default '',
  submission_status text default 'Pre-Submission',
  stage text default '',
  academic_year text default '',
  start_date date,
  planned_submission date,
  actual_submission date,
  ethics text default 'N/A',
  funding jsonb not null default '{"funderName":"","grantReference":"","amountReceived":0}',
  venue_selection_rationale text default '',
  scope_match_confirmed boolean not null default false,
  author_guidelines_reviewed boolean not null default false,
  custom_fields jsonb not null default '[]',
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table phases (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references works(id) on delete cascade,
  name text not null,
  seq int not null default 0,
  optional boolean not null default false,
  committee_required boolean not null default false,
  planned_start date, planned_end date, actual_start date, actual_end date,
  status item_status not null default 'Not Started',
  progress int not null default 0,
  comments text default '',
  committee_status text default 'Pending',   -- Pending / Blessed / Changes Requested / Optional / Not Requested
  committee_date date,
  committee_comments text default ''
);

create table review_rounds (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references phases(id) on delete cascade,
  round int not null default 1,
  reviewer text default '',
  review_date date,
  status text default 'Pending',
  research_problem text default 'Not Assessed',
  methodology text default 'Not Assessed',
  submission_readiness text default 'Not Assessed',
  committee_comments text default '',
  researcher_response text default '',
  response_date date,
  created_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references phases(id) on delete cascade,
  name text not null,
  seq int not null default 0,
  owner text default '',
  status item_status not null default 'Not Started',
  progress int not null default 0,
  planned_start date, planned_end date, due date,
  comments text default ''
);

create table subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  name text not null,
  seq int not null default 0,
  owner text default '',
  status item_status not null default 'Not Started',
  progress int not null default 0,
  planned_start date, planned_end date, due date,
  comments text default ''
);

create table milestones (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references works(id) on delete cascade,
  name text not null,
  due date,
  status item_status not null default 'Not Started'
);

create table risks (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references works(id) on delete cascade,
  type text default 'Risk',        -- Risk / Issue
  impact text default 'Medium',    -- Low / Medium / High
  status text default 'Open',      -- Open / Closed
  description text default '',
  created_at timestamptz not null default now()
);

create table cost_entries (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references works(id) on delete cascade,
  description text default 'Research cost',
  amount numeric not null default 0,
  entry_date date
);

create table work_updates (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references works(id) on delete cascade,
  update_date date not null default current_date,
  note text default '',
  author text default ''
);

-- ========== SUBMISSIONS (department attestation workflow) ==========
create table submissions (
  department text primary key references departments(name),
  status text not null default 'Draft',     -- Draft / Submitted / Accepted / Returned
  prepared_by text default '',
  submitted_date date,
  comments text default '',
  attestation_confirmed boolean not null default false,
  attested_by text default '',
  attested_on date,
  sequence int not null default 0
);

create table submission_history (
  id uuid primary key default gen_random_uuid(),
  department text not null,
  sequence int not null,
  status text not null,
  by_whom text default '',
  event_date timestamptz not null default now(),
  comments text default ''
);

-- ========== updated_at trigger ==========
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;
create trigger works_set_updated_at before update on works
  for each row execute function set_updated_at();
