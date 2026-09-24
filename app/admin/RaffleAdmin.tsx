"use client";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { matchesUser } from "../../lib/adminSearch";
import { RAFFLE, type RaffleDraw, type RaffleParticipant, type RaffleWinner } from "../../lib/raffle";
import { btn, card } from "./styles";

type AdminRaffle = { participants: RaffleParticipant[]; draw: RaffleDraw | null; tableReady: boolean };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Раздел «Розыгрыш 10.10»: учёт участников, выгрузка для Excel, выбор победителей на камеру.
export default function RaffleAdmin({ secret, search }: { secret: string; search: string }) {
  const [data, setData] = useState<AdminRaffle | null>(null);
  const [error, setError] = useState("");
  const [drawing, setDrawing] = useState(false);
  const [reel, setReel] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<RaffleWinner[]>([]);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/raffle", { headers: { "x-admin-secret": secret } });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Ошибка загрузки");
      setData(d);
    } catch (e: any) {
      setError(e?.message || "Ошибка загрузки");
    }
  }, [secret]);

  useEffect(() => { load(); }, [load]);

  const downloadCsv = async () => {
    setError("");
    const r = await fetch("/api/admin/raffle?format=csv", { headers: { "x-admin-secret": secret } });
    if (!r.ok) {
      setError("Не удалось выгрузить таблицу");
      return;
    }
    const url = URL.createObjectURL(await r.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = `${RAFFLE.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Только визуал для записи экрана: победители уже выбраны и сохранены сервером.
  const animate = async (draw: RaffleDraw) => {
    const names = draw.participants.map((p) => p.name);
    const shown: RaffleWinner[] = [];
    for (const winner of draw.winners) {
      for (let delay = 60; delay < 400; delay = Math.round(delay * 1.12)) {
        setReel(names[Math.floor(Math.random() * names.length)]);
        await sleep(delay);
      }
      setReel(winner.name);
      await sleep(1200);
      shown.push(winner);
      setRevealed([...shown]);
    }
  };

  const runDraw = async (force: boolean) => {
    if (force && !window.confirm("Переиграть розыгрыш? Прошлые итоги останутся в истории, но победители сменятся.")) return;
    setError("");
    setRevealed([]);
    setDrawing(true);
    try {
      const r = await fetch("/api/admin/raffle/draw", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ force }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Ошибка розыгрыша");
      await animate(d.draw);
      await load();
    } catch (e: any) {
      setError(e?.message || "Ошибка розыгрыша");
    } finally {
      setReel(null);
      setDrawing(false);
    }
  };

  if (!data) {
    return error ? <div style={{ ...card, marginBottom: 28, color: "#f87171" }}>🎁 Розыгрыш: {error}</div> : null;
  }

  const acceptingEntries = Date.now() < Date.parse(RAFFLE.endsAt);
  const eligibleCount = data.participants.filter((p) => p.eligible).length;
  const canDraw = !acceptingEntries && eligibleCount > 0;
  const rows = data.participants.filter((p) =>
    matchesUser({ id: p.user_id, telegram_id: p.telegram_id, username: p.username }, search)
  );
  const cell: CSSProperties = { padding: "8px 8px" };

  return (
    <div style={{ ...card, marginBottom: 28 }}>
      <h2 style={{ fontSize: 17, marginTop: 0, marginBottom: 6 }}>🎁 {RAFFLE.title}</h2>
      <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 14 }}>
        Участвуют (оба условия): <b style={{ color: "#fff" }}>{eligibleCount}</b> · с прогрессом: {data.participants.length} ·
        приём {RAFFLE.deadlineLabel}, итоги {RAFFLE.drawDateLabel}
      </div>

      <div style={{ background: "#0f172a", borderRadius: 12, padding: 16, marginBottom: 14, textAlign: "center" }}>
        {!data.tableReady ? (
          <div style={{ color: "#fbbf24", fontSize: 14 }}>
            Чтобы сохранять итоги, выполни <code>raffle_draws.sql</code> в Supabase → SQL Editor.
          </div>
        ) : drawing ? (
          <>
            <div style={{ fontSize: "clamp(22px, 5vw, 34px)", fontWeight: 800, minHeight: 48, color: "#ffc107" }}>
              {reel ?? "…"}
            </div>
            {revealed.map((w, i) => (
              <div key={w.user_id} style={{ fontSize: 18, marginTop: 6 }}>
                🏆 {i + 1}. {w.name} — {w.prize?.label}
              </div>
            ))}
          </>
        ) : data.draw ? (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
              🏆 Победители · выбраны {new Date(data.draw.drawn_at).toLocaleString("ru-RU")}
            </div>
            {data.draw.winners.map((w, i) => (
              <div key={w.user_id} style={{ fontSize: 16, marginTop: 4 }}>
                {i + 1}. {w.name} — {w.prize?.label} <span style={{ color: "#94a3b8" }}>(друзей: {w.friends})</span>
              </div>
            ))}
            <button
              onClick={() => runDraw(true)}
              style={{ ...btn, background: "#334155", padding: "6px 12px", fontSize: 12, marginTop: 12 }}
            >
              Переиграть
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => runDraw(false)}
              disabled={!canDraw}
              style={{ ...btn, fontSize: 18, padding: "14px 28px", opacity: canDraw ? 1 : 0.4, cursor: canDraw ? "pointer" : "default" }}
            >
              🎲 Выбрать {RAFFLE.winnersCount} победителей
            </button>
            {acceptingEntries && (
              <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 8 }}>
                Доступно после 10.10, 23:59 GMT — пока идёт приём заявок
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <button onClick={downloadCsv} style={{ ...btn, background: "#0f766e", padding: "8px 14px" }}>
          ⬇️ Скачать таблицу (Excel)
        </button>
        <button onClick={load} style={{ ...btn, background: "#334155", padding: "8px 14px" }}>↻ Обновить</button>
      </div>
      {error && <div style={{ color: "#f87171", fontSize: 14, marginBottom: 10 }}>{error}</div>}

      {rows.length === 0 ? (
        <div style={{ color: "#94a3b8", fontSize: 14 }}>
          {data.participants.length ? "Ничего не найдено." : "Пока никто не выполнил ни одного условия."}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ color: "#94a3b8", textAlign: "left" }}>
                <th style={cell}>Участник</th>
                <th style={cell}>Telegram ID</th>
                <th style={{ ...cell, textAlign: "right" }}>Заданий</th>
                <th style={{ ...cell, textAlign: "right" }}>Друзей</th>
                <th style={cell}>Участвует</th>
                <th style={cell}>Приз при победе</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.user_id} style={{ borderTop: "1px solid #334155" }}>
                  <td style={cell}>{p.name}</td>
                  <td style={{ ...cell, fontFamily: "monospace", color: "#cbd5e1" }}>{p.telegram_id || "—"}</td>
                  <td style={{ ...cell, textAlign: "right" }}>{p.tasks}</td>
                  <td style={{ ...cell, textAlign: "right" }}>{p.friends}</td>
                  <td style={cell}>{p.eligible ? "✅" : "—"}</td>
                  <td style={cell}>{p.prize?.label || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
