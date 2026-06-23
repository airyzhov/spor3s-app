import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../supabaseServerClient";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, order_id, ...surveyFields } = body;
    if (!user_id) {
      return NextResponse.json({ error: "user_id required" }, { status: 400 });
    }

    // 1. Проверка: не проходил ли уже на этой неделе
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // начало недели (всегда воскресенье)
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    const { data: existing, error: existingError } = await supabaseServer
      .from("surveys")
      .select("id")
      .eq("user_id", user_id)
      .gte("created_at", weekStart.toISOString())
      .lt("created_at", weekEnd.toISOString());
    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }
    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "Опрос уже пройден на этой неделе" }, { status: 400 });
    }

    // 2. Проверка месячного лимита SC (100 SC за опросы)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const { data: txs, error: txsError } = await supabaseServer
      .from("sc_transactions")
      .select("amount, transaction_type, created_at")
      .eq("user_id", user_id)
      .eq("source_type", "survey")
      .gte("created_at", monthStart.toISOString());
    if (txsError) {
      return NextResponse.json({ error: txsError.message }, { status: 500 });
    }
    const monthTotal = (txs || []).reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const SC_AMOUNT = 25;
    const MONTH_LIMIT = 100;
    if (monthTotal + SC_AMOUNT > MONTH_LIMIT) {
      return NextResponse.json({ error: "Лимит SC за опросы в этом месяце достигнут" }, { status: 400 });
    }

    // 3. Сохраняем анкету
    const { data: survey, error: surveyError } = await supabaseServer
      .from("surveys")
      .insert([{ user_id, order_id, ...surveyFields, created_at: new Date().toISOString() }])
      .select()
      .single();
    if (surveyError) {
      return NextResponse.json({ error: surveyError.message }, { status: 500 });
    }

    // 4. Обновляем ежедневную активность в новой системе
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const { data: existingActivity, error: activityError } = await supabaseServer
      .from("daily_activities")
      .select("id, weekly_survey")
      .eq("user_id", user_id)
      .eq("date", todayStr)
      .single();

    if (activityError && activityError.code !== 'PGRST116') {
      return NextResponse.json({ error: activityError.message }, { status: 500 });
    }

    if (existingActivity && existingActivity.weekly_survey) {
      return NextResponse.json({ error: "Опрос на этой неделе уже пройден!" }, { status: 400 });
    }

    // Создаем или обновляем запись активности
    const activityData = {
      user_id,
      date: todayStr,
      weekly_survey: true,
      sc_earned: 25 // 25 SC за еженедельную самооценку
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

    // 5. Инициализируем уровень пользователя если его нет
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

    // 6. Получаем обновленные данные пользователя
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
      survey,
      scEarned: 25,
      currentBalance: updatedUserLevel.current_sc_balance,
      level: updatedUserLevel.current_level,
      levelCode: updatedUserLevel.level_code
    });
  } catch (e) {
    return NextResponse.json({ error: "Ошибка сохранения анкеты" }, { status: 500 });
  }
} 