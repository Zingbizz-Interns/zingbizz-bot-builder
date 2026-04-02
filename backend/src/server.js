// src/server.js
// Entry point — creates the Express app and starts the HTTP server.

// Load and validate environment variables FIRST
require('./config/env');

const express = require('express');
const bodyParser = require('body-parser');

const { registerSessionCallbacks } = require('./services/messageHandler');
const webhookRouter = require('./routes/webhook');
const whatsappWebhookRouter = require('./routes/whatsapp.webhook');

const { port } = require('./config/env');

// ─── Register session lifecycle callbacks ─────────────────────────────────────
// Must happen before any messages are processed
registerSessionCallbacks();

// ─── Create Express app ───────────────────────────────────────────────────────
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/webhook', webhookRouter);
app.use('/webhook/whatsapp', whatsappWebhookRouter);

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Multi-tenant chatbot engine is running.' });
});

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[server] Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(port, () => {
  console.log(`[server] Multi-tenant chatbot engine running on http://localhost:${port}`);
  console.log(`[server] Instagram webhook : http://localhost:${port}/webhook`);
  console.log(`[server] WhatsApp webhook  : http://localhost:${port}/webhook/whatsapp`);
});
