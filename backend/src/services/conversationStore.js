// services/conversationStore.js
// All DB operations for conversations and messages.
// Used by messageHandler (incoming) and messageSender (outgoing).

const supabase = require('./supabase');

// ---------------------------------------------------------------------------
// getOrCreateConversation
// Returns the existing conversation row or creates a new one.
// ---------------------------------------------------------------------------

async function getOrCreateConversation(botId, senderId, platform) {
  try {
    // Try fetch first
    const { data: existing, error: fetchError } = await supabase
      .from('conversations')
      .select('*')
      .eq('bot_id', botId)
      .eq('sender_id', senderId)
      .eq('platform', platform)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = no rows found — that's expected on first message
      console.error(`[conversationStore] fetch error: ${fetchError.message}`);
      return null;
    }

    if (existing) return existing;

    // Create new conversation
    const { data: created, error: createError } = await supabase
      .from('conversations')
      .insert({ bot_id: botId, sender_id: senderId, platform })
      .select()
      .single();

    if (createError) {
      // Handle race condition: another request created it first
      if (createError.code === '23505') {
        const { data: retry } = await supabase
          .from('conversations')
          .select('*')
          .eq('bot_id', botId)
          .eq('sender_id', senderId)
          .eq('platform', platform)
          .single();
        return retry;
      }
      console.error(`[conversationStore] insert error: ${createError.message}`);
      return null;
    }

    return created;
  } catch (err) {
    console.error(`[conversationStore] getOrCreateConversation exception: ${err.message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// storeMessage
// Persists a single message (customer, bot, or agent) to the messages table.
// ---------------------------------------------------------------------------

async function storeMessage(conversationId, botId, senderType, content, messageType = 'text', metadata = null) {
  if (!conversationId || !botId) return;
  try {
    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      bot_id: botId,
      sender_type: senderType,
      content: String(content),
      message_type: messageType,
      metadata,
    });
    if (error) console.error(`[conversationStore] storeMessage error: ${error.message}`);
  } catch (err) {
    console.error(`[conversationStore] storeMessage exception: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// updateLastCustomerMessage
// Called on every incoming customer message.
// ---------------------------------------------------------------------------

async function updateLastCustomerMessage(conversationId) {
  if (!conversationId) return;
  try {
    const { error } = await supabase
      .from('conversations')
      .update({ last_customer_message_at: new Date().toISOString() })
      .eq('id', conversationId);
    if (error) console.error(`[conversationStore] updateLastCustomerMessage error: ${error.message}`);
  } catch (err) {
    console.error(`[conversationStore] updateLastCustomerMessage exception: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// updateLastReply
// Called after every bot or agent reply is sent successfully.
// ---------------------------------------------------------------------------

async function updateLastReply(conversationId) {
  if (!conversationId) return;
  try {
    const { error } = await supabase
      .from('conversations')
      .update({ last_reply_at: new Date().toISOString() })
      .eq('id', conversationId);
    if (error) console.error(`[conversationStore] updateLastReply error: ${error.message}`);
  } catch (err) {
    console.error(`[conversationStore] updateLastReply exception: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// markNeedsAttention
// Sets needs_attention=true. Sets unresolved_since only on the FIRST call
// (i.e. when it was previously null) so the timestamp reflects the first fallback.
// ---------------------------------------------------------------------------

async function markNeedsAttention(conversationId) {
  if (!conversationId) return;
  try {
    // Fetch current unresolved_since to avoid overwriting the first timestamp
    const { data } = await supabase
      .from('conversations')
      .select('unresolved_since')
      .eq('id', conversationId)
      .single();

    const update = { needs_attention: true };
    if (!data?.unresolved_since) {
      update.unresolved_since = new Date().toISOString();
    }

    const { error } = await supabase
      .from('conversations')
      .update(update)
      .eq('id', conversationId);

    if (error) console.error(`[conversationStore] markNeedsAttention error: ${error.message}`);
  } catch (err) {
    console.error(`[conversationStore] markNeedsAttention exception: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// clearNeedsAttention
// Called when an agent takes over — clears the attention flag and timestamp.
// ---------------------------------------------------------------------------

async function clearNeedsAttention(conversationId) {
  if (!conversationId) return;
  try {
    const { error } = await supabase
      .from('conversations')
      .update({ needs_attention: false, unresolved_since: null })
      .eq('id', conversationId);
    if (error) console.error(`[conversationStore] clearNeedsAttention error: ${error.message}`);
  } catch (err) {
    console.error(`[conversationStore] clearNeedsAttention exception: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// incrementFallbackCount
// Called each time the bot fires its fallback message.
// ---------------------------------------------------------------------------

async function incrementFallbackCount(conversationId) {
  if (!conversationId) return;
  try {
    // Atomic increment via Postgres function to avoid race conditions
    const { error } = await supabase.rpc('increment_conversation_fallback_count', {
      conv_id: conversationId,
    });
    if (error) console.error(`[conversationStore] incrementFallbackCount error: ${error.message}`);
  } catch (err) {
    console.error(`[conversationStore] incrementFallbackCount exception: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// resetFallbackCount
// Called when an agent takes over — resets the fallback badge.
// ---------------------------------------------------------------------------

async function resetFallbackCount(conversationId) {
  if (!conversationId) return;
  try {
    const { error } = await supabase
      .from('conversations')
      .update({ fallback_count: 0 })
      .eq('id', conversationId);
    if (error) console.error(`[conversationStore] resetFallbackCount error: ${error.message}`);
  } catch (err) {
    console.error(`[conversationStore] resetFallbackCount exception: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// setConversationStatus
// Used by agent takeover/release/resolve endpoints (Phase 2).
// ---------------------------------------------------------------------------

async function setConversationStatus(conversationId, status, agentId = null) {
  if (!conversationId) return;
  try {
    const update = { status };
    if (status === 'agent') update.agent_id = agentId;
    if (status === 'bot' || status === 'closed') update.agent_id = null;

    const { error } = await supabase
      .from('conversations')
      .update(update)
      .eq('id', conversationId);

    if (error) console.error(`[conversationStore] setConversationStatus error: ${error.message}`);
  } catch (err) {
    console.error(`[conversationStore] setConversationStatus exception: ${err.message}`);
  }
}

module.exports = {
  getOrCreateConversation,
  storeMessage,
  updateLastCustomerMessage,
  updateLastReply,
  markNeedsAttention,
  clearNeedsAttention,
  incrementFallbackCount,
  resetFallbackCount,
  setConversationStatus,
};
