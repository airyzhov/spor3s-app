"use client";
import { useEffect, useState } from "react";
import { openExternal } from "../../lib/openExternal";
import { referralShareUrl } from "../../lib/referralLink";
import { SC_MECHANICS, REFERRAL_PERCENT } from "../../lib/levelUtils";
import { plural } from "../../lib/plural";
import TasksBanner from "./TasksBanner";

type Summary = {
  sc: number;
  totalEarned: number;
  level: { code: string; name: string; icon: string; progress: number; scToNext: number; nextName: string | null };
  friends: number;
  referralEarned: number;
  telegramId: string | null;
  tasks: { done: number; total: number; left: number; bonusPerTask: number };
  monthGoal: { reportsDone: number; reportsTarget: number; bonus: number; bonusPaid: boolean; completed: boolean };
};

interface HomeStatusProps {
  userId?: string;
  onOpenTasks: () => void;
  onOpenCabinet: () => void;
}

const OPEN_KEY = "spor3s_home_status_open";

export default function HomeStatus({ userId, onOpenTasks, onOpenCabinet }: HomeStatusProps) {
  const [data, setData] = useState<Summary | null>(null);
  const [open, setOpen] = useState(false);

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
        // витрина необязательна — молча остаёмся без неё
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  if (!data) return null;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    try { localStorage.setItem(OPEN_KEY, next ? "1" : "0"); } catch {}
  };

  const shareUrl = referralShareUrl(data.telegramId);
  const share = () => {
    if (shareUrl) openExternal(shareUrl);
  };

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
    <div style={{ padding: "0 20px", marginBottom: 20 }}>
      <div style={{
        background: "linear-gradient(135deg, rgba(255,0,204,0.12), rgba(51,51,255,0.12))",
        border: "2px solid rgba(255,255,255,0.15)",
        borderRadius: 16,
        overflow: "hidden"
      }}>
        <button
          type="button"
          onClick={toggle}
          style={{
            width: "100%",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "14px 16px",
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
          <span style={{ ...chip, color: "#ffc107" }}>{data.level.name}</span>
          <span style={{ color: "#ccc", fontSize: 14 }}>{open ? "▲" : "▼"}</span>
        </button>

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

            {data.level.nextName && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: "clamp(12px, 3vw, 14px)", color: "#ccc", marginBottom: 6 }}>
                  До уровня {data.level.nextName}: {data.level.scToNext} SC
                </div>
                <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.15)", overflow: "hidden" }}>
                  <div style={{
                    width: `${Math.round(data.level.progress * 100)}%`,
                    height: "100%",
                    background: "linear-gradient(45deg, #ff00cc, #3333ff)"
                  }} />
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              {shareUrl && (
                <button
                  type="button"
                  onClick={share}
                  style={{
                    flex: 1,
                    minWidth: 140,
                    background: "linear-gradient(45deg, #ff00cc, #3333ff)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding: "10px 14px",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  👥 Пригласить друга
                </button>
              )}
              <button
                type="button"
                onClick={onOpenCabinet}
                style={{
                  flex: 1,
                  minWidth: 140,
                  background: "rgba(255,255,255,0.12)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.25)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                🎁 Открыть кабинет
              </button>
            </div>
          </div>
        )}
      </div>

      <TasksBanner
        left={data.tasks.left}
        bonusPerTask={data.tasks.bonusPerTask}
        onClick={onOpenTasks}
        style={{ marginTop: 10 }}
      />
    </div>
  );
}
