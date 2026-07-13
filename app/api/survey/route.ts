import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../supabaseServerClient";
import { creditSC } from "../../../lib/referral";

const SC_AMOUNT = 25;
const MONTH_LIMIT = 100; // максимум SC за опросы в месяц (анти-фарм при догоне недель)
const WEEK_MS = 7 * 24 * 3600 * 1000;

// Номер недели каждой анкеты: из data.week; для старых записей без него — по порядку.
function surveysWithWeeks(rows: any[]): { row: any; week: number }[] {
  const used = new Set<number>();
  return (rows || []).map((row, i) => {
    let week = Number(row?.data?.week);
    if (!week || used.has(week)) {
      week = 1;
      while (used.has(week)) week++;
    }
    used.add(week);
    return { row, week };
  });
}

// GET ?user_id= — история еженедельных самооценок с номерами недель
export async function GET(req: NextRequest) {
  try {
    const user_id = new URL(req.url).searchParams.get("user_id");
    if (!user_id) {
      return NextResponse.json({ error: "user_id required" }, { status: 400 });
    }
    const { data, error } = await supabaseServer
      .from("surveys")
      .select("id, created_at, memory, sleep, energy, stress, note, data")
      .eq("user_id", user_id)
      .order("created_at", { ascending: true })
      .limit(100);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const surveys = surveysWithWeeks(data || [])
      .map(({ row, week }) => ({ ...row, week }))
      .sort((a, b) => a.week - b.week);
    return NextResponse.json({ success: true, surveys });
  } catch (e) {
    return NextResponse.json({ error: "Ошибка получения анкет" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // order_id отбрасываем — в таблице surveys такой колонки нет
    const { user_id, order_id: _ignoredOrderId, ...surveyFields } = body;
    if (!user_id) {
      return NextResponse.json({ error: "user_id required" }, { status: 400 });
    }
    const now = new Date();

    // 1. Активный курс — если есть, недели привязаны к дате старта
    const { data: courses } = await supabaseServer
      .from("user_courses")
      .select("start_date")
      .eq("user_id", user_id)
      .eq("status", "active")
      .limit(1);
    const courseStart = courses?.[0]?.start_date ? new Date(courses[0].start_date) : null;

    // 2. Занятые недели → целевая = первая незаполненная (позволяет досдать пропущенные)
    const { data: existing, error: existingError } = await supabaseServer
      .from("surveys")
      .select("id, created_at, data")
      .eq("user_id", user_id)
      .order("created_at", { ascending: true });
    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }
    const filled = new Set(surveysWithWeeks(existing || []).map(s => s.week));
    let targetWeek = 1;
    while (filled.has(targetWeek)) targetWeek++;

    if (courseStart) {
      // Нельзя заполнять недели, которые ещё не наступили
      const currentCourseWeek = Math.floor((now.getTime() - courseStart.getTime()) / WEEK_MS) + 1;
      if (targetWeek > currentCourseWeek) {
        const opens = new Date(courseStart.getTime() + (targetWeek - 1) * WEEK_MS);
        return NextResponse.json(
          { error: `Все недели курса заполнены! Неделя ${targetWeek} откроется ${opens.toLocaleDateString("ru-RU")}` },
          { status: 400 }
        );
      }
    } else {
      // Без курса — как раньше: не чаще одного опроса в календарную неделю
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart.getTime() + WEEK_MS);
      const inThisWeek = (existing || []).some(s => {
        const c = new Date(s.created_at);
        return c >= weekStart && c < weekEnd;
      });
      if (inThisWeek) {
        return NextResponse.json({ error: "Опрос уже пройден на этой неделе" }, { status: 400 });
      }
    }

    // 3. Месячный лимит SC: анкету сохраняем всегда, но сверх лимита SC не начисляем
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const { data: txs } = await supabaseServer
      .from("sc_transactions")
      .select("amount")
      .eq("user_id", user_id)
      .eq("source_type", "survey")
      .gte("created_at", monthStart.toISOString());
    const monthTotal = (txs || []).reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const scEarned = monthTotal + SC_AMOUNT <= MONTH_LIMIT ? SC_AMOUNT : 0;

    // 4. Сохраняем анкету с номером недели в data
    const { data: survey, error: surveyError } = await supabaseServer
      .from("surveys")
      .insert([{
        user_id,
        ...surveyFields,
        data: { week: targetWeek },
        created_at: now.toISOString(),
      }])
      .select()
      .single();
    if (surveyError) {
      return NextResponse.json({ error: surveyError.message }, { status: 500 });
    }

    // 5. Дневник активности (не блокирует догон пропущенных недель)
    const todayStr = now.toISOString().split("T")[0];
    const { data: activity } = await supabaseServer
      .from("daily_activities")
      .select("id")
      .eq("user_id", user_id)
      .eq("date", todayStr)
      .single();
    const activityData = { user_id, date: todayStr, weekly_survey: true, sc_earned: scEarned };
    if (activity) {
      await supabaseServer.from("daily_activities").update(activityData).eq("id", activity.id);
    } else {
      await supabaseServer.from("daily_activities").insert([activityData]);
    }

    // 6. Начисляем SC (единый леджер, пересчёт уровня внутри)
    if (scEarned > 0) {
      await creditSC({
        userId: user_id,
        amount: scEarned,
        sourceType: "survey",
        sourceId: survey.id,
        description: `Еженедельная самооценка — неделя ${targetWeek}`,
      });
    }

    // 7. Актуальный баланс в ответ
    const { data: level } = await supabaseServer
      .from("user_levels")
      .select("current_sc_balance, current_level, level_code")
      .eq("user_id", user_id)
      .single();

    return NextResponse.json({
      success: true,
      survey,
      week: targetWeek,
      scEarned,
      scLimitReached: scEarned === 0,
      currentBalance: level?.current_sc_balance ?? null,
      level: level?.current_level ?? null,
      levelCode: level?.level_code ?? null,
    });
  } catch (e) {
    return NextResponse.json({ error: "Ошибка сохранения анкеты" }, { status: 500 });
  }
}
