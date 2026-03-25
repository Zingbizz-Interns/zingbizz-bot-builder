// services/form.service.js
// In-memory session store for tracking each user's form progress and mode.
// Includes active timeout: automatically calls a callback after inactivity.

const sessions = {};
const timers = {};

const SESSION_TIMEOUT_MS = 1 * 60 * 1000; // 1 minute (change to 10 * 60 * 1000 for production)

const MODES = {
  CHOOSE:    'choose',      // user hasn't picked admission or FAQ yet
  ADMISSION: 'admission',
  FAQ:       'faq',
};

const STEPS = {
  // Initial routing
  CHOOSE_MODE:               'choose_mode',

  // Admission form steps
  STUDENT_NAME:              'student_name',
  GRADE:                     'grade',
  PARENT_NAME:               'parent_name',
  CONTACT:                   'contact',
  EMAIL:                     'email',
  DOB:                       'dob',
  PREVIOUS_SCHOOL:           'previous_school',
  PREVIOUS_SCHOOL_NAME:      'previous_school_name',
  SPECIAL_REQUIREMENTS:      'special_requirements',
  SPECIAL_REQUIREMENTS_DETAILS: 'special_requirements_details',
  DONE:                      'done',

  // FAQ steps
  SELECT_GENRE:              'select_genre',
  SELECT_QUESTION:           'select_question',

  // Returning user confirmation
  RETURNING_USER_CONFIRM:    'returning_user_confirm',
};

// ─── Timeout callback registry ────────────────────────────────────────────────
// Webhook handlers register timeout callbacks here so each channel can
// decide whether it should react to a given session key.
const timeoutCallbacks = [];

function setTimeoutCallback(fn) {
  if (typeof fn === 'function') {
    timeoutCallbacks.push(fn);
  }
}

// ─── Timer management ─────────────────────────────────────────────────────────
function resetTimer(senderId) {
  // Clear any existing timer for this user
  if (timers[senderId]) {
    clearTimeout(timers[senderId]);
    delete timers[senderId];
  }

  // Don't set a timer if there's no session
  if (!sessions[senderId]) return;

  // Schedule a new timeout
  timers[senderId] = setTimeout(() => {
    const session = sessions[senderId];
    if (session) {
      console.log(`⏰ [Session] Timeout triggered for ${senderId}`);
      delete sessions[senderId];
      delete timers[senderId];

      // Notify registered callbacks. Each route can filter by session prefix.
      for (const callback of timeoutCallbacks) {
        Promise.resolve(callback(senderId)).catch((error) => {
          console.error('Failed to run session timeout callback:', error.message);
        });
      }
    }
  }, SESSION_TIMEOUT_MS);
}

function cancelTimer(senderId) {
  if (timers[senderId]) {
    clearTimeout(timers[senderId]);
    delete timers[senderId];
  }
}

// ─── Session management ───────────────────────────────────────────────────────
function startSession(senderId) {
  sessions[senderId] = { mode: MODES.CHOOSE, step: STEPS.CHOOSE_MODE, data: {}, faqGenre: null, lastActivity: Date.now() };
  resetTimer(senderId);
}

function startForm(senderId) {
  if (sessions[senderId]) {
    sessions[senderId].mode = MODES.ADMISSION;
    sessions[senderId].step = STEPS.STUDENT_NAME;
    sessions[senderId].data = {};
    sessions[senderId].lastActivity = Date.now();
    resetTimer(senderId);
  }
}

function startFAQ(senderId) {
  if (sessions[senderId]) {
    sessions[senderId].mode = MODES.FAQ;
    sessions[senderId].step = STEPS.SELECT_GENRE;
    sessions[senderId].faqGenre = null;
    sessions[senderId].lastActivity = Date.now();
    resetTimer(senderId);
  }
}

function getSession(senderId) {
  return sessions[senderId] || null;
}

function setField(senderId, field, value) {
  if (sessions[senderId]) {
    sessions[senderId].data[field] = value;
    sessions[senderId].lastActivity = Date.now();
    resetTimer(senderId);
  }
}

function setStep(senderId, step) {
  if (sessions[senderId]) {
    sessions[senderId].step = step;
    sessions[senderId].lastActivity = Date.now();
    resetTimer(senderId);
  }
}

function setFaqGenre(senderId, genreId) {
  if (sessions[senderId]) {
    sessions[senderId].faqGenre = genreId;
    sessions[senderId].lastActivity = Date.now();
    resetTimer(senderId);
  }
}

function clearSession(senderId) {
  cancelTimer(senderId);
  delete sessions[senderId];
}

module.exports = {
  MODES,
  STEPS,
  SESSION_TIMEOUT_MS,
  setTimeoutCallback,
  startSession,
  startForm,
  startFAQ,
  getSession,
  setField,
  setStep,
  setFaqGenre,
  clearSession,
};
