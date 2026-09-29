/*
# Faculty KPI (14 Scopus papers) and journal targeting (Research Strategy, Appendices 2 & 7)
(Applied to the live database on 2026-09-29.)

1. Each paper gets a KPI category (full-time independent / full-time collaborative /
   part-time co-authored / MS student), a Scopus flag, publication date and DOI.
2. Annual KPI targets per category (2026–2027: 6 / 2 / 2 / 4 = 14).
3. kpi_summary(year): faculty-wide counts for everyone to see (numbers only, no titles).
   A paper COUNTS when it is Published and Scopus-indexed; conference papers only when
   the proceedings are Scopus-indexed.
4. Venues: a Field column, and the Appendix 7 starter list (46 journals) loaded.
   A paper's Scopus flag follows its venue automatically when the venue is set.
*/

alter table public.works add column if not exists kpi_category text;
alter table public.works add column if not exists scopus_indexed boolean not null default false;
alter table public.works add column if not exists published_on date;
alter table public.works add column if not exists doi text default '';
alter table public.venues add column if not exists field text default '';

create table if not exists public.kpi_targets (
  academic_year text not null,
  category text not null,
  target int not null default 0,
  primary key (academic_year, category)
);
alter table public.kpi_targets enable row level security;
drop policy if exists "kpi targets read" on public.kpi_targets;
create policy "kpi targets read" on public.kpi_targets for select to authenticated using (auth.uid() is not null);
drop policy if exists "kpi targets write" on public.kpi_targets;
create policy "kpi targets write" on public.kpi_targets for all to authenticated
  using (public.my_role() in ('admin','research_admin')) with check (public.my_role() in ('admin','research_admin'));

insert into public.kpi_targets (academic_year, category, target) values
  ('2026–2027','FT Independent',6),('2026–2027','FT Collaborative',2),
  ('2026–2027','PT Co-authored',2),('2026–2027','MS Student',4)
on conflict (academic_year, category) do nothing;

-- Scopus flag follows the venue when the venue changes.
create or replace function public.works_venue_scopus()
returns trigger language plpgsql security definer set search_path = public as $$
declare idx text;
begin
  if tg_op = 'INSERT' or new.venue is distinct from old.venue then
    select indexing into idx from venues where lower(name) = lower(coalesce(new.venue,'')) or lower(full_name) = lower(coalesce(new.venue,'')) limit 1;
    if idx is not null then new.scopus_indexed := idx ilike '%scopus%'; end if;
  end if;
  return new;
end $$;
drop trigger if exists works_venue_scopus on public.works;
create trigger works_venue_scopus before insert or update of venue on public.works
  for each row execute function public.works_venue_scopus();

-- Faculty-wide KPI numbers, visible to every signed-in user (counts only).
create or replace function public.kpi_summary(p_year text)
returns table (category text, target int, counted int, accepted int, submitted int, in_progress int, not_counting int)
language sql stable security definer set search_path = public as $$
  with cats as (
    select t.category, t.target from kpi_targets t where t.academic_year = p_year
    union
    select distinct w.kpi_category, 0 from works w
     where w.academic_year = p_year and w.kpi_category is not null
       and not exists (select 1 from kpi_targets t where t.academic_year = p_year and t.category = w.kpi_category)
  )
  select c.category, c.target,
    count(w.id) filter (where w.submission_status = 'Published' and w.scopus_indexed)::int,
    count(w.id) filter (where w.submission_status = 'Accepted' and w.scopus_indexed)::int,
    count(w.id) filter (where w.submission_status in ('Submitted','Submitted Abstract','Under Review','R&R','Resubmitted') and w.scopus_indexed)::int,
    count(w.id) filter (where w.submission_status in ('Pre-Submission','Returned'))::int,
    count(w.id) filter (where not w.scopus_indexed and w.submission_status not in ('Pre-Submission','Returned'))::int
  from cats c
  left join works w on w.kpi_category = c.category and w.academic_year = p_year
  group by c.category, c.target
  order by case c.category when 'FT Independent' then 1 when 'FT Collaborative' then 2 when 'PT Co-authored' then 3 when 'MS Student' then 4 else 5 end;
