// Загружаем переменные из .env.local
const fs = require('fs');
const path = require('path');

let envVars = {
  NODE_ENV: 'production',
  PORT: 3000
};

// Загружаем OPENROUTER_API_KEY из .env.local если файл существует
const possiblePaths = [
  '/var/www/spor3s-app/spor3s-app/.env.local',
  '/var/www/spor3s-app/.env.local',
  '.env.local'
];

let keyLoaded = false;
console.log('[PM2] 🔍 Загрузка OPENROUTER_API_KEY...');

// Сначала пробуем из переменной окружения процесса (может быть установлена через export или командную строку)
if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.length > 20) {
  envVars.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  console.log('[PM2] ✅ OPENROUTER_API_KEY загружен из process.env (длина:', process.env.OPENROUTER_API_KEY.length, ')');
  keyLoaded = true;
}

// Затем пробуем загрузить из .env.local
if (!keyLoaded) {
  for (const envLocalPath of possiblePaths) {
    if (fs.existsSync(envLocalPath)) {
      try {
        console.log(`[PM2] Читаю файл: ${envLocalPath}`);
        const envContent = fs.readFileSync(envLocalPath, 'utf8');
        const lines = envContent.split('\n');
        for (const line of lines) {
          const match = line.match(/^OPENROUTER_API_KEY\s*=\s*(.+)$/);
          if (match) {
            let key = match[1].trim();
            key = key.replace(/^["']|["']$/g, ''); // Убираем кавычки
            if (key && key.length > 20) {
              envVars.OPENROUTER_API_KEY = key;
              console.log(`[PM2] ✅✅✅ OPENROUTER_API_KEY загружен из ${envLocalPath} (длина: ${key.length})`);
              keyLoaded = true;
              break;
            }
          }
        }
        if (keyLoaded) break;
      } catch (error) {
        console.error(`[PM2] ⚠️ Ошибка загрузки ${envLocalPath}:`, error.message);
      }
    }
  }
}

// Если ключ все еще не загружен, выводим предупреждение
if (!keyLoaded) {
  console.error('[PM2] ⚠️ OPENROUTER_API_KEY не найден ни в .env.local, ни в process.env');
  console.error('[PM2] Проверьте что .env.local создан в:', possiblePaths.join(', '));
  console.error('[PM2] Или установите через: pm2 set spor3s-nextjs:env OPENROUTER_API_KEY <key>');
} else {
  console.log('[PM2] ✅ Итоговый OPENROUTER_API_KEY длина:', envVars.OPENROUTER_API_KEY?.length || 0);
}

module.exports = {
  apps: [
    {
      name: 'spor3s-nextjs',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/spor3s-app/spor3s-app',
      env: envVars,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/var/log/pm2/spor3s-nextjs-error.log',
      out_file: '/var/log/pm2/spor3s-nextjs-out.log',
      log_file: '/var/log/pm2/spor3s-nextjs-combined.log',
      time: true
    },
    {
      name: 'spor3s-bot',
      script: 'npx',
      args: 'ts-node bot.ts',
      cwd: '/var/www/spor3s-app/tg-bot',
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      error_file: '/var/log/pm2/spor3s-bot-error.log',
      out_file: '/var/log/pm2/spor3s-bot-out.log',
      log_file: '/var/log/pm2/spor3s-bot-combined.log',
      time: true
    },
    {
      name: 'spor3z-client',
      script: 'client.js',
      cwd: '/var/www/spor3s-app/tg-client',
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      error_file: '/var/log/pm2/spor3z-client-error.log',
      out_file: '/var/log/pm2/spor3z-client-out.log',
      log_file: '/var/log/pm2/spor3z-client-combined.log',
      time: true
    }
  ]
};
