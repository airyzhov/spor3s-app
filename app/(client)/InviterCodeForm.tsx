"use client";
import { useState } from "react";
import { REFERRAL_WELCOME_SC } from "../../lib/levelUtils";

interface InviterCodeFormProps {
  userId: string;
  // Привязка прошла — кабинет перечитывает статистику приглашений и панель SC
  onClaimed: () => void;
}

// Поле «Код друга» в разделе «Реферальная система»: пришёл без ссылки — вводит @username или
// Telegram ID пригласившего и сразу получает приветственные SC. Правила — lib/referral.ts
// claimReferral, API — /api/referral-bonus. Показывается, пока пригласившего и покупок нет.
export default function InviterCodeForm({ userId, onClaimed }: InviterCodeFormProps) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const disabled = busy || !code.trim();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    setBusy(true);
    setError(null);
    try {
      const resp = await fetch("/api/referral-bonus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, code: code.trim() }),
      });
      const json = await resp.json();
      if (!resp.ok || !json?.success) {
        setError(json?.error || "Не получилось, попробуйте ещё раз");
        return;
      }
      onClaimed();
    } catch {
      setError("Нет связи — попробуйте ещё раз");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      style={{
        background: "rgba(16, 185, 129, 0.1)",
        border: "1px solid rgba(16, 185, 129, 0.45)",
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        width: "100%",
        boxSizing: "border-box",
        textAlign: "left",
      }}
    >
      <div style={{ fontSize: "clamp(13px, 3.3vw, 15px)", fontWeight: 700, color: "#fff", marginBottom: 4 }}>
        🤝 Вас пригласил друг?
      </div>
      <div style={{ fontSize: "clamp(12px, 3vw, 13px)", color: "#ccc", marginBottom: 10, lineHeight: 1.4 }}>
        Введите его @username или ID — и сразу получите {REFERRAL_WELCOME_SC} SC
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          type="text"
          aria-label="Код друга"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="@username или ID друга"
          maxLength={40}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          style={{
            flex: "1 1 160px",
            minWidth: 0,
            boxSizing: "border-box",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: 8,
            color: "#fff",
            padding: "9px 12px",
            fontSize: 14,
          }}
        />
        <button
          type="submit"
          disabled={disabled}
          style={{
            flex: "0 0 auto",
            background: disabled ? "rgba(255,255,255,0.15)" : "linear-gradient(45deg, #10b981, #059669)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "9px 14px",
            fontSize: 14,
            fontWeight: 700,
            cursor: disabled ? "not-allowed" : "pointer",
          }}
        >
          {busy ? "⏳" : `Получить ${REFERRAL_WELCOME_SC} SC`}
        </button>
      </div>
      {error && (
        <div role="alert" style={{ marginTop: 8, fontSize: 13, color: "#ff6b6b" }}>
          {error}
        </div>
      )}
    </form>
  );
}
