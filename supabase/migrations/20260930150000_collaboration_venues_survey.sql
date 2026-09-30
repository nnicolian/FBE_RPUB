/*
# Research Coordinator's suggestions (Dr. Mayssam Daaboul, 30/09/2026)
(Applied to the live database on 2026-09-30.)
1. works.collaboration (other FBE department / other AUST faculty / other university / external or industry,
   or "None — independent research") and works.collaboration_partners (names of institutions / external co-authors).
2. Venue library: the Research Coordinator can add and edit venues (Admin already could).
3. Faculty survey open to full-time faculty: faculty_type, mentor_interest, ms_supervision, current_projects;
   the Coordinator can update researcher records (research areas, MS supervision) from responses.
The References Library is retired from the app; its data (research_themes, work_themes) is kept, unused.
*/
alter table public.works add column if not exists collaboration text[] not null default '{}';
alter table public.works add column if not exists collaboration_partners text not null default '';
alter table public.pt_survey_responses add column if not exists faculty_type text not null default 'Part-time';
alter table public.pt_survey_responses add column if not exists mentor_interest text default '';
alter table public.pt_survey_responses add column if not exists ms_supervision text default '';
alter table public.pt_survey_responses add column if not exists current_projects text default '';
drop policy if exists "venues coordinator write" on public.venues;
create policy "venues coordinator write" on public.venues for all to authenticated
  using (public.my_role() = 'research_admin') with check (public.my_role() = 'research_admin');
drop policy if exists "researchers coordinator update" on public.researchers;
create policy "researchers coordinator update" on public.researchers for update to authenticated
  using (public.my_role() = 'research_admin') with check (public.my_role() = 'research_admin');

-- 2026-09-30 (applied): Venue Library extended from the Research Coordinator's list — 74 new venues
-- (66 journals, 8 conferences) incl. two new fields, "Operations & Supply Chain" and "Crisis & Resilience".
-- 18 were already present and left unchanged, except the two "ABS to confirm" entries now filled in:
-- International Journal of Hospitality Management → ABS 3; Journal of Hospitality & Tourism Research → ABS 2.
