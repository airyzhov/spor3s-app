"use client";
import { useState, useEffect } from "react";

interface DashboardProps {
  setStep?: (step: number) => void;
  userId?: string | null;
  telegramUser?: {
    telegram_id: string;
    first_name?: string;
    last_name?: string;
    username?: string;
  } | null;
}

export default function Dashboard({ setStep, userId, telegramUser }: DashboardProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    console.log('📊 Dashboard loaded with props:', { 
      userId: userId ? userId.slice(0, 12) + '...' : 'NULL',
      telegramUser: telegramUser ? {
        telegram_id: telegramUser.telegram_id,
        name: telegramUser.first_name
      } : 'NULL',
      setStep: !!setStep
    });
  }, [userId, telegramUser]);



  if (!mounted) return null;

  // Определяем тип пользователя и его данные
  const isRealTelegram = telegramUser && telegramUser.telegram_id && !telegramUser.telegram_id.startsWith('test-user-');
  const displayName = isRealTelegram 
    ? `${telegramUser.first_name || 'Пользователь'} ${telegramUser.last_name || ''}`.trim()
    : 'Пользователь';

  return (
    <div style={{ 
      maxWidth: 800, 
      margin: "0 auto", 
      color: "#fff", 
      padding: "clamp(15px, 4vw, 20px)",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      width: "100%"
    }}>


      {/* Баланс SC с логином пользователя */}
      <div style={{
        background: "linear-gradient(135deg, rgba(255, 0, 204, 0.1), rgba(51, 51, 255, 0.1))",
        borderRadius: 16,
        padding: "clamp(20px, 5vw, 25px)",
        marginBottom: 25,
        border: "2px solid #ff00cc",
        textAlign: "center",
        width: "100%",
        maxWidth: "600px"
      }}>
        <div style={{ 
          fontSize: "clamp(12px, 3vw, 14px)", 
          color: "#ccc",
          marginBottom: 10,
          fontFamily: "monospace"
        }}>
          {isRealTelegram && telegramUser?.username ? `@${telegramUser.username}` : 'ID: ' + (userId ? userId.slice(0, 8) + '...' + userId.slice(-4) : 'N/A')}
        </div>
        <div style={{ 
          fontSize: "clamp(36px, 8vw, 48px)", 
          marginBottom: 10,
          background: "linear-gradient(45deg, #ff00cc, #3333ff)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text"
        }}>
          💰 0
        </div>
        <div style={{ 
          fontSize: "clamp(18px, 4vw, 24px)", 
          fontWeight: 600, 
          color: "#ff00cc",
          marginBottom: 10
        }}>
          Spor3s Coins
        </div>
        <div style={{ 
          fontSize: "clamp(12px, 3vw, 14px)", 
          color: "#ccc" 
        }}>
          Ваш баланс
        </div>
      </div>


      {/* Статистика аккаунта */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "clamp(15px, 3vw, 20px)",
        marginBottom: 25,
        width: "100%",
        maxWidth: "700px"
      }}>
        <div style={{
          background: "rgba(255, 255, 255, 0.1)",
          borderRadius: 12,
          padding: 20,
          textAlign: "center"
        }}>
          <div style={{ fontSize: 24, marginBottom: 5 }}>📦</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 5 }}>Заказы</div>
          <div style={{ fontSize: 24, color: "#ff00cc" }}>0</div>
        </div>
        
        <div style={{
          background: "rgba(255, 255, 255, 0.1)",
          borderRadius: 12,
          padding: 20,
          textAlign: "center"
        }}>
          <div style={{ fontSize: 24, marginBottom: 5 }}>🎯</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 5 }}>Уровень</div>
          <div style={{ fontSize: 24, color: "#00ff88" }}>1</div>
        </div>
        
        <div style={{
          background: "rgba(255, 255, 255, 0.1)",
          borderRadius: 12,
          padding: 20,
          textAlign: "center"
        }}>
          <div style={{ fontSize: 24, marginBottom: 5 }}>🏆</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 5 }}>Достижения</div>
          <div style={{ fontSize: 24, color: "#ffcc00" }}>0</div>
        </div>
      </div>

      {/* Кнопки действий */}
      <div style={{
        display: "flex",
        gap: 15,
        flexWrap: "wrap",
        justifyContent: "center"
      }}>

        
        <button
          onClick={() => setStep && setStep(2)}
          disabled={!userId}
          style={{
            background: userId 
              ? "linear-gradient(45deg, #00ff88, #00cc6a)" 
              : "rgba(100, 100, 100, 0.5)",
            border: "none",
            borderRadius: 25,
            color: "#fff",
            padding: "12px 20px",
            fontSize: 14,
            fontWeight: 600,
            cursor: userId ? "pointer" : "not-allowed",
            transition: "all 0.3s ease",
            opacity: userId ? 1 : 0.5
          }}
        >
          🍄 Ваш прогресс
        </button>
      </div>

    </div>
  );
}