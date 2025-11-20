# 🚀 Инструкция по деплою исправлений чата на VPS

## Вариант 1: Через SSH (если доступен)

### Шаг 1: Подключитесь к VPS
```bash
ssh root@185.166.197.49
```

### Шаг 2: Выполните команды на VPS
```bash
cd /var/www/spor3s-app

# Очистка кэша
rm -rf .next

# Установка зависимостей (если нужно)
npm install

# Сборка приложения
npm run build

# Перезапуск Next.js
pm2 restart spor3s-nextjs

# Проверка статуса
pm2 status
pm2 logs spor3s-nextjs --lines 30
```

## Вариант 2: Через Git (если репозиторий настроен)

### Шаг 1: Закоммитьте изменения
```bash
cd spor3s-app
git add .
git commit -m "Fix: Исправления чата и интерфейса - SSR, кнопки, обработчики"
git push origin main
```

### Шаг 2: На VPS выполните
```bash
ssh root@185.166.197.49
cd /var/www/spor3s-app
git pull origin main
npm install
npm run build
pm2 restart spor3s-nextjs
```

## Вариант 3: Ручное копирование файлов через SCP

### На Windows (PowerShell):
```powershell
# Копирование исправленных файлов
scp spor3s-app/app/(client)/chat.tsx root@185.166.197.49:/var/www/spor3s-app/spor3s-app/app/(client)/chat.tsx
scp spor3s-app/app/(client)/page.tsx root@185.166.197.49:/var/www/spor3s-app/spor3s-app/app/(client)/page.tsx
scp spor3s-app/app/(client)/AppClient.tsx root@185.166.197.49:/var/www/spor3s-app/spor3s-app/app/(client)/AppClient.tsx
scp spor3s-app/lib/supabase.ts root@185.166.197.49:/var/www/spor3s-app/spor3s-app/lib/supabase.ts
scp spor3s-app/app/CartContext.tsx root@185.166.197.49:/var/www/spor3s-app/spor3s-app/app/CartContext.tsx
```

### Затем на VPS:
```bash
cd /var/www/spor3s-app
rm -rf .next
npm run build
pm2 restart spor3s-nextjs
```

## Вариант 4: Через WinSCP или FileZilla

1. Подключитесь к серверу через WinSCP/FileZilla
2. Скопируйте следующие файлы:
   - `spor3s-app/app/(client)/chat.tsx`
   - `spor3s-app/app/(client)/page.tsx`
   - `spor3s-app/app/(client)/AppClient.tsx`
   - `spor3s-app/lib/supabase.ts`
   - `spor3s-app/app/CartContext.tsx`
3. На VPS выполните команды из Варианта 1

## 📋 Исправленные файлы:

1. **chat.tsx** - Исправлены проблемы с SSR, добавлены проверки window/document
2. **page.tsx** - Исправлены проблемы с window.innerWidth и localStorage
3. **AppClient.tsx** - Уже был исправлен ранее
4. **supabase.ts** - Убран throw Error, теперь возвращает null
5. **CartContext.tsx** - Проверен на корректность

## ✅ После деплоя проверьте:

1. Откройте https://ai.spor3s.ru
2. Проверьте работу кнопок навигации (AI Консультант, Каталог, Ваш прогресс)
3. Проверьте работу чата (отправка сообщений)
4. Проверьте добавление товаров в корзину
5. Проверьте работу кнопок в витрине товаров

## 🔍 Проверка логов на VPS:

```bash
pm2 logs spor3s-nextjs --lines 50
```

## 🐛 Если что-то не работает:

1. Проверьте логи: `pm2 logs spor3s-nextjs`
2. Проверьте статус: `pm2 status`
3. Перезапустите: `pm2 restart spor3s-nextjs`
4. Проверьте сборку: `npm run build` (должна пройти без ошибок)

