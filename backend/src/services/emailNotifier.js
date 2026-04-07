// services/emailNotifier.js
// Sends alert notification emails via Nodemailer (SMTP).

const nodemailer = require('nodemailer');

const FROM_EMAIL = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

function getTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn('[emailNotifier] SMTP_USER or SMTP_PASS not set — emails will not be sent');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  });
}

// ---------------------------------------------------------------------------
// Email templates
// ---------------------------------------------------------------------------

function buildResponseThresholdEmail(conversation, botName) {
  const conversationUrl = `${APP_URL}/dashboard/inbox?conversation=${conversation.id}`;
  const hoursWaiting = conversation.unresolved_since
    ? Math.round((Date.now() - new Date(conversation.unresolved_since).getTime()) / 3600000)
    : '?';

  return {
    subject: `[Action Required] Customer waiting on ${botName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <h2 style="color:#121212">Customer waiting for a response</h2>
        <p>A customer (<strong>${conversation.sender_id}</strong>) has been waiting for <strong>${hoursWaiting} hour(s)</strong> on <strong>${botName}</strong>.</p>
        <p style="margin:24px 0">
          <a href="${conversationUrl}"
             style="background:#1040C0;color:white;padding:10px 20px;text-decoration:none;font-weight:bold;display:inline-block">
            View Conversation
          </a>
        </p>
        <p style="color:#888;font-size:12px">This alert was sent by Zingbizz BotBuilder.</p>
      </div>
    `,
  };
}

function buildWindowClosingEmail(conversation, botName) {
  const conversationUrl = `${APP_URL}/dashboard/inbox?conversation=${conversation.id}`;
  const minutesRemaining = conversation.minutes_remaining ?? '?';

  return {
    subject: `Reply window closing in ${minutesRemaining} min — ${botName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <h2 style="color:#D02020">WhatsApp reply window closing soon</h2>
        <p>You have <strong>${minutesRemaining} minutes</strong> left to reply to <strong>${conversation.sender_id}</strong> on <strong>${botName}</strong> before the 24-hour WhatsApp window closes.</p>
        <p>After that, you can only send approved template messages.</p>
        <p style="margin:24px 0">
          <a href="${conversationUrl}"
             style="background:#D02020;color:white;padding:10px 20px;text-decoration:none;font-weight:bold;display:inline-block">
            Reply Now
          </a>
        </p>
        <p style="color:#888;font-size:12px">This alert was sent by Zingbizz BotBuilder.</p>
      </div>
    `,
  };
}

function buildAgentSilentEmail(conversation, botName) {
  const conversationUrl = `${APP_URL}/dashboard/inbox?conversation=${conversation.id}`;

  return {
    subject: `Customer replied while you were handling a chat — ${botName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <h2 style="color:#121212">Customer is still waiting</h2>
        <p>A customer (<strong>${conversation.sender_id}</strong>) replied while you were handling their conversation on <strong>${botName}</strong> — they are still waiting for your response.</p>
        <p style="margin:24px 0">
          <a href="${conversationUrl}"
             style="background:#1040C0;color:white;padding:10px 20px;text-decoration:none;font-weight:bold;display:inline-block">
            View Conversation
          </a>
        </p>
        <p style="color:#888;font-size:12px">This alert was sent by Zingbizz BotBuilder.</p>
      </div>
    `,
  };
}

// ---------------------------------------------------------------------------
// sendAlertEmail
// ---------------------------------------------------------------------------

async function sendAlertEmail(alertType, conversation, botName, recipientEmail) {
  const transporter = getTransporter();
  if (!transporter) return;

  let template;
  if (alertType === 'response_threshold') {
    template = buildResponseThresholdEmail(conversation, botName);
  } else if (alertType === 'window_closing') {
    template = buildWindowClosingEmail(conversation, botName);
  } else if (alertType === 'agent_silent') {
    template = buildAgentSilentEmail(conversation, botName);
  } else {
    console.warn(`[emailNotifier] Unknown alert type: ${alertType}`);
    return;
  }

  try {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to: recipientEmail,
      subject: template.subject,
      html: template.html,
    });
    console.log(`[emailNotifier] sent ${alertType} email to ${recipientEmail}`);
  } catch (err) {
    console.error(`[emailNotifier] exception (${alertType}):`, err.message);
  }
}

module.exports = { sendAlertEmail };
