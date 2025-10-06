# 🌐 Настройка ngrok для spor3s-app

## ✅ Что сделано:

### 1. 🔧 **Обновлена конфигурация Next.js**
- Добавлен домен `humane-jaguar-annually.ngrok-free.app` в разрешенные
- Настроены CORS headers для внешних запросов
- Добавлена поддержка изображений через ngrok

### 2. 🚀 **Команды для запуска:**

#### **Вариант 1: Автоматический (рекомендуется)**
```bash
# Терминал 1: Запуск приложения
cd C:\Users\User\Documents\spor3s-app\spor3s-app
npm run dev

# Терминал 2: Запуск ngrok с доменом
ngrok http --domain=humane-jaguar-annually.ngrok-free.app 3001
```

#### **Вариант 2: Через PowerShell**
```powershell
# Терминал 1
cd C:\Users\User\Documents\spor3s-app\spor3s-app; npm run dev

# Терминал 2 (новое окно)
ngrok http --domain=humane-jaguar-annually.ngrok-free.app 3001
```

### 3. 📱 **Для Telegram Mini App:**

#### **Настройка бота:**
1. Откройте @BotFather в Telegram
2. Выберите ваш бот командой `/mybots`
3. Нажмите "Bot Settings" → "Menu Button" 
4. Установите URL: `https://humane-jaguar-annually.ngrok-free.app`

#### **Альтернативно через команды бота:**
```
/setmenubutton
<ваш_бот>
<название_кнопки>
https://humane-jaguar-annually.ngrok-free.app
```

### 4. 🔍 **Проверка работы:**

#### **1. Откройте в браузере:**
- https://humane-jaguar-annually.ngrok-free.app
- Должен загрузиться spor3s-app с психоделическим фоном

#### **2. Проверьте функции:**
- AI чат отвечает с кнопками
- Быстрое меню товаров работает
- Переход между разделами функционирует
- Dashboard с прогрессом загружается

#### **3. В Telegram:**
- Откройте ваш бот
- Нажмите кнопку Menu или отправьте команду с webapp
- Приложение должно открыться в мини-приложении

---

## 🛠️ Возможные проблемы и решения:

### ❌ **"ngrok not found"**
```bash
# Установка ngrok
winget install ngrok.ngrok
# или скачайте с https://ngrok.com/download
```

### ❌ **"Port 3001 is not available"**
```bash
# Узнайте какой порт использует ваше приложение
npm run dev
# Запустите ngrok для правильного порта
ngrok http --domain=humane-jaguar-annually.ngrok-free.app <ВАШ_ПОРТ>
```

### ❌ **"Domain not found"**
- Убедитесь что домен `humane-jaguar-annually.ngrok-free.app` принадлежит вашему ngrok аккаунту
- Возможно нужно авторизоваться: `ngrok authtoken <ваш_токен>`

### ❌ **CORS ошибки**
- Конфигурация уже обновлена в `next.config.js`
- Перезапустите приложение после изменений

---

## 📋 **Быстрый чеклист:**

- [ ] Приложение запущено: `npm run dev`
- [ ] ngrok запущен: `ngrok http --domain=humane-jaguar-annually.ngrok-free.app 3001`
- [ ] Домен открывается в браузере
- [ ] AI чат работает
- [ ] Telegram бот настроен с новым URL
- [ ] Mini App открывается в Telegram

---

## 🎯 **Итоговые URL:**

- **Веб-версия**: https://humane-jaguar-annually.ngrok-free.app
- **Локальная версия**: http://localhost:3001  
- **API**: https://humane-jaguar-annually.ngrok-free.app/api/
- **Telegram WebApp**: устанавливается в настройках бота

Готово! Ваше приложение доступно через ngrok 🚀 