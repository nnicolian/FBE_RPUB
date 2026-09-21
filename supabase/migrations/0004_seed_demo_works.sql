-- Demo/sample works ported from the original prototype, so the app isn't
-- empty on first login. Safe to delete all of this later once real data
-- is entered — it's just illustrative seed content, matching what was in
-- the prototype's built-in demo dataset.

-- ---- Researchers ----
insert into researchers (name, department, type, institution, role, active) values
  ('Nicolian','Dean / Faculty-wide','Internal','AUST','Faculty', true),
  ('Hassoun','MIS','Internal','AUST','Faculty', true),
  ('Akhras','MIS','Internal','AUST','Faculty', true),
  ('Kazzi','FIN','Internal','AUST','Faculty', true),
  ('Bahmad','MKT','Internal','AUST','Faculty', true),
  ('Daaboul','MGT','Internal','AUST','Faculty', true),
  ('Karam','HOM','Internal','AUST','Faculty', true),
  ('Diab','MIS','Internal','AUST','Faculty', true),
  ('AUST Sustainability Team','MGT','Internal','AUST','Faculty', true)
on conflict do nothing;

-- ---- Venues ----
insert into venues (name, full_name, type, quality, abs, floor, active) values
  ('EJIS','European Journal of Information Systems','Journal','Q1','ABS 4', true, true),
  ('ECR','Electronic Commerce Research','Journal','Q1','ABS 2', true, true),
  ('ICASF 2027','ICASF 2027 Conference','Conference','Conference','', true, true),
  ('CAIS','Communications of the Association for Information Systems','Journal','Q2','ABS 2', true, true)
on conflict do nothing;

-- ---- Committee members ----
insert into committee_members (name, role, active) values
  ('Research Committee Chair','Chair', true),
  ('Methodology Reviewer','Member', true),
  ('Discipline Reviewer','Member', true)
on conflict do nothing;

-- ---- Works (demo/sample papers) ----
-- Each insert is followed by its 4 standard lifecycle phases
-- (Onboarding, Execution, Advisory Review, Submission), matching the
-- prototype's default lifecycle template.

do $$
declare
  w_id uuid;
