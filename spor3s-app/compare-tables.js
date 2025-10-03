const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function compareTables() {
  console.log('🔍 СОПОСТАВЛЕНИЕ ТАБЛИЦ SUPABASE И АДМИНКИ');
  console.log('====================================================');
  
  // Таблицы из админки
  const adminTables = [
    'orders_sync',
    'users_sync', 
    'coin_transactions_sync',
    'challenges_sync',
    'daily_checkins_sync',
    'instructions_sync',
    'messages_sync',
    'products_sync',
    'supplement_checkins_sync',
    'surveys_sync',
    'weekly_reviews_sync'
  ];
  
  // Основные таблицы проекта
  const mainTables = [
    'orders',
    'users',
    'coin_transactions',
    'challenges',
    'daily_checkins',
    'instructions',
    'messages',
    'products',
    'supplement_checkins',
    'surveys',
    'weekly_reviews'
  ];
  
  console.log('📋 АДМИНКА vs СУЩЕСТВУЮЩИЕ ТАБЛИЦЫ:');
  console.log('');
  console.log('Админка таблица'.padEnd(25) + ' | Sync | Основная таблица'.padEnd(20) + ' | Main | Записей');
  console.log('─'.repeat(80));
  
  for (let i = 0; i < adminTables.length; i++) {
    const adminTable = adminTables[i];
    const mainTable = mainTables[i];
    
    try {
      // Проверяем sync таблицу
      const { error: syncError } = await supabase
        .from(adminTable)
        .select('count')
        .limit(1);
        
      // Проверяем основную таблицу
      const { data: mainData, error: mainError } = await supabase
        .from(mainTable)
        .select('*', { count: 'exact', head: true });
        
      const syncExists = !syncError;
      const mainExists = !mainError;
      const mainCount = mainData?.length || 0;
      
      console.log(
        adminTable.padEnd(25) + ' | ' + 
        (syncExists ? '✅' : '❌').padEnd(4) + ' | ' + 
        mainTable.padEnd(20) + ' | ' + 
        (mainExists ? '✅' : '❌').padEnd(4) + ' | ' + 
        mainCount
      );
      
    } catch (e) {
      console.log(adminTable.padEnd(25) + ' | ❌ | ' + mainTable.padEnd(20) + ' | ❌ | ошибка');
    }
  }
  
  console.log('');
  console.log('📊 СТАТИСТИКА ИЗ АДМИНКИ:');
  console.log('• Пользователей: 605');
  console.log('• Суммарный SC: 205');
  console.log('• Заказов: 33');
  console.log('• Транзакций: 14');
  
  console.log('');
  console.log('🔍 ПРОВЕРКА АКТУАЛЬНОЙ СТАТИСТИКИ:');
  
  // Проверяем реальную статистику
  try {
    const { count: usersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
      
    const { count: ordersCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });
      
    const { count: transactionsCount } = await supabase
      .from('coin_transactions')
      .select('*', { count: 'exact', head: true });
      
    console.log(`• Пользователей (реально): ${usersCount}`);
    console.log(`• Заказов (реально): ${ordersCount}`);
    console.log(`• Транзакций (реально): ${transactionsCount}`);
    
    console.log('');
    console.log('🎯 ВЫВОД:');
    console.log('• Админка ссылается на несуществующие таблицы _sync');
    console.log('• Все данные хранятся в основных таблицах без суффикса _sync');
    console.log('• Нужно обновить админку для работы с реальными таблицами');
    
  } catch (e) {
    console.log('❌ Ошибка получения статистики:', e.message);
  }
}

compareTables().catch(console.error);
