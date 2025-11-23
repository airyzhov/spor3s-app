"use client";

export default function TestPage() {
  return (
    <div style={{ 
      padding: '40px', 
      textAlign: 'center',
      background: 'linear-gradient(135deg, #1a1a40 0%, #2d0b3a 25%, #4a1b5a 50%, #2d0b3a 75%, #1a1a40 100%)',
      minHeight: '100vh',
      color: '#fff'
    }}>
      <h1 style={{ color: '#ff00cc', marginBottom: '20px' }}>✅ Тестовая страница работает!</h1>
      <p>Если вы видите это сообщение, Next.js сервер работает.</p>
      <p>Время: {new Date().toLocaleString('ru-RU')}</p>
      <div style={{ marginTop: '30px' }}>
        <a 
          href="/"
          style={{
            padding: '12px 24px',
            background: '#ff00cc',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px'
          }}
        >
          ← На главную
        </a>
      </div>
    </div>
  );
}

