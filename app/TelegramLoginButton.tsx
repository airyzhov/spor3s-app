"use client";
import { useState, useEffect } from 'react';

interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}

interface TelegramLoginButtonProps {
  onAuth?: (user: any) => void;
  onError?: (error: string) => void;
}

export default function TelegramLoginButton({ onAuth, onError }: TelegramLoginButtonProps = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [error, setError] = useState<string>("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;

    const checkTelegramWebApp = () => {
      try {
        if (window.Telegram?.WebApp) {
          const tg = window.Telegram.WebApp;
          if (tg.ready) { tg.ready(); }
          if (tg.setHeaderColor) { tg.setHeaderColor('#2d0b3a'); }
          if (tg.setBackgroundColor) { tg.setBackgroundColor('#1a1a40'); }

          if (tg.initDataUnsafe?.user) {
            setUser({
              id: tg.initDataUnsafe.user.id,
              first_name: tg.initDataUnsafe.user.first_name,
              last_name: tg.initDataUnsafe.user.last_name,
              username: tg.initDataUnsafe.user.username,
            });
            if (onAuth) onAuth(tg.initDataUnsafe.user);
          }
        } else {
          setError('Приложение должно быть открыто в Telegram');
        }
      } catch (error) {
        console.error('Ошибка при проверке Telegram WebApp:', error);
        setError('Ошибка инициализации Telegram WebApp');
      }
    };

    const timer = setTimeout(checkTelegramWebApp, 1000);
    return () => { 
      clearTimeout(timer); 
      setMounted(false); 
    };
  }, [onAuth]);

  const handleTelegramAuth = async () => {
    if (!mounted) return;
    
    try {
      setIsLoading(true);
      setError('');
      
      if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
        const telegramUser = window.Telegram.WebApp.initDataUnsafe.user;
        setUser(telegramUser);
        if (onAuth) onAuth(telegramUser);
      } else {
        throw new Error('Не удалось получить данные пользователя из Telegram');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка авторизации';
      setError(errorMessage);
      if (onError) onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualAuth = async () => {
    if (!mounted) return;
    
    try {
      setIsLoading(true);
      const mockTelegramId = 'test-user-' + Date.now();
      const response = await fetch('/api/init-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: mockTelegramId })
      });
      
      if (response.ok) {
        const userData = await response.json();
        const mockUser = { id: parseInt(mockTelegramId.replace('test-user-', '')), first_name: 'Test User' };
        setUser(mockUser);
        if (onAuth) onAuth({ ...mockUser, id: userData.id, telegram_id: mockTelegramId });
        setError('');
      } else {
        throw new Error('Ошибка авторизации через сервер');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ошибка подключения к серверу';
      setError(errorMessage);
      if (onError) onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div style={{ textAlign: 'center', padding: '10px', color: '#ccc' }}>
        <p>Загрузка Telegram интеграции...</p>
      </div>
    );
  }

  if (user) {
    return (
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '20px', 
        padding: '10px', 
        background: 'rgba(40, 167, 69, 0.1)', 
        borderRadius: '8px',
        border: '1px solid #28a745'
      }}>
        <p style={{ margin: 0, color: '#28a745' }}>
          ✅ Авторизован: {user.first_name} {user.last_name || ''} (ID: {user.id})
        </p>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
      {error && (
        <div style={{ 
          marginBottom: '10px', 
          padding: '10px', 
          background: 'rgba(220, 53, 69, 0.1)', 
          borderRadius: '8px',
          border: '1px solid #dc3545',
          color: '#dc3545'
        }}>
          {error}
        </div>
      )}
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <button 
          onClick={handleTelegramAuth}
          disabled={isLoading}
          style={{ 
            background: '#0088cc', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px', 
            padding: '10px 20px',
            fontSize: '14px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1
          }}
        >
          {isLoading ? '⏳ Авторизация...' : '📱 Войти через Telegram'}
        </button>
        
        <button 
          onClick={handleManualAuth}
          disabled={isLoading}
          style={{ 
            background: '#6c757d', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px', 
            padding: '10px 20px',
            fontSize: '14px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.6 : 1
          }}
        >
          {isLoading ? '⏳ Тест...' : '🧪 Тест (без Telegram)'}
        </button>
      </div>
    </div>
  );
} 