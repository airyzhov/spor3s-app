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
RUN adduser -S bot -u 1001

# Смена владельца
RUN chown -R bot:nodejs /app
USER bot

# Экспорт порта
EXPOSE 3001

# Запуск бота
CMD ["npm", "start"]
