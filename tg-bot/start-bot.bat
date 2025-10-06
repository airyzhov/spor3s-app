@echo off
echo 🤖 ЗАПУСК TELEGRAM БОТА
echo ================================================================

echo.
echo 📋 ПРОВЕРКА КОНФИГУРАЦИИ:
echo.

REM Проверяем наличие env.local
if not exist "env.local" (
    echo ❌ Файл env.local не найден!
    echo.
    echo 📝 Создайте файл env.local с настройками:
    echo TELEGRAM_BOT_TOKEN=ваш_токен_бота
    echo SUPABASE_URL=https://ваш_проект.supabase.co
    echo SUPABASE_ANON_KEY=ваш_ключ
    echo NEXT_PUBLIC_BASE_URL=http://localhost:3000
    echo MANAGER_CHAT_ID=ваш_chat_id
    echo.
    pause
    exit /b 1
)

echo ✅ Файл env.local найден

echo.
echo 🔍 ПРОВЕРКА ЗАВИСИМОСТЕЙ:
echo.

REM Проверяем node_modules
if not exist "node_modules" (
    echo 📦 Установка зависимостей...
    npm install
) else (
    echo ✅ Зависимости установлены
)

echo.
echo 🚀 ЗАПУСК БОТА:
echo.

REM Запускаем бота
echo 🤖 Запуск Spor3s AI Bot...
npm run dev

echo.
echo 📋 ИНСТРУКЦИИ:
echo.
echo 1. Убедитесь, что в env.local указан правильный TELEGRAM_BOT_TOKEN
echo 2. Проверьте, что бот добавлен в @BotFather
echo 3. Убедитесь, что сервер на localhost:3000 запущен
echo 4. Отправьте /start боту для начала работы
echo.
echo 🎯 ДЛЯ ТЕСТИРОВАНИЯ:
echo.
echo 1. Найдите вашего бота в Telegram
echo 2. Отправьте /start
echo 3. Напишите любое сообщение
echo 4. Проверьте, что бот отвечает
echo.
pause 