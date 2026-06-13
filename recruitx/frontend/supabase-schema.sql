-- Run this in your Supabase SQL Editor

-- ============================================================
-- NIRVAN — Complete Database Schema
-- Drop everything first before running this
-- ============================================================

-- Drop all policies
DO $$ DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- Drop tables (order matters for FK)
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS negotiations CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS candidates CASCADE;
DROP TABLE IF EXISTS recruiters CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ============================================================
-- TABLES
-- ============================================================

-- Profiles extends auth.users
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('candidate', 'recruiter')),
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Candidate details
CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  github_url TEXT,
  github_token TEXT,
  portfolio_url TEXT,
  bio TEXT,
  salary_min INTEGER,
  remote_pref BOOLEAN DEFAULT true,
  dealbreakers TEXT[],
  skills TEXT[],
  availability TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recruiter details
CREATE TABLE recruiters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  company TEXT,
  position TEXT,
  salary_range_min INTEGER,
  salary_range_max INTEGER,
  remote_policy TEXT,
  must_haves TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Negotiations (matches)
CREATE TABLE negotiations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  recruiter_id UUID REFERENCES recruiters(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'matched', 'scheduled', 'completed', 'rejected')),
  fit_score INTEGER,
  candidate_notes TEXT,
  recruiter_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent-to-agent messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negotiation_id UUID REFERENCES negotiations(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('candidate', 'recruiter', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job listings (created by recruiters, visible publicly)
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id UUID REFERENCES recruiters(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  title TEXT NOT NULL,
  location TEXT,
  remote_policy TEXT CHECK (remote_policy IN ('remote', 'hybrid', 'onsite')),
  salary_min INTEGER,
  salary_max INTEGER,
  salary_public BOOLEAN DEFAULT false,
  stack TEXT[],
  description TEXT,
  culture_signals TEXT,
  experience_required TEXT,
  dealbreaker_flexibility TEXT,
  import_source TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'filled', 'closed')),
  fit_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent applications (tracks agent-initiated applications)
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'negotiating', 'accepted', 'rejected')),
  fit_score INTEGER,
  agent_notes TEXT,
  initiated_by TEXT CHECK (initiated_by IN ('candidate', 'recruiter', 'platform')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, candidate_id)
);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_candidates_updated_at BEFORE UPDATE ON candidates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_recruiters_updated_at BEFORE UPDATE ON recruiters FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_negotiations_updated_at BEFORE UPDATE ON negotiations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_applications_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_recruiter ON jobs(recruiter_id);
CREATE INDEX idx_negotiations_status ON negotiations(status);
CREATE INDEX idx_negotiations_candidate ON negotiations(candidate_id);
CREATE INDEX idx_negotiations_recruiter ON negotiations(recruiter_id);
CREATE INDEX idx_messages_negotiation ON messages(negotiation_id);
CREATE INDEX idx_applications_job ON applications(job_id);
CREATE INDEX idx_applications_candidate ON applications(candidate_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE recruiters ENABLE ROW LEVEL SECURITY;
ALTER TABLE negotiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Profiles: users read/update own
CREATE POLICY "profiles_self_select" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_self_update" ON profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_self_insert" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Candidates: users read/update own
CREATE POLICY "candidates_self_select" ON candidates
  FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "candidates_self_update" ON candidates
  FOR UPDATE USING (auth.uid() = profile_id);
CREATE POLICY "candidates_self_insert" ON candidates
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- Recruiters: users read/update own
CREATE POLICY "recruiters_self_select" ON recruiters
  FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "recruiters_self_update" ON recruiters
  FOR UPDATE USING (auth.uid() = profile_id);
CREATE POLICY "recruiters_self_insert" ON recruiters
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- Negotiations: participants can select
CREATE POLICY "negotiations_participant_select" ON negotiations
  FOR SELECT USING (
    auth.uid() IN (
      SELECT profile_id FROM candidates WHERE id = candidate_id
      UNION
      SELECT profile_id FROM recruiters WHERE id = recruiter_id
    )
  );

-- Messages: participants can read and insert
CREATE POLICY "messages_participant_select" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM negotiations n
      WHERE n.id = negotiation_id
        AND auth.uid() IN (
          SELECT profile_id FROM candidates WHERE id = n.candidate_id
          UNION
          SELECT profile_id FROM recruiters WHERE id = n.recruiter_id
        )
    )
  );

CREATE POLICY "messages_participant_insert" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM negotiations n
      WHERE n.id = negotiation_id
        AND auth.uid() IN (
          SELECT profile_id FROM candidates WHERE id = n.candidate_id
          UNION
          SELECT profile_id FROM recruiters WHERE id = n.recruiter_id
        )
    )
  );

-- Jobs: public read (active), recruiter owns insert/update
CREATE POLICY "jobs_public_select" ON jobs
  FOR SELECT USING (
    status = 'active'
    OR recruiter_id IN (SELECT id FROM recruiters WHERE profile_id = auth.uid())
  );

CREATE POLICY "jobs_recruiter_insert" ON jobs
  FOR INSERT WITH CHECK (
    recruiter_id IN (SELECT id FROM recruiters WHERE profile_id = auth.uid())
  );

CREATE POLICY "jobs_recruiter_update" ON jobs
  FOR UPDATE USING (
    recruiter_id IN (SELECT id FROM recruiters WHERE profile_id = auth.uid())
  );

-- Applications: participants can select, candidate inserts
CREATE POLICY "applications_participant_select" ON applications
  FOR SELECT USING (
    candidate_id IN (SELECT id FROM candidates WHERE profile_id = auth.uid())
    OR job_id IN (SELECT id FROM jobs WHERE recruiter_id IN (SELECT id FROM recruiters WHERE profile_id = auth.uid()))
  );

CREATE POLICY "applications_candidate_insert" ON applications
  FOR INSERT WITH CHECK (
    candidate_id IN (SELECT id FROM candidates WHERE profile_id = auth.uid())
  );
