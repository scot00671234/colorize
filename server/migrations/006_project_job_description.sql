-- Persist job description per project (editor ATS panel).
ALTER TABLE projects ADD COLUMN IF NOT EXISTS job_description TEXT NOT NULL DEFAULT '';
