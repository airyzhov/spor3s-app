// Простой рабочий бот для тестирования
const { Telegraf } = require('telegraf');
require('dotenv').config({ path: 'env.local' });

console.log('🤖 ЗАПУСК ПРОСТОГО БОТА');
console.log('=' .repeat(50));

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Простой обработчик всех сообщений
bot.on('text', async (ctx) => {
  const message = ctx.message.text;
  const userName = ctx.from.first_name;
  
  console.log(`📱 Получено: "${message}" от ${userName}`);
  
  // Простой ответ
  const responses = [
    `Привет, ${userName}! Я работаю! 🎉`,
    `Получил ваше сообщение: "${message}"`,
    `Сейчас ${new Date().toLocaleString()}`,
    `Бот активен и отвечает! ✅`
  ];
  
  const randomResponse = responses[Math.floor(Math.random() * responses.length)];
  
  try {
    await ctx.reply(randomResponse);
    console.log(`✅ Отправлен ответ: "${randomResponse}"`);
  } catch (error) {
    console.log(`❌ Ошибка отправки: ${error.message}`);
  }
});

// Команда /start
bot.start(async (ctx) => {
  console.log('📱 Получена команда /start');
  await ctx.reply('🎉 Бот запущен и работает! Отправьте любое сообщение для тестирования.');
  console.log('✅ Отправлено приветствие');
});

// Команда /test
bot.command('test', async (ctx) => {
  console.log('📱 Получена команда /test');
  await ctx.reply('✅ Тест пройден! Бот работает корректно.');
  console.log('✅ Отправлен тестовый ответ');
});

// Обработка ошибок
bot.catch((err, ctx) => {
  console.log('❌ Ошибка бота:', err);
  ctx.reply('Извините, произошла ошибка. Попробуйте позже.');
});

// Запуск
async function startBot() {
  try {
    await bot.launch();
    console.log('🚀 Простой бот запущен!');
    console.log('📱 Отправьте боту сообщение для тестирования');
    console.log('💡 Команды: /start, /test, любое сообщение');
  } catch (error) {
    console.log('❌ Ошибка запуска:', error.message);
  }
}

startBot();

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
