import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../supabaseServerClient";

// GET - Get user's current habit status and available habits
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get('user_id');
    
    if (!user_id) {
      return NextResponse.json({ error: "user_id required" }, { status: 400 });
    }

    // 1. Check user level access
    const { data: userLevel, error: levelError } = await supabaseServer
      .from("user_levels")
      .select("has_motivational_habit, level_code, current_level")
      .eq("user_id", user_id)
      .single();

    if (levelError) {
      return NextResponse.json({ error: levelError.message }, { status: 500 });
    }

    // 2. Get current active habit
    const { data: currentHabit, error: habitError } = await supabaseServer
      .from("user_habits")
      .select("*")
      .eq("user_id", user_id)
      .eq("is_active", true)
      .single();

    // 3. Get weekly reports for current habit
    let weeklyReports = [];
    if (currentHabit) {
      const { data: reports, error: reportsError } = await supabaseServer
        .from("weekly_habit_reports")
        .select("*")
        .eq("habit_id", currentHabit.id)
        .order("week_number", { ascending: true });

      if (!reportsError) {
        weeklyReports = reports || [];
      }
    }

    // 4. Get predefined habits for selection
    const { data: predefinedHabits, error: predefinedError } = await supabaseServer
      .from("predefined_habits")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    // 5. Calculate habit progress
    let habitProgress = null;
    if (currentHabit) {
      const completedWeeks = weeklyReports.filter(r => r.is_completed).length;
      const remainingWeeks = 4 - currentHabit.current_week;
      const isMonthComplete = completedWeeks >= 4;
      
      habitProgress = {
        currentWeek: currentHabit.current_week,
        completedWeeks,
        remainingWeeks,
        isMonthComplete,
        progressPercentage: (completedWeeks / 4) * 100
      };
    }

    return NextResponse.json({
      hasAccess: userLevel.has_motivational_habit,
      currentLevel: userLevel.current_level,
      levelCode: userLevel.level_code,
      currentHabit,
      weeklyReports,
      habitProgress,
      predefinedHabits: predefinedHabits || [],
      canSelectNewHabit: !currentHabit || (currentHabit && habitProgress?.isMonthComplete)
    });
  } catch (e) {
    console.error('Get motivational habit error:', e);
    return NextResponse.json({ error: "Ошибка получения информации о привычках" }, { status: 500 });
  }
}

// POST - Create new habit or submit weekly report
export async function POST(req: NextRequest) {
  try {
    const { user_id, action, ...data } = await req.json();
    
    if (!user_id) {
      return NextResponse.json({ error: "user_id required" }, { status: 400 });
    }

    // 1. Check user level access
    const { data: userLevel, error: levelError } = await supabaseServer
      .from("user_levels")
      .select("has_motivational_habit")
      .eq("user_id", user_id)
      .single();

    if (levelError) {
      return NextResponse.json({ error: levelError.message }, { status: 500 });
    }

    if (!userLevel.has_motivational_habit) {
      return NextResponse.json({ 
        error: "Мотивационная привычка доступна с уровня '🌿 Собиратель' (100 SC + ≥1 заказ)" 
      }, { status: 403 });
    }

    if (action === 'create_habit') {
      return await createNewHabit(user_id, data);
    } else if (action === 'submit_report') {
      return await submitWeeklyReport(user_id, data);
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (e) {
    console.error('Post motivational habit error:', e);
    return NextResponse.json({ error: "Ошибка обработки запроса" }, { status: 500 });
  }
}

// Create new habit
async function createNewHabit(user_id: string, data: any) {
  const { habit_name, habit_type, description } = data;
  
  if (!habit_name) {
    return NextResponse.json({ error: "Название привычки обязательно" }, { status: 400 });
  }

  // Check if user already has an active habit
  const { data: existingHabit, error: checkError } = await supabaseServer
    .from("user_habits")
    .select("id")
    .eq("user_id", user_id)
    .eq("is_active", true)
    .single();

  if (existingHabit) {
    return NextResponse.json({ error: "У вас уже есть активная привычка" }, { status: 400 });
  }

  // Create new habit
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(startDate.getDate() + 28); // 4 weeks

  const { data: newHabit, error: createError } = await supabaseServer
    .from("user_habits")
    .insert([{
      user_id,
      habit_name,
      habit_type,
      description,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      current_week: 1,
      is_active: true,
      total_completed_weeks: 0
    }])
    .select()
    .single();

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    habit: newHabit,
    message: `Привычка "${habit_name}" создана! Начинайте отслеживать свой прогресс.`
  });
}

