import { supabaseServer } from '@/app/supabaseServerClient';

console.log('[initUserHandler] Using supabaseServer client');

export async function getOrCreateUser(telegram_id: string, referral_code?: string) {
  if (!telegram_id) {
    throw new Error('telegram_id required');
  }
  console.log('[getOrCreateUser] Querying for telegram_id:', telegram_id);
  console.log('[getOrCreateUser] referral_code:', referral_code);

  let { data: user, error } = await supabaseServer
    .from('users')
    .select('id')
    .eq('telegram_id', telegram_id)
    .single();
  console.log('[getOrCreateUser] Select result:', user, 'Error:', error);
  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  if (!user) {
    console.log('[getOrCreateUser] No user found, inserting');
    const userData: Record<string, unknown> = { telegram_id };

    const { data: newUser, error: insertError } = await supabaseServer
      .from('users')
      .insert([userData])
      .select('id')
      .single();
    console.log('[getOrCreateUser] Insert result:', newUser, 'Error:', insertError);
    if (insertError || !newUser) {
      throw new Error(insertError?.message || 'Failed to create user');
    }
    user = newUser;
  }

  return user.id;
}