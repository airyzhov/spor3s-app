// КОНТЕКСТНЫЙ УМНЫЙ БОТ С УЛУЧШЕННОЙ ОБРАБОТКОЙ ОШИБОК
const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config({ path: 'env.local' });

console.log('🧠 КОНТЕКСТНЫЙ УМНЫЙ БОТ SPOR3S');
console.log('=' .repeat(60));

class ContextSmartBot {
  constructor() {
    this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');
    this.supabase = createClient(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    this.apiUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://ai.spor3s.ru';
    console.log('🌐 API URL:', this.apiUrl);
    
    // Кэш контекста для каждого пользователя
    this.userContexts = new Map();
    
    this.setupHandlers();
  }

  setupHandlers() {
    // Команда /start с подробными инструкциями
    this.bot.start(async (ctx) => {
      console.log('📱 /start от:', ctx.from.first_name);
      
      const welcomeMessage = `
🎉 *Добро пожаловать в Spor3s!*

Я ваш персональный AI-ассистент для выбора грибных добавок.

🍄 *НАШИ ПРОДУКТЫ:*
• *Ежовик* — улучшение памяти и концентрации
• *Мухомор* — здоровый сон и снятие стресса  
• *Кордицепс* — повышение энергии и выносливости
• *Курс 4 в 1* — комплексное решение

💡 *КАК ПОЛЬЗОВАТЬСЯ:*
• Просто напишите что вас интересует
• Задавайте любые вопросы о продуктах
• Я помогу с выбором и оформлением заказа

🔧 *КОМАНДЫ:*
/help — справка
/test — тест бота
/my_coins — мои монеты
/order — оформить заказ

*Начните диалог — просто напишите мне!* ✨
      `;
      
      await ctx.reply(welcomeMessage, { parse_mode: 'Markdown' });
      console.log('✅ Приветствие отправлено');
    });

    // Команда /help
    this.bot.command('help', async (ctx) => {
      console.log('📱 /help от:', ctx.from.first_name);
      
      const helpMessage = `
🔧 *СПРАВКА SPOR3S BOT*

*ОСНОВНЫЕ КОМАНДЫ:*
/start — приветствие и инструкции
/help — эта справка
/test — тест работы бота
/my_coins — проверить баланс монет
/order — оформить заказ

*ЧТО УМЕЕТ БОТ:*
• Помогает выбрать грибные добавки
• Отвечает на вопросы о продуктах
• Помогает с оформлением заказов
• Отслеживает ваши монеты и скидки

*ПРИМЕРЫ ВОПРОСОВ:*
• "Расскажи о ежовике"
• "Хочу купить мухомор"
• "Помоги выбрать добавку для сна"
• "Сколько стоят ваши продукты?"

*Просто напишите мне — я отвечу на любой вопрос!* 🤖
      `;
      
      await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
      console.log('✅ Справка отправлена');
    });

    // Команда /test
    this.bot.command('test', async (ctx) => {
      console.log('📱 /test от:', ctx.from.first_name);
      await ctx.reply('✅ *Тест пройден!* Бот работает корректно.\n\nТеперь можете задавать любые вопросы! 🤖', { parse_mode: 'Markdown' });
      console.log('✅ Тест выполнен');
    });

    // Команда /my_coins
    this.bot.command('my_coins', async (ctx) => {
      console.log('📱 /my_coins от:', ctx.from.first_name);
      
      try {
        const userId = ctx.from.id.toString();
        const user = await this.getOrCreateUser(userId, ctx.from.first_name);
        
        // Получаем баланс монет
        const coins = await this.getUserCoins(user.id);
        
        await ctx.reply(`💰 *Ваш баланс:* ${coins} монет Spor3s\n\nМонеты можно тратить на скидки при покупке!`, { parse_mode: 'Markdown' });
        console.log('✅ Баланс монет отправлен');
      } catch (error) {
        console.error('Ошибка получения монет:', error);
        await ctx.reply('💰 *Ваш баланс:* 0 монет Spor3s\n\nНачните покупать, чтобы зарабатывать монеты!', { parse_mode: 'Markdown' });
      }
    });

    // Команда /order
    this.bot.command('order', async (ctx) => {
      console.log('📱 /order от:', ctx.from.first_name);
      
      const orderMessage = `
🛒 *ОФОРМЛЕНИЕ ЗАКАЗА*

Для оформления заказа:

1️⃣ *Выберите продукт* — напишите что хотите купить
2️⃣ *Укажите количество* — сколько упаковок нужно
3️⃣ *Оставьте контакты* — ФИО, телефон, адрес

*ПОПУЛЯРНЫЕ ПРОДУКТЫ:*
• Ежовик — для памяти
• Мухомор — для сна
• Кордицепс — для энергии
• Курс 4 в 1 — комплекс

*Напишите что хотите заказать, и я помогу с оформлением!* ✨
      `;
      
      await ctx.reply(orderMessage, { parse_mode: 'Markdown' });
      console.log('✅ Инструкция по заказу отправлена');
    });

    // Обработка ВСЕХ текстовых сообщений
    this.bot.on('text', async (ctx) => {
      const message = ctx.message.text;
      const userId = ctx.from.id.toString();
      const userName = ctx.from.first_name;
      
      console.log(`📱 "${message}" от ${userName}`);
      
      try {
        // Отправляем индикатор обработки
        const processingMsg = await ctx.reply('🤖 Обрабатываю ваше сообщение...');
        
        // Получаем пользователя
        const user = await this.getOrCreateUser(userId, userName);
        console.log('👤 Пользователь:', user.id);
        
        // Сохраняем сообщение
        await this.saveMessage(user.id, 'user', message, 'telegram_bot');
        console.log('💾 Сообщение сохранено');
        
        // Получаем контекст (из кэша и базы данных)
        const context = await this.getUserContext(user.id);
        console.log('📚 Контекст:', context.messages?.length || 0, 'сообщений');
        
        // Вызываем AI API с улучшенной обработкой ошибок
        console.log('🤖 Вызываем AI API...');
        const aiResponse = await this.callContextAI(message, context, userId);
        console.log('✅ AI ответ получен');
        
        // Сохраняем ответ AI
        await this.saveMessage(user.id, 'assistant', aiResponse, 'telegram_bot');
        console.log('💾 Ответ AI сохранен');
        
        // Удаляем индикатор обработки
        try {
          await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
        } catch (e) {
          console.log('Не удалось удалить индикатор обработки');
        }
        
        // Очищаем ответ от проблемных символов и отправляем
        const cleanResponse = this.cleanMarkdown(aiResponse);
        await ctx.reply(cleanResponse, { parse_mode: 'Markdown' });
        console.log('✅ Ответ отправлен пользователю');
        
      } catch (error) {
        console.error('❌ Ошибка обработки:', error.message);
        
        // Улучшенный fallback ответ
        const fallbackResponse = `
Привет, ${userName}! 👋

Я ваш AI-ассистент Spor3s. Помогу выбрать грибные добавки:

🍄 *Ежовик* — для памяти и концентрации
😴 *Мухомор* — для сна и снятия стресса  
⚡ *Кордицепс* — для энергии
🌟 *Курс 4 в 1* — комплексное решение

*Что вас интересует?* Просто напишите, например:
• "Расскажи о ежовике"
• "Хочу купить мухомор"
• "Помоги выбрать добавку"

*Используйте /help для справки* 📚
        `;
        
        await ctx.reply(fallbackResponse, { parse_mode: 'Markdown' });
        console.log('✅ Fallback ответ отправлен');
      }
    });
  }

  // Очистка Markdown от проблемных символов
  cleanMarkdown(text) {
    if (!text) return '';
    
    // Убираем проблемные символы для Telegram Markdown
    return text
      .replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&') // Экранируем специальные символы
      .replace(/\*\*(.*?)\*\*/g, '*$1*') // Заменяем ** на *
      .replace(/\n\s*\n/g, '\n\n') // Убираем лишние переносы
      .trim();
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

  // Получение баланса монет
  async getUserCoins(userId) {
    try {
      const { data: transactions } = await this.supabase
        .from('coin_transactions')
        .select('amount, type')
        .eq('user_id', userId);

      if (!transactions) return 0;

      let balance = 0;
      transactions.forEach(transaction => {
        if (transaction.type === 'earned') {
          balance += transaction.amount;
        } else if (transaction.type === 'spent') {
          balance -= transaction.amount;
        }
      });

      return Math.max(0, balance);
    } catch (error) {
      console.error('Ошибка получения монет:', error);
      return 0;
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

  // Получение контекста пользователя (из кэша и базы данных)
  async getUserContext(userId) {
    try {
      // Сначала получаем из кэша
      let context = this.userContexts.get(userId) || { messages: [], user_id: userId };
      
      // Затем получаем из базы данных
      const { data: messages } = await this.supabase
        .from('messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (messages && messages.length > 0) {
        context.messages = messages;
        // Обновляем кэш
        this.userContexts.set(userId, context);
      }

      return context;
    } catch (error) {
      console.error('Ошибка получения контекста:', error);
      return { messages: [], user_id: userId };
    }
  }

  // КОНТЕКСТНЫЙ вызов AI API с улучшенной обработкой ошибок
  async callContextAI(message, context, userId) {
    try {
      console.log('🤖 Вызываем AI API:', `${this.apiUrl}/api/ai`);
      
      // Правильный формат запроса
      const requestData = {
        message: message,
        context: context?.messages || [],
        source: 'telegram_bot',
        user_id: context?.user_id || null
      };
      
      console.log('📤 Отправляем данные:', JSON.stringify(requestData, null, 2));
      
      const response = await axios.post(`${this.apiUrl}/api/ai`, requestData, {
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'spor3s-bot/1.0'
        },
        timeout: 10000 // Уменьшил таймаут
      });
      
      console.log('📊 Статус ответа:', response.status);
      console.log('📥 Ответ API:', response.data);
      
      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = response.data;
      
      if (data.error) {
        throw new Error(`AI API Error: ${data.error}`);
      }
      
      const aiResponse = data.response || data.reply || data.message || 'Извините, не удалось получить ответ.';
      console.log('✅ AI ответ:', aiResponse);
      
      return aiResponse;
    } catch (error) {
      console.error('❌ Ошибка AI API:', error.message);
      
      // УМНЫЙ FALLBACK НА ОСНОВЕ КОНТЕКСТА
      return this.getSmartFallback(message, context, userId);
    }
  }

  // Умный fallback на основе контекста
  getSmartFallback(message, context, userId) {
    const lowerMessage = message.toLowerCase();
    
    // Проверяем контекст предыдущих сообщений
    const lastMessages = context?.messages?.slice(0, 3) || [];
    const hasContext = lastMessages.length > 0;
    
    // Если есть контекст, пытаемся понять что происходит
    if (hasContext) {
      const lastAssistantMessage = lastMessages.find(m => m.role === 'assistant')?.content || '';
      
      // Если пользователь отвечает на вопрос о форме продукта
      if (lowerMessage.includes('порошок') || lowerMessage.includes('капсул')) {
        return `Отлично! Вы выбрали ${lowerMessage.includes('порошок') ? 'порошок' : 'капсулы'}.

Теперь укажите срок приема:
• *Месяц* (для начала)
• *3 месяца* (курс, экономично) 
• *6 месяцев* (максимальный эффект)

Также у вас уже есть опыт приема добавок или начинаете впервые?

Для быстрого оформления используйте приложение: 👉 t.me/spor3s_bot`;
      }
      
      // Если пользователь отвечает на вопрос о сроке
      if (lowerMessage.includes('месяц') || lowerMessage.includes('курс')) {
        return `Понял! Вы выбрали ${lowerMessage.includes('месяц') ? 'месячный' : 'курсовой'} прием.

Теперь укажите ваши контакты для оформления заказа:
• *ФИО*
• *Телефон* 
• *Адрес доставки*

Или используйте приложение для быстрого оформления: 👉 t.me/spor3s_bot`;
      }
    }
    
    // Если спрашивают о конкретном продукте
    if (lowerMessage.includes('ежовик')) {
      return `🍄 *Ежовик гребенчатый* — отличный выбор для улучшения памяти и концентрации!

*Эффекты:*
• Улучшение памяти и концентрации
• Повышение когнитивных способностей
• Защита нервных клеток
• Ускорение обучения

*В какой форме предпочитаете:*
• *Капсулы* (удобно принимать, 120 капсул на месяц за 1100₽)
• *Порошок* (быстрее эффект, 100г на месяц за 1100₽)

*На какой срок:*
• *Месяц* (для начала)
• *3 месяца* (курс, экономично)
• *6 месяцев* (максимальный эффект)

Также у вас уже есть опыт приема добавок или начинаете впервые?

Для быстрого оформления используйте приложение: 👉 t.me/spor3s_bot`;
    }
    
    if (lowerMessage.includes('мухомор')) {
      return `😴 *Мухомор красный* — идеально для здорового сна и снятия стресса!

*Эффекты:*
• Глубокий и восстанавливающий сон
• Снятие стресса и тревожности
• Расслабление нервной системы
• Улучшение качества сна

*В какой форме предпочитаете:*
• *Капсулы* (удобно принимать, 60 капсул на месяц за 1200₽)
• *Порошок* (быстрее эффект, 50г на месяц за 1200₽)

*На какой срок:*
• *Месяц* (для начала)
• *3 месяца* (курс, экономично)
• *6 месяцев* (максимальный эффект)

Также у вас уже есть опыт приема добавок или начинаете впервые?

Для быстрого оформления используйте приложение: 👉 t.me/spor3s_bot`;
    }
    
    if (lowerMessage.includes('кордицепс')) {
      return `⚡ *Кордицепс* — мощный энергетик для выносливости и силы!

*Эффекты:*
• Повышение энергии и выносливости
• Улучшение физической работоспособности
• Укрепление иммунитета
• Ускорение восстановления

*В какой форме предпочитаете:*
• *Капсулы* (удобно принимать, 90 капсул на месяц за 1300₽)
• *Порошок* (быстрее эффект, 75г на месяц за 1300₽)

*На какой срок:*
• *Месяц* (для начала)
• *3 месяца* (курс, экономично)
• *6 месяцев* (максимальный эффект)

Также у вас уже есть опыт приема добавок или начинаете впервые?

Для быстрого оформления используйте приложение: 👉 t.me/spor3s_bot`;
    }
    
    // Общий fallback
    return `Привет! Я ваш AI-ассистент Spor3s. 

Помогу выбрать грибные добавки:

🍄 *Ежовик* — для памяти и концентрации
😴 *Мухомор* — для сна и снятия стресса  
⚡ *Кордицепс* — для энергии
🌟 *Курс 4 в 1* — комплексное решение

*Что вас интересует?* Просто напишите, например:
• "Расскажи о ежовике"
• "Хочу купить мухомор"
• "Помоги выбрать добавку"

*Используйте /help для справки* 📚`;
  }

  // Запуск бота
  async start() {
    try {
      await this.bot.launch();
      console.log('🧠 КОНТЕКСТНЫЙ УМНЫЙ БОТ ЗАПУЩЕН!');
      console.log('📱 Отправьте боту сообщение для тестирования');
      console.log('💡 Команды: /start, /help, /test, /my_coins, /order');
      console.log('🎯 Бот теперь ведет КОНТЕКСТНЫЙ диалог!');
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
  const bot = new ContextSmartBot();
  
  bot.start().catch(error => {
    console.error('❌ Ошибка запуска бота:', error);
  });

  // Graceful shutdown
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

module.exports = { ContextSmartBot };
