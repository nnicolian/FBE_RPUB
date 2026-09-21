-- Optional starter master data, edit freely before running.
insert into departments (code, name, active) values
  ('MGT','Management','t'), ('MKT','Marketing','t'), ('FIN','Finance','t'),
  ('ACC','Accounting','t'), ('ECO','Economics','t'), ('Dean / Faculty-wide','Dean / Faculty-wide','t')
on conflict (name) do nothing;

insert into academic_years (name, active) values ('2026–2027', true)
on conflict (name) do nothing;

-- After a user signs up via Supabase Auth, promote them to admin like this
-- (replace the email):
-- update profiles set role = 'admin', full_name = 'Research Office Admin'
-- where id = (select id from auth.users where email = 'you@aust.edu.lb');
