// ИИ-консультант (app/api/ai): куда слать запрос и что отвечать, если ИИ недоступен.

export type AiEndpoint = { provider: 'openrouter' | 'openai'; url: string; model: string };

// Провайдер — по ключу: OpenRouter (sk-or-…) или OpenAI. Модель — AI_MODEL, иначе gpt-4o-mini
// в формате провайдера. Раньше ключ OpenRouter уходил на api.openai.com → 401 на каждое
// сообщение, и консультант всегда отвечал заготовкой.
export function aiEndpoint(key: string, modelEnv?: string): AiEndpoint {
  const openrouter = key.startsWith('sk-or-');
  const model = modelEnv?.trim() || (openrouter ? 'openai/gpt-4o-mini' : 'gpt-4o-mini');
  return openrouter
    ? { provider: 'openrouter', url: 'https://openrouter.ai/api/v1/chat/completions', model }
    : { provider: 'openai', url: 'https://api.openai.com/v1/chat/completions', model };
}

// Приветствие, когда ИИ недоступен и вопрос не распознан. Без Markdown: бот шлёт текст как есть,
// а путь в магазин — кнопка под сообщением (tg-bot/replies.ts), не ссылка в тексте.
export const AI_GREETING = `Привет! Я консультант по грибным добавкам СПОРС.

Помогу подобрать добавки для ваших целей:

🧠 Память и концентрация → Ежовик
😴 Сон и стресс → Мухомор
⚡ Энергия и выносливость → Кордицепс
🦋 Щитовидная железа → Цистозира
🎯 Все вместе → Комплекс 4 в 1

Что вас интересует? Расскажите о ваших целях, и я подберу оптимальный вариант!`;
