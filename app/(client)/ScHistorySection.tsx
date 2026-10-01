"use client";
import { useEffect, useState } from "react";
import CabinetSection from "./CabinetSection";
import { formatScAmount, scDateLabel, shortOrderIds, type ScTransaction } from "../../lib/scHistory";

interface ScHistorySectionProps {
  userId?: string;
  refreshKey?: number; // растёт после начисления в кабинете — перечитать
  forceOpen?: boolean; // пришли по кнопке бота «🧾 История SC» (?open=sc)
  openSignal?: number; // кнопка «🧾 История ›» в шапке кабинета — раскрыть (каждый раз)
}

// «🧾 История SC» в кабинете: все начисления и списания, новые сверху (просьба владельца 30.09).
// Нет операций — раздела нет. Данные — /api/sc-history.
export default function ScHistorySection({ userId, refreshKey = 0, forceOpen, openSignal }: ScHistorySectionProps) {
  const [rows, setRows] = useState<ScTransaction[]>([]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetch(`/api/sc-history?user_id=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled && Array.isArray(d?.transactions)) setRows(d.transactions); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [userId, refreshKey]);

  if (rows.length === 0) return null;

  return (
    <CabinetSection
      title="🧾 История SC"
      summary={`${rows.length}`}
      storageKey="spor3s_sc_history_open"
      forceOpen={forceOpen}
      openSignal={openSignal}
    >
      {rows.map((t) => (
        <div key={t.id} style={{
          display: "flex",
          gap: 10,
          alignItems: "baseline",
          padding: "10px 0",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          fontSize: "clamp(13px, 3.4vw, 15px)",
          textAlign: "left",
        }}>
          <span style={{ color: "#999", whiteSpace: "nowrap", fontSize: "clamp(11px, 3vw, 13px)" }}>{scDateLabel(t.created_at)}</span>
          {/* Ширина под «+1000 SC» — описания в строках начинаются с одной линии */}
          <span style={{ color: t.amount < 0 ? "#ff6b6b" : "#00ff88", fontWeight: 700, whiteSpace: "nowrap", minWidth: "4.8em" }}>
            {formatScAmount(t.amount)} SC
          </span>
          <span style={{ color: "#ddd" }}>{shortOrderIds(t.description)}</span>
        </div>
      ))}
    </CabinetSection>
  );
}
