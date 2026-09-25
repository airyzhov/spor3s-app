"use client";
import { useEffect, useState } from "react";
import CabinetSection from "./CabinetSection";
import { courseWeek, nextCourseReport } from "../../lib/course";

interface CourseSectionProps {
  userId: string;
  visible: boolean; // есть оплаченный заказ (без покупки курс не начать)
  forceOpen?: boolean; // пришли по кнопке бота «Отметить начало курса» (?open=course)
  onSCUpdate?: () => void;
}

type Metrics = { memory: number; sleep: number; energy: number; stress: number };
type Survey = Partial<Metrics> & { week: number };

const METRICS: { key: keyof Metrics; icon: string; label: string }[] = [
  { key: "memory", icon: "🧠", label: "Память и концентрация" },
  { key: "sleep", icon: "😴", label: "Качество сна" },
  { key: "energy", icon: "⚡", label: "Уровень энергии" },
  { key: "stress", icon: "😌", label: "Стрессоустойчивость" },
];
const START_METRICS: Metrics = { memory: 5, sleep: 5, energy: 5, stress: 5 };

// «📊 Мой курс»: бывшие «Начало курса» и «Еженедельные отметки» в одном разделе (решение
// владельца 25.09). Одна кнопка «Я начал(а) курс», дальше раз в неделю оценка самочувствия —
// +25 SC за отчёт (до 100 SC в месяц) и бонус цели месяца. API: /api/start-course, /api/survey.
export default function CourseSection({ userId, visible, forceOpen, onSCUpdate }: CourseSectionProps) {
  const [loaded, setLoaded] = useState(false);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [metrics, setMetrics] = useState<Metrics>(START_METRICS);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !userId) return;
    let cancelled = false;
    (async () => {
      try {
        const [courseRes, surveyRes] = await Promise.all([
          fetch(`/api/start-course?user_id=${encodeURIComponent(userId)}`).then((r) => r.json()),
          fetch(`/api/survey?user_id=${encodeURIComponent(userId)}`).then((r) => r.json()),
        ]);
        if (cancelled) return;
        setStartDate(courseRes?.course?.start_date ?? null);
        setSurveys(Array.isArray(surveyRes?.surveys) ? surveyRes.surveys : []);
      } catch {
        // раздел необязателен — без данных покажем «не начат»
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, visible]);

  if (!visible) return null;

  const post = async (url: string, body: object) => {
    setBusy(true);
    setError(null);
    setMessages([]);
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, ...body }),
      });
      const json = await resp.json();
      if (!resp.ok || !json?.success) {
        setError(json?.error || "Не получилось, попробуй ещё раз");
        return null;
      }
      return json;
    } catch {
      setError("Нет связи — попробуй ещё раз");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    const json = await post("/api/start-course", {});
    if (json?.course?.start_date) setStartDate(json.course.start_date);
  };

  const save = async () => {
    const json = await post("/api/survey", { ...metrics, note: note.trim() });
    if (!json) return;
    setSurveys((prev) => [...prev, { week: json.week, ...metrics }]);
    setNote("");
    const out = [
      json.scEarned > 0
        ? `Неделя ${json.week} сохранена: +${json.scEarned} SC 🎉`
        : `Неделя ${json.week} сохранена (без SC — месячный лимит 100 SC уже набран)`,
    ];
    if (json.monthGoalBonus > 0) out.push(`🏆 Цель месяца выполнена: +${json.monthGoalBonus} SC`);
    setMessages(out);
    if (json.scEarned > 0 || json.monthGoalBonus > 0) onSCUpdate?.();
  };

  const now = new Date();
  const week = startDate ? courseWeek(startDate, now) : null;
  const next = startDate ? nextCourseReport(startDate, surveys.map((s) => s.week), now) : null;
  const text = { fontSize: "clamp(13px, 3.3vw, 15px)", color: "#ddd", lineHeight: 1.5 };
  const mainBtn = {
    width: "100%",
    background: busy ? "rgba(255,255,255,0.15)" : "linear-gradient(45deg, #ff00cc, #3333ff)",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "12px 16px",
    fontSize: 15,
    fontWeight: 700,
    cursor: busy ? "not-allowed" : "pointer",
  };

  return (
    <CabinetSection
      title="📊 Мой курс"
      summary={!loaded ? "" : week ? `неделя ${week}` : "не начат"}
      storageKey="spor3s_course_open"
      forceOpen={forceOpen}
    >
      {loaded && !startDate && (
        <>
          <div style={{ ...text, marginBottom: 14 }}>
            Отметь день, когда начал(а) принимать добавки. Раз в неделю оценивай самочувствие — память, сон,
            энергию и стресс — и получай +25 SC за отчёт (до 100 SC в месяц) и +50 SC за 4 отчёта в месяц.
          </div>
          <button type="button" disabled={busy} onClick={start} style={mainBtn}>
            {busy ? "⏳" : "✅ Я начал(а) курс"}
          </button>
        </>
      )}

      {startDate && next && (
        <>
          <div style={{ ...text, color: "#ffc107", marginBottom: 12 }}>
            Курс начат {new Date(startDate).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })} · идёт неделя {week}
          </div>

          {next.available ? (
            <>
              <div style={{ ...text, color: "#fff", fontWeight: 600, marginBottom: 10 }}>Как прошла неделя {next.week}?</div>
              {METRICS.map((m) => (
                <label key={m.key} style={{ display: "block", marginBottom: 12, ...text }}>
                  <span style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{m.icon} {m.label}</span>
                    <b style={{ color: "#ffc107" }}>{metrics[m.key]}/10</b>
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={metrics[m.key]}
                    onChange={(e) => setMetrics((prev) => ({ ...prev, [m.key]: parseInt(e.target.value, 10) }))}
                    style={{ width: "100%" }}
                  />
                </label>
              ))}
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Заметки о неделе (необязательно)"
                rows={2}
                maxLength={1000}
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
              <button type="button" disabled={busy} onClick={save} style={mainBtn}>
                {busy ? "⏳" : `💾 Сохранить неделю ${next.week} (+25 SC)`}
              </button>
            </>
          ) : (
            <div style={text}>
              Отчёт за неделю {next.week} откроется {new Date(next.opensAt).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}.
            </div>
          )}

          {surveys.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ ...text, color: "#fff", fontWeight: 600, marginBottom: 6 }}>📈 История</div>
              {surveys.slice().sort((a, b) => a.week - b.week).map((s) => (
                <div key={s.week} style={{ ...text, fontSize: 13 }}>
                  Неделя {s.week}: {METRICS.map((m) => `${m.icon} ${s[m.key] ?? "—"}`).join(" · ")}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {messages.map((m) => <div key={m} style={{ ...text, color: "#10b981", fontWeight: 600, marginTop: 10 }}>{m}</div>)}
      {error && <div style={{ ...text, color: "#ff6b6b", marginTop: 10 }}>{error}</div>}
    </CabinetSection>
  );
}
