-- Schema definitions for recruitx Relational Configuration Tables

CREATE TABLE IF NOT EXISTS recruiter_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recruiter_id UUID REFERENCES recruiters(id) ON DELETE CASCADE,
    max_salary_flex INT,
    recruiter_negotiation_style VARCHAR(50),
    dealbreaker_salary BOOLEAN DEFAULT FALSE,
    dealbreaker_skills BOOLEAN DEFAULT FALSE,
    dealbreaker_remote BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS candidate_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    equity_demand_threshold INT,
    negotiation_style VARCHAR(50),
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
