#!/bin/bash
# Скрипт для запуска Next.js приложения через PM2

cd /var/www/spor3s-app

# Остановить старый процесс если есть
pm2 stop spor3s-nextjs 2>/dev/null || true
pm2 delete spor3s-nextjs 2>/dev/null || true

# Запустить Next.js приложение
pm2 start npm --name "spor3s-nextjs" -- start

# Сохранить конфигурацию PM2
pm2 save

# Показать статус
pm2 status

# Показать логи
echo ""
echo "📋 Последние логи:"
pm2 logs spor3s-nextjs --lines 20 --nostream

