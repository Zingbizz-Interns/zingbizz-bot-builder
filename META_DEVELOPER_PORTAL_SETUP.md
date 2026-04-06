# Meta Developer Portal Setup Guide
**For Zingbizz Bot Builder — App Creator Reference**

This document covers everything you (the app creator) must configure once in Meta Developer Portal. End users connect their accounts through the app UI — they don't touch this portal.

---

## Prerequisites

- A Meta Developer account at developers.facebook.com
- Your backend deployed (e.g., `https://zingbizz-bot-builder-lr7k.vercel.app`)
- Your frontend deployed (e.g., `https://zingbizz-bot-builder.vercel.app`)

---

## Part 1 — Instagram (Direct Messages)

### How it works
Users click "Connect with Instagram" in the dashboard. They go through Facebook OAuth, grant permissions, and the app automatically stores their credentials and subscribes to webhooks. No manual token entry needed.

---

### Step 1 — Create / Open Your Meta App

1. Go to **developers.facebook.com → My Apps**
2. Select your existing app (App ID: `1594187028467603`) or create a new one
3. App type: **Business**

---

### Step 2 — Add the "Facebook Login for Business" Use Case

> This is the correct product for use-case based apps. Do NOT use "Facebook Login" (personal) or "Instagram Business Login" (different OAuth flow).

1. In your app dashboard → **Add Use Case**
2. Select **Facebook Login for Business**
3. Click **Customize** (or **Settings**) on the use case

---

### Step 3 — Configure OAuth Redirect URI

1. Inside Facebook Login for Business → **Settings**
2. Under **Valid OAuth Redirect URIs**, add:
   ```
   https://zingbizz-bot-builder.vercel.app/api/instagram/callback
   ```
3. Save changes

---

### Step 4 — Set OAuth Scopes

The app requests these scopes at runtime (already coded). Ensure your app has access to them:

| Scope | Purpose |
|-------|---------|
| `pages_show_list` | List Facebook Pages the user manages |
| `pages_read_engagement` | Read page metadata |
| `instagram_basic` | Access linked Instagram Business Account |
| `instagram_manage_messages` | Send/receive Instagram DMs |

To verify:
1. App dashboard → **App Review → Permissions and Features**
2. Confirm all 4 scopes are listed (request advanced access before going live)

---

### Step 5 — Configure the Instagram Webhook

> This is the app-level webhook. It receives ALL Instagram DM events for any page connected through your app.

1. App dashboard → **Webhooks** (in the left sidebar)
2. Select **Instagram** from the dropdown (not Page)
3. Click **Subscribe to this object** (or **Edit** if already set)
4. Set:
   - **Callback URL**: `https://zingbizz-bot-builder-lr7k.vercel.app/webhook`
   - **Verify Token**: `zingbizz_ig_webhook`
5. Click **Verify and Save**
6. After verification, subscribe to these fields:
   - `messages`
   - `messaging_postbacks`
   - `messaging_optins`

> The verify token `zingbizz_ig_webhook` must match `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` in your backend `.env`.

---

### Step 6 — App Mode

- **Development mode**: Only works for accounts added as Testers/Developers in the app. Use this while building.
- **Live mode**: Required for real users. Requires App Review for advanced permissions (`instagram_manage_messages`).

To add testers:
1. App dashboard → **Roles → Roles**
2. Add Instagram test accounts under **Instagram Testers**

---

### Backend `.env` for Instagram

```env
INSTAGRAM_WEBHOOK_VERIFY_TOKEN=zingbizz_ig_webhook
```

### Frontend `.env` for Instagram

```env
NEXT_PUBLIC_INSTAGRAM_APP_ID=1594187028467603
INSTAGRAM_APP_SECRET=f05a6bfc6aad58440dbea2249bbf1371
NEXT_PUBLIC_APP_URL=https://zingbizz-bot-builder.vercel.app
```

---

## Part 2 — WhatsApp (Business Messages)

### How it works
WhatsApp is manual — each user enters their own WhatsApp credentials (Phone Number ID, Access Token, WABA ID, Verify Token) in the bot dashboard. The app stores these per-bot and uses them for routing.

---

### Step 1 — Add the WhatsApp Product

1. App dashboard → **Add Product**
2. Select **WhatsApp** → **Set Up**

---

### Step 2 — Configure the WhatsApp Webhook

1. App dashboard → **WhatsApp → Configuration**
2. Under **Webhook**, click **Edit**
3. Set:
   - **Callback URL**: `https://zingbizz-bot-builder-lr7k.vercel.app/webhook/whatsapp`
   - **Verify Token**: This is **per-user** — each user enters their own verify token when connecting their WhatsApp number. The backend looks it up in the DB dynamically.

> For the initial verification of the webhook URL itself, Meta will send a test request. Make sure the backend is live before clicking "Verify and Save".

4. Under **Webhook Fields**, subscribe to:
   - `messages`

---

### Step 3 — What Each User Needs to Provide

When a user connects their WhatsApp number in the dashboard, they must enter:

| Field | Where to find it |
|-------|-----------------|
| **Phone Number ID** | WhatsApp → Getting Started → Phone Number ID |
| **Access Token** | WhatsApp → Getting Started → Temporary or Permanent Token |
| **WABA ID** | WhatsApp → Getting Started → WhatsApp Business Account ID |
| **Verify Token** | Any string they choose — must match what they enter in Meta Developer Portal → WhatsApp → Configuration → Webhook |

> Each business has their own WhatsApp Business Account. They configure the webhook verify token themselves in their own Meta app (or yours, if you manage it for them).

---

### Step 4 — Permanent Access Tokens (for production)

Temporary tokens expire in 24 hours. For production:

1. Create a **System User** in Meta Business Suite
2. Assign the WhatsApp number to the System User
3. Generate a **permanent token** for the System User
4. Users enter this permanent token when connecting

---

### Step 5 — App Review for WhatsApp

For sending messages to real users (outside the 24-hour window):

1. App Review → Request `whatsapp_business_messaging` permission
2. Required for template messages (proactive outreach)
3. Reactive messages (user sends first) work without review

---

## Summary Table

| | Instagram | WhatsApp |
|--|-----------|---------|
| **Connection flow** | One-click OAuth (handled by app) | Manual credential entry |
| **Webhook URL** | `/webhook` | `/webhook/whatsapp` |
| **Verify token** | Single static token (app-level) | Per-user, stored in DB |
| **Routing key** | Instagram Business Account ID (`entry.id`) | Phone Number ID |
| **Token type** | Facebook Page access token | WhatsApp System User token |
| **App product** | Facebook Login for Business | WhatsApp |
| **App Review needed** | `instagram_manage_messages` (for live) | `whatsapp_business_messaging` (for templates) |

---

## Webhook URLs Reference

| Platform | URL |
|----------|-----|
| Instagram | `https://zingbizz-bot-builder-lr7k.vercel.app/webhook` |
| WhatsApp | `https://zingbizz-bot-builder-lr7k.vercel.app/webhook/whatsapp` |

---

## Things to Do Before Going Live

- [ ] Switch app from Development to Live mode in Meta portal
- [ ] Submit `instagram_manage_messages` for App Review
- [ ] Replace temporary WhatsApp tokens with permanent System User tokens
- [ ] Ensure backend is deployed and webhook URLs return 200 on GET (verification)
- [ ] Add production domain to OAuth redirect URIs if URL changes
