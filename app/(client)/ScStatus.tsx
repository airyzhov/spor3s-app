"use client";
import { useCallback, useEffect, useState } from "react";
import { referralLink } from "../../lib/referralLink";
import { SC_MECHANICS, REFERRAL_PERCENT, levelNeedsText, type LevelNeeds } from "../../lib/levelUtils";
import { plural } from "../../lib/plural";
import CopyLinkButton from "./CopyLinkButton";
import LevelsModal from "./LevelsModal";

type Summary = {
  sc: number;
  totalEarned: number;
  level: { code: string; name: string; icon: string; progress: number; scToNext: number; nextName: string | null; needs: LevelNeeds | null };
  orders?: { amount: number; count: number };
  friends: number;
  referralEarned: number;
  telegramId: string | null;
  invitedBy?: { name: string; welcomeSc: number } | null;
  tasks: { done: number; total: number; left: number; bonusPerTask: number };
  monthGoal: { reportsDone: number; reportsTarget: number; bonus: number; bonusPaid: boolean; completed: boolean };
};

interface ScStatusProps {
  userId?: string;
  // Меняется после начисления SC в кабинете (задание) — панель перечитывает данные
  refreshKey?: number;
}

// Ключ остался с тех пор, как панель жила на главном экране: свёрнута/раскрыта — как привык человек
const OPEN_KEY = "spor3s_home_status_open";

// Панель в кабинете: SC, друзья, уровень, как заработать SC. Данные — /api/home-summary.
export default function ScStatus({ userId, refreshKey }: ScStatusProps) {
  const [data, setData] = useState<Summary | null>(null);
  const [open, setOpen] = useState(false);
  const [levelsOpen, setLevelsOpen] = useState(false);
  const closeLevels = useCallback(() => setLevelsOpen(false), []);

  useEffect(() => {
    try {
      setOpen(localStorage.getItem(OPEN_KEY) === "1");
    } catch {}
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch(`/api/home-summary?user_id=${userId}`);
        const json = await resp.json();
        if (!cancelled && json?.success) setData(json);
      } catch {
        // панель необязательна — молча остаёмся без неё
      }
    })();
    return () => { cancelled = true; };
  }, [userId, refreshKey]);

  if (!data) return null;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    try { localStorage.setItem(OPEN_KEY, next ? "1" : "0"); } catch {}
  };

  const link = referralLink(data.telegramId);
  const needs = data.level.needs;

  const chip = {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: "clamp(13px, 3.4vw, 16px)",
    fontWeight: 700,
    color: "#fff",
    whiteSpace: "nowrap" as const,
  };

  const row = {
    fontSize: "clamp(12px, 3vw, 14px)",
    color: "#ddd",
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    padding: "6px 0",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        background: "linear-gradient(135deg, rgba(255,0,204,0.12), rgba(51,51,255,0.12))",
        border: "2px solid rgba(255,255,255,0.15)",
        borderRadius: 16,
        overflow: "hidden"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px 10px 4px" }}>
          <button
            type="button"
            onClick={toggle}
            style={{
              flex: 1,
              minWidth: 0,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap"
            }}
          >
            <span style={chip}>💰 {data.sc} SC</span>
            <span style={chip}>
              👥 {data.friends} {plural(data.friends, "друг", "друга", "друзей")}
            </span>
            <span style={{ color: "#ccc", fontSize: 14 }}>{open ? "▲" : "▼"}</span>
          </button>
          {/* Уровень — отдельная кнопка: открывает окно уровней, а не сворачивает панель */}
          <button
            type="button"
            onClick={() => setLevelsOpen(true)}
            style={{
              ...chip,
              color: "#ffc107",
              background: "rgba(255,193,7,0.12)",
              border: "1px solid rgba(255,193,7,0.5)",
              borderRadius: 999,
              padding: "6px 12px",
              cursor: "pointer",
              flexShrink: 0
            }}
          >
            {data.level.name} ›
          </button>
        </div>

        {/* Пришёл по приглашению — видно всегда, без раскрытия панели */}
        {data.invitedBy && (
          <div style={{ padding: "0 16px 10px", fontSize: "clamp(12px, 3vw, 14px)", color: "#10b981", fontWeight: 600 }}>
            🤝 Вас пригласил {data.invitedBy.name}
            {data.invitedBy.welcomeSc > 0 && ` · 🎁 +${data.invitedBy.welcomeSc} SC`}
          </div>
        )}

        {open && (
          <div style={{ padding: "0 16px 16px" }}>
            <div style={{ fontWeight: 700, color: "#fff", fontSize: "clamp(13px, 3.2vw, 15px)", margin: "6px 0 8px" }}>
              Как заработать SC
            </div>
            <div style={row}><span>🍄 Отчёт за неделю</span><span>+{SC_MECHANICS.weekly_survey.amount} SC</span></div>
            <div style={row}>
              <span>🏆 Цель месяца: {data.monthGoal.reportsTarget} отчёта</span>
              <span>+{data.monthGoal.bonus} SC</span>
            </div>
            <div style={row}><span>🌟 Мотивационная привычка</span><span>до {SC_MECHANICS.motivational_habit.maxPerMonth} SC/мес</span></div>
            <div style={row}><span>🎯 Задания: {data.tasks.total} подписки</span><span>+{data.tasks.bonusPerTask} SC каждое</span></div>
            <div style={row}><span>👥 Друг оформил заказ</span><span>{Math.round(REFERRAL_PERCENT * 100)}% суммы в SC</span></div>
            <div style={row}><span>🛒 Свой заказ</span><span>1 SC за 100 ₽</span></div>

            <div style={{ marginTop: 12, fontSize: "clamp(12px, 3vw, 14px)", color: "#10b981", fontWeight: 600 }}>
              1 SC = 1 ₽ скидки, до 30% суммы заказа
            </div>

            {needs && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: "clamp(12px, 3vw, 14px)", color: "#ccc", marginBottom: 6 }}>
                  До уровня {needs.name}: ещё {levelNeedsText(needs)}
                </div>
                {/* Полоса — только про SC: когда их хватает, а не хватает заказов, полная полоса обманывала бы */}
                {needs.sc > 0 && (
                  <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.15)", overflow: "hidden" }}>
                    <div style={{
                      width: `${Math.round(data.level.progress * 100)}%`,
                      height: "100%",
                      background: "linear-gradient(45deg, #ff00cc, #3333ff)"
                    }} />
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setLevelsOpen(true)}
              style={{
                marginTop: 12,
                width: "100%",
                background: "rgba(255,193,7,0.12)",
                border: "1px solid rgba(255,193,7,0.5)",
                color: "#ffc107",
                borderRadius: 10,
                padding: "10px 14px",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              🏆 Уровни и награды ›
            </button>

            {link && (
              <div style={{ marginTop: 14 }}>
                <CopyLinkButton
                  link={link}
                  label="👥 Пригласить друга"
                  fullWidth
                  style={{
                    width: "100%",
                    background: "linear-gradient(45deg, #ff00cc, #3333ff)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding: "10px 14px",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {levelsOpen && (
        <LevelsModal
          totalEarned={data.totalEarned}
          ordersAmount={data.orders?.amount ?? 0}
          ordersCount={data.orders?.count ?? 0}
          onClose={closeLevels}
        />
      )}
    </div>
  );
}
