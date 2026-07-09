import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../supabaseServerClient";

// История заказов пользователя для личного кабинета.
// Не отдаём ФИО/телефон/адрес — для отображения статусов они не нужны.
export async function GET(req: NextRequest) {
  try {
    const user_id = new URL(req.url).searchParams.get("user_id");
    if (!user_id) {
      return NextResponse.json({ error: "Необходим user_id" }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from("orders")
      .select("id, created_at, items, total, status, tracking_number, spores_coin")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, orders: data || [] });
  } catch (e) {
    console.error("[my-orders] error:", e);
    return NextResponse.json({ error: "Ошибка получения заказов" }, { status: 500 });
  }
}
