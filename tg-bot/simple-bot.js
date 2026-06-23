const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

// Функция для получения или создания пользователя
async function getOrCreateUser(telegramId, userInfo) {
  const { data: existingUser, error: selectError } = await supabase
    .from('users')
    .select('id, name')
    .eq('telegram_id', telegramId)
    .single();

  if (existingUser) {
    return existingUser;
  }

  // Создаем нового пользователя
  const { data: newUser, error: insertError } = await supabase
    .from('users')
    .insert([{ 
      telegram_id: telegramId, 
      name: userInfo?.first_name || userInfo?.username || 'User' 
    }])
    .select('id, name')
    .single();

  if (insertError) {
    throw new Error(`Error creating user: ${insertError.message}`);
  }

  return newUser;
}

// Функция для вызова ИИ API
async function callAI(message, userId, telegramId) {
  try {
    const response = await fetch(`https://humane-jaguar-annually.ngrok-free.app/api/ai-simple`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        user_id: userId,
        telegram_id: telegramId
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.response || 'Извините, не удалось получить ответ от ИИ.';
  } catch (error) {
    console.error('AI API error:', error);
    return 'Извините, произошла ошибка при обращении к ИИ. Попробуйте позже.';
  }
}

// /start команда
bot.start(async (ctx) => {
  const parts = ctx.message.text.split(' ');
  if (parts.length === 2) {
    const auth_code = parts[1];
    try {
      // Найти auth_code в tg_link_codes
      const { data: link } = await supabase
        .from('tg_link_codes')
        .select('user_id, telegram_id, expires_at')
        .eq('auth_code', auth_code)
        .single();

      if (!link) {
        return ctx.reply('❌ Код не найден или истёк.');
      }

      if (new Date(link.expires_at) < new Date()) {
        return ctx.reply('❌ Код истёк. Сгенерируйте новый в мини-приложении.');
      }

      // Обновляем telegram_id пользователя
      await supabase
        .from('users')
        .update({ telegram_id: ctx.from.id.toString() })
        .eq('id', link.user_id);

      // Отмечаем код как использованный
      await supabase
        .from('tg_link_codes')
        .update({ is_used: true, used_at: new Date().toISOString() })
        .eq('auth_code', auth_code);

      await ctx.reply('🎉 Аккаунт успешно привязан! Теперь мини-приложение и бот синхронизированы.');
    } catch (error) {
      console.error('Error linking account:', error);
      await ctx.reply('❌ Ошибка привязки аккаунта. Попробуйте позже.');
    }
  } else {
    const telegramId = ctx.from.id.toString();
    const user = await getOrCreateUser(telegramId, ctx.from);
    
    const welcomeMessage = `🎉 Добро пожаловать в Spor3s!

Я ваш персональный AI-консультант по грибным добавкам.

🍄 У нас есть:
• Ежовик гребенчатый - для памяти и концентрации
• Мухомор красный - для сна и спокойствия  
• Кордицепс - для энергии
• Цистозира - для щитовидной железы

💬 Просто напишите мне, что вас интересует!`;

    await ctx.reply(welcomeMessage);
  }
});

// Обработка всех сообщений
bot.on('text', async (ctx) => {
  try {
    const telegramId = ctx.from.id.toString();
    const user = await getOrCreateUser(telegramId, ctx.from);
    
    // Получаем ответ от AI
    const aiResponse = await callAI(ctx.message.text, user.id, telegramId);
    
    await ctx.reply(aiResponse);
  } catch (error) {
    console.error('Error processing message:', error);
    await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
  }
});

// Запуск бота
bot.launch().then(() => {
  console.log('🤖 Spor3s Bot запущен!');
}).catch((error) => {
  console.error('❌ Ошибка запуска бота:', error);
});

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

