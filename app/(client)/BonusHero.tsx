"use client";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { levelNeedsText, type LevelNeeds } from "../../lib/levelUtils";
import { SC_MAX_SHARE } from "../../lib/orderPricing";
import LevelsModal from "./LevelsModal";
import HowItWorksModal from "./HowItWorksModal";

type Summary = {
  sc: number;
  totalEarned: number;
  level: { name: string; needs: LevelNeeds | null };
  orders?: { amount: number; count: number };
  invitedBy?: { name: string; welcomeSc: number } | null;
};

interface BonusHeroProps {
  userId?: string;
  refreshKey?: number; // растёт после начисления SC в кабинете — перечитать
  onOpenHistory: () => void; // «🧾 История ›» — раскрыть историю SC ниже и прокрутить к ней
}

const chip: CSSProperties = {
  background: "rgba(255,255,255,0.1)",
  border: "1px solid rgba(255,255,255,0.25)",
  color: "#fff",
  borderRadius: 999,
  padding: "7px 12px",
  fontSize: "clamp(12px, 3.2vw, 14px)",
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

// Шапка кабинета (экран как у Walt, 01.10): крупно баланс SC и сколько это рублей скидки, чего не
// хватает до уровня, кнопки «уровень», «История» и «Как это работает». Данные — /api/home-summary.
export default function BonusHero({ userId, refreshKey, onOpenHistory }: BonusHeroProps) {
  const [data, setData] = useState<Summary | null>(null);
  const [levelsOpen, setLevelsOpen] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const closeLevels = useCallback(() => setLevelsOpen(false), []);
  const closeHow = useCallback(() => setHowOpen(false), []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch(`/api/home-summary?user_id=${userId}`);
        const json = await resp.json();
        if (!cancelled && json?.success) setData(json);
      } catch {
        // шапка необязательна — молча остаёмся без неё
      }
    })();
    return () => { cancelled = true; };
  }, [userId, refreshKey]);

  if (!data) return null;

  const share = Math.round(SC_MAX_SHARE * 100);
  const needs = data.level.needs;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        background: "linear-gradient(135deg, rgba(255,0,204,0.16), rgba(51,51,255,0.16))",
        border: "2px solid rgba(255,255,255,0.15)",
        borderRadius: 20,
        padding: "clamp(18px, 5vw, 24px) clamp(14px, 4vw, 20px)",
        textAlign: "center",
        color: "#fff",
      }}>
        <div style={{ fontSize: "clamp(14px, 3.6vw, 16px)", color: "#ddd", fontWeight: 600 }}>Ваши SC</div>
        <div style={{ fontSize: "clamp(44px, 13vw, 60px)", fontWeight: 800, lineHeight: 1.1, margin: "4px 0" }}>{data.sc}</div>
        <div style={{ fontSize: "clamp(13px, 3.4vw, 15px)", color: "#10b981", fontWeight: 600 }}>
          {data.sc > 0
            ? `= ${data.sc} ₽ скидки · до ${share}% суммы заказа`
            : `1 SC = 1 ₽ скидки · до ${share}% суммы заказа`}
        </div>
        {needs && (
          <div style={{ fontSize: "clamp(12px, 3.2vw, 14px)", color: "#bbb", marginTop: 6 }}>
            До уровня {needs.name}: ещё {levelNeedsText(needs)}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 14 }}>
          <button
            type="button"
            onClick={() => setLevelsOpen(true)}
            style={{ ...chip, color: "#ffc107", background: "rgba(255,193,7,0.12)", border: "1px solid rgba(255,193,7,0.5)" }}
          >
            {data.level.name} ›
          </button>
          <button type="button" onClick={onOpenHistory} style={chip}>🧾 История ›</button>
          <button type="button" onClick={() => setHowOpen(true)} style={chip}>❓ Как это работает</button>
        </div>

        {/* Пришёл по приглашению — кто пригласил и сколько SC дали сразу */}
        {data.invitedBy && (
          <div style={{ marginTop: 12, fontSize: "clamp(12px, 3vw, 14px)", color: "#10b981", fontWeight: 600 }}>
            🤝 Вас пригласил {data.invitedBy.name}
            {data.invitedBy.welcomeSc > 0 && ` · 🎁 +${data.invitedBy.welcomeSc} SC`}
          </div>
        )}
      </div>

      {levelsOpen && (
        <LevelsModal
          totalEarned={data.totalEarned}
          ordersAmount={data.orders?.amount ?? 0}
          ordersCount={data.orders?.count ?? 0}
          onClose={closeLevels}
        />
      )}
      {howOpen && <HowItWorksModal onClose={closeHow} />}
    </div>
  );
}
