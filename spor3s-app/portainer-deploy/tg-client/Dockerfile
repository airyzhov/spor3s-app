FROM node:18-alpine

WORKDIR /app

# Копирование package файлов
COPY package*.json ./

# Установка зависимостей
RUN npm ci --only=production

# Копирование исходного кода
COPY . .

# Создание пользователя
RUN addgroup -g 1001 -S nodejs
RUN adduser -S client -u 1001

# Смена владельца
RUN chown -R client:nodejs /app
USER client

# Экспорт порта
EXPOSE 3002

# Запуск клиента
CMD ["node", "client.js"]
