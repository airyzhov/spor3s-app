'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Client-side error caught:', error);
  }, [error]);

  return (
    <div style={{
      padding: '40px',
      textAlign: 'center',
      background: '#1a1a40',
      color: '#fff',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <h2 style={{ color: '#ff00cc', marginBottom: '20px' }}>🚨 Ошибка приложения</h2>
      <p style={{ marginBottom: '20px', maxWidth: '500px' }}>
        Произошла ошибка в приложении. Это может быть связано с загрузкой компонентов.
      </p>
      <details style={{ marginBottom: '20px', maxWidth: '600px', textAlign: 'left' }}>
        <summary style={{ cursor: 'pointer', marginBottom: '10px' }}>
          Детали ошибки (для разработчика)
        </summary>
        <pre style={{ 
          background: 'rgba(255, 255, 255, 0.1)', 
          padding: '10px', 
          borderRadius: '8px',
          fontSize: '12px',
          overflow: 'auto'
        }}>
          {error.message}
          {error.stack && `\n\nStack trace:\n${error.stack}`}
        </pre>
      </details>
      <button
        onClick={reset}
        style={{
          padding: '10px 20px',
          background: '#ff00cc',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '16px'
        }}
      >
        🔄 Попробовать снова
      </button>
      <div style={{ marginTop: '20px', fontSize: '14px', color: '#ccc' }}>
        <p>Если ошибка повторяется:</p>
        <ol style={{ textAlign: 'left', maxWidth: '400px' }}>
          <li>Перезагрузите страницу (Ctrl+F5)</li>
          <li>Очистите кэш браузера</li>
          <li>Проверьте консоль браузера (F12)</li>
        </ol>
      </div>
    </div>
  );
} 