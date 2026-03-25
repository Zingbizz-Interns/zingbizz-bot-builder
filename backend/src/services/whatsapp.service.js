// services/whatsapp.service.js
// Responsible for outbound WhatsApp Cloud API calls.

const axios = require('axios');
const config = require('../config/env');

/**
 * Send a WhatsApp text message.
 * @param {string} recipientPhone - WhatsApp user's phone number in international format (no +), e.g. 919876543210
 * @param {string} messageText - Text message to send
 */
async function sendWhatsAppMessage(recipientPhone, messageText) {
  const phoneNumberId = config.whatsappPhoneNumberId;
  const accessToken = config.whatsappAccessToken;

  if (!phoneNumberId || !accessToken) {
    throw new Error('Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN in environment variables.');
  }

  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    to: recipientPhone,
    type: 'text',
    text: {
      body: messageText,
    },
  };

  console.log(`📤 [WhatsApp] Sending message to ${recipientPhone}: "${messageText}"`);

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('✅ [WhatsApp] Message sent:', response.data);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(
        `❌ [WhatsApp] Graph API error ${error.response.status}:`,
        JSON.stringify(error.response.data, null, 2)
      );
    } else {
      console.error('❌ [WhatsApp] Network/unexpected error:', error.message);
    }
    throw error;
  }
}

/**
 * Send WhatsApp interactive reply buttons (max 3 buttons).
 * @param {string} recipientPhone
 * @param {string} bodyText
 * @param {Array<{id:string,title:string}>} buttons
 */
async function sendWhatsAppButtons(recipientPhone, bodyText, buttons) {
  const phoneNumberId = config.whatsappPhoneNumberId;
  const accessToken = config.whatsappAccessToken;

  if (!phoneNumberId || !accessToken) {
    throw new Error('Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN in environment variables.');
  }

  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    to: recipientPhone,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: {
        buttons: buttons.slice(0, 3).map((btn) => ({
          type: 'reply',
          reply: {
            id: String(btn.id),
            title: String(btn.title).slice(0, 20),
          },
        })),
      },
    },
  };

  console.log(`📤 [WhatsApp] Sending buttons to ${recipientPhone}: "${bodyText}"`);

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('✅ [WhatsApp] Buttons sent:', response.data);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(
        `❌ [WhatsApp] Graph API error ${error.response.status}:`,
        JSON.stringify(error.response.data, null, 2)
      );
    } else {
      console.error('❌ [WhatsApp] Network/unexpected error:', error.message);
    }
    throw error;
  }
}

/**
 * Send WhatsApp interactive list message.
 * @param {string} recipientPhone
 * @param {string} bodyText
 * @param {string} buttonText
 * @param {Array<{id:string,title:string,description?:string}>} rows
 */
async function sendWhatsAppList(recipientPhone, bodyText, buttonText, rows) {
  const phoneNumberId = config.whatsappPhoneNumberId;
  const accessToken = config.whatsappAccessToken;

  if (!phoneNumberId || !accessToken) {
    throw new Error('Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN in environment variables.');
  }

  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    to: recipientPhone,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: bodyText },
      action: {
        button: buttonText,
        sections: [
          {
            title: 'Options',
            rows: rows.slice(0, 10).map((row) => ({
              id: String(row.id),
              title: String(row.title).slice(0, 24),
              description: row.description ? String(row.description).slice(0, 72) : undefined,
            })),
          },
        ],
      },
    },
  };

  console.log(`📤 [WhatsApp] Sending list to ${recipientPhone}: "${bodyText}"`);

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('✅ [WhatsApp] List sent:', response.data);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(
        `❌ [WhatsApp] Graph API error ${error.response.status}:`,
        JSON.stringify(error.response.data, null, 2)
      );
    } else {
      console.error('❌ [WhatsApp] Network/unexpected error:', error.message);
    }
    throw error;
  }
}

module.exports = {
  sendWhatsAppMessage,
  sendWhatsAppButtons,
  sendWhatsAppList,
};
