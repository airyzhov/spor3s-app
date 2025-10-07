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
  content: `Ты — AI-ассистент spor3s. Помогаешь пользователю подобрать и купить функциональные грибные добавки.

Правила:
• Используй дружелюбный тон и говори на «ты».
• Если пользователь просит добавить товар, возвращай тег вида [add_to_cart:PRODUCT_ID].
• Если просят удалить — [remove_from_cart:PRODUCT_ID].
• Для внешних каналов напоминай оформить заказ через приложение spor3s.
• Если данных нет, честно скажи об этом и предложи помощь.
• Никогда не придумывай цены — используй переданные или скажи, что уточняешь.
`,
  version: 1,
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
  name: string;
  rule_type: 'checkin' | 'survey' | 'order' | 'referral' | 'level_up';
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
      const { error } = await supabase
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
