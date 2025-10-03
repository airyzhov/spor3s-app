# Подключение к серверу через Windows

## 🔗 Способы подключения

### 1. Windows Terminal (рекомендуется)

#### Установка Windows Terminal
1. Открыть Microsoft Store
2. Найти "Windows Terminal"
3. Установить приложение

#### Подключение
```bash
# Открыть Windows Terminal
# Нажать Ctrl+Shift+P → "New Tab"
# Выбрать "Command Prompt" или "PowerShell"

# Подключиться к серверу:
ssh root@your-server-ip
# или
ssh root@your-domain.com

# Ввести пароль при запросе
```

### 2. PowerShell (встроенный)

#### Открыть PowerShell
1. Нажать `Win + R`
2. Ввести `powershell`
3. Нажать Enter

#### Подключение
```powershell
# Подключиться к серверу
ssh root@your-server-ip

# Если SSH не работает, установить OpenSSH:
# Settings → Apps → Optional features → Add a feature → OpenSSH Client
```

### 3. PuTTY (классический вариант)

#### Установка PuTTY
1. Скачать с https://www.putty.org/
2. Установить приложение

#### Настройка подключения
1. Запустить PuTTY
2. В поле "Host Name" ввести IP сервера или домен
3. Порт: 22
4. Connection type: SSH
5. Нажать "Open"
6. Ввести логин: `root`
7. Ввести пароль

### 4. Git Bash (если установлен Git)

#### Открыть Git Bash
1. Нажать правой кнопкой в папке
2. Выбрать "Git Bash Here"

#### Подключение
```bash
ssh root@your-server-ip
```

## 🔐 Настройка SSH ключей (рекомендуется)

### Создание ключа на Windows
```bash
# В Windows Terminal или PowerShell:
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"

# Следовать инструкциям:
# Enter file in which to save the key: (нажать Enter)
# Enter passphrase: (можно оставить пустым)
# Enter same passphrase again: (повторить)
```

### Копирование ключа на сервер
```bash
# Автоматическое копирование:
ssh-copy-id root@your-server-ip

# Или вручную:
type $env:USERPROFILE\.ssh\id_rsa.pub | ssh root@your-server-ip "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

### Проверка подключения
```bash
# Теперь можно подключаться без пароля:
ssh root@your-server-ip
```

## 📁 Загрузка файлов на сервер

### Через SCP (в PowerShell)
```powershell
# Загрузить папку на сервер
scp -r C:\path\to\spor3s-app\* root@your-server-ip:/opt/spor3s-app/

# Загрузить один файл
scp C:\path\to\file.txt root@your-server-ip:/opt/spor3s-app/
```

### Через WinSCP (графический интерфейс)
1. Скачать WinSCP с https://winscp.net/
2. Установить приложение
3. Создать новое подключение:
   - File protocol: SFTP
   - Host name: your-server-ip
   - Port number: 22
   - User name: root
   - Password: your-password
4. Подключиться и перетащить файлы

### Через FileZilla
1. Скачать FileZilla с https://filezilla-project.org/
2. Установить приложение
3. Создать новое подключение:
   - Host: sftp://your-server-ip
   - Username: root
   - Password: your-password
   - Port: 22
4. Подключиться и перетащить файлы

## 🐳 Работа с Docker через Windows

### Подключение к Portainer
1. Открыть браузер
2. Перейти на `http://your-domain.com:9000`
3. Войти в Portainer

### Управление контейнерами через браузер
1. В Portainer перейти в **Containers**
2. Выбрать нужный контейнер
3. Использовать кнопки:
   - **Start** - запустить
   - **Stop** - остановить
   - **Restart** - перезапустить
   - **Logs** - просмотреть логи
   - **Console** - открыть консоль

### Просмотр логов
1. В Portainer выбрать контейнер
2. Нажать **Logs**
3. Или через терминал:
```bash
ssh root@your-server-ip
docker logs spor3s-nextjs
docker logs spor3s-emergency
docker logs spor3s-nginx
```

## 🔧 Полезные команды для Windows

### Проверка подключения
```powershell
# Проверить доступность сервера
ping your-server-ip

# Проверить порты
Test-NetConnection -ComputerName your-server-ip -Port 22
Test-NetConnection -ComputerName your-server-ip -Port 80
Test-NetConnection -ComputerName your-server-ip -Port 443
```

### Работа с файлами
```powershell
# Создать локальную копию файла с сервера
scp root@your-server-ip:/opt/spor3s-app/docker-compose.yml C:\temp\

# Загрузить файл на сервер
scp C:\temp\docker-compose.yml root@your-server-ip:/opt/spor3s-app/
```

### Мониторинг
```bash
# Подключиться к серверу
ssh root@your-server-ip

# Проверить статус контейнеров
docker ps

# Просмотреть использование ресурсов
htop

# Проверить логи
docker logs -f spor3s-nextjs
```

## 🚀 Быстрый старт

### 1. Подключение к серверу
```bash
# Открыть Windows Terminal
# Подключиться:
ssh root@your-server-ip
```

### 2. Создание директории проекта
```bash
# На сервере:
mkdir -p /opt/spor3s-app
cd /opt/spor3s-app
```

### 3. Загрузка файлов
```powershell
# В PowerShell на Windows:
scp -r C:\Users\User\Documents\spor3s-app\spor3s-app\* root@your-server-ip:/opt/spor3s-app/
```

### 4. Настройка через Portainer
1. Открыть браузер
2. Перейти на `http://your-domain.com:9000`
3. Создать новый Stack с содержимым `docker-compose.yml`

### 5. Запуск приложения
1. В Portainer нажать **Deploy the stack**
2. Дождаться создания контейнеров
3. Проверить доступность на `https://your-domain.com`

## 🔍 Отладка проблем

### Проблема с подключением SSH
```powershell
# Проверить SSH клиент
ssh -V

# Если не установлен:
# Settings → Apps → Optional features → Add a feature → OpenSSH Client
```

### Проблема с SCP
```powershell
# Использовать альтернативный способ:
# WinSCP или FileZilla для загрузки файлов
```

### Проблема с портами
```powershell
# Проверить доступность портов
Test-NetConnection -ComputerName your-server-ip -Port 22
Test-NetConnection -ComputerName your-server-ip -Port 80
Test-NetConnection -ComputerName your-server-ip -Port 443
```

## 📋 Чек-лист

- [ ] Установлен Windows Terminal или PuTTY
- [ ] Настроено SSH подключение
- [ ] Создан SSH ключ (опционально)
- [ ] Загружены файлы проекта на сервер
- [ ] Настроен Portainer
- [ ] Развернут Docker Stack
- [ ] Настроен SSL сертификат
- [ ] Обновлен Telegram Bot webhook
- [ ] Проверена доступность приложения
