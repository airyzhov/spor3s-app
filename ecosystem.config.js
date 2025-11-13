module.exports = {
  apps: [
    {
      name: 'spor3s-nextjs',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/spor3s-app',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
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
