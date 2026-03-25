// services/instagram.service.js

const axios = require('axios');
const config = require('../config/env');

const GRAPH_API_URL = `https://graph.facebook.com/v21.0/${process.env.FACEBOOK_PAGE_ID}/messages`;

async function post(recipientId, message) {
  const payload = {
    messaging_product: "instagram",
    recipient: { id: recipientId },
    message,
  };

  try {
    const response = await axios.post(GRAPH_API_URL, payload, {
      params: { access_token: config.pageAccessToken },
    });
    console.log("✅ Message sent:", response.data);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(
        `❌ Graph API error ${error.response.status}:`,
        JSON.stringify(error.response.data, null, 2)
      );
    } else {
      console.error("❌ Network error:", error.message);
    }
    throw error;
  }
}

async function sendMessage(recipientId, text) {
  console.log(`📤 Sending message to ${recipientId}: "${text}"`);
  return post(recipientId, { text });
}

// options: [{ title, payload }]
async function sendQuickReplies(recipientId, text, options) {
  console.log(`📤 Sending quick replies to ${recipientId}: "${text}"`);
  return post(recipientId, {
    text,
    quick_replies: options.slice(0, 13).map((o) => ({
      content_type: "text",
      title: String(o.title).slice(0, 20),
      payload: String(o.payload),
    })),
  });
}

module.exports = { sendMessage, sendQuickReplies };
