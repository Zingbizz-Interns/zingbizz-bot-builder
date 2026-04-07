// config/env.js
// Loads environment variables from .env and exports them with clear names.
// Import this file at the very top of server.js so every other module
// can safely read from process.env.

require('dotenv').config();

const config = {
  port: process.env.PORT || 3000,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  appUrl: process.env.APP_URL,
  smtpHost: process.env.SMTP_HOST,
  smtpPort: process.env.SMTP_PORT,
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  smtpFromEmail: process.env.SMTP_FROM_EMAIL,
};

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
required.forEach((key) => {
  if (!process.env[key]) {
    console.warn(`[config] Warning: environment variable ${key} is not set.`);
  }
});

module.exports = config;
