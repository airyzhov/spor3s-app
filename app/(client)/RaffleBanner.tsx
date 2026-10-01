"use client";
import { useEffect, useState, type CSSProperties } from "react";
import { referralLink } from "../../lib/referralLink";
import { plural } from "../../lib/plural";
import {
  RAFFLE,
  prizeForFriends,
  prizeRulesText,
  raffleDaysLeftLabel,
  type RaffleMe,
  type RaffleView,
} from "../../lib/raffle";
import CopyLinkButton from "./CopyLinkButton";

interface RaffleBannerProps {
  userId?: string;
  telegramId?: string;
  onOpenTasks: () => void; // «Выполнить задание» — к списку «Как получить SC»
  // Меняется после выполнения задания в кабинете — прогресс перечитывается
  refreshKey?: number;
}

const card: CSSProperties = {
  background: "linear-gradient(135deg, rgba(255,193,7,0.18), rgba(255,0,204,0.14))",
  border: "2px solid rgba(255,193,7,0.6)",
  borderRadius: 16,
  overflow: "hidden",
};

const header: CSSProperties = {
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
  textAlign: "left",
};

const line: CSSProperties = { fontSize: "clamp(12px, 3.2vw, 14px)", color: "#ddd", lineHeight: 1.5 };
const mainBtn: CSSProperties = {
  width: "100%",
  background: "linear-gradient(45deg, #ff00cc, #3333ff)",
  color: "#fff",
  border: "none",
  borderRadius: 12,
  padding: "12px 14px",
  fontSize: "clamp(14px, 3.8vw, 16px)",
  fontWeight: 700,
  cursor: "pointer",
  marginTop: 12,
};

