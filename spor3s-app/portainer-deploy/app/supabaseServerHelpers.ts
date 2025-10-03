import { supabaseServer } from './supabaseServerClient';

type Instruction = { title: string; content?: string; url?: string };

export async function searchInstructions(query: string) {
  const { data, error } = await supabaseServer
    .from('instructions')
    .select('*')
    .or(`title.ilike.%${query}%,content.ilike.%${query}%,tags.ilike.%${query}%`)
    .limit(5);
  return data || [];
}

export async function getUserOrders(userId: string) {
  const { data, error } = await supabaseServer
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function getUserMessages(userId: string) {
  const { data, error } = await supabaseServer
    .from('messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function getUserSurveys(userId: string) {
  const { data, error } = await supabaseServer
    .from('surveys')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function searchInstructionsServer(query: string): Promise<Instruction[]> {
  const { data, error } = await supabaseServer
    .from('instructions')
    .select('title, content, url')
    .textSearch('title,content', query, { type: 'websearch', config: 'english' })
    .limit(5);
  if (error) {
    console.error('Ошибка поиска инструкций:', error);
    return [];
  }
  return data || [];
}

export async function getUserOrdersServer(user_id: string) {
  const { data, error } = await supabaseServer
    .from('orders')
    .select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false });
  if (error) console.error('Ошибка fetching orders:', error);
  return data || [];
}

export async function getUserSurveysServer(user_id: string) {
  const { data, error } = await supabaseServer
    .from('surveys')
    .select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false });
  if (error) console.error('Ошибка fetching surveys:', error);
  return data || [];
}

export async function getUserMessagesServer(user_id: string) {
  const { data, error } = await supabaseServer
    .from('messages')
    .select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false })
    .limit(10); // Увеличиваем лимит до 10 сообщений
  if (error) console.error('Ошибка fetching messages:', error);
  return data || [];
}

export async function saveMessageServer(user_id: string, role: string, content: string, source: string = 'mini_app') {
  const { data, error } = await supabaseServer
    .from('messages')
    .insert({
      user_id,
      role,
      content,
      source,
      created_at: new Date().toISOString()
    });
  if (error) console.error('Ошибка saving message:', error);
  return data;
}

export async function getProductsServer() {
  const { data, error } = await supabaseServer
    .from('products')
    .select('id, name, price, description')
    .order('name', { ascending: true });
  if (error) console.error('Ошибка fetching products:', error);
  return data || [];
}

// Функция для получения полной картины пользователя
export async function getUserProfileServer(user_id: string) {
  try {
    // Получаем все данные пользователя
    const [orders, messages, surveys, checkinsResult] = await Promise.all([
      getUserOrdersServer(user_id),
      getUserMessagesServer(user_id),
      getUserSurveysServer(user_id),
      supabaseServer
        .from('daily_checkins')
        .select('*')
        .eq('user_id', user_id)
        .order('date', { ascending: false })
        .limit(10)
    ]);

    const checkins = Array.isArray(checkinsResult?.data) ? checkinsResult.data : [];

    // Анализируем предпочтения пользователя
    const userPreferences = {
      // Анализ заказов
      totalOrders: orders.length,
      totalSpent: orders.reduce((sum, order) => sum + (order.total || 0), 0),
      favoriteProducts: analyzeFavoriteProducts(orders),
      lastOrderDate: orders[0]?.created_at,
      
      // Анализ сообщений
      totalMessages: messages.length,
      userMessages: messages.filter(m => m.role === 'user').length,
      assistantMessages: messages.filter(m => m.role === 'assistant').length,
      commonTopics: analyzeCommonTopics(messages),
      
      // Анализ активности
      totalSurveys: surveys.length,
      totalCheckins: checkins.length,
      lastCheckinDate: checkins[0]?.date,
      
      // Общая активность
      isActive: checkins.length > 0 && 
                new Date(checkins[0].date).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000 // Последние 7 дней
    };

    return {
      orders,
      messages,
      surveys,
      checkins,
      preferences: userPreferences
    };
  } catch (error) {
    console.error('Ошибка получения профиля пользователя:', error);
    return null;
  }
}

// Вспомогательная функция для анализа любимых продуктов
function analyzeFavoriteProducts(orders: any[]) {
  const productCounts: { [key: string]: number } = {};
  
  orders.forEach(order => {
    if (order.items) {
      try {
        const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
        items.forEach((item: any) => {
          if (item.product_id) {
            productCounts[item.product_id] = (productCounts[item.product_id] || 0) + (item.quantity || 1);
          }
        });
      } catch (e) {
        console.error('Ошибка парсинга items:', e);
      }
    }
  });
  
  return Object.entries(productCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([productId, count]) => ({ productId, count }));
}

// Вспомогательная функция для анализа общих тем
function analyzeCommonTopics(messages: any[]) {
  const topics = {
    'мухомор': 0,
    'ежовик': 0,
    'кордицепс': 0,
    'цистозира': 0,
    'комплекс': 0,
    'заказ': 0,
    'доставка': 0,
    'цена': 0,
    'скидка': 0,
    'монеты': 0,
    'sc': 0
  };
  
  messages.forEach(message => {
    const content = message.content.toLowerCase();
    Object.keys(topics).forEach(topic => {
      if (content.includes(topic)) {
        topics[topic as keyof typeof topics]++;
      }
    });
  });
  
  return Object.entries(topics)
    .filter(([, count]) => count > 0)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([topic, count]) => ({ topic, count }));
} 