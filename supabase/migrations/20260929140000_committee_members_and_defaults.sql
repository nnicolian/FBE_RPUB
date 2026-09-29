/*
# Committee composition, default research areas, ICASF status
(Applied to the live database on 2026-09-29.)
*/
-- Old approval-model placeholders → inactive; add the Terms of Reference composition (Appendix 4).
update committee_members set active = false where name in ('Research Committee Chair','Methodology Reviewer','Discipline Reviewer');
insert into committee_members (name, role, active) values
  ('Dr. Mayssam Daaboul','Chair — Research Coordinator',true),
  ('Faculty Representative (to be nominated)','Member — peer voice, departmental liaison',true),
  ('Dr. Nazareth Nicolian','Ex-officio — Dean (oversight, final approval)',true);

-- Default research areas from each researcher's department (review in Configuration → Researchers).
update researchers set research_areas = case department
    when 'MIS' then array['Management information systems & technology adoption']
    when 'FIN' then array['Finance, accounting & corporate governance']
    when 'MKT' then array['Marketing, consumer behaviour & digital business']
    when 'MGT' then array['Management, leadership & organisational behaviour']
    when 'HOM' then array['Hospitality & tourism management']
    else research_areas end
where coalesce(array_length(research_areas,1),0) = 0 and department in ('MIS','FIN','MKT','MGT','HOM');

-- ICASF: earlier editions appeared in Scopus-indexed Springer volumes; 2027 not yet confirmed.
update venues set indexing = 'Pending confirmation',
  scope_fit_guidance = trim(coalesce(scope_fit_guidance,'') || ' ICASF 2023 proceedings were published in Scopus-indexed Springer volumes; confirm the 2027 proceedings are indexed before counting these papers toward the KPI.')
where name = 'ICASF 2027' and coalesce(indexing,'') = '';
