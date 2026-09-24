import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../supabaseServerClient";
import { getLevelInfo, nextLevelNeeds } from "../../../lib/levelUtils";
import { getMonthGoal } from "../../../lib/monthGoalServer";
import { computeMonthGoal } from "../../../lib/monthGoal";

// Панель SC в кабинете (ScStatus): один запрос вместо пяти (уровень, рефералы, статусы трёх заданий).
const TASK_CHANNELS = ["telegram", "youtube", "instagram"];
const TASK_BONUS = 30;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function emptySummary() {
  const level = getLevelInfo(0, 0, 0);
  return {
    success: true,
    sc: 0,
    totalEarned: 0,
    level: {
      code: level.levelCode,
      name: level.levelName,
      icon: level.levelIcon,
      progress: level.progress,
      scToNext: level.scToNext,
      nextName: level.nextLevelName,
      needs: nextLevelNeeds(0, 0, 0),
    },
    friends: 0,
    referralEarned: 0,
    referralCode: null as string | null,
    telegramId: null as string | null,
    tasks: { done: 0, total: TASK_CHANNELS.length, left: TASK_CHANNELS.length, bonusPerTask: TASK_BONUS },
    monthGoal: computeMonthGoal(0, false),
  };
}

export async function GET(req: NextRequest) {
  try {
    const user_id = new URL(req.url).searchParams.get("user_id");
    if (!user_id) {
      return NextResponse.json({ error: "user_id required" }, { status: 400 });
    }
    // Гость/фоллбек-пользователь: игровых данных нет, в БД не ходим.
    if (!UUID_RE.test(user_id)) {
      return NextResponse.json(emptySummary());
    }

    // Подписочные бонусы лежат в двух леджерах: новом sc_transactions и легаси coin_transactions
    // (та же двойная проверка, что в app/api/check-subscription-status/route.ts).
    const subscribeTypes = TASK_CHANNELS.map(c => `subscribe_${c}`);

    const [levelRes, refRes, txRes, legacyRes, userRes, monthGoal] = await Promise.all([
      supabaseServer
        .from("user_levels")
        .select("current_sc_balance, total_sc_earned, total_orders_amount, orders_count")
        .eq("user_id", user_id)
        .maybeSingle(),
      supabaseServer.from("referrals").select("id").eq("referrer_user_id", user_id),
      supabaseServer
        .from("sc_transactions")
        .select("amount, source_type")
        .eq("user_id", user_id)
        .in("source_type", [...subscribeTypes, "referral_cashback"]),
      supabaseServer
        .from("coin_transactions")
        .select("type")
        .eq("user_id", user_id)
        .in("type", subscribeTypes),
      supabaseServer.from("users").select("username, phone, telegram_id").eq("id", user_id).maybeSingle(),
      getMonthGoal(user_id),
    ]);

    if (levelRes.error) console.error("home-summary error: user_levels query failed for user", user_id, ":", levelRes.error);
    if (refRes.error) console.error("home-summary error: referrals query failed for user", user_id, ":", refRes.error);
    if (txRes.error) console.error("home-summary error: sc_transactions query failed for user", user_id, ":", txRes.error);
    if (legacyRes.error) console.error("home-summary error: coin_transactions query failed for user", user_id, ":", legacyRes.error);
    if (userRes.error) console.error("home-summary error: users query failed for user", user_id, ":", userRes.error);

    const lvl = levelRes.data || { current_sc_balance: 0, total_sc_earned: 0, total_orders_amount: 0, orders_count: 0 };
    const txs = txRes.data || [];
    const legacy = legacyRes.data || [];

    const doneChannels = new Set<string>();
    txs.forEach(t => {
      if (t.source_type?.startsWith("subscribe_")) doneChannels.add(t.source_type.replace("subscribe_", ""));
    });
    legacy.forEach(t => {
      if (t.type?.startsWith("subscribe_")) doneChannels.add(t.type.replace("subscribe_", ""));
    });
    const done = TASK_CHANNELS.filter(c => doneChannels.has(c)).length;

    const referralEarned = txs
      .filter(t => t.source_type === "referral_cashback")
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const level = getLevelInfo(lvl.total_sc_earned || 0, lvl.total_orders_amount || 0, lvl.orders_count || 0);
    const user = userRes.data;
    const referralCode = user ? (user.username ? "@" + user.username : (user.phone || user.telegram_id)) : null;
    // Для ссылки-приглашения нужен числовой Telegram ID (см. lib/referralLink.ts)
    const telegramId = user && /^\d+$/.test(String(user.telegram_id || "")) ? String(user.telegram_id) : null;

    return NextResponse.json({
      success: true,
      sc: lvl.current_sc_balance || 0,
      totalEarned: lvl.total_sc_earned || 0,
      level: {
        code: level.levelCode,
        name: level.levelName,
        icon: level.levelIcon,
        progress: level.progress,
        scToNext: level.scToNext,
        nextName: level.nextLevelName,
        needs: nextLevelNeeds(lvl.total_sc_earned || 0, lvl.total_orders_amount || 0, lvl.orders_count || 0),
      },
      friends: (refRes.data || []).length,
      referralEarned,
      referralCode,
      telegramId,
      tasks: { done, total: TASK_CHANNELS.length, left: TASK_CHANNELS.length - done, bonusPerTask: TASK_BONUS },
      monthGoal,
    });
  } catch (e) {
    console.error("home-summary error:", e);
    // Витрина не должна ронять главный экран — отдаём нули.
    return NextResponse.json(emptySummary());
  }
}
