import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../supabaseServerClient';
import { isAdmin, adminUnauthorized } from '../../../../lib/adminAuth';
import { normalizePhone, getOrCreateReferrerByCode, alreadyCredited, creditSC } from '../../../../lib/referral';

const REFERRAL_PERCENT = 0.05; // 5% пригласившему
const WELCOME_SC = 100; // приветственный бонус приглашённому

// Список заказов для админки (учёт продаж).
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return adminUnauthorized();
  const { data, error } = await supabaseServer
    .from('orders')
    .select('id, created_at, fio, phone, address, items, total, status, comment, referral_code, tracking_number, user_id')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ orders: data || [] });
}

// Начисление рефералки при оплате заказа. Идемпотентно (защита по sc_transactions.source_id).
async function processReferralOnPaid(orderId: string) {
  const { data: order } = await supabaseServer
    .from('orders')
    .select('id, total, user_id, referral_code')
    .eq('id', orderId)
    .single();
  if (!order || !order.referral_code) return;

  const code = String(order.referral_code).trim();
  if (!code) return;

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

  // 1) Пригласившему — 5% от суммы заказа (на каждый оплаченный заказ)
  if (!(await alreadyCredited(order.id, 'referral_cashback'))) {
    const referrer = await getOrCreateReferrerByCode(code);
    if (referrer && referrer.id !== order.user_id) {
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
      // фиксируем связь реферал→приглашённый
      if (order.user_id) {
        const { data: link } = await supabaseServer
          .from('referrals')
          .select('id')
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
        }
      }
    }
  }

  // 2) Приглашённому — приветственные 100 SC (только за первый оплаченный заказ по реф-коду)
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

// Обновление статуса заказа (pending / paid / shipped / completed / cancelled).
export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return adminUnauthorized();
  const { id, status } = await req.json();
  if (!id || !status) {
    return NextResponse.json({ error: 'id и status обязательны' }, { status: 400 });
  }
  const { error } = await supabaseServer.from('orders').update({ status }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // При оплате — начисляем рефералку (не валим ответ, если что-то пошло не так)
  if (status === 'paid') {
    try {
      await processReferralOnPaid(id);
    } catch (e) {
      console.error('[referral] ошибка начисления при оплате:', e);
    }
  }

  return NextResponse.json({ success: true });
}
