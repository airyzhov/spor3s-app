import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../supabaseServerClient";
import { creditSC } from "../../../lib/referral";

const BONUS_AMOUNT = 30; // 30 SC за каждое задание
const CHANNELS: Record<string, string> = {
  telegram: "Telegram канал",
  youtube: "YouTube канал",
  instagram: "Instagram",
};

// Уже получал бонус? Смотрим и новый леджер (sc_transactions), и легаси (coin_transactions).
async function alreadyReceived(user_id: string, channel_type: string): Promise<boolean> {
  const { data: sc } = await supabaseServer
    .from("sc_transactions")
    .select("id")
    .eq("user_id", user_id)
    .eq("source_type", `subscribe_${channel_type}`)
    .limit(1);
  if (sc && sc.length) return true;

  const { data: legacy } = await supabaseServer
    .from("coin_transactions")
    .select("id")
    .eq("user_id", user_id)
    .eq("type", `subscribe_${channel_type}`)
    .limit(1);
  return !!(legacy && legacy.length);
}

export async function POST(req: NextRequest) {
  try {
    const { user_id, channel_type } = await req.json();

    if (!user_id || !channel_type) {
      return NextResponse.json({ error: "Необходимы user_id и channel_type" }, { status: 400 });
    }
    if (!CHANNELS[channel_type]) {
      return NextResponse.json({ error: "Неверный тип канала" }, { status: 400 });
    }

    if (await alreadyReceived(user_id, channel_type)) {
      return NextResponse.json(
        { error: `Бонус за ${CHANNELS[channel_type]} уже получен!` },
        { status: 400 }
      );
    }

    // Начисляем в единый леджер (sc_transactions + user_levels.current_sc_balance)
    await creditSC({
      userId: user_id,
      amount: BONUS_AMOUNT,
      sourceType: `subscribe_${channel_type}`,
      description: `Бонус за задание: ${CHANNELS[channel_type]}`,
    });

    return NextResponse.json({
      success: true,
      bonus: BONUS_AMOUNT,
      message: `+${BONUS_AMOUNT} SC за ${CHANNELS[channel_type]}!`,
    });
  } catch (e) {
    console.error("Subscribe bonus error:", e);
    return NextResponse.json({ error: "Ошибка начисления бонуса" }, { status: 500 });
  }
}
