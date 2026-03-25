// routes/webhook.js
// Instagram webhook: verification (GET) and incoming events (POST).

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

  console.log('[IG] Webhook verification request received.');

  if (mode !== 'subscribe') {
    console.warn('[IG] Verification failed: hub.mode is not "subscribe".');
    return res.sendStatus(403);
  }

  try {
    const valid = await resolveVerifyToken('instagram', verifyToken);
    if (valid) {
      console.log('[IG] Webhook verified successfully.');
      return res.status(200).send(challenge);
    }
  } catch (err) {
    console.error('[IG] resolveVerifyToken error:', err.message);
  }

  console.warn('[IG] Webhook verification failed: token not found.');
  return res.sendStatus(403);
});

// ---------------------------------------------------------------------------
// POST / — incoming events
// ---------------------------------------------------------------------------

router.post('/', (req, res) => {
  // Respond immediately — Meta requires fast 200 response
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

  // Process entries asynchronously without blocking the response
  setImmediate(async () => {
    for (const entry of entries) {
      const pageId = entry.id; // identifies which bot/page this is for

      // Collect all messaging events from this entry
      const events = [];

      if (Array.isArray(entry.messaging) && entry.messaging.length > 0) {
        events.push(...entry.messaging);
      } else if (Array.isArray(entry.changes)) {
        for (const change of entry.changes) {
          if (change.field === 'messages' && change.value) {
            // changes format sometimes has value.messages array
            const msgs = change.value.messages || [];
            for (const msg of msgs) {
              // Synthesize an event-like structure
              events.push({
                sender: { id: change.value.sender && change.value.sender.id ? change.value.sender.id : msg.from },
                message: { text: msg.text && msg.text.body },
              });
            }
            // Also handle if change.value is an event directly
            if (!msgs.length && change.value.sender) {
              events.push(change.value);
            }
          }
        }
      }

      for (const event of events) {
        // Skip echo messages
        if (event.message && event.message.is_echo) {
          console.log('[IG] Echo message, skipping.');
          continue;
        }

        const senderId = event.sender && event.sender.id;

        // Extract input from postback, quick_reply, or text
        let input = null;
        if (event.postback && event.postback.payload) {
          input = event.postback.payload;
        } else if (event.message && event.message.quick_reply && event.message.quick_reply.payload) {
          input = event.message.quick_reply.payload;
        } else if (event.message && event.message.text) {
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

        console.log(`[IG] Sender: ${senderId} | Input: ${String(input).slice(0, 80)}`);

        try {
          await handleMessage('instagram', senderId, pageId, input);
        } catch (err) {
          console.error(`[IG] handleMessage error for ${senderId}: ${err.message}`);
        }
      }
    }
  });
});

module.exports = router;
