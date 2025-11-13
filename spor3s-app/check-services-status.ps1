# 📊 Проверка статуса всех служб Spor3s

Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         📊 СТАТУС СЛУЖБ SPOR3S                          ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# 1. Проверка Next.js (порт 3000)
Write-Host "1️⃣  Next.js Server (localhost:3000)" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

$port3000 = netstat -ano | Select-String ":3000\s" | Select-String "LISTENING"
if ($port3000) {
    Write-Host "   ✅ Порт 3000 слушается" -ForegroundColor Green
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "   ✅ Сервер отвечает (HTTP 200)" -ForegroundColor Green
        }
    } catch {
        Write-Host "   ⚠️  Порт открыт, но сервер не отвечает" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ❌ Порт 3000 не слушается" -ForegroundColor Red
    Write-Host "   💡 Запустите: npm run dev" -ForegroundColor Gray
}

# 2. Проверка ngrok
Write-Host ""
Write-Host "2️⃣  Ngrok Tunnel" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

$ngrokProcess = Get-Process -Name "ngrok" -ErrorAction SilentlyContinue
if ($ngrokProcess) {
    Write-Host "   ✅ Процесс ngrok запущен (PID: $($ngrokProcess.Id))" -ForegroundColor Green
    
    try {
        $response = Invoke-WebRequest -Uri "https://humane-jaguar-annually.ngrok-free.app" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Host "   ✅ Туннель работает (HTTP 200)" -ForegroundColor Green
        }
    } catch {
        Write-Host "   ⚠️  Процесс запущен, но туннель не отвечает" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ❌ Процесс ngrok не запущен" -ForegroundColor Red
    Write-Host "   💡 Запустите: ngrok http --domain=humane-jaguar-annually.ngrok-free.app 3000" -ForegroundColor Gray
}

# 3. Проверка Node.js процессов (боты)
Write-Host ""
Write-Host "3️⃣  Telegram Bots" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
$foundEnhancedBot = $false
$foundSpor3z = $false

if ($nodeProcesses) {
    foreach ($proc in $nodeProcesses) {
        try {
            $cmdLine = (Get-WmiObject Win32_Process -Filter "ProcessId = $($proc.Id)").CommandLine
            
            if ($cmdLine -match "enhanced-bot\.js") {
                Write-Host "   ✅ @spor3s_bot запущен (PID: $($proc.Id))" -ForegroundColor Green
                $foundEnhancedBot = $true
            }
            
            if ($cmdLine -match "start-spor3z-improved\.js") {
                Write-Host "   ✅ @spor3z запущен (PID: $($proc.Id))" -ForegroundColor Green
                $foundSpor3z = $true
            }
        } catch {
            # Игнорируем ошибки доступа
        }
    }
}

if (-not $foundEnhancedBot) {
    Write-Host "   ❌ @spor3s_bot не запущен" -ForegroundColor Red
    Write-Host "   💡 Запустите: cd tg-bot && node enhanced-bot.js" -ForegroundColor Gray
}

if (-not $foundSpor3z) {
    Write-Host "   ❌ @spor3z не запущен" -ForegroundColor Red
    Write-Host "   💡 Запустите: node start-spor3z-improved.js" -ForegroundColor Gray
}

# 4. Проверка env.local
Write-Host ""
Write-Host "4️⃣  Configuration" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

$workDir = "C:\Users\User\Documents\spor3s-app\spor3s-app"
$envFile = Join-Path $workDir "env.local"

if (Test-Path $envFile) {
    Write-Host "   ✅ env.local найден" -ForegroundColor Green
    
    # Читаем и проверяем ключевые переменные
    $envContent = Get-Content $envFile
    $hasSupabaseUrl = $envContent | Select-String "NEXT_PUBLIC_SUPABASE_URL="
    $hasBotToken = $envContent | Select-String "TELEGRAM_BOT_TOKEN="
    $hasApiId = $envContent | Select-String "TELEGRAM_API_ID="
    
    if ($hasSupabaseUrl) {
        Write-Host "   ✅ SUPABASE_URL настроен" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  SUPABASE_URL не найден" -ForegroundColor Yellow
    }
    
    if ($hasBotToken) {
        Write-Host "   ✅ TELEGRAM_BOT_TOKEN настроен" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  TELEGRAM_BOT_TOKEN не найден" -ForegroundColor Yellow
    }
    
    if ($hasApiId) {
        Write-Host "   ✅ TELEGRAM_API_ID настроен" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  TELEGRAM_API_ID не найден" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ❌ env.local не найден" -ForegroundColor Red
}

# Итоговый статус
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║              📊 ИТОГОВЫЙ СТАТУС                         ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$allGood = $port3000 -and $ngrokProcess -and $foundEnhancedBot -and $foundSpor3z

if ($allGood) {
    Write-Host "✅ ВСЕ СЛУЖБЫ РАБОТАЮТ НОРМАЛЬНО!" -ForegroundColor Green
} else {
    Write-Host "⚠️  НЕКОТОРЫЕ СЛУЖБЫ НЕ ЗАПУЩЕНЫ" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "💡 Используйте start-all-services.ps1 для запуска всех служб" -ForegroundColor Cyan
}

Write-Host ""
pause


