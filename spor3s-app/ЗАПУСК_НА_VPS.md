# 🚀 ЗАПУСК БОТОВ НА VPS

## 📊 Текущий статус

✅ **AI API:** Работает на https://ai.spor3s.ru/api/ai  
✅ **Supabase RAG:** Подключен и работает  
✅ **@spor3s_bot:** Активен в Telegram (ID: 6522297183)  
⚠️ **Процессы ботов:** Требуют запуска на VPS

---

## 🔧 Подготовка на VPS

### 1. Подключитесь к VPS через SSH

```bash
ssh root@185.166.197.49
# или
ssh user@185.166.197.49
```

### 2. Перейдите в директорию проекта

```bash
cd /root/spor3s-app/spor3s-app
# или
cd /var/www/spor3s-app/spor3s-app
# или где установлен проект
```

### 3. Проверьте текущий статус

```bash
# Сделать скрипт исполняемым
chmod +x vps-check-bots.sh

# Запустить проверку
./vps-check-bots.sh
```

---

## 🚀 Запуск ботов

### Вариант 1: Через PM2 (рекомендуется)

#### Установка PM2 (если еще не установлен)

```bash
npm install -g pm2
```

#### Запуск @spor3s_bot

```bash
cd /root/spor3s-app/spor3s-app/tg-bot
pm2 start enhanced-bot.js --name "spor3s-bot"
```

#### Запуск @spor3z Agent

```bash
cd /root/spor3s-app/spor3s-app
pm2 start start-spor3z-improved.js --name "spor3z-agent"
```

#### Сохранение конфигурации PM2

```bash
# Сохранить список процессов
pm2 save

# Настроить автозапуск при перезагрузке
pm2 startup

# Выполнить команду, которую выдаст pm2 startup
# Например: sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root
```

#### Управление процессами

```bash
# Посмотреть список процессов
pm2 list

# Посмотреть логи
pm2 logs

# Посмотреть логи конкретного процесса
pm2 logs spor3s-bot
pm2 logs spor3z-agent

# Перезапустить процесс
pm2 restart spor3s-bot
pm2 restart spor3z-agent

# Остановить процесс
pm2 stop spor3s-bot
pm2 stop spor3z-agent

# Удалить процесс из списка
pm2 delete spor3s-bot
pm2 delete spor3z-agent
```

---

### Вариант 2: Через screen/tmux (для разработки)

#### Запуск в screen

```bash
# Создать screen сессию для @spor3s_bot
screen -S spor3s-bot
cd /root/spor3s-app/spor3s-app/tg-bot
node enhanced-bot.js

# Отключиться от screen: Ctrl+A, затем D

# Создать screen сессию для @spor3z
screen -S spor3z-agent
cd /root/spor3s-app/spor3s-app
node start-spor3z-improved.js

# Отключиться от screen: Ctrl+A, затем D
```

#### Управление screen сессиями

```bash
# Посмотреть активные сессии
screen -ls

# Подключиться к сессии
screen -r spor3s-bot
screen -r spor3z-agent

# Завершить сессию
screen -X -S spor3s-bot quit
screen -X -S spor3z-agent quit
```

---

### Вариант 3: Через systemd (production)

#### Создать сервис для @spor3s_bot

```bash
sudo nano /etc/systemd/system/spor3s-bot.service
```

Содержимое файла:

```ini
[Unit]
Description=Spor3s Telegram Bot
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/spor3s-app/spor3s-app/tg-bot
ExecStart=/usr/bin/node enhanced-bot.js
Restart=always
RestartSec=10
StandardOutput=append:/var/log/spor3s-bot.log
StandardError=append:/var/log/spor3s-bot.err
Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target
```

#### Создать сервис для @spor3z

```bash
sudo nano /etc/systemd/system/spor3z-agent.service
```

Содержимое файла:

```ini
[Unit]
Description=Spor3z Telegram Agent
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/spor3s-app/spor3s-app
ExecStart=/usr/bin/node start-spor3z-improved.js
Restart=always
RestartSec=10
StandardOutput=append:/var/log/spor3z-agent.log
StandardError=append:/var/log/spor3z-agent.err
Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target
```

#### Запустить сервисы

```bash
# Перезагрузить systemd
sudo systemctl daemon-reload

# Включить автозапуск
sudo systemctl enable spor3s-bot spor3z-agent

# Запустить сервисы
sudo systemctl start spor3s-bot spor3z-agent

# Проверить статус
sudo systemctl status spor3s-bot
sudo systemctl status spor3z-agent
```

#### Управление systemd сервисами

