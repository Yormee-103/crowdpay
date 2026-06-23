const db = require('../config/database');
const logger = require('../config/logger');
const { parseGithubRepoUrl, normalizeGithubRepoUrl } = require('../lib/githubRepo');

const GITHUB_API = 'https://api.github.com';

function githubHeaders() {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'CrowdPay',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

async function fetchGithubJson(path) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    headers: githubHeaders(),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const err = new Error(`GitHub API ${res.status}`);
    err.statusCode = res.status;
    throw err;
  }
  return res.json();
}

async function fetchRepoStats(owner, repo) {
  const repoData = await fetchGithubJson(`/repos/${owner}/${repo}`);
  let contributors = [];
  try {
    const contributorRows = await fetchGithubJson(`/repos/${owner}/${repo}/contributors?per_page=5`);
    contributors = (Array.isArray(contributorRows) ? contributorRows : [])
      .slice(0, 5)
      .map((c) => ({
        login: c.login,
        avatar_url: c.avatar_url,
        html_url: c.html_url,
        contributions: c.contributions,
      }));
  } catch (err) {
    logger.warn('GitHub contributors fetch failed', { owner, repo, error: err.message });
  }

  return {
    owner,
    repo,
    stars: repoData.stargazers_count ?? 0,
    forks: repoData.forks_count ?? 0,
    open_issues: repoData.open_issues_count ?? 0,
    last_commit_at: repoData.pushed_at || repoData.updated_at || null,
    license: repoData.license?.spdx_id || repoData.license?.name || null,
    contributors,
    fetched_at: new Date().toISOString(),
  };
}

async function refreshCampaignGithubStats(campaignId) {
  const { rows } = await db.query(
    'SELECT id, github_repo_url FROM campaigns WHERE id = $1',
    [campaignId]
  );
  if (!rows.length || !rows[0].github_repo_url) return null;

  const parsed = parseGithubRepoUrl(rows[0].github_repo_url);
  if (!parsed) {
    await db.query(
      `UPDATE campaigns
       SET campaign_github_stats = $2::jsonb
       WHERE id = $1`,
      [campaignId, JSON.stringify({ unavailable: true, fetched_at: new Date().toISOString() })]
    );
    return null;
  }

  try {
    const stats = await fetchRepoStats(parsed.owner, parsed.repo);
    await db.query(
      `UPDATE campaigns
       SET campaign_github_stats = $2::jsonb
       WHERE id = $1`,
      [campaignId, JSON.stringify(stats)]
    );
    return stats;
  } catch (err) {
    const unavailable = {
      unavailable: true,
      fetched_at: new Date().toISOString(),
      error: err.statusCode === 404 ? 'not_found' : 'fetch_failed',
    };
    await db.query(
      `UPDATE campaigns
       SET campaign_github_stats = $2::jsonb
       WHERE id = $1`,
      [campaignId, JSON.stringify(unavailable)]
    );
    logger.warn('GitHub stats refresh failed', {
      campaign_id: campaignId,
      repo: rows[0].github_repo_url,
      error: err.message,
    });
    return null;
  }
}

async function refreshAllCampaignGithubStats() {
  const { rows } = await db.query(
    `SELECT id FROM campaigns
     WHERE github_repo_url IS NOT NULL`
  );

  let refreshed = 0;
  for (const row of rows) {
    await refreshCampaignGithubStats(row.id);
    refreshed += 1;
  }
  return { refreshed };
}

function normalizeGithubRepoInput(url) {
  if (url == null || url === '') return null;
  const normalized = normalizeGithubRepoUrl(url);
  if (!normalized) {
    const err = new Error('github_repo_url must be a valid public GitHub repository URL');
    err.statusCode = 422;
    throw err;
  }
  return normalized;
}

module.exports = {
  refreshCampaignGithubStats,
  refreshAllCampaignGithubStats,
  normalizeGithubRepoInput,
  fetchRepoStats,
};
