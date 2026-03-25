// services/messageSender.js
// Sends messages to WhatsApp or Instagram via the Meta Graph API.

const axios = require('axios');

const WA_BASE = 'https://graph.facebook.com/v18.0';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function truncate(str, maxLen) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen) : str;
}

async function waPost(path, payload, accessToken) {
  const url = `${WA_BASE}${path}`;
  try {
    const res = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return res.data;
  } catch (err) {
    const detail = err.response ? JSON.stringify(err.response.data) : err.message;
    throw new Error(`WA API error at ${path}: ${detail}`);
  }
}

async function igPost(path, payload, accessToken) {
  const url = `${WA_BASE}${path}?access_token=${accessToken}`;
  try {
    const res = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    return res.data;
  } catch (err) {
    const detail = err.response ? JSON.stringify(err.response.data) : err.message;
    throw new Error(`IG API error at ${path}: ${detail}`);
  }
}

// ---------------------------------------------------------------------------
// sendText
// ---------------------------------------------------------------------------

async function sendText(platform, recipientId, text, platformConfig) {
  try {
    if (platform === 'whatsapp') {
      await waPost(
        `/${platformConfig.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: recipientId,
          type: 'text',
          text: { body: text },
        },
        platformConfig.accessToken
      );
      console.log(`[WA] sendText -> ${recipientId}: ${text.slice(0, 60)}`);
    } else {
      await igPost(
        '/me/messages',
        { recipient: { id: recipientId }, message: { text } },
        platformConfig.accessToken
      );
      console.log(`[IG] sendText -> ${recipientId}: ${text.slice(0, 60)}`);
    }
  } catch (err) {
    console.error(`[${platform.toUpperCase()}] sendText error: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// sendButtons
// buttons: [{ id, title }]
// ---------------------------------------------------------------------------

async function sendButtons(platform, recipientId, text, buttons, platformConfig) {
  try {
    if (platform === 'whatsapp') {
      await sendWAButtons(recipientId, text, buttons, platformConfig);
    } else {
      await sendIGButtons(recipientId, text, buttons, platformConfig);
    }
  } catch (err) {
    console.error(`[${platform.toUpperCase()}] sendButtons error: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// WhatsApp button sending
// ≤3 → interactive buttons, 4-10 → interactive list, >10 → numbered text
// ---------------------------------------------------------------------------

async function sendWAButtons(recipientId, text, buttons, platformConfig) {
  const count = buttons.length;

  if (count === 0) {
    return sendText('whatsapp', recipientId, text, platformConfig);
  }

  if (count <= 3) {
    // Interactive reply buttons
    const payload = {
      messaging_product: 'whatsapp',
      to: recipientId,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text },
        action: {
          buttons: buttons.map((btn) => ({
            type: 'reply',
            reply: {
              id: btn.id,
              title: truncate(btn.title, 20),
            },
          })),
        },
      },
    };
    await waPost(`/${platformConfig.phoneNumberId}/messages`, payload, platformConfig.accessToken);
    console.log(`[WA] sendButtons (interactive) -> ${recipientId}: ${count} buttons`);
    return;
  }

  if (count <= 10) {
    // Interactive list message
    const payload = {
      messaging_product: 'whatsapp',
      to: recipientId,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text },
        action: {
          button: 'Choose an option',
          sections: [
            {
              title: 'Options',
              rows: buttons.map((btn) => ({
                id: btn.id,
                title: truncate(btn.title, 24),
              })),
            },
          ],
        },
      },
    };
    await waPost(`/${platformConfig.phoneNumberId}/messages`, payload, platformConfig.accessToken);
    console.log(`[WA] sendButtons (list) -> ${recipientId}: ${count} items`);
    return;
  }

  // >10: numbered text fallback
  const lines = [text, ''];
  buttons.forEach((btn, i) => {
    lines.push(`${i + 1}. ${btn.title}`);
  });
  lines.push('', 'Reply with the number of your choice.');
  await sendText('whatsapp', recipientId, lines.join('\n'), platformConfig);
  console.log(`[WA] sendButtons (numbered text) -> ${recipientId}: ${count} options`);
}

// ---------------------------------------------------------------------------
// Instagram button sending
// ≤13 → quick_replies, >13 → numbered text
// ---------------------------------------------------------------------------

async function sendIGButtons(recipientId, text, buttons, platformConfig) {
  const count = buttons.length;

  if (count === 0) {
    return sendText('instagram', recipientId, text, platformConfig);
  }

  if (count <= 13) {
    const payload = {
      recipient: { id: recipientId },
      message: {
        text,
        quick_replies: buttons.map((btn) => ({
          content_type: 'text',
          title: truncate(btn.title, 20),
          payload: btn.id,
        })),
      },
    };
    await igPost('/me/messages', payload, platformConfig.accessToken);
    console.log(`[IG] sendButtons (quick_replies) -> ${recipientId}: ${count} options`);
    return;
  }

  // >13: numbered text fallback
  const lines = [text, ''];
  buttons.forEach((btn, i) => {
    lines.push(`${i + 1}. ${btn.title}`);
  });
  lines.push('', 'Reply with the number of your choice.');
  await sendText('instagram', recipientId, lines.join('\n'), platformConfig);
  console.log(`[IG] sendButtons (numbered text) -> ${recipientId}: ${count} options`);
}

module.exports = { sendText, sendButtons };
