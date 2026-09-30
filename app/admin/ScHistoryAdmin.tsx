"use client";
import { useEffect, useState, type CSSProperties } from "react";
import { formatScAmount, scDateLabel, shortOrderIds, type ScTransaction } from "../../lib/scHistory";
import { plural } from "../../lib/plural";

// История SC выбранного в «💰 Начислить SC» пользователя: новые сверху, ручные операции помечены.
// refreshKey растёт после начисления — история перечитывается.
const row: CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "baseline",
  padding: "8px 0",
  borderTop: "1px solid #334155",
  fontSize: 14,
};
const muted: CSSProperties = { color: "#94a3b8", fontSize: 14 };

interface ScHistoryAdminProps {
  userId: string;
  secret: string;
  refreshKey?: number;
}

export default function ScHistoryAdmin({ userId, secret, refreshKey = 0 }: ScHistoryAdminProps) {
  // История помнит, чья она: при смене человека не показываем чужие строки, пока грузятся новые
  const [loaded, setLoaded] = useState<{ userId: string; rows: ScTransaction[] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setError("");
    fetch(`/api/admin/sc-history?user_id=${encodeURIComponent(userId)}`, { headers: { "x-admin-secret": secret } })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error || "Не удалось загрузить историю");
        return (d.transactions || []) as ScTransaction[];
      })
      .then((rows) => { if (!cancelled) setLoaded({ userId, rows }); })
      .catch((e) => { if (!cancelled) setError(e?.message || "Не удалось загрузить историю"); });
    return () => { cancelled = true; };
  }, [userId, secret, refreshKey]);

  const rows = loaded?.userId === userId ? loaded.rows : null;

  return (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ fontSize: 15, margin: "0 0 8px" }}>
        🧾 История SC{rows ? ` — ${rows.length} ${plural(rows.length, "операция", "операции", "операций")}` : ""}
      </h3>
      {error && <div style={{ color: "#f87171", fontSize: 14 }}>{error}</div>}
      {!rows && !error && <div style={muted}>Загружаю…</div>}
      {rows && rows.length === 0 && <div style={muted}>Операций пока нет</div>}
      {rows?.map((t) => (
        <div key={t.id} style={row}>
          <span style={{ color: "#94a3b8", whiteSpace: "nowrap", fontFamily: "monospace", fontSize: 12 }}>
            {scDateLabel(t.created_at)}
          </span>
          <span style={{
            color: t.amount < 0 ? "#f87171" : "#4ade80",
            fontWeight: "bold",
            minWidth: 56,
            textAlign: "right",
            whiteSpace: "nowrap",
          }}>
            {formatScAmount(t.amount)}
          </span>
          <span>
            {shortOrderIds(t.description)}
            {t.source_type === "manual" && <span style={{ color: "#94a3b8" }}> · вручную</span>}
          </span>
        </div>
      ))}
    </div>
  );
}
