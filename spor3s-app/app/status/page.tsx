"use client";
import { useState, useEffect } from "react";

export default function StatusPage() {
  const [status, setStatus] = useState({
    app: 'загрузка...',
    supabase: 'загрузка...',
    ai: 'загрузка...',
    auth: 'загрузка...'
  });

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    // Проверка приложения
    setStatus(prev => ({ ...prev, app: '✅ Работает' }));

    // Проверка Supabase
    try {
      const response = await fetch('/api/init-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: 'status-check' })
      });
      
      if (response.ok) {
        setStatus(prev => ({ ...prev, supabase: '✅ Подключено' }));
      } else {
        setStatus(prev => ({ ...prev, supabase: '❌ Ошибка' }));
      }
    } catch (error) {
      setStatus(prev => ({ ...prev, supabase: '❌ Недоступно' }));
    }

    // Проверка AI API
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'тест' }],
          user_id: null
        })
      });
      
      if (response.ok) {
        setStatus(prev => ({ ...prev, ai: '✅ Работает' }));
      } else {
        setStatus(prev => ({ ...prev, ai: '⚠️ Fallback режим' }));
      }
    } catch (error) {
      setStatus(prev => ({ ...prev, ai: '❌ Недоступно' }));
    }

    // Проверка авторизации
    try {
      const userId = localStorage.getItem('user_id');
      if (userId) {
        setStatus(prev => ({ ...prev, auth: '✅ Авторизован' }));
      } else {
        setStatus(prev => ({ ...prev, auth: '⚪ Не авторизован' }));
      }
    } catch (error) {
      setStatus(prev => ({ ...prev, auth: '❌ Ошибка' }));
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      <h1 style={{ color: '#fff', textAlign: 'center' }}>🔍 Статус системы</h1>
      
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h2 style={{ color: '#fff', marginTop: 0 }}>Компоненты системы:</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            padding: '10px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '8px'
          }}>
            <span style={{ color: '#ccc' }}>Приложение Next.js:</span>
            <span>{status.app}</span>
          </div>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            padding: '10px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '8px'
          }}>
            <span style={{ color: '#ccc' }}>База данных Supabase:</span>
            <span>{status.supabase}</span>
          </div>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            padding: '10px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '8px'
          }}>
            <span style={{ color: '#ccc' }}>AI чат:</span>
            <span>{status.ai}</span>
          </div>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            padding: '10px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '8px'
          }}>
            <span style={{ color: '#ccc' }}>Авторизация:</span>
            <span>{status.auth}</span>
          </div>
        </div>
      </div>

      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h2 style={{ color: '#fff', marginTop: 0 }}>Исправления:</h2>
        <ul style={{ color: '#ccc' }}>
          <li>✅ Фон: подсветка вместо движения</li>
          <li>✅ AI: рекомендует ЛИБО капсулы ЛИБО порошок</li>
          <li>✅ Корзина: удаление при количестве = 0</li>
          <li>✅ Авторизация: Telegram login при заказе</li>
          <li>✅ Cross-origin: настроен allowedDevOrigins</li>
          <li>✅ Runtime: исправлены ошибки компонентов</li>
        </ul>
      </div>

      <div style={{ textAlign: 'center' }}>
        <button 
          onClick={checkStatus}
          style={{
            padding: '12px 24px',
            background: '#ff00cc',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            marginRight: '10px'
          }}
        >
          🔄 Обновить статус
        </button>
        
        <a 
          href="/"
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            background: '#3333ff',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontSize: '16px'
          }}
        >
          🏠 На главную
        </a>
      </div>
    </div>
  );
} 