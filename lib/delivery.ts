// Способ доставки из формы заказа: в базе отдельной колонки нет, поэтому пишем его в начало адреса,
// чтобы он был виден и в уведомлении менеджеру в боте, и в админке.
const DELIVERY_LABELS: Record<string, string> = {
  cdek: 'СДЭК (пункт выдачи)',
  ozon: 'OZON (пункт выдачи)',
  courier: 'СДЭК (курьер)',
};

export function withDeliveryType(type: unknown, address: unknown): string {
  const addr = String(address ?? '').trim();
  const label = typeof type === 'string' ? DELIVERY_LABELS[type] : undefined;
  if (!label) return addr;
  if (addr.startsWith(label)) return addr;
  return addr ? `${label}: ${addr}` : label;
}
