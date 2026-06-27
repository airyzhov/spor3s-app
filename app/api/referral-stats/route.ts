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

    // Баланс SC (тратимый)
    const { data: level } = await supabaseServer
      .from("user_levels")
      .select("current_sc_balance")
      .eq("user_id", user_id)
      .single();
    const balance = level?.current_sc_balance || 0;

    // Приглашённые
    const { data: referrals } = await supabaseServer
      .from("referrals")
      .select(`id, status, created_at, referred_user:users!referrals_referred_user_id_fkey(telegram_id, username)`)
      .eq("referrer_user_id", user_id);

    // Заработано на рефералке (сумма начислений 5%)
    const { data: refTx } = await supabaseServer
      .from("sc_transactions")
      .select("amount")
      .eq("user_id", user_id)
      .eq("source_type", "referral_cashback");
    const referralEarned = (refTx || []).reduce((s, t) => s + (t.amount || 0), 0);

    return NextResponse.json({
      success: true,
      stats: {
        referralCode,
        balance,
        totalReferrals: referrals?.length || 0,
        referralEarned,
        referrals: referrals || [],
      },
    });
  } catch (e) {
    console.error('Referral stats error:', e);
    return NextResponse.json({ error: "Ошибка получения реферальной статистики" }, { status: 500 });
  }
}
