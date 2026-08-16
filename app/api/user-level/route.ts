import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../supabaseServerClient";
import { getLevelInfo, calculateMonthlySC } from "../../../lib/levelUtils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get('user_id');
    
    if (!user_id) {
      return NextResponse.json({ error: "user_id required" }, { status: 400 });
    }

    // 1. Получаем информацию о пользователе
    const { data: user, error: userError } = await supabaseServer
      .from("users")
      .select("id, name, telegram_id")
      .eq("id", user_id)
      .single();

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    // 2. Получаем уровень пользователя
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

      // Получаем созданную запись
      const { data: newUserLevel, error: getNewError } = await supabaseServer
        .from("user_levels")
        .select("*")
        .eq("user_id", user_id)
        .single();

      if (getNewError) {
        return NextResponse.json({ error: getNewError.message }, { status: 500 });
      }

      return NextResponse.json({
        user,
        level: newUserLevel,
        levelInfo: getLevelInfo(newUserLevel.total_sc_earned, newUserLevel.total_orders_amount, newUserLevel.orders_count),
        monthlySC: calculateMonthlySC(30)
      });
    } else if (levelError) {
      return NextResponse.json({ error: levelError.message }, { status: 500 });
    }

    // 3. Получаем статистику активностей
    const { data: activities, error: activitiesError } = await supabaseServer
      .from("daily_activities")
      .select("daily_checkin, weekly_survey, motivational_habit, date")
      .eq("user_id", user_id)
      .order("date", { ascending: false })
      .limit(30);

    if (activitiesError) {
      return NextResponse.json({ error: activitiesError.message }, { status: 500 });
    }

    // 4. Получаем историю транзакций SC
    const { data: transactions, error: transactionsError } = await supabaseServer
      .from("sc_transactions")
      .select("amount, transaction_type, source_type, description, created_at")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (transactionsError) {
      return NextResponse.json({ error: transactionsError.message }, { status: 500 });
    }

    // 5. Получаем информацию о заказах
    const { data: orders, error: ordersError } = await supabaseServer
      .from("orders")
      .select("id, total, status, created_at")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (ordersError) {
      return NextResponse.json({ error: ordersError.message }, { status: 500 });
    }

    // 6. Рассчитываем статистику
    const totalOrdersAmount = (orders || []).reduce((sum, order) => sum + (order.total || 0), 0);
    const surveyWeeks = (activities || []).filter(a => a.weekly_survey).length;
    const habitDays = (activities || []).filter(a => a.motivational_habit).length;

    // 7. Обновляем информацию о заказах в уровне пользователя
    if (userLevel.total_orders_amount !== totalOrdersAmount || userLevel.orders_count !== orders.length) {
      const { error: updateError } = await supabaseServer
        .from("user_levels")
        .update({
          total_orders_amount: totalOrdersAmount,
          orders_count: orders.length,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", user_id);

      if (updateError) {
        console.error("Error updating user level:", updateError);
      }
    }

    // 8. Получаем обновленную информацию об уровне
    const { data: updatedUserLevel, error: getUpdatedError } = await supabaseServer
      .from("user_levels")
      .select("*")
      .eq("user_id", user_id)
      .single();

    if (getUpdatedError) {
      return NextResponse.json({ error: getUpdatedError.message }, { status: 500 });
    }

    return NextResponse.json({
      user,
      level: updatedUserLevel,
      levelInfo: getLevelInfo(updatedUserLevel.total_sc_earned, updatedUserLevel.total_orders_amount, updatedUserLevel.orders_count),
      activities: {
        total: activities?.length || 0,
        surveyWeeks,
        habitDays
      },
      transactions: transactions || [],
      orders: orders || [],
      statistics: {
        totalOrdersAmount,
        ordersCount: orders.length,
        monthlySC: calculateMonthlySC(surveyWeeks)
      }
    });
  } catch (e) {
    return NextResponse.json({ error: "Ошибка получения информации о пользователе" }, { status: 500 });
  }
} 