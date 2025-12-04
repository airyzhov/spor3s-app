#!/bin/bash
# Автоматический деплой исправлений для устранения ошибки загрузки

echo "🚀 Автоматический деплой исправлений ошибки загрузки"
echo "═══════════════════════════════════════════════════════"
echo ""

cd /var/www/spor3s-app

echo "📥 Получение обновлений из GitHub..."
git pull origin main

echo ""
echo "📦 Очистка кэша Next.js..."
rm -rf .next

echo ""
echo "🏗️ Сборка Next.js приложения..."
npm run build

echo ""
echo "🛑 Остановка старых процессов..."
pm2 stop spor3s-nextjs 2>/dev/null || echo "⚠️ Процесс не найден"
pm2 delete spor3s-nextjs 2>/dev/null || echo "⚠️ Процесс не найден"
sleep 2

echo ""
echo "🔄 Запуск Next.js приложения..."
pm2 start npm --name "spor3s-nextjs" -- start
pm2 save
sleep 3

echo ""
echo "🔄 Перезапуск Nginx..."
systemctl restart nginx
sleep 2

echo ""
echo "📊 Статус процессов PM2:"
pm2 status

echo ""
echo "📋 Последние логи (первые 30 строк):"
pm2 logs spor3s-nextjs --lines 30 --nostream

echo ""
echo "🔍 Проверка доступности приложения..."
sleep 2
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3000 || echo "⚠️ Приложение не отвечает"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ Деплой завершен!"
echo ""
echo "🧪 Проверьте работу приложения:"
echo "   - https://ai.spor3s.ru"
echo "   - Откройте в браузере и проверьте, что страница загружается"


