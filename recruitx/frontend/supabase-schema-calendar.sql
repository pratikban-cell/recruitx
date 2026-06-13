-- Run this in your Supabase SQL Editor to support Google Calendar OAuth

CREATE TABLE IF NOT EXISTS calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Note: If running Python backend with Anon Key, execute the backend helper policies below or disable RLS)
ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;

-- Owner-only access policies (for authenticated frontend users)
CREATE POLICY "connections_self_select" ON calendar_connections
  FOR SELECT USING (auth.uid() = profile_id);
  
CREATE POLICY "connections_self_insert" ON calendar_connections
  FOR INSERT WITH CHECK (auth.uid() = profile_id);
  
CREATE POLICY "connections_self_update" ON calendar_connections
  FOR UPDATE USING (auth.uid() = profile_id);
  
CREATE POLICY "connections_self_delete" ON calendar_connections
  FOR DELETE USING (auth.uid() = profile_id);

-- Backend-compatible permissive policies (Run these to allow backend connection via standard Anon Key)
-- CREATE POLICY "backend_calendar_connections_select" ON calendar_connections FOR SELECT USING (true);
-- CREATE POLICY "backend_calendar_connections_insert" ON calendar_connections FOR INSERT WITH CHECK (true);
-- CREATE POLICY "backend_calendar_connections_update" ON calendar_connections FOR UPDATE USING (true) WITH CHECK (true);
-- CREATE POLICY "backend_calendar_connections_delete" ON calendar_connections FOR DELETE USING (true);

