// КРИТИЧНО: Загружаем переменные окружения из .env.local для production
try {
  const fs = require('fs');
  const path = require('path');
  
  // Пробуем разные пути для .env.local
  const possiblePaths = [
    '/var/www/spor3s-app/spor3s-app/.env.local',
    '/var/www/spor3s-app/.env.local',
    path.join(process.cwd(), '.env.local'),
    '.env.local'
  ];
  
  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      console.log(`[next.config.js] Загружаю переменные из: ${envPath}`);
      const content = fs.readFileSync(envPath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const match = line.match(/^([^=]+)=(.+)$/);
        if (match) {
          const key = match[1].trim();
          let value = match[2].trim().replace(/^["']|["']$/g, '');
          if (key && value && !process.env[key]) {
            process.env[key] = value;
            if (key === 'OPENROUTER_API_KEY') {
              console.log(`[next.config.js] ✅ OPENROUTER_API_KEY загружен (длина: ${value.length})`);
            }
          }
        }
      }
      break;
    }
  }
} catch (error) {
  console.error('[next.config.js] Ошибка загрузки .env.local:', error.message);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Исключаем my-fresh-app из сборки
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  typescript: {
    // Отключаем проверку типов во время сборки
    ignoreBuildErrors: true,
  },
  eslint: {
    // Отключаем проверку ESLint во время сборки
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    // Исключаем my-fresh-app из сборки
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/node_modules', '**/.git', '**/my-fresh-app/**'],
    };
    
    // Исключаем my-fresh-app из правил webpack
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
      };
    }
    
    // Игнорируем файлы из my-fresh-app
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /my-fresh-app/,
      use: 'ignore-loader',
    });
    
    return config;
  },
  async headers() {
    return [
      {
        // matching all API routes
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
        ]
      }
    ]
  }
};

module.exports = nextConfig;