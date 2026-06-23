# Тест SSH подключения с паролем
$password = "qXY.W3,,Be?@gb"
$hostname = "185.166.197.49"
$username = "root"

Write-Host "Попытка подключения к $username@$hostname..." -ForegroundColor Cyan

# Используем sshpass через WSL или создаем временный скрипт
$tempScript = [System.IO.Path]::GetTempFileName() + ".sh"
@"
#!/bin/bash
sshpass -p '$password' ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 $username@$hostname 'echo "Connected" && pwd && whoami && hostname'
"@ | Out-File -FilePath $tempScript -Encoding UTF8

# Пробуем через WSL если доступен
if (Get-Command wsl -ErrorAction SilentlyContinue) {
    Write-Host "Использование WSL для SSH..." -ForegroundColor Yellow
    wsl bash $tempScript
    Remove-Item $tempScript
} else {
    Write-Host "WSL не найден. Попробуйте подключиться вручную:" -ForegroundColor Yellow
    Write-Host "ssh $username@$hostname" -ForegroundColor Cyan
    Write-Host "Пароль: $password" -ForegroundColor Gray
}

