const express = require('express');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'env.local' });

const app = express();
app.use(express.json());

// Supabase клиент
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'spor3s-app-simple',
    version: '1.0.0',
    environment: 'development'
  });
});

// AI API endpoint
app.post('/api/ai', async (req, res) => {
  try {
    const { message, context, source, user_id } = req.body;
    
    console.log('🤖 AI API запрос:', { message, source, user_id });
    
    // Простой ответ для тестирования
    const response = `Привет! Я AI агент @spor3z. Получил ваше сообщение: "${message}". Система работает!`;
    
    // Сохраняем сообщение в базу
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .insert([
          {
            user_id: user_id || 'test-user',
            content: message,
            role: 'user',
            source: source || 'telegram'
          }
        ]);
        
      if (error) {
        console.log('❌ Ошибка сохранения сообщения:', error.message);
      } else {
        console.log('✅ Сообщение сохранено в базу');
      }
    } catch (dbError) {
      console.log('❌ Ошибка базы данных:', dbError.message);
    }
    
    res.json({
      response: response,
      status: 'success',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ AI API ошибка:', error);
    res.status(500).json({
      error: error.message,
      status: 'error'
    });
  }
});

// Главная страница
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Spor3s App - Simple Server</title></head>
      <body>
        <h1>🚀 Spor3s App - Simple Server</h1>
        <p>✅ Сервер работает!</p>
        <p>📱 AI чаты готовы к работе</p>
        <p>🔗 <a href="/api/health">Health Check</a></p>
      </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Simple Server запущен на порту ${PORT}`);
  console.log(`📱 AI чаты готовы к работе!`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
});
