const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'env.local' });

console.log('🔍 ДЕТАЛЬНАЯ ПРОВЕРКА СИСТЕМЫ');
console.log('=====================================');

// Проверяем переменные окружения
const API_ID = process.env.TELEGRAM_API_ID;
const API_HASH = process.env.TELEGRAM_API_HASH;
const SESSION_STRING = process.env.TELEGRAM_SESSION_STRING;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('📋 Переменные окружения:');
console.log('API_ID:', API_ID ? '✅' : '❌');
console.log('API_HASH:', API_HASH ? '✅' : '❌');
console.log('SESSION_STRING:', SESSION_STRING ? '✅' : '❌');
console.log('SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌');
console.log('SUPABASE_KEY:', SUPABASE_KEY ? '✅' : '❌');

if (!API_ID || !API_HASH || !SESSION_STRING) {
  console.log('❌ ПРОБЛЕМА: Отсутствуют переменные окружения для @spor3z');
  process.exit(1);
}

// Проверяем Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkSupabase() {
  console.log('\n🗄️ Проверка Supabase:');
  
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
      
    if (error) {
      console.log('❌ Supabase ошибка:', error.message);
      return false;
    }
    
    console.log('✅ Supabase подключение работает');
    return true;
  } catch (e) {
    console.log('❌ Supabase ошибка:', e.message);
    return false;
  }
}

// Проверяем AI агента
async function checkSpor3z() {
  console.log('\n🤖 Проверка @spor3z:');
  
  try {
    const { TelegramClient } = require('telegram');
    const { StringSession } = require('telegram/sessions');
    
    const client = new TelegramClient(new StringSession(SESSION_STRING), parseInt(API_ID), API_HASH, {
      connectionRetries: 3,
      deviceModel: 'Spor3z Test',
      systemVersion: '1.0.0',
      appVersion: '1.0.0',
      langCode: 'ru'
    });
    
    await client.connect();
    console.log('✅ Подключение к Telegram API успешно');
    
    const me = await client.getMe();
    console.log('👤 Аккаунт:', me.username);
    console.log('📱 ID:', me.id.toString());
    console.log('✅ @spor3z подключен и готов к работе');
    
    await client.disconnect();
    return true;
    
  } catch (error) {
    console.log('❌ Ошибка подключения @spor3z:', error.message);
    console.log('🔧 Возможные причины:');
    console.log('• Неверный SESSION_STRING');
    console.log('• Проблемы с сетью');
    console.log('• Аккаунт заблокирован');
    return false;
  }
}

// Проверяем сообщения в базе
async function checkMessages() {
  console.log('\n📨 Проверка сообщений:');
  
  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (error) {
      console.log('❌ Ошибка получения сообщений:', error.message);
      return;
    }
    
    console.log('📊 Сообщений в базе:', messages.length);
    
    if (messages.length > 0) {
      messages.forEach((msg, index) => {
        console.log(`${index + 1}. ${msg.role}: ${msg.content.substring(0, 50)}...`);
        console.log(`   Время: ${msg.created_at}`);
        console.log(`   Источник: ${msg.source || 'не указан'}`);
      });
    } else {
      console.log('📭 Сообщений нет - это может быть причиной тишины');
    }
  } catch (e) {
    console.log('❌ Ошибка проверки сообщений:', e.message);
  }
}

// Основная проверка
async function main() {
  const supabaseOk = await checkSupabase();
  const spor3zOk = await checkSpor3z();
  await checkMessages();
  
  console.log('\n🎯 ИТОГОВЫЙ СТАТУС:');
  console.log('Supabase:', supabaseOk ? '✅' : '❌');
  console.log('@spor3z:', spor3zOk ? '✅' : '❌');
  
  if (!spor3zOk) {
    console.log('\n❌ ПРОБЛЕМА: @spor3z не подключен - поэтому тишина');
    console.log('🔧 Решение: Перезапустить AI агента');
  } else {
    console.log('\n✅ Все компоненты работают');
    console.log('🔍 Возможные причины тишины:');
    console.log('• Сообщения не доходят до AI агента');
    console.log('• Проблемы с обработкой сообщений');
    console.log('• Ошибки в коде AI агента');
  }
}

main().catch(console.error);
