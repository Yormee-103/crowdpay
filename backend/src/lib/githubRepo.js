function parseGithubRepoUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  const patterns = [
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?(?:#.*)?$/i,
    /^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/i,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (!match) continue;
    const owner = match[1];
    const repo = match[2].replace(/\.git$/i, '');
    if (!owner || !repo) return null;
    return { owner, repo };
  }

  return null;
}

function normalizeGithubRepoUrl(url) {
  const parsed = parseGithubRepoUrl(url);
  if (!parsed) return null;
  return `https://github.com/${parsed.owner}/${parsed.repo}`;
}

module.exports = {
  parseGithubRepoUrl,
  normalizeGithubRepoUrl,
};
