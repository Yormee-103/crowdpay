const router = require('express').Router();
const crypto = require('crypto');
const db = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const { ALL_WEBHOOK_EVENTS } = require('../services/webhookDispatcher');

function isValidWebhookUrl(urlString) {
  try {
    const u = new URL(urlString);
    if (u.protocol === 'https:') return true;
    if (
      u.protocol === 'http:' &&
      (u.hostname === 'localhost' || u.hostname === '127.0.0.1')
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function normalizeEvents(events) {
  if (!events || !Array.isArray(events)) return [];
  const allowed = new Set(ALL_WEBHOOK_EVENTS);
  return [...new Set(events.filter((e) => typeof e === 'string' && allowed.has(e)))];
}

// KYC webhooks are handled at POST /api/webhooks/kyc (raw body + Persona signature verification).

router.get('/', requireAuth, async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, url, events,
            CONCAT(LEFT(secret, 10), '…', RIGHT(secret, 4)) AS secret_hint,
            created_at, revoked_at
     FROM webhooks WHERE user_id = $1 ORDER BY created_at DESC`,
    [req.user.userId]
  );
  res.json(rows);
});

router.post('/', requireAuth, async (req, res) => {
  const { url, events } = req.body || {};
  if (!url || !events) {
    return res.status(400).json({ error: 'url and events array are required' });
  }
  if (!isValidWebhookUrl(url)) {
    return res.status(400).json({ error: 'url must be https, or http://localhost for development' });
  }
  const ev = normalizeEvents(events);
  if (!ev.length) {
    return res.status(400).json({ error: `events must include at least one of: ${ALL_WEBHOOK_EVENTS.join(', ')}` });
  }

  const secret = `whsec_${crypto.randomBytes(32).toString('hex')}`;
  const { rows } = await db.query(
    `INSERT INTO webhooks (user_id, url, events, secret)
     VALUES ($1, $2, $3, $4)
     RETURNING id, url, events, created_at`,
    [req.user.userId, url, ev, secret]
  );

  res.status(201).json({
    ...rows[0],
    secret,
    message: 'Store the signing secret; it is only shown once.',
  });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const { rows } = await db.query(
    `UPDATE webhooks SET revoked_at = NOW()
     WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL
     RETURNING id`,
    [req.params.id, req.user.userId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Webhook not found' });
  res.json({ revoked: true, id: rows[0].id });
});

async function fetchDeliveryAttempts(deliveryIds, deliveryKind) {
  if (!deliveryIds.length) return new Map();
  const { rows } = await db.query(
    `SELECT delivery_id, attempt_number, response_status, response_body_snippet,
            error, created_at
     FROM webhook_delivery_attempts
     WHERE delivery_kind = $1 AND delivery_id = ANY($2::uuid[])
     ORDER BY created_at ASC`,
    [deliveryKind, deliveryIds]
  );
  const byDelivery = new Map();
  for (const row of rows) {
    if (!byDelivery.has(row.delivery_id)) byDelivery.set(row.delivery_id, []);
    byDelivery.get(row.delivery_id).push({
      attempt_number: row.attempt_number,
      response_status: row.response_status,
      response_body_snippet: row.response_body_snippet,
      error: row.error,
      created_at: row.created_at,
    });
  }
  return byDelivery;
}

async function listDeliveriesForUser(req, res, webhookId) {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

  if (webhookId) {
    const { rows: owned } = await db.query(
      'SELECT id FROM webhooks WHERE id = $1 AND user_id = $2',
      [webhookId, req.user.userId]
    );
    if (!owned.length) {
      return res.status(404).json({ error: 'Webhook not found' });
    }
  }

  const params = [req.user.userId];
  let whClause = '';
  if (webhookId) {
    params.push(webhookId);
    whClause = ` AND w.id = $${params.length}`;
  }
  params.push(limit);

  const { rows } = await db.query(
    `SELECT d.id, d.webhook_id, d.event_type, d.status, d.response_status,
            d.response_body_snippet, d.attempt_count, d.last_error, d.next_retry_at,
            d.delivered_at, d.failed_at, d.created_at, d.updated_at, w.url AS webhook_url
     FROM webhook_deliveries d
     JOIN webhooks w ON w.id = d.webhook_id
     WHERE w.user_id = $1 ${whClause}
     ORDER BY d.created_at DESC
     LIMIT $${params.length}`,
    params
  );

  const attemptsByDelivery = await fetchDeliveryAttempts(rows.map((r) => r.id), 'user');
  res.json(
    rows.map((row) => ({
      ...row,
      attempts: attemptsByDelivery.get(row.id) || [],
    }))
  );
}

router.get('/deliveries', requireAuth, async (req, res) => {
  await listDeliveriesForUser(req, res, req.query.webhook_id || null);
});

router.get('/:id/deliveries', requireAuth, async (req, res) => {
  await listDeliveriesForUser(req, res, req.params.id);
});

module.exports = router;