```bash
# Перезапустить
sudo systemctl restart spor3s-bot
sudo systemctl restart spor3z-agent

# Остановить
sudo systemctl stop spor3s-bot
sudo systemctl stop spor3z-agent

# Посмотреть логи
sudo journalctl -u spor3s-bot -f
sudo journalctl -u spor3z-agent -f
```

---

## 📋 Проверка после запуска

### 1. Проверить процессы

```bash
# Через ps
ps aux | grep node

# Через PM2
pm2 list

# Через systemctl
sudo systemctl status spor3s-bot spor3z-agent
```

### 2. Проверить логи

```bash
# PM2
pm2 logs

# Прямые логи
tail -f bot.log
tail -f bot.err

# Systemd
sudo journalctl -u spor3s-bot -f
sudo journalctl -u spor3z-agent -f
```

### 3. Проверить API

```bash
# Тест AI API
curl -X POST https://ai.spor3s.ru/api/ai \
  -H "Content-Type: application/json" \
  -d '{"message":"Привет","source":"test"}' \
  | jq
```

### 4. Проверить боты в Telegram

**@spor3s_bot:**
```
Отправьте боту: /start
```

**@spor3z:**
```
Отправьте личное сообщение: Привет
```

---

## 🛠️ Устранение проблем

### Бот не отвечает

```bash
# 1. Проверить процесс
pm2 list
ps aux | grep enhanced-bot

# 2. Посмотреть логи
pm2 logs spor3s-bot --lines 100

# 3. Перезапустить
pm2 restart spor3s-bot
```

### Ошибка "Cannot find module"

```bash
# Установить зависимости
cd /root/spor3s-app/spor3s-app
npm install

cd /root/spor3s-app/spor3s-app/tg-bot
npm install
```

### Ошибка подключения к Supabase

```bash
# Проверить .env файлы
cat env.local | grep SUPABASE

# Убедиться, что переменные установлены
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### API не отвечает

```bash
# 1. Проверить Next.js процесс
pm2 list | grep next

# 2. Проверить Nginx
sudo nginx -t
sudo systemctl status nginx

# 3. Проверить порт 3000
netstat -tuln | grep 3000
```

---

## 📊 Мониторинг

### PM2 Monitoring

```bash
# Установить PM2 Plus (опционально)
pm2 link <secret> <public>

# Открыть веб-интерфейс
pm2 web
```

### Логирование

```bash
# Ротация логов для PM2
pm2 install pm2-logrotate

# Настроить ротацию
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## 🔐 Безопасность

### Проверить права на файлы

```bash
# env.local должен быть доступен только владельцу
chmod 600 env.local
chmod 600 tg-bot/env.local
```

### Обновить пакеты

```bash
# Обновить npm пакеты
npm audit fix

# Обновить Node.js (через nvm)
nvm install --lts
nvm use --lts
```

---

## 📞 Команды для быстрого старта

### Полный перезапуск всех сервисов

```bash
# PM2
pm2 restart all

# Systemd
sudo systemctl restart spor3s-bot spor3z-agent nginx

# Проверить статус
pm2 list
sudo systemctl status spor3s-bot spor3z-agent nginx
```

### Полная остановка

```bash
# PM2
pm2 stop all

# Systemd
sudo systemctl stop spor3s-bot spor3z-agent
```

### Проверка здоровья системы

```bash
# Запустить проверку
./vps-check-bots.sh

# Или вручную
pm2 list
curl https://ai.spor3s.ru/api/ai -X POST -d '{"message":"test"}' -H "Content-Type: application/json"
```

---

## 📝 Чеклист финального запуска

- [ ] SSH подключение к VPS работает
- [ ] Проект находится в `/root/spor3s-app/spor3s-app`
- [ ] Файлы `env.local` существуют и корректны
- [ ] Зависимости npm установлены (`npm install`)
- [ ] PM2 установлен (`npm install -g pm2`)
- [ ] Боты запущены через PM2
- [ ] PM2 сохранен (`pm2 save`)
- [ ] PM2 автозапуск настроен (`pm2 startup`)
- [ ] Логи пишутся корректно (`pm2 logs`)
- [ ] @spor3s_bot отвечает в Telegram
- [ ] @spor3z отвечает в Telegram
- [ ] AI API работает (`curl https://ai.spor3s.ru/api/ai`)
- [ ] Nginx конфигурация корректна (`nginx -t`)
- [ ] SSL сертификат установлен для ai.spor3s.ru

---

**Дата создания:** ${new Date().toLocaleString('ru-RU')}  
**Автор:** AI Agent  
**Проект:** Spor3s AI Chats

_После завершения всех шагов все ИИ чаты будут работать и отвечать корректно!_

