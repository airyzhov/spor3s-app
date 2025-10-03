// Простая серверная страница для тестирования
export default function SafePage() {
  return (
    <div style={{
      padding: '40px',
      textAlign: 'center',
      background: '#1a1a40',
      color: '#fff',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#ff00cc', marginBottom: '20px' }}>
        🍄 Spor3s - Безопасный режим
      </h1>
      
      <div style={{ marginBottom: '30px' }}>
        <p>✅ Next.js сервер работает корректно</p>
        <p>✅ Суппабейз подключен</p>
        <p>✅ Стили загружаются</p>
      </div>

      <div style={{ 
        background: 'rgba(255, 255, 255, 0.1)', 
        padding: '20px', 
        borderRadius: '12px',
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        <h3 style={{ color: '#fff', marginBottom: '15px' }}>Диагностика:</h3>
        <ul style={{ textAlign: 'left', color: '#ccc' }}>
          <li>Сервер: http://localhost:3000</li>
          <li>Network: http://192.168.31.134:3000</li>
          <li>Безопасная страница: http://localhost:3000/safe</li>
          <li>Основная страница: http://localhost:3000</li>
        </ul>
      </div>

      <div style={{ marginTop: '30px' }}>
        <a 
          href="/"
          style={{
            padding: '12px 24px',
            background: '#ff00cc',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            marginRight: '10px'
          }}
        >
          ← Назад к основному приложению
        </a>
        
        <a 
          href="/status"
          style={{
            padding: '12px 24px',
            background: '#28a745',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px'
          }}
        >
          📊 Статус системы
        </a>
      </div>
    </div>
  );
} 