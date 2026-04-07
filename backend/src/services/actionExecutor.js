// services/actionExecutor.js
// Core bot logic: trigger execution, form handling, query handling.

const supabase = require('./supabase');
const { sendText, sendButtons } = require('./messageSender');
const { track } = require('./analytics');
const { getCustomerAutomationGate } = require('./customerAccountControls');

// ---------------------------------------------------------------------------
// Instagram-specific numbered query buttons
// For IG: sends a numbered text list then number-only quick reply buttons.
// For WA: delegates to the standard sendButtons.
// ---------------------------------------------------------------------------

async function sendQueryButtons(platform, senderId, headerText, items, makeId, platformConfig) {
  if (platform === 'instagram') {
    const lines = [headerText, ''];
    items.forEach((item, i) => lines.push(`${i + 1}. ${item}`));
    const numberedText = lines.join('\n');
    const buttons = items.map((_, i) => ({ id: makeId(i), title: String(i + 1) }));
    const payload = {
      recipient: { id: senderId },
      message: {
        text: numberedText,
        quick_replies: buttons.map((btn) => ({
          content_type: 'text',
          title: btn.title,
          payload: btn.id,
        })),
      },
    };
    const igPost = async (path, body, token) => {
      const axios = require('axios');
      const url = `https://graph.facebook.com/v18.0${path}?access_token=${token}`;
      try {
        await axios.post(url, body, { headers: { 'Content-Type': 'application/json' } });
      } catch (err) {
        const detail = err.response ? JSON.stringify(err.response.data) : err.message;
        console.error(`[IG] sendQueryButtons error: ${detail}`);
      }
    };
    await igPost('/me/messages', payload, platformConfig.accessToken);
    console.log(`[IG] sendQueryButtons -> ${senderId}: ${items.length} numbered options`);
  } else {
    const buttons = items.map((item, i) => ({ id: makeId(i), title: item }));
    await sendButtons(platform, senderId, headerText, buttons, platformConfig);
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const VALIDATORS = {
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  phone: (v) => /^\d{10}$/.test(v.trim()),
  number: (v) => v !== '' && !isNaN(Number(v)),
  date: (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) || /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(v),
  name: (v) => /^[\p{L}\p{M}\s'.,-]{3,}$/u.test(v),
  none: () => true,
};

const VALIDATION_ERRORS = {
  email: 'Please enter a valid email address (e.g. name@example.com).',
  phone: 'Please enter a valid 10-digit phone number.',
  number: 'Please enter a valid number.',
  date: 'Please enter a valid date (e.g. 2000-01-31 or 31/01/2000).',
  name: 'Please enter a valid name (at least 3 characters).',
};

function validateInput(value, validationType) {
  const type = validationType || 'none';
  const validator = VALIDATORS[type] || VALIDATORS.none;
  const valid = validator(value.trim());
  return { valid, error: valid ? null : (VALIDATION_ERRORS[type] || 'Invalid input.') };
}

// ---------------------------------------------------------------------------
// Token replacement: {Q1}, {Q2} etc. → previous answers
// ---------------------------------------------------------------------------

function resolveTokens(text, questions, formAnswers) {
  return text.replace(/\{Q(\d+)\}/g, (match, numStr) => {
    const idx = parseInt(numStr, 10) - 1;
    const q = questions[idx];
    if (!q) return match;
    return formAnswers[q.id] || `[Q${numStr} answer]`;
  });
}

// ---------------------------------------------------------------------------
// Condition evaluation
// ---------------------------------------------------------------------------

function evaluateCondition(formAnswers, condition) {
  const actual = (formAnswers[condition.conditionQuestionId] || '').toLowerCase().trim();
  const expected = (condition.conditionValue || '').toLowerCase().trim();

  switch (condition.conditionOperator) {
    case 'eq': return actual === expected;
    case 'neq': return actual !== expected;
    case 'contains': return actual.includes(expected);
    default: return true;
  }
}

// A question is shown if ALL its conditions pass (empty conditions = always show)
function shouldShowQuestion(question, formAnswers) {
  if (!question.conditions || question.conditions.length === 0) return true;
  return question.conditions.every((c) => evaluateCondition(formAnswers, c));
}

// ---------------------------------------------------------------------------
// Find next visible question index after currentIndex
// ---------------------------------------------------------------------------

function findNextQIndex(questions, fromIndex, formAnswers) {
  for (let i = fromIndex + 1; i < questions.length; i++) {
    if (shouldShowQuestion(questions[i], formAnswers)) return i;
  }
  return -1; // form complete
}

// ---------------------------------------------------------------------------
// Ask a question (text or choice)
// ---------------------------------------------------------------------------

async function askQuestion(platform, senderId, question, qIndex, totalVisible, questions, formAnswers, platformConfig, showProgress = true) {
  const resolved = resolveTokens(question.questionText, questions, formAnswers);
  const skipNote = question.isRequired ? '' : '\n(or type "skip" to skip)';
  const progress = showProgress ? `\n\n(Question ${qIndex + 1} of ${totalVisible})` : '';
  const fullText = resolved + skipNote + progress;

  if (question.inputType === 'choice' && question.options && question.options.length > 0) {
    const buttons = question.options.map((o, i) => ({
      id: `OPT:${i}`,
      title: o.optionLabel,
    }));
    await sendButtons(platform, senderId, fullText, buttons, platformConfig);
  } else {
    await sendText(platform, senderId, fullText, platformConfig);
  }
}

// Count total visible questions for progress display (at form start)
function countVisibleQuestions(questions, formAnswers) {
  return questions.filter((q) => shouldShowQuestion(q, formAnswers)).length;
}

// ---------------------------------------------------------------------------
// Save completed form to Supabase
// ---------------------------------------------------------------------------

async function saveFormResponse(form, session, senderId, platform, customerId) {
  try {
    const now = new Date().toISOString();
    const formAnswers = session.formAnswers || {};
    const answerCount = Object.keys(formAnswers).length;

    console.log(`[actionExecutor] saveFormResponse: formId=${form.id} sender=${senderId} platform=${platform} answerCount=${answerCount}`);

    if (answerCount === 0) {
      console.warn('[actionExecutor] saveFormResponse: formAnswers is empty — no answers will be saved');
    }

    const automationGate = await getCustomerAutomationGate(customerId);
    if (automationGate.isBlocked) {
      console.warn(
        `[actionExecutor] Blocking form save for customer ${customerId} (${automationGate.blockReason})`
      );
      return {
        status: 'blocked',
        blockReason: automationGate.blockReason,
        message: automationGate.blockMessage,
      };
    }

    // Insert form_response
    const { data: responseData, error: responseError } = await supabase
      .from('form_responses')
      .insert({
        form_id: form.id,
        sender_id: senderId,
        platform,
        started_at: now,
        completed_at: now,
        is_complete: true,
      })
      .select()
      .single();

    if (responseError) {
      console.error('[actionExecutor] form_responses insert error:', responseError.message, responseError.details);
      return {
        status: 'error',
        message: 'We could not save your response right now. Please try again later.',
      };
    }

    const responseId = responseData.id;

    // Insert all answers
    const answers = Object.entries(formAnswers).map(([questionId, answerText]) => ({
      response_id: responseId,
      question_id: questionId,
      answer_text: answerText || '',
    }));

    if (answers.length > 0) {
      const { error: answersError } = await supabase
        .from('form_response_answers')
        .insert(answers);

      if (answersError) {
        console.error('[actionExecutor] form_response_answers insert error:', answersError.message, answersError.details, 'answers:', JSON.stringify(answers));
      } else {
        console.log(`[actionExecutor] Saved ${answers.length} answers for responseId=${responseId}`);
      }
    } else {
      console.warn(`[actionExecutor] No answers to save for responseId=${responseId}`);
    }

    return {
      status: 'saved',
      responseId,
    };
  } catch (err) {
    console.error('[actionExecutor] saveFormResponse error:', err.message);
    return {
      status: 'error',
      message: 'We could not save your response right now. Please try again later.',
    };
  }
}

// ---------------------------------------------------------------------------
// executeTrigger
// ---------------------------------------------------------------------------

async function executeTrigger(trigger, botConfig, session, senderId, platformConfig, sessionManager) {
  const platform = platformConfig.platform || botConfig.platform;

  try {
    if (trigger.action_type === 'replier') {
      const replier = trigger.replier;
      if (!replier) {
        console.warn(`[actionExecutor] Trigger ${trigger.id} has no replier data`);
        return;
      }

      if (replier.buttons && replier.buttons.length > 0) {
        // Build buttons: id = linked trigger id (or 'NOOP' if no link)
        const buttons = replier.buttons.map((btn) => ({
          id: btn.linkedTriggerId || 'NOOP',
          title: btn.label,
        }));
        // sendButtons includes the message text as the body; no need for a separate sendText
        await sendButtons(platform, senderId, replier.messageText, buttons, platformConfig);
      } else {
        await sendText(platform, senderId, replier.messageText, platformConfig);
      }

      // Stay in idle mode — incoming trigger IDs will be resolved in the main handler

    } else if (trigger.action_type === 'form') {
      const form = trigger.form;
      if (!form || !form.questions || form.questions.length === 0) {
        console.warn(`[actionExecutor] Trigger ${trigger.id} has no form data`);
        return;
      }

      const sessionKey = `${platform}:${senderId}:${botConfig.botId}`;

      // Check for existing completed submission (returning user)
      const { data: existing } = await supabase
        .from('form_responses')
        .select('id')
        .eq('form_id', form.id)
        .eq('sender_id', senderId)
        .eq('platform', platform)
        .eq('is_complete', true)
        .limit(1)
        .maybeSingle();

      if (existing) {
        // Ask if they want to submit again
        sessionManager.setSession(sessionKey, {
          mode: 'form_confirm_resubmit',
          formTriggerId: trigger.id,
        });
        await sendButtons(
          platform, senderId,
          'You have already submitted this form. Would you like to submit again?',
          [{ id: 'RESUBMIT:YES', title: 'Yes' }, { id: 'RESUBMIT:NO', title: 'No' }],
          platformConfig
        );
        return;
      }

      // Initialize form session state
      sessionManager.setSession(sessionKey, {
        mode: 'form',
        formTriggerId: trigger.id,
        formQuestions: form.questions,
        formSubmitMessage: form.submitMessage,
        formShowProgress: form.showProgress !== false,
        formQIndex: 0,
        formAnswers: {},
      });

      track(botConfig.botId, 'form_started', { triggerId: trigger.id, platform, senderId });

      // Find first visible question
      const firstQIndex = findNextQIndex(form.questions, -1, {});

      if (firstQIndex === -1) {
        await sendText(platform, senderId, form.submitMessage, platformConfig);
        sessionManager.setSession(sessionKey, { mode: 'idle' });
        return;
      }

      sessionManager.setSession(sessionKey, { formQIndex: firstQIndex });
      const total = countVisibleQuestions(form.questions, {});

      await askQuestion(
        platform, senderId,
        form.questions[firstQIndex],
        0, total,
        form.questions, {},
        platformConfig,
        form.showProgress !== false
      );

    } else if (trigger.action_type === 'query') {
      const query = trigger.query;
      if (!query || !query.categories || query.categories.length === 0) {
        console.warn(`[actionExecutor] Trigger ${trigger.id} has no query data`);
        return;
      }

      const sessionKey = `${platform}:${senderId}:${botConfig.botId}`;
      sessionManager.setSession(sessionKey, {
        mode: 'query',
        queryTriggerId: trigger.id,
        queryStage: 'categories',
        queryCatIndex: null,
      });

      track(botConfig.botId, 'query_opened', { triggerId: trigger.id, platform, senderId });

      // Present category buttons
      await sendQueryButtons(platform, senderId, 'Please choose a topic:',
        query.categories.map((c) => c.categoryName),
        (i) => `QCAT:${i}`, platformConfig);
    }
  } catch (err) {
    console.error(`[actionExecutor] executeTrigger error: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// handleFormInput
// ---------------------------------------------------------------------------

async function handleFormInput(input, botConfig, session, sessionKey, senderId, platformConfig, sessionManager) {
  const platform = platformConfig.platform || botConfig.platform;

  try {
    const questions = session.formQuestions || [];
    const qIndex = session.formQIndex || 0;
    const formAnswers = session.formAnswers || {};
    const showProgress = session.formShowProgress !== false;

    if (qIndex >= questions.length) {
      // Somehow beyond end — reset
      sessionManager.setSession(sessionKey, { mode: 'idle' });
      return;
    }

    const question = questions[qIndex];
    const trimmedInput = input.trim();

    // Handle skip
    if (!question.isRequired && trimmedInput.toLowerCase() === 'skip') {
      formAnswers[question.id] = '';
      const nextIndex = findNextQIndex(questions, qIndex, formAnswers);

      if (nextIndex === -1) {
        await completeForm(platform, senderId, session, sessionKey, formAnswers, botConfig, platformConfig, sessionManager);
        return;
      }

      sessionManager.setSession(sessionKey, { formQIndex: nextIndex, formAnswers });
      const total = countVisibleQuestions(questions, formAnswers);
      await askQuestion(platform, senderId, questions[nextIndex], nextIndex, total, questions, formAnswers, platformConfig, showProgress);
      return;
    }

    // Handle choice questions
    if (question.inputType === 'choice') {
      const options = question.options || [];
      let selectedOption = null;

      // Try OPT:{N} payload
      if (/^OPT:\d+$/.test(trimmedInput)) {
        const idx = parseInt(trimmedInput.split(':')[1], 10);
        selectedOption = options[idx] || null;
      }

      // Try by number (1-based)
      if (!selectedOption) {
        const num = parseInt(trimmedInput, 10);
        if (!isNaN(num) && num >= 1 && num <= options.length) {
          selectedOption = options[num - 1];
        }
      }

      // Try by label (case-insensitive)
      if (!selectedOption) {
        const lower = trimmedInput.toLowerCase();
        selectedOption = options.find((o) => o.optionLabel.toLowerCase() === lower) || null;
      }

      if (!selectedOption) {
        const buttons = options.map((o, i) => ({ id: `OPT:${i}`, title: o.optionLabel }));
        await sendText(platform, senderId, 'Please choose one of the options below.', platformConfig);
        const total = countVisibleQuestions(questions, formAnswers);
        await askQuestion(platform, senderId, question, qIndex, total, questions, formAnswers, platformConfig, showProgress);
        return;
      }

      formAnswers[question.id] = selectedOption.optionLabel;
    } else {
      // Text question — validate
      const { valid, error } = validateInput(trimmedInput, question.validationType);
      if (!valid) {
        await sendText(platform, senderId, error, platformConfig);
        const total = countVisibleQuestions(questions, formAnswers);
        await askQuestion(platform, senderId, question, qIndex, total, questions, formAnswers, platformConfig, showProgress);
        return;
      }
      formAnswers[question.id] = trimmedInput;
    }

    track(botConfig.botId, 'question_answered', { triggerId: session.formTriggerId, questionId: question.id, platform, senderId });

    // Find next question
    const nextIndex = findNextQIndex(questions, qIndex, formAnswers);

    if (nextIndex === -1) {
      await completeForm(platform, senderId, session, sessionKey, formAnswers, botConfig, platformConfig, sessionManager);
      return;
    }

    sessionManager.setSession(sessionKey, { formQIndex: nextIndex, formAnswers });
    const total = countVisibleQuestions(questions, formAnswers);
    await askQuestion(platform, senderId, questions[nextIndex], nextIndex, total, questions, formAnswers, platformConfig, showProgress);
  } catch (err) {
    console.error(`[actionExecutor] handleFormInput error: ${err.message}`);
  }
}

async function completeForm(platform, senderId, session, sessionKey, formAnswers, botConfig, platformConfig, sessionManager) {
  // Find the form object from the trigger
  const trigger = botConfig.triggers.find((t) => t.id === session.formTriggerId);
  const form = trigger && trigger.form;

  // Save to Supabase
  let saveResult = { status: 'saved' };
  if (form) {
    saveResult = await saveFormResponse(
      form,
      { ...session, formAnswers },
      senderId,
      platform,
      botConfig.customerId
    );
  }

  // Reset session
  sessionManager.setSession(sessionKey, {
    mode: 'idle',
    formTriggerId: null,
    formQuestions: [],
    formQIndex: 0,
    formAnswers: {},
  });

  if (saveResult.status === 'blocked') {
    await sendText(
      platform,
      senderId,
      saveResult.message || 'Bot automation is currently unavailable right now. Please contact support.',
      platformConfig
    );
    return;
  }

  if (saveResult.status === 'error') {
    await sendText(
      platform,
      senderId,
      saveResult.message || 'We could not save your response right now. Please try again later.',
      platformConfig
    );
    return;
  }

  track(botConfig.botId, 'form_completed', { triggerId: session.formTriggerId, platform, senderId });

  const rawSubmitMsg = session.formSubmitMessage || 'Thank you! Your responses have been submitted.';
  const submitMsg = resolveTokens(rawSubmitMsg, session.formQuestions || [], formAnswers);
  await sendText(platform, senderId, submitMsg, platformConfig);
}

// ---------------------------------------------------------------------------
// handleQueryInput
// ---------------------------------------------------------------------------

async function handleQueryInput(input, botConfig, session, sessionKey, senderId, platformConfig, sessionManager) {
  const platform = platformConfig.platform || botConfig.platform;

  try {
    const trigger = botConfig.triggers.find((t) => t.id === session.queryTriggerId);
    if (!trigger || !trigger.query) {
      sessionManager.setSession(sessionKey, { mode: 'idle' });
      return;
    }

    const query = trigger.query;
    const categories = query.categories || [];
    const stage = session.queryStage || 'categories';
    const trimmed = input.trim();

    if (stage === 'categories') {
      let selectedCat = null;
      let selectedCatIndex = null;

      // Parse QCAT:{N} payload
      if (/^QCAT:\d+$/.test(trimmed)) {
        const idx = parseInt(trimmed.split(':')[1], 10);
        selectedCat = categories[idx] || null;
        selectedCatIndex = idx;
      }

      // Try by number (1-based)
      if (!selectedCat) {
        const num = parseInt(trimmed, 10);
        if (!isNaN(num) && num >= 1 && num <= categories.length) {
          selectedCat = categories[num - 1];
          selectedCatIndex = num - 1;
        }
      }

      // Try by category name (case-insensitive)
      if (!selectedCat) {
        const lower = trimmed.toLowerCase();
        const idx = categories.findIndex((c) => c.categoryName.toLowerCase() === lower);
        if (idx !== -1) {
          selectedCat = categories[idx];
          selectedCatIndex = idx;
        }
      }

      if (!selectedCat) {
        await sendText(platform, senderId, 'Please choose a valid topic from the list.', platformConfig);
        await sendQueryButtons(platform, senderId, 'Please choose a topic:',
          categories.map((c) => c.categoryName),
          (i) => `QCAT:${i}`, platformConfig);
        return;
      }

      sessionManager.setSession(sessionKey, {
        queryStage: 'questions',
        queryCatIndex: selectedCatIndex,
      });

      const catQuestions = selectedCat.questions || [];
      await sendQueryButtons(platform, senderId, `Questions about "${selectedCat.categoryName}":`,
        catQuestions.map((q) => q.questionText),
        (i) => `QQST:${i}`, platformConfig);
      return;
    }

    if (stage === 'questions') {
      const catIndex = session.queryCatIndex;
      const selectedCat = categories[catIndex];
      if (!selectedCat) {
        sessionManager.setSession(sessionKey, { queryStage: 'categories', queryCatIndex: null });
        const buttons = categories.map((cat, i) => ({ id: `QCAT:${i}`, title: cat.categoryName }));
        await sendButtons(platform, senderId, 'Please choose a topic:', buttons, platformConfig);
        return;
      }

      const catQuestions = selectedCat.questions || [];
      let selectedQ = null;

      // Parse QQST:{N} payload
      if (/^QQST:\d+$/.test(trimmed)) {
        const idx = parseInt(trimmed.split(':')[1], 10);
        selectedQ = catQuestions[idx] || null;
      }

      // Try by number (1-based)
      if (!selectedQ) {
        const num = parseInt(trimmed, 10);
        if (!isNaN(num) && num >= 1 && num <= catQuestions.length) {
          selectedQ = catQuestions[num - 1];
        }
      }

      // Try by question text (case-insensitive)
      if (!selectedQ) {
        const lower = trimmed.toLowerCase();
        selectedQ = catQuestions.find((q) => q.questionText.toLowerCase() === lower) || null;
      }

      if (!selectedQ) {
        await sendText(platform, senderId, 'Please choose a valid question.', platformConfig);
        await sendQueryButtons(platform, senderId, `Questions about "${selectedCat.categoryName}":`,
          catQuestions.map((q) => q.questionText),
          (i) => `QQST:${i}`, platformConfig);
        return;
      }

      sessionManager.setSession(sessionKey, { queryStage: 'answer' });
      await sendText(platform, senderId, selectedQ.answerText, platformConfig);

      const navButtons = [
        { id: 'QAGAIN', title: 'Ask another' },
        { id: 'QDONE', title: 'Done' },
      ];
      await sendButtons(platform, senderId, 'What would you like to do next?', navButtons, platformConfig);
      return;
    }

    if (stage === 'answer') {
      if (trimmed === 'QAGAIN') {
        sessionManager.setSession(sessionKey, { queryStage: 'categories', queryCatIndex: null });
        await sendQueryButtons(platform, senderId, 'Please choose a topic:',
          categories.map((c) => c.categoryName),
          (i) => `QCAT:${i}`, platformConfig);
        return;
      }

      if (trimmed === 'QDONE') {
        sessionManager.setSession(sessionKey, { mode: 'idle', queryTriggerId: null, queryStage: 'categories', queryCatIndex: null });
        await sendText(platform, senderId, 'Thanks for using our FAQ.', platformConfig);
        return;
      }

      // User typed something else — prompt to use buttons
      const navButtons = [
        { id: 'QAGAIN', title: 'Ask another' },
        { id: 'QDONE', title: 'Done' },
      ];
      await sendButtons(platform, senderId, 'Please tap a button above.', navButtons, platformConfig);
    }
  } catch (err) {
    console.error(`[actionExecutor] handleQueryInput error: ${err.message}`);
  }
}

// Start a form from scratch (used after resubmit confirmation)
async function handleFormStart(form, platform, senderId, sessionKey, platformConfig, sessionManager) {
  const firstQIndex = findNextQIndex(form.questions, -1, {});
  if (firstQIndex === -1) {
    await sendText(platform, senderId, form.submitMessage || 'Thank you! Your responses have been submitted.', platformConfig);
    sessionManager.setSession(sessionKey, { mode: 'idle' });
    return;
  }
  sessionManager.setSession(sessionKey, { formQIndex: firstQIndex, formSubmitMessage: form.submitMessage, formShowProgress: form.showProgress !== false });
  const total = countVisibleQuestions(form.questions, {});
  await askQuestion(platform, senderId, form.questions[firstQIndex], 0, total, form.questions, {}, platformConfig, form.showProgress !== false);
}

module.exports = { executeTrigger, handleFormInput, handleQueryInput, handleFormStart };
