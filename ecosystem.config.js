// Загружаем переменные из .env.local
const fs = require('fs');
const path = require('path');

let envVars = {
  NODE_ENV: 'production',
  PORT: 3000
};

// Загружаем OPENROUTER_API_KEY из .env.local если файл существует
const possiblePaths = [
  path.join('/var/www/spor3s-app/spor3s-app', '.env.local'),
  path.join('/var/www/spor3s-app', '.env.local'),
  '.env.local'
];

let keyLoaded = false;
for (const envLocalPath of possiblePaths) {
  if (fs.existsSync(envLocalPath)) {
    try {
      const envContent = fs.readFileSync(envLocalPath, 'utf8');
      const lines = envContent.split('\n');
      for (const line of lines) {
        const match = line.match(/^OPENROUTER_API_KEY=(.+)$/);
        if (match) {
          const key = match[1].trim();
          if (key && key.length > 20) {
            envVars.OPENROUTER_API_KEY = key;
            console.log(`[PM2] ✅ OPENROUTER_API_KEY загружен из ${envLocalPath} (длина: ${key.length})`);
            keyLoaded = true;
            break;
          }
        }
      }
      if (keyLoaded) break;
    } catch (error) {
      console.error(`[PM2] ⚠️ Ошибка загрузки ${envLocalPath}:`, error);
    }
  }
}

// Если ключ не загружен, пробуем из переменной окружения процесса
if (!keyLoaded && process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.length > 20) {
  envVars.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  console.log('[PM2] ✅ OPENROUTER_API_KEY загружен из process.env');
  keyLoaded = true;
}

// Если ключ все еще не загружен, выводим предупреждение
if (!keyLoaded) {
  console.error('[PM2] ⚠️ OPENROUTER_API_KEY не найден ни в .env.local, ни в process.env');
  console.error('[PM2] Проверьте что .env.local создан в:', possiblePaths.join(', '));
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
