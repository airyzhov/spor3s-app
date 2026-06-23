# 🚀 NGROK КОНФИГУРАЦИЯ

## Основной URL
**https://humane-jaguar-annually.ngrok-free.app/**

## Конфигурация для всех сервисов:

### 1. Next.js приложение
```env
NEXT_PUBLIC_BASE_URL=https://humane-jaguar-annually.ngrok-free.app
MINIAPP_DEEP_LINK=https://humane-jaguar-annually.ngrok-free.app
```

### 2. Telegram WebApp
- URL: `https://humane-jaguar-annually.ngrok-free.app`
- Webhook: `https://humane-jaguar-annually.ngrok-free.app/api/webhook`

### 3. API Endpoints
- Health: `https://humane-jaguar-annually.ngrok-free.app/api/health`
- AI API: `https://humane-jaguar-annually.ngrok-free.app/api/ai`
- Orders: `https://humane-jaguar-annually.ngrok-free.app/api/order`

### 4. Запуск команд
```bash
# Запуск ngrok
ngrok http 3000

# Запуск Next.js
npm run dev

# Запуск Telegram бота
cd tg-bot && node enhanced-bot.js

# Запуск AI агента
node start-spor3z-improved.js
```

### 5. Тестирование
- WebApp: https://humane-jaguar-annually.ngrok-free.app
- Bot: @spor3s_bot
- AI Agent: @spor3z

---
**Дата создания:** $(Get-Date)
**Статус:** ✅ Активен
