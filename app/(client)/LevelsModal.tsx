"use client";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { LEVEL_CONFIG, getLevelInfo, levelRequirementText, formatOrderAmount } from "../../lib/levelUtils";

interface LevelsModalProps {
  totalEarned: number; // SC за всё время — от них, а не от баланса, считается уровень
  ordersAmount: number;
  ordersCount: number;
  onClose: () => void;
}

// Всплывающее окно «Уровни и награды»: текущий уровень, прогресс до следующего по каждому
// требованию (SC и заказы) и все уровни с наградами. Открывается из панели SC в кабинете.
// Рендерится в body: внутри кабинета его перекрыли бы навигация и кнопка «наверх».
export default function LevelsModal({ totalEarned, ordersAmount, ordersCount, onClose }: LevelsModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const info = getLevelInfo(totalEarned, ordersAmount, ordersCount);
  const current = LEVEL_CONFIG.find(l => l.level === info.level) ?? LEVEL_CONFIG[0];
  const next = LEVEL_CONFIG.find(l => l.level === info.nextLevel) ?? null;

  const text = { fontSize: "clamp(12px, 3.2vw, 14px)", color: "#ddd", lineHeight: 1.5 };
  const heading = { fontSize: "clamp(13px, 3.4vw, 15px)", fontWeight: 700, color: "#fff", margin: "16px 0 8px" };

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 100000
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="levels-title"
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 440,
          maxHeight: "90vh",
          overflowY: "auto",
          background: "linear-gradient(135deg, #1a1a40, #2d0b3a)",
          border: "2px solid rgba(255,255,255,0.15)",
          borderRadius: 18,
          padding: 18,
          boxSizing: "border-box",
          color: "#fff"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <h2 id="levels-title" style={{ margin: 0, fontSize: "clamp(17px, 4.4vw, 20px)" }}>🏆 Уровни и награды</h2>
          <button
            type="button"
            aria-label="Закрыть"
            onClick={onClose}
            style={{ background: "rgba(255,255,255,0.12)", border: "none", color: "#fff", borderRadius: 10, width: 34, height: 34, fontSize: 16, cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        <div style={heading}>Твой уровень: <span style={{ color: "#ffc107" }}>{current.name}</span></div>
        <ul style={{ ...text, margin: 0, paddingLeft: 18 }}>
          {current.benefits.map(b => <li key={b}>{b}</li>)}
        </ul>

        {next ? (
          <>
            <div style={heading}>До уровня {next.name}</div>
            <div style={{ display: "grid", gap: 10 }}>
              <Progress label="SC за всё время" value={totalEarned} target={next.scRequired} format={n => `${n}`} />
              {next.ordersCountRequired > 0 && (
                <Progress label="Заказы" value={ordersCount} target={next.ordersCountRequired} format={n => `${n}`} />
              )}
              {next.ordersAmountRequired > 0 && (
                <Progress label="Сумма заказов" value={ordersAmount} target={next.ordersAmountRequired} format={formatOrderAmount} />
              )}
            </div>
          </>
        ) : (
          <div style={{ ...text, marginTop: 12, color: "#10b981", fontWeight: 700 }}>🎉 Это максимальный уровень</div>
        )}

        <div style={heading}>Все уровни</div>
        <div style={{ display: "grid", gap: 8 }}>
          {LEVEL_CONFIG.map(l => {
            const isCurrent = l.level === current.level;
            const reached = l.level < current.level;
            return (
              <div
                key={l.code}
                data-level={l.code}
                style={{
                  borderRadius: 12,
                  padding: "10px 12px",
                  background: isCurrent ? "rgba(255,193,7,0.14)" : "rgba(255,255,255,0.06)",
                  border: isCurrent ? "2px solid rgba(255,193,7,0.6)" : "1px solid rgba(255,255,255,0.12)",
                  opacity: reached || isCurrent ? 1 : 0.85
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                  <span style={{ fontWeight: 700, fontSize: "clamp(13px, 3.4vw, 15px)" }}>{l.name}</span>
                  <span style={{ fontSize: 12, color: isCurrent ? "#ffc107" : reached ? "#10b981" : "#aaa", whiteSpace: "nowrap" }}>
                    {isCurrent ? "твой уровень" : reached ? "✅ пройден" : "🔒"}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#aaa", margin: "2px 0 4px" }}>{levelRequirementText(l)}</div>
                <div style={text}>{l.benefits.join(" · ")}</div>
              </div>
            );
          })}
        </div>

        <div style={{ ...text, fontSize: 12, color: "#aaa", marginTop: 14 }}>
          Уровень считается по SC, заработанным за всё время: если потратить SC на скидку, уровень не упадёт.
          Награды прошлых уровней сохраняются.
        </div>
      </div>
    </div>,
    document.body
  );
}

function Progress({ label, value, target, format }: { label: string; value: number; target: number; format: (n: number) => string }) {
  const done = value >= target;
  const share = target > 0 ? Math.min(1, value / target) : 1;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: "clamp(12px, 3.2vw, 14px)", color: "#ddd", marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ color: done ? "#10b981" : "#fff", fontWeight: 600, whiteSpace: "nowrap" }}>
          {format(value)} / {format(target)} {done ? "✅" : ""}
        </span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.15)", overflow: "hidden" }}>
        <div style={{
          width: `${Math.round(share * 100)}%`,
          height: "100%",
          background: done ? "#10b981" : "linear-gradient(45deg, #ff00cc, #3333ff)"
        }} />
      </div>
    </div>
  );
}
