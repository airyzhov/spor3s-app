# 🛑 Остановка всех служб Spor3s

Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Red
Write-Host "║         🛑 ОСТАНОВКА ВСЕХ СЛУЖБ SPOR3S                  ║" -ForegroundColor Red
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Red
Write-Host ""

# Функция для остановки процесса по порту
function Stop-ProcessByPort {
    param ([int]$Port)
    
    $connections = netstat -ano | Select-String ":$Port\s" | Select-String "LISTENING"
    
    foreach ($connection in $connections) {
        $parts = $connection -split '\s+'
        $pid = $parts[-1]
        
        if ($pid -and $pid -ne "0") {
            try {
                $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
                if ($process) {
                    Write-Host "🔴 Остановка процесса на порту ${Port}: $($process.ProcessName) (PID: $pid)" -ForegroundColor Yellow
                    Stop-Process -Id $pid -Force
                    Write-Host "   ✅ Процесс остановлен" -ForegroundColor Green
                }
            } catch {
                Write-Host "   ❌ Ошибка при остановке процесса: $_" -ForegroundColor Red
            }
        }
    }
}

# Функция для остановки процессов по имени
function Stop-ProcessByName {
    param ([string]$ProcessName)
    
    $processes = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue
    
    if ($processes) {
        foreach ($process in $processes) {
            Write-Host "🔴 Остановка: $ProcessName (PID: $($process.Id))" -ForegroundColor Yellow
            Stop-Process -Id $process.Id -Force
        }
        Write-Host "   ✅ Все процессы $ProcessName остановлены" -ForegroundColor Green
    } else {
        Write-Host "   ℹ️  Процессы $ProcessName не найдены" -ForegroundColor Gray
    }
}

# 1. Остановка Next.js (порт 3000)
Write-Host "1️⃣  Остановка Next.js Server (порт 3000)..." -ForegroundColor Cyan
Stop-ProcessByPort -Port 3000

# 2. Остановка ngrok
Write-Host ""
Write-Host "2️⃣  Остановка Ngrok..." -ForegroundColor Cyan
Stop-ProcessByName -ProcessName "ngrok"

# 3. Остановка Node.js процессов (боты)
Write-Host ""
Write-Host "3️⃣  Остановка Node.js процессов..." -ForegroundColor Cyan

# Получаем все Node процессы и проверяем их командные строки
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue

if ($nodeProcesses) {
    foreach ($proc in $nodeProcesses) {
        try {
            $cmdLine = (Get-WmiObject Win32_Process -Filter "ProcessId = $($proc.Id)").CommandLine
            
            # Проверяем, относится ли процесс к нашим ботам
            if ($cmdLine -match "enhanced-bot\.js" -or $cmdLine -match "start-spor3z-improved\.js") {
                Write-Host "🔴 Остановка Node процесса: $cmdLine (PID: $($proc.Id))" -ForegroundColor Yellow
                Stop-Process -Id $proc.Id -Force
                Write-Host "   ✅ Процесс остановлен" -ForegroundColor Green
            }
        } catch {
            # Игнорируем ошибки доступа
        }
    }
} else {
    Write-Host "   ℹ️  Node.js процессы не найдены" -ForegroundColor Gray
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║              ✅ ВСЕ СЛУЖБЫ ОСТАНОВЛЕНЫ!                 ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# Проверка портов
Write-Host "📊 Проверка портов..." -ForegroundColor Cyan
$port3000 = netstat -ano | Select-String ":3000\s" | Select-String "LISTENING"
if ($port3000) {
    Write-Host "   ⚠️  Порт 3000 всё ещё занят" -ForegroundColor Yellow
} else {
    Write-Host "   ✅ Порт 3000 свободен" -ForegroundColor Green
}

Write-Host ""
pause


