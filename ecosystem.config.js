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
      name: 'spor3s-emergency',
      script: 'emergency_server.js',
      cwd: '/var/www/spor3s-app',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      error_file: '/var/log/pm2/spor3s-emergency-error.log',
      out_file: '/var/log/pm2/spor3s-emergency-out.log',
      log_file: '/var/log/pm2/spor3s-emergency-combined.log',
      time: true
    }
  ]
};
