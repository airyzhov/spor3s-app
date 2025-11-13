#!/bin/bash
# Скрипт для проверки статуса ботов на VPS

echo "🔍 ПРОВЕРКА СТАТУСА БОТОВ НА VPS"
echo "=================================="
echo ""

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Проверка процессов Node.js
echo "1. Проверка процессов Node.js"
echo "------------------------------"
if pgrep -f "enhanced-bot.js" > /dev/null; then
    echo -e "${GREEN}✅ enhanced-bot.js запущен${NC}"
    ps aux | grep "enhanced-bot.js" | grep -v grep
else
    echo -e "${RED}❌ enhanced-bot.js НЕ запущен${NC}"
fi

echo ""

if pgrep -f "start-spor3z-improved.js" > /dev/null; then
    echo -e "${GREEN}✅ start-spor3z-improved.js запущен${NC}"
    ps aux | grep "start-spor3z-improved.js" | grep -v grep
else
    echo -e "${RED}❌ start-spor3z-improved.js НЕ запущен${NC}"
fi

echo ""
echo ""

# 2. Проверка PM2
echo "2. Проверка PM2 процессов"
echo "-------------------------"
if command -v pm2 &> /dev/null; then
    pm2 list
    echo ""
    echo "Детальная информация:"
    pm2 describe spor3s-bot 2>/dev/null || echo "spor3s-bot не найден в PM2"
    pm2 describe spor3z-agent 2>/dev/null || echo "spor3z-agent не найден в PM2"
else
    echo -e "${YELLOW}⚠️ PM2 не установлен${NC}"
fi

echo ""
echo ""

# 3. Проверка портов
echo "3. Проверка открытых портов"
echo "---------------------------"
if command -v netstat &> /dev/null; then
    echo "Порт 3000 (Next.js):"
    netstat -tuln | grep :3000 || echo -e "${RED}❌ Порт 3000 не слушается${NC}"
else
    echo -e "${YELLOW}⚠️ netstat не установлен, используем ss${NC}"
    ss -tuln | grep :3000 || echo -e "${RED}❌ Порт 3000 не слушается${NC}"
fi

echo ""
echo ""

# 4. Проверка логов
echo "4. Последние логи (10 строк)"
echo "----------------------------"
if [ -f "bot.log" ]; then
    echo "bot.log:"
    tail -n 10 bot.log
else
    echo -e "${YELLOW}⚠️ bot.log не найден${NC}"
fi

echo ""

if [ -f "bot.err" ]; then
    echo "bot.err:"
    tail -n 10 bot.err
else
    echo -e "${YELLOW}⚠️ bot.err не найден${NC}"
fi

echo ""
echo ""

# 5. Проверка Nginx
echo "5. Проверка Nginx"
echo "-----------------"
if command -v nginx &> /dev/null; then
    echo "Статус Nginx:"
    systemctl status nginx --no-pager | head -n 5
    
    echo ""
    echo "Тест конфигурации:"
    nginx -t
    
    echo ""
    echo "Виртуальные хосты с 'spor3s':"
    grep -r "server_name.*spor3s" /etc/nginx/sites-enabled/ 2>/dev/null || echo "Не найдено"
else
    echo -e "${YELLOW}⚠️ Nginx не установлен${NC}"
fi

echo ""
echo ""

# 6. Проверка переменных окружения
echo "6. Проверка переменных окружения"
echo "--------------------------------"
if [ -f "env.local" ]; then
    echo -e "${GREEN}✅ env.local найден${NC}"
    echo "Ключевые переменные (без значений):"
    grep -E "^(NEXT_PUBLIC_BASE_URL|TELEGRAM_BOT_TOKEN|SUPABASE_URL)=" env.local | sed 's/=.*/=***/'
else
    echo -e "${RED}❌ env.local НЕ найден${NC}"
fi

echo ""

if [ -f "tg-bot/env.local" ]; then
    echo -e "${GREEN}✅ tg-bot/env.local найден${NC}"
else
    echo -e "${RED}❌ tg-bot/env.local НЕ найден${NC}"
fi

echo ""
echo ""

# 7. Тест API
echo "7. Тест AI API"
echo "--------------"
echo "Проверка доступности https://ai.spor3s.ru/api/ai"

RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST https://ai.spor3s.ru/api/ai \
  -H "Content-Type: application/json" \
  -d '{"message":"тест","source":"test"}' \
  --max-time 10)

if [ "$RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ API отвечает (HTTP $RESPONSE)${NC}"
else
    echo -e "${RED}❌ API не отвечает или ошибка (HTTP $RESPONSE)${NC}"
fi

echo ""
echo ""

# Итоговый отчет
echo "=================================="
echo "📊 ИТОГОВЫЙ ОТЧЕТ"
echo "=================================="
echo ""

# Подсчет статусов
ISSUES=0

if ! pgrep -f "enhanced-bot.js" > /dev/null; then
    echo -e "${RED}❌ @spor3s_bot процесс не запущен${NC}"
    ((ISSUES++))
fi

if ! pgrep -f "start-spor3z-improved.js" > /dev/null; then
    echo -e "${RED}❌ @spor3z процесс не запущен${NC}"
    ((ISSUES++))
fi

if [ ! -f "env.local" ]; then
    echo -e "${RED}❌ Отсутствует env.local${NC}"
    ((ISSUES++))
fi

if [ "$RESPONSE" != "200" ]; then
    echo -e "${RED}❌ AI API не отвечает${NC}"
    ((ISSUES++))
fi

echo ""

if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}🎉 ВСЕ СИСТЕМЫ РАБОТАЮТ!${NC}"
else
    echo -e "${YELLOW}⚠️ Найдено проблем: $ISSUES${NC}"
    echo ""
    echo "Рекомендации:"
    echo "1. Запустите боты через PM2:"
    echo "   pm2 start tg-bot/enhanced-bot.js --name spor3s-bot"
    echo "   pm2 start start-spor3z-improved.js --name spor3z-agent"
    echo ""
    echo "2. Проверьте логи:"
    echo "   pm2 logs"
    echo ""
    echo "3. Проверьте Nginx конфигурацию:"
    echo "   nginx -t"
fi

echo ""
echo "=================================="