// Розыгрыш 10.10: полная карточка живёт в кабинете, на главной — строка RaffleTeaser, ведущая сюда.
// Правила и сроки — lib/raffle.ts, данные — /api/raffle. С 28.09 участник = задание + кнопка «Участвую».
// С 01.10 карточка всегда раскрыта (экран как у Walt): дедлайн, шаги, приз и одна главная кнопка.
export default function RaffleBanner({ userId, telegramId, onOpenTasks, refreshKey }: RaffleBannerProps) {
  const [data, setData] = useRaffleView(userId, refreshKey);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  if (!data || data.stage === "hidden") return null;

  const { link, me } = myProgress(data, telegramId);
  const open = data.stage === "open";
  const deadline = open ? raffleDaysLeftLabel(new Date()) : null;
  const status = raffleStatus(data, me);

  // «✋ Участвую»: сервер проверяет задание и срок приёма, в ответ — обновлённый прогресс
  const join = async () => {
    if (!userId || joining) return;
    setJoining(true);
    setJoinError(null);
    try {
      const resp = await fetch("/api/raffle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, action: "join" }),
      });
      const json = await resp.json();
      if (!resp.ok || !json?.success) {
        setJoinError(json?.error || "Не получилось, попробуй ещё раз");
        return;
      }
      if (data) setData({ ...data, me: json.me });
    } catch {
      setJoinError("Нет связи — попробуй ещё раз");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <section style={{ ...card, padding: "14px 16px", color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, minHeight: 24 }}>
          {deadline ? (
            <span style={{
              background: "rgba(255,193,7,0.2)",
              color: "#ffc107",
              borderRadius: 999,
              padding: "4px 10px",
              fontSize: "clamp(12px, 3.2vw, 13px)",
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}>
              {deadline}
            </span>
          ) : <span />}
          {status !== "Условия" && (
            <span style={{ fontSize: "clamp(12px, 3vw, 14px)", fontWeight: 700, color: "#ffc107", whiteSpace: "nowrap" }}>{status}</span>
          )}
        </div>

        <h3 style={{ margin: "10px 0 2px", fontSize: "clamp(17px, 4.6vw, 20px)", fontWeight: 800 }}>
          🎁 {RAFFLE.title} — выиграй добавки
        </h3>
        <div style={{ ...line, color: "#bbb" }}>
          {RAFFLE.winnersCount} победителя · итоги {RAFFLE.drawDateLabel}
        </div>

        {data.stage === "drawn" && data.winners ? (
          <div style={{ marginTop: 10 }}>
            <div style={{ ...line, fontWeight: 700, color: "#fff", marginBottom: 6 }}>🏆 Победители:</div>
            {data.winners.map((w, i) => (
              <div key={i} style={line}>
                {i + 1}. {w.name}{w.prize ? ` — ${w.prize.label}` : ""}
              </div>
            ))}
            <div style={{ ...line, marginTop: 8 }}>Спасибо всем участникам! Победителям напишем в Telegram.</div>
          </div>
        ) : (
          <>
            {open && !me && (
              <div style={{ ...line, marginTop: 10, color: "#ffc107" }}>
                Участвовать можно только через Telegram — открой приложение из бота @spor3sbot.
              </div>
            )}

            {open && me && link && (
              <>
                <Steps me={me} />
                <div style={{ ...line, color: me.eligible ? "#10b981" : "#fff", fontWeight: me.eligible ? 700 : 600 }}>
                  {me.eligible ? eligibleText(me) : `🎁 Приз сейчас: ${prizeForFriends(me.friends).label}`}
                </div>

                {/* Подписи короткие — в одну строку на телефоне; что даст друг, написано строкой выше */}
                {me.tasks < 1 ? (
                  <button type="button" onClick={onOpenTasks} style={mainBtn}>
                    🎯 Выполнить задание
                  </button>
                ) : !me.joined ? (
                  <button type="button" onClick={join} disabled={joining} style={mainBtn}>
                    {joining ? "⏳" : "✋ Участвую"}
                  </button>
                ) : (
                  <CopyLinkButton link={link} label="👥 Пригласить друга" fullWidth style={mainBtn} />
                )}
                {joinError && (
                  <div role="alert" style={{ ...line, color: "#ff6b6b", marginTop: 8 }}>{joinError}</div>
                )}
              </>
            )}

            {!open && me?.eligible && (
              <div style={{ ...line, marginTop: 10, color: "#10b981", fontWeight: 700 }}>
                ✅ Ты участвуешь! Если выиграешь — {me.prize?.label}.
              </div>
            )}
            {!open && (
              <div style={{ ...line, marginTop: 10, color: "#aaa" }}>
                Приём заявок закрыт. Победителей выберем {RAFFLE.drawDateLabel}.
              </div>
            )}

            {open && (
              <>
                <button
                  type="button"
                  aria-expanded={rulesOpen}
                  onClick={() => setRulesOpen((o) => !o)}
                  style={{ background: "none", border: "none", color: "#ffc107", cursor: "pointer", padding: 0, marginTop: 12, fontSize: 13, fontWeight: 700 }}
                >
                  {rulesOpen ? "Условия ▲" : "Условия ›"}
                </button>
                {rulesOpen && (
                  <div style={{ marginTop: 8, display: "grid", gap: 4 }}>
                    <div style={line}>
                      {RAFFLE.winnersCount} победителя. Приз зависит от числа приглашённых друзей: {prizeRulesText()}.
                    </div>
                    <div style={line}>Друг засчитывается, если перешёл по твоей ссылке и открыл магазин.</div>
                    <div style={{ ...line, color: "#aaa" }}>
                      Приём {RAFFLE.deadlineLabel}. Победителей выберем {RAFFLE.drawDateLabel}.
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}

// «✅ Ты участвуешь! Если выиграешь — 1 добавка на выбор. Пригласи друга — будет 2 добавки на выбор.»
function eligibleText(me: RaffleMe): string {
  const next = me.next
    ? ` ${me.friends === 0
      ? "Пригласи друга"
      : `Пригласи ещё ${me.next.friendsNeeded} ${plural(me.next.friendsNeeded, "друга", "друзей", "друзей")}`} — будет ${me.next.prize.label}.`
    : "";
  return `✅ Ты участвуешь! Если выиграешь — ${me.prize?.label}.${next}`;
}

// Шаги участия: задание → «Участвую» → друзья (друзья — не условие, а рост приза)
function Steps({ me }: { me: RaffleMe }) {
  // Компактные «таблетки»: три шага помещаются в одну строку на экране телефона (375 px)
  const pill = (done: boolean): CSSProperties => ({
    background: done ? "rgba(16,185,129,0.18)" : "rgba(255,255,255,0.1)",
    border: `1px solid ${done ? "rgba(16,185,129,0.6)" : "rgba(255,255,255,0.2)"}`,
    color: done ? "#10b981" : "#fff",
    borderRadius: 999,
    padding: "4px 8px",
    fontSize: "clamp(11px, 3.1vw, 13px)",
    fontWeight: 700,
    whiteSpace: "nowrap",
  });
  // Без стрелок между шагами: порядок видно по галочкам, а со стрелками третий шаг уезжал на вторую строку
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", margin: "12px 0 10px" }}>
      <span style={pill(me.tasks >= 1)}>{me.tasks >= 1 ? "✅" : "⬜"} Задание</span>
      <span style={pill(me.joined)}>{me.joined ? "✅" : "⬜"} Участвую</span>
      <span style={pill(me.friends > 0)}>👥 {me.friends} {plural(me.friends, "друг", "друга", "друзей")}</span>
    </div>
  );
}

// Строка «🎁 Розыгрыш 10.10 →» на главной: тот же заголовок и статус, но ведёт в кабинет
export function RaffleTeaser({ userId, telegramId, onOpen }: { userId?: string; telegramId?: string; onOpen: () => void }) {
  const [data] = useRaffleView(userId);
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

function useRaffleView(userId?: string, refreshKey?: number): [RaffleView | null, (view: RaffleView) => void] {
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

  return [data, setData];
}

// Участвовать можно только из Telegram: без числового ID нет ссылки-приглашения, а прогресс не считаем
function myProgress(data: RaffleView, telegramId?: string): { link: string | null; me: RaffleMe | null } {
  const link = referralLink(telegramId);
  return { link, me: link ? data.me : null };
}

function raffleStatus(data: RaffleView, me: RaffleMe | null): string {
  // Условия участия — задание и «Участвую»; друзья только увеличивают приз
  const conditionsDone = me ? Number(me.tasks >= 1) + Number(me.joined) : 0;
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
