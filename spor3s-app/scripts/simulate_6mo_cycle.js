#!/usr/bin/env node
/**
 * Simulates a six-month order cadence for a single Telegram user
 * and verifies Spor3s Coin accrual/redemption directly via Supabase.
 *
 * Usage: node scripts/simulate_6mo_cycle.js
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const path = require("path");
const https = require("https");
const fetch = require("node-fetch");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env.local") });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("❌ Supabase env vars are missing. Check .env.local");
  process.exit(1);
}

const tlsAgent = new https.Agent({ rejectUnauthorized: false });
const customFetch = (url, init = {}) => fetch(url, { agent: tlsAgent, ...init });

const supabase = createClient(supabaseUrl, serviceKey, {
  global: {
    fetch: customFetch,
  },
});

const SCENARIO_USER_TAG = `tg_cycle_${Date.now()}`;
const ADDRESS = "Тестовый адрес, Москва";
const FIO = "Тестовый Клиент";
const PHONE = "+79990000000";

const monthOrders = [
  {
    label: "Месяц 1 — Ежовик порошок",
    items: [
      { id: "ezh100", name: "Ежовик 100г порошок", price: 1100, quantity: 1, type: "powder" },
    ],
    coinsToUse: 0,
  },
  {
    label: "Месяц 2 — Мухомор капсулы",
    items: [
      { id: "mhm60k", name: "Мухомор 60 капсул", price: 1400, quantity: 1, type: "capsules" },
    ],
    coinsToUse: 0,
  },
  {
    label: "Месяц 3 — Кордицепс + Цистозира",
    items: [
      { id: "kor50", name: "Кордицепс 50г", price: 800, quantity: 1, type: "powder" },
      { id: "ci30", name: "Цистозира 30г", price: 500, quantity: 1, type: "powder" },
    ],
    coinsToUse: 0,
  },
  {
    label: "Месяц 4 — Комплекс 4в1",
    items: [
      { id: "4v1", name: "Комплекс 4 в 1 (месяц)", price: 3300, quantity: 1, type: "bundle" },
    ],
    coinsToUse: 400, // пробуем частичное списание
  },
  {
    label: "Месяц 5 — Ежовик капсулы (скидка SC)",
    items: [
      { id: "ezh120k", name: "Ежовик 120 капсул", price: 1100, quantity: 1, type: "capsules" },
    ],
    coinsToUse: 600,
  },
  {
    label: "Месяц 6 — Мухомор порошок + Кордицепс",
    items: [
      { id: "mhm30", name: "Мухомор 30г шляпки", price: 900, quantity: 1, type: "powder" },
      { id: "kor150", name: "Кордицепс 150г", price: 2000, quantity: 1, type: "powder" },
    ],
    coinsToUse: 800,
  },
];

async function ensureUser(telegramId) {
  const { data: existing, error } = await supabase
    .from("users")
    .select("id")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (error) throw error;

  if (existing?.id) {
    return existing.id;
  }

  const { data, error: insertError } = await supabase
    .from("users")
    .insert([{ telegram_id: telegramId, name: FIO }])
    .select("id")
    .single();

  if (insertError) throw insertError;
  return data.id;
}

async function ensureUserLevel(userId) {
  const { data, error } = await supabase
    .from("user_levels")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (data) return data;

  const baseLevel = {
    user_id: userId,
    current_level: "🌱 Новичок",
    level_code: "novice",
    current_sc_balance: 0,
    total_sc_earned: 0,
    total_sc_spent: 0,
    total_orders_amount: 0,
    orders_count: 0,
  };

  const { data: created, error: insertError } = await supabase
    .from("user_levels")
    .insert([baseLevel])
    .select("*")
    .single();

  if (insertError) throw insertError;
  return created;
}

function calcLevelDiscount(levelCode, total) {
  if (levelCode === "master" && total >= 10000) {
    return { amount: Math.floor(total * 0.05), percent: 5 };
  }
  if (levelCode === "legend" && total >= 20000) {
    return { amount: Math.floor(total * 0.1), percent: 10 };
  }
  return { amount: 0, percent: 0 };
}

function sumItems(items) {
  return items.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);
}

async function updateUserLevelTotals(userId) {
  const { data: orders, error } = await supabase
    .from("orders")
    .select("total")
    .eq("user_id", userId);

  if (error) throw error;

  const totalOrdersAmount = (orders || []).reduce((acc, order) => acc + (order.total || 0), 0);
  const ordersCount = orders?.length || 0;

  const { error: updateError } = await supabase
    .from("user_levels")
    .update({
      total_orders_amount: totalOrdersAmount,
      orders_count: ordersCount,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (updateError) throw updateError;
}

async function recordTransaction(payload) {
  const { error } = await supabase.from("sc_transactions").insert([payload]);
  if (error) throw error;
}

async function createOrder(userId, monthIndex, spec) {
  const { data: level } = await supabase
    .from("user_levels")
    .select("*")
    .eq("user_id", userId)
    .single();

  const scBalance = level?.current_sc_balance || 0;
  const total = sumItems(spec.items);
  const { amount: levelDiscount, percent: levelDiscountPercent } = calcLevelDiscount(level?.level_code, total);
  const maxCoins = Math.floor(total * 0.3);
  const coinsToApply = Math.max(0, Math.min(spec.coinsToUse || 0, scBalance, maxCoins));
  const finalTotal = Math.max(0, total - levelDiscount - coinsToApply);

  const createdAt = new Date();
  createdAt.setMonth(createdAt.getMonth() + monthIndex);

  const { data: inserted, error: insertError } = await supabase
    .from("orders")
    .insert([
      {
        user_id: userId,
        items: spec.items,
        total: finalTotal,
        address: ADDRESS,
        fio: FIO,
        phone: PHONE,
        referral_code: null,
        comment: `${spec.label} — автотест ${createdAt.toISOString().split("T")[0]}`,
        status: "pending",
        created_at: createdAt.toISOString(),
        spores_coin: coinsToApply,
        tracking_number: null,
        start_date: null,
        coins_spent: coinsToApply,
      },
    ])
    .select("*")
    .single();

  if (insertError) throw insertError;

  if (coinsToApply > 0) {
    await recordTransaction({
      user_id: userId,
      amount: -coinsToApply,
      transaction_type: "spent",
      source_type: "order_discount",
      description: `Списание SC для заказа #${inserted.id}`,
      created_at: createdAt.toISOString(),
    });

    const { error: updateSpentError } = await supabase
      .from("user_levels")
      .update({
        current_sc_balance: scBalance - coinsToApply,
        total_sc_spent: (level?.total_sc_spent || 0) + coinsToApply,
      })
      .eq("user_id", userId);

    if (updateSpentError) throw updateSpentError;
  }

  const scEarned = Math.floor(finalTotal / 100);
  if (scEarned > 0) {
    await recordTransaction({
      user_id: userId,
      amount: scEarned,
      transaction_type: "earned",
      source_type: "order",
      description: `Начисление SC за заказ #${inserted.id}`,
      created_at: createdAt.toISOString(),
    });

    const { error: updateEarnError } = await supabase
      .from("user_levels")
      .update({
        current_sc_balance: (level?.current_sc_balance || 0) - coinsToApply + scEarned,
        total_sc_earned: (level?.total_sc_earned || 0) + scEarned,
      })
      .eq("user_id", userId);

    if (updateEarnError) throw updateEarnError;
  }

  await updateUserLevelTotals(userId);

  return {
    id: inserted.id,
    label: spec.label,
    totalBefore: total,
    levelDiscount,
    levelDiscountPercent,
    coinsSpent: coinsToApply,
    finalTotal,
    created_at: inserted.created_at,
  };
}

async function fetchSummary(userId) {
  const [{ data: orders }, { data: transactions }, { data: level }] = await Promise.all([
    supabase
      .from("orders")
      .select("id,total,spores_coin,created_at,items")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    supabase
      .from("sc_transactions")
      .select("amount,transaction_type,source_type,description,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    supabase.from("user_levels").select("*").eq("user_id", userId).single(),
  ]);

  return { orders, transactions, level };
}

async function main() {
  console.log("🧪 Запуск сценария 6-месячного цикла заказов…");
  const userId = await ensureUser(SCENARIO_USER_TAG);
  await ensureUserLevel(userId);

  const timeline = [];
  for (const [index, spec] of monthOrders.entries()) {
    const result = await createOrder(userId, index, spec);
    console.log(`  • ${spec.label} → заказ ${result.id}, итог ${result.finalTotal}₽ (SC списано: ${result.coinsSpent})`);
    timeline.push(result);
  }

  const summary = await fetchSummary(userId);

  console.log("\n📦 Заказы пользователя:");
  summary.orders.forEach((order) => {
    console.log(
      `  #${order.id} | ${order.total}₽ | SC списано: ${order.spores_coin} | ${order.created_at} | Товары: ${
        (order.items || []).map((i) => i.id).join(", ") || "-"
      }`,
    );
  });

  console.log("\n🪙 Транзакции Spor3s Coins:");
  summary.transactions.forEach((tx) => {
    console.log(
      `  ${tx.created_at} | ${tx.transaction_type === "earned" ? "+" : ""}${tx.amount} SC | ${tx.source_type} | ${tx.description}`,
    );
  });

  console.log("\n🎮 Состояние уровней и баланса:");
  console.log({
    user_id: userId,
    telegram_id: SCENARIO_USER_TAG,
    current_level: summary.level?.current_level,
    level_code: summary.level?.level_code,
    current_sc_balance: summary.level?.current_sc_balance,
    total_sc_earned: summary.level?.total_sc_earned,
    total_sc_spent: summary.level?.total_sc_spent,
    total_orders_amount: summary.level?.total_orders_amount,
    orders_count: summary.level?.orders_count,
  });

  console.log("\n✅ Сценарий завершен");
}

main().catch((err) => {
  console.error("❌ Ошибка сценария:", err);
  process.exit(1);
});

