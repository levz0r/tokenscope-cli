-- Add ai_tool column to track which AI tool generated the commit
ALTER TABLE repo_commits ADD COLUMN ai_tool TEXT;

-- Update existing AI commits to be 'claude-code'
UPDATE repo_commits SET ai_tool = 'claude-code' WHERE is_ai_generated = true;

-- Add comment for documentation
COMMENT ON COLUMN repo_commits.ai_tool IS 'The AI tool that generated this commit (e.g., claude-code, cursor, github-copilot)';
