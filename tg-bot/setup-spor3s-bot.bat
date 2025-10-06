@echo off
echo 🤖 НАСТРОЙКА SPOR3S_BOT
echo ================================================================

echo.
echo 📋 ИНСТРУКЦИЯ ПО НАСТРОЙКЕ:
echo.

echo 1️⃣ ПОЛУЧЕНИЕ ТОКЕНА БОТА:
echo.
echo Откройте @BotFather в Telegram
echo Найдите вашего бота @spor3s_bot
echo Отправьте команду: /mybots
echo Выберите @spor3s_bot
echo Нажмите "API Token"
echo Скопируйте токен (выглядит как 1234567890:ABCdefGHIjklMNOpqrsTUVwxyz)
echo.

echo 2️⃣ ПОЛУЧЕНИЕ SUPABASE КЛЮЧЕЙ:
echo.
echo Откройте ваш проект в Supabase
echo Перейдите в Settings → API
echo Скопируйте:
echo - Project URL
echo - anon public key
echo.

echo 3️⃣ ПОЛУЧЕНИЕ OPENROUTER ТОКЕНА:
echo.
echo Зарегистрируйтесь на https://openrouter.ai
echo Создайте API ключ
echo Скопируйте ключ
echo.

echo 4️⃣ НАСТРОЙКА ENV.LOCAL:
echo.
echo Откройте файл tg-bot/env.local
echo Замените значения:
echo.
echo TELEGRAM_BOT_TOKEN=ваш_токен_от_botfather
echo SUPABASE_URL=https://ваш_проект.supabase.co
echo SUPABASE_ANON_KEY=ваш_anon_key
echo OR_TOKEN=ваш_openrouter_token
echo.

echo 5️⃣ ЗАПУСК БОТА:
echo.
echo После настройки токенов выполните:
echo cd tg-bot
echo npm install
echo npm run dev
echo.

echo 6️⃣ ТЕСТИРОВАНИЕ:
echo.
echo Найдите @spor3s_bot в Telegram
echo Отправьте /start
echo Напишите любое сообщение
echo Проверьте ответ AI
echo.

echo 🎯 БЫСТРАЯ ПРОВЕРКА:
echo.
echo Если у вас уже есть токены, можете сразу запустить:
echo start-bot.bat
echo.

pause 