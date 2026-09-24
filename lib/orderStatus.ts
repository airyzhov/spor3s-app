// Статусы, в которых заказ считается оплаченным. Переход в любой из них — сигнал начислить
// SC за покупку и рефералку: заказ нередко переводят из «ожидает» сразу в «отправлен»
// или «выполнен», минуя «оплачен». Начисления привязаны к номеру заказа, повтор не задвоит.
export const PAID_STATUSES = ['paid', 'shipped', 'completed'];

export function isPaidStatus(status: string | null | undefined): boolean {
  return !!status && PAID_STATUSES.includes(status);
}
