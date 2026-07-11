import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../supabaseServerClient";

// GET ?user_id= — активный курс пользователя (для восстановления состояния в UI)
export async function GET(req: NextRequest) {
  try {
    const user_id = new URL(req.url).searchParams.get("user_id");
    if (!user_id) {
      return NextResponse.json({ error: "user_id required" }, { status: 400 });
    }
    const { data } = await supabaseServer
      .from("user_courses")
      .select("id, course_duration, start_date, status")
      .eq("user_id", user_id)
      .eq("status", "active")
      .limit(1);
    return NextResponse.json({ success: true, course: data?.[0] || null });
  } catch (e) {
    return NextResponse.json({ error: "Ошибка получения курса" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user_id, course_duration } = await req.json();
    
    if (!user_id || !course_duration) {
      return NextResponse.json({ error: "Необходимы user_id и course_duration" }, { status: 400 });
    }

    if (!['1', '3', '6'].includes(course_duration)) {
      return NextResponse.json({ error: "Неверная длительность курса. Допустимые значения: 1, 3, 6" }, { status: 400 });
    }

    // Курс доступен при наличии оплаченного заказа (статуса "active" в системе не существует)
    const { data: paidOrders, error: orderError } = await supabaseServer
      .from("orders")
      .select("id, total, status")
      .eq("user_id", user_id)
      .in("status", ["paid", "shipped", "completed"])
      .order("created_at", { ascending: false })
      .limit(1);
    const activeOrder = paidOrders?.[0];

    if (orderError || !activeOrder) {
      return NextResponse.json({ 
        error: "Для начала отслеживания курса необходимо оформить заказ",
        requiresOrder: true 
      }, { status: 400 });
    }

    // Проверяем, не начал ли пользователь уже курс
    const { data: existingCourse, error: courseCheckError } = await supabaseServer
      .from("user_courses")
      .select("id")
      .eq("user_id", user_id)
      .eq("status", "active")
      .single();

    if (existingCourse) {
      return NextResponse.json({ 
        error: "Курс уже начат",
        courseStarted: true 
      }, { status: 400 });
    }

    // Создаем запись о начале курса
    const { data: newCourse, error: insertError } = await supabaseServer
      .from("user_courses")
      .insert([{
        user_id,
        course_duration: parseInt(course_duration),
        start_date: new Date().toISOString(),
        status: "active",
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (insertError || !newCourse) {
      return NextResponse.json(
        { error: "Ошибка создания курса: " + (insertError?.message || "таблица user_courses недоступна") },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      course: newCourse,
      message: `Курс на ${course_duration} месяц(ев) успешно начат!`
    });

  } catch (e) {
    console.error('Start course error:', e);
    return NextResponse.json({ error: "Ошибка начала курса" }, { status: 500 });
  }
} 