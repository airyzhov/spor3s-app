#!/bin/bash

echo "🤖 Тестирование интеллектуальных AI агентов с RAG..."
echo ""

# Тест 1: Проверка spor3s_bot
echo "📱 Тест 1: Telegram бот spor3s_bot - запрос про мухомор"
ssh root@185.166.197.49 'curl -s -X POST "http://localhost:3001/api/ai" \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"хочу мухомор\",\"context\":[],\"source\":\"telegram_bot\",\"telegram_id\":\"123\"}" 2>/dev/null | head -100'

echo ""
echo "---"
echo ""

# Тест 2: Проверка spor3z агента
echo "🚀 Тест 2: spor3z агент - запрос про ежовик"
ssh root@185.166.197.49 'curl -s -X POST "http://localhost:3001/api/ai" \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"ежовик порошок\",\"context\":[],\"source\":\"spor3z\",\"telegram_id\":\"456\"}" 2>/dev/null | head -100'

echo ""
echo "---"
echo ""

# Тест 3: Mini App чат
echo "🎯 Тест 3: Mini App чат - запрос про цену"
ssh root@185.166.197.49 'curl -s -X POST "http://localhost:3001/api/ai" \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"сколько стоит кордицепс\",\"context\":[],\"source\":\"mini_app\",\"telegram_id\":\"789\"}" 2>/dev/null | head -100'

echo ""
echo "✅ Тесты завершены!"
echo ""
echo "📊 Статус PM2:"
ssh root@185.166.197.49 'pm2 status'
