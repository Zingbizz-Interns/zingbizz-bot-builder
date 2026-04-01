// routes/auth.js
// Instagram OAuth flow — initiates Meta login and handles the callback.
// Automatically captures access token + IGID and saves to platform_configs.

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const axios = require('axios');
const supabase = require('../services/supabase');

// ---------------------------------------------------------------------------
// In-memory CSRF state store: stateToken -> { botId, expiresAt }
// Prevents OAuth callback forgery — state token is single-use, expires in 10m
// ---------------------------------------------------------------------------
const pendingOAuth = new Map();
const STATE_TTL_MS = 10 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of pendingOAuth.entries()) {
    if (now > val.expiresAt) pendingOAuth.delete(key);
  }
}, 5 * 60 * 1000);

// ---------------------------------------------------------------------------
// GET /auth/instagram?botId=xxx
// Initiates the OAuth flow — redirects browser to Meta login dialog
// ---------------------------------------------------------------------------
router.get('/', (req, res) => {
  const { botId } = req.query;
  if (!botId) return res.status(400).json({ error: 'botId is required' });

  console.log('[auth] ENV CHECK:');
  console.log('  META_APP_ID                  =', process.env.META_APP_ID);
  console.log('  META_APP_SECRET              =', process.env.META_APP_SECRET ? '✓ set' : '✗ MISSING');
  console.log('  INSTAGRAM_OAUTH_REDIRECT_URI =', process.env.INSTAGRAM_OAUTH_REDIRECT_URI);
  console.log('  FRONTEND_URL                 =', process.env.FRONTEND_URL);

  const stateToken = crypto.randomBytes(16).toString('hex');
  pendingOAuth.set(stateToken, { botId, expiresAt: Date.now() + STATE_TTL_MS });

  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID,
    redirect_uri: process.env.INSTAGRAM_OAUTH_REDIRECT_URI,
    scope: 'instagram_basic,instagram_manage_messages,pages_show_list,pages_read_engagement',
    response_type: 'code',
    state: stateToken,
  });

  const finalUrl = `https://www.facebook.com/v18.0/dialog/oauth?${params}`;
  console.log('[auth] Redirecting to:', finalUrl);
  res.redirect(finalUrl);
});

// ---------------------------------------------------------------------------
// GET /auth/instagram/callback?code=xxx&state=stateToken
// Meta redirects here after user authorizes — exchanges code, fetches IGID,
// upserts into platform_configs, redirects user back to the dashboard
// ---------------------------------------------------------------------------
router.get('/callback', async (req, res) => {
  const { code, state: stateToken, error: oauthError } = req.query;

  // Validate CSRF state token
  const pending = pendingOAuth.get(stateToken);
  if (!pending || Date.now() > pending.expiresAt) {
    console.warn('[auth] Invalid or expired OAuth state token');
    return res.redirect(`${process.env.FRONTEND_URL}?error=oauth_expired`);
  }

  const { botId } = pending;
  pendingOAuth.delete(stateToken); // single-use

  const frontendReturn = `${process.env.FRONTEND_URL}/dashboard/bots/${botId}/platforms`;

  if (oauthError) {
    console.warn(`[auth] User denied OAuth: ${oauthError}`);
    return res.redirect(`${frontendReturn}?error=oauth_denied`);
  }

  try {
    // ── Step 1: Exchange auth code for short-lived user access token ──────
    const shortTokenRes = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        client_id: process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        redirect_uri: process.env.INSTAGRAM_OAUTH_REDIRECT_URI,
        code,
      },
    });
    const shortLivedToken = shortTokenRes.data.access_token;

    // ── Step 2: Extend to long-lived user access token (valid ~60 days) ───
    const longTokenRes = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        fb_exchange_token: shortLivedToken,
      },
    });
    const longLivedUserToken = longTokenRes.data.access_token;

    // ── Step 3: Get user's Facebook Pages with their page access tokens ───
    const pagesRes = await axios.get('https://graph.facebook.com/v18.0/me/accounts', {
      params: {
        access_token: longLivedUserToken,
        fields: 'id,name,access_token',
      },
    });
    const pages = pagesRes.data.data || [];

    if (pages.length === 0) {
      console.warn(`[auth] No Facebook Pages found for botId=${botId}`);
      return res.redirect(`${frontendReturn}?error=no_pages`);
    }

    // ── Step 4: Find the first page with a connected Instagram Business Account
    let igAccountId = null;
    let pageAccessToken = null;
    let fbPageId = null;
    let pageName = null;

    for (const page of pages) {
      const igRes = await axios.get(`https://graph.facebook.com/v18.0/${page.id}`, {
        params: {
          fields: 'instagram_business_account',
          access_token: page.access_token,
        },
      });
      if (igRes.data.instagram_business_account) {
        igAccountId = igRes.data.instagram_business_account.id;
        pageAccessToken = page.access_token;
        fbPageId = page.id;
        pageName = page.name;
        break;
      }
    }

    if (!igAccountId) {
      console.warn(`[auth] No Instagram Business Account linked to any page for botId=${botId}`);
      return res.redirect(`${frontendReturn}?error=no_instagram`);
    }

    // ── Step 5: Auto-generate a verify_token for this connection ──────────
    const verifyToken = crypto.randomBytes(20).toString('hex');

    // ── Step 6: Upsert into platform_configs ──────────────────────────────
    const { error: dbError } = await supabase
      .from('platform_configs')
      .upsert(
        {
          bot_id: botId,
          platform: 'instagram',
          page_id: igAccountId,
          access_token: pageAccessToken,
          verify_token: verifyToken,
          is_active: true,
        },
        { onConflict: 'bot_id,platform' }
      );

    if (dbError) {
      console.error('[auth] DB upsert error:', dbError.message);
      return res.redirect(`${frontendReturn}?error=db_error`);
    }

    console.log(`[auth] Instagram connected — botId=${botId} | IGID=${igAccountId} | page="${pageName}"`);

    // ── Step 7: Subscribe Facebook Page to webhook (best-effort) ─────────
    try {
      await axios.post(
        `https://graph.facebook.com/v18.0/${fbPageId}/subscribed_apps`,
        null,
        {
          params: {
            subscribed_fields: 'messages,messaging_postbacks',
            access_token: pageAccessToken,
          },
        }
      );
      console.log(`[auth] Webhook subscribed for fbPageId=${fbPageId}`);
    } catch (subErr) {
      // Non-fatal — user can still use the bot, webhook subscription may already exist
      console.warn('[auth] Webhook subscription failed (non-fatal):', subErr.response?.data?.error?.message || subErr.message);
    }

    return res.redirect(`${frontendReturn}?ig_connected=1`);
  } catch (err) {
    const apiError = err.response?.data?.error?.message || err.message;
    console.error('[auth] OAuth callback error:', apiError);
    return res.redirect(`${frontendReturn}?error=oauth_failed`);
  }
});

module.exports = router;
