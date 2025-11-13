// Скрипт для запуска бота локально для тестирования
const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config({ path: 'env.local' });

console.log('🤖 ЗАПУСК SPOR3S_BOT ЛОКАЛЬНО');
console.log('=' .repeat(60));

class LocalSpor3sBot {
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
      console.log('📱 Получена команда /start от:', ctx.from.first_name);
      
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
/my_coins — ваши Spor3s Coins
/order — оформить заказ
      `;
      
      await ctx.reply(welcomeMessage);
      console.log('✅ Отправлено приветствие');
    });

    // Команда /help
    this.bot.help(async (ctx) => {
      console.log('📱 Получена команда /help от:', ctx.from.first_name);
      
      const helpMessage = `
🤖 **Spor3s AI Assistant**

**Основные возможности:**
• Консультации по продуктам
• Помощь в выборе добавок
• Оформление заказов
• Отслеживание Spor3s Coins

**Команды:**
/start — главное меню
/help — эта справка
/my_coins — баланс монет
/order — оформить заказ

**Как использовать:**
Просто напишите ваш вопрос, например:
• "Расскажи о ежовике"
• "Хочу купить мухомор"
• "Сколько у меня монет?"
• "Помоги выбрать добавку"

🎯 **Цель:** Помочь вам выбрать лучшие грибные добавки для ваших целей!
      `;
      
      await ctx.reply(helpMessage);
      console.log('✅ Отправлена справка');
    });

    // Обработка всех текстовых сообщений
    this.bot.on('text', async (ctx) => {
      const message = ctx.message.text;
      const userId = ctx.from.id.toString();
      const userName = ctx.from.first_name;
      
      console.log(`📱 Сообщение от ${userName}: "${message}"`);
      
      try {
        // Получаем пользователя
        const user = await this.getOrCreateUser(userId, userName);
        console.log('👤 Пользователь:', user.id);
        
        // Сохраняем сообщение пользователя
        await this.saveMessage(user.id, 'user', message, 'telegram_bot');
        console.log('💾 Сообщение сохранено');
        
        // Получаем контекст пользователя
        const context = await this.getUserContext(user.id);
        console.log('📚 Контекст получен:', context.messages?.length || 0, 'сообщений');
        
        // Отправляем в AI API
        console.log('🤖 Вызываем AI API...');
        const aiResponse = await this.callAI(message, context);
        console.log('✅ AI ответ получен:', aiResponse.substring(0, 100) + '...');
        
        // Сохраняем ответ AI
        await this.saveMessage(user.id, 'assistant', aiResponse, 'telegram_bot');
        console.log('💾 Ответ AI сохранен');
        
        // Проверяем наличие тегов add_to_cart
        const addToCartMatches = aiResponse.match(/\[add_to_cart:([\w-]+)\]/g);
        const hasAddToCart = addToCartMatches && addToCartMatches.length > 0;
        
        // Очищаем ответ от тегов для пользователя
        const cleanResponse = aiResponse.replace(/\[add_to_cart:[\w-]+\]/g, '').replace(/\[remove_from_cart:[\w-]+\]/g, '').trim();
        
        if (hasAddToCart) {
          // Извлекаем ID продуктов для ссылки на приложение
          const productIds = addToCartMatches.map(tag => tag.match(/\[add_to_cart:([\w-]+)\]/)[1]);
          const cartUrl = `${this.apiUrl}/cart?products=${productIds.join(',')}`;
          
          // Создаем кнопку для перехода в приложение
          const keyboard = {
            inline_keyboard: [[
              {
                text: '🛒 Продолжить в приложении',
                url: cartUrl
              }
            ]]
          };
          
          await ctx.reply(cleanResponse, { reply_markup: keyboard });
          console.log('✅ Ответ с кнопкой отправлен');
        } else {
          // Отправляем обычный ответ без кнопки
          await ctx.reply(cleanResponse);
          console.log('✅ Обычный ответ отправлен');
        }
        
      } catch (error) {
        console.error('❌ Ошибка обработки сообщения:', error);
        
        // Отправляем сообщение об ошибке
        await ctx.reply('Извините, произошла ошибка. Попробуйте позже или обратитесь в поддержку.');
        console.log('⚠️ Отправлено сообщение об ошибке');
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
      // Fallback пользователь
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

      const { data: orders } = await this.supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      return {
        messages: messages || [],
        orders: orders || [],
        user_id: userId
      };
    } catch (error) {
      console.error('Ошибка получения контекста:', error);
      return { messages: [], orders: [], user_id: userId };
    }
  }

  // Вызов AI API
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
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = response.data;
      console.log('✅ AI ответ получен');
      
      return data.response || data.reply || 'Извините, не удалось получить ответ.';
    } catch (error) {
      console.error('❌ Ошибка AI API:', error.message);
      return 'Извините, произошла ошибка при обращении к ИИ. Попробуйте позже.';
    }
  }

  // Запуск бота
  async start() {
    try {
      await this.bot.launch();
      console.log('🚀 Spor3s Bot запущен локально');
      console.log('📱 Ожидание сообщений...');
      console.log('💡 Отправьте боту сообщение для тестирования');
    } catch (error) {
      console.error('❌ Ошибка запуска бота:', error);
    }
  }

  // Остановка бота
  async stop() {
    await this.bot.stop();
    console.log('🛑 Spor3s Bot остановлен');
  }
}

// Запуск бота
if (require.main === module) {
  const bot = new LocalSpor3sBot();
  
  bot.start().catch(error => {
    console.error('❌ Ошибка запуска бота:', error);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Получен сигнал остановки...');
    await bot.stop();
    process.exit(0);
  });
}

module.exports = { LocalSpor3sBot };
