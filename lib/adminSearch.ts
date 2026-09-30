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

type PickableUser = { telegram_id?: string | null; username?: string | null };

// Выбор человека в «💰 Начислить SC»: только ник и Telegram ID (внутренний UUID дал бы случайные
// совпадения по цифрам). Сначала точное совпадение, потом начало, потом середина; пустой запрос — никого.
export function pickUsers<T extends PickableUser>(users: T[], query: string, limit = 8): { matches: T[]; total: number } {
  const q = normalize(query);
  if (!q) return { matches: [], total: 0 };
  const rank = (user: T) => {
    const fields = [normalize(user.username), normalize(user.telegram_id)];
    if (fields.includes(q)) return 0;
    if (fields.some((f) => f.startsWith(q))) return 1;
    if (fields.some((f) => f.includes(q))) return 2;
    return -1;
  };
  const found = users
    .map((user) => ({ user, r: rank(user) }))
    .filter((x) => x.r >= 0)
    .sort((a, b) => a.r - b.r)
    .map((x) => x.user);
  return { matches: found.slice(0, limit), total: found.length };
}
