/**
 * @jest-environment node
 */
import { aiEndpoint, AI_GREETING } from '../aiConsultant';

// ИИ-консультант: ключ OpenRouter (sk-or-…) раньше уходил на api.openai.com → 401 на каждое
// сообщение, и бот отвечал заготовкой. Провайдер выбирается по ключу, модель — через AI_MODEL.

describe('aiEndpoint', () => {
  it('ключ OpenRouter — на OpenRouter, модель в его формате', () => {
    expect(aiEndpoint('sk-or-v1-abc')).toEqual({
      provider: 'openrouter',
      url: 'https://openrouter.ai/api/v1/chat/completions',
      model: 'openai/gpt-4o-mini',
    });
  });

  it('ключ OpenAI — на OpenAI', () => {
    expect(aiEndpoint('sk-proj-abc')).toEqual({
      provider: 'openai',
      url: 'https://api.openai.com/v1/chat/completions',
      model: 'gpt-4o-mini',
    });
  });

  it('модель можно задать через AI_MODEL', () => {
    expect(aiEndpoint('sk-or-v1-abc', 'meta-llama/llama-3.3-70b-instruct:free').model).toBe('meta-llama/llama-3.3-70b-instruct:free');
    expect(aiEndpoint('sk-or-v1-abc', '  ').model).toBe('openai/gpt-4o-mini');
  });
});

it('приветствие-заготовка — без звёздочек Markdown и без ссылки на чат с ботом', () => {
  expect(AI_GREETING).not.toMatch(/\*\*/);
  expect(AI_GREETING).not.toMatch(/t\.me\//);
  expect(AI_GREETING).toMatch(/Ежовик[\s\S]*Мухомор[\s\S]*Кордицепс[\s\S]*Цистозира/);
});
