-- Migration: Candidate Rejection Intelligence
-- Run this in your Supabase SQL Editor to support candidate rejection insights!

-- 1. Add rejection columns to negotiations table
ALTER TABLE negotiations 
ADD COLUMN IF NOT EXISTS rejection_reasons JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS rejection_categories TEXT[] DEFAULT NULL;

-- 2. Create candidate insights cache table
CREATE TABLE IF NOT EXISTS candidate_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    rejection_count INT DEFAULT 0,
    primary_patterns JSONB DEFAULT NULL,
    skill_weakness_map JSONB DEFAULT NULL,
    recommendations JSONB DEFAULT NULL,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (timezone('utc'::text, now()) + interval '7 days')
);

-- Enable RLS
ALTER TABLE candidate_insights ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies
DROP POLICY IF EXISTS "Allow anyone to read candidate insights" ON candidate_insights;
CREATE POLICY "Allow anyone to read candidate insights" ON candidate_insights
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anyone to insert candidate insights" ON candidate_insights;
CREATE POLICY "Allow anyone to insert candidate insights" ON candidate_insights
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anyone to update candidate insights" ON candidate_insights;
CREATE POLICY "Allow anyone to update candidate insights" ON candidate_insights
    FOR UPDATE USING (true) WITH CHECK (true);
