// Финальное исправление бота с обновленными токенами
const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config({ path: 'env.local' });

console.log('🔧 ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ БОТА');
console.log('=' .repeat(60));

class FixedSpor3sBot {
  constructor() {
    this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');
    this.supabase = createClient(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    this.apiUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://ai.spor3s.ru';
    console.log('🌐 API URL:', this.apiUrl);
    
    this.setupHandlers();
  }

  setupHandlers() {
    // Команда /start
    this.bot.start(async (ctx) => {
      console.log('📱 /start от:', ctx.from.first_name);
      
      const welcomeMessage = `
🎉 Добро пожаловать в Spor3s!

Я ваш персональный AI-ассистент для выбора грибных добавок:

🍄 **Ежовик** — для памяти и концентрации
😴 **Мухомор** — для сна и снятия стресса  
⚡ **Кордицепс** — для энергии
🌟 **Курс 4 в 1** — комплексное решение

Просто напишите, что вас интересует, и я помогу с выбором!

💡 **Команды:**
/help — справка
/test — тест бота
      `;
      
      await ctx.reply(welcomeMessage);
      console.log('✅ Приветствие отправлено');
    });

    // Команда /test
    this.bot.command('test', async (ctx) => {
      console.log('📱 /test от:', ctx.from.first_name);
      await ctx.reply('✅ Тест пройден! Бот работает корректно.');
      console.log('✅ Тест выполнен');
    });

    // Обработка всех текстовых сообщений
    this.bot.on('text', async (ctx) => {
      const message = ctx.message.text;
      const userId = ctx.from.id.toString();
      const userName = ctx.from.first_name;
      
      console.log(`📱 "${message}" от ${userName}`);
      
      try {
        // Сначала отправляем простой ответ
        await ctx.reply('🤖 Обрабатываю ваше сообщение...');
        
        // Получаем пользователя
        const user = await this.getOrCreateUser(userId, userName);
        console.log('👤 Пользователь:', user.id);
        
        // Сохраняем сообщение
        await this.saveMessage(user.id, 'user', message, 'telegram_bot');
        console.log('💾 Сообщение сохранено');
        
        // Получаем контекст
        const context = await this.getUserContext(user.id);
        console.log('📚 Контекст:', context.messages?.length || 0, 'сообщений');
        
        // Вызываем AI API
        console.log('🤖 Вызываем AI API...');
        const aiResponse = await this.callAI(message, context);
        console.log('✅ AI ответ получен');
        
        // Сохраняем ответ AI
        await this.saveMessage(user.id, 'assistant', aiResponse, 'telegram_bot');
        console.log('💾 Ответ AI сохранен');
        
        // Отправляем ответ пользователю
        await ctx.reply(aiResponse);
        console.log('✅ Ответ отправлен пользователю');
        
      } catch (error) {
        console.error('❌ Ошибка обработки:', error.message);
        
        // Fallback ответ
        const fallbackResponse = `Привет, ${userName}! 

Я ваш AI-ассистент Spor3s. Помогу выбрать грибные добавки:

🍄 **Ежовик** — для памяти и концентрации
😴 **Мухомор** — для сна и снятия стресса  
⚡ **Кордицепс** — для энергии

Что вас интересует? Просто напишите, например:
• "Расскажи о ежовике"
• "Хочу купить мухомор"
• "Помоги выбрать добавку"`;
        
        await ctx.reply(fallbackResponse);
        console.log('✅ Fallback ответ отправлен');
      }
    });
  }

  // Получение или создание пользователя
  async getOrCreateUser(telegramId, name) {
    try {
      const { data: existingUser } = await this.supabase
        .from('users')
        .select('*')
        .eq('telegram_id', telegramId)
        .single();

      if (existingUser) {
        return existingUser;
      }

      const { data: newUser } = await this.supabase
        .from('users')
        .insert([{
          telegram_id: telegramId,
          name: name || 'Unknown',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      return newUser;
    } catch (error) {
      console.error('Ошибка getOrCreateUser:', error);
      return { id: `temp-${telegramId}`, telegram_id: telegramId };
    }
  }

  // Сохранение сообщения
  async saveMessage(userId, role, content, source) {
    try {
      await this.supabase
        .from('messages')
        .insert([{
          user_id: userId,
          role: role,
          content: content,
          source: source,
          created_at: new Date().toISOString()
        }]);
    } catch (error) {
      console.error('Ошибка сохранения сообщения:', error);
    }
  }

  // Получение контекста пользователя
  async getUserContext(userId) {
    try {
      const { data: messages } = await this.supabase
        .from('messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      return {
        messages: messages || [],
        user_id: userId
      };
    } catch (error) {
      console.error('Ошибка получения контекста:', error);
      return { messages: [], user_id: userId };
    }
  }

  // Вызов AI API с улучшенной обработкой ошибок
  async callAI(message, context) {
    try {
      console.log('🤖 Вызываем AI API:', `${this.apiUrl}/api/ai`);
      
      const response = await axios.post(`${this.apiUrl}/api/ai`, {
        message,
        context: context?.messages || [],
        source: 'telegram_bot',
        user_id: context?.user_id || null
      }, {
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'spor3s-bot/1.0'
        },
        timeout: 15000
      });
      
      console.log('📊 Статус ответа:', response.status);
      
      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = response.data;
      console.log('✅ AI ответ получен');
      
      return data.response || data.reply || 'Извините, не удалось получить ответ.';
    } catch (error) {
      console.error('❌ Ошибка AI API:', error.message);
      
      // Возвращаем fallback ответ
      return `Привет! Я ваш AI-ассистент Spor3s. 

Помогу выбрать грибные добавки:

🍄 **Ежовик** — для памяти и концентрации
😴 **Мухомор** — для сна и снятия стресса  
⚡ **Кордицепс** — для энергии

Что вас интересует? Напишите, например:
• "Расскажи о ежовике"
• "Хочу купить мухомор"`;
    }
  }

  // Запуск бота
  async start() {
    try {
      await this.bot.launch();
      console.log('🚀 Исправленный бот запущен!');
      console.log('📱 Отправьте боту сообщение для тестирования');
      console.log('💡 Команды: /start, /test, любое сообщение');
    } catch (error) {
      console.error('❌ Ошибка запуска бота:', error);
    }
  }

  // Остановка бота
  async stop() {
    await this.bot.stop();
    console.log('🛑 Бот остановлен');
  }
}

// Запуск бота
if (require.main === module) {
  const bot = new FixedSpor3sBot();
  
  bot.start().catch(error => {
    console.error('❌ Ошибка запуска бота:', error);
  });

  // Graceful shutdown
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

module.exports = { FixedSpor3sBot };
