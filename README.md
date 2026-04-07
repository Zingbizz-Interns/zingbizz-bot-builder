# Instagram + WhatsApp Messaging Bot

A minimal Node.js + Express bot that receives and replies to:

- Instagram Direct Messages (via Meta Messaging API)
- WhatsApp messages (via WhatsApp Cloud API)

---asjfjakshfajksfh

## Project Structure

```
instagram_bot/
├── src/
│   ├── server.js                  # Entry point – starts the Express server
│   ├── config/
│   │   └── env.js                 # Loads .env and exports config values
│   ├── routes/
│   │   ├── webhook.js             # Instagram GET + POST /webhook handlers
│   │   └── whatsapp.webhook.js    # WhatsApp GET + POST /webhook/whatsapp handlers
│   └── services/
│       ├── instagram.service.js   # Instagram send API helper
│       ├── whatsapp.service.js    # WhatsApp Cloud API helper
│       └── form.service.js        # In-memory form sessions
├── .env                           # Your secret credentials (never commit this)
├── package.json
└── README.md
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or newer
- A [Meta Developer](https://developers.facebook.com/) account
- An Instagram Business or Creator account connected to a Facebook Page
- [ngrok](https://ngrok.com/) (for local webhook testing)

---

## 1 – Install Dependencies

```bash
cd instagram_bot
npm install
```

This installs:
| Package | Purpose |
|---|---|
| `express` | HTTP server and routing |
| `axios` | HTTP client for Graph API calls |
| `dotenv` | Loads `.env` into `process.env` |
| `body-parser` | Parses incoming JSON webhook payloads |

---

## 2 – Configure Environment Variables

Open the `.env` file in the project root and fill in your credentials:

```env
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret

INSTAGRAM_APP_ID=your_instagram_app_id
INSTAGRAM_APP_SECRET=your_instagram_app_secret

INSTAGRAM_BUSINESS_ACCOUNT_ID=your_instagram_business_account_id

PAGE_ACCESS_TOKEN=your_page_access_token
VERIFY_TOKEN=any_random_secret_string_you_choose

WHATSAPP_ACCESS_TOKEN=your_whatsapp_cloud_api_token
WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_whatsapp_business_account_id
WHATSAPP_VERIFY_TOKEN=another_random_secret_for_whatsapp_webhook
```

### Environment Variables – Where to Get Each One

#### Instagram variables

1. `META_APP_ID`, `META_APP_SECRET`
   - Meta App Dashboard -> **App settings** -> **Basic**
2. `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`
   - In many setups these are the same app credentials from your Meta app
3. `INSTAGRAM_BUSINESS_ACCOUNT_ID`
   - Meta dashboard / Graph API explorer after connecting Instagram business account
4. `PAGE_ACCESS_TOKEN`
   - Meta dashboard -> **Messenger / Instagram** -> generate Page Access Token
5. `VERIFY_TOKEN`
   - You create this manually (any secure random string)

#### WhatsApp variables (step-by-step)

1. Open [Meta for Developers](https://developers.facebook.com/) and open your app.
2. Add the **WhatsApp** product to the app.
3. In **WhatsApp -> API Setup** copy:
   - `WHATSAPP_PHONE_NUMBER_ID`
   - `WHATSAPP_BUSINESS_ACCOUNT_ID`
4. In the same page, generate/copy a token:
   - `WHATSAPP_ACCESS_TOKEN`
5. Create your own verify token string:
   - `WHATSAPP_VERIFY_TOKEN` (example: `my_whatsapp_verify_token_123`)
6. Put all values in `.env`.

Notes:

- Temporary tokens expire quickly. For stable testing, create a system user token with the required WhatsApp permissions.
- Never commit real tokens to git.

---

## 3 – Run the Server

```bash
npm start
```

You should see:

```
🚀 Meta messaging bot server is running on http://localhost:3000
   Instagram webhook : http://localhost:3000/webhook
   WhatsApp webhook  : http://localhost:3000/webhook/whatsapp
```

For development with auto-restart on file changes (Node.js v18+):

```bash
npm run dev
```

---

## 4 – Expose Localhost with ngrok

Meta's servers need to reach your local machine over the internet. Use **ngrok** to create a secure public tunnel.

### Install ngrok

Download from [https://ngrok.com/download](https://ngrok.com/download) or install via npm:

```bash
npm install -g ngrok
```

### Start the tunnel

In a **separate terminal**, run:

```bash
ngrok http 3000
```

ngrok will output something like:

```
Forwarding   https://a1b2-12-34-56-78.ngrok-free.app -> http://localhost:3000
```

Copy the `https://...` URL – this is your public webhook URL.

---

## 5 – Configure Instagram Webhook in Meta Dashboard

1. Open your app at [developers.facebook.com](https://developers.facebook.com/).
2. In the left sidebar, go to **Instagram** (or **Messenger**) → **Webhooks**.
3. Click **Add Callback URL** and enter:
   - **Callback URL:** `https://your-ngrok-url.ngrok-free.app/webhook`
   - **Verify Token:** the exact value you set for `VERIFY_TOKEN` in `.env`
4. Click **Verify and Save**.

Meta will send a `GET /webhook` request to your server. If the server is running and the token matches, verification succeeds.

5. Subscribe to the **`messages`** field to receive incoming DMs.

---

## 6 – Configure WhatsApp Webhook in Meta Dashboard

1. In your app, go to **WhatsApp -> Configuration**.
2. Set callback URL to:
   - `https://your-ngrok-url.ngrok-free.app/webhook/whatsapp`
3. Set verify token to:
   - value of `WHATSAPP_VERIFY_TOKEN` from your `.env`
4. Click **Verify and save**.
5. Subscribe to message notifications (messages).

Meta will send `GET /webhook/whatsapp` to verify.

---

## 7 – Test the Bot

Send a Direct Message to your Instagram Business account from any Instagram account. The bot will:

1. Receive the event at `POST /webhook`.
2. Log the full payload to the console.
3. Extract the sender ID and message text.
4. Reply with **"Hi"**.

For WhatsApp, send a WhatsApp message to your configured test number. The bot will:

1. Receive event at `POST /webhook/whatsapp`.
2. Log the full payload.
3. Extract sender phone and message text.
4. Continue the same school-application form flow.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Webhook verification fails (403) | Make sure `VERIFY_TOKEN` in `.env` matches exactly what you entered in the dashboard. |
| Messages not received | Ensure the `messages` webhook field is subscribed in the Meta dashboard. |
| Graph API 190 error (invalid token) | Regenerate your `PAGE_ACCESS_TOKEN` in the Meta developer portal. |
| WhatsApp send fails (401/403) | Check `WHATSAPP_ACCESS_TOKEN` and ensure it has WhatsApp Cloud API permissions. |
| WhatsApp webhook not verifying | Ensure callback is `/webhook/whatsapp` and token matches `WHATSAPP_VERIFY_TOKEN`. |
| ngrok URL changed | Every restart of ngrok generates a new URL – update the callback URL in the dashboard. |

---

## Security Notes

- **Never commit `.env`** to version control. It is already listed in `.gitignore`.
- Rotate your `PAGE_ACCESS_TOKEN` regularly.
- In production, validate the `X-Hub-Signature-256` header on POST requests to confirm events genuinely come from Meta.