// Submit weekly report
async function submitWeeklyReport(user_id: string, data: any) {
  const { habit_id, week_number, is_completed, completion_reason, photo_url, feedback_text } = data;
  
  if (!habit_id || !week_number) {
    return NextResponse.json({ error: "habit_id и week_number обязательны" }, { status: 400 });
  }

  // Check if habit exists and belongs to user
  const { data: habit, error: habitError } = await supabaseServer
    .from("user_habits")
    .select("*")
    .eq("id", habit_id)
    .eq("user_id", user_id)
    .eq("is_active", true)
    .single();

  if (habitError || !habit) {
    return NextResponse.json({ error: "Привычка не найдена" }, { status: 404 });
  }

  // Check if report already exists for this week
  const { data: existingReport, error: reportError } = await supabaseServer
    .from("weekly_habit_reports")
    .select("id, sc_earned")
    .eq("habit_id", habit_id)
    .eq("week_number", week_number)
    .single();

  // Calculate SC earned
  let scEarned = 0;
  if (is_completed) {
    scEarned = 25;
  } else if (completion_reason && completion_reason.trim()) {
    scEarned = 5;
  }

  // Insert or update weekly report
  const reportData = {
    user_id,
    habit_id,
    week_number,
    report_date: new Date().toISOString().split('T')[0],
    is_completed,
    completion_reason,
    photo_url,
    feedback_text,
    sc_earned: scEarned,
    report_submitted_at: new Date().toISOString()
  };

  let upsertError;
  if (existingReport) {
    // Update existing report
    const { error } = await supabaseServer
      .from("weekly_habit_reports")
      .update(reportData)
      .eq("id", existingReport.id);
    upsertError = error;
  } else {
    // Create new report
    const { error } = await supabaseServer
      .from("weekly_habit_reports")
      .insert([reportData]);
    upsertError = error;
  }

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  // Add SC transaction if earned
  if (scEarned > 0) {
    const { error: txError } = await supabaseServer
      .from("coin_transactions")
      .insert([{
        user_id,
        amount: scEarned,
        type: "habit_completion",
        description: `Мотивационная привычка - неделя ${week_number}`
      }]);

    if (txError) {
      console.error("Error creating SC transaction:", txError);
    }
  }

  // Update habit progress
  const { data: updatedReports, error: countError } = await supabaseServer
    .from("weekly_habit_reports")
    .select("is_completed")
    .eq("habit_id", habit_id)
    .eq("is_completed", true);

  const completedWeeks = updatedReports?.length || 0;

  const { error: updateError } = await supabaseServer
    .from("user_habits")
    .update({
      current_week: Math.max(habit.current_week, week_number),
      total_completed_weeks: completedWeeks,
      updated_at: new Date().toISOString()
    })
    .eq("id", habit_id);

  if (updateError) {
    console.error("Error updating habit progress:", updateError);
  }

  // Check if month is complete
  const isMonthComplete = completedWeeks >= 4;
  let monthCompletionMessage = "";
  
  if (isMonthComplete) {
    // Add bonus SC for completing all 4 weeks
    const { error: bonusError } = await supabaseServer
      .from("coin_transactions")
      .insert([{
        user_id,
        amount: 20,
        type: "habit_monthly_bonus",
        description: "Бонус за полное выполнение месяца мотивационной привычки"
      }]);

    if (!bonusError) {
      monthCompletionMessage = "🎉 Поздравляем! Вы завершили месяц мотивационной привычки. +20 SC бонус!";
    }
  }

  return NextResponse.json({
    success: true,
    scEarned: scEarned,
    isMonthComplete,
    monthCompletionMessage,
    message: is_completed 
      ? `Отлично! Привычка выполнена. +${scEarned} SC`
      : completion_reason 
        ? `Спасибо за объяснение. +${scEarned} SC`
        : "Отчет сохранен"
  });
} 