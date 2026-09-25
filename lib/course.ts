// «Мой курс»: одна кнопка «Я начал(а) курс», дальше еженедельные отчёты о самочувствии
// (/api/survey: +25 SC за отчёт, до 100 SC в месяц). Правила без обращений к базе.
import type { TelegramNotice } from './raffle';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Бот зовёт сюда после доставки заказа: мини-приложение откроет кабинет на разделе курса
export const COURSE_APP_URL = 'https://ai.spor3s.ru/?open=course';
export const COURSE_START_TEXT = 'Отметьте, что вы начали курс, отслеживайте своё состояние и получайте SC каждую неделю!';

// Кнопка бота открывает мини-приложение с ?open=course — сразу в кабинет, к разделу курса
export function cabinetFocusFromUrl(search: string): 'course' | null {
  return new URLSearchParams(search).get('open') === 'course' ? 'course' : null;
}

// Срок курса в месяцах для user_courses: кнопка «Я начал(а) курс» его не спрашивает — тогда 1.
// 1, 3 и 6 — как было раньше; другое значение — ошибка (null). Недели от срока не зависят.
export function parseCourseDuration(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === '') return 1;
  const months = Number(raw);
  return [1, 3, 6].includes(months) ? months : null;
}

// Неделя курса от даты старта — так же, как считает /api/survey
export function courseWeek(startDate: string, now: Date): number {
  return Math.floor((now.getTime() - Date.parse(startDate)) / WEEK_MS) + 1;
}

// Следующий отчёт: первая незаполненная неделя (пропущенную можно досдать); будущую — нельзя
export function nextCourseReport(startDate: string, filledWeeks: number[], now: Date) {
  const filled = new Set(filledWeeks);
  let week = 1;
  while (filled.has(week)) week++;
  return {
    week,
    available: week <= courseWeek(startDate, now),
    opensAt: new Date(Date.parse(startDate) + (week - 1) * WEEK_MS).toISOString(),
  };
}

// Сообщение бота, когда заказ стал «✅ Доставлен» (status completed). Один раз — на переходе
// в этот статус; тем, кто курс уже начал, и гостям без числового Telegram ID — не пишем.
export function courseStartNotice(p: {
  prevStatus: string | null | undefined;
  newStatus: string | null | undefined;
  telegramId: string | null | undefined;
  hasActiveCourse: boolean;
}): TelegramNotice | null {
  if (p.newStatus !== 'completed' || p.prevStatus === 'completed') return null;
  const chatId = String(p.telegramId ?? '').trim();
  if (!/^\d{5,15}$/.test(chatId) || p.hasActiveCourse) return null;
  return {
    chatId,
    text: `📦 Заказ доставлен!\n\n${COURSE_START_TEXT}`,
    buttons: [[{ text: '📊 Отметить начало курса', web_app: { url: COURSE_APP_URL } }]],
  };
}
