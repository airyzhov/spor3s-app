export default function TestPage() {
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>✅ Тестовая страница работает!</h1>
      <p>Если вы видите это сообщение, Next.js сервер работает.</p>
      <p>Время: {new Date().toLocaleString('ru-RU')}</p>
    </div>
  );
}

