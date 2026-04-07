// jobs/alertScheduler.js
// Runs three alert checks every 5 minutes.
// Called via node-cron in server.js.

const supabase = require('../services/supabase');
const { sendAlertEmail } = require('../services/emailNotifier');

// ---------------------------------------------------------------------------
// 4.1 — Response threshold alert
// Fires when a conversation has needed attention longer than the threshold.
// ---------------------------------------------------------------------------

async function checkResponseThreshold() {
  const { data: rows, error } = await supabase
    .from('conversations')
    .select(`
      id, sender_id, bot_id, platform,
      unresolved_since, last_customer_message_at,
      alert_settings!inner(threshold_minutes, notify_email, enabled),
      bots!inner(name, customer_id)
    `)
    .eq('needs_attention', true)
    .neq('status', 'agent')
    .neq('status', 'closed')
    .eq('alert_settings.enabled', true);

  if (error) {
    console.error('[alertScheduler] checkResponseThreshold fetch error:', error.message);
    return;
  }

  for (const conv of rows ?? []) {
    const settings = conv.alert_settings;
    const bot = conv.bots;

    if (!conv.unresolved_since) continue;

    const unresolvedMs = Date.now() - new Date(conv.unresolved_since).getTime();
    const thresholdMs = settings.threshold_minutes * 60 * 1000;

    if (unresolvedMs < thresholdMs) continue;

    // Check we haven't already alerted within 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('alerts')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conv.id)
      .eq('alert_type', 'response_threshold')
      .gte('triggered_at', oneHourAgo);

    if (count > 0) continue;

    // Insert alert
    const { error: insertErr } = await supabase.from('alerts').insert({
      conversation_id: conv.id,
      bot_id: conv.bot_id,
      alert_type: 'response_threshold',
    });

    if (insertErr) {
      console.error('[alertScheduler] insert response_threshold error:', insertErr.message);
      continue;
    }

    console.log(`[alertScheduler] response_threshold alert for conv ${conv.id}`);

    // Send email
    if (settings.notify_email) {
      const email = await getOwnerEmail(bot.customer_id);
      if (email) {
        await sendAlertEmail('response_threshold', conv, bot.name, email);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 4.2 — 24hr window closing alert
// Fires when the WhatsApp reply window is about to close.
// ---------------------------------------------------------------------------

async function checkWindowClosing() {
  const { data: rows, error } = await supabase
    .from('conversations')
    .select(`
      id, sender_id, bot_id, platform,
      last_customer_message_at,
      alert_settings!inner(window_warning_minutes, window_warning_enabled, notify_email),
      bots!inner(name, customer_id)
    `)
    .eq('platform', 'whatsapp')
    .neq('status', 'closed')
    .not('last_customer_message_at', 'is', null)
    .eq('alert_settings.window_warning_enabled', true);

  if (error) {
    console.error('[alertScheduler] checkWindowClosing fetch error:', error.message);
    return;
  }

  const now = Date.now();

  for (const conv of rows ?? []) {
    const settings = conv.alert_settings;
    const bot = conv.bots;

    const lastMsgMs = new Date(conv.last_customer_message_at).getTime();
    const ageMs = now - lastMsgMs;
    const windowMs = 24 * 60 * 60 * 1000;
    const warningMs = settings.window_warning_minutes * 60 * 1000;

    // Window must not yet be expired AND must be within warning period
    if (ageMs >= windowMs) continue;
    if (ageMs < windowMs - warningMs) continue;

    // Check we haven't alerted within 1 hour
    const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('alerts')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conv.id)
      .eq('alert_type', 'window_closing')
      .gte('triggered_at', oneHourAgo);

    if (count > 0) continue;

    const { error: insertErr } = await supabase.from('alerts').insert({
      conversation_id: conv.id,
      bot_id: conv.bot_id,
      alert_type: 'window_closing',
    });

    if (insertErr) {
      console.error('[alertScheduler] insert window_closing error:', insertErr.message);
      continue;
    }

    const minutesRemaining = Math.round((windowMs - ageMs) / 60000);
    console.log(`[alertScheduler] window_closing alert for conv ${conv.id} (${minutesRemaining} min left)`);

    if (settings.notify_email) {
      const email = await getOwnerEmail(bot.customer_id);
      if (email) {
        await sendAlertEmail('window_closing', { ...conv, minutes_remaining: minutesRemaining }, bot.name, email);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 4.3 — Agent went silent alert
// Fires when an agent took over but hasn't replied after the customer messaged.
// ---------------------------------------------------------------------------

async function checkAgentSilent() {
  const { data: rows, error } = await supabase
    .from('conversations')
    .select(`
      id, sender_id, bot_id,
      last_customer_message_at, last_reply_at,
      alert_settings!inner(threshold_minutes, notify_email, enabled),
      bots!inner(name, customer_id)
    `)
    .eq('status', 'agent')
    .not('last_customer_message_at', 'is', null)
    .eq('alert_settings.enabled', true);

  if (error) {
    console.error('[alertScheduler] checkAgentSilent fetch error:', error.message);
    return;
  }

  const now = Date.now();

  for (const conv of rows ?? []) {
    const settings = conv.alert_settings;
    const bot = conv.bots;

    const lastCustomerMs = new Date(conv.last_customer_message_at).getTime();
    const lastReplyMs = conv.last_reply_at ? new Date(conv.last_reply_at).getTime() : 0;

    // Customer must have messaged AFTER the last agent reply
    if (lastCustomerMs <= lastReplyMs) continue;

    // That customer message must be older than the threshold
    const silentMs = now - lastCustomerMs;
    const thresholdMs = settings.threshold_minutes * 60 * 1000;
    if (silentMs < thresholdMs) continue;

    // Check we haven't alerted within 1 hour
    const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('alerts')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conv.id)
      .eq('alert_type', 'agent_silent')
      .gte('triggered_at', oneHourAgo);

    if (count > 0) continue;

    const { error: insertErr } = await supabase.from('alerts').insert({
      conversation_id: conv.id,
      bot_id: conv.bot_id,
      alert_type: 'agent_silent',
    });

    if (insertErr) {
      console.error('[alertScheduler] insert agent_silent error:', insertErr.message);
      continue;
    }

    console.log(`[alertScheduler] agent_silent alert for conv ${conv.id}`);

    if (settings.notify_email) {
      const email = await getOwnerEmail(bot.customer_id);
      if (email) {
        await sendAlertEmail('agent_silent', conv, bot.name, email);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Helper: get bot owner email from customer_profiles
// ---------------------------------------------------------------------------

async function getOwnerEmail(customerId) {
  const { data } = await supabase
    .from('customer_profiles')
    .select('email')
    .eq('id', customerId)
    .single();
  return data?.email ?? null;
}

// ---------------------------------------------------------------------------
// runAlertChecks — called by cron scheduler
// ---------------------------------------------------------------------------

async function runAlertChecks() {
  await Promise.all([
    checkResponseThreshold(),
    checkWindowClosing(),
    checkAgentSilent(),
  ]);
}

module.exports = { runAlertChecks };
