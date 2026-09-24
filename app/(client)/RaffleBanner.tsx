"use client";
import { useEffect, useState, type ReactNode } from "react";
import { referralLink } from "../../lib/referralLink";
import { plural } from "../../lib/plural";
import { RAFFLE, prizeRulesText, type RaffleMe, type RaffleView } from "../../lib/raffle";
import CopyLinkButton from "./CopyLinkButton";

interface RaffleBannerProps {
  userId?: string;
  telegramId?: string;
  onOpenTasks: () => void;
  // Раскрыть карточку сразу — пришли со строки розыгрыша на главной
  expand?: boolean;
  // Меняется после выполнения задания в кабинете — прогресс перечитывается
  refreshKey?: number;
}

const OPEN_KEY = "spor3s_raffle_open";

const card = {
  background: "linear-gradient(135deg, rgba(255,193,7,0.18), rgba(255,0,204,0.14))",
  border: "2px solid rgba(255,193,7,0.6)",
  borderRadius: 16,
  overflow: "hidden" as const,
};

const header = {
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
  textAlign: "left" as const,
};

// Розыгрыш 10.10: полная карточка живёт в кабинете, на главной — строка RaffleTeaser, ведущая сюда.
// Правила и сроки — lib/raffle.ts, данные — /api/raffle.
export default function RaffleBanner({ userId, telegramId, onOpenTasks, expand, refreshKey }: RaffleBannerProps) {
  const data = useRaffleView(userId, refreshKey);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      setOpen(localStorage.getItem(OPEN_KEY) === "1");
    } catch {}
  }, []);

  useEffect(() => {
    if (expand) setOpen(true);
  }, [expand]);

  if (!data || data.stage === "hidden") return null;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    try { localStorage.setItem(OPEN_KEY, next ? "1" : "0"); } catch {}
  };

  const { link, me } = myProgress(data, telegramId);

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
    <div style={{ marginBottom: 20 }}>
      <div style={card}>
        <button type="button" onClick={toggle} style={header}>
          <Title status={raffleStatus(data, me)} mark={open ? "▲" : "▼"} />
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

                {data.stage === "open" && me && link && (
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
                      <CopyLinkButton link={link} label="👥 Пригласить" style={actionBtn} />
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

// Строка «🎁 Розыгрыш 10.10 →» на главной: тот же заголовок и статус, но ведёт в кабинет
export function RaffleTeaser({ userId, telegramId, onOpen }: { userId?: string; telegramId?: string; onOpen: () => void }) {
  const data = useRaffleView(userId);
  if (!data || data.stage === "hidden") return null;
  const { me } = myProgress(data, telegramId);

  return (
    <div style={{ padding: "0 20px", marginBottom: 12 }}>
      {/* card после header: его фон и рамка должны перекрыть «background/border: none» заголовка */}
      <button type="button" onClick={onOpen} style={{ ...header, ...card }}>
        <Title status={raffleStatus(data, me)} mark="→" />
      </button>
    </div>
  );
}

function useRaffleView(userId?: string, refreshKey?: number): RaffleView | null {
  const [data, setData] = useState<RaffleView | null>(null);

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
  }, [userId, refreshKey]);

  return data;
}

// Участвовать можно только из Telegram: без числового ID нет ссылки-приглашения, а прогресс не считаем
function myProgress(data: RaffleView, telegramId?: string): { link: string | null; me: RaffleMe | null } {
  const link = referralLink(telegramId);
  return { link, me: link ? data.me : null };
}

function raffleStatus(data: RaffleView, me: RaffleMe | null): string {
  const conditionsDone = me ? Number(me.tasks >= 1) + Number(me.friends >= 1) : 0;
  return data.stage === "drawn" ? "🏆 Итоги"
    : me?.eligible ? "✅ Ты участвуешь"
    : data.stage === "closed" ? "Приём закрыт"
    : me ? `${conditionsDone} из 2 условий`
    : "Условия";
}

function Title({ status, mark }: { status: string; mark: string }) {
  return (
    <>
      <span style={{ fontSize: "clamp(14px, 3.6vw, 17px)", fontWeight: 800 }}>
        🎁 {RAFFLE.title} — выиграй добавки
      </span>
      <span style={{ fontSize: "clamp(12px, 3vw, 14px)", fontWeight: 700, color: "#ffc107", whiteSpace: "nowrap" }}>
        {status} {mark}
      </span>
    </>
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
