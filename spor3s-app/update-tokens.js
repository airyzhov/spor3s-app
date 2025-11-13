// Скрипт для обновления токенов
const fs = require('fs');
const path = require('path');

console.log('🔧 ОБНОВЛЕНИЕ ТОКЕНОВ');
console.log('=' .repeat(50));

// Новые токены (замените на актуальные)
const newTokens = {
  // OpenRouter токен (получите новый на https://openrouter.ai/)
  OR_TOKEN: 'sk-or-v1-YOUR_NEW_TOKEN_HERE',
  
  // Supabase ключи (проверьте в Supabase Dashboard)
  NEXT_PUBLIC_SUPABASE_URL: 'https://hwospkbheqaauluoytvz.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3b3Nwa2JoZXFhYXVsdW95dHZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NjQyMDIsImV4cCI6MjA2NzE0MDIwMn0.vIUqjDmvEtAeJi_sCrntD8rUdEr8EpoMXpbTcDhCJIs',
  
  // Telegram Bot токен
  TELEGRAM_BOT_TOKEN: '6522297183:AAE60O9EJy8c8SfdbLOsRGb6B06eHYBWLyo',
  
  // API URL
  NEXT_PUBLIC_BASE_URL: 'https://ai.spor3s.ru'
};

function updateEnvFile() {
  const envPath = path.join(__dirname, 'env.local');
  
  try {
    // Читаем текущий файл
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Обновляем токены
    Object.entries(newTokens).forEach(([key, value]) => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      const newLine = `${key}=${value}`;
      
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, newLine);
        console.log(`✅ Обновлен ${key}`);
      } else {
        envContent += `\n${newLine}`;
        console.log(`➕ Добавлен ${key}`);
      }
    });
    
    // Записываем обновленный файл
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Файл env.local обновлен');
    
  } catch (error) {
    console.error('❌ Ошибка обновления env.local:', error.message);
  }
}

function createTestScript() {
  const testScript = `
// Тест обновленных токенов
const axios = require('axios');
require('dotenv').config({ path: 'env.local' });

async function testTokens() {
  console.log('🧪 ТЕСТ ОБНОВЛЕННЫХ ТОКЕНОВ');
  console.log('=' .repeat(50));
  
  // Тест 1: AI API
  console.log('1. Тест AI API...');
  try {
    const response = await axios.post('https://ai.spor3s.ru/api/ai', {
      message: 'тест токенов',
      source: 'test'
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    
    console.log('✅ AI API работает:', response.status);
    console.log('📝 Ответ:', response.data.response?.substring(0, 100) + '...');
  } catch (error) {
    console.log('❌ AI API ошибка:', error.message);
  }
  
  // Тест 2: Telegram Bot
  console.log('\\n2. Тест Telegram Bot...');
  try {
    const response = await axios.get(\`https://api.telegram.org/bot\${process.env.TELEGRAM_BOT_TOKEN}/getMe\`);
    console.log('✅ Telegram Bot активен:', response.data.result.username);
  } catch (error) {
    console.log('❌ Telegram Bot ошибка:', error.message);
  }
  
  // Тест 3: Supabase
  console.log('\\n3. Тест Supabase...');
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    const { data, error } = await supabase
      .from('products')
      .select('id, name')
      .limit(1);
    
    if (error) {
      console.log('❌ Supabase ошибка:', error.message);
    } else {
      console.log('✅ Supabase подключен:', data[0]?.name || 'Нет данных');
    }
  } catch (error) {
    console.log('❌ Supabase ошибка:', error.message);
  }
  
  console.log('\\n🎉 Тест завершен!');
}

testTokens().catch(console.error);
`;

  fs.writeFileSync(path.join(__dirname, 'test-updated-tokens.js'), testScript);
  console.log('✅ Создан test-updated-tokens.js');
}

// Выполняем обновление
updateEnvFile();
createTestScript();

console.log('\n💡 СЛЕДУЮЩИЕ ШАГИ:');
console.log('1. Получите новый OpenRouter токен на https://openrouter.ai/');
console.log('2. Обновите OR_TOKEN в env.local');
console.log('3. Запустите: node test-updated-tokens.js');
console.log('4. Запустите: node final-bot-fix.js');
console.log('5. Протестируйте бота в Telegram');
