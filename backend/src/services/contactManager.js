// services/contactManager.js
// Upserts a contact record on every incoming message.

const supabase = require('./supabase');

/**
 * Upsert contact: insert on first message, increment count + update last_seen on repeat.
 * Fire-and-forget — errors are swallowed by the caller.
 */
async function upsertContact(botId, senderId, platform) {
  const now = new Date().toISOString();

  // Try to find existing contact
  // PGRST116 = "no rows" — expected when contact is new, not a real error
  const { data: existing, error: selectError } = await supabase
    .from('contacts')
    .select('id, message_count')
    .eq('bot_id', botId)
    .eq('sender_id', senderId)
    .eq('platform', platform)
    .single();

  if (selectError && selectError.code !== 'PGRST116') {
    console.error(`[contactManager] select error: ${selectError.message}`);
    return;
  }

  if (existing) {
    const { error: updateError } = await supabase
      .from('contacts')
      .update({ last_seen_at: now, message_count: existing.message_count + 1 })
      .eq('id', existing.id);
    if (updateError) {
      console.error(`[contactManager] update error: ${updateError.message}`);
    }
  } else {
    const { error: insertError } = await supabase.from('contacts').insert({
      bot_id: botId,
      sender_id: senderId,
      platform,
      first_seen_at: now,
      last_seen_at: now,
      message_count: 1,
    });
    if (insertError) {
      console.error(`[contactManager] insert error: ${insertError.message}`);
    }
  }
}

module.exports = { upsertContact };
