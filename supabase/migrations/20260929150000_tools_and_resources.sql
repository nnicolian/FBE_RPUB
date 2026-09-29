/*
# Tools & Resources (Research Strategy §2 "Tools, Resources & Techniques")
(Applied to the live database on 2026-09-29.)

1. resource_documents: the Research Strategy framework and Appendices 1–8 as readable pages.
   Audience 'all' = every signed-in user; 'leadership' = Admin, Research Coordinator and Dean.
   (The document text was loaded directly into the table; edit it in the app.)
2. Files attached to the Resources page (entity_type 'resource', e.g. the original Word files)
   are readable by every signed-in user; Admin and Coordinator upload them.
*/

create table if not exists public.resource_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  appendix text default '',
  description text default '',
  content text default '',
  audience text not null default 'all' check (audience in ('all','leadership')),
  sort int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.resource_documents enable row level security;
create policy "documents read" on public.resource_documents for select to authenticated using (
  public.my_role() is not null and (audience = 'all' or public.my_role() in ('admin','research_admin','dean')));
create policy "documents write" on public.resource_documents for all to authenticated
  using (public.my_role() in ('admin','research_admin')) with check (public.my_role() in ('admin','research_admin'));

drop policy if exists "attachments read" on public.attachments;
create policy "attachments read" on public.attachments for select to authenticated using (
  public.my_role() in ('admin','research_admin','dean') or uploaded_by = auth.uid()
  or (entity_type = 'resource' and public.my_role() is not null)
  or public.can_read_work(public.attachment_work(entity_type, entity_id)));
