import { supabaseServer } from '../app/supabaseServerClient';

console.log('[initUserHandler] Using supabaseServer client');

export async function getOrCreateUser(telegram_id: string, referral_code?: string, username?: string) {
  if (!telegram_id) {
    throw new Error('telegram_id required');
  }
  console.log('[getOrCreateUser] Querying for telegram_id:', telegram_id);

  let { data: user, error } = await supabaseServer
    .from('users')
    .select('id, username')
    .eq('telegram_id', telegram_id)
    .single();
  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  if (!user) {
    const userData: Record<string, unknown> = { telegram_id };
    if (username) userData.username = username;

    const { data: newUser, error: insertError } = await supabaseServer
      .from('users')
      .insert([userData])
      .select('id, username')
      .single();
    if (insertError || !newUser) {
      throw new Error(insertError?.message || 'Failed to create user');
    }
    user = newUser;
  } else if (username && !user.username) {
    // Дозаписываем username, если появился (для рефералки по нику)
    await supabaseServer.from('users').update({ username }).eq('id', user.id);
  }

  return user.id;
}