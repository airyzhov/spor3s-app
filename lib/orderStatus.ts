// Статусы, в которых заказ считается оплаченным. Переход в любой из них — сигнал начислить
// SC за покупку и рефералку: заказ нередко переводят из «ожидает» сразу в «отправлен»
// или «выполнен», минуя «оплачен». Начисления привязаны к номеру заказа, повтор не задвоит.
export const PAID_STATUSES = ['paid', 'shipped', 'completed'];

// Названия статусов — одни для админки и «Моих заказов» покупателя.
// completed — «Доставлен» (решение владельца 25.09; код статуса прежний)
export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: '⏳ В обработке',
  paid: '💰 Оплачен',
  shipped: '🚚 Отправлен',
  completed: '✅ Доставлен',
  cancelled: '❌ Отменён',
};

export function isPaidStatus(status: string | null | undefined): boolean {
  return !!status && PAID_STATUSES.includes(status);
}

// Сумма и число оплаченных заказов — для уровня: неоплаченные и отменённые не в счёт
export function paidOrderTotals(orders: { status: string | null; total: number | null }[]): { amount: number; count: number } {
  const paid = orders.filter((o) => isPaidStatus(o.status));
  return { amount: paid.reduce((sum, o) => sum + (o.total || 0), 0), count: paid.length };
}
