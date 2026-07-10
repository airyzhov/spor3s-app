import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../supabaseServerClient";

const CHANNELS = ["telegram", "youtube", "instagram"];

export async function POST(req: NextRequest) {
  try {
    const { user_id, channel_type } = await req.json();

    if (!user_id || !channel_type) {
      return NextResponse.json({ error: "Необходимы user_id и channel_type" }, { status: 400 });
    }
    if (!CHANNELS.includes(channel_type)) {
      return NextResponse.json({ error: "Неверный тип канала" }, { status: 400 });
    }
    // Фоллбек-пользователи (не UUID) бонусов не имеют
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user_id)) {
      return NextResponse.json({ success: true, hasReceivedBonus: false, channel_type });
    }

    // Проверяем оба леджера: новый sc_transactions и легаси coin_transactions
    const { data: sc } = await supabaseServer
      .from("sc_transactions")
      .select("id")
      .eq("user_id", user_id)
      .eq("source_type", `subscribe_${channel_type}`)
      .limit(1);

    let hasReceivedBonus = !!(sc && sc.length);
    if (!hasReceivedBonus) {
      const { data: legacy } = await supabaseServer
        .from("coin_transactions")
        .select("id")
        .eq("user_id", user_id)
        .eq("type", `subscribe_${channel_type}`)
        .limit(1);
      hasReceivedBonus = !!(legacy && legacy.length);
    }

    return NextResponse.json({ success: true, hasReceivedBonus, channel_type });
  } catch (e) {
    console.error("Check subscription status error:", e);
    return NextResponse.json({ error: "Ошибка проверки статуса подписки" }, { status: 500 });
  }
}
