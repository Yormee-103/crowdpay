const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const {
  hmacSignature,
  backoffMs,
  backoffMsForCampaign,
  MAX_DELIVERY_ATTEMPTS,
  MAX_CAMPAIGN_DELIVERY_ATTEMPTS,
  RETRY_BACKOFF_MS,
} = require('./webhookDispatcher');

test('HMAC-SHA256 signature matches Node crypto verify pattern', () => {
  const secret = 'whsec_testsecret';
  const body = JSON.stringify({ hello: 'world' });
  const sig = hmacSignature(secret, body);
  const expected = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex');
  assert.equal(sig, expected);
});

test('retry backoff uses 1 min, 5 min, 30 min schedule', () => {
  assert.deepEqual(RETRY_BACKOFF_MS, [60_000, 300_000, 1_800_000]);
  assert.equal(backoffMs(1), 60_000);
  assert.equal(backoffMs(2), 300_000);
  assert.equal(backoffMs(3), 1_800_000);
  assert.equal(backoffMs(4), 1_800_000);
});

test('campaign webhooks share the same retry backoff schedule', () => {
  assert.equal(backoffMsForCampaign(1), backoffMs(1));
  assert.equal(backoffMsForCampaign(3), backoffMs(3));
});

test('max delivery attempts allow initial try plus 3 retries', () => {
  assert.equal(MAX_DELIVERY_ATTEMPTS, 4);
  assert.equal(MAX_CAMPAIGN_DELIVERY_ATTEMPTS, 4);
});
