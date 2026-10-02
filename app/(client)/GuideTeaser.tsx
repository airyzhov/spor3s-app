"use client";
import { useEffect, useState } from "react";
import { GUIDE_LESSONS, GUIDE_REWARD_SC } from "../../lib/newbieGuide";

// Плашка гида новичка на главной (под строкой розыгрыша): пока гид не пройден, ведёт в кабинет
// и сразу открывает окно гида. Нет статуса (гость, ошибка сети) — плашку не показываем.
export default function GuideTeaser({ userId, onOpen }: { userId?: string; onOpen: () => void }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch(`/api/guide?user_id=${encodeURIComponent(userId)}`);
        const json = await resp.json();
        if (!cancelled) setShow(!!json?.success && !json.completed);
      } catch {
        // без статуса не зовём: вдруг гид уже пройден
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  if (!show) return null;

  return (
    <div style={{ padding: "0 20px", marginBottom: 12 }}>
      <button
        type="button"
        onClick={onOpen}
        style={{
          width: "100%",
          background: "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(51,51,255,0.16))",
          border: "2px solid rgba(16,185,129,0.6)",
          borderRadius: 16,
          cursor: "pointer",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          color: "#fff",
          textAlign: "left",
        }}
      >
        <span style={{ fontSize: "clamp(14px, 3.6vw, 17px)", fontWeight: 800 }}>
          🎓 Гид новичка: {GUIDE_LESSONS.length} уроков
        </span>
        <span style={{ fontSize: "clamp(12px, 3vw, 14px)", fontWeight: 700, color: "#6ee7b7", whiteSpace: "nowrap" }}>
          +{GUIDE_REWARD_SC} SC <span aria-hidden="true">→</span>
        </span>
      </button>
    </div>
  );
}
