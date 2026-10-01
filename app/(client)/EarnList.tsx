"use client";
import { useState, type CSSProperties, type ReactNode } from "react";
import { REFERRAL_PERCENT, REFERRAL_WELCOME_SC, SC_MECHANICS, SUBSCRIBE_TASK_SC } from "../../lib/levelUtils";
import { MONTH_GOAL } from "../../lib/monthGoal";
import { plural } from "../../lib/plural";

export type EarnTaskId = "telegram" | "youtube" | "instagram";

// Задания на подписку: за каждое — SUBSCRIBE_TASK_SC (начисляет /api/subscribe-bonus)
export const EARN_TASKS: { id: EarnTaskId; icon: string; title: string; handle: string; url: string }[] = [
  // Названия — только площадка: в строке на телефоне около 100 px под текст, «Telegram канал» переносился
  { id: "telegram", icon: "📱", title: "Telegram", handle: "t.me/spor3s", url: "https://t.me/spor3s" },
  { id: "youtube", icon: "📺", title: "YouTube", handle: "@spor3s", url: "https://www.youtube.com/@spor3s" },
  { id: "instagram", icon: "📸", title: "Instagram", handle: "@alex.spor3s", url: "https://instagram.com/alex.spor3s" },
];

interface EarnListProps {
  tasksDone: Partial<Record<EarnTaskId, boolean>>;
  opened: Partial<Record<EarnTaskId, boolean>>; // перешёл в канал в этот раз — можно забрать бонус
  loading: EarnTaskId | null; // идёт начисление за это задание
  onOpenChannel: (id: EarnTaskId) => void;
  onClaim: (id: EarnTaskId) => void;
  showCourse: boolean; // доступен курс — показываем строку отчёта
  onOpenCourse: () => void;
  onOpenCatalog: () => void;
  children?: ReactNode; // панель приглашения (ReferralPanel) — раскрывается строкой «Пригласи друга»
}

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "12px 0",
  borderTop: "1px solid rgba(255,255,255,0.08)",
  width: "100%",
  textAlign: "left",
  color: "#fff",
};
// Без сокращения «border»: React не смешивает его с borderTop, и разделитель над строкой пропадал
const rowButton: CSSProperties = {
  ...rowStyle,
  background: "none",
  borderLeft: "none",
  borderRight: "none",
  borderBottom: "none",
  cursor: "pointer",
};
const icon: CSSProperties = { fontSize: 24, width: 28, textAlign: "center", flexShrink: 0 };
const titleStyle: CSSProperties = { fontSize: "clamp(14px, 3.8vw, 16px)", fontWeight: 700 };
const subStyle: CSSProperties = { fontSize: "clamp(12px, 3.2vw, 13px)", color: "#bbb", marginTop: 2 };
const action: CSSProperties = {
  background: "linear-gradient(45deg, #ff00cc, #3333ff)",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "7px 9px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap",
  flexShrink: 0,
};

function Text({ title, sub }: { title: string; sub: string }) {
  return (
    <span style={{ flex: 1, minWidth: 0 }}>
      <span style={{ ...titleStyle, display: "block" }}>{title}</span>
      <span style={{ ...subStyle, display: "block" }}>{sub}</span>
    </span>
  );
}

// «Как получить SC» в кабинете (экран как у Walt, 01.10): подписки, приглашение, покупки, отчёт по курсу.
// Состояние заданий и обработчики — из RoadMap; список сам в сеть не ходит.
export default function EarnList({
  tasksDone, opened, loading, onOpenChannel, onClaim, showCourse, onOpenCourse, onOpenCatalog, children,
}: EarnListProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const pct = Math.round(REFERRAL_PERCENT * 100);
  const target = MONTH_GOAL.reportsTarget;

  return (
    <section style={{
      background: "linear-gradient(135deg, #0f172a, #1e293b)",
      borderRadius: 20,
      padding: "clamp(16px, 4.5vw, 22px)",
      marginBottom: 20,
      border: "2px solid rgba(255,255,255,0.1)",
      boxSizing: "border-box",
      width: "100%",
    }}>
      <h2 style={{ margin: "0 0 4px", fontSize: "clamp(17px, 4.4vw, 20px)", color: "#fff" }}>Как получить SC</h2>

      {/* Сумма — в подписи, справа только кнопка: название и подпись помещаются на экране телефона */}
      {EARN_TASKS.map((t) => (
        <div key={t.id} role="group" aria-label={t.title} style={rowStyle}>
          <span style={icon}>{t.icon}</span>
          {tasksDone[t.id] ? (
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ ...titleStyle, display: "block" }}>{t.title}</span>
              <span style={{ ...subStyle, display: "block", color: "#10b981", fontWeight: 700 }}>✅ +{SUBSCRIBE_TASK_SC} SC получено</span>
            </span>
          ) : (
            <>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ ...titleStyle, display: "block" }}>{t.title}</span>
                <span style={{ ...subStyle, display: "block" }}>
                  <b style={{ color: "#ff7ae0" }}>+{SUBSCRIBE_TASK_SC} SC</b> · {t.handle}
                </span>
              </span>
              {loading === t.id ? (
                <button type="button" disabled style={{ ...action, opacity: 0.6, cursor: "not-allowed" }}>⏳</button>
              ) : opened[t.id] ? (
                <button type="button" onClick={() => onClaim(t.id)} style={action}>Получить +{SUBSCRIBE_TASK_SC} SC</button>
              ) : (
                <button type="button" onClick={() => onOpenChannel(t.id)} style={{ ...action, background: "rgba(255,255,255,0.14)" }}>
                  Подписаться
                </button>
              )}
            </>
          )}
        </div>
      ))}

      <button type="button" aria-expanded={inviteOpen} onClick={() => setInviteOpen((o) => !o)} style={rowButton}>
        <span style={icon}>👥</span>
        <Text title="Пригласи друга" sub={`другу ${REFERRAL_WELCOME_SC} SC, тебе ${pct}% с его заказов`} />
        <span style={{ color: "#ccc", fontSize: 16 }}>{inviteOpen ? "▲" : "›"}</span>
      </button>
      {inviteOpen && <div style={{ padding: "4px 0 12px" }}>{children}</div>}

      <button type="button" onClick={onOpenCatalog} style={rowButton}>
        <span style={icon}>🛒</span>
        <Text title="Покупки" sub="1 SC за каждые 100 ₽" />
        <span style={{ color: "#ccc", fontSize: 16 }}>›</span>
      </button>

      {showCourse && (
        <button type="button" onClick={onOpenCourse} style={rowButton}>
          <span style={icon}>🍄</span>
          <Text
            title="Отчёт о самочувствии"
            sub={`+${SC_MECHANICS.weekly_survey.amount} SC в неделю, +${MONTH_GOAL.bonus} SC за ${target} ${plural(target, "отчёт", "отчёта", "отчётов")} в месяц`}
          />
          <span style={{ color: "#ccc", fontSize: 16 }}>›</span>
        </button>
      )}
    </section>
  );
}
