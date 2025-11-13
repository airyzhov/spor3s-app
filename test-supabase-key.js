const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://hwospkbheqaauluoytvz.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3b3Nwa2JoZXFhYXVsdW95dHZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NjQyMDIsImV4cCI6MjA2NzE0MDIwMn0.vIUqjDmvEtAeJi_sCrntD8rUdEr8EpoMXpbTcDhCJIs';

console.log('🔍 Тестируем Supabase ANON KEY...');
console.log('URL:', SUPABASE_URL);
console.log('Key:', ANON_KEY.substring(0, 30) + '...');

const supabase = createClient(SUPABASE_URL, ANON_KEY);

supabase
  .from('users')
  .select('id')
  .limit(1)
  .then(result => {
    console.log('\n✅ КЛЮЧ РАБОТАЕТ!');
    console.log('Статус:', result.status);
    console.log('Ошибка:', result.error);
    console.log('Данных получено:', result.data?.length || 0);
    process.exit(0);
  })
  .catch(error => {
    console.log('\n❌ КЛЮЧ НЕ РАБОТАЕТ!');
    console.error('Ошибка:', error.message);
    process.exit(1);
  });

