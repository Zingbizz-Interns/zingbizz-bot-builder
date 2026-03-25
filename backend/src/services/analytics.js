// services/analytics.js
// Fire-and-forget analytics event insertion.

const supabase = require('./supabase');

/**
 * Track an analytics event.
 * @param {string} botId
 * @param {string} eventType  — must match analytics_events.event_type CHECK constraint
 * @param {{ triggerId?, questionId?, platform?, senderId? }} opts
 */
async function track(botId, eventType, opts = {}) {
  try {
    await supabase.from('analytics_events').insert({
      bot_id: botId,
      event_type: eventType,
      trigger_id: opts.triggerId || null,
      question_id: opts.questionId || null,
      platform: opts.platform || null,
      sender_id: opts.senderId || null,
    });
  } catch (err) {
    console.error(`[analytics] track error (${eventType}): ${err.message}`);
  }
}

module.exports = { track };
