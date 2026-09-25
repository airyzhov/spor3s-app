"use client";
import { useEffect, useState, type ReactNode } from "react";

interface CabinetSectionProps {
  title: ReactNode;
  summary?: ReactNode; // коротко справа в заголовке: «2 заказа», «неделя 3»…
  storageKey: string; // раскрыт/свёрнут — как оставил человек
  forceOpen?: boolean; // раскрыть сразу (пришли по кнопке из бота)
  children: ReactNode;
}

// Раздел кабинета: изначально свёрнут, раскрывается по нажатию на заголовок (просьба владельца 25.09).
export default function CabinetSection({ title, summary, storageKey, forceOpen, children }: CabinetSectionProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      setOpen(localStorage.getItem(storageKey) === "1");
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    try { localStorage.setItem(storageKey, next ? "1" : "0"); } catch {}
  };

  return (
    <div style={{
      background: "linear-gradient(135deg, #0f172a, #1e293b)",
      borderRadius: 20,
      padding: "clamp(16px, 4.5vw, 22px)",
      marginBottom: 20,
      border: "2px solid rgba(255,255,255,0.1)",
      width: "100%",
      boxSizing: "border-box",
      overflow: "hidden",
      color: "#fff",
    }}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        style={{
          width: "100%",
          background: "none",
          border: "none",
          color: "#fff",
          cursor: "pointer",
          padding: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          textAlign: "left",
        }}
      >
        <span style={{ fontSize: "clamp(17px, 4.4vw, 20px)", fontWeight: 700 }}>{title}</span>
        <span style={{ fontSize: "clamp(12px, 3vw, 14px)", color: "#ccc", fontWeight: 500, whiteSpace: "nowrap" }}>
          {summary} {open ? "▲" : "▼"}
        </span>
      </button>
      {open && <div style={{ marginTop: 16 }}>{children}</div>}
    </div>
  );
}