$$;
revoke execute on function public.kpi_summary(text) from public, anon;
grant execute on function public.kpi_summary(text) to authenticated;

-- Existing journals are Scopus-indexed; the conference's proceedings are not yet confirmed.
update public.venues set indexing = 'Scopus' where name in ('EJIS','ECR','CAIS') and coalesce(indexing,'') = '';
update public.venues set field = 'MIS & Technology Management' where name in ('EJIS','CAIS','ECR') and coalesce(field,'') = '';

-- Appendix 7 starter list (verify current status before submission).
insert into public.venues (name, full_name, type, indexing, quality, abs, field, floor)
select * from (values
  ('Academy of Management Journal','Academy of Management Journal','Journal','Scopus','Q1','ABS 4*','Management & Organisational Behaviour',true),
  ('Journal of Management','Journal of Management','Journal','Scopus','Q1','ABS 4*','Management & Organisational Behaviour',true),
  ('Leadership Quarterly','Leadership Quarterly','Journal','Scopus','Q1','ABS 4','Management & Organisational Behaviour',true),
  ('Journal of Organizational Behavior','Journal of Organizational Behavior','Journal','Scopus','Q1','ABS 4','Management & Organisational Behaviour',true),
  ('Management Decision','Management Decision','Journal','Scopus','Q1','ABS 2','Management & Organisational Behaviour',true),
  ('International Journal of Management Reviews','International Journal of Management Reviews','Journal','Scopus','Q1','ABS 3','Management & Organisational Behaviour',true),
  ('Journal of Business Research','Journal of Business Research','Journal','Scopus','Q1','ABS 3','Management & Organisational Behaviour',true),
  ('Journal of Marketing','Journal of Marketing','Journal','Scopus','Q1','ABS 4*','Marketing & Consumer Behaviour',true),
  ('Journal of Consumer Research','Journal of Consumer Research','Journal','Scopus','Q1','ABS 4*','Marketing & Consumer Behaviour',true),
  ('Journal of the Academy of Marketing Science','Journal of the Academy of Marketing Science','Journal','Scopus','Q1','ABS 4','Marketing & Consumer Behaviour',true),
  ('International Journal of Research in Marketing','International Journal of Research in Marketing','Journal','Scopus','Q1','ABS 3','Marketing & Consumer Behaviour',true),
  ('Journal of Retailing','Journal of Retailing','Journal','Scopus','Q1','ABS 3','Marketing & Consumer Behaviour',true),
  ('Journal of Interactive Marketing','Journal of Interactive Marketing','Journal','Scopus','Q1','ABS 3','Marketing & Consumer Behaviour',true),
  ('Marketing Letters','Marketing Letters','Journal','Scopus','Q1','ABS 2','Marketing & Consumer Behaviour',true),
  ('Journal of Finance','Journal of Finance','Journal','Scopus','Q1','ABS 4*','Finance & Accounting',true),
  ('Journal of Financial Economics','Journal of Financial Economics','Journal','Scopus','Q1','ABS 4*','Finance & Accounting',true),
  ('Accounting, Organizations and Society','Accounting, Organizations and Society','Journal','Scopus','Q1','ABS 4','Finance & Accounting',true),
  ('Journal of Accounting and Economics','Journal of Accounting and Economics','Journal','Scopus','Q1','ABS 4','Finance & Accounting',true),
  ('International Journal of Finance and Economics','International Journal of Finance and Economics','Journal','Scopus','Q1','ABS 2','Finance & Accounting',true),
  ('Journal of Corporate Finance','Journal of Corporate Finance','Journal','Scopus','Q1','ABS 3','Finance & Accounting',true),
  ('Finance Research Letters','Finance Research Letters','Journal','Scopus','Q1','ABS 2','Finance & Accounting',true),
  ('American Economic Review','American Economic Review','Journal','Scopus','Q1','ABS 4*','Economics',true),
  ('Journal of Economic Perspectives','Journal of Economic Perspectives','Journal','Scopus','Q1','ABS 4*','Economics',true),
  ('Journal of Development Economics','Journal of Development Economics','Journal','Scopus','Q1','ABS 4','Economics',true),
  ('Economic Modelling','Economic Modelling','Journal','Scopus','Q1','ABS 2','Economics',true),
  ('Journal of Policy Modeling','Journal of Policy Modeling','Journal','Scopus','Q1','ABS 2','Economics',true),
  ('Middle East Development Journal','Middle East Development Journal','Journal','Scopus','Q2','ABS 1','Economics',true),
  ('MIS Quarterly','MIS Quarterly','Journal','Scopus','Q1','ABS 4*','MIS & Technology Management',true),
  ('Information Systems Research','Information Systems Research','Journal','Scopus','Q1','ABS 4*','MIS & Technology Management',true),
  ('Journal of Management Information Systems','Journal of Management Information Systems','Journal','Scopus','Q1','ABS 4','MIS & Technology Management',true),
  ('Computers in Human Behavior','Computers in Human Behavior','Journal','Scopus','Q1','ABS 2','MIS & Technology Management',true),
  ('Telematics and Informatics','Telematics and Informatics','Journal','Scopus','Q1','ABS 2','MIS & Technology Management',true),
  ('International Journal of Information Management','International Journal of Information Management','Journal','Scopus','Q1','ABS 2','MIS & Technology Management',true),
  ('Tourism Management','Tourism Management','Journal','Scopus','Q1','ABS 4','Hospitality Management',true),
  ('Annals of Tourism Research','Annals of Tourism Research','Journal','Scopus','Q1','ABS 4','Hospitality Management',true),
  ('Journal of Travel Research','Journal of Travel Research','Journal','Scopus','Q1','ABS 4','Hospitality Management',true),
  ('International Journal of Hospitality Management','International Journal of Hospitality Management','Journal','Scopus','Q1','ABS to confirm','Hospitality Management',true),
  ('Cornell Hospitality Quarterly','Cornell Hospitality Quarterly','Journal','Scopus','Q1','ABS to confirm','Hospitality Management',true),
  ('Journal of Hospitality & Tourism Research','Journal of Hospitality & Tourism Research','Journal','Scopus','Q1','ABS to confirm','Hospitality Management',true),
  ('Journal of Hospitality and Tourism Management','Journal of Hospitality and Tourism Management','Journal','Scopus','Q1','ABS to confirm','Hospitality Management',true),
  ('Journal of Business Venturing','Journal of Business Venturing','Journal','Scopus','Q1','ABS 4','Entrepreneurship',true),
  ('Entrepreneurship Theory and Practice','Entrepreneurship Theory and Practice','Journal','Scopus','Q1','ABS 4','Entrepreneurship',true),
  ('Small Business Economics','Small Business Economics','Journal','Scopus','Q1','ABS 3','Entrepreneurship',true),
  ('International Entrepreneurship and Management Journal','International Entrepreneurship and Management Journal','Journal','Scopus','Q1','ABS 2','Entrepreneurship',true),
  ('Journal of Small Business Management','Journal of Small Business Management','Journal','Scopus','Q1','ABS 3','Entrepreneurship',true)
) v(name, full_name, type, indexing, quality, abs, field, floor)
where not exists (select 1 from public.venues x where lower(x.name) = lower(v.name) or lower(x.full_name) = lower(v.name));

-- Existing papers: all current authors are full-time faculty working independently or across
-- departments, so they start as "FT Independent" (review and change where needed).
update public.works set kpi_category = 'FT Independent' where kpi_category is null;
update public.works w set scopus_indexed = coalesce(v.indexing ilike '%scopus%', false)
from public.venues v where lower(v.name) = lower(w.venue);
