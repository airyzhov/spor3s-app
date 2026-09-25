"use client";
import React, { useEffect, useState } from "react";
import { HABIT_WEEKS, HABIT_WEEK_SC, cleanHabitName, type HabitView, type WeekState } from "../lib/habit";
import { levelNeedsText } from "../lib/levelUtils";

interface MotivationalHabitProps {
  userId: string;
  // После начисления SC — чтобы панель SC в кабинете перечитала баланс
  onSCUpdate?: () => void;
}

type View = HabitView & { scEarned?: number; reportedWeek?: number };

// Мотивационная привычка в кабинете: выбрать привычку на 4 недели, раз в неделю отметить,
// получилось ли, +25 SC за каждую получившуюся неделю. Правила — lib/habit.ts, API — /api/motivational-habit.
export default function MotivationalHabit({ userId, onSCUpdate }: MotivationalHabitProps) {
  const [view, setView] = useState<View | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState("");
  const [custom, setCustom] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch(`/api/motivational-habit?user_id=${encodeURIComponent(userId)}`);
        const json = await resp.json();
        if (cancelled) return;
        if (resp.ok && json?.success) setView(json);
        else setError(json?.error || "Не удалось загрузить привычку");
      } catch {
        if (!cancelled) setError("Не удалось загрузить привычку");
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const post = async (payload: Record<string, unknown>): Promise<View | null> => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const resp = await fetch("/api/motivational-habit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, ...payload }),
      });
      const json = await resp.json();
      if (!resp.ok || !json?.success) {
        setError(json?.error || "Не получилось, попробуй ещё раз");
        return null;
      }
      setView(json);
      return json;
    } catch {
      setError("Нет связи — попробуй ещё раз");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    const json = await post({ action: "start", name: picked || custom });
    if (json?.habit) {
      setPicked("");
      setCustom("");
      setMessage(`Привычка «${json.habit.habit_name}» началась! Отмечай раз в неделю, как получается.`);
    }
  };

  const report = async (isCompleted: boolean) => {
    const json = await post({ action: "report", is_completed: isCompleted, note });
    if (!json) return;
    setNote("");
    if ((json.scEarned || 0) > 0) {
      setMessage(`Неделя ${json.reportedWeek} засчитана: +${json.scEarned} SC 🎉`);
      onSCUpdate?.();
    } else {
      setMessage(`Отчёт за неделю ${json.reportedWeek} сохранён. Следующая неделя — новый шанс 💪`);
    }
  };

  if (!view && !error) return null;

  const text = { fontSize: "clamp(13px, 3.3vw, 15px)", color: "#ddd", lineHeight: 1.5 };
  const mainBtn = (disabled: boolean) => ({
    background: disabled ? "rgba(255,255,255,0.15)" : "linear-gradient(45deg, #ff00cc, #3333ff)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 16px",
    fontSize: 14,
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
  });

  const habit = view?.habit ?? null;
  const status = view?.status ?? null;
  const active = !!habit && !!status && !status.finished;
  const presetIcon = (name: string) => view?.presets.find((p) => p.name === name)?.icon ?? "🌟";
  const canStart = !busy && (!!picked || !!cleanHabitName(custom));

  return (
    <div style={{
      background: "linear-gradient(135deg, #0f172a, #1e293b)",
      borderRadius: 20,
      padding: "clamp(18px, 5vw, 25px)",
      marginBottom: 30,
      border: "2px solid rgba(255,255,255,0.1)",
      color: "#fff",
      boxSizing: "border-box",
      width: "100%",
    }}>
      <div style={{ fontSize: "clamp(18px, 4.5vw, 20px)", fontWeight: 700, marginBottom: 6 }}>🌟 Мотивационная привычка</div>
      <div style={{ ...text, color: "#aaa", marginBottom: 14 }}>
        4 недели · отчёт раз в неделю · +{HABIT_WEEK_SC} SC за каждую неделю, когда получилось (до {HABIT_WEEK_SC * HABIT_WEEKS} SC)
      </div>

      {view && !view.tableReady && (
        <div style={text}>Скоро здесь можно будет выбрать привычку на месяц и получать за неё SC.</div>
      )}

      {view?.tableReady && !view.access && (
        <div style={text}>
          🔒 Откроется на уровне 🌿 Собиратель
          {view.needs ? `: ещё ${levelNeedsText(view.needs)}` : ""}.
        </div>
      )}

      {view?.access && active && habit && status && (
        <>
          <div style={{ fontSize: "clamp(15px, 4vw, 17px)", fontWeight: 700 }}>
            {presetIcon(habit.habit_name)} {habit.habit_name}
          </div>
          <div style={{ ...text, color: "#ffc107", margin: "2px 0 12px" }}>Неделя {status.week} из {HABIT_WEEKS}</div>
          <Weeks weeks={status.weeks} />

          {status.canReport ? (
            <div style={{ marginTop: 14 }}>
              <div style={{ ...text, color: "#fff", fontWeight: 600, marginBottom: 8 }}>Как прошла неделя {status.week}?</div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Комментарий (необязательно)"
                rows={2}
                maxLength={500}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 10,
                  color: "#fff",
                  padding: "8px 10px",
                  fontSize: 14,
                  marginBottom: 10,
                  resize: "vertical",
                }}
              />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" disabled={busy} onClick={() => report(true)} style={{ ...mainBtn(busy), flex: "1 1 140px" }}>
                  ✅ Получилось +{HABIT_WEEK_SC} SC
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => report(false)}
                  style={{ ...mainBtn(busy), flex: "1 1 140px", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)" }}
                >
                  ❌ Не получилось
                </button>
              </div>
            </div>
          ) : (
            <div style={{ ...text, marginTop: 12 }}>
              Отчёт за неделю {status.week} есть.
              {status.nextReportAt && ` Следующий — с ${formatWhen(status.nextReportAt)}.`}
            </div>
          )}
          <div style={{ ...text, color: "#10b981", marginTop: 10 }}>Заработано на привычке: {status.scEarned} SC</div>
        </>
      )}

      {view?.access && !active && view.tableReady && (
        <>
          {habit && status?.finished && (
            <div style={{ ...text, marginBottom: 12 }}>
              Привычка «{habit.habit_name}» закончилась: получилось {status.doneWeeks} из {HABIT_WEEKS} недель, +{status.scEarned} SC.
            </div>
          )}
          <div style={{ ...text, color: "#fff", fontWeight: 600, marginBottom: 8 }}>
            {habit ? "Выбери новую привычку на 4 недели:" : "Выбери привычку на 4 недели:"}
          </div>
          <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
            {view.presets.map((p) => {
              const on = picked === p.name;
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => { setPicked(on ? "" : p.name); setCustom(""); }}
                  style={{
                    textAlign: "left",
                    background: on ? "rgba(255,0,204,0.18)" : "rgba(255,255,255,0.06)",
                    border: on ? "2px solid #ff00cc" : "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 10,
                    padding: "8px 12px",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{p.icon} {p.name}</div>
                  {p.description && <div style={{ fontSize: 12, color: "#aaa" }}>{p.description}</div>}
                </button>
              );
            })}
          </div>
          <input
            type="text"
            value={custom}
            onChange={(e) => { setCustom(e.target.value); setPicked(""); }}
            placeholder="Или своя: например, «Английский 15 минут»"
            maxLength={80}
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 10,
              color: "#fff",
              padding: "10px 12px",
              fontSize: 14,
              marginBottom: 10,
            }}
          />
          <button type="button" disabled={!canStart} onClick={start} style={{ ...mainBtn(!canStart), width: "100%" }}>
            {busy ? "⏳" : "🚀 Начать привычку"}
          </button>
        </>
      )}

      {message && <div style={{ ...text, color: "#10b981", fontWeight: 600, marginTop: 12 }}>{message}</div>}
      {error && <div style={{ ...text, color: "#ff6b6b", marginTop: 12 }}>{error}</div>}
    </div>
  );
}

const WEEK_LOOK: Record<WeekState, { mark: string; color: string; bg: string }> = {
  done: { mark: "✅", color: "#10b981", bg: "rgba(16,185,129,0.15)" },
  missed: { mark: "❌", color: "#ff6b6b", bg: "rgba(255,107,107,0.12)" },
  skipped: { mark: "—", color: "#888", bg: "rgba(255,255,255,0.05)" },
  current: { mark: "●", color: "#ffc107", bg: "rgba(255,193,7,0.15)" },
  upcoming: { mark: "○", color: "#888", bg: "rgba(255,255,255,0.05)" },
};

function Weeks({ weeks }: { weeks: WeekState[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${weeks.length}, 1fr)`, gap: 6 }}>
      {weeks.map((w, i) => (
        <div
          key={i}
          data-week={w}
          style={{ background: WEEK_LOOK[w].bg, borderRadius: 10, padding: "6px 4px", textAlign: "center", color: WEEK_LOOK[w].color }}
        >
          <div style={{ fontSize: 16 }}>{WEEK_LOOK[w].mark}</div>
          <div style={{ fontSize: 11 }}>неделя {i + 1}</div>
        </div>
      ))}
    </div>
  );
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}
