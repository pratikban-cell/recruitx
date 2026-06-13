-- ============================================================
-- NIRVAN — Backend Helper Policies (for Anon Key compatibility)
-- Run this in your Supabase SQL Editor to allow the Python backend
-- to query profiles and run the autonomous agent negotiation loops!
-- ============================================================

DROP POLICY IF EXISTS "backend_candidates_read" ON candidates;
CREATE POLICY "backend_candidates_read" ON candidates FOR SELECT USING (true);

DROP POLICY IF EXISTS "backend_recruiters_read" ON recruiters;
CREATE POLICY "backend_recruiters_read" ON recruiters FOR SELECT USING (true);

DROP POLICY IF EXISTS "backend_negotiations_read" ON negotiations;
CREATE POLICY "backend_negotiations_read" ON negotiations FOR SELECT USING (true);

DROP POLICY IF EXISTS "backend_messages_read" ON messages;
CREATE POLICY "backend_messages_read" ON messages FOR SELECT USING (true);

-- Make sure anyone can insert messages (so the backend agent can write back)
DROP POLICY IF EXISTS "backend_messages_insert" ON messages;
CREATE POLICY "backend_messages_insert" ON messages FOR INSERT WITH CHECK (true);

-- Make sure the backend can update negotiation status and notes
DROP POLICY IF EXISTS "backend_negotiations_update" ON negotiations;
CREATE POLICY "backend_negotiations_update" ON negotiations FOR UPDATE USING (true) WITH CHECK (true);

-- Make sure the backend or any user can insert a negotiation
DROP POLICY IF EXISTS "backend_negotiations_insert" ON negotiations;
CREATE POLICY "backend_negotiations_insert" ON negotiations FOR INSERT WITH CHECK (true);

-- Make sure anyone can view profile details like names and emails
DROP POLICY IF EXISTS "backend_profiles_read" ON profiles;
CREATE POLICY "backend_profiles_read" ON profiles FOR SELECT USING (true);

-- Make sure candidate profiles can be activated/updated by the backend/frontend without auth restrictions
DROP POLICY IF EXISTS "backend_candidates_update" ON candidates;
CREATE POLICY "backend_candidates_update" ON candidates FOR UPDATE USING (true) WITH CHECK (true);

-- Make sure recruiter profiles can be activated/updated by the backend/frontend without auth restrictions
DROP POLICY IF EXISTS "backend_recruiters_update" ON recruiters;
CREATE POLICY "backend_recruiters_update" ON recruiters FOR UPDATE USING (true) WITH CHECK (true);

-- Make sure the backend can query and manage calendar connections without auth restrictions
DROP POLICY IF EXISTS "backend_calendar_connections_select" ON calendar_connections;
CREATE POLICY "backend_calendar_connections_select" ON calendar_connections FOR SELECT USING (true);

DROP POLICY IF EXISTS "backend_calendar_connections_insert" ON calendar_connections;
CREATE POLICY "backend_calendar_connections_insert" ON calendar_connections FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "backend_calendar_connections_update" ON calendar_connections;
CREATE POLICY "backend_calendar_connections_update" ON calendar_connections FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "backend_calendar_connections_delete" ON calendar_connections;
CREATE POLICY "backend_calendar_connections_delete" ON calendar_connections FOR DELETE USING (true);



