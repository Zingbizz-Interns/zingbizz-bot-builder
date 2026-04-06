// routes/whatsapp.webhook.js
// WhatsApp webhook: verification (GET) and incoming events (POST).

const express = require('express');
const router = express.Router();
const { resolveVerifyToken } = require('../services/tenantResolver');
const { handleMessage } = require('../services/messageHandler');

// ---------------------------------------------------------------------------
// GET / — webhook verification
// ---------------------------------------------------------------------------

router.get('/', async (req, res) => {
  const mode = req.query['hub.mode'];
  const verifyToken = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('[WA] Webhook verification request received.');

  if (mode !== 'subscribe') {
    console.warn('[WA] Verification failed: hub.mode is not "subscribe".');
    return res.sendStatus(403);
  }

  try {
    const valid = await resolveVerifyToken('whatsapp', verifyToken);
    if (valid) {
      console.log('[WA] Webhook verified successfully.');
      return res.status(200).send(challenge);
    }
  } catch (err) {
    console.error('[WA] resolveVerifyToken error:', err.message);
  }

  console.warn('[WA] Webhook verification failed: token not found.');
  return res.sendStatus(403);
});

// ---------------------------------------------------------------------------
// POST / — incoming events
// ---------------------------------------------------------------------------

router.post('/', async (req, res) => {
  const body = req.body;

  if (body.object !== 'whatsapp_business_account') {
    console.warn(`[WA] Unexpected object type: ${body.object}. Skipping.`);
    return res.sendStatus(200);
  }

  const entries = body.entry || [];

  for (const entry of entries) {
    const changes = entry.changes || [];

    for (const change of changes) {
      const value = change.value || {};
      const messages = value.messages || [];
      const phoneNumberId = value.metadata && value.metadata.phone_number_id;

      if (!phoneNumberId) {
        console.warn('[WA] Missing phone_number_id in metadata, skipping change.');
        continue;
      }

      for (const message of messages) {
        const senderPhone = message.from;
        let input = null;

        if (message.type === 'text' && message.text) {
          input = message.text.body;
        } else if (message.type === 'interactive' && message.interactive) {
          if (message.interactive.button_reply) {
            input = message.interactive.button_reply.id || message.interactive.button_reply.title;
          } else if (message.interactive.list_reply) {
            input = message.interactive.list_reply.id || message.interactive.list_reply.title;
          }
        }

        if (!senderPhone) {
          console.warn('[WA] Missing sender phone, skipping.');
          continue;
        }

        if (!input) {
          console.log('[WA] Non-text/non-interactive message, skipping.');
          continue;
        }

        console.log(`[WA] Sender: ${senderPhone} | Input: ${String(input).slice(0, 80)}`);

        try {
          await handleMessage('whatsapp', senderPhone, phoneNumberId, input);
        } catch (err) {
          console.error(`[WA] handleMessage error for ${senderPhone}: ${err.message}`);
        }
      }
    }
  }

  // Respond AFTER processing — Meta allows up to 20s, processing is <5s.
  // Vercel serverless kills execution after res.end(), so respond last.
  res.sendStatus(200);
});

module.exports = router;
