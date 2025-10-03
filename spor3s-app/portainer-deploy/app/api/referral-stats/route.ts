import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../supabaseServerClient";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get('user_id');
    
    if (!user_id) {
      return NextResponse.json({ error: "Необходим user_id" }, { status: 400 });
    }

    // Получаем информацию о пользователе
    const { data: user, error: userError } = await supabaseServer
      .from("users")
      .select("id, telegram_id, telegram_username")
      .eq("id", user_id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }

    // Получаем рефералов пользователя
    const { data: referrals, error: referralsError } = await supabaseServer
      .from("referrals")
      .select(`
        id,
        referred_user_id,
        status,
        created_at,
        referred_user:users!referrals_referred_user_id_fkey(
          telegram_id,
          telegram_username
        )
      `)
      .eq("referrer_user_id", user_id);

    if (referralsError) {
      return NextResponse.json({ error: "Ошибка получения рефералов: " + referralsError.message }, { status: 500 });
    }

    // Получаем заказы рефералов для расчета 5% кешбека
    const referredUserIds = referrals?.map(r => r.referred_user_id) || [];
    let totalReferralOrders = 0;
    let totalReferralAmount = 0;

    if (referredUserIds.length > 0) {
      const { data: referralOrders, error: ordersError } = await supabaseServer
        .from("orders")
        .select("user_id, total")
        .in("user_id", referredUserIds)
        .eq("status", "completed");

      if (!ordersError && referralOrders) {
        totalReferralOrders = referralOrders.length;
        totalReferralAmount = referralOrders.reduce((sum, order) => sum + (order.total || 0), 0);
      }
    }

    // Рассчитываем 5% кешбек
    const cashbackAmount = Math.floor(totalReferralAmount * 0.05);

    // Получаем общую статистику
    const stats = {
      totalReferrals: referrals?.length || 0,
      completedReferrals: referrals?.filter(r => r.status === "completed").length || 0,
      pendingReferrals: referrals?.filter(r => r.status === "pending").length || 0,
      totalReferralOrders,
      totalReferralAmount,
      cashbackAmount,
      referralCode: user.telegram_username || user.telegram_id,
      referrals: referrals?.map(r => ({
        id: r.id,
        status: r.status,
        created_at: r.created_at,
        referred_user: r.referred_user
      })) || []
    };

    return NextResponse.json({ 
      success: true,
      stats
    });

  } catch (e) {
    console.error('Referral stats error:', e);
    return NextResponse.json({ error: "Ошибка получения реферальной статистики" }, { status: 500 });
  }
} 