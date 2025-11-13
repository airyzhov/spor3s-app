# 🧪 АВТОМАТИЧЕСКОЕ ТЕСТИРОВАНИЕ СИСТЕМЫ SPOR3S

Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         🧪 АВТОМАТИЧЕСКОЕ ТЕСТИРОВАНИЕ СИСТЕМЫ          ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$workDir = "C:\Users\User\Documents\spor3s-app\spor3s-app"
$testResults = @{
    passed = 0
    failed = 0
    total = 0
}

function Test-Component {
    param (
        [string]$Name,
        [scriptblock]$TestBlock
    )
    
    $testResults.total++
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host "🧪 ТЕСТ: $Name" -ForegroundColor Yellow
    
    try {
        $result = & $TestBlock
        if ($result) {
            Write-Host "   ✅ PASSED" -ForegroundColor Green
            $testResults.passed++
            return $true
        } else {
            Write-Host "   ❌ FAILED" -ForegroundColor Red
            $testResults.failed++
            return $false
        }
    } catch {
        Write-Host "   ❌ ERROR: $_" -ForegroundColor Red
        $testResults.failed++
        return $false
    }
}

# ============================================================================
# ТЕСТ 1: Проверка файловой структуры
# ============================================================================

Test-Component -Name "Рабочая директория существует" -TestBlock {
    Test-Path $workDir
}

Test-Component -Name "Файл env.local существует" -TestBlock {
    Test-Path "$workDir\env.local"
}

Test-Component -Name "Файл package.json существует" -TestBlock {
    Test-Path "$workDir\package.json"
}

Test-Component -Name "Директория app/api существует" -TestBlock {
    Test-Path "$workDir\app\api"
}

Test-Component -Name "Директория tg-bot существует" -TestBlock {
    Test-Path "$workDir\tg-bot"
}

# ============================================================================
# ТЕСТ 2: Проверка переменных окружения
# ============================================================================

Test-Component -Name "SUPABASE_URL в env.local" -TestBlock {
    $envContent = Get-Content "$workDir\env.local"
    $envContent | Select-String "NEXT_PUBLIC_SUPABASE_URL=" | Measure-Object | Select-Object -ExpandProperty Count -gt 0
}

Test-Component -Name "TELEGRAM_BOT_TOKEN в env.local" -TestBlock {
    $envContent = Get-Content "$workDir\env.local"
    $envContent | Select-String "TELEGRAM_BOT_TOKEN=" | Measure-Object | Select-Object -ExpandProperty Count -gt 0
}

Test-Component -Name "TELEGRAM_API_ID в env.local" -TestBlock {
    $envContent = Get-Content "$workDir\env.local"
    $envContent | Select-String "TELEGRAM_API_ID=" | Measure-Object | Select-Object -ExpandProperty Count -gt 0
}

Test-Component -Name "OR_TOKEN (AI API) в env.local" -TestBlock {
    $envContent = Get-Content "$workDir\env.local"
    $envContent | Select-String "OR_TOKEN=" | Measure-Object | Select-Object -ExpandProperty Count -gt 0
}

# ============================================================================
# ТЕСТ 3: Проверка критических файлов
# ============================================================================

Test-Component -Name "start-spor3z-improved.js существует" -TestBlock {
    Test-Path "$workDir\start-spor3z-improved.js"
}

Test-Component -Name "tg-bot/enhanced-bot.js существует" -TestBlock {
    Test-Path "$workDir\tg-bot\enhanced-bot.js"
}

Test-Component -Name "API route /api/ai существует" -TestBlock {
    Test-Path "$workDir\app\api\ai\route.ts"
}

Test-Component -Name "API route /api/init-user существует" -TestBlock {
    Test-Path "$workDir\app\api\init-user\route.ts"
}

# ============================================================================
# ТЕСТ 4: Проверка запущенных служб
# ============================================================================

Test-Component -Name "Next.js Server (порт 3000)" -TestBlock {
    $port3000 = netstat -ano | Select-String ":3000\s" | Select-String "LISTENING"
    $null -ne $port3000
}

Test-Component -Name "Ngrok процесс" -TestBlock {
    $ngrokProcess = Get-Process -Name "ngrok" -ErrorAction SilentlyContinue
    $null -ne $ngrokProcess
}

Test-Component -Name "Node.js процессы (боты)" -TestBlock {
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    $null -ne $nodeProcesses
}

# ============================================================================
# ТЕСТ 5: Проверка HTTP endpoints
# ============================================================================

Test-Component -Name "Next.js Server отвечает (localhost)" -TestBlock {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        $response.StatusCode -eq 200
    } catch {
        $false
    }
}

Test-Component -Name "Ngrok туннель отвечает" -TestBlock {
    try {
        $response = Invoke-WebRequest -Uri "https://humane-jaguar-annually.ngrok-free.app" -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
        $response.StatusCode -eq 200
    } catch {
        $false
    }
}

# ============================================================================
# ТЕСТ 6: Проверка API endpoints (если сервер запущен)
# ============================================================================

$serverRunning = Test-Path "http://localhost:3000" -ErrorAction SilentlyContinue

if ($serverRunning) {
    Test-Component -Name "API Health endpoint" -TestBlock {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
            $response.StatusCode -eq 200
        } catch {
            $false
        }
    }
}

# ============================================================================
# ТЕСТ 7: Проверка конфигурации ботов
# ============================================================================

Test-Component -Name "start-spor3z использует BASE_API_URL" -TestBlock {
    $spor3zContent = Get-Content "$workDir\start-spor3z-improved.js" -Raw
    $spor3zContent -match "BASE_API_URL"
}

Test-Component -Name "enhanced-bot использует this.apiUrl" -TestBlock {
    $botContent = Get-Content "$workDir\tg-bot\enhanced-bot.js" -Raw
    $botContent -match "this\.apiUrl"
}

# ============================================================================
# ИТОГОВЫЕ РЕЗУЛЬТАТЫ
# ============================================================================

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║              📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ                  ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$passRate = [math]::Round(($testResults.passed / $testResults.total) * 100, 2)

Write-Host "Всего тестов:    $($testResults.total)" -ForegroundColor White
Write-Host "Пройдено:        $($testResults.passed)" -ForegroundColor Green
Write-Host "Провалено:       $($testResults.failed)" -ForegroundColor Red
Write-Host "Процент успеха:  $passRate%" -ForegroundColor $(if ($passRate -ge 80) { "Green" } elseif ($passRate -ge 60) { "Yellow" } else { "Red" })
Write-Host ""

if ($passRate -eq 100) {
    Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║              ✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ!                     ║" -ForegroundColor Green
    Write-Host "║       Система готова к использованию! 🎉               ║" -ForegroundColor Green
    Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Green
} elseif ($passRate -ge 80) {
    Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
    Write-Host "║      ⚠️  БОЛЬШИНСТВО ТЕСТОВ ПРОЙДЕНО                   ║" -ForegroundColor Yellow
    Write-Host "║  Система работоспособна, но есть предупреждения       ║" -ForegroundColor Yellow
    Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
} else {
    Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║         ❌ КРИТИЧЕСКИЕ ОШИБКИ                           ║" -ForegroundColor Red
    Write-Host "║  Система требует исправлений перед запуском           ║" -ForegroundColor Red
    Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Red
}

Write-Host ""

# ============================================================================
# РЕКОМЕНДАЦИИ
# ============================================================================

if ($testResults.failed -gt 0) {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host "💡 РЕКОМЕНДАЦИИ:" -ForegroundColor Cyan
    Write-Host ""
    
    # Проверяем конкретные проблемы
    $port3000 = netstat -ano | Select-String ":3000\s" | Select-String "LISTENING"
    if (-not $port3000) {
        Write-Host "   ⚠️  Next.js сервер не запущен" -ForegroundColor Yellow
        Write-Host "      Запустите: .\start-all-services.ps1" -ForegroundColor Gray
        Write-Host ""
    }
    
    $ngrokProcess = Get-Process -Name "ngrok" -ErrorAction SilentlyContinue
    if (-not $ngrokProcess) {
        Write-Host "   ⚠️  Ngrok не запущен" -ForegroundColor Yellow
        Write-Host "      Запустите: ngrok http --domain=humane-jaguar-annually.ngrok-free.app 3000" -ForegroundColor Gray
        Write-Host ""
    }
}

Write-Host ""
pause


