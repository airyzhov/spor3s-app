"use client";
import { useEffect, useState, type ReactNode } from "react";
import { openExternal } from "../../lib/openExternal";
import { referralShareUrl } from "../../lib/referralLink";
import { plural } from "../../lib/plural";
import { RAFFLE, prizeRulesText, type RaffleView } from "../../lib/raffle";

interface RaffleBannerProps {
  userId?: string;
  telegramId?: string;
  onOpenTasks: () => void;
}

const OPEN_KEY = "spor3s_raffle_open";

// Кнопка «Розыгрыш 10.10» на главном экране: условия, личный прогресс, итоги.
// Правила и сроки — lib/raffle.ts, данные — /api/raffle.
export default function RaffleBanner({ userId, telegramId, onOpenTasks }: RaffleBannerProps) {
  const [data, setData] = useState<RaffleView | null>(null);
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
        const resp = await fetch(`/api/raffle?user_id=${encodeURIComponent(userId)}`);
        const json = await resp.json();
        if (!cancelled && json?.success) setData(json);
      } catch {
        // розыгрыш необязателен — без данных кнопку не показываем
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  if (!data || data.stage === "hidden") return null;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    try { localStorage.setItem(OPEN_KEY, next ? "1" : "0"); } catch {}
  };

  // Участвовать можно только из Telegram: без числового ID нет ссылки-приглашения
  const shareUrl = referralShareUrl(telegramId);
  const me = shareUrl ? data.me : null;
  const conditionsDone = me ? Number(me.tasks >= 1) + Number(me.friends >= 1) : 0;

  const status =
    data.stage === "drawn" ? "🏆 Итоги"
    : me?.eligible ? "✅ Ты участвуешь"
    : data.stage === "closed" ? "Приём закрыт"
    : me ? `${conditionsDone} из 2 условий`
    : "Условия";

  const line = { fontSize: "clamp(12px, 3vw, 14px)", color: "#ddd", lineHeight: 1.5 };
  const actionBtn = {
    background: "linear-gradient(45deg, #ff00cc, #3333ff)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "8px 12px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  };

  return (
    <div style={{ padding: "0 20px", marginBottom: 12 }}>
      <div style={{
        background: "linear-gradient(135deg, rgba(255,193,7,0.18), rgba(255,0,204,0.14))",
        border: "2px solid rgba(255,193,7,0.6)",
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
            gap: 10,
            color: "#fff",
            textAlign: "left"
          }}
        >
          <span style={{ fontSize: "clamp(14px, 3.6vw, 17px)", fontWeight: 800 }}>
            🎁 {RAFFLE.title} — выиграй добавки
          </span>
          <span style={{ fontSize: "clamp(12px, 3vw, 14px)", fontWeight: 700, color: "#ffc107", whiteSpace: "nowrap" }}>
            {status} {open ? "▲" : "▼"}
          </span>
        </button>

        {open && (
          <div style={{ padding: "0 16px 16px" }}>
            {data.stage === "drawn" && data.winners ? (
              <>
                <div style={{ ...line, fontWeight: 700, color: "#fff", marginBottom: 6 }}>🏆 Победители:</div>
                {data.winners.map((w, i) => (
                  <div key={i} style={line}>
                    {i + 1}. {w.name}{w.prize ? ` — ${w.prize.label}` : ""}
                  </div>
                ))}
                <div style={{ ...line, marginTop: 8 }}>Спасибо всем участникам! Победителям напишем в Telegram.</div>
              </>
            ) : (
              <>
                <div style={line}>
                  {RAFFLE.winnersCount} победителя. Приз зависит от числа приглашённых друзей: {prizeRulesText()}.
                </div>

                {data.stage === "open" && !me && (
                  <div style={{ ...line, marginTop: 10, color: "#ffc107" }}>
                    Участвовать можно только через Telegram — открой приложение из бота @spor3sbot.
                  </div>
                )}

                {data.stage === "open" && me && (
                  <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                    <Condition done={me.tasks >= 1} text="Выполни задание на подписку в кабинете">
                      {me.tasks < 1 && (
                        <button type="button" onClick={onOpenTasks} style={actionBtn}>К заданиям →</button>
                      )}
                    </Condition>
                    <Condition
                      done={me.friends >= 1}
                      text={`Пригласи друга: он должен перейти по твоей ссылке и открыть приложение. Друзей: ${me.friends}`}
                    >
                      <button type="button" onClick={() => openExternal(shareUrl!)} style={actionBtn}>👥 Пригласить</button>
                    </Condition>
                  </div>
                )}

                {me?.eligible && (
                  <div style={{ ...line, marginTop: 12, color: "#10b981", fontWeight: 700 }}>
                    ✅ Ты участвуешь! Если выиграешь — {me.prize?.label}.
                    {data.stage === "open" && me.next &&
                      ` Пригласи ещё ${me.next.friendsNeeded} ${plural(me.next.friendsNeeded, "друга", "друзей", "друзей")} — будет ${me.next.prize.label}.`}
                  </div>
                )}

                <div style={{ ...line, marginTop: 12, color: "#aaa" }}>
                  {data.stage === "open"
                    ? `Приём ${RAFFLE.deadlineLabel}. Победителей выберем ${RAFFLE.drawDateLabel}.`
                    : `Приём заявок закрыт. Победителей выберем ${RAFFLE.drawDateLabel}.`}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Condition({ done, text, children }: { done: boolean; text: string; children?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
      <span style={{ fontSize: "clamp(12px, 3vw, 14px)", color: done ? "#10b981" : "#fff", flex: "1 1 180px" }}>
        {done ? "✅" : "⬜"} {text}
      </span>
      {children}
    </div>
  );
}
