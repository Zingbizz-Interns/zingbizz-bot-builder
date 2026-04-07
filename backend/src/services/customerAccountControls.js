// services/customerAccountControls.js
// Shared helpers for super-admin customer-level limits and automation flags.

const supabase = require('./supabase');

const DEFAULT_CONTROL = {
  maxFormSubmissions: null,
  excelExportEnabled: true,
  automationEnabled: true,
  automationDisabledReason: null,
};

function isMissingSchemaError(error) {
  const message = error?.message || '';
  return (
    /does not exist/i.test(message) ||
    /Could not find/i.test(message) ||
    /column .* not found/i.test(message)
  );
}

async function getCustomerAccountControl(customerId) {
  if (!customerId) {
    return { ...DEFAULT_CONTROL };
  }

  const { data, error } = await supabase
    .from('customer_account_controls')
    .select('max_form_submissions, excel_export_enabled, automation_enabled, automation_disabled_reason')
    .eq('customer_id', customerId)
    .maybeSingle();

  if (error) {
    if (isMissingSchemaError(error)) {
      console.warn('[customerAccountControls] customer_account_controls not available yet; defaulting to open access');
      return { ...DEFAULT_CONTROL };
    }
    throw new Error(`customer_account_controls fetch failed: ${error.message}`);
  }

  return {
    maxFormSubmissions: data?.max_form_submissions ?? null,
    excelExportEnabled: data?.excel_export_enabled ?? true,
    automationEnabled: data?.automation_enabled ?? true,
    automationDisabledReason: data?.automation_disabled_reason ?? null,
  };
}

async function countCompletedFormSubmissionsForCustomer(customerId) {
  if (!customerId) return 0;

  const { data: bots, error: botsError } = await supabase
    .from('bots')
    .select('id')
    .eq('customer_id', customerId);

  if (botsError) {
    throw new Error(`bots fetch failed: ${botsError.message}`);
  }

  const botIds = (bots || []).map((bot) => bot.id);
  if (botIds.length === 0) return 0;

  const { data: triggers, error: triggersError } = await supabase
    .from('triggers')
    .select('id')
    .in('bot_id', botIds);

  if (triggersError) {
    throw new Error(`triggers fetch failed: ${triggersError.message}`);
  }

  const triggerIds = (triggers || []).map((trigger) => trigger.id);
  if (triggerIds.length === 0) return 0;

  const { data: forms, error: formsError } = await supabase
    .from('forms')
    .select('id')
    .in('trigger_id', triggerIds);

  if (formsError) {
    throw new Error(`forms fetch failed: ${formsError.message}`);
  }

  const formIds = (forms || []).map((form) => form.id);
  if (formIds.length === 0) return 0;

  const { count, error: responsesError } = await supabase
    .from('form_responses')
    .select('id', { count: 'exact', head: true })
    .in('form_id', formIds)
    .eq('is_complete', true);

  if (responsesError) {
    throw new Error(`form_responses count failed: ${responsesError.message}`);
  }

  return count ?? 0;
}

function buildAutomationBlockMessage(blockReason, control) {
  if (blockReason === 'automation_disabled') {
    const reason = control.automationDisabledReason?.trim();
    return reason
      ? `Bot automation is currently unavailable: ${reason}`
      : 'Bot automation is currently unavailable right now. Please contact support.';
  }

  if (blockReason === 'submission_limit_reached') {
    return 'Bot automation is temporarily unavailable because the submission limit has been reached. Please contact support.';
  }

  return 'Bot automation is currently unavailable right now. Please contact support.';
}

async function getCustomerAutomationGate(customerId) {
  try {
    const control = await getCustomerAccountControl(customerId);

    if (!control.automationEnabled) {
      return {
        customerId,
        ...control,
        completedFormSubmissions: 0,
        isOverFormSubmissionLimit: false,
        isBlocked: true,
        blockReason: 'automation_disabled',
        blockMessage: buildAutomationBlockMessage('automation_disabled', control),
      };
    }

    let completedFormSubmissions = 0;
    let isOverFormSubmissionLimit = false;

    if (control.maxFormSubmissions !== null) {
      completedFormSubmissions = await countCompletedFormSubmissionsForCustomer(customerId);
      isOverFormSubmissionLimit = completedFormSubmissions >= control.maxFormSubmissions;
    }

    return {
      customerId,
      ...control,
      completedFormSubmissions,
      isOverFormSubmissionLimit,
      isBlocked: isOverFormSubmissionLimit,
      blockReason: isOverFormSubmissionLimit ? 'submission_limit_reached' : null,
      blockMessage: isOverFormSubmissionLimit
        ? buildAutomationBlockMessage('submission_limit_reached', control)
        : null,
    };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      console.warn('[customerAccountControls] super-admin schema incomplete; defaulting to open automation access');
      return {
        customerId,
        ...DEFAULT_CONTROL,
        completedFormSubmissions: 0,
        isOverFormSubmissionLimit: false,
        isBlocked: false,
        blockReason: null,
        blockMessage: null,
      };
    }

    console.error(`[customerAccountControls] gate resolution failed: ${error.message}`);
    return {
      customerId,
      ...DEFAULT_CONTROL,
      completedFormSubmissions: 0,
      isOverFormSubmissionLimit: false,
      isBlocked: false,
      blockReason: null,
      blockMessage: null,
    };
  }
}

module.exports = {
  getCustomerAutomationGate,
};
