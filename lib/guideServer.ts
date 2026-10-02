import { supabaseServer } from '../app/supabaseServerClient';
import { creditSC } from './referral';
import { checkGuideAnswers, GUIDE_DESCRIPTION, GUIDE_REWARD_SC, GUIDE_SOURCE } from './newbieGuide';

// Гид новичка на сервере (/api/guide). Пройден = есть операция гида в sc_transactions: отдельной
// таблицы нет, повтор отсекается этой же проверкой (как у заданий на подписку).
export async function guideCompleted(userId: string): Promise<boolean> {
  const { data, error } = await supabaseServer
    .from('sc_transactions')
    .select('id')
    .eq('user_id', userId)
    .eq('source_type', GUIDE_SOURCE)
    .limit(1);
  if (error) throw new Error('sc_transactions: ' + error.message);
  return !!data?.length;
}

export type CompleteGuideResult = { ok: true; credited: boolean } | { ok: false; reason: 'answers' | 'user' };

// +100 SC за прохождение: только при всех верных ответах, только существующему пользователю, один раз.
// Сообщение в боте о начислении отправит creditSC (lib/scNotify.ts).
export async function completeGuide(userId: string, answers: unknown): Promise<CompleteGuideResult> {
  if (!checkGuideAnswers(answers)) return { ok: false, reason: 'answers' };

  const { data: user, error } = await supabaseServer.from('users').select('id').eq('id', userId).maybeSingle();
  if (error) throw new Error('users: ' + error.message);
  if (!user) return { ok: false, reason: 'user' };

  if (await guideCompleted(userId)) return { ok: true, credited: false };

  await creditSC({ userId, amount: GUIDE_REWARD_SC, sourceType: GUIDE_SOURCE, description: GUIDE_DESCRIPTION });
  return { ok: true, credited: true };
}
