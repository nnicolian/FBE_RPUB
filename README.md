# FBE Research & Publications

Full-stack app for the FBE Research & Publications pipeline — decoupled from the
original single-file HTML prototype into React + Vite (frontend), Supabase
(Postgres + Auth + RLS), and Netlify (hosting). Same stack as SAIP, but a fully
separate Supabase project — no shared data.

## Roles

| Role        | Can do |
|-------------|--------|
| `admin`     | Full access everywhere (Research Office) |
| `dean`      | Read everything, decide (accept/return) department submissions |
| `chair`     | Full CRUD on works/phases/tasks for their own department, manages their department's submission draft |
| `committee` | Reads works flagged for committee review, adds/decides review rounds |
| `viewer`    | Read-only everywhere |

Enforcement is at the database level via Postgres Row Level Security
(`supabase/migrations/0002_rls.sql`) — the UI just reflects what each role can do.

## 1. Supabase setup

You said the Supabase project is already created. In the Supabase SQL editor, run
the migrations **in order**:

1. `supabase/migrations/0001_init.sql` — tables
2. `supabase/migrations/0002_rls.sql` — roles + row level security
3. `supabase/migrations/0003_seed_master_data.sql` — starter departments/years (edit first if you want different ones)

Then get your project's **URL** and **anon public key** from
Project Settings → API — you'll need them for `.env`.

### Creating your first admin

1. On the app's Login screen, no self-serve sign-up form is shown by default,
   but `AuthContext.signUp` supports it — or simpler: in Supabase Dashboard →
   Authentication → Users → **Add user**, create yourself with an email/password.
2. In the SQL editor, run:
   ```sql
   insert into profiles (id, full_name, role)
   values ((select id from auth.users where email = 'you@aust.edu.lb'), 'Your Name', 'admin');
   ```
3. Log in — you'll land on the Dashboard with the Configuration tab visible.
4. From **Configuration → Users & Roles**, assign roles/departments to everyone
   else as they sign up (default role on sign-up is `viewer`).

## 2. Local development

```bash
npm install
cp .env.example .env      # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

## 3. Push to GitHub

```bash
git init
git add .
git commit -m "Initial FBE Research & Publications app"
git branch -M main
git remote add origin https://github.com/nnicolian/FBE_RPUB.git
git push -u origin main
```

## 4. Deploy on Netlify

1. New site from Git → pick `nnicolian/FBE_RPUB`.
2. Build command: `npm run build`, publish directory: `dist` (already set in `netlify.toml`).
3. Add environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in
   Site settings → Environment variables.
4. Deploy.

## What's in this version

This app is now at full feature parity with the original prototype:

- **Pipeline**: full 10-tab paper workspace (Overview, Hierarchy, Authors,
  Venue & Submission, Committee Reviews, Deliverables & Files, Costs &
  Funding, Milestones, Risks & Issues, Updates) — phases → tasks → subtasks
  with planned/actual dates, comments, and file attachments at every level.
- **Dashboard**: clickable metrics and charts that drill into a filtered
  Pipeline view, plus department/maturity/type-quality breakdowns.
- **Reports**: all 8 report views (by department, by stage, maturity
  distribution, lead researcher pipeline, submission outcomes, venue quality
  by department, cost & funding summary, custom field report) plus the
  detailed register with CSV export.
- **Submissions**: chair drafts → Dean accepts/returns, full audit history
  log per department, consolidated department comparison against targets,
  and JSON export of a department's submission.
- **Configuration**: departments, researchers, venues (with full verification
  checklist), academic years, committee members, acceptance targets, oversight
  thresholds, and an editable lifecycle template for new papers.
- **File attachments** at every level (work, phase, task, subtask,
  deliverable, cost entry, review round) — **requires one manual step**:
  create a Storage bucket named `attachments` in your Supabase project
  (Storage → New bucket → name it exactly `attachments`, private is fine)
  before uploads will work. Run `supabase/migrations/0005_full_parity_schema.sql`
  first for the underlying tables/columns this all depends on.

Migration order: run 0001 → 0002 → 0003 → 0004 (optional demo data) → 0005,
then create the `attachments` Storage bucket.
