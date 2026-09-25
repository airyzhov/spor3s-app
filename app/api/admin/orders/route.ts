import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../supabaseServerClient';
import { isAdmin, adminUnauthorized } from '../../../../lib/adminAuth';
import { normalizePhone, getOrCreateReferrerByCode, alreadyCredited, creditSC, recalcOrderTotals } from '../../../../lib/referral';
import { REFERRAL_PERCENT } from '../../../../lib/levelUtils';
import { isPaidStatus } from '../../../../lib/orderStatus';
import { notifyCourseStart } from '../../../../lib/courseNotify';

const WELCOME_SC = 100; // приветственный бонус приглашённому
const ORDER_SC_RATE = 100; // 1 SC за каждые 100₽ оплаченного заказа

// Список заказов для админки (учёт продаж).
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return adminUnauthorized();
  const { data, error } = await supabaseServer
    .from('orders')
    .select('id, created_at, fio, phone, address, items, total, status, comment, referral_code, tracking_number, admin_comment, user_id')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Подтягиваем контакт клиента в Telegram (username / telegram_id) по user_id
  const orders = data || [];
  const userIds = Array.from(new Set(orders.map((o: any) => o.user_id).filter(Boolean)));
  const tgMap: Record<string, { username: string | null; telegram_id: string | null }> = {};
  if (userIds.length) {
    const { data: usersData } = await supabaseServer
      .from('users')
      .select('id, username, telegram_id')
      .in('id', userIds);
    (usersData || []).forEach((u: any) => {
      tgMap[u.id] = { username: u.username || null, telegram_id: u.telegram_id || null };
    });
  }
  const withTg = orders.map((o: any) => ({
    ...o,
    username: o.user_id ? tgMap[o.user_id]?.username ?? null : null,
    telegram_id: o.user_id ? tgMap[o.user_id]?.telegram_id ?? null : null,
  }));

  return NextResponse.json({ orders: withTg });
}

// Начисление рефералки при оплате заказа. Идемпотентно (защита по sc_transactions.source_id).
// Пригласивший определяется по коду из заказа ИЛИ по привязке из реф-ссылки бота (таблица referrals).
async function processReferralOnPaid(orderId: string) {
  const { data: order } = await supabaseServer
    .from('orders')
    .select('id, total, user_id, referral_code')
    .eq('id', orderId)
    .single();
  if (!order) return;

  const code = String(order.referral_code || '').trim();

  // Данные покупателя — для проверки самореферала
  let buyer: any = null;
  if (order.user_id) {
    const { data } = await supabaseServer
      .from('users')
      .select('id, username, phone, telegram_id')
      .eq('id', order.user_id)
      .single();
    buyer = data;
  }

  // Определяем пригласившего
  let referrer: any = null;
  if (code) {
    if (buyer) {
      const phone = normalizePhone(code);
      const uname = code.replace(/^@/, '').toLowerCase();
      const self =
        (phone && phone === buyer.phone) ||
        (buyer.username && String(buyer.username).toLowerCase() === uname) ||
        code === buyer.telegram_id;
      if (self) {
        console.log('[referral] самореферал — пропуск заказа', orderId);
        return;
      }
    }
    referrer = await getOrCreateReferrerByCode(code);
  } else if (order.user_id) {
    // Кода нет — ищем привязку из реф-ссылки бота
    const { data: link } = await supabaseServer
      .from('referrals')
      .select('referrer_user_id')
      .eq('referred_user_id', order.user_id)
      .limit(1);
    if (link && link.length) {
      const { data: refUser } = await supabaseServer
        .from('users')
        .select('id')
        .eq('id', link[0].referrer_user_id)
        .single();
      referrer = refUser;
    }
  }

  if (!referrer || referrer.id === order.user_id) return;

  // 1) Пригласившему — 5% от суммы заказа (на каждый оплаченный заказ)
  if (!(await alreadyCredited(order.id, 'referral_cashback'))) {
    const amount = Math.floor((order.total || 0) * REFERRAL_PERCENT);
    if (amount > 0) {
      await creditSC({
        userId: referrer.id,
        amount,
        sourceType: 'referral_cashback',
        sourceId: order.id,
        description: `Реферальный кэшбэк ${Math.round(REFERRAL_PERCENT * 100)}% с заказа #${order.id}`,
      });
    }
    // фиксируем/закрываем связь реферал→приглашённый
    if (order.user_id) {
      const { data: link } = await supabaseServer
        .from('referrals')
        .select('id, status')
        .eq('referrer_user_id', referrer.id)
        .eq('referred_user_id', order.user_id)
        .limit(1);
      if (!link || !link.length) {
        await supabaseServer.from('referrals').insert([{
          referrer_user_id: referrer.id,
          referred_user_id: order.user_id,
          status: 'completed',
          created_at: new Date().toISOString(),
        }]);
      } else if (link[0].status !== 'completed') {
        await supabaseServer.from('referrals').update({ status: 'completed' }).eq('id', link[0].id);
      }
    }
  }

  // 2) Приглашённому — приветственные 100 SC (только за первый оплаченный заказ)
  if (order.user_id && !(await alreadyCredited(order.id, 'referral_welcome'))) {
    const { data: prior } = await supabaseServer
      .from('sc_transactions')
      .select('id')
      .eq('user_id', order.user_id)
      .eq('source_type', 'referral_welcome')
      .limit(1);
    if (!prior || !prior.length) {
      await creditSC({
        userId: order.user_id,
        amount: WELCOME_SC,
        sourceType: 'referral_welcome',
        sourceId: order.id,
        description: `Приветственный бонус за заказ по реф-коду #${order.id}`,
      });
    }
  }
}

