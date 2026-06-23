const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const proxyquire = require('proxyquire').noCallThru();

function buildApp({ queryImpl, userId = 'user-1' }) {
  const router = proxyquire('./webhooks', {
    '../config/database': { query: queryImpl },
    '../middleware/auth': {
      requireAuth: (req, _res, next) => {
        req.user = { userId };
        next();
      },
    },
    '../services/webhookDispatcher': {
      ALL_WEBHOOK_EVENTS: ['contribution.received'],
    },
  });

  const app = express();
  app.use(express.json());
  app.use('/api/webhooks', router);
  return app;
}

test('GET /api/webhooks/:id/deliveries returns deliveries with attempt history', async () => {
  const webhookId = 'wh-1';
  const deliveryId = 'del-1';
  const app = buildApp({
    queryImpl: async (text, params) => {
      if (text.includes('SELECT id FROM webhooks WHERE id = $1')) {
        return { rows: [{ id: webhookId }] };
      }
      if (text.includes('FROM webhook_deliveries d')) {
        return {
          rows: [{
            id: deliveryId,
            webhook_id: webhookId,
            event_type: 'contribution.received',
            status: 'failed',
            response_status: 500,
            response_body_snippet: 'error',
            attempt_count: 4,
            last_error: 'HTTP 500',
            next_retry_at: null,
            delivered_at: null,
            failed_at: '2026-06-23T00:00:00.000Z',
            created_at: '2026-06-23T00:00:00.000Z',
            updated_at: '2026-06-23T00:00:00.000Z',
            webhook_url: 'https://example.com/hook',
          }],
        };
      }
      if (text.includes('FROM webhook_delivery_attempts')) {
        return {
          rows: [
            {
              delivery_id: deliveryId,
              attempt_number: 1,
              response_status: 500,
              response_body_snippet: 'error',
              error: 'HTTP 500',
              created_at: '2026-06-23T00:00:00.000Z',
            },
          ],
        };
      }
      return { rows: [] };
    },
  });

  const response = await request(app)
    .get(`/api/webhooks/${webhookId}/deliveries`)
    .set('Authorization', 'Bearer token');

  assert.equal(response.status, 200);
  assert.equal(response.body.length, 1);
  assert.equal(response.body[0].id, deliveryId);
  assert.equal(response.body[0].attempts.length, 1);
  assert.equal(response.body[0].attempts[0].response_status, 500);
});

test('GET /api/webhooks/:id/deliveries returns 404 for foreign webhook', async () => {
  const app = buildApp({
    queryImpl: async (text) => {
      if (text.includes('SELECT id FROM webhooks WHERE id = $1')) {
        return { rows: [] };
      }
      return { rows: [] };
    },
  });

  const response = await request(app)
    .get('/api/webhooks/wh-other/deliveries')
    .set('Authorization', 'Bearer token');

  assert.equal(response.status, 404);
});
