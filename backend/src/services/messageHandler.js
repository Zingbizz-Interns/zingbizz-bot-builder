// services/messageHandler.js
// Shared handleMessage logic used by both Instagram and WhatsApp webhooks.

const { resolveBot } = require('./tenantResolver');
const sessionManager = require('./sessionManager');
const { sendText } = require('./messageSender');
const { executeTrigger, handleFormInput, handleQueryInput } = require('./actionExecutor');
const { track } = require('./analytics');
const { upsertContact } = require('./contactManager');
const conversationStore = require('./conversationStore');
const { getCustomerAutomationGate } = require('./customerAccountControls');

// ---------------------------------------------------------------------------
// Escalation keywords — customers asking for a human agent
// Configurable per bot in Phase 5; hardcoded defaults for now.
// ---------------------------------------------------------------------------

const DEFAULT_ESCALATION_KEYWORDS = [
  'human', 'agent', 'person', 'speak to', 'talk to',
  'real person', 'support', 'help me',
];

function matchesEscalationKeyword(input, keywords) {
  const norm = input.trim().toLowerCase();
  return keywords.some((k) => norm.includes(k.toLowerCase()));
}

// ---------------------------------------------------------------------------
// Business hours helper
// ---------------------------------------------------------------------------

function isWithinBusinessHours(bh) {
  try {
    const tz = bh.timezone || 'UTC';
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'short',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    }).formatToParts(now);

    const weekday = parts.find((p) => p.type === 'weekday')?.value.toLowerCase().slice(0, 3); // 'mon','tue',...
    const hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
    const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
    const timeStr = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;

    const start = bh[`${weekday}_start`];
    const end = bh[`${weekday}_end`];

    // null start/end = closed that day
    if (!start || !end) return false;

    return timeStr >= start.slice(0, 5) && timeStr <= end.slice(0, 5);
  } catch {
    return true; // Fail open — don't block messages on error
  }
}

// UUID v4 pattern (loose check — covers the standard format)
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// Per-trigger rate limiting (in-memory, resets on server restart)
// ---------------------------------------------------------------------------

const rateLimitMap = new Map(); // key: `${triggerId}:${senderId}` → { count, windowStart }
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MESSAGE = "You've sent too many messages. Please wait a moment before trying again.";