// Начисление SC за сам заказ при оплате (1 SC за каждые 100₽). Идемпотентно по source_id.
async function creditOrderScOnPaid(orderId: string) {
  const { data: order } = await supabaseServer
    .from('orders')
    .select('id, total, user_id')
    .eq('id', orderId)
    .single();
  if (!order || !order.user_id) return;
  if (await alreadyCredited(order.id, 'order')) return;

  const amount = Math.floor((order.total || 0) / ORDER_SC_RATE);
  if (amount > 0) {
    await creditSC({
      userId: order.user_id,
      amount,
      sourceType: 'order',
      sourceId: order.id,
      description: `Начисление SC за оплаченный заказ #${order.id}`,
    });
  }
}

// Обновление заказа: статус (pending / paid / shipped / completed / cancelled),
// трек-номер и комментарий для покупателя — любые из полей по отдельности.
export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return adminUnauthorized();
  const { id, status, tracking_number, admin_comment } = await req.json();
  if (!id) {
    return NextResponse.json({ error: 'id обязателен' }, { status: 400 });
  }
  const patch: Record<string, unknown> = {};
  if (status !== undefined) patch.status = status;
  if (tracking_number !== undefined) patch.tracking_number = String(tracking_number).trim() || null;
  if (admin_comment !== undefined) patch.admin_comment = String(admin_comment).trim() || null;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'нет полей для обновления' }, { status: 400 });
  }
  // Прежний статус и покупатель — для сообщения «отметьте начало курса» и пересчёта суммы заказов
  const { data: before } = await supabaseServer.from('orders').select('status, user_id').eq('id', id).maybeSingle();
  const { error } = await supabaseServer.from('orders').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Заказ стал оплаченным (оплачен, отправлен или выполнен) — начисляем SC за заказ и рефералку.
  // Начисления привязаны к номеру заказа: переход paid → shipped → completed их не задвоит.
  // Ответ не валим, если что-то пошло не так.
  if (isPaidStatus(status)) {
    try {
      await creditOrderScOnPaid(id);
    } catch (e) {
      console.error('[order-sc] ошибка начисления SC при оплате:', e);
    }
    try {
      await processReferralOnPaid(id);
    } catch (e) {
      console.error('[referral] ошибка начисления при оплате:', e);
    }
  }

  // Сумма оплаченных заказов клиента (от неё зависят Мастер и Легенда со скидкой) меняется при любой
  // смене статуса: заказ оплатили — прибавилась, отменили или вернули в «ожидает» — убавилась.
  if (status !== undefined && before?.user_id) {
    try {
      await recalcOrderTotals(before.user_id);
    } catch (e) {
      console.error('[levels] ошибка пересчёта суммы заказов:', e);
    }
  }

  // Заказ стал «✅ Доставлен» (completed) — бот зовёт покупателя отметить начало курса (lib/courseNotify.ts)
  if (status !== undefined && before?.user_id) {
    try {
      await notifyCourseStart(before.user_id, before.status, status);
    } catch (e) {
      console.error('[course] ошибка сообщения о начале курса:', e);
    }
  }

  return NextResponse.json({ success: true });
}
