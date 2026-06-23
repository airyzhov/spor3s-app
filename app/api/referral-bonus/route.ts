import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../supabaseServerClient";

export async function POST(req: NextRequest) {
  try {
    const { user_id, referral_code } = await req.json();
    
    if (!user_id || !referral_code) {
      return NextResponse.json({ error: "Необходимы user_id и referral_code" }, { status: 400 });
    }

    // Находим пользователя, который пригласил (по referral_code)
    const { data: referrer, error: referrerError } = await supabaseServer
      .from("users")
      .select("id, telegram_id, telegram_username")
      .eq("telegram_id", referral_code)
      .or(`username.eq.${referral_code}`)
      .single();

    if (referrerError || !referrer) {
      return NextResponse.json({ error: "Реферальный код не найден" }, { status: 400 });
    }

    // Проверяем, не использовал ли пользователь уже реферальный код
    const { data: existingReferral, error: existingError } = await supabaseServer
      .from("referrals")
      .select("id")
      .eq("referred_user_id", user_id)
      .single();

    if (existingReferral) {
      return NextResponse.json({ error: "Реферальный код уже использован" }, { status: 400 });
    }

    // Создаем запись о реферале
    const { data: newReferral, error: insertError } = await supabaseServer
      .from("referrals")
      .insert([{
        referrer_user_id: referrer.id,
        referred_user_id: user_id,
        status: "pending", // будет "completed" после первого заказа
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: "Ошибка создания реферала: " + insertError.message }, { status: 500 });
    }

    // Даем 100 SC новому пользователю
    const { data: activeOrder, error: orderError } = await supabaseServer
      .from("orders")
      .select("id, spores_coin")
      .eq("user_id", user_id)
      .eq("status", "active")
      .single();

    let orderId = activeOrder?.id;
    
    // Если активного заказа нет, создаем новый
    if (orderError || !activeOrder) {
      const { data: newOrder, error: createError } = await supabaseServer
        .from("orders")
        .insert([{
          user_id,
          status: "active",
          spores_coin: 100, // 100 SC за реферальный бонус
          total: 0,
          created_at: new Date().toISOString()
        }])
        .select("id, spores_coin")
        .single();

      if (createError) {
        return NextResponse.json({ error: "Ошибка создания заказа: " + createError.message }, { status: 500 });
      }
      orderId = newOrder.id;
    } else {
      // Добавляем 100 SC к существующему заказу
      const { error: updateError } = await supabaseServer
        .from("orders")
        .update({
          spores_coin: (activeOrder.spores_coin || 0) + 100
        })
        .eq("id", activeOrder.id);

      if (updateError) {
        return NextResponse.json({ error: "Ошибка обновления заказа: " + updateError.message }, { status: 500 });
      }
    }

    // Записываем транзакцию для нового пользователя
    const { error: txError } = await supabaseServer
      .from("coin_transactions")
      .insert([{
        user_id,
        order_id: orderId,
        type: "referral_welcome",
        amount: 100,
        description: `Приветственный бонус от пользователя ${referrer.telegram_username || referrer.telegram_id}`,
        created_at: new Date().toISOString(),
      }]);

    if (txError) {
      return NextResponse.json({ error: "Ошибка записи транзакции: " + txError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      referrer: {
        id: referrer.id,
        username: referrer.telegram_username,
        telegram_id: referrer.telegram_id
      },
      bonus: 100,
      message: `Получено 100 SC от пользователя ${referrer.telegram_username || referrer.telegram_id}!`
    });

  } catch (e) {
    console.error('Referral bonus error:', e);
    return NextResponse.json({ error: "Ошибка начисления реферального бонуса" }, { status: 500 });
  }
} 