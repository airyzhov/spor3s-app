#!/usr/bin/env node
/**
 * Запуск всех агентов spor3s на VPS
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function exec(cmd, options = {}) {
  try {
    console.log(`> ${cmd}`);
    const result = execSync(cmd, { 
      encoding: 'utf-8', 
      stdio: 'inherit',
      ...options 
    });
    return { ok: true, result };
  } catch (error) {
    console.error(`❌ Ошибка: ${error.message}`);
    return { ok: false, error };
  }
}

function checkEnvFile() {
  const envFiles = ['.env.local', '.env', 'env-production'];
  for (const file of envFiles) {
    if (fs.existsSync(file)) {
      console.log(`✅ Найден файл окружения: ${file}`);
      
      // Копируем в tg-bot если нужно
      const botEnvPath = path.join('tg-bot', '.env');
      if (!fs.existsSync(botEnvPath)) {
        fs.copyFileSync(file, botEnvPath);
        console.log(`  📋 Скопирован в tg-bot/.env`);
      }
      
      // Копируем в tg-client если нужно
      const clientEnvPath = path.join('tg-client', '.env.local');
      if (!fs.existsSync(clientEnvPath)) {
        fs.copyFileSync(file, clientEnvPath);
        console.log(`  📋 Скопирован в tg-client/.env.local`);
      }
      
      return true;
    }
  }
  console.error('❌ Файл окружения не найден!');
  return false;
}

function installDependencies() {
  console.log('\n📦 Установка зависимостей...');
  
  // Основной проект
  if (!fs.existsSync('node_modules')) {
    exec('npm install');
  }
  
  // tg-bot
  const botPkgPath = path.join('tg-bot', 'package.json');
  if (fs.existsSync(botPkgPath)) {
    const botModules = path.join('tg-bot', 'node_modules');
    if (!fs.existsSync(botModules)) {
      exec('npm install', { cwd: 'tg-bot' });
    }
  }
}

function buildNextApp() {
  console.log('\n🏗️ Сборка Next.js приложения...');
  
  if (!fs.existsSync('.next')) {
    exec('npm run build');
  } else {
    console.log('  ℹ️ Сборка уже существует, пропускаем');
  }
}

function startWithPM2() {
  console.log('\n🚀 Запуск всех агентов через PM2...');
  
  // Останавливаем старые процессы
  console.log('\n⏹️ Остановка старых процессов...');
  exec('pm2 delete all', { stdio: 'ignore' });
  
  // Запускаем через ecosystem.config.js
  console.log('\n▶️ Запуск через ecosystem.config.js...');
  const result = exec('pm2 start ecosystem.config.js');
  
  if (result.ok) {
    console.log('\n✅ Все агенты запущены!');
    console.log('\n📊 Проверка статуса:');
    exec('pm2 status');
    
    console.log('\n💾 Сохранение конфигурации PM2...');
    exec('pm2 save');
    
    console.log('\n📋 Полезные команды:');
    console.log('  pm2 status              - статус всех процессов');
    console.log('  pm2 logs                - просмотр логов');
    console.log('  pm2 logs spor3s-bot     - логи бота');
    console.log('  pm2 logs spor3z-client  - логи клиента напоминаний');
    console.log('  pm2 restart all         - перезапуск всех');
    console.log('  node check-all-agents.js - полная проверка');
  }
}

async function main() {
  console.log('🎯 Запуск всех агентов spor3s\n');
  console.log('═══════════════════════════════════════\n');
  
  // 1. Проверка окружения
  console.log('1️⃣ Проверка файлов окружения...');
  if (!checkEnvFile()) {
    console.log('\n⚠️ Скопируйте env-production в .env и настройте переменные');
    process.exit(1);
  }
  
  // 2. Установка зависимостей
  console.log('\n2️⃣ Проверка зависимостей...');
  installDependencies();
  
  // 3. Сборка Next.js
  console.log('\n3️⃣ Проверка сборки Next.js...');
  buildNextApp();
  
  // 4. Запуск через PM2
  console.log('\n4️⃣ Запуск через PM2...');
  startWithPM2();
  
  console.log('\n═══════════════════════════════════════');
  console.log('✅ Готово! Все агенты запущены.');
  console.log('\n🔍 Проверьте статус:');
  console.log('  node check-all-agents.js');
}

main().catch(console.error);

