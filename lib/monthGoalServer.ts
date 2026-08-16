import { supabaseServer } from '../app/supabaseServerClient';
import { creditSC } from './referral';
import { MONTH_GOAL, MonthGoal, computeMonthGoal, monthKey, monthStart } from './monthGoal';

// Отчёты месяца считаем по транзакциям source_type='survey': стартовая самооценка SC не даёт
// и в цель не попадает, а сверх месячного лимита транзакция не создаётся.
//
// Идемпотентность НЕ через source_id: sc_transactions.source_id — колонка UUID в реальной схеме
// (проверено запросом схемы к живой БД), а не свободный текст, как предполагалось в спеке задачи.
// Строка вида "2026-08" не пройдёт как UUID — вставка транзакции будет молча падать (creditSC не
// проверяет ошибку insert), баланс всё равно вырастет, а bonusPaid всегда останется false → бонус
// будет начисляться повторно на каждый вызов. Вместо этого используем то же решение, что и
// app/api/subscribe-bonus/route.ts для одноразовых бонусов без естественного UUID: ключом служит
// source_type, а поскольку запрос уже ограничен текущим календарным месяцем (created_at >=
// monthStart(now)), любая строка source_type='month_goal' в выборке — это бонус именно этого месяца.
// Месяц для отладки остаётся читаемым в description.
export async function getMonthGoal(userId: string, now: Date = new Date()): Promise<MonthGoal> {
  const { data } = await supabaseServer
    .from('sc_transactions')
    .select('source_type')
    .eq('user_id', userId)
    .in('source_type', ['survey', 'month_goal'])
    .gte('created_at', monthStart(now).toISOString());

  const rows = data || [];
  const reportsDone = rows.filter(r => r.source_type === 'survey').length;
  const bonusPaid = rows.some(r => r.source_type === 'month_goal');
  return computeMonthGoal(reportsDone, bonusPaid);
}

// Идемпотентно: повторный вызов в том же месяце вернёт 0.
export async function grantMonthGoalIfComplete(userId: string, now: Date = new Date()): Promise<number> {
  const goal = await getMonthGoal(userId, now);
  if (!goal.completed || goal.bonusPaid) return 0;

  await creditSC({
    userId,
    amount: MONTH_GOAL.bonus,
    sourceType: 'month_goal',
    description: `Цель месяца — ${MONTH_GOAL.reportsTarget} отчёта за месяц (${monthKey(now)})`,
  });
  return MONTH_GOAL.bonus;
}
