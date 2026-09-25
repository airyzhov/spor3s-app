import { supabaseServer } from '../app/supabaseServerClient';
import { courseStartNotice } from './course';
import { sendTelegramNotice } from './telegramSend';

// Заказ стал «✅ Доставлен» — бот зовёт отметить начало курса. Что и кому писать — courseStartNotice
// в lib/course.ts; здесь только данные из базы и отправка. Вызывает админка при смене статуса.
export async function notifyCourseStart(
  userId: string,
  prevStatus: string | null | undefined,
  newStatus: string | null | undefined,
): Promise<void> {
  if (newStatus !== 'completed' || prevStatus === 'completed') return;
  const [userRes, courseRes] = await Promise.all([
    supabaseServer.from('users').select('telegram_id').eq('id', userId).maybeSingle(),
    supabaseServer.from('user_courses').select('id').eq('user_id', userId).eq('status', 'active').limit(1),
  ]);
  const notice = courseStartNotice({
    prevStatus,
    newStatus,
    telegramId: userRes.data?.telegram_id,
    hasActiveCourse: (courseRes.data || []).length > 0,
  });
  if (notice) await sendTelegramNotice(notice);
}
