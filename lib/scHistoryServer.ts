import { supabaseServer } from '../app/supabaseServerClient';
import type { ScTransaction } from './scHistory';

// История SC человека для кабинета и админки: новые сверху. Баланс в user_levels равен сумме этих
// операций (проверено по базе 30.09), так что история объясняет баланс целиком.
export async function getScHistory(userId: string, limit = 100): Promise<ScTransaction[]> {
  const { data, error } = await supabaseServer
    .from('sc_transactions')
    .select('id, created_at, amount, description, source_type')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error('sc_transactions: ' + error.message);
  return data || [];
}
