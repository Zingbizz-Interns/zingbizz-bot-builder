// routes/agent.js
// Human agent API — takeover, release, resolve, reply, notes, canned responses,
// and conversation listing. All routes require authentication.

const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');
const conversationStore = require('../services/conversationStore');
const { sendText } = require('../services/messageSender');

async function resolveBotAccess(req, res, botId) {
  if (!botId) {
    res.status(400).json({ error: 'botId is required' });
    return null;
  }

  if (req.subAccount) {
    const { data: permission, error } = await supabase
      .from('bot_permissions')
      .select('bot_id, can_edit')
      .eq('sub_account_id', req.subAccount.id)
      .eq('bot_id', botId)
      .single();

    if (error || !permission) {
      res.status(403).json({ error: 'Forbidden' });
      return null;
    }

    return { bot_id: botId, can_edit: permission.can_edit };
  }

  const { data: bot, error } = await supabase
    .from('bots')
    .select('id')
    .eq('id', botId)
    .eq('customer_id', req.customerId)
    .single();

  if (error || !bot) {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }

  return { bot_id: bot.id, can_edit: true };
}

async function listAccessibleBotIds(req) {
  if (req.subAccount) {
    const { data } = await supabase
      .from('bot_permissions')
      .select('bot_id')
      .eq('sub_account_id', req.subAccount.id);

    return (data || []).map((row) => row.bot_id);
  }

  const { data } = await supabase
    .from('bots')
    .select('id')
    .eq('customer_id', req.customerId);

  return (data || []).map((row) => row.id);
}

