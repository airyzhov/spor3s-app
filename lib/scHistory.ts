// История SC: форматирование операций и сообщение бота о начислении или списании.
// Без обращений к базе — работает и в кабинете, и в админке, проверяется юнит-тестами.
// Дизайн: docs/superpowers/specs/2026-09-30-sc-history-design.md
import type { TelegramNotice } from './raffle';

export type ScTransaction = {
  id: string;
  created_at: string;
  amount: number;
  description: string | null;
  source_type: string | null;
};

// Изменение баланса для сообщения в боте: сколько, за что и сколько стало
export type ScChange = { amount: number; description: string | null; balance: number };

// Кнопка «🧾 История SC»: мини-приложение сразу в кабинете с раскрытой историей (lib/course.ts)
export const SC_HISTORY_APP_URL = 'https://ai.spor3s.ru/?open=sc';

const TG_ID = /^\d{5,15}$/;
const ORDER_ID = /#([0-9a-f]{8})-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

// +30 / −50 (типографский минус) / 0
export function formatScAmount(amount: number): string {
  if (amount > 0) return `+${amount}`;
  if (amount < 0) return `−${Math.abs(amount)}`;
  return '0';
}

// «#03d1710f-ffe0-…» → «#03d1710f» — тот же короткий номер, что в таблице заказов админки
export function shortOrderIds(text: string | null | undefined): string {
  return String(text ?? '').replace(ORDER_ID, '#$1');
}

// «28.09 14:02» по Москве — покупатели и владелец живут по московскому времени
export function scDateLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return `${part('day')}.${part('month')} ${part('hour')}:${part('minute')}`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Сообщение бота об изменении SC или null: нет числового Telegram ID (боту некуда писать) или сумма 0
export function scChangeNotice(change: ScChange, telegramId: string | null | undefined): TelegramNotice | null {
  const chatId = String(telegramId ?? '').trim();
  if (!TG_ID.test(chatId) || !change.amount) return null;
  const what = escapeHtml(shortOrderIds(change.description).trim());
  const head = `${change.amount > 0 ? '💰' : '💸'} <b>${formatScAmount(change.amount)} SC</b>${what ? ` — ${what}` : ''}`;
  return {
    chatId,
    text: `${head}\nБаланс: <b>${change.balance} SC</b>`,
    buttons: [[{ text: '🧾 История SC', web_app: { url: SC_HISTORY_APP_URL } }]],
  };
}
