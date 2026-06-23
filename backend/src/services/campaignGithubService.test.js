const test = require('node:test');
const assert = require('node:assert/strict');
const proxyquire = require('proxyquire').noCallThru();

test('normalizeGithubRepoInput rejects invalid URLs', () => {
  const { normalizeGithubRepoInput } = proxyquire('./campaignGithubService', {
    '../config/database': { query: async () => ({ rows: [] }) },
    '../config/logger': { warn: () => {} },
  });

  assert.throws(
    () => normalizeGithubRepoInput('https://example.com/repo'),
    /valid public GitHub repository URL/
  );
});

test('normalizeGithubRepoInput normalizes valid URLs', () => {
  const { normalizeGithubRepoInput } = proxyquire('./campaignGithubService', {
    '../config/database': { query: async () => ({ rows: [] }) },
    '../config/logger': { warn: () => {} },
  });

  assert.equal(
    normalizeGithubRepoInput('https://github.com/stellar/js-stellar-sdk'),
    'https://github.com/stellar/js-stellar-sdk'
  );
  assert.equal(normalizeGithubRepoInput(null), null);
  assert.equal(normalizeGithubRepoInput(''), null);
});

test('refreshCampaignGithubStats stores unavailable stats for private repos', async () => {
  const updates = [];
  const service = proxyquire('./campaignGithubService', {
    '../config/database': {
      query: async (text, params) => {
        if (text.includes('SELECT id, github_repo_url')) {
          return { rows: [{ id: 'camp-1', github_repo_url: 'https://github.com/private/repo' }] };
        }
        if (text.includes('UPDATE campaigns')) {
          updates.push(params);
          return { rows: [] };
        }
        return { rows: [] };
      },
    },
    '../config/logger': { warn: () => {} },
  });

  const originalFetch = global.fetch;
  global.fetch = async () => ({ ok: false, status: 404 });

  try {
    const result = await service.refreshCampaignGithubStats('camp-1');
    assert.equal(result, null);
    assert.equal(updates.length, 1);
    const stats = JSON.parse(updates[0][1]);
    assert.equal(stats.unavailable, true);
    assert.equal(stats.error, 'not_found');
  } finally {
    global.fetch = originalFetch;
  }
});
