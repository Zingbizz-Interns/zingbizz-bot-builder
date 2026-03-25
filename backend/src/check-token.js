// src/check-token.js
// Diagnoses PAGE_ACCESS_TOKEN and app credentials directly from .env.

require('./config/env');
const axios = require('axios');

function mask(value) {
  if (!value) return '(missing)';
  if (value.length <= 10) return '**********';
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function describeWhitespace(label, value) {
  if (typeof value !== 'string') {
    console.log(`- ${label}: missing`);
    return;
  }

  const hasLeading = /^\s/.test(value);
  const hasTrailing = /\s$/.test(value);
  const hasInternalNewline = /\n|\r/.test(value);

  console.log(`- ${label}: length=${value.length}, masked=${mask(value)}`);
  console.log(`  leadingWhitespace=${hasLeading}, trailingWhitespace=${hasTrailing}, containsNewline=${hasInternalNewline}`);
}

async function main() {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const pageToken = process.env.PAGE_ACCESS_TOKEN;

  console.log('Token diagnostics');
  describeWhitespace('META_APP_ID', appId);
  describeWhitespace('META_APP_SECRET', appSecret);
  describeWhitespace('PAGE_ACCESS_TOKEN', pageToken);

  if (!appId || !appSecret || !pageToken) {
    console.error('\n❌ Missing required env vars. Check .env file.');
    process.exit(1);
  }

  try {
    const meRes = await axios.get('https://graph.facebook.com/v19.0/me', {
      params: {
        fields: 'id,name,tasks',
        access_token: pageToken,
      },
      timeout: 15000,
    });

    console.log('\n✅ /me success');
    console.log(JSON.stringify(meRes.data, null, 2));
  } catch (error) {
    console.log('\n❌ /me failed');
    if (error.response) {
      console.log(JSON.stringify(error.response.data, null, 2));
    } else {
      console.log(error.message);
    }
  }

  try {
    const debugRes = await axios.get('https://graph.facebook.com/debug_token', {
      params: {
        input_token: pageToken,
        access_token: `${appId}|${appSecret}`,
      },
      timeout: 15000,
    });

    console.log('\n✅ debug_token success');
    console.log(JSON.stringify(debugRes.data, null, 2));
  } catch (error) {
    console.log('\n❌ debug_token failed');
    if (error.response) {
      console.log(JSON.stringify(error.response.data, null, 2));
    } else {
      console.log(error.message);
    }
  }
}

main();
