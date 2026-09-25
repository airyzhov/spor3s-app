import { supabaseServer } from '../app/supabaseServerClient';
import { getLevelInfo, nextLevelNeeds } from './levelUtils';
import { creditSC } from './referral';
import {
  habitStatus, reportReward, hasHabitAccess, cleanHabitName, HABIT_NOTE_MAX,
  type HabitReport, type HabitView, type UserHabit,
} from './habit';

// Мотивационная привычка: запросы к базе. Правила и типы — lib/habit.ts, таблицы — motivational_habits.sql.

export class HabitError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const MISSING_TABLE = new Set(['42P01', 'PGRST205']);

async function levelOf(userId: string) {
  const { data } = await supabaseServer
    .from('user_levels')
    .select('total_sc_earned, total_orders_amount, orders_count')
    .eq('user_id', userId)
    .maybeSingle();
  const args = [data?.total_sc_earned || 0, data?.total_orders_amount || 0, data?.orders_count || 0] as const;
  return { info: getLevelInfo(...args), needs: nextLevelNeeds(...args) };
}

async function activeHabit(userId: string): Promise<{ habit: UserHabit | null; tableReady: boolean }> {
  const { data, error } = await supabaseServer
    .from('user_habits')
    .select('id, habit_name, habit_type, description, started_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('started_at', { ascending: false })
    .limit(1);
  if (error) {
    if (MISSING_TABLE.has(error.code)) return { habit: null, tableReady: false };
    throw new Error(error.message);
  }
  return { habit: data?.[0] ?? null, tableReady: true };
}

async function reportsOf(habitId: string): Promise<HabitReport[]> {
  const { data, error } = await supabaseServer
    .from('weekly_habit_reports')
    .select('week_number, is_completed, sc_earned')
    .eq('habit_id', habitId);
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getHabitView(userId: string, now: Date = new Date()): Promise<HabitView> {
  const [{ info, needs }, { habit, tableReady }] = await Promise.all([levelOf(userId), activeHabit(userId)]);
  const access = hasHabitAccess(info.level);
  const view: HabitView = {
    tableReady, access, levelName: info.levelName, needs: access ? null : needs, habit: null, status: null, presets: [],
  };
  if (!tableReady || !access) return view;

  const [presetsRes, reports] = await Promise.all([
    supabaseServer.from('predefined_habits').select('id, name, description, icon').eq('is_active', true).order('sort_order'),
    habit ? reportsOf(habit.id) : Promise.resolve([] as HabitReport[]),
  ]);
  view.presets = presetsRes.data || [];
  view.habit = habit;
  view.status = habit ? habitStatus(habit.started_at, reports, now) : null;
  return view;
}

async function requireAccess(userId: string) {
  const { info } = await levelOf(userId);
  if (!hasHabitAccess(info.level)) {
    throw new HabitError(403, 'Привычка открывается на уровне 🌿 Собиратель: 100 SC и хотя бы один заказ');
  }
}

// Начать привычку на 4 недели. Законченную гасим; идущую не трогаем — одна привычка за раз.
export async function startHabit(userId: string, rawName: unknown, now: Date = new Date()): Promise<HabitView> {
  await requireAccess(userId);
  const name = cleanHabitName(rawName);
  if (!name) throw new HabitError(400, 'Название привычки — от 2 до 80 символов');

  const { habit, tableReady } = await activeHabit(userId);
  if (!tableReady) throw new HabitError(409, 'Привычка ещё не подключена');
  if (habit) {
    const status = habitStatus(habit.started_at, await reportsOf(habit.id), now);
    if (!status.finished) throw new HabitError(409, `Сейчас идёт привычка «${habit.habit_name}» — новую можно выбрать, когда она закончится`);
    await supabaseServer.from('user_habits').update({ is_active: false, updated_at: now.toISOString() }).eq('id', habit.id);
  }

  const { data: preset } = await supabaseServer.from('predefined_habits').select('description').eq('name', name).maybeSingle();
  const { error } = await supabaseServer.from('user_habits').insert([{
    user_id: userId,
    habit_name: name,
    habit_type: preset ? 'predefined' : 'custom',
    description: preset?.description ?? null,
    started_at: now.toISOString(),
    is_active: true,
  }]);
  if (error) throw new Error(error.message);
  return getHabitView(userId, now);
}

// Отчёт за идущую неделю. Номер недели считает сервер от даты старта — клиенту не верим.
export async function submitHabitReport(
  userId: string,
  isCompleted: boolean,
  rawNote: unknown,
  now: Date = new Date(),
): Promise<{ view: HabitView; scEarned: number; week: number }> {
  await requireAccess(userId);
  const { habit } = await activeHabit(userId);
  if (!habit) throw new HabitError(404, 'Сначала выбери привычку');

  const status = habitStatus(habit.started_at, await reportsOf(habit.id), now);
  if (status.finished) throw new HabitError(409, 'Привычка уже закончилась — выбери новую');
  if (!status.canReport) throw new HabitError(409, `Отчёт за неделю ${status.week} уже есть`);

  const scEarned = reportReward(isCompleted);
  const note = String(rawNote ?? '').trim().slice(0, HABIT_NOTE_MAX) || null;
  const { data: report, error } = await supabaseServer
    .from('weekly_habit_reports')
    .insert([{ habit_id: habit.id, user_id: userId, week_number: status.week, is_completed: isCompleted, note, sc_earned: scEarned }])
    .select('id')
    .single();
  // 23505 — два отчёта за одну неделю пришли одновременно; SC начислит только первый
  if (error) {
    if (error.code === '23505') throw new HabitError(409, `Отчёт за неделю ${status.week} уже есть`);
    throw new Error(error.message);
  }

  if (scEarned > 0) {
    await creditSC({
      userId,
      amount: scEarned,
      sourceType: 'habit_week',
      sourceId: report.id,
      description: `Мотивационная привычка «${habit.habit_name}» — неделя ${status.week}`,
    });
  }
  return { view: await getHabitView(userId, now), scEarned, week: status.week };
}
