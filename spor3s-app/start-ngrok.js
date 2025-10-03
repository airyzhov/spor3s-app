const { spawn } = require('child_process');
const http = require('http');

console.log('🚀 Запуск ngrok для порта 3000...');

// Запускаем ngrok
const ngrok = spawn('ngrok', ['http', '3000', '--log=stdout']);

ngrok.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('📡 Ngrok output:', output);
  
  // Ищем URL в выводе
  if (output.includes('https://')) {
    const urlMatch = output.match(/https:\/\/[a-zA-Z0-9\-\.]+\.ngrok-free\.app/);
    if (urlMatch) {
      console.log('\n🎉 ПУБЛИЧНЫЙ URL НАЙДЕН:');
      console.log('=====================================');
      console.log(`🌐 ${urlMatch[0]}`);
      console.log('=====================================');
      console.log('\n💡 Теперь вы можете:');
      console.log('1. Использовать этот URL для Telegram Webhook');
      console.log('2. Тестировать API извне');
      console.log('3. Делиться ссылкой с другими');
    }
  }
});

ngrok.stderr.on('data', (data) => {
  console.log('❌ Ngrok error:', data.toString());
});

ngrok.on('close', (code) => {
  console.log(`🛑 Ngrok завершен с кодом: ${code}`);
});

// Функция для получения URL через API
async function getNgrokUrl() {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        const response = await fetch('http://localhost:4040/api/tunnels');
        const data = await response.json();
        if (data.tunnels && data.tunnels.length > 0) {
          resolve(data.tunnels[0].public_url);
        } else {
          reject('Туннель не найден');
        }
      } catch (error) {
        reject(error);
      }
    }, 3000);
  });
}

// Пытаемся получить URL через API
setTimeout(async () => {
  try {
    const url = await getNgrokUrl();
    console.log('\n🎉 ПУБЛИЧНЫЙ URL (через API):');
    console.log('=====================================');
    console.log(`🌐 ${url}`);
    console.log('=====================================');
  } catch (error) {
    console.log('⚠️ Не удалось получить URL через API:', error.message);
  }
}, 5000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Остановка ngrok...');
  ngrok.kill();
  process.exit(0);
});

console.log('💡 Нажмите Ctrl+C для остановки');