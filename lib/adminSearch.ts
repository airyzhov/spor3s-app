// Поиск в админке по номеру заказа, Telegram ID или @логину: подстрока без учёта регистра.
// Ведущие @ и # отбрасываем — логин в базе бывает и с @, а номер заказа в уведомлении идёт с #.

type SearchableOrder = { id: string; user_id?: string | null; telegram_id?: string | null; username?: string | null };
type SearchableUser = { id: string; telegram_id?: string | null; username?: string | null };

function normalize(value: string | null | undefined): string {
  return String(value ?? '').trim().toLowerCase().replace(/^[@#]+/, '');
}

function matchesAny(fields: (string | null | undefined)[], query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  return fields.some((field) => normalize(field).includes(q));
}

export function matchesOrder(order: SearchableOrder, query: string): boolean {
  return matchesAny([order.id, order.user_id, order.telegram_id, order.username], query);
}

export function matchesUser(user: SearchableUser, query: string): boolean {
  return matchesAny([user.id, user.telegram_id, user.username], query);
}
