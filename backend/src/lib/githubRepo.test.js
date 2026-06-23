const test = require('node:test');
const assert = require('node:assert/strict');
const { parseGithubRepoUrl, normalizeGithubRepoUrl } = require('./githubRepo');

test('parseGithubRepoUrl accepts https GitHub URLs', () => {
  assert.deepEqual(
    parseGithubRepoUrl('https://github.com/stellar/js-stellar-sdk'),
    { owner: 'stellar', repo: 'js-stellar-sdk' }
  );
  assert.deepEqual(
    parseGithubRepoUrl('https://github.com/stellar/js-stellar-sdk.git'),
    { owner: 'stellar', repo: 'js-stellar-sdk' }
  );
});

test('parseGithubRepoUrl accepts git@github.com URLs', () => {
  assert.deepEqual(
    parseGithubRepoUrl('git@github.com:stellar/js-stellar-sdk.git'),
    { owner: 'stellar', repo: 'js-stellar-sdk' }
  );
});

test('parseGithubRepoUrl rejects invalid URLs', () => {
  assert.equal(parseGithubRepoUrl('https://gitlab.com/a/b'), null);
  assert.equal(parseGithubRepoUrl('not-a-url'), null);
  assert.equal(parseGithubRepoUrl(''), null);
});

test('normalizeGithubRepoUrl returns canonical https URL', () => {
  assert.equal(
    normalizeGithubRepoUrl('git@github.com:stellar/js-stellar-sdk.git'),
    'https://github.com/stellar/js-stellar-sdk'
  );
});
