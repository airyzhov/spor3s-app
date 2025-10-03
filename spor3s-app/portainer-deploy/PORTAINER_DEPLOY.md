  # 🐳 ДЕПЛОЙ SPOR3S ЧЕРЕЗ PORTAINER

## 📋 Подготовка

### 1. Требования к серверу
- **ОС**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- **RAM**: Минимум 2GB (рекомендуется 4GB+)
- **CPU**: 2 ядра+
- **Диск**: 20GB+ свободного места
- **Порты**: 80, 443, 9000 (Portainer)

### 2. Установка Docker и Portainer
```bash
# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Установка Portainer
docker volume create portainer_data
docker run -d -p 9000:9000 --name=portainer --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data portainer/portainer-ce:latest
```

## 🚀 Деплой через Portainer

### 1. Подготовка файлов
```bash
# Создайте папку для проекта
mkdir -p /opt/spor3s-app
cd /opt/spor3s-app

# Загрузите архив на сервер
scp spor3s-app-deploy.zip user@your-server:/opt/spor3s-app/

# Распакуйте
unzip spor3s-app-deploy.zip
```

### 2. Настройка переменных окружения
```bash
# Скопируйте пример
cp env.example .env

# Отредактируйте файл
nano .env
```

**Заполните обязательные переменные:**
```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Telegram
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_API_ID=your-api-id
TELEGRAM_API_HASH=your-api-hash

# AI API
OPENROUTER_API_KEY=your-openrouter-key

# Приложение
NEXT_PUBLIC_BASE_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com
```

### 3. Запуск через Portainer

#### Вариант A: Через веб-интерфейс
1. Откройте Portainer: `http://your-server:9000`
2. Создайте аккаунт администратора
3. Перейдите в **Stacks** → **Add stack**
4. Введите имя: `spor3s`
5. Загрузите файл `docker-compose.portainer.yml`
6. Нажмите **Deploy the stack**

#### Вариант B: Через командную строку
```bash
# Перейдите в папку проекта
cd /opt/spor3s-app

# Запустите стек
docker-compose -f docker-compose.portainer.yml up -d
```

### 4. Настройка Nginx (опционально)
```bash
# Создайте SSL сертификаты
mkdir -p ssl
# Поместите ваши сертификаты в папку ssl/

# Или используйте Let's Encrypt
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com
```

## 📊 Мониторинг

### Проверка статуса контейнеров
```bash
# Через Portainer UI
# Stacks → spor3s → Containers

# Через командную строку
docker ps
docker logs spor3s-app
docker logs spor3s-bot
docker logs spor3s-client
```

### Проверка логов
```bash
# Логи приложения
docker logs -f spor3s-app

# Логи бота
docker logs -f spor3s-bot

# Логи клиента
docker logs -f spor3s-client

# Логи Nginx
docker logs -f spor3s-nginx
```

## 🔧 Управление

### Обновление приложения
```bash
# Остановите стек
docker-compose -f docker-compose.portainer.yml down

# Обновите код
git pull origin main

# Пересоберите и запустите
docker-compose -f docker-compose.portainer.yml up -d --build
```

### Управление контентом
```bash
# Войдите в контейнер приложения
docker exec -it spor3s-app sh

# Запустите редактор контента
npm run content-editor
```

### Резервное копирование
```bash
# Создайте бэкап данных
docker run --rm -v spor3s-app_spor3s-data:/data -v $(pwd):/backup alpine tar czf /backup/spor3s-backup-$(date +%Y%m%d).tar.gz -C /data .

# Восстановление
docker run --rm -v spor3s-app_spor3s-data:/data -v $(pwd):/backup alpine tar xzf /backup/spor3s-backup-20241203.tar.gz -C /data
```

## 🚨 Устранение неполадок

### Проблемы с подключением
```bash
# Проверьте статус контейнеров
docker ps -a

# Проверьте логи
docker logs spor3s-app

# Проверьте сеть
docker network ls
docker network inspect spor3s-app_spor3s-network
```

### Проблемы с переменными окружения
```bash
# Проверьте переменные в контейнере
docker exec spor3s-app env | grep SUPABASE
docker exec spor3s-app env | grep TELEGRAM
```

### Проблемы с базой данных
```bash
# Проверьте подключение к Supabase
curl -X GET "https://your-project.supabase.co/rest/v1/" \
  -H "apikey: your-anon-key"
```

## 📈 Масштабирование

### Горизонтальное масштабирование
```bash
# Увеличьте количество экземпляров приложения
docker-compose -f docker-compose.portainer.yml up -d --scale spor3s-app=3
```

### Мониторинг ресурсов
```bash
# Статистика использования ресурсов
docker stats

# Мониторинг через Portainer
# Dashboard → Containers → Resource usage
```

## 🔒 Безопасность

### Настройка файрвола
```bash
# Откройте только необходимые порты
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 9000
sudo ufw enable
```

### Обновление контейнеров
```bash
# Регулярно обновляйте базовые образы
docker-compose -f docker-compose.portainer.yml pull
docker-compose -f docker-compose.portainer.yml up -d
```

## ✅ Чек-лист деплоя

- [ ] Docker и Portainer установлены
- [ ] Файлы проекта загружены
- [ ] Переменные окружения настроены
- [ ] Стек развернут в Portainer
- [ ] Все контейнеры запущены
- [ ] Приложение доступно по адресу
- [ ] Telegram боты работают
- [ ] SSL сертификаты настроены
- [ ] Мониторинг настроен
- [ ] Бэкапы настроены

## 🎯 Результат

**Время деплоя**: ~15 минут
**Доступ к приложению**: `https://your-domain.com`
**Доступ к Portainer**: `http://your-server:9000`

**Готовые компоненты**:
- ✅ Next.js приложение (контейнер)
- ✅ Telegram бот (контейнер)
- ✅ Telegram клиент (контейнер)
- ✅ Nginx прокси (контейнер)
- ✅ Система управления контентом
- ✅ Автоматические перезапуски
- ✅ Мониторинг через Portainer

**🎉 Проект успешно развернут через Portainer!**