begin

  -- 1. Dean / Faculty-wide — Submitted Abstract
  insert into works (title, department, departments, lead, corresponding, research_type, stage,
    submission_status, venue, venue_quality, academic_year, actual_submission, ethics)
  values ('Making Implementation Influence Visible: Research Evaluation as a Digital Visibility Infrastructure',
    'Dean / Faculty-wide', array['Dean / Faculty-wide'], 'Nicolian', 'Nicolian', 'Journal Article', 'Submission',
    'Submitted Abstract', 'EJIS', 'Q1', '2026–2027', '2026-09-07', 'N/A')
  returning id into w_id;
  insert into phases (work_id, name, seq, committee_required, status, committee_status) values
    (w_id,'1. Onboarding',0,true,'In Progress','Pending'),
    (w_id,'2. Execution',1,true,'Not Started','Pending'),
    (w_id,'3. Advisory Review',2,false,'Not Started','Optional / Not Requested'),
    (w_id,'4. Submission',3,true,'Not Started','Pending');

  -- 2. MIS — Accepted (ECR)
  insert into works (title, department, departments, lead, corresponding, research_type, stage,
    submission_status, venue, venue_quality, academic_year, actual_submission, ethics)
  values ('When Measurement Matters: Analytics Maturity, Infrastructure Reliability, and ECommerce Outcomes in Lebanon',
    'MIS', array['MIS'], 'Hassoun', 'Hassoun', 'Journal Article', 'Accepted',
    'Accepted', 'ECR', 'Q1', '2026–2027', '2026-08-01', 'N/A')
  returning id into w_id;
  insert into phases (work_id, name, seq, committee_required, status, committee_status) values
    (w_id,'1. Onboarding',0,true,'In Progress','Blessed'),
    (w_id,'2. Execution',1,true,'Not Started','Blessed'),
    (w_id,'3. Advisory Review',2,false,'Not Started','Optional / Not Requested'),
    (w_id,'4. Submission',3,true,'Not Started','Blessed');

  -- 3. MIS — Accepted (ECR, second paper)
  insert into works (title, department, departments, lead, corresponding, research_type, stage,
    submission_status, venue, venue_quality, academic_year, actual_submission, ethics)
  values ('Functional Quality as the Dominant Driver of Platform Evaluation: Evidence of Halo Effects in Lebanese E-Commerce',
    'MIS', array['MIS'], 'Hassoun', 'Hassoun', 'Journal Article', 'Accepted',
    'Accepted', 'ECR', 'Q1', '2026–2027', '2026-07-20', 'N/A')
  returning id into w_id;
  insert into phases (work_id, name, seq, committee_required, status, committee_status) values
    (w_id,'1. Onboarding',0,true,'In Progress','Blessed'),
    (w_id,'2. Execution',1,true,'Not Started','Blessed'),
    (w_id,'3. Advisory Review',2,false,'Not Started','Optional / Not Requested'),
    (w_id,'4. Submission',3,true,'Not Started','Blessed');

  -- 4. MIS — Accepted conference paper (ICASF 2027)
  insert into works (title, department, departments, lead, coauthors, research_type, stage,
    submission_status, venue, venue_quality, academic_year, ethics)
  values ('ICASF 2027 Conference Paper — Title TBD',
    'MIS', array['MIS'], 'Hassoun', array['Akhras','Kazzi'], 'Conference Paper — Classification Required', 'Accepted',
    'Accepted', 'ICASF 2027', 'Conference', '2026–2027', 'N/A')
  returning id into w_id;
  insert into phases (work_id, name, seq, committee_required, status, committee_status) values
    (w_id,'1. Onboarding',0,true,'In Progress','Blessed'),
    (w_id,'2. Execution',1,true,'Not Started','Blessed'),
    (w_id,'3. Advisory Review',2,false,'Not Started','Optional / Not Requested'),
    (w_id,'4. Submission',3,true,'Not Started','Blessed');

  -- 5. MKT — Pre-Submission
  insert into works (title, department, departments, lead, coauthors, research_type, stage,
    submission_status, venue, academic_year, ethics)
  values ('Marketing Research Paper — Title TBD',
    'MKT', array['MKT'], 'Bahmad', array['Daaboul','Karam'], 'Journal Article', 'Execution',
    'Pre-Submission', 'N/A', '2026–2027', 'N/A')
  returning id into w_id;
  insert into phases (work_id, name, seq, committee_required, status, committee_status) values
    (w_id,'1. Onboarding',0,true,'In Progress','Pending'),
    (w_id,'2. Execution',1,true,'Not Started','Pending'),
    (w_id,'3. Advisory Review',2,false,'Not Started','Optional / Not Requested'),
    (w_id,'4. Submission',3,true,'Not Started','Pending');

  -- 6. MKT — Accepted conference paper (collaboration)
  insert into works (title, department, departments, lead, coauthors, research_type, stage,
    submission_status, venue, venue_quality, academic_year, ethics)
  values ('ICASF 2027 Conference Paper — MKT Collaboration — Title TBD',
    'MKT', array['MKT'], 'Akhras', array['Kazzi','Hassoun'], 'Conference Paper — Classification Required', 'Accepted',
    'Accepted', 'ICASF 2027', 'Conference', '2026–2027', 'N/A')
  returning id into w_id;
  insert into phases (work_id, name, seq, committee_required, status, committee_status) values
    (w_id,'1. Onboarding',0,true,'In Progress','Blessed'),
    (w_id,'2. Execution',1,true,'Not Started','Blessed'),
    (w_id,'3. Advisory Review',2,false,'Not Started','Optional / Not Requested'),
    (w_id,'4. Submission',3,true,'Not Started','Blessed');

  -- 7. HOM — Pre-Submission
  insert into works (title, department, departments, lead, coauthors, research_type, stage,
    submission_status, venue, academic_year, ethics)
  values ('Hospitality Research Paper — Title TBD',
    'HOM', array['HOM'], 'Karam', array['Daaboul','Bahmad'], 'Journal Article', 'Execution',
    'Pre-Submission', 'N/A', '2026–2027', 'N/A')
  returning id into w_id;
  insert into phases (work_id, name, seq, committee_required, status, committee_status) values
    (w_id,'1. Onboarding',0,true,'In Progress','Pending'),
    (w_id,'2. Execution',1,true,'Not Started','Pending'),
    (w_id,'3. Advisory Review',2,false,'Not Started','Optional / Not Requested'),
    (w_id,'4. Submission',3,true,'Not Started','Pending');

  -- 8. MGT — Pre-Submission (Daaboul)
  insert into works (title, department, departments, lead, research_type, stage,
    submission_status, venue, academic_year, ethics)
  values ('Management Research Paper — Daaboul — Title TBD',
    'MGT', array['MGT'], 'Daaboul', 'Journal Article', 'Execution',
    'Pre-Submission', 'N/A', '2026–2027', 'N/A')
  returning id into w_id;
  insert into phases (work_id, name, seq, committee_required, status, committee_status) values
    (w_id,'1. Onboarding',0,true,'In Progress','Pending'),
    (w_id,'2. Execution',1,true,'Not Started','Pending'),
    (w_id,'3. Advisory Review',2,false,'Not Started','Optional / Not Requested'),
    (w_id,'4. Submission',3,true,'Not Started','Pending');

  -- 9. MGT — Pre-Submission (Sustainability Team)
  insert into works (title, department, departments, lead, research_type, stage,
    submission_status, venue, academic_year, ethics)
  values ('AUST Sustainability Team Research Paper — Title TBD',
    'MGT', array['MGT'], 'AUST Sustainability Team', 'Journal Article', 'Execution',
    'Pre-Submission', 'N/A', '2026–2027', 'N/A')
  returning id into w_id;
  insert into phases (work_id, name, seq, committee_required, status, committee_status) values
    (w_id,'1. Onboarding',0,true,'In Progress','Pending'),
    (w_id,'2. Execution',1,true,'Not Started','Pending'),
    (w_id,'3. Advisory Review',2,false,'Not Started','Optional / Not Requested'),
    (w_id,'4. Submission',3,true,'Not Started','Pending');

  -- 10. MGT — Accepted (CAIS)
  insert into works (title, department, departments, lead, coauthors, research_type, stage,
    submission_status, venue, venue_quality, academic_year, ethics)
  values ('CAIS Research Article — Title TBD',
    'MGT', array['MGT'], 'Diab', array['Daaboul'], 'Journal Article', 'Accepted',
    'Accepted', 'CAIS', 'Q2', '2026–2027', 'N/A')
  returning id into w_id;
  insert into phases (work_id, name, seq, committee_required, status, committee_status) values
    (w_id,'1. Onboarding',0,true,'In Progress','Blessed'),
    (w_id,'2. Execution',1,true,'Not Started','Blessed'),
    (w_id,'3. Advisory Review',2,false,'Not Started','Optional / Not Requested'),
    (w_id,'4. Submission',3,true,'Not Started','Blessed');

  -- 11. FIN — Accepted conference paper (collaboration)
  insert into works (title, department, departments, lead, coauthors, research_type, stage,
    submission_status, venue, venue_quality, academic_year, ethics)
  values ('ICASF 2027 Conference Paper — FIN Collaboration — Title TBD',
    'FIN', array['FIN'], 'Kazzi', array['Hassoun','Akhras'], 'Conference Paper — Classification Required', 'Accepted',
    'Accepted', 'ICASF 2027', 'Conference', '2026–2027', 'N/A')
  returning id into w_id;
  insert into phases (work_id, name, seq, committee_required, status, committee_status) values
    (w_id,'1. Onboarding',0,true,'In Progress','Blessed'),
    (w_id,'2. Execution',1,true,'Not Started','Blessed'),
    (w_id,'3. Advisory Review',2,false,'Not Started','Optional / Not Requested'),
    (w_id,'4. Submission',3,true,'Not Started','Blessed');

  -- 12. FIN — Pre-Submission (Diab & Kazzi)
  insert into works (title, department, departments, lead, coauthors, research_type, stage,
    submission_status, venue, academic_year, ethics)
  values ('Finance Research Paper — Diab & Kazzi — Title TBD',
    'FIN', array['FIN'], 'Diab', array['Kazzi'], 'Journal Article', 'Execution',
    'Pre-Submission', 'N/A', '2026–2027', 'N/A')
  returning id into w_id;
  insert into phases (work_id, name, seq, committee_required, status, committee_status) values
    (w_id,'1. Onboarding',0,true,'In Progress','Pending'),
    (w_id,'2. Execution',1,true,'Not Started','Pending'),
    (w_id,'3. Advisory Review',2,false,'Not Started','Optional / Not Requested'),
    (w_id,'4. Submission',3,true,'Not Started','Pending');

end $$;
