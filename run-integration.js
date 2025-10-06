// Простой запуск интеграции @web3grow
// Запускается без проблем с терминалом

const { spawn } = require('child_process');
const path = require('path');

console.log('🤖 Запуск интеграции @web3grow');
console.log('=====================================');

// Проверяем наличие файла
const integrationFile = path.join(__dirname, 'web3grow-personal-integration.js');
const fs = require('fs');

if (!fs.existsSync(integrationFile)) {
  console.log('❌ Файл web3grow-personal-integration.js не найден');
  console.log('📁 Текущая папка:', __dirname);
  console.log('📋 Доступные файлы:');
  
  const files = fs.readdirSync(__dirname);
  files.forEach(file => {
    if (file.includes('web3grow') || file.includes('integration')) {
      console.log('  -', file);
    }
  });
  
  process.exit(1);
}

console.log('✅ Файл найден:', integrationFile);

// Запускаем интеграцию
const child = spawn('node', [integrationFile], {
  stdio: 'inherit',
  cwd: __dirname
});

child.on('error', (error) => {
  console.error('❌ Ошибка запуска:', error.message);
  console.log('');
  console.log('💡 Возможные решения:');
  console.log('1. Установите зависимости: npm install telegram @supabase/supabase-js axios');
  console.log('2. Проверьте session string в .env.local');
  console.log('3. Запустите сервер: npm run dev');
});

child.on('exit', (code) => {
  if (code === 0) {
    console.log('✅ Интеграция завершена успешно');
  } else {
    console.log(`❌ Интеграция завершена с кодом: ${code}`);
  }
});

// Обработка Ctrl+C
process.on('SIGINT', () => {
  console.log('\n🛑 Остановка интеграции...');
  child.kill('SIGINT');
  process.exit(0);
}); 