// services/tenantResolver.js
// Resolves a platform identifier (phone_number_id or page_id) to a full bot
// configuration assembled from Supabase. Results are cached per botId for 60s.

const supabase = require('./supabase');

// Cache: botId -> { config, expiresAt, platformConfigId, platformConfigUpdatedAt }
const botCache = new Map();
const CACHE_TTL_MS = 60 * 1000;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function fromCache(botId, platformConfigId, platformConfigUpdatedAt) {
  const entry = botCache.get(botId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    botCache.delete(botId);
    return null;
  }
  if (
    entry.platformConfigId !== platformConfigId ||
    entry.platformConfigUpdatedAt !== platformConfigUpdatedAt
  ) {
    botCache.delete(botId);
    return null;
  }
  return entry.config;
}

function toCache(botId, config, platformConfigId, platformConfigUpdatedAt) {
  botCache.set(botId, {
    config,
    expiresAt: Date.now() + CACHE_TTL_MS,
    platformConfigId,
    platformConfigUpdatedAt,
  });
}

// ---------------------------------------------------------------------------
// Load triggers and all associated action data in parallel
// ---------------------------------------------------------------------------

async function loadTriggers(botId) {
  // 1. Load triggers + keywords
  const [triggersRes, keywordsRes] = await Promise.all([
    supabase.from('triggers').select('*').eq('bot_id', botId),
    supabase.from('trigger_keywords').select('*'),
  ]);

  if (triggersRes.error) throw new Error(`triggers fetch: ${triggersRes.error.message}`);
  if (keywordsRes.error) throw new Error(`trigger_keywords fetch: ${keywordsRes.error.message}`);

  const triggers = triggersRes.data || [];
  const allKeywords = keywordsRes.data || [];

  if (triggers.length === 0) return [];

  const triggerIds = triggers.map((t) => t.id);

  // 2. Load all action data in parallel
  const [
    replierActionsRes,
    replierButtonsRes,
    formsRes,
    formQuestionsRes,
    formQuestionOptionsRes,
    formConditionsRes,
    queryBuildersRes,
    queryCategoriesRes,
    queryQuestionsRes,
  ] = await Promise.all([
    supabase.from('replier_actions').select('*').in('trigger_id', triggerIds),
    supabase.from('replier_buttons').select('*'),
    supabase.from('forms').select('*').in('trigger_id', triggerIds),
    supabase.from('form_questions').select('*'),
    supabase.from('form_question_options').select('*'),
    supabase.from('form_conditions').select('*'),
    supabase.from('query_builders').select('*').in('trigger_id', triggerIds),
    supabase.from('query_categories').select('*'),
    supabase.from('query_questions').select('*'),
  ]);

  // Ignore individual errors gracefully — missing data means empty arrays
  const replierActions = (replierActionsRes.data || []);
  const replierButtons = (replierButtonsRes.data || []);
  const forms = (formsRes.data || []);
  const formQuestions = (formQuestionsRes.data || []);
  const formQuestionOptions = (formQuestionOptionsRes.data || []);
  const formConditions = (formConditionsRes.data || []);
  const queryBuilders = (queryBuildersRes.data || []);
  const queryCategories = (queryCategoriesRes.data || []);
  const queryQuestionsData = (queryQuestionsRes.data || []);

  // Build lookup maps
  const keywordsByTriggerId = {};
  for (const kw of allKeywords) {
    if (!keywordsByTriggerId[kw.trigger_id]) keywordsByTriggerId[kw.trigger_id] = [];
    keywordsByTriggerId[kw.trigger_id].push(kw.keyword);
  }

  const replierByTriggerId = {};
  for (const ra of replierActions) {
    replierByTriggerId[ra.trigger_id] = ra;
  }

  const buttonsByReplierId = {};
  for (const btn of replierButtons) {
    if (!buttonsByReplierId[btn.replier_id]) buttonsByReplierId[btn.replier_id] = [];
    buttonsByReplierId[btn.replier_id].push(btn);
  }

  const formByTriggerId = {};
  for (const f of forms) {
    formByTriggerId[f.trigger_id] = f;
  }

  const questionsByFormId = {};
  for (const q of formQuestions) {
    if (!questionsByFormId[q.form_id]) questionsByFormId[q.form_id] = [];
    questionsByFormId[q.form_id].push(q);
  }

  const optionsByQuestionId = {};
  for (const opt of formQuestionOptions) {
    if (!optionsByQuestionId[opt.question_id]) optionsByQuestionId[opt.question_id] = [];
    optionsByQuestionId[opt.question_id].push(opt);
  }

  const conditionsByQuestionId = {};
  for (const cond of formConditions) {
    if (!conditionsByQuestionId[cond.question_id]) conditionsByQuestionId[cond.question_id] = [];
    conditionsByQuestionId[cond.question_id].push(cond);
  }

  const queryByTriggerId = {};
  for (const qb of queryBuilders) {
    queryByTriggerId[qb.trigger_id] = qb;
  }

  const categoriesByQueryId = {};
  for (const cat of queryCategories) {
    if (!categoriesByQueryId[cat.query_builder_id]) categoriesByQueryId[cat.query_builder_id] = [];
    categoriesByQueryId[cat.query_builder_id].push(cat);
  }

  const questionsByCategoryId = {};
  for (const qq of queryQuestionsData) {
    if (!questionsByCategoryId[qq.category_id]) questionsByCategoryId[qq.category_id] = [];
    questionsByCategoryId[qq.category_id].push(qq);
  }

  // Assemble each trigger
  return triggers.map((t) => {
    const keywords = keywordsByTriggerId[t.id] || [];

    // Replier
    let replier = null;
    const ra = replierByTriggerId[t.id];
    if (ra) {
      const rawButtons = (buttonsByReplierId[ra.id] || []).sort((a, b) => a.order_index - b.order_index);
      replier = {
        messageText: ra.message_text,
        buttons: rawButtons.map((btn) => ({
          label: btn.button_label,
          linkedTriggerId: btn.links_to_trigger_id,
          orderIndex: btn.order_index,
        })),
      };
    }

    // Form
    let form = null;
    const f = formByTriggerId[t.id];
    if (f) {
      const rawQuestions = (questionsByFormId[f.id] || []).sort((a, b) => a.order_index - b.order_index);
      form = {
        id: f.id,
        title: f.title,
        submitMessage: f.submit_message || 'Thank you! Your responses have been submitted.',
        showProgress: f.show_progress !== false,
        questions: rawQuestions.map((q) => {
          const options = (optionsByQuestionId[q.id] || []).sort((a, b) => a.order_index - b.order_index);
          const conditions = (conditionsByQuestionId[q.id] || []);
          return {
            id: q.id,
            questionText: q.question_text,
            inputType: q.input_type,
            validationType: q.validation_type,
            isRequired: q.is_required,
            orderIndex: q.order_index,
            referenceQuestionId: q.reference_question_id,
            options: options.map((o) => ({ optionLabel: o.option_label, orderIndex: o.order_index })),
            conditions: conditions.map((c) => ({
              conditionQuestionId: c.condition_question_id,
              conditionOperator: c.condition_operator,
              conditionValue: c.condition_value,
            })),
          };
        }),
      };
    }

    // Query
    let query = null;
    const qb = queryByTriggerId[t.id];
    if (qb) {
      const rawCats = (categoriesByQueryId[qb.id] || []).sort((a, b) => a.order_index - b.order_index);
      query = {
        categories: rawCats.map((cat) => {
          const catQuestions = (questionsByCategoryId[cat.id] || []).sort((a, b) => a.order_index - b.order_index);
          return {
            id: cat.id,
            categoryName: cat.category_name,
            orderIndex: cat.order_index,
            questions: catQuestions.map((qq) => ({
              id: qq.id,
              questionText: qq.question_text,
              answerText: qq.answer_text,
              orderIndex: qq.order_index,
            })),
          };
        }),
      };
    }

    return {
      id: t.id,
      name: t.name,
      trigger_type: t.trigger_type,
      platforms: t.platforms || [],
      action_type: t.action_type,
      keywords,
      replier,
      form,
      query,
    };
  });
}

// ---------------------------------------------------------------------------
// Public: resolveBot
// ---------------------------------------------------------------------------

async function resolveBot(platform, identifier) {
  try {
    // Find the platform_config row matching platform + identifier
    const column = platform === 'whatsapp' ? 'phone_number_id' : 'page_id';

    const { data: configs, error: configError } = await supabase
      .from('platform_configs')
      .select('*')
      .eq('platform', platform)
      .eq(column, identifier)
      .eq('is_active', true)
      .limit(1);

    if (configError) {
      console.error(`[tenantResolver] platform_configs fetch error: ${configError.message}`);
      return null;
    }

    if (!configs || configs.length === 0) {
      console.warn(`[tenantResolver] No active config found for ${platform}:${identifier}`);
      return null;
    }

    const pc = configs[0];
    const botId = pc.bot_id;

    // Check cache
    const cached = fromCache(botId, pc.id, pc.updated_at || null);
    if (cached) return cached;

    // Load bot row
    const { data: bots, error: botError } = await supabase
      .from('bots')
      .select('*')
      .eq('id', botId)
      .limit(1);

    if (botError) {
      console.error(`[tenantResolver] bots fetch error: ${botError.message}`);
      return null;
    }

    if (!bots || bots.length === 0) {
      console.warn(`[tenantResolver] Bot not found for id: ${botId}`);
      return null;
    }

    const bot = bots[0];

    if (!bot.is_active) {
      console.warn(`[tenantResolver] Bot ${botId} is inactive — ignoring message`);
      return null;
    }

    // Load triggers + business hours in parallel
    const [triggers, bhRes] = await Promise.all([
      loadTriggers(botId),
      supabase.from('business_hours').select('*').eq('bot_id', botId).single(),
    ]);

    const config = {
      botId,
      customerId: bot.customer_id,
      botName: bot.name,
      fallbackMessage: bot.fallback_message || "I'm sorry, I didn't understand that.",
      escalationKeywords: bot.escalation_keywords || null,
      takeoverMessage: bot.takeover_message || null,
      takeoverMessageEnabled: bot.takeover_message_enabled !== false,
      platform: pc.platform,
      accessToken: pc.access_token,
      phoneNumberId: pc.phone_number_id,
      pageId: pc.page_id,
      sessionExpiryMs: pc.session_expiry_ms || 10 * 60 * 1000,
      warningTimeMs: pc.warning_time_ms || 2 * 60 * 1000,
      warningMessage: pc.warning_message || 'Your session will expire soon due to inactivity.',
      triggers,
      businessHours: bhRes.data || null,
    };

    toCache(botId, config, pc.id, pc.updated_at || null);
    return config;
  } catch (err) {
    console.error(`[tenantResolver] resolveBot error: ${err.message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public: resolveVerifyToken
// ---------------------------------------------------------------------------

async function resolveVerifyToken(platform, verifyToken) {
  try {
    const { data, error } = await supabase
      .from('platform_configs')
      .select('id')
      .eq('platform', platform)
      .eq('verify_token', verifyToken)
      .eq('is_active', true)
      .limit(1);

    if (error) {
      console.error(`[tenantResolver] resolveVerifyToken error: ${error.message}`);
      return false;
    }

    return data && data.length > 0;
  } catch (err) {
    console.error(`[tenantResolver] resolveVerifyToken exception: ${err.message}`);
    return false;
  }
}

module.exports = { resolveBot, resolveVerifyToken };
