// services/sessionManager.js
// In-memory session management for multi-tenant bot conversations.
// Session key format: "{platform}:{senderId}:{botId}"

const sessions = new Map();

let warningCallback = null;
let expiryCallback = null;

// ---------------------------------------------------------------------------
// Callback registration
// ---------------------------------------------------------------------------

function onSessionWarning(fn) {
  warningCallback = fn;
}

function onSessionExpiry(fn) {
  expiryCallback = fn;
}

// ---------------------------------------------------------------------------
// Core session operations
// ---------------------------------------------------------------------------

function getSession(key) {
  return sessions.get(key) || null;
}

function setSession(key, data) {
  const existing = sessions.get(key) || {};
  sessions.set(key, Object.assign({}, existing, data));
}

function clearSession(key) {
  const session = sessions.get(key);
  if (session) {
    if (session.warningTimer) clearTimeout(session.warningTimer);
    if (session.expiryTimer) clearTimeout(session.expiryTimer);
  }
  sessions.delete(key);
}

// ---------------------------------------------------------------------------
// touchSession — creates or refreshes a session, resetting all timers
// ---------------------------------------------------------------------------

function touchSession(key, botConfig, senderId) {
  // Cancel existing timers
  const existing = sessions.get(key);
  if (existing) {
    if (existing.warningTimer) clearTimeout(existing.warningTimer);
    if (existing.expiryTimer) clearTimeout(existing.expiryTimer);
  }

  const expiryMs = botConfig.sessionExpiryMs || 10 * 60 * 1000;
  const warningTimeMs = botConfig.warningTimeMs || 2 * 60 * 1000;
  const warningDelayMs = expiryMs - warningTimeMs;

  // Build or merge the session base
  const base = existing || {
    botId: botConfig.botId,
    platform: botConfig.platform,
    senderId,
    accessToken: botConfig.accessToken,
    phoneNumberId: botConfig.phoneNumberId,
    pageId: botConfig.pageId,
    warningMessage: botConfig.warningMessage,
    expiryMs,
    warningTimeMs,
    mode: 'idle',
    formTriggerId: null,
    formQuestions: [],
    formQIndex: 0,
    formAnswers: {},
    queryTriggerId: null,
    queryStage: 'categories',
    queryCatIndex: null,
    warningFired: false,
  };

  // Set warning timer (fires warningDelayMs before expiry)
  const warningTimer = warningDelayMs > 0
    ? setTimeout(() => {
        const session = sessions.get(key);
        if (session && warningCallback) {
          session.warningFired = true;
          try { warningCallback(session); } catch (e) { console.error('[sessionManager] warningCallback error:', e.message); }
        }
      }, warningDelayMs)
    : null;

  // Set expiry timer
  const expiryTimer = setTimeout(() => {
    const session = sessions.get(key);
    if (session && expiryCallback) {
      try { expiryCallback(session); } catch (e) { console.error('[sessionManager] expiryCallback error:', e.message); }
    }
    clearSession(key);
  }, expiryMs);

  // Keep Node from hanging for timers alone
  if (warningTimer && warningTimer.unref) warningTimer.unref();
  if (expiryTimer && expiryTimer.unref) expiryTimer.unref();

  sessions.set(key, Object.assign({}, base, {
    warningTimer,
    expiryTimer,
    warningFired: false,
  }));
}

module.exports = {
  getSession,
  setSession,
  clearSession,
  touchSession,
  onSessionWarning,
  onSessionExpiry,
};
