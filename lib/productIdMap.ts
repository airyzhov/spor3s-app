// Маппинг между тегами AI и реальными ID товаров в БД
// Этот маппинг синхронизирует теги из AI (типа [add_to_cart:mhm60k])
// с реальными ID товаров в Supabase

export const AI_TAG_TO_PRODUCT_NAME_MAP: Record<string, string[]> = {
  // Ежовик
  'ezh120k': ['Ежовик 120 капсул', 'Ежовик', '120', 'капсулы'],
  'ezh100': ['Ежовик 100г порошок', 'Ежовик', '100г', 'порошок'],
  'ezh360k': ['Ежовик 360 капсул', 'Ежовик', '360', 'капсулы', '3 месяца'],
  'ezh300': ['Ежовик 300г порошок', 'Ежовик', '300г', 'порошок'],
  'ezh500': ['Ежовик 500г порошок', 'Ежовик', '500г', 'порошок'],
  
  // Мухомор
  'mhm30': ['Мухомор 30г', 'Мухомор', '30г', '30гр'],
  'mhm60k': ['Мухомор 60 капсул', 'Мухомор', '60', 'капсулы'],
  'mhm50': ['Мухомор 50г', 'Мухомор', '50г', '50гр'],
  'mhm100': ['Мухомор 100г', 'Мухомор', '100г', '100гр'],
  'mhm180k': ['Мухомор 180 капсул', 'Мухомор', '180', 'капсулы'],
  
  // Кордицепс
  'kor50': ['Кордицепс 50г', 'Кордицепс', '50г', '50гр'],
  'kor150': ['Кордицепс 150г', 'Кордицепс', '150г', '150гр'],
  
  // Цистозира
  'ci30': ['Цистозира 30г', 'Цистозира', '30г', '30гр'],
  'ci90': ['Цистозира 90г', 'Цистозира', '90г', '90гр'],
  
  // Комплекс
  '4v1': ['4 в 1 месяц', 'Комплекс', '4 в 1', 'месяц', '3300'],
  '4v1-3': ['4 в 1 3 месяца', 'Комплекс', '4 в 1', '3 месяца', '9000'],
};

/**
 * Преобразует AI тег (типа [add_to_cart:mhm60k]) в реальный ID товара из БД
 * Ищет товар по названию и ключевым словам из маппинга
 */
export function findProductByAITag(aiTag: string, products: any[]): any | null {
  const keywords = AI_TAG_TO_PRODUCT_NAME_MAP[aiTag] || [];
  
  if (keywords.length === 0) {
    console.log(`⚠️ Маппинг не найден для тега: ${aiTag}`);
    return null;
  }
  
  // Ищем товар который содержит ВСЕ или большинство ключевых слов
  for (const product of products) {
    const productName = (product.name || '').toLowerCase();
    const productDesc = (product.description || '').toLowerCase();
    const fullText = `${productName} ${productDesc}`.toLowerCase();
    
    // Проверяем совпадение ключевых слов (хотя бы 2-3)
    let matchCount = 0;
    for (const keyword of keywords) {
      if (fullText.includes(keyword.toLowerCase())) {
        matchCount++;
      }
    }
    
    // Если совпадение хорошее (минимум 2 ключевых слова или основное имя)
    if (matchCount >= 2 || productName.includes(keywords[0]?.toLowerCase() || '')) {
      console.log(`✅ Найден товар для тега ${aiTag}: ${product.name} (ID: ${product.id})`);
      return product;
    }
  }
  
  console.log(`❌ Товар не найден для тега: ${aiTag}`);
  console.log(`   Ищем по ключевым словам: ${keywords.join(', ')}`);
  console.log(`   Доступные товары: ${products.map(p => p.name).join(', ')}`);
  
  return null;
}
