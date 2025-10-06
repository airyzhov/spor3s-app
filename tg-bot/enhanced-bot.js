// Улучшенный Telegram бот с расширенными возможностями
// Альтернатива живому аккаунту

// Устанавливаем переменные окружения вручную
process.env.SUPABASE_URL = 'https://hwospkbheqaauluoytvz.supabase.co';
process.env.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3b3Nwa2JoZXFhYXVsdW95dHZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NjQyMDIsImV4cCI6MjA2NzE0MDIwMn0.vIUqjDmvEtAeJi_sCrntD8rUdEr8EpoMXpbTcDhCJIs';
process.env.TELEGRAM_BOT_TOKEN = '6522297183:AAE60O9EJy8c8SfdbLOsRGb6B06eHYBWLyo';
console.log('🔧 Переменные окружения установлены вручную');

require('dotenv').config({ path: __dirname + '/.env' });

// Устанавливаем переменные окружения вручную, если они не загрузились
if (!process.env.SUPABASE_URL) {
  process.env.SUPABASE_URL = 'https://hwospkbheqaauluoytvz.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3b3Nwa2JoZXFhYXVsdW95dHZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NjQyMDIsImV4cCI6MjA2NzE0MDIwMn0.vIUqjDmvEtAeJi_sCrntD8rUdEr8EpoMXpbTcDhCJIs';
  process.env.TELEGRAM_BOT_TOKEN = '6522297183:AAE60O9EJy8c8SfdbLOsRGb6B06eHYBWLyo';
  console.log('🔧 Переменные окружения установлены вручную');
}

// Отладочная информация
console.log('🔍 Отладка переменных окружения:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'ЕСТЬ' : 'НЕТ');
console.log('TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? 'ЕСТЬ' : 'НЕТ');

const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');

class EnhancedTelegramBot {
  constructor() {
    this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    this.setupHandlers();
  }

  setupHandlers() {
    // Команда /start
    this.bot.start(async (ctx) => {
      const telegramId = ctx.from.id.toString();
      const name = ctx.from.first_name;
      
      try {
        // Создаем или получаем пользователя
        const user = await this.getOrCreateUser(telegramId, name);
        
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
        
        // Сохраняем событие
        await this.saveMessage(user.id, 'system', 'Пользователь запустил бота', 'telegram_bot');
        
      } catch (error) {
        console.error('Ошибка в /start:', error);
        await ctx.reply('Извините, произошла ошибка. Попробуйте позже.');
      }
    });

    // Команда /help
    this.bot.help(async (ctx) => {
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
    });

    // Команда /my_coins
    this.bot.command('my_coins', async (ctx) => {
      const telegramId = ctx.from.id.toString();
      
      try {
        const user = await this.getOrCreateUser(telegramId, ctx.from.first_name);
        const coins = await this.getUserCoins(user.id);
        
        const coinsMessage = `
💰 **Ваши Spor3s Coins**

🪙 **Баланс:** ${coins.balance} SC
📊 **Уровень:** ${coins.level}
🎯 **До следующего уровня:** ${coins.nextLevel} SC

💡 **Как заработать:**
• Ежедневные чекины: +10 SC
• Заполнение анкет: +50 SC
• Привычки и цели: +100 SC
• Рефералы: +200 SC

🛒 **Как потратить:**
• Скидки до 30% на заказы
• Специальные предложения
• Бонусные товары
        `;
        
        await ctx.reply(coinsMessage);
        
      } catch (error) {
        console.error('Ошибка в /my_coins:', error);
        await ctx.reply('Не удалось получить информацию о монетах.');
      }
    });

    // Команда /order
    this.bot.command('order', async (ctx) => {
      const orderMessage = `
🛒 **Оформление заказа**

Выберите способ оформления:

1️⃣ **Быстрый заказ** — через чат
2️⃣ **Полная форма** — с доставкой
3️⃣ **Консультация** — помощь в выборе

Или просто напишите, что хотите заказать, например:
• "Хочу заказать ежовик"
• "Купить мухомор с доставкой"
• "Заказать курс 4 в 1"
        `;
      
      await ctx.reply(orderMessage);
    });

    // Обработка всех текстовых сообщений
    this.bot.on('text', async (ctx) => {
      const telegramId = ctx.from.id.toString();
      const message = ctx.message.text;
      
      try {
        // Получаем пользователя
        const user = await this.getOrCreateUser(telegramId, ctx.from.first_name);
        
        // Сохраняем сообщение пользователя
        await this.saveMessage(user.id, 'user', message, 'telegram_bot');
        
        // Получаем контекст пользователя
        const context = await this.getUserContext(user.id);
        
        // Отправляем в AI API
        const aiResponse = await this.callAI(message, context);
        
        // Сохраняем ответ AI
        await this.saveMessage(user.id, 'assistant', aiResponse, 'telegram_bot');
        
        // Отправляем ответ пользователю
        await ctx.reply(aiResponse);
        
        // Проверяем, нужно ли создать заказ
        if (this.shouldCreateOrder(message, aiResponse)) {
          await this.handleOrderCreation(user.id, message, aiResponse, ctx);
        }
        
      } catch (error) {
        console.error('Ошибка обработки сообщения:', error);
        await ctx.reply('Извините, произошла ошибка. Попробуйте позже.');
      }
    });

    // Обработка callback запросов (кнопки)
    this.bot.action(/order_(.+)/, async (ctx) => {
      const productId = ctx.match[1];
      
      try {
        const user = await this.getOrCreateUser(ctx.from.id.toString(), ctx.from.first_name);
        
        // Создаем быстрый заказ
        const orderData = {
          user_id: user.id,
          items: { [productId]: 1 },
          total: 1100, // Базовая цена
          fio: 'Не указано',
          phone: 'Не указано',
          address: 'Не указано',
          comment: `Быстрый заказ через Telegram: ${productId}`
        };
        
        const response = await fetch('http://localhost:3000/api/order-simple', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
        });
        
        if (response.ok) {
          const order = await response.json();
          await ctx.reply(`✅ Заказ создан! Номер: #${order.id}`);
          
          // Уведомляем менеджера
          await this.notifyManager(order, user.id);
        } else {
          await ctx.reply('❌ Ошибка создания заказа. Попробуйте позже.');
        }
        
      } catch (error) {
        console.error('Ошибка создания заказа:', error);
        await ctx.reply('❌ Ошибка создания заказа.');
      }
    });
  }

  // Получение или создание пользователя
  async getOrCreateUser(telegramId, name) {
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
  }

  // Сохранение сообщения
  async saveMessage(userId, role, content, source) {
    await this.supabase
      .from('messages')
      .insert([{
        user_id: userId,
        role: role,
        content: content,
        source: source,
        created_at: new Date().toISOString()
      }]);
  }

  // Получение контекста пользователя
  async getUserContext(userId) {
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
  }

  // Вызов AI API
  async callAI(message, context) {
    const response = await fetch('http://localhost:3000/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: message }],
        user_id: context.user_id,
        context: context
      })
    });

    const data = await response.json();
    return data.reply || 'Извините, не удалось получить ответ.';
  }

  // Получение информации о монетах пользователя
  async getUserCoins(userId) {
    const { data: userLevel } = await this.supabase
      .from('user_levels')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (userLevel) {
      return {
        balance: userLevel.sc_balance || 0,
        level: userLevel.level || 1,
        nextLevel: Math.max(0, (userLevel.level || 1) * 100 - (userLevel.sc_balance || 0))
      };
    }

    return {
      balance: 0,
      level: 1,
      nextLevel: 100
    };
  }

  // Проверка необходимости создания заказа
  shouldCreateOrder(userMessage, aiResponse) {
    const orderKeywords = ['заказ', 'купить', 'оформить', 'корзина', 'хочу заказать'];
    return orderKeywords.some(keyword => 
      userMessage.toLowerCase().includes(keyword) ||
      aiResponse.toLowerCase().includes(keyword)
    );
  }

  // Обработка создания заказа
  async handleOrderCreation(userId, userMessage, aiResponse, ctx) {
    try {
      const orderData = this.parseOrderData(userMessage, aiResponse);
      
      if (orderData) {
        const response = await fetch('http://localhost:3000/api/order-simple', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            ...orderData
          })
        });

        if (response.ok) {
          const order = await response.json();
          await ctx.reply(`✅ Заказ создан! Номер: #${order.id}`);
          await this.notifyManager(order, userId);
        }
      }
    } catch (error) {
      console.error('Ошибка создания заказа:', error);
    }
  }

  // Парсинг данных заказа
  parseOrderData(userMessage, aiResponse) {
    const products = {
      'ежовик': 'ezh120k',
      'мухомор': 'mhm100',
      'кордицепс': 'kor50',
      '4 в 1': '4v1',
      'курс 4 в 1': '4v1'
    };

    for (const [name, productId] of Object.entries(products)) {
      if (userMessage.toLowerCase().includes(name)) {
        return {
          items: { [productId]: 1 },
          total: 1100,
          fio: 'Не указано',
          phone: 'Не указано',
          address: 'Не указано',
          comment: `Заказ через Telegram: ${userMessage}`
        };
      }
    }

    return null;
  }

  // Уведомление менеджера
  async notifyManager(order, userId) {
    const managerChatId = process.env.MANAGER_CHAT_ID || '54993853';
    
    const message = `
🛒 НОВЫЙ ЗАКАЗ ЧЕРЕЗ TELEGRAM БОТА!

📋 Заказ #${order.id}
👤 Пользователь: ${userId}
💰 Сумма: ${order.total} руб
📦 Товары: ${JSON.stringify(order.items)}
📝 Комментарий: ${order.comment}

⏰ Время: ${new Date().toLocaleString()}
    `;

    await this.bot.telegram.sendMessage(managerChatId, message);
  }

  // Запуск бота
  async start() {
    await this.bot.launch();
    console.log('🚀 Enhanced Telegram Bot запущен');
    console.log('📱 Ожидание сообщений...');
  }

  // Остановка бота
  async stop() {
    await this.bot.stop();
    console.log('🛑 Enhanced Telegram Bot остановлен');
  }
}

// Использование
if (require.main === module) {
  const bot = new EnhancedTelegramBot();
  
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

module.exports = { EnhancedTelegramBot };