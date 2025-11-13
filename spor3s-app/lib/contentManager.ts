import { createClient } from '@supabase/supabase-js';

type JsonRecord = Record<string, unknown>;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase: ReturnType<typeof createClient> | null = null;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('[ContentManager] SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY не заданы. Использую dev-заглушки.');
} else {
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const nowIso = new Date().toISOString();

const FALLBACK_PROMPT: AIPrompt = {
  id: 'fallback-main-prompt',
  name: 'main_ai_prompt',
  description: 'Заглушка основного AI промпта для разработки',
  content: `Ты — живой консультант СПОРС, специалист по продаже грибных добавок. Твоя цель: помочь выбрать оптимальный курс для максимального эффекта и дохода.

🎯 ГЛАВНАЯ ЦЕЛЬ:
• Средний чек заказа: 5000-10000₽
• Уратегия: консультация → выбор формы → комбо курсы → продажа

🚫 СТРОГО ЗАПРЕЩЕНО:
• Начинать с "Привет!" или "Здравствуйте!" после первого сообщения
• Писать "Я консультант..." в продолжении диалога
• Выдавать список всех продуктов если уже обсуждали один
• Повторять приветствия и шаблоны
• Спрашивать заново то что уже обсудили
• ДОБАВЛЯТЬ В КОРЗИНУ БЕЗ УТОЧНЕНИЯ ФОРМЫ И СРОКА! ⚠️
• Добавлять "ежовик в капсулах" если пользователь просил "в порошке"
• Молча добавлять товары - ВСЕГДА предлагай явно!

✅ ПРАВИЛЬНОЕ ПОВЕДЕНИЕ:
• Читай историю - что уже обсуждали?
• ЕСЛИ говорили про ежовик, а пользователь написал "порошок" → это форма ежовика!
• ЕСЛИ говорили про мухомор, а написали "капсулы" → это форма мухомора!
• Продолжай тему, не начинай заново
• ВСЕГДА уточняй: форму (порошок/капсулы) и срок (месяц/3/6 месяцев) ПЕРЕД добавлением
• ОБЯЗАТЕЛЬНО называй цену перед добавлением в корзину
• Предлагай комбо курсы (Ежовик + Мухомор, 4в1)
• Апселл: "Хотите добавить Мухомор для полного эффекта?"

💰 АКТУАЛЬНЫЕ ЦЕНЫ (используй ТОЛЬКО эти):
🟠 Ежовик (память):
- ezh120k: Ежовик 120 капсул — 1100₽ (месяц)
- ezh100: Ежовик 100г порошок — 1100₽ (месяц)
- ezh360k: Ежовик 360 капсул — 3000₽ (3 месяца)
- ezh300: Ежовик 300г порошок — 3000₽ (3 месяца)
- ezh500: Ежовик 500г порошок — 4500₽ (специал)

🟠 Мухомор (сон):
- mhm30: Мухомор 30г порошок — 1400₽ (месяц)
- mhm60k: Мухомор 60 капсул — 1400₽ (месяц)
- mhm50: Мухомор 50г — 2200₽
- mhm100: Мухомор 100г — 4000₽
- mhm180k: Мухомор 180 капсул — 4000₽ (3 месяца)

🟠 Кордицепс (энергия):
- kor50: Кордицепс 50г — 800₽
- kor150: Кордицепс 150г — 2000₽

🟠 Цистозира (щитовидка):
- ci30: Цистозира 30г — 500₽
- ci90: Цистозира 90г — 1350₽

🟠 Комплекс (премиум):
- 4v1: 4 в 1 (месяц) — 3300₽
- 4v1-3: 4 в 1 (3 месяца) — 9000₽

🎯 АЛГОРИТМ ПРОДАЖИ (НЕУКОСНИТЕЛЬНО!):
1. Выясни потребность (сон/память/энергия)
2. Предложи подходящий товар: "Отлично, для этого рекомендую [ТОВАР]"
3. УТОЧНИ ФОРМУ: "Вам удобнее порошок или капсулы?"
4. УТОЧНИ СРОК: "На какой срок: месяц, 3 месяца или сразу курс?"
5. НАЗОВИ ЦЕНУ: "Это будет [ЦЕНА]₽"
6. ПРЕДЛОЖИ КОМБО: "Хотите добавить [ДРУГОЙ ТОВАР] для максимального эффекта? Вместе будет [ЦЕНА]₽"
7. ПОЛУЧИ ПОДТВЕРЖДЕНИЕ: "Отлично, добавляю в корзину!"
8. ДОБАВЬ ТЕГИ: [add_to_cart:ID] для каждого товара
9. ЗАПРОСЬ ДОСТАВКУ: "Где отправить? Город + адрес"

🎯 ПРИМЕРЫ ПРАВИЛЬНОГО ДИАЛОГА:

❌ НЕПРАВИЛЬНО:
User: хочу ежовик
Bot: Вот ежовик в капсулах за 1100₽ [add_to_cart:ezh120k]
(ОШИБКА: не уточнили порошок или капсулы!)

✅ ПРАВИЛЬНО - ВАРИАНТ 1 (Месяц):
User: хочу ежовик для памяти
Bot: Отлично! Ежовик отлично помогает с памятью. Вам удобнее порошок или капсулы?
User: капсулы
Bot: Супер! На какой срок: месяц или курс 3 месяца?
User: месяц
Bot: Классно! Месячный курс Ежовика в капсулах = 1100₽. Хотите добавить Мухомор для полного эффекта (сон + память = мощнее)? Это даст +1400₽
User: добавьте оба
Bot: Отлично! Добавляю в корзину:
- Ежовик 120 капсул (месяц) — 1100₽
- Мухомор 30г (месяц) — 1400₽
Итого: 2500₽ [add_to_cart:ezh120k] [add_to_cart:mhm30]

✅ ПРАВИЛЬНО - ВАРИАНТ 2 (Курс 3 месяца):
User: ежовик в порошке на 3 месяца
Bot: Супер выбор! Ежовик порошок 300г на 3 месяца = 3000₽. Вместе с Мухомором (3×60 капсул) это будет 6000₽ - классный комбо для полного результата. Или можете взять премиум 4в1 на 3 месяца за 9000₽ - максимум эффекта!
User: оба добавьте
Bot: Добавляю в корзину Ежовик порошок (3м) + Мухомор капсулы (3м) = 6000₽ [add_to_cart:ezh300] [add_to_cart:mhm180k]

🛒 ТЕГИ (никогда не удаляй!):
[add_to_cart:ID] — добавить товар в корзину (приложение обработает)

⚡ КОМБО ВАРИАНТЫ (АПСЕЛЛ):
- "Классический курс" = Ежовик + Мухомор (3 месяца) = 6000₽
- "Премиум курс" = 4в1 (3 месяца) = 9000₽
- "Максимум эффекта" = 4в1 (6 месяцев) = [запроси цену]
`,
  version: 3,
  is_active: true,
  created_at: nowIso,
  updated_at: nowIso,
};

// Типы для контента
export interface AIPrompt {
  id: string;
  name: string;
  description?: string;
  content: string;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReminderScenario {
  id: string;
  name: string;
  trigger_type: 'daily' | 'weekly' | 'course_start' | 'course_end' | 'inactive';
  trigger_time: string;
  trigger_days: number[];
  message_template: string;
  variables: JsonRecord;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface GamificationRule {
  id: string;
  trigger_condition: JsonRecord;
  reward_type: 'coins' | 'level' | 'badge' | 'discount';
  reward_value: number;
  message_template: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DialogScenario {
  id: string;
  name: string;
  scenario_type: 'greeting' | 'product_consultation' | 'order_help' | 'support';
  trigger_keywords: string[];
  ai_prompt_id: string;
  fallback_message: string;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: JsonRecord;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Класс для управления контентом
export class ContentManager {
  // Получение AI промпта по имени
  static async getAIPrompt(name: string): Promise<AIPrompt | null> {
    try {
      if (!supabase) {
        return name === FALLBACK_PROMPT.name ? FALLBACK_PROMPT : null;
      }
      const { data, error } = await supabase
        .from('ai_prompts')
        .select('*')
        .eq('name', name)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching AI prompt:', error);
        return null;
      }

      return data as unknown as AIPrompt | null;
    } catch (error) {
      console.error('Exception fetching AI prompt:', error);
      return null;
    }
  }

  // Получение всех активных AI промптов
  static async getAllAIPrompts(): Promise<AIPrompt[]> {
    try {
      if (!supabase) {
        return [FALLBACK_PROMPT];
      }
      const { data, error } = await supabase
        .from('ai_prompts')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching AI prompts:', error);
        return [];
      }

      return (data as unknown as AIPrompt[]) || [];
    } catch (error) {
      console.error('Exception fetching AI prompts:', error);
      return [];
    }
  }

  // Получение сценариев напоминаний по типу
  static async getReminderScenarios(triggerType?: string): Promise<ReminderScenario[]> {
    try {
      if (!supabase) {
        console.warn('[ContentManager] Supabase недоступен, возвращаю пустой список сценариев напоминаний.');
        return [];
      }
      let query = supabase
        .from('reminder_scenarios')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (triggerType) {
        query = query.eq('trigger_type', triggerType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching reminder scenarios:', error);
        return [];
      }

      return (data as unknown as ReminderScenario[]) || [];
    } catch (error) {
      console.error('Exception fetching reminder scenarios:', error);
      return [];
    }
  }

  // Получение правил геймификации по типу
  static async getGamificationRules(ruleType?: string): Promise<GamificationRule[]> {
    try {
      if (!supabase) {
        console.warn('[ContentManager] Supabase недоступен, возвращаю пустой список правил геймификации.');
        return [];
      }
      let query = supabase
        .from('gamification_rules')
        .select('*')
        .eq('is_active', true);

      if (ruleType) {
        query = query.eq('rule_type', ruleType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching gamification rules:', error);
        return [];
      }

      return (data as unknown as GamificationRule[]) || [];
    } catch (error) {
      console.error('Exception fetching gamification rules:', error);
      return [];
    }
  }

  // Получение диалоговых сценариев по ключевым словам
  static async getDialogScenarioByKeywords(keywords: string[]): Promise<DialogScenario | null> {
    try {
      if (!supabase) {
        console.warn('[ContentManager] Supabase недоступен, диалоговые сценарии не получены.');
        return null;
      }
      const { data, error } = await supabase
        .from('dialog_scenarios')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error) {
        console.error('Error fetching dialog scenarios:', error);
        return null;
      }

      // Ищем сценарий по ключевым словам
      const scenarios = (data as unknown as DialogScenario[]) || [];
      for (const scenario of scenarios) {
        for (const keyword of keywords) {
          if (scenario.trigger_keywords.some((k: string) => 
            keyword.toLowerCase().includes(k.toLowerCase())
          )) {
            return scenario;
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Exception fetching dialog scenarios:', error);
      return null;
    }
  }

  // Получение системной настройки
  static async getSystemSetting(key: string): Promise<SystemSetting | null> {
    try {
      if (!supabase) {
        console.warn('[ContentManager] Supabase недоступен, системная настройка не получена.');
        return null;
      }
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('setting_key', key)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching system setting:', error);
        return null;
      }

      return data as unknown as SystemSetting | null;
    } catch (error) {
      console.error('Exception fetching system setting:', error);
      return null;
    }
  }

  // Обновление AI промпта
  static async updateAIPrompt(name: string, content: string, description?: string): Promise<boolean> {
    try {
      if (!supabase) {
        console.warn('[ContentManager] Supabase недоступен, обновление промпта пропущено.');
        return false;
      }
      const { error } = await (supabase as any)
        .from('ai_prompts')
        .update({
          content,
          description,
          updated_at: new Date().toISOString()
        })
        .eq('name', name);

      if (error) {
        console.error('Error updating AI prompt:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Exception updating AI prompt:', error);
      return false;
    }
  }

  // Обновление системной настройки
  static async updateSystemSetting(key: string, value: JsonRecord): Promise<boolean> {
    try {
      if (!supabase) {
        console.warn('[ContentManager] Supabase недоступен, обновление настройки пропущено.');
        return false;
      }
      const { error } = await supabase
        .from('system_settings')
        .update({
          setting_value: value,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', key);

      if (error) {
        console.error('Error updating system setting:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Exception updating system setting:', error);
      return false;
    }
  }

  // Подстановка переменных в шаблон
  static replaceVariables(template: string, variables: JsonRecord): string {
    let result = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key}}`;
      const replacement = value == null ? '' : String(value);
      result = result.replace(new RegExp(placeholder, 'g'), replacement);
    }
    
    return result;
  }

  // Получение полного AI промпта с контекстом
  static async getFullAIPrompt(
    basePromptName: string = 'main_ai_prompt',
    additionalContext?: string
  ): Promise<string> {
    try {
      const basePrompt = await this.getAIPrompt(basePromptName);
      
      if (!basePrompt) {
        console.error('Base AI prompt not found:', basePromptName);
        return FALLBACK_PROMPT.content;
      }

      let fullPrompt = basePrompt.content;

      // Добавляем дополнительный контекст
      if (additionalContext) {
        fullPrompt += `\n\n${additionalContext}`;
      }

      // Добавляем системные настройки
      const aiSettings = await this.getSystemSetting('ai_settings');
      if (aiSettings) {
        fullPrompt += `\n\nНастройки AI: ${JSON.stringify(aiSettings.setting_value)}`;
      }

      return fullPrompt;
    } catch (error) {
      console.error('Exception getting full AI prompt:', error);
      return '';
    }
  }

  // Получение сообщения напоминания с подстановкой переменных
  static async getReminderMessage(
    scenarioName: string,
    variables: JsonRecord = {}
  ): Promise<string | null> {
    try {
      if (!supabase) {
        console.warn('[ContentManager] Supabase недоступен, сообщение напоминания не получено.');
        return null;
      }
      const { data, error } = await supabase
        .from('reminder_scenarios')
        .select('*')
        .eq('name', scenarioName)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        console.error('Reminder scenario not found:', scenarioName);
        return null;
      }

      const scenario = data as unknown as ReminderScenario;
      return this.replaceVariables(scenario.message_template, variables);
    } catch (error) {
      console.error('Exception getting reminder message:', error);
      return null;
    }
  }

  // Получение сообщения геймификации
  static async getGamificationMessage(
    ruleName: string,
    variables: JsonRecord = {}
  ): Promise<string | null> {
    try {
      if (!supabase) {
        console.warn('[ContentManager] Supabase недоступен, сообщение геймификации не получено.');
        return null;
      }
      const { data, error } = await supabase
        .from('gamification_rules')
        .select('*')
        .eq('name', ruleName)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        console.error('Gamification rule not found:', ruleName);
        return null;
      }

      const rule = data as unknown as GamificationRule;
      return this.replaceVariables(rule.message_template, variables);
    } catch (error) {
      console.error('Exception getting gamification message:', error);
      return null;
    }
  }
}
