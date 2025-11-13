# Инструкция по настройке SSH доступа к VPS

## Текущая ситуация

- ✅ GitHub подключен: `https://github.com/airyzhov/spor3s-app.git`
- ✅ VPS доступен по IP: `185.166.197.49` (ping работает)
- ✅ SSH порт 22 открыт
- ❌ SSH подключение не работает (таймаут на этапе аутентификации)

## Причина

SSH ключ не добавлен на сервер или требуется аутентификация по паролю.

## Решение

### Вариант 1: Добавить SSH ключ на сервер (рекомендуется)

**Шаг 1:** Подключитесь к серверу с паролем (один раз):
```bash
ssh root@185.166.197.49
```

**Шаг 2:** На сервере выполните:
```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys
```

**Шаг 3:** Вставьте ваш публичный ключ:
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGcP3w6vMUnQ9OfoLuBIXGOhhHyx2YxaIOl3zml/vT4e cursor
```

**Шаг 4:** Сохраните файл (Ctrl+O, Enter, Ctrl+X) и установите права:
```bash
chmod 600 ~/.ssh/authorized_keys
exit
```

**Шаг 5:** Проверьте подключение без пароля:
```bash
ssh root@185.166.197.49
```

### Вариант 2: Автоматическое добавление ключа

Если у вас есть доступ по паролю, выполните в PowerShell:
```powershell
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh root@185.166.197.49 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

## После настройки

После успешной настройки SSH вы сможете:

1. **Подключаться к серверу:**
   ```bash
   ssh spor3s-vps
   # или
   ssh root@185.166.197.49
   ```

2. **Использовать скрипты деплоя:**
   ```bash
   bash quick-vps-start.sh
   bash deploy-vps-complete.sh
   ```

3. **Копировать файлы:**
   ```bash
   scp file.txt root@185.166.197.49:/var/www/spor3s-app/
   ```

## Проверка подключения

После настройки проверьте:
```bash
ssh root@185.166.197.49 "echo 'Connected successfully' && pwd && whoami"
```

## Альтернативные способы подключения

Если SSH не работает, можно использовать:

1. **WinSCP** - графический SFTP клиент
2. **FileZilla** - FTP/SFTP клиент
3. **Portainer** - веб-интерфейс для Docker (если настроен)
4. **Python скрипты с paramiko** - для автоматизации

## Полезные команды

```bash
# Проверка SSH подключения
ssh -v root@185.166.197.49

# Проверка портов
Test-NetConnection -ComputerName 185.166.197.49 -Port 22

# Просмотр публичного ключа
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub
```

