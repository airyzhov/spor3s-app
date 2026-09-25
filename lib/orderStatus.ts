// Статусы, в которых заказ считается оплаченным. Переход в любой из них — сигнал начислить
// SC за покупку и рефералку: заказ нередко переводят из «ожидает» сразу в «отправлен»
// или «выполнен», минуя «оплачен». Начисления привязаны к номеру заказа, повтор не задвоит.
export const PAID_STATUSES = ['paid', 'shipped', 'completed'];

export function isPaidStatus(status: string | null | undefined): boolean {
  return !!status && PAID_STATUSES.includes(status);
}

// Сумма и число оплаченных заказов — для уровня: неоплаченные и отменённые не в счёт
export function paidOrderTotals(orders: { status: string | null; total: number | null }[]): { amount: number; count: number } {
  const paid = orders.filter((o) => isPaidStatus(o.status));
  return { amount: paid.reduce((sum, o) => sum + (o.total || 0), 0), count: paid.length };
}
