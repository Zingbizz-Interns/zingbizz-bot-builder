// routes/webhook.js
// Instagram webhook: verification (GET) and incoming events (POST).

const express = require('express');
const router = express.Router();
const { handleMessage } = require('../services/messageHandler');

// ---------------------------------------------------------------------------
// GET / — webhook verification
// The verify token is a single static value set once in Meta App Dev Portal.
// ---------------------------------------------------------------------------

router.get('/', (req, res) => {
  const mode        = req.query['hub.mode'];
  const verifyToken = req.query['hub.verify_token'];
  const challenge   = req.query['hub.challenge'];

  console.log('[IG] Webhook verification request received.');

  if (mode !== 'subscribe') {
    console.warn('[IG] Verification failed: hub.mode is not "subscribe".');
    return res.sendStatus(403);
  }

  if (verifyToken === process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN) {
    console.log('[IG] Webhook verified successfully.');
    return res.status(200).send(challenge);
  }

  console.warn('[IG] Webhook verification failed: token mismatch.');
  return res.sendStatus(403);
});

// ---------------------------------------------------------------------------
// POST / — incoming events
// NOTE: We respond 200 first (Meta requires fast ack), then await processing.
// Using async route keeps the Vercel serverless function alive until done.
// ---------------------------------------------------------------------------

router.post('/', async (req, res) => {
  // Acknowledge immediately — Meta will retry if it doesn't get 200 fast
  res.sendStatus(200);

  const body = req.body;

  if (body.object !== 'instagram' && body.object !== 'page') {
    console.warn(`[IG] Unexpected object type: ${body.object}. Skipping.`);
    return;
  }

  const entries = body.entry || [];
  if (entries.length === 0) {
    console.warn('[IG] Webhook payload has no entries.');
    return;
  }

  for (const entry of entries) {
    const pageId = entry.id;
    const events = [];

    if (Array.isArray(entry.messaging) && entry.messaging.length > 0) {
      events.push(...entry.messaging);
    } else if (Array.isArray(entry.changes)) {
      for (const change of entry.changes) {
        if (change.field === 'messages' && change.value) {
          const msgs = change.value.messages || [];
          for (const msg of msgs) {
            events.push({
              sender: { id: change.value.sender?.id ?? msg.from },
              message: { text: msg.text?.body },
            });
          }
          if (!msgs.length && change.value.sender) {
            events.push(change.value);
          }
        }
      }
    }

    for (const event of events) {
      if (event.message && event.message.is_echo) {
        console.log('[IG] Echo message, skipping.');
        continue;
      }

      const senderId = event.sender?.id;

      let input = null;
      if (event.postback?.payload) {
        input = event.postback.payload;
      } else if (event.message?.quick_reply?.payload) {
        input = event.message.quick_reply.payload;
      } else if (event.message?.text) {
        input = event.message.text;
      }

      if (!senderId) {
        console.warn('[IG] Missing sender ID, skipping.');
        continue;
      }

      if (!input) {
        console.log('[IG] Non-text/unsupported event, skipping.');
        continue;
      }

      console.log(`[IG] PageId: ${pageId} | Sender: ${senderId} | Input: ${String(input).slice(0, 80)}`);

      try {
        await handleMessage('instagram', senderId, pageId, input);
      } catch (err) {
        console.error(`[IG] handleMessage error for ${senderId}: ${err.message}`);
      }
    }
  }
});

module.exports = router;
