-- Add advanced negotiation columns to candidates table
ALTER TABLE candidates 
ADD COLUMN IF NOT EXISTS equity_demand_threshold INTEGER DEFAULT NULL, -- Min salary under which candidate demands equity
ADD COLUMN IF NOT EXISTS negotiation_style TEXT DEFAULT 'collaborative' CHECK (negotiation_style IN ('collaborative', 'firm', 'flexible')),
ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT NULL;

-- Add advanced columns to recruiters table
ALTER TABLE recruiters
ADD COLUMN IF NOT EXISTS max_salary_flex INTEGER DEFAULT NULL, -- Absolute upper budget boundary for stellar candidates
ADD COLUMN IF NOT EXISTS recruiter_negotiation_style TEXT DEFAULT 'collaborative' CHECK (recruiter_negotiation_style IN ('collaborative', 'firm', 'flexible'));
