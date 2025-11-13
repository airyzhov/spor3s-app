import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../supabaseServerClient";

export async function POST(req: NextRequest) {
  try {
    const { user_id, course_duration } = await req.json();
    
    if (!user_id || !course_duration) {
      return NextResponse.json({ error: "Необходимы user_id и course_duration" }, { status: 400 });
    }

    if (!['1', '3', '6'].includes(course_duration)) {
      return NextResponse.json({ error: "Неверная длительность курса. Допустимые значения: 1, 3, 6" }, { status: 400 });
    }

    // Проверяем, есть ли активный заказ у пользователя
    const { data: activeOrder, error: orderError } = await supabaseServer
      .from("orders")
      .select("id, total")
      .eq("user_id", user_id)
      .eq("status", "active")
      .single();

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

    if (insertError) {
      return NextResponse.json({ error: "Ошибка создания курса: " + insertError.message }, { status: 500 });
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