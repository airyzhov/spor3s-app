"use client";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { LEVEL_CONFIG, REFERRAL_PERCENT, REFERRAL_WELCOME_SC, SC_MECHANICS, SUBSCRIBE_TASK_SC } from "../../lib/levelUtils";
import { MONTH_GOAL } from "../../lib/monthGoal";
import { SC_MAX_SHARE } from "../../lib/orderPricing";
import { plural } from "../../lib/plural";

// Окно «Как это работает» из шапки кабинета: что такое SC, как их получить и что дают уровни.
// Суммы — из тех же констант, по которым начисляет сервер. Рендерится в body, как окно уровней.
export default function HowItWorksModal({ onClose }: { onClose: () => void }) {
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

  const target = MONTH_GOAL.reportsTarget;
  const [first, ...rest] = LEVEL_CONFIG.filter((l) => l.discountPercent > 0);
  const discounts = first
    ? [`${first.name} получает скидку ${first.discountPercent}% на любой заказ`, ...rest.map((l) => `${l.name} — ${l.discountPercent}%`)].join(", ")
    : "";

  const text = { fontSize: "clamp(13px, 3.4vw, 15px)", color: "#ddd", lineHeight: 1.55, margin: 0 };
  const heading = { fontSize: "clamp(14px, 3.6vw, 16px)", fontWeight: 700, color: "#fff", margin: "16px 0 8px" };

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
        zIndex: 100000,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="how-sc-title"
        onClick={(e) => e.stopPropagation()}
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
          color: "#fff",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <h2 id="how-sc-title" style={{ margin: 0, fontSize: "clamp(17px, 4.4vw, 20px)" }}>Как работают SC</h2>
          <button
            type="button"
            aria-label="Закрыть"
            onClick={onClose}
            style={{ background: "rgba(255,255,255,0.12)", border: "none", color: "#fff", borderRadius: 10, width: 34, height: 34, fontSize: 16, cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        <p style={{ ...text, marginTop: 12 }}>
          1 SC = 1 ₽ скидки. Потратить SC можно при заказе — до {Math.round(SC_MAX_SHARE * 100)}% суммы.
        </p>

        <div style={heading}>Как получить SC</div>
        <ul style={{ ...text, paddingLeft: 18, display: "grid", gap: 6 }}>
          <li>🎯 Подписки на Telegram, YouTube и Instagram — +{SUBSCRIBE_TASK_SC} SC за каждую</li>
          <li>
            👥 Друг по твоей ссылке — ему {REFERRAL_WELCOME_SC} SC сразу, тебе {Math.round(REFERRAL_PERCENT * 100)}% с каждого
            его оплаченного заказа
          </li>
          <li>🛒 Свой заказ — 1 SC за каждые 100 ₽ после оплаты</li>
          <li>
            🍄 Отчёт о самочувствии на курсе — +{SC_MECHANICS.weekly_survey.amount} SC в неделю, +{MONTH_GOAL.bonus} SC за {target}{" "}
            {plural(target, "отчёт", "отчёта", "отчётов")} в месяц
          </li>
        </ul>

        <div style={heading}>Уровни</div>
        <p style={text}>
          Чем больше SC и оплаченных заказов, тем выше уровень.{discounts ? ` ${discounts}.` : ""}
        </p>
      </div>
    </div>,
    document.body
  );
}
