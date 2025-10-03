// Улучшенный Telegram бот с расширенными возможностями
// Альтернатива живому аккаунту

require('dotenv').config({ path: 'env.local' });
const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');

// Добавляем fetch полифилл для Node.js
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

class EnhancedTelegramBot {
  constructor() {
    this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');
    this.supabase = createClient(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    this.setupHandlers();
  }

  setupHandlers() {
    // Команда /start
    this.bot.start(async (ctx) => {
      const telegramId = ctx.from.id.toString();
      const name = ctx.from.first_name;
      const args = ctx.message?.text?.split(' ').slice(1) || [];

      try {
        let user = null;

        if (args.length > 0) {
          const authCode = args[0].trim();
          const linked = await this.linkBotWithCode(authCode, telegramId);
          if (linked) {
            user = linked;
            await ctx.reply(
              `🎉 Аккаунт привязан!

Теперь мини-приложение и бот знают друг друга.
Вы можете продолжить общение тут или открыть приложение: ${process.env.NEXT_PUBLIC_BASE_URL || 'https://spor3s.app'}`
            );
          } else {
            await ctx.reply('❌ Код не найден или истёк. Сгенерируйте новый в мини-приложении.');
          }
        }

        if (!user) {
          user = await this.getOrCreateUser(telegramId, name);
        }
        
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
        if (user?.id) {
        await this.saveMessage(user.id, 'system', 'Пользователь запустил бота', 'telegram_bot');
        }
        
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
        
        // Проверяем наличие тегов add_to_cart для добавления кнопки перехода в приложение
        const addToCartMatches = aiResponse.match(/\[add_to_cart:([\w-]+)\]/g);
        const hasAddToCart = addToCartMatches && addToCartMatches.length > 0;
        
        // Очищаем ответ от тегов для пользователя
        const cleanResponse = aiResponse.replace(/\[add_to_cart:[\w-]+\]/g, '').replace(/\[remove_from_cart:[\w-]+\]/g, '').trim();
        
        if (hasAddToCart) {
          // Извлекаем ID продуктов для ссылки на приложение
          const productIds = addToCartMatches.map(tag => tag.match(/\[add_to_cart:([\w-]+)\]/)[1]);
          const cartUrl = `https://humane-jaguar-annually.ngrok-free.app/cart?products=${productIds.join(',')}`;
          
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
        } else {
          // Отправляем обычный ответ без кнопки
          await ctx.reply(cleanResponse);
        }
        
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
        
        const response = await fetch('http://localhost:3000/api/order', {
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

  async linkBotWithCode(authCode, telegramId) {
    if (!authCode) return null;

    const { data: codeRow } = await this.supabase
      .from('tg_link_codes')
      .select('id, user_id, is_used, expires_at, telegram_id')
      .eq('auth_code', authCode)
      .maybeSingle();

    if (!codeRow) {
      return null;
    }

    const expiresAt = codeRow.expires_at ? new Date(codeRow.expires_at) : null;
    if (codeRow.is_used || (expiresAt && expiresAt.getTime() < Date.now())) {
      return null;
    }

    if (codeRow.telegram_id && codeRow.telegram_id !== telegramId) {
      return null;
    }

    const { data: user } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', codeRow.user_id)
      .maybeSingle();

    if (!user) {
      return null;
    }

    await this.supabase
      .from('users')
      .update({ telegram_id: telegramId, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    await this.supabase
      .from('tg_link_codes')
      .update({ is_used: true, used_at: new Date().toISOString(), telegram_id: telegramId })
      .eq('id', codeRow.id);

    return { ...user, telegram_id: telegramId };
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

  // Вызов AI API с ngrok заголовками
  async callAI(message, context) {
    const baseUrl = 'http://localhost:3000';
    try {
      console.log('🤖 Вызываем AI API:', `${baseUrl}/api/ai`);
      console.log('📝 Сообщение:', message);
      console.log('👤 User ID:', context?.user_id);
      
      const response = await fetch(`${baseUrl}/api/test-api`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'spor3s-bot/1.0'
        },
        body: JSON.stringify({
          message,
          context: context?.messages || [],
          source: 'telegram_bot',
          user_id: context?.user_id || null
        }),
        timeout: 10000
      });
      
      console.log('📊 Статус ответа:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ AI API ошибка:', response.status, errorText);
        return 'Извините, произошла ошибка при обращении к ИИ. Попробуйте позже.';
      }
      
      const data = await response.json();
      console.log('✅ AI ответ получен:', data.response?.substring(0, 100) + '...');
      
      // Совместимость с различными ответами API
      return data.response || data.reply || 'Извините, не удалось получить ответ.';
    } catch (e) {
      console.error('❌ callAI error:', e?.message || e);
      return 'Извините, произошла ошибка при обращении к ИИ. Попробуйте позже.';
    }
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
    const orderKeywords = [
      'заказ', 'купить', 'оформить', 'корзина', 'хочу заказать',
      'оформи заказ', 'сделай заказ', 'закажи', 'отправь', 'купи',
      'ежовик порошок 1 месяц', 'ежовик порошок месяц',
      'ежовик капсулы', 'мухомор капсулы', 'кордицепс порошок'
    ];
    
    const hasOrderIntent = orderKeywords.some(keyword => 
      userMessage.toLowerCase().includes(keyword) ||
      aiResponse.toLowerCase().includes(keyword)
    );
    
    // Проверяем наличие контактных данных
    const hasContactInfo = /[а-яё]{2,}\s+[а-яё]{2,}/i.test(userMessage) && 
                          /\d{10,}/.test(userMessage);
    
    // Проверяем наличие адреса
    const hasAddress = /[а-яё]+\s+[а-яё]+\s+\d+/.test(userMessage);
    
    console.log('🔍 Анализ заказа:', {
      hasOrderIntent,
      hasContactInfo,
      hasAddress,
      message: userMessage.substring(0, 100)
    });
    
    return hasOrderIntent && (hasContactInfo || hasAddress);
  }

  // Обработка создания заказа
  async handleOrderCreation(userId, userMessage, aiResponse, ctx) {
    try {
      const orderData = this.parseOrderData(userMessage, aiResponse);
      
      if (orderData) {
        const response = await fetch('http://localhost:3000/api/order', {
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
    console.log('🔍 Парсинг данных заказа:', userMessage);
    
    // Определяем продукт
    let productId = null;
    let productName = '';
    let quantity = 1;
    
    if (/ежовик.*порошк/i.test(userMessage)) {
      productId = 'ezh100';
      productName = 'Ежовик порошок 100г';
    } else if (/ежовик.*капсул/i.test(userMessage)) {
      productId = 'ezh120k';
      productName = 'Ежовик капсулы 120шт';
    } else if (/ежовик/i.test(userMessage)) {
      productId = 'ezh120k';
      productName = 'Ежовик капсулы 120шт';
    } else if (/мухомор.*капсул/i.test(userMessage)) {
      productId = 'mhm60k';
      productName = 'Мухомор капсулы 60шт';
    } else if (/мухомор/i.test(userMessage)) {
      productId = 'mhm30';
      productName = 'Мухомор порошок 30г';
    } else if (/кордицепс.*порошк/i.test(userMessage)) {
      productId = 'kor50';
      productName = 'Кордицепс порошок 50г';
    } else if (/кордицепс/i.test(userMessage)) {
      productId = 'kor50';
      productName = 'Кордицепс порошок 50г';
    } else if (/4.*в.*1|комплекс/i.test(userMessage)) {
      productId = '4v1';
      productName = 'Комплекс 4в1';
    }
    
    if (!productId) {
      console.log('❌ Продукт не определен');
      return null;
    }
    
    // Извлекаем ФИО
    const fioMatch = userMessage.match(/([А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+)/);
    const fio = fioMatch ? fioMatch[1] : 'Не указано';
    
    // Извлекаем телефон
    const phoneMatch = userMessage.match(/(\d{10,})/);
    const phone = phoneMatch ? phoneMatch[1] : 'Не указано';
    
    // Извлекаем адрес
    const addressMatch = userMessage.match(/([а-яё]+\s+[а-яё]+\s+\d+)/i);
    const address = addressMatch ? addressMatch[1] : 'Не указано';
    
    // Определяем срок
    let period = '1 месяц';
    if (/3.*месяц/i.test(userMessage)) {
      period = '3 месяца';
      if (productId === 'ezh100') productId = 'ezh300';
      if (productId === 'mhm30') productId = 'mhm100';
      if (productId === 'kor50') productId = 'kor150';
    } else if (/6.*месяц/i.test(userMessage)) {
      period = '6 месяцев';
      if (productId === '4v1') productId = '4v1-6';
    }
    
    console.log('✅ Данные заказа:', {
      productId,
      productName,
      fio,
      phone,
      address,
      period
    });
    
    return {
      items: { [productId]: quantity },
      total: 1100, // Базовая цена, будет уточнена в API
      fio: fio,
      phone: phone,
      address: address,
      comment: `Заказ через Telegram: ${productName} на ${period}. ${userMessage}`
    };
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