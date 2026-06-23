FROM node:18-alpine AS base

# Установка зависимостей
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Копирование package файлов
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Сборка приложения
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Сборка Next.js
RUN npm run build

# Продакшн образ
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

# Создание пользователя
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Копирование собранного приложения
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Копирование emergency сервера
COPY --from=builder /app/emergency_server.js ./

USER nextjs

EXPOSE 3000 5000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
