"use client";
import CopyLinkButton from "./CopyLinkButton";
import InviterCodeForm from "./InviterCodeForm";
import { openExternal } from "../../lib/openExternal";
import { referralLink, referralShareUrl, REFERRAL_TERMS } from "../../lib/referralLink";

interface ReferralPanelProps {
  userId?: string;
  telegramId?: string;
  stats: any | null; // /api/referral-stats → stats
  referralCode: string;
  invitedCount: number;
  referralBonus: number;
  onClaimed: () => void; // ввёл код друга — перечитать статистику и баланс
}

// Панель приглашения под строкой «👥 Пригласи друга» в «Как получить SC» — бывший раздел
// «🎁 Реферальная система» кабинета (перенесён 01.10 без изменений текста).
export default function ReferralPanel({
  userId, telegramId, stats, referralCode, invitedCount, referralBonus, onClaimed,
}: ReferralPanelProps) {
  const refLink = referralLink(telegramId);

  const copyReferralCode = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      alert('Реферальный код скопирован!');
    }
  };

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        color: "#fff",
        fontSize: "clamp(14px, 3.5vw, 16px)",
        lineHeight: "1.5",
        marginBottom: "20px",
        wordBreak: "break-word"
      }}>
        {REFERRAL_TERMS}
      </div>

      {/* Кто пригласил — или поле «Код друга» для того, кто пришёл без ссылки и ещё не покупал */}
      {stats?.invitedBy ? (
        <div style={{ marginBottom: 15, fontSize: "clamp(13px, 3.3vw, 15px)", color: "#10b981", fontWeight: 600 }}>
          🤝 Вас пригласил {stats.invitedBy.name}
          {stats.invitedBy.welcomeSc > 0 && ` · 🎁 +${stats.invitedBy.welcomeSc} SC`}
        </div>
      ) : stats?.canEnterInviterCode && userId ? (
        <InviterCodeForm userId={userId} onClaimed={onClaimed} />
      ) : null}

      {/* Персональная ссылка: друг кликает → бот сразу привязывает его к вам */}
      {refLink && (
        <div style={{
          background: "rgba(255, 255, 255, 0.1)",
          borderRadius: "12px",
          padding: "15px",
          marginBottom: "15px",
          width: "100%",
          boxSizing: "border-box"
        }}>
          <div style={{ fontSize: "clamp(12px, 3vw, 14px)", color: "#fff", marginBottom: "10px", fontWeight: 600 }}>
            🔗 Ваша персональная ссылка:
          </div>
          <div style={{
            background: "rgba(255, 255, 255, 0.2)",
            padding: "8px 12px",
            borderRadius: "8px",
            fontSize: "clamp(12px, 3vw, 14px)",
            color: "#ff7ae0",
            fontFamily: "monospace",
            wordBreak: "break-all",
            marginBottom: "10px"
          }}>
            {refLink}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <CopyLinkButton
              link={refLink}
              label="📋 Скопировать"
              style={{
                background: "#ff00cc", color: "#fff", border: "none", borderRadius: 8,
                padding: "8px 16px", fontSize: "clamp(12px, 3vw, 14px)", fontWeight: 700, cursor: "pointer"
              }}
            />
            <button
              onClick={() => openExternal(referralShareUrl(telegramId)!)}
              style={{
                background: "linear-gradient(45deg, #0088cc, #00a8ff)", color: "#fff", border: "none", borderRadius: 8,
                padding: "8px 16px", fontSize: "clamp(12px, 3vw, 14px)", fontWeight: 700, cursor: "pointer"
              }}
            >
              📤 Поделиться
            </button>
          </div>
        </div>
      )}

      {/* Гость из браузера: ссылки нет — подсказываем открыть через Telegram */}
      {!refLink && (
        <div style={{
          background: "rgba(0, 136, 204, 0.15)",
          border: "1px solid rgba(0, 168, 255, 0.5)",
          borderRadius: "12px",
          padding: "15px",
          marginBottom: "15px",
          width: "100%",
          boxSizing: "border-box",
          fontSize: "clamp(12px, 3vw, 14px)",
          color: "#fff",
          lineHeight: 1.5
        }}>
          🔗 Персональная реферальная ссылка появится здесь, если открыть
          приложение через Telegram:{" "}
          <span
            onClick={() => openExternal('https://t.me/spor3sbot')}
            style={{ color: "#00a8ff", textDecoration: "underline", cursor: "pointer", fontWeight: 700 }}
          >
            @spor3sbot
          </span>
        </div>
      )}

      {referralCode && (
        <div style={{
          background: "rgba(255, 255, 255, 0.1)",
          borderRadius: "12px",
          padding: "15px",
          marginBottom: "15px",
          width: "100%",
          boxSizing: "border-box"
        }}>
          <div style={{ fontSize: "clamp(12px, 3vw, 14px)", color: "#fff", marginBottom: "10px" }}>
            {refLink
              ? "Или ваш код — друг введёт его в кабинете или при заказе:"
              : "Ваш реферальный код:"}
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            flexWrap: "wrap"
          }}>
            <div style={{
              background: "rgba(255, 255, 255, 0.2)",
              padding: "8px 15px",
              borderRadius: "8px",
              fontSize: "clamp(14px, 3.5vw, 16px)",
              fontWeight: "bold",
              color: "#ff00cc",
              fontFamily: "monospace",
              wordBreak: "break-all"
            }}>
              {referralCode}
            </div>
            <button
              onClick={copyReferralCode}
              style={{
                background: "#ff00cc",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "8px 12px",
                fontSize: "clamp(12px, 3vw, 14px)",
                cursor: "pointer",
                transition: "transform 0.2s",
                whiteSpace: "nowrap"
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.05)"}
              onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
              📋
            </button>
          </div>
        </div>
      )}

      {/* Статистика рефералов */}
      {stats && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: "10px",
          marginTop: "15px",
          width: "100%"
        }}>
          <div style={{
            background: "rgba(255, 255, 255, 0.1)",
            borderRadius: "8px",
            padding: "10px",
            textAlign: "center",
            boxSizing: "border-box"
          }}>
            <div style={{ fontSize: "clamp(10px, 2.5vw, 12px)", color: "#ccc", marginBottom: "5px" }}>
              Приглашено
            </div>
            <div style={{ fontSize: "clamp(16px, 4vw, 18px)", fontWeight: "bold", color: "#ff00cc" }}>
              {invitedCount}
            </div>
          </div>

          <div style={{
            background: "rgba(255, 255, 255, 0.1)",
            borderRadius: "8px",
            padding: "10px",
            textAlign: "center",
            boxSizing: "border-box"
          }}>
            <div style={{ fontSize: "clamp(10px, 2.5vw, 12px)", color: "#ccc", marginBottom: "5px" }}>
              Кешбек
            </div>
            <div style={{ fontSize: "clamp(16px, 4vw, 18px)", fontWeight: "bold", color: "#10b981" }}>
              {referralBonus}₽
            </div>
          </div>
        </div>
      )}

      {/* Список приглашённых: кто, статус, сколько SC принёс */}
      {stats?.referrals?.length > 0 && (
        <div style={{ marginTop: "12px", width: "100%" }}>
          <div style={{ fontSize: "13px", color: "#ccc", marginBottom: "8px" }}>
            👥 Ваши приглашённые:
          </div>
          {stats.referrals.map((r: any) => {
            const u = r.referred_user;
            const name = u?.username
              ? `@${u.username}`
              : `ID ${String(u?.telegram_id || "").slice(0, 4)}…`;
            return (
              <div key={r.id} style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "8px",
                flexWrap: "wrap",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "8px",
                padding: "8px 12px",
                marginBottom: "6px",
                fontSize: "13px",
                boxSizing: "border-box"
              }}>
                <span style={{ fontWeight: 600 }}>👤 {name}</span>
                <span style={{ color: r.status === "completed" ? "#10b981" : "#f59e0b" }}>
                  {r.status === "completed"
                    ? `✅ активен${r.scEarned > 0 ? ` · принёс ${r.scEarned} SC` : ""}`
                    : "⏳ ждёт первого заказа"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
