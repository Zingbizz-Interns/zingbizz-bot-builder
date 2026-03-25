// src/test.js
// Quick standalone tester for Instagram Messaging API.
// Usage:
//   node src/test.js <IGSID> [message]
// Example:
//   node src/test.js 1234567890 "Hi"

require('./config/env');

const axios = require('axios');

const GRAPH_API_URL = 'https://graph.facebook.com/v19.0/me/messages';

async function main() {
  const recipientId = process.argv[2];
  const messageText = process.argv[3] || 'Hi';
  const accessToken = process.env.PAGE_ACCESS_TOKEN;

  if (!accessToken) {
    console.error('❌ PAGE_ACCESS_TOKEN is missing in .env');
    process.exit(1);
  }

  if (!recipientId) {
    console.error('❌ Missing recipient IGSID.');
    console.log('Usage: node src/test.js <IGSID> [message]');
    process.exit(1);
  }

  const payload = {
    messaging_product: 'instagram',
    recipient: { id: recipientId },
    message: { text: messageText },
  };

  console.log('📤 Sending test message...');
  console.log(`   recipient: ${recipientId}`);
  console.log(`   text     : ${messageText}`);

  try {
    const response = await axios.post(GRAPH_API_URL, payload, {
      params: { access_token: accessToken },
    });

    console.log('✅ Success:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (error.response) {
      console.error(`❌ Graph API error ${error.response.status}:`);
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('❌ Network/unexpected error:', error.message);
    }
    process.exit(1);
  }
}

main();
