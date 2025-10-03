// Supabase utilities for Node scripts (Telegram personal account)
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase env vars are missing. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

async function getOrCreateUser(telegramId) {
  const tgId = String(telegramId);

  // Try to find existing user
  const { data: existing, error: findErr } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', tgId)
    .limit(1)
    .maybeSingle();

  if (findErr) throw findErr;
  if (existing) return existing;

  // Create new user
  const { data: created, error: createErr } = await supabase
    .from('users')
    .insert([{ telegram_id: tgId }])
    .select('*')
    .single();

  if (createErr) throw createErr;
  return created;
}

async function saveMessage(userId, role, content, source = 'telegram') {
  const payload = {
    user_id: userId,
    role,
    content,
    source,
  };
  const { error } = await supabase.from('messages').insert([payload]);
  if (error) throw error;
}

async function getRecentMessages(userId, limit = 15) {
  const { data, error } = await supabase
    .from('messages')
    .select('role, content')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).reverse();
}

module.exports = {
  supabase,
  getOrCreateUser,
  saveMessage,
  getRecentMessages,
};
