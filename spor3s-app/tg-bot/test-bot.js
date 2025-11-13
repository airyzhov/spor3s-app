// Тест бота @spor3s_bot
// Проверяет подключение и базовую функциональность

require('dotenv').config({ path: '../env.local' });
const { Telegraf } = require('telegraf');

console.log('🧪 ТЕСТИРОВАНИЕ БОТА @spor3s_bot');
console.log('=====================================\n');

// Проверка переменных окружения
console.log('📋 Проверка конфигурации:');
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const apiUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

console.log('BOT_TOKEN:', botToken ? '✅ ' + botToken.substring(0, 10) + '...' : '❌ Не найден');
console.log('SUPABASE_URL:', supabaseUrl ? '✅ ' + supabaseUrl : '❌ Не найден');
console.log('API_URL:', apiUrl);
console.log('');

if (!botToken) {
  console.error('❌ TELEGRAM_BOT_TOKEN не найден в env.local');
  process.exit(1);
}

// Создаем тестового бота
const bot = new Telegraf(botToken);

console.log('🔌 Подключение к Telegram API...');

// Получаем информацию о боте
bot.telegram.getMe()
  .then(botInfo => {
    console.log('✅ Бот подключен успешно!\n');
    console.log('🤖 Информация о боте:');
    console.log('   Username: @' + botInfo.username);
    console.log('   Name:', botInfo.first_name);
    console.log('   ID:', botInfo.id);
    console.log('   Can join groups:', botInfo.can_join_groups ? 'Да' : 'Нет');
    console.log('   Can read messages:', botInfo.can_read_all_group_messages ? 'Да' : 'Нет');
    console.log('');
    
    console.log('✅ ТЕСТ ПРОЙДЕН!');
    console.log('');
    console.log('💡 Чтобы запустить бота:');
    console.log('   cd tg-bot');
    console.log('   node enhanced-bot.js');
    console.log('');
    console.log('📱 Напишите боту в Telegram: @' + botInfo.username);
    
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ ОШИБКА подключения к боту:', error.message);
    console.log('');
    console.log('🔧 Проверьте:');
    console.log('   1. Правильность TELEGRAM_BOT_TOKEN в env.local');
    console.log('   2. Интернет соединение');
    console.log('   3. Что токен действителен (получен от @BotFather)');
    
    process.exit(1);
  });

