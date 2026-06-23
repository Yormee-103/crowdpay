ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS github_repo_url TEXT,
  ADD COLUMN IF NOT EXISTS campaign_github_stats JSONB;

CREATE INDEX IF NOT EXISTS campaigns_github_repo_idx
  ON campaigns (github_repo_url)
  WHERE github_repo_url IS NOT NULL;