function isRateLimited(triggerId, senderId) {
  const key = `${triggerId}:${senderId}`;
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(key, { count: 1, windowStart: now });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// ---------------------------------------------------------------------------
// Trigger keyword matcher
// ---------------------------------------------------------------------------

function matchTrigger(input, platform, triggers) {
  const norm = input.trim().toLowerCase();

  // Keyword matches first
  for (const t of triggers) {
    if (!t.platforms.includes(platform)) continue;
    if (t.trigger_type === 'single' && t.keywords[0] && t.keywords[0].toLowerCase() === norm) return t;
    if (t.trigger_type === 'multi' && t.keywords.some((k) => k.toLowerCase() === norm)) return t;
  }

  // Catch-all
  for (const t of triggers) {
    if (!t.platforms.includes(platform)) continue;
    if (t.trigger_type === 'any') return t;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Register session callbacks (call once at startup)
// ---------------------------------------------------------------------------

function registerSessionCallbacks() {
  sessionManager.onSessionWarning(async (session) => {
    const platform = session.platform;
    const platformConfig = {
      platform,
      accessToken: session.accessToken,
      phoneNumberId: session.phoneNumberId,
      pageId: session.pageId,
    };
    try {
      await sendText(platform, session.senderId, session.warningMessage, platformConfig);
    } catch (err) {
      console.error(`[messageHandler] Warning send error: ${err.message}`);
    }
  });

  sessionManager.onSessionExpiry(async (session) => {
    const platform = session.platform;
    const platformConfig = {
      platform,
      accessToken: session.accessToken,
      phoneNumberId: session.phoneNumberId,
      pageId: session.pageId,
    };
    try {
      await sendText(platform, session.senderId, 'Your session has expired.', platformConfig);
    } catch (err) {
      console.error(`[messageHandler] Expiry send error: ${err.message}`);
    }

    // Track form abandonment on expiry
    if (session.mode === 'form' && session.botId) {
      const questions = session.formQuestions || [];
      const currentQuestion = questions[session.formQIndex || 0];
      track(session.botId, 'form_abandoned', {
        triggerId: session.formTriggerId,
        platform,
        senderId: session.senderId,
      });
      if (currentQuestion) {
        track(session.botId, 'question_abandoned', {
          triggerId: session.formTriggerId,
          questionId: currentQuestion.id,
          platform,
          senderId: session.senderId,
        });
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Core handler
// ---------------------------------------------------------------------------

async function handleMessage(platform, senderId, identifier, input) {
  try {
    // 1. Resolve bot config
    const botConfig = await resolveBot(platform, identifier);
    if (!botConfig) {
      console.warn(`[messageHandler] No bot config for ${platform}:${identifier}`);
      return;
    }
    console.log(`[messageHandler] Bot resolved: ${botConfig.botId} | triggers: ${botConfig.triggers.length}`);

    // 1.5 — Get or create conversation + store incoming customer message
    // WhatsApp only: Instagram conversation storage is out of scope for Phase 1.
    let conversation = null;
    if (platform === 'whatsapp') {
      conversation = await conversationStore.getOrCreateConversation(botConfig.botId, senderId, platform);
      if (conversation) {
        await Promise.all([
          conversationStore.storeMessage(conversation.id, botConfig.botId, 'customer', input),
          conversationStore.updateLastCustomerMessage(conversation.id),
        ]);
      }
    }

    // 2.1 — Agent-active intercept: message is already stored above.
    // When an agent has taken over, skip all bot logic — Supabase Realtime
    // will push the new message INSERT to the agent's inbox automatically.
    if (platform === 'whatsapp' && conversation && conversation.status === 'agent') {
      console.log(`[messageHandler] Agent-active conversation ${conversation.id} — skipping bot routing for ${senderId}`);
      return;
    }

    // 2. Upsert contact (fire-and-forget)
    upsertContact(botConfig.botId, senderId, platform).catch((err) =>
      console.error(`[messageHandler] contact upsert error: ${err.message}`)
    );

    const sessionKey = `${platform}:${senderId}:${botConfig.botId}`;
    const platformConfig = {
      platform: botConfig.platform,
      accessToken: botConfig.accessToken,
      phoneNumberId: botConfig.phoneNumberId,
      pageId: botConfig.pageId,
      conversationId: conversation?.id ?? null,
      botId: botConfig.botId,
    };

    // 2b. Super-admin automation gate
    const automationGate = await getCustomerAutomationGate(botConfig.customerId);
    if (automationGate.isBlocked) {
      sessionManager.clearSession(sessionKey);
      console.warn(
        `[messageHandler] Automation blocked for bot ${botConfig.botId} (${automationGate.blockReason})`
      );
      if (automationGate.blockMessage) {
        await sendText(platform, senderId, automationGate.blockMessage, platformConfig);
      }
      return;
    }

    // 2c. Business hours check
    if (botConfig.businessHours && !isWithinBusinessHours(botConfig.businessHours)) {
      await sendText(platform, senderId, botConfig.businessHours.outside_hours_message, platformConfig);
      return;
    }

    // 3. Build session key and touch (creates/refreshes session + timers)
    sessionManager.touchSession(sessionKey, botConfig, senderId);
    const session = sessionManager.getSession(sessionKey);

    // 1.9 — Escalation keyword detection (WhatsApp only)
    // Must run before trigger matching so explicit escalation requests are
    // always caught, even if a trigger keyword happens to match first.
    if (platform === 'whatsapp' && conversation) {
      const escalationKeywords = botConfig.escalationKeywords || DEFAULT_ESCALATION_KEYWORDS;
      if (matchesEscalationKeyword(input, escalationKeywords)) {
        await conversationStore.markNeedsAttention(conversation.id);
        const ackMsg = 'Our team has been notified and will reply shortly.';
        await sendText(platform, senderId, ackMsg, platformConfig);
        console.log(`[messageHandler] Escalation keyword detected for ${senderId} — marked needs_attention`);
        return;
      }
    }

    // 4. Route by session mode
    if (session && session.mode === 'form') {
      await handleFormInput(input, botConfig, session, sessionKey, senderId, platformConfig, sessionManager);
      return;
    }

    if (session && session.mode === 'form_confirm_resubmit') {
      const trimmedConfirm = input.trim();
      if (trimmedConfirm === 'RESUBMIT:YES' || trimmedConfirm.toLowerCase() === 'yes') {
        const trigger = botConfig.triggers.find((t) => t.id === session.formTriggerId);
        if (trigger && trigger.form) {
          sessionManager.setSession(sessionKey, {
            mode: 'form',
            formTriggerId: trigger.id,
            formQuestions: trigger.form.questions,
            formShowProgress: trigger.form.showProgress !== false,
            formQIndex: 0,
            formAnswers: {},
          });
          const { handleFormStart } = require('./actionExecutor');
          await handleFormStart(trigger.form, platform, senderId, sessionKey, platformConfig, sessionManager);
        }
      } else {
        sessionManager.setSession(sessionKey, { mode: 'idle', formTriggerId: null });
        await sendText(platform, senderId, 'No problem! Let me know if there is anything else I can help with.', platformConfig);
      }
      return;
    }

    if (session && session.mode === 'query') {
      await handleQueryInput(input, botConfig, session, sessionKey, senderId, platformConfig, sessionManager);
      return;
    }

    // 5. Idle mode: check for trigger ID (UUID) first
    const trimmed = input.trim();
    if (UUID_PATTERN.test(trimmed)) {
      const trigger = botConfig.triggers.find((t) => t.id === trimmed);
      if (trigger) {
        if (isRateLimited(trigger.id, senderId)) {
          await sendText(platform, senderId, RATE_LIMIT_MESSAGE, platformConfig);
          return;
        }
        await executeTrigger(trigger, botConfig, session, senderId, platformConfig, sessionManager);
        track(botConfig.botId, 'trigger_fired', { triggerId: trigger.id, platform, senderId });
        return;
      }
    }

    // 6. Keyword / catch-all matching
    const trigger = matchTrigger(input, platform, botConfig.triggers);
    console.log(`[messageHandler] Trigger match for "${input}" on ${platform}: ${trigger ? trigger.id + ' (' + trigger.trigger_type + ')' : 'none'}`);
    if (trigger) {
      if (isRateLimited(trigger.id, senderId)) {
        await sendText(platform, senderId, RATE_LIMIT_MESSAGE, platformConfig);
        return;
      }
      await executeTrigger(trigger, botConfig, session, senderId, platformConfig, sessionManager);
      track(botConfig.botId, 'trigger_fired', { triggerId: trigger.id, platform, senderId });
      return;
    }

    // 7. Fallback
    await sendText(platform, senderId, botConfig.fallbackMessage, platformConfig);

    // 1.8 — Mark conversation as needing attention when bot falls back (WhatsApp only)
    if (platform === 'whatsapp' && conversation) {
      await conversationStore.markNeedsAttention(conversation.id);
      await conversationStore.incrementFallbackCount(conversation.id);
      console.log(`[messageHandler] Fallback fired for ${senderId} — marked needs_attention`);
    }
  } catch (err) {
    console.error(`[messageHandler] handleMessage error (${platform}:${senderId}): ${err.message}`);
  }
}

module.exports = { handleMessage, registerSessionCallbacks };
