process.env.SUPABASE_URL = "https://hwospkbheqaauluoytvz.supabase.co";
process.env.SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3b3Nwa2JoZXFhYXVsdW95dHZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NjQyMDIsImV4cCI6MjA2NzE0MDIwMn0.vIUqjDmvEtAeJi_sCrntD8rUdEr8EpoMXpbTcDhCJIs";

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function getOrCreateUser(telegram_id) {
  if (!telegram_id) throw new Error('telegram_id required');
  let { data: user, error } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_id', telegram_id)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  if (!user) {
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([{ telegram_id }])
      .select('id')
      .single();
    if (insertError || !newUser) throw new Error(insertError?.message || 'Failed to create user');
    user = newUser;
  }
  return user.id;
}

async function test() {
  try {
    const user_id = await getOrCreateUser('test-telegram-12345');
    console.log('User ID:', user_id);
    const { data, error } = await supabase.from('orders').insert([
      {
        user_id,
        items: [{ id: 'test-product', name: 'Test Product', qty: 1, price: 100 }],
        total: 100,
        address: 'Test Address',
        fio: 'Test User',
        phone: '+70000000000',
        referral_code: 'testref',
        comment: 'Тестовый заказ',
        status: 'pending',
        created_at: new Date().toISOString(),
        spores_coin: 0,
        tracking_number: null,
        start_date: null,
      }
    ]);
    if (error) {
      console.error('Order error:', error);
    } else {
      console.log('Order created:', data);
    }
  } catch (e) {
    console.error('Error:', e);
  }
}

test(); 