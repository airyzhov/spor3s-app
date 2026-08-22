"use client";
import { CSSProperties } from "react";
import { plural } from "../../lib/plural";

interface TasksBannerProps {
  left: number;
  bonusPerTask: number;
  onClick: () => void;
  style?: CSSProperties;
}

// Плашка невыполненных заданий. Одна и та же на главном экране и в кабинете,
// поэтому живёт отдельным компонентом, а не копией разметки в двух местах.
export default function TasksBanner({ left, bonusPerTask, onClick, style }: TasksBannerProps) {
  if (left <= 0) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        background: "rgba(255,193,7,0.12)",
        border: "2px solid rgba(255,193,7,0.5)",
        borderRadius: 16,
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        cursor: "pointer",
        color: "#ffc107",
        fontSize: "clamp(13px, 3.2vw, 15px)",
        fontWeight: 700,
        boxSizing: "border-box",
        textAlign: "left",
        ...style
      }}
    >
      <span>
        🎯 Получи {left * bonusPerTask} SC за {left} {plural(left, "задание", "задания", "заданий")}
      </span>
      <span>→</span>
    </button>
  );
}
