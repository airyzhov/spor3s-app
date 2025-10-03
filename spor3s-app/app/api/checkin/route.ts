import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../supabaseServerClient";

export async function POST(req: NextRequest) {
  try {
    const { user_id, order_id } = await req.json();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // 0. Проверяем, был ли чек-ин сегодня
    const { data: existingCheckins, error: checkinFindError } = await supabaseServer
      .from("daily_checkins")
      .select("id")
      .eq("user_id", user_id)
      .eq("order_id", order_id)
      .gte("date", today.toISOString())
      .lt("date", tomorrow.toISOString());
    if (existingCheckins && existingCheckins.length > 0) {
      return NextResponse.json({ error: "Чек-ин на сегодня уже сделан!" }, { status: 400 });
    }

    // 1. Добавляем чек-ин (таблица daily_checkins)
    const { error: checkinError } = await supabaseServer.from("daily_checkins").insert([
      { user_id, order_id, date: new Date().toISOString() }
    ]);
    if (checkinError) {
      return NextResponse.json({ error: checkinError.message }, { status: 500 });
    }

    // 2. Если у заказа нет start_date — ставим его
    const { data: order } = await supabaseServer
      .from("orders")
      .select("start_date, spores_coin")
      .eq("id", order_id)
      .single();
    if (!order?.start_date) {
      const { error: updateError } = await supabaseServer
        .from("orders")
        .update({ start_date: new Date().toISOString() })
        .eq("id", order_id);
      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    // 3. Обновляем ежедневную активность в новой системе
    const { data: existingActivity, error: activityError } = await supabaseServer
      .from("daily_activities")
      .select("id, daily_checkin")
      .eq("user_id", user_id)
      .eq("date", today.toISOString().split('T')[0])
      .single();

    if (activityError && activityError.code !== 'PGRST116') {
      return NextResponse.json({ error: activityError.message }, { status: 500 });
    }

    if (existingActivity && existingActivity.daily_checkin) {
      return NextResponse.json({ error: "Чек-ин на сегодня уже сделан!" }, { status: 400 });
    }

    // Создаем или обновляем запись активности
    const activityData = {
      user_id,
      date: today.toISOString().split('T')[0],
      daily_checkin: true,
      sc_earned: 3 // 3 SC за ежедневный чек-ин
    };

    if (existingActivity) {
      const { error: updateActivityError } = await supabaseServer
        .from("daily_activities")
        .update(activityData)
        .eq("id", existingActivity.id);
      if (updateActivityError) {
        return NextResponse.json({ error: updateActivityError.message }, { status: 500 });
      }
    } else {
      const { error: insertActivityError } = await supabaseServer
        .from("daily_activities")
        .insert([activityData]);
      if (insertActivityError) {
        return NextResponse.json({ error: insertActivityError.message }, { status: 500 });
      }
    }

    // 4. Инициализируем уровень пользователя если его нет
    const { data: userLevel, error: levelError } = await supabaseServer
      .from("user_levels")
      .select("*")
      .eq("user_id", user_id)
      .single();

    if (levelError && levelError.code === 'PGRST116') {
      // Пользователя нет в системе уровней, создаем
      const { error: initError } = await supabaseServer
        .from("user_levels")
        .insert([{
          user_id,
          current_level: '🌱 Новичок',
          level_code: 'novice',
          current_sc_balance: 0,
          total_sc_earned: 0,
          total_sc_spent: 0
        }]);
      if (initError) {
        return NextResponse.json({ error: initError.message }, { status: 500 });
      }
    }

    // 5. Получаем обновленные данные пользователя
    const { data: updatedUserLevel, error: getUpdatedError } = await supabaseServer
      .from("user_levels")
      .select("*")
      .eq("user_id", user_id)
      .single();

    if (getUpdatedError) {
      return NextResponse.json({ error: getUpdatedError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      scEarned: 3,
      currentBalance: updatedUserLevel.current_sc_balance,
      level: updatedUserLevel.current_level,
      levelCode: updatedUserLevel.level_code
    });
  } catch (e) {
    return NextResponse.json({ error: "Ошибка чек-ина" }, { status: 500 });
  }
} 