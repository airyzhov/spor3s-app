import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../supabaseServerClient";
import { creditSC } from "../../../lib/referral";

const CHECKIN_SC = 3; // 3 SC за ежедневный чек-ин

function todayRange() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  return { today, tomorrow };
}

// GET ?user_id= — сделан ли чек-ин сегодня
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const user_id = url.searchParams.get("user_id");
    if (!user_id) {
      return NextResponse.json({ error: "user_id required" }, { status: 400 });
    }
    const { today, tomorrow } = todayRange();
    const { data } = await supabaseServer
      .from("daily_checkins")
      .select("id")
      .eq("user_id", user_id)
      .gte("date", today.toISOString())
      .lt("date", tomorrow.toISOString())
      .limit(1);
    return NextResponse.json({ success: true, doneToday: !!(data && data.length) });
  } catch (e) {
    return NextResponse.json({ error: "Ошибка проверки чек-ина" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user_id, order_id } = await req.json();
    if (!user_id || !order_id) {
      return NextResponse.json({ error: "user_id и order_id обязательны" }, { status: 400 });
    }
    const { today, tomorrow } = todayRange();

    // 0. Чек-ин уже был сегодня? (по пользователю, независимо от заказа)
    const { data: existingCheckins } = await supabaseServer
      .from("daily_checkins")
      .select("id")
      .eq("user_id", user_id)
      .gte("date", today.toISOString())
      .lt("date", tomorrow.toISOString());
    if (existingCheckins && existingCheckins.length > 0) {
      return NextResponse.json({ error: "Чек-ин на сегодня уже сделан!" }, { status: 400 });
    }

    // 1. Записываем чек-ин
    const { error: checkinError } = await supabaseServer.from("daily_checkins").insert([
      { user_id, order_id, date: new Date().toISOString() }
    ]);
    if (checkinError) {
      return NextResponse.json({ error: checkinError.message }, { status: 500 });
    }

    // 2. Если у заказа нет start_date — ставим (первый день приёма)
    const { data: order } = await supabaseServer
      .from("orders")
      .select("start_date")
      .eq("id", order_id)
      .single();
    if (order && !order.start_date) {
      await supabaseServer
        .from("orders")
        .update({ start_date: new Date().toISOString() })
        .eq("id", order_id);
    }

    // 3. Дневник активности
    const todayStr = today.toISOString().split("T")[0];
    const { data: existingActivity } = await supabaseServer
      .from("daily_activities")
      .select("id")
      .eq("user_id", user_id)
      .eq("date", todayStr)
      .single();
    const activityData = { user_id, date: todayStr, daily_checkin: true, sc_earned: CHECKIN_SC };
    if (existingActivity) {
      await supabaseServer.from("daily_activities").update(activityData).eq("id", existingActivity.id);
    } else {
      await supabaseServer.from("daily_activities").insert([activityData]);
    }

    // 4. Начисляем SC в единый леджер (sc_transactions + user_levels, пересчёт уровня внутри)
    await creditSC({
      userId: user_id,
      amount: CHECKIN_SC,
      sourceType: "daily_checkin",
      sourceId: order_id,
      description: `Ежедневный чек-ин ${todayStr}`,
    });

    // 5. Актуальный баланс/уровень в ответ
    const { data: updatedUserLevel } = await supabaseServer
      .from("user_levels")
      .select("current_sc_balance, current_level, level_code")
      .eq("user_id", user_id)
      .single();

    return NextResponse.json({
      success: true,
      scEarned: CHECKIN_SC,
      currentBalance: updatedUserLevel?.current_sc_balance ?? null,
      level: updatedUserLevel?.current_level ?? null,
      levelCode: updatedUserLevel?.level_code ?? null,
    });
  } catch (e) {
    return NextResponse.json({ error: "Ошибка чек-ина" }, { status: 500 });
  }
}
