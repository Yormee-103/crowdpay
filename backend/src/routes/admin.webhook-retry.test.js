const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const proxyquire = require('proxyquire').noCallThru();

test('POST /api/admin/webhook-deliveries/:id/retry resets delivery and queues processing', async () => {
  let resetArgs = null;
  const adminRouter = proxyquire('./admin', {
    '../config/database': {
      query: async (text) => {
        if (text.includes('INSERT INTO admin_actions')) return { rows: [] };
        return { rows: [] };
      },
    },
    '../config/stellar': { server: {} },
    '../services/reconciliation': {
      reconcileSingleCampaign: async () => ({}),
      getRecentReconciliationRuns: () => [],
    },
    '../services/webhookDispatcher': {
      resetDeliveryForManualRetry: async (...args) => {
        resetArgs = args;
        return { rows: [{ id: 'del-1' }] };
      },
      processDelivery: async () => {},
      processCampaignWebhookDelivery: async () => {},
    },
    '../middleware/auth': {
      requireAuth: (req, _res, next) => {
        req.user = { userId: 'admin-1', is_admin: true, role: 'admin' };
        next();
      },
      requireAdmin: (_req, _res, next) => next(),
    },
  });

  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRouter);

  const response = await request(app)
    .post('/api/admin/webhook-deliveries/del-1/retry')
    .send({ kind: 'user' });

  assert.equal(response.status, 200);
  assert.equal(response.body.id, 'del-1');
  assert.deepEqual(resetArgs, ['webhook_deliveries', 'del-1']);
});
