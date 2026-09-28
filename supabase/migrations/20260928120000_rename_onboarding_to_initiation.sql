/*
# Rename lifecycle phase "Onboarding" → "Initiation"
(Already applied to the live database on 2026-09-28. Safe to re-run.)

1. Existing papers: every phase named "1. Onboarding" becomes "1. Initiation"
   (status, dates, progress and committee decisions are untouched).
2. Master template: saves the Standard Research Lifecycle to the database with
   "1. Initiation" as its first phase. Until now the saved template was empty,
   so new papers created from "Standard lifecycle template" received no phases.
3. Any work whose Major Stage is "Onboarding" is moved to "Initiation".
*/

update phases set name = '1. Initiation' where name = '1. Onboarding';

update works set stage = 'Initiation' where stage = 'Onboarding';

update lifecycle_template set template = '[
  {"id":"p1","name":"1. Initiation","optional":false,"committeeRequired":true,"instructions":"","tasks":[{"id":"t1","name":"Chair or Committee Referral","instructions":"","subtasks":[]}]},
  {"id":"p2","name":"2. Execution","optional":false,"committeeRequired":true,"instructions":"","tasks":[]},
  {"id":"p3","name":"3. Advisory Review","optional":true,"committeeRequired":false,"instructions":"","tasks":[]},
  {"id":"p4","name":"4. Submission","optional":false,"committeeRequired":true,"instructions":"","tasks":[]}
]'::jsonb
where id = 1
  and (jsonb_array_length(template) = 0 or template::text like '%Onboarding%');
