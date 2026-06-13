-- ============================================================
-- recruitx — Full Database Reset & Single Reference Mock Seed
-- ============================================================

-- 1. Wipe all existing auth users and public data
-- Due to ON DELETE CASCADE constraints, deleting from auth.users 
-- automatically cleans up profiles, candidates, recruiters, jobs, 
-- negotiations, messages, applications, and calendar connections.
DELETE FROM auth.users;

-- Ensure public tables are completely empty
TRUNCATE public.profiles, public.candidates, public.recruiters, public.jobs, public.negotiations, public.messages, public.applications, public.calendar_connections CASCADE;


-- 2. Insert Recruiter Zoro into auth.users (email: zoro_swordsman@gmail.com, password: Password123!)
INSERT INTO auth.users (
  id, 
  email, 
  encrypted_password, 
  email_confirmed_at, 
  raw_app_meta_data, 
  raw_user_meta_data, 
  aud, 
  role, 
  created_at, 
  updated_at
) VALUES (
  '8da26451-bf23-4d3d-b247-147e80462fcd', 
  'zoro_swordsman@gmail.com', 
  crypt('Password123!', gen_salt('bf')), 
  now(), 
  '{"provider":"email","providers":["email"]}', 
  '{"name":"Zoro","role":"recruiter"}', 
  'authenticated', 
  'authenticated',
  now(),
  now()
);

-- Link Recruiter Zoro in auth.identities
INSERT INTO auth.identities (
  id, 
  user_id, 
  identity_data, 
  provider, 
  provider_id,
  last_sign_in_at, 
  created_at, 
  updated_at
) VALUES (
  '8da26451-bf23-4d3d-b247-147e80462fcd',
  '8da26451-bf23-4d3d-b247-147e80462fcd',
  jsonb_build_object('sub', '8da26451-bf23-4d3d-b247-147e80462fcd', 'email', 'zoro_swordsman@gmail.com'),
  'email',
  '8da26451-bf23-4d3d-b247-147e80462fcd',
  now(),
  now(),
  now()
);


-- 3. Insert Candidate Luffy into auth.users (email: luffy_mugiwara@gmail.com, password: Password123!)
INSERT INTO auth.users (
  id, 
  email, 
  encrypted_password, 
  email_confirmed_at, 
  raw_app_meta_data, 
  raw_user_meta_data, 
  aud, 
  role, 
  created_at, 
  updated_at
) VALUES (
  'e99f9a9b-00f9-4841-aa59-40707374f22e', 
  'luffy_mugiwara@gmail.com', 
  crypt('Password123!', gen_salt('bf')), 
  now(), 
  '{"provider":"email","providers":["email"]}', 
  '{"name":"Luffy","role":"candidate"}', 
  'authenticated', 
  'authenticated',
  now(),
  now()
);

-- Link Candidate Luffy in auth.identities
INSERT INTO auth.identities (
  id, 
  user_id, 
  identity_data, 
  provider, 
  provider_id,
  last_sign_in_at, 
  created_at, 
  updated_at
) VALUES (
  'e99f9a9b-00f9-4841-aa59-40707374f22e',
  'e99f9a9b-00f9-4841-aa59-40707374f22e',
  jsonb_build_object('sub', 'e99f9a9b-00f9-4841-aa59-40707374f22e', 'email', 'luffy_mugiwara@gmail.com'),
  'email',
  'e99f9a9b-00f9-4841-aa59-40707374f22e',
  now(),
  now(),
  now()
);


-- 4. Create Public Profiles
INSERT INTO public.profiles (id, role, name, avatar_url, created_at)
VALUES 
  ('8da26451-bf23-4d3d-b247-147e80462fcd', 'recruiter', 'Zoro', NULL, now()),
  ('e99f9a9b-00f9-4841-aa59-40707374f22e', 'candidate', 'Luffy', NULL, now());


-- 5. Create Recruiter and Candidate details
INSERT INTO public.recruiters (id, profile_id, company, position, salary_range_min, salary_range_max, remote_policy, created_at, updated_at)
VALUES ('fe9e3b5a-aca8-4138-a8b8-1d4929768f09', '8da26451-bf23-4d3d-b247-147e80462fcd', 'TechCorp', 'Hiring Manager', 10000, 20000, 'hybrid', now(), now());

INSERT INTO public.candidates (id, profile_id, title, skills, salary_min, remote_pref, availability, created_at, updated_at)
VALUES ('7804c4f3-0fc3-43d9-8999-ceddb40b2440', 'e99f9a9b-00f9-4841-aa59-40707374f22e', 'DevOps Intern', ARRAY['Docker', 'Linux', 'CI/CD'], 15000, true, 'immediate', now(), now());


-- 6. Create Job Listing
INSERT INTO public.jobs (id, recruiter_id, company, title, location, remote_policy, salary_min, salary_max, salary_public, stack, description, culture_signals, experience_required, status, created_at, updated_at)
VALUES ('2c593449-fcd0-4597-9342-79ef88edd385', 'fe9e3b5a-aca8-4138-a8b8-1d4929768f09', 'TechCorp', 'DevOps Intern', 'Kathmandu', 'hybrid', 10000, 15000, true, ARRAY['Docker', 'Linux', 'CI/CD'], 'You will be working on DevOps automation.', '4 days per week', '0', 'active', now(), now());


-- 7. Create Active Negotiation
INSERT INTO public.negotiations (id, candidate_id, recruiter_id, status, fit_score, candidate_notes, recruiter_notes, created_at, updated_at)
VALUES ('43bf66ee-61ed-4f36-ba67-2c7c677d47ee', '7804c4f3-0fc3-43d9-8999-ceddb40b2440', 'fe9e3b5a-aca8-4138-a8b8-1d4929768f09', 'active', 78, 'job_id:2c593449-fcd0-4597-9342-79ef88edd385', 'Active dialogue ongoing', now(), now());


-- 8. Create Chat Message Dialogue History
INSERT INTO public.messages (id, negotiation_id, sender_role, content, created_at)
VALUES 
  (gen_random_uuid(), '43bf66ee-61ed-4f36-ba67-2c7c677d47ee', 'recruiter', 'Hello Luffy! I''ve reviewed your profile for the DevOps Intern role at TechCorp. What are your salary expectations for this position?', now() - interval '10 minutes'),
  (gen_random_uuid(), '43bf66ee-61ed-4f36-ba67-2c7c677d47ee', 'candidate', 'Hello Zoro! Thank you for considering my application. Based on my skills with Docker and Linux, my minimum salary expectation is $15,000. I am also interested in learning about mentorship opportunities.', now() - interval '8 minutes'),
  (gen_random_uuid(), '43bf66ee-61ed-4f36-ba67-2c7c677d47ee', 'recruiter', 'Thanks for sharing. Our standard intern package starts at $10,000, but we do have some flexibility up to $13,000 for candidates with strong hands-on experience. How does that sound?', now() - interval '6 minutes'),
  (gen_random_uuid(), '43bf66ee-61ed-4f36-ba67-2c7c677d47ee', 'candidate', 'I understand. I could align with a package around $14,000 if we can include a flexible remote schedule of 2 days a week. What do you think?', now() - interval '4 minutes');
