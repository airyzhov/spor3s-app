import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../supabaseServerClient";

export async function GET(req: NextRequest) {
  try {
    const user_id = new URL(req.url).searchParams.get('user_id');
    if (!user_id) {
      return NextResponse.json({ error: "Необходим user_id" }, { status: 400 });
    }

    const { data: user, error: userError } = await supabaseServer
      .from("users")
      .select("id, telegram_id, username, phone")
      .eq("id", user_id)
      .single();
    if (userError || !user) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }

    // Реферальный код для шеринга: username (с @) или телефон
    const referralCode = user.username ? '@' + user.username : (user.phone || user.telegram_id);

    // Баланс SC (тратимый) + всего заработано (для уровня — уровень не падает при тратах)
    const { data: level } = await supabaseServer
      .from("user_levels")
      .select("current_sc_balance, total_sc_earned, level_code, current_level")
      .eq("user_id", user_id)
      .single();
    const balance = level?.current_sc_balance || 0;
    const totalEarned = level?.total_sc_earned || 0;

    // Приглашённые
    const { data: referrals } = await supabaseServer
      .from("referrals")
      .select(`id, status, created_at, referred_user_id, referred_user:users!referrals_referred_user_id_fkey(telegram_id, username)`)
      .eq("referrer_user_id", user_id);

    // Кто пригласил ЭТОГО пользователя (привязка по реф-ссылке бота или прошлому заказу)
    let invitedBy: { username: string | null; telegram_id: string | null } | null = null;
    const { data: inviterLink } = await supabaseServer
      .from("referrals")
      .select("referrer_user_id")
      .eq("referred_user_id", user_id)
      .limit(1);
    if (inviterLink && inviterLink.length) {
      const { data: inviter } = await supabaseServer
        .from("users")
        .select("username, telegram_id")
        .eq("id", inviterLink[0].referrer_user_id)
        .single();
      if (inviter) invitedBy = { username: inviter.username, telegram_id: inviter.telegram_id };
    }

    // Заработано на рефералке (сумма начислений 5%) + разбивка по приглашённым:
    // source_id кэшбэк-транзакции = id заказа, заказ знает покупателя (referred user)
    const { data: refTx } = await supabaseServer
      .from("sc_transactions")
      .select("amount, source_id")
      .eq("user_id", user_id)
      .eq("source_type", "referral_cashback");
    const referralEarned = (refTx || []).reduce((s, t) => s + (t.amount || 0), 0);

    const earnedByReferred: Record<string, number> = {};
    const orderIds = Array.from(new Set((refTx || []).map(t => t.source_id).filter(Boolean)));
    if (orderIds.length) {
      const { data: refOrders } = await supabaseServer
        .from("orders")
        .select("id, user_id")
        .in("id", orderIds);
      const orderBuyer: Record<string, string> = {};
      (refOrders || []).forEach(o => { if (o.user_id) orderBuyer[o.id] = o.user_id; });
      (refTx || []).forEach(t => {
        const buyer = t.source_id ? orderBuyer[t.source_id] : null;
        if (buyer) earnedByReferred[buyer] = (earnedByReferred[buyer] || 0) + (t.amount || 0);
      });
    }
    const referralsWithSc = (referrals || []).map((r: any) => ({
      ...r,
      scEarned: earnedByReferred[r.referred_user_id] || 0,
    }));

    return NextResponse.json({
      success: true,
      stats: {
        referralCode,
        balance,
        totalEarned,
        invitedBy,
        levelCode: level?.level_code || 'novice',
        levelName: level?.current_level || '🌱 Новичок',
        totalReferrals: referrals?.length || 0,
        referralEarned,
        referrals: referralsWithSc,
      },
    });
  } catch (e) {
    console.error('Referral stats error:', e);
    return NextResponse.json({ error: "Ошибка получения реферальной статистики" }, { status: 500 });
  }
}