async function resolveConversation(req, res, conversationId) {
  const { data: conversation, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (error || !conversation) {
    res.status(404).json({ error: 'Conversation not found' });
    return null;
  }

  const access = await resolveBotAccess(req, res, conversation.bot_id);
  if (!access) return null;

  return conversation;
}

async function getWAPlatformConfig(botId) {
  const { data, error } = await supabase
    .from('platform_configs')
    .select('access_token, phone_number_id')
    .eq('bot_id', botId)
    .eq('platform', 'whatsapp')
    .eq('is_active', true)
    .single();

  if (error || !data) return null;
  return data;
}

async function attachNoteAuthors(notes) {
  if (!notes.length) return [];

  const authorIds = [...new Set(notes.map((note) => note.agent_id).filter(Boolean))];
  if (!authorIds.length) {
    return notes.map((note) => ({ ...note, author_name: 'Unknown agent' }));
  }

  const [{ data: owners }, { data: subs }] = await Promise.all([
    supabase.from('customer_profiles').select('user_id, name').in('user_id', authorIds),
    supabase.from('sub_accounts').select('user_id, name').in('user_id', authorIds),
  ]);

  const names = {};
  for (const row of owners || []) names[row.user_id] = row.name;
  for (const row of subs || []) names[row.user_id] = row.name;

  return notes.map((note) => ({
    ...note,
    author_name: names[note.agent_id] || 'Team member',
  }));
}

router.post('/conversations/:id/takeover', async (req, res) => {
  try {
    const conversation = await resolveConversation(req, res, req.params.id);
    if (!conversation) return;

    await conversationStore.setConversationStatus(conversation.id, 'agent', req.user.id);
    await Promise.all([
      conversationStore.clearNeedsAttention(conversation.id),
      conversationStore.resetFallbackCount(conversation.id),
    ]);

    const { data: bot } = await supabase
      .from('bots')
      .select('takeover_message, takeover_message_enabled')
      .eq('id', conversation.bot_id)
      .single();

    const takeoverEnabled = bot?.takeover_message_enabled ?? true;
    const takeoverMsg = bot?.takeover_message ?? "You're now connected with our team. We'll be right with you.";

    if (takeoverEnabled && takeoverMsg) {
      const pc = await getWAPlatformConfig(conversation.bot_id);
      if (pc) {
        await sendText('whatsapp', conversation.sender_id, takeoverMsg, {
          platform: 'whatsapp',
          accessToken: pc.access_token,
          phoneNumberId: pc.phone_number_id,
        });
        await conversationStore.storeMessage(
          conversation.id,
          conversation.bot_id,
          'bot',
          takeoverMsg
        );
      }
    }

    const { data: updated } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversation.id)
      .single();

    res.json({ conversation: updated });
  } catch (err) {
    console.error(`[agent] takeover error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/conversations/:id/release', async (req, res) => {
  try {
    const conversation = await resolveConversation(req, res, req.params.id);
    if (!conversation) return;

    await conversationStore.setConversationStatus(conversation.id, 'bot');

    const { data: updated } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversation.id)
      .single();

    res.json({ conversation: updated });
  } catch (err) {
    console.error(`[agent] release error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/conversations/:id/resolve', async (req, res) => {
  try {
    const conversation = await resolveConversation(req, res, req.params.id);
    if (!conversation) return;

    await conversationStore.setConversationStatus(conversation.id, 'closed');

    const { data: updated } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversation.id)
      .single();

    res.json({ conversation: updated });
  } catch (err) {
    console.error(`[agent] resolve error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/conversations/:id/reply', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'message is required' });
    }

    const conversation = await resolveConversation(req, res, req.params.id);
    if (!conversation) return;

    const pc = await getWAPlatformConfig(conversation.bot_id);
    if (!pc) {
      return res.status(500).json({ error: 'WhatsApp platform config not found for this bot' });
    }

    await sendText('whatsapp', conversation.sender_id, message.trim(), {
      platform: 'whatsapp',
      accessToken: pc.access_token,
      phoneNumberId: pc.phone_number_id,
    });

    const [storedMsg] = await Promise.all([
      conversationStore.storeMessage(
        conversation.id,
        conversation.bot_id,
        'agent',
        message.trim()
      ),
      conversationStore.updateLastReply(conversation.id),
      conversationStore.resetFallbackCount(conversation.id),
    ]);

    res.json({ message: storedMsg });
  } catch (err) {
    console.error(`[agent] reply error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/conversations', async (req, res) => {
  try {
    const { botId, status, needs_attention, limit = 20, offset = 0 } = req.query;

    if (botId) {
      const access = await resolveBotAccess(req, res, botId);
      if (!access) return;
    }

    const accessibleBotIds = botId ? [botId] : await listAccessibleBotIds(req);
    if (!accessibleBotIds.length) {
      return res.json({ conversations: [], total: 0 });
    }

    let query = supabase
      .from('conversations')
      .select('*', { count: 'exact' })
      .in('bot_id', accessibleBotIds)
      .order('updated_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (status) query = query.eq('status', status);
    if (needs_attention !== undefined) {
      query = query.eq('needs_attention', needs_attention === 'true');
    }

    const { data: conversations, count, error } = await query;

    if (error) {
      console.error(`[agent] list conversations error: ${error.message}`);
      return res.status(500).json({ error: 'Failed to fetch conversations' });
    }

    res.json({ conversations: conversations || [], total: count || 0 });
  } catch (err) {
    console.error(`[agent] list conversations exception: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/conversations/:id/messages', async (req, res) => {
  try {
    const conversation = await resolveConversation(req, res, req.params.id);
    if (!conversation) return;

    const { limit = 50, offset = 0 } = req.query;

    const { data: messages, count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact' })
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) {
      console.error(`[agent] list messages error: ${error.message}`);
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }

    res.json({ messages: messages || [], total: count || 0 });
  } catch (err) {
    console.error(`[agent] list messages exception: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/conversations/:id/notes', async (req, res) => {
  try {
    const conversation = await resolveConversation(req, res, req.params.id);
    if (!conversation) return;

    const { data: notes, error } = await supabase
      .from('conversation_notes')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`[agent] list notes error: ${error.message}`);
      return res.status(500).json({ error: 'Failed to fetch notes' });
    }

    res.json({ notes: await attachNoteAuthors(notes || []) });
  } catch (err) {
    console.error(`[agent] list notes exception: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/conversations/:id/notes', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'content is required' });
    }

    const conversation = await resolveConversation(req, res, req.params.id);
    if (!conversation) return;

    const { data: note, error } = await supabase
      .from('conversation_notes')
      .insert({
        conversation_id: conversation.id,
        agent_id: req.user.id,
        content: content.trim(),
      })
      .select('*')
      .single();

    if (error || !note) {
      console.error(`[agent] create note error: ${error?.message}`);
      return res.status(500).json({ error: 'Failed to create note' });
    }

    const [withAuthor] = await attachNoteAuthors([note]);
    res.json({ note: withAuthor });
  } catch (err) {
    console.error(`[agent] create note exception: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/conversations/:id/notes/:noteId', async (req, res) => {
  try {
    const conversation = await resolveConversation(req, res, req.params.id);
    if (!conversation) return;

    const { error } = await supabase
      .from('conversation_notes')
      .delete()
      .eq('id', req.params.noteId)
      .eq('conversation_id', conversation.id);

    if (error) {
      console.error(`[agent] delete note error: ${error.message}`);
      return res.status(500).json({ error: 'Failed to delete note' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(`[agent] delete note exception: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/canned-responses', async (req, res) => {
  try {
    const { botId } = req.query;
    const access = await resolveBotAccess(req, res, botId);
    if (!access) return;

    const { data, error } = await supabase
      .from('canned_responses')
      .select('*')
      .eq('bot_id', botId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`[agent] canned responses list error: ${error.message}`);
      return res.status(500).json({ error: 'Failed to fetch canned responses' });
    }

    res.json({ cannedResponses: data || [] });
  } catch (err) {
    console.error(`[agent] canned responses list exception: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/canned-responses', async (req, res) => {
  try {
    const { botId, title, content, shortcut } = req.body;
    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({ error: 'title and content are required' });
    }

    const access = await resolveBotAccess(req, res, botId);
    if (!access) return;

    const payload = {
      bot_id: botId,
      title: title.trim(),
      content: content.trim(),
      shortcut: shortcut?.trim() || null,
    };

    const { data, error } = await supabase
      .from('canned_responses')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      console.error(`[agent] canned response create error: ${error.message}`);
      return res.status(500).json({ error: 'Failed to create canned response' });
    }

    res.json({ cannedResponse: data });
  } catch (err) {
    console.error(`[agent] canned response create exception: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/canned-responses/:id', async (req, res) => {
  try {
    const { title, content, shortcut } = req.body;
    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({ error: 'title and content are required' });
    }

    const { data: existing, error: fetchError } = await supabase
      .from('canned_responses')
      .select('id, bot_id')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Canned response not found' });
    }

    const access = await resolveBotAccess(req, res, existing.bot_id);
    if (!access) return;

    const { data, error } = await supabase
      .from('canned_responses')
      .update({
        title: title.trim(),
        content: content.trim(),
        shortcut: shortcut?.trim() || null,
      })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) {
      console.error(`[agent] canned response update error: ${error.message}`);
      return res.status(500).json({ error: 'Failed to update canned response' });
    }

    res.json({ cannedResponse: data });
  } catch (err) {
    console.error(`[agent] canned response update exception: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/canned-responses/:id', async (req, res) => {
  try {
    const { data: existing, error: fetchError } = await supabase
      .from('canned_responses')
      .select('id, bot_id')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Canned response not found' });
    }

    const access = await resolveBotAccess(req, res, existing.bot_id);
    if (!access) return;

    const { error } = await supabase
      .from('canned_responses')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      console.error(`[agent] canned response delete error: ${error.message}`);
      return res.status(500).json({ error: 'Failed to delete canned response' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(`[agent] canned response delete exception: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
