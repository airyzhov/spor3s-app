"use client";
import { useState, useEffect } from "react";

interface AIAgentControlProps {
  userId?: string | null;
  telegramUser?: {
    telegram_id: string;
    first_name?: string;
    last_name?: string;
    username?: string;
  } | null;
}

export default function AIAgentControl({ userId, telegramUser }: AIAgentControlProps) {
  const [isAgentActive, setIsAgentActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agentStatus, setAgentStatus] = useState<string>('Неактивен');

  // Проверяем статус агента при загрузке
  useEffect(() => {
    const checkAgentStatus = async () => {
      if (!userId) return;
      
      try {
        const response = await fetch(`/api/ai-agent-status?user_id=${userId}`);
        if (response.ok) {
          const data = await response.json();
          setIsAgentActive(data.isActive || false);
          setAgentStatus(data.isActive ? 'Активен' : 'Неактивен');
        }
      } catch (error) {
        console.error('Ошибка проверки статуса агента:', error);
      }
    };

    checkAgentStatus();
  }, [userId]);

  const handleToggleAgent = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/ai-agent-toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          action: isAgentActive ? 'stop' : 'start'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setIsAgentActive(!isAgentActive);
        setAgentStatus(!isAgentActive ? 'Активен' : 'Неактивен');
        
        // Показываем уведомление
        const notification = document.createElement('div');
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: ${!isAgentActive ? 'linear-gradient(45deg, #00ff88, #00cc6a)' : 'linear-gradient(45deg, #ff416c, #ff4b2b)'};
          color: white;
          padding: 15px 20px;
          border-radius: 12px;
          font-weight: 600;
          z-index: 10000;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
          animation: slideInRight 0.3s ease-out;
          max-width: 300px;
          word-wrap: break-word;
        `;
        notification.innerHTML = `${!isAgentActive ? '✅' : '⏹️'} <strong>AI Агент ${!isAgentActive ? 'запущен' : 'остановлен'}!</strong><br><small>${!isAgentActive ? 'Теперь агент будет отвечать на сообщения' : 'Агент больше не будет отвечать'}</small>`;
        document.body.appendChild(notification);

        // Удаляем уведомление через 3 секунды
        setTimeout(() => {
          notification.style.animation = 'slideOutRight 0.3s ease-out';
          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
          }, 300);
        }, 3000);
      } else {
        console.error('Ошибка переключения агента:', response.status);
      }
    } catch (error) {
      console.error('Ошибка переключения агента:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isRealTelegram = telegramUser && telegramUser.telegram_id && !telegramUser.telegram_id.startsWith('test-user-');

  return (
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
        fontSize: "clamp(18px, 4vw, 24px)", 
        fontWeight: 600, 
        marginBottom: 15,
        background: "linear-gradient(45deg, #ff00cc, #3333ff)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text"
      }}>
        🤖 AI Агент
      </div>
      
      <div style={{ 
        fontSize: "clamp(14px, 3vw, 16px)", 
        color: "#ccc",
        marginBottom: 20
      }}>
        {isRealTelegram ? 'Управление AI агентом в Telegram' : 'Тестовый режим'}
      </div>

      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 15,
        marginBottom: 20
      }}>
        <div style={{
          padding: "8px 16px",
          borderRadius: 20,
          background: isAgentActive ? "rgba(0, 255, 136, 0.2)" : "rgba(255, 65, 108, 0.2)",
          border: `2px solid ${isAgentActive ? "#00ff88" : "#ff416c"}`,
          color: isAgentActive ? "#00ff88" : "#ff416c",
          fontSize: "14px",
          fontWeight: 600
        }}>
          {isAgentActive ? "🟢 Активен" : "🔴 Неактивен"}
        </div>
      </div>

      <div style={{
        display: "flex",
        gap: 15,
        justifyContent: "center",
        flexWrap: "wrap"
      }}>
        <button
          onClick={handleToggleAgent}
          disabled={!userId || isLoading}
          style={{
            background: isAgentActive 
              ? "linear-gradient(45deg, #ff416c, #ff4b2b)"
              : "linear-gradient(45deg, #00ff88, #00cc6a)",
            border: "none",
            borderRadius: 25,
            color: "#fff",
            padding: "12px 24px",
            fontSize: 16,
            fontWeight: 600,
            cursor: userId && !isLoading ? "pointer" : "not-allowed",
            transition: "all 0.3s ease",
            opacity: userId && !isLoading ? 1 : 0.5,
            minWidth: 120
          }}
          onMouseOver={(e) => {
            if (userId && !isLoading) {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(0, 0, 0, 0.3)";
            }
          }}
          onMouseOut={(e) => {
            if (userId && !isLoading) {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }
          }}
        >
          {isLoading ? (
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 16,
                height: 16,
                border: "2px solid #fff",
                borderTop: "2px solid transparent",
                borderRadius: "50%",
                animation: "spin 1s linear infinite"
              }}></div>
              {isAgentActive ? "Остановка..." : "Запуск..."}
            </span>
          ) : (
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {isAgentActive ? "⏹️ Остановить" : "▶️ Запустить"}
            </span>
          )}
        </button>

        {isRealTelegram && (
          <button
            onClick={() => {
              // Открываем инструкцию по подключению
              const notification = document.createElement('div');
              notification.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 20px;
                border-radius: 12px;
                font-size: 14px;
                z-index: 10001;
                max-width: 400px;
                text-align: center;
                line-height: 1.5;
              `;
              notification.innerHTML = `
                <h3 style="margin-bottom: 15px; color: #ff00cc;">🔗 Подключение к Telegram</h3>
                <p style="margin-bottom: 10px;">Для полной работы AI агента:</p>
                <ol style="text-align: left; margin: 0; padding-left: 20px;">
                  <li>Откройте @spor3z в Telegram</li>
                  <li>Отправьте команду /start</li>
                  <li>Следуйте инструкциям бота</li>
                  <li>Вернитесь в WebApp</li>
                </ol>
                <button onclick="this.parentElement.remove()" style="
                  margin-top: 15px;
                  background: #ff00cc;
                  border: none;
                  color: white;
                  padding: 8px 16px;
                  border-radius: 8px;
                  cursor: pointer;
                ">Понятно</button>
              `;
              document.body.appendChild(notification);
            }}
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              border: "2px solid rgba(255, 255, 255, 0.3)",
              borderRadius: 25,
              color: "#fff",
              padding: "12px 20px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.3s ease"
            }}
          >
            📱 Подключить Telegram
          </button>
        )}
      </div>

      <div style={{ 
        fontSize: "12px", 
        color: "#999",
        marginTop: 15,
        lineHeight: 1.4
      }}>
        {isAgentActive ? 
          "AI агент активен и будет отвечать на ваши сообщения в Telegram" :
          "Запустите AI агента для автоматических ответов в Telegram"
        }
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
} 