# Генерация SSH ключа для GitHub Actions
# Запустить в PowerShell

$keyPath = "$env:USERPROFILE\.ssh\github_actions_key"
$pubKeyPath = "$keyPath.pub"

Write-Host "🔑 Генерация SSH ключа для GitHub Actions..." -ForegroundColor Cyan

# Проверяем, существует ли ключ
if (Test-Path $keyPath) {
    $overwrite = Read-Host "Ключ уже существует. Перезаписать? (y/n)"
    if ($overwrite -ne "y") {
        Write-Host "Отменено" -ForegroundColor Yellow
        exit
    }
}

# Генерируем ключ
Write-Host "Генерация ключа..." -ForegroundColor Yellow
ssh-keygen -t ed25519 -C "github-actions-spor3s" -f $keyPath -N '""'

Write-Host "`n✅ Ключ создан!" -ForegroundColor Green
Write-Host "`n📋 Публичный ключ (добавьте на VPS):" -ForegroundColor Cyan
$pubKey = Get-Content $pubKeyPath
Write-Host $pubKey -ForegroundColor Yellow

Write-Host "`n📋 Приватный ключ (добавьте в GitHub Secrets как VPS_SSH_KEY):" -ForegroundColor Cyan
$privKey = Get-Content $keyPath
Write-Host $privKey -ForegroundColor Gray

Write-Host "`n📝 Инструкция:" -ForegroundColor Cyan
Write-Host "1. Скопируйте публичный ключ выше" -ForegroundColor White
Write-Host "2. Добавьте его на VPS:" -ForegroundColor White
Write-Host "   ssh root@185.166.197.49" -ForegroundColor Yellow
Write-Host "   echo '$pubKey' >> ~/.ssh/authorized_keys" -ForegroundColor Yellow
Write-Host "   chmod 600 ~/.ssh/authorized_keys" -ForegroundColor Yellow
Write-Host "`n3. Скопируйте приватный ключ выше" -ForegroundColor White
Write-Host "4. Добавьте его в GitHub Secrets как VPS_SSH_KEY" -ForegroundColor White
Write-Host "   GitHub → Settings → Secrets → Actions → New secret" -ForegroundColor Yellow

