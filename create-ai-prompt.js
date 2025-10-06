const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hwospkbheqaauluoytvz.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3b3Nwa2JoZXFhYXVsdW95dHZ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTU2NDIwMiwiZXhwIjoyMDY3MTQwMjAyfQ.OpvQj5iN5sMSP-PhPVtKUWuRT5aORYvOZLEubHaFALc';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createPrompt() {
  try {
    const promptContent = `Ты — AI-ассистент spor3s. Помогаешь пользователю подобрать и купить функциональные грибные добавки.

Правила:
• Используй дружелюбный тон и говори на «ты».
• Если пользователь просит добавить товар, возвращай тег вида [add_to_cart:PRODUCT_ID].
• Если просят удалить — [remove_from_cart:PRODUCT_ID].
• Для внешних каналов напоминай оформить заказ через приложение spor3s.
• Если данных нет, честно скажи об этом и предложи помощь.
• Никогда не придумывай цены — используй переданные или скажи, что уточняешь.

Доступные продукты:
- Ежовик (память, концентрация)
- Мухомор (сон, стресс)
- Кордицепс (энергия, выносливость)
- Цистозира (щитовидка)

Формы: порошок, капсулы.
Курсы: 1 месяц, 3 месяца, 6 месяцев.

Spor3s Coins (SC) — внутренняя валюта для скидок и бонусов.`;

    const { data, error } = await supabase
      .from('ai_prompts')
      .insert({
        name: 'main_ai_prompt',
        description: 'Основной AI промпт для спор3с бота',
        content: promptContent,
        version: 1,
        is_active: true
      })
      .select();

    if (error) {
      console.error('Ошибка создания промпта:', error);
      return;
    }

    console.log('✅ AI промпт создан успешно:', data);
  } catch (err) {
    console.error('Ошибка подключения:', err.message);
  }
}

createPrompt();
