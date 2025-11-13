# 🚀 UNIFIED LAUNCHER для всех служб Spor3s
# Запускает все компоненты системы из правильных директорий

Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         🚀 SPOR3S UNIFIED SERVICE LAUNCHER             ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Проверка текущей директории
$currentDir = Get-Location
Write-Host "📁 Текущая директория: $currentDir" -ForegroundColor Yellow

# Правильная рабочая директория
$workDir = "C:\Users\User\Documents\spor3s-app\spor3s-app"
Write-Host "📂 Рабочая директория: $workDir" -ForegroundColor Yellow
Write-Host ""

# Проверка существования директории
if (-not (Test-Path $workDir)) {
    Write-Host "❌ ОШИБКА: Рабочая директория не найдена!" -ForegroundColor Red
    Write-Host "   Ожидаемый путь: $workDir" -ForegroundColor Red
    pause
    exit 1
}

# Проверка наличия env.local
$envFile = Join-Path $workDir "env.local"
if (-not (Test-Path $envFile)) {
    Write-Host "❌ ОШИБКА: Файл env.local не найден!" -ForegroundColor Red
    Write-Host "   Ожидаемый путь: $envFile" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "✅ Все проверки пройдены" -ForegroundColor Green
Write-Host ""

# Функция для запуска службы в отдельном окне
function Start-Service {
    param (
        [string]$Name,
        [string]$Command,
        [string]$WorkingDirectory,
        [string]$Icon
    )
    
    Write-Host "${Icon} Запуск: $Name" -ForegroundColor Cyan
    Write-Host "   Команда: $Command" -ForegroundColor Gray
    Write-Host "   Директория: $WorkingDirectory" -ForegroundColor Gray
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$WorkingDirectory'; Write-Host '🎯 $Name' -ForegroundColor Green; $Command"
    Start-Sleep -Seconds 2
}

# 1. Next.js Server
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Start-Service -Name "Next.js Server (localhost:3000)" `
              -Command "npm run dev" `
              -WorkingDirectory $workDir `
              -Icon "🌐"

# Ждем запуска Next.js
Write-Host "⏳ Ожидание запуска Next.js (10 секунд)..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# 2. Ngrok Tunnel
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "🔗 Запуск: Ngrok Tunnel" -ForegroundColor Cyan
Write-Host "   URL: https://humane-jaguar-annually.ngrok-free.app" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  ВАЖНО: Запустите ngrok вручную в отдельном окне:" -ForegroundColor Yellow
Write-Host "   ngrok http --domain=humane-jaguar-annually.ngrok-free.app 3000" -ForegroundColor White
Write-Host ""

# Опция для автоматического запуска ngrok (если нужно)
$startNgrok = Read-Host "Хотите запустить ngrok автоматически? (y/n)"
if ($startNgrok -eq "y") {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '🔗 Ngrok Tunnel' -ForegroundColor Green; ngrok http --domain=humane-jaguar-annually.ngrok-free.app 3000"
    Start-Sleep -Seconds 5
}

# 3. Telegram Bot
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
$botDir = Join-Path $workDir "tg-bot"
Start-Service -Name "Telegram Bot (@spor3s_bot)" `
              -Command "node enhanced-bot.js" `
              -WorkingDirectory $botDir `
              -Icon "🤖"

# 4. Spor3z Live Account
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Start-Service -Name "Spor3z Live Account" `
              -Command "node start-spor3z-improved.js" `
              -WorkingDirectory $workDir `
              -Icon "👤"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║              ✅ ВСЕ СЛУЖБЫ ЗАПУЩЕНЫ!                    ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Статус служб:" -ForegroundColor Cyan
Write-Host "   🌐 Next.js Server:    http://localhost:3000" -ForegroundColor White
Write-Host "   🔗 Ngrok Tunnel:      https://humane-jaguar-annually.ngrok-free.app" -ForegroundColor White
Write-Host "   🤖 Telegram Bot:      @spor3s_bot" -ForegroundColor White
Write-Host "   👤 Spor3z Account:    @spor3z" -ForegroundColor White
Write-Host ""
Write-Host "💡 Используйте Ctrl+C в каждом окне для остановки служб" -ForegroundColor Yellow
Write-Host ""

# Предложение запустить проверку
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
$runTests = Read-Host "Хотите запустить проверку системы? (y/n)"
if ($runTests -eq "y") {
    Write-Host "🧪 Запуск тестов..." -ForegroundColor Cyan
    Start-Sleep -Seconds 5
    
    # Проверка localhost
    Write-Host ""
    Write-Host "1️⃣  Проверка localhost:3000..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "   ✅ Next.js сервер работает" -ForegroundColor Green
        }
    } catch {
        Write-Host "   ❌ Next.js сервер не отвечает" -ForegroundColor Red
    }
    
    # Проверка ngrok
    Write-Host ""
    Write-Host "2️⃣  Проверка ngrok..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "https://humane-jaguar-annually.ngrok-free.app" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Host "   ✅ Ngrok туннель работает" -ForegroundColor Green
        }
    } catch {
        Write-Host "   ❌ Ngrok туннель не отвечает" -ForegroundColor Red
        Write-Host "   Убедитесь, что ngrok запущен" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "✅ Проверка завершена!" -ForegroundColor Green
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "📝 Логи служб можно увидеть в открытых окнах PowerShell" -ForegroundColor Cyan
Write-Host "🛑 Для остановки всех служб закройте все окна PowerShell" -ForegroundColor Cyan
Write-Host ""

pause


