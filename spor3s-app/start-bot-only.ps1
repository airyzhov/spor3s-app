# 🤖 Запуск только Telegram бота @spor3s_bot

Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         🤖 ЗАПУСК TELEGRAM БОТА @spor3s_bot             ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$workDir = "C:\Users\User\Documents\spor3s-app\spor3s-app"

# Проверка Next.js сервера
Write-Host "1️⃣  Проверка Next.js сервера..." -ForegroundColor Yellow
$port3000 = netstat -ano | Select-String ":3000\s" | Select-String "LISTENING"

if (-not $port3000) {
    Write-Host "   ⚠️  Next.js сервер не запущен на порту 3000" -ForegroundColor Red
    Write-Host ""
    $startServer = Read-Host "Запустить Next.js сервер? (y/n)"
    
    if ($startServer -eq "y") {
        Write-Host "   🌐 Запуск Next.js сервера..." -ForegroundColor Cyan
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$workDir'; Write-Host '🌐 Next.js Server' -ForegroundColor Green; npm run dev"
        Write-Host "   ⏳ Ожидание запуска сервера (10 секунд)..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
    } else {
        Write-Host "   ⚠️  Бот может не работать без Next.js сервера!" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ✅ Next.js сервер работает" -ForegroundColor Green
}

# Тест подключения к Telegram API
Write-Host ""
Write-Host "2️⃣  Тестирование подключения к Telegram API..." -ForegroundColor Yellow
$testResult = & node "$workDir\tg-bot\test-bot.js" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Подключение успешно" -ForegroundColor Green
    Write-Host ""
    Write-Host $testResult
} else {
    Write-Host "   ❌ Ошибка подключения" -ForegroundColor Red
    Write-Host $testResult
    Write-Host ""
    Write-Host "💡 Проверьте TELEGRAM_BOT_TOKEN в env.local" -ForegroundColor Yellow
    pause
    exit 1
}

# Запуск бота
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "3️⃣  Запуск бота..." -ForegroundColor Yellow
Write-Host ""

Set-Location "$workDir\tg-bot"

Write-Host "🤖 Запускаю @spor3s_bot..." -ForegroundColor Cyan
Write-Host "📁 Директория: $workDir\tg-bot" -ForegroundColor Gray
Write-Host ""

# Запуск
node enhanced-bot.js

# Если бот остановился
Write-Host ""
Write-Host "⚠️  Бот остановлен" -ForegroundColor Yellow
pause

