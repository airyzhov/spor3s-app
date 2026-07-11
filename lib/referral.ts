import { supabaseServer } from '../app/supabaseServerClient';
import { getLevelInfo, LEVEL_CONFIG } from './levelUtils';

// Нормализуем телефон к виду 79998887766 (11 цифр, ведущая 7). Возвращаем null, если не похоже на телефон.
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = String(raw).replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('8')) d = '7' + d.slice(1);
  if (d.length === 10) d = '7' + d;
  if (d.length === 11 && d.startsWith('7')) return d;
  return null;
}

// Похоже ли значение на телефон (а не на username)
export function looksLikePhone(code: string): boolean {
  return normalizePhone(code) !== null;
}

// Найти пригласившего по реф-коду: сначала как username (без регистра), затем как телефон.
export async function resolveReferrer(code: string): Promise<any | null> {
  const trimmed = (code || '').trim();
  if (!trimmed) return null;

  const phone = normalizePhone(trimmed);
  if (phone) {
    const { data } = await supabaseServer.from('users').select('id, telegram_id, username, phone').eq('phone', phone).limit(1);
    if (data && data[0]) return data[0];
  }

  // username (убираем ведущий @)
  const uname = trimmed.replace(/^@/, '');
  if (uname && !phone) {
    const { data } = await supabaseServer.from('users').select('id, telegram_id, username, phone').ilike('username', uname).limit(1);
    if (data && data[0]) return data[0];
  }
  return null;
}

// Создать «заочную» запись пригласившего по коду (телефон или username), если его ещё нет.
export async function getOrCreateReferrerByCode(code: string): Promise<any | null> {
  const existing = await resolveReferrer(code);
  if (existing) return existing;

  const trimmed = (code || '').trim();
  const phone = normalizePhone(trimmed);
  const insert: Record<string, unknown> = {
    telegram_id: `pending-${phone || trimmed.replace(/^@/, '')}`,
  };
  if (phone) insert.phone = phone;
  else insert.username = trimmed.replace(/^@/, '');

  const { data, error } = await supabaseServer.from('users').insert([insert]).select('id, telegram_id, username, phone').single();
  if (error || !data) {
    console.error('[referral] не удалось создать заочного рефера:', error?.message);
    return null;
  }
  return data;
}

// Уже начисляли по этому заказу для данного типа? (защита от двойного начисления)
export async function alreadyCredited(orderId: string, sourceType: string): Promise<boolean> {
  const { data } = await supabaseServer
    .from('sc_transactions')
    .select('id')
    .eq('source_id', orderId)
    .eq('source_type', sourceType)
    .limit(1);
  return !!(data && data.length);
}

// Пересчитать уровень пользователя от total_sc_earned (+ требования по заказам).
// Вызывается после каждого начисления SC — поэтому скидки Мастера/Легенды в /api/order работают.
export async function recalcUserLevel(userId: string): Promise<void> {
  const { data: level } = await supabaseServer
    .from('user_levels')
    .select('level_code, total_sc_earned, total_orders_amount, orders_count')
    .eq('user_id', userId)
    .single();
  if (!level) return;

  const info = getLevelInfo(
    level.total_sc_earned || 0,
    level.total_orders_amount || 0,
    level.orders_count || 0
  );
  if (info.levelCode === level.level_code) return;

  const levelNum = LEVEL_CONFIG.find(l => l.code === info.levelCode)?.level || 1;
  await supabaseServer.from('user_levels').update({
    level_code: info.levelCode,
    current_level: info.levelName,
    level_achieved_at: new Date().toISOString(),
    has_motivational_habit: levelNum >= 3,
    has_expert_chat_access: levelNum >= 4,
    has_permanent_discount: levelNum >= 5,
    has_vip_access: levelNum >= 6,
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId);
}

// Начислить SC: запись в sc_transactions + обновление баланса в user_levels (создаём строку при отсутствии).
export async function creditSC(params: {
  userId: string;
  amount: number;
  sourceType: string;
  sourceId?: string;
  description: string;
}): Promise<void> {
  const { userId, amount, sourceType, sourceId, description } = params;
  if (!userId || !amount) return;

  await supabaseServer.from('sc_transactions').insert([{
    user_id: userId,
    amount,
    transaction_type: 'earned',
    source_type: sourceType,
    source_id: sourceId || null,
    description,
    created_at: new Date().toISOString(),
  }]);

  const { data: level } = await supabaseServer
    .from('user_levels')
    .select('current_sc_balance, total_sc_earned')
    .eq('user_id', userId)
    .single();

  if (!level) {
    await supabaseServer.from('user_levels').insert([{
      user_id: userId,
      current_level: '🌱 Новичок',
      level_code: 'novice',
      current_sc_balance: amount,
      total_sc_earned: amount,
      total_sc_spent: 0,
    }]);
  } else {
    await supabaseServer.from('user_levels').update({
      current_sc_balance: (level.current_sc_balance || 0) + amount,
      total_sc_earned: (level.total_sc_earned || 0) + amount,
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId);
  }

  // Пересчёт уровня после каждого начисления (не валим начисление при ошибке)
  try {
    await recalcUserLevel(userId);
  } catch (e) {
    console.error('[levels] ошибка пересчёта уровня:', e);
  }
}
