import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { message, source, telegram_id } = await req.json();
    
    console.log("[AI SIMPLE] message:", message);
    console.log("[AI SIMPLE] source:", source);
    
    const messageSource = source || 'mini_app';
    const userMessage = message.toLowerCase();
    
    // Обработка запросов о балансе SC
    const balanceKeywords = ['коин', 'балл', 'spor3s coin', 'сколько у меня', 'мой баланс', 'моих коинов', 'баллов у меня'];
    if (balanceKeywords.some(keyword => userMessage.includes(keyword))) {
      let balanceResponse = `Spor3s Coins (SC) — это внутренняя валюта нашей платформы! 
      
🪙 **Как зарабатывать SC:**
• Ежедневные чекины 
• Прохождение опросов
• Покупки товаров
• Реферальная программа

💰 **Как тратить SC:**
• Скидки до 30% от суммы заказа
• Обмен на товары

📱 **Проверить баланс:** откройте приложение → раздел "Прогресс"`;
      
      if (messageSource !== 'mini_app') {
        balanceResponse += '\n\nДля быстрого оформления используйте приложение: 👉 t.me/spor3sbot';
      }
      
      return NextResponse.json({ response: balanceResponse });
    }
    
    // Обработка товаров
    if (userMessage.includes('ежовик')) {
      let response = `Отлично! Ежовик гребенчатый отлично помогает с памятью, концентрацией и обучением.

В какой форме предпочитаете:
• Капсулы (удобно принимать, 120 капсул на месяц за 1100₽)
• Порошок (быстрее эффект, 100г на месяц за 1100₽)

И на какой срок:
• Месяц (для начала)
• 3 месяца (курс, экономично)
• 6 месяцев (максимальный эффект)

Также у вас уже есть опыт приема добавок или начинаете впервые?`;

      if (messageSource !== 'mini_app') {
        response += '\n\nДля быстрого оформления используйте приложение: 👉 t.me/spor3sbot';
      }
      
      return NextResponse.json({ response });
    }
    
    if (userMessage.includes('мухомор')) {
      let response = `Отлично! Мухомор отлично помогает со сном и снимает стресс.

В какой форме предпочитаете:
• Капсулы (удобно принимать, 60 капсул на месяц за 1400₽)
• Порошок из шляпок (быстрее эффект, 30г на месяц за 1400₽)

И на какой срок:
• Месяц (для начала)
• 3 месяца (курс, экономично)
• 6 месяцев (максимальный эффект)

Также у вас уже есть опыт приема добавок или начинаете впервые?`;

      if (messageSource !== 'mini_app') {
        response += '\n\nДля быстрого оформления используйте приложение: 👉 t.me/spor3sbot';
      }
      
      return NextResponse.json({ response });
    }
    
    // Базовый ответ
    let response = `Привет! Я консультант по грибным добавкам СПОРС.
    
У нас есть:
🧠 Ежовик гребенчатый - для памяти и концентрации
😴 Мухомор красный - для сна и спокойствия  
💪 Кордицепс - для энергии
🦋 Цистозира - для щитовидной железы

Что вас интересует?`;

    if (messageSource !== 'mini_app') {
      response += '\n\nДля быстрого оформления используйте приложение: 👉 t.me/spor3sbot';
    }
    
    return NextResponse.json({ response });
    
  } catch (error) {
    console.error("[AI SIMPLE] Error:", error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      response: "Извините, произошла ошибка. Попробуйте позже.",
      error: message
    }, { status: 500 });
  }
}
