-- Research Navigator: saved results of the research tools (landscapes, ladders, assessments …).
-- "Bring your own AI": the app gathers verified sources and builds the request; the researcher runs it in their
-- own ChatGPT / Claude and pastes the answer back; the app checks every cited source before saving.
-- (Applied to the live database on 2026-10-04.)
create table if not exists public.navigator_outputs (
  id uuid primary key default gen_random_uuid(),
  work_id uuid references public.works(id) on delete cascade,      -- null = a researcher's own landscape
  tool text not null,
  title text not null default '',
  inputs jsonb not null default '{}'::jsonb,
  sources jsonb not null default '[]'::jsonb,                       -- the verified sources given to the AI
  response text not null default '',                                -- the AI's answer, as pasted
  verification jsonb not null default '{}'::jsonb,                  -- cited / unverified sources, DOIs found
  ai_used text not null default '',
  rating smallint,                                                  -- 1 helpful, -1 not helpful
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists navigator_outputs_work on public.navigator_outputs (work_id, created_at desc);
create index if not exists navigator_outputs_author on public.navigator_outputs (created_by, created_at desc);

-- Consent to send drafts of a paper to an AI service (given once per paper, by someone who can edit it).
alter table public.works add column if not exists ai_draft_consent_at timestamptz;
alter table public.works add column if not exists ai_draft_consent_by uuid references public.profiles(id);

alter table public.navigator_outputs enable row level security;

-- See: your own results, and results attached to papers you can see (works' own rules decide that).
drop policy if exists navigator_select on public.navigator_outputs;
create policy navigator_select on public.navigator_outputs for select to authenticated
  using (created_by = (select auth.uid())
         or (work_id is not null and exists (select 1 from public.works w where w.id = work_id)));
drop policy if exists navigator_insert on public.navigator_outputs;
create policy navigator_insert on public.navigator_outputs for insert to authenticated
  with check (created_by = (select auth.uid())
              and (work_id is null or exists (select 1 from public.works w where w.id = work_id)));
drop policy if exists navigator_update on public.navigator_outputs;
create policy navigator_update on public.navigator_outputs for update to authenticated
  using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));
drop policy if exists navigator_delete on public.navigator_outputs;
create policy navigator_delete on public.navigator_outputs for delete to authenticated
  using (created_by = (select auth.uid()));

-- Decisions the authors adopt from Research Navigator results (research question, theory, contribution, gap,
-- method, Journal Target Ladder, key references). Saved on the paper; same access rules as the paper itself.
alter table public.works add column if not exists navigator_decisions jsonb not null default '{}'::jsonb;
