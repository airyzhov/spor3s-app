import { supabaseServer } from '../app/supabaseServerClient';
import { notifyScChange } from './scNotify';

// Операции с SC, которые не начисление за что-то (там creditSC в lib/referral.ts): ручная операция
// из админки и списание при заказе. Обе пишут в sc_transactions, меняют баланс в user_levels
// и сообщают человеку в боте (lib/scNotify.ts). Дизайн: docs/superpowers/specs/2026-09-30-sc-history-design.md

// Ручное начисление (amount > 0) или списание (amount < 0) из админки. Комментарий видит покупатель —
// в боте и в истории SC; пустой заменяем понятным. notify: false — галочка «Уведомить в боте» снята.
// Ошибка записи — исключение: админка покажет её, а не «Начислено». Возвращает новый баланс.
export async function manualAdjustSC({
  userId,
  amount,
  description,
  notify = true,
}: {
  userId: string;
  amount: number;
  description?: string | null;
  notify?: boolean;
}): Promise<number> {
  const text = String(description ?? '').trim() || (amount >= 0 ? 'Начисление от магазина' : 'Списание магазином');

  const { error: txError } = await supabaseServer.from('sc_transactions').insert([{
    user_id: userId,
    amount,
    transaction_type: amount >= 0 ? 'earned' : 'spent',
    source_type: 'manual',
    description: text,
    created_at: new Date().toISOString(),
  }]);
  if (txError) throw new Error('sc_transactions: ' + txError.message);

  const { data: level } = await supabaseServer
    .from('user_levels')
    .select('current_sc_balance, total_sc_earned, total_sc_spent')
    .eq('user_id', userId)
    .maybeSingle();
  const balance = (level?.current_sc_balance || 0) + amount;
  const earned = amount > 0 ? amount : 0;
  const spent = amount < 0 ? -amount : 0;

  const { error: levelError } = level
    ? await supabaseServer.from('user_levels').update({
        current_sc_balance: balance,
        total_sc_earned: (level.total_sc_earned || 0) + earned,
        total_sc_spent: (level.total_sc_spent || 0) + spent,
        updated_at: new Date().toISOString(),
      }).eq('user_id', userId)
    : await supabaseServer.from('user_levels').insert([{
        user_id: userId,
        current_level: '🌱 Новичок',
        level_code: 'novice',
        current_sc_balance: balance,
        total_sc_earned: earned,
        total_sc_spent: spent,
      }]);
  if (levelError) throw new Error('user_levels: ' + levelError.message);

  if (notify) await notifyScChange(userId, { amount, description: text, balance });
  return balance;
}

// Списание SC скидкой при заказе (форма заказа, /api/order). Заказ к этому моменту уже создан —
// поэтому не бросаем: ошибку пишем в лог, и тогда без сообщения (баланс в нём был бы неверным).
export async function spendScForOrder({
  userId,
  orderId,
  coins,
  balanceBefore,
  spentBefore,
}: {
  userId: string;
  orderId: string;
  coins: number;
  balanceBefore: number;
  spentBefore: number;
}): Promise<void> {
  const description = `Списание SC для заказа #${orderId}`;
  const { error: txError } = await supabaseServer.from('sc_transactions').insert([{
    user_id: userId,
    amount: -coins, // списание — с минусом
    transaction_type: 'spent',
    source_type: 'order_discount',
    description,
    created_at: new Date().toISOString(),
  }]);
  if (txError) {
    console.error('❌ Ошибка списания SC:', txError);
    return;
  }

  const balance = balanceBefore - coins;
  const { error: updateError } = await supabaseServer
    .from('user_levels')
    .update({ current_sc_balance: balance, total_sc_spent: spentBefore + coins })
    .eq('user_id', userId);
  if (updateError) {
    console.error('❌ Ошибка обновления баланса SC:', updateError);
    return;
  }

  await notifyScChange(userId, { amount: -coins, description, balance });
}
