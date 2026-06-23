import { NextRequest } from 'next/server';
import { POST } from '../../app/api/ai/route';

// Мокаем зависимости
jest.mock('../../app/supabaseServerHelpers', () => ({
  searchInstructionsServer: jest.fn(() => Promise.resolve([])),
  getUserOrdersServer: jest.fn(() => Promise.resolve([])),
  getUserMessagesServer: jest.fn(() => Promise.resolve([])),
  getUserSurveysServer: jest.fn(() => Promise.resolve([]))
}));

// Мокаем fetch для OpenRouter API
global.fetch = jest.fn();

describe('AI API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OR_TOKEN = 'test-token';
  });

  afterEach(() => {
    delete process.env.OR_TOKEN;
  });

  test('возвращает ошибку если нет OR_TOKEN', async () => {
    delete process.env.OR_TOKEN;
    
    const req = new NextRequest('http://localhost/api/ai', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Привет' }],
        user_id: 'test-user'
      })
    });

    const response = await POST(req);
    const data = await response.json();

    expect(data.reply).toBe('OpenRouter токен не найден.');
    expect(response.status).toBe(500);
  });

  test('отправляет запрос к OpenRouter API', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        choices: [{
          message: { content: 'Тестовый ответ от ИИ' },
          finish_reason: 'stop'
        }]
      })
    });

    const req = new NextRequest('http://localhost/api/ai', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Привет' }],
        user_id: 'test-user'
      })
    });

    const response = await POST(req);
    const data = await response.json();

    expect(global.fetch).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json'
        },
        body: expect.stringContaining('openai/gpt-4o-mini')
      })
    );

    expect(data.reply).toBe('Тестовый ответ от ИИ');
  });

  test('обрабатывает ошибки OpenRouter API', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'));

    const req = new NextRequest('http://localhost/api/ai', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Привет' }],
        user_id: 'test-user'
      })
    });

    const response = await POST(req);
    const data = await response.json();

    expect(data.reply).toBe('Извините, не удалось получить ответ.');
  });

  test('обрабатывает пустой ответ от OpenRouter', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        choices: []
      })
    });

    const req = new NextRequest('http://localhost/api/ai', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Привет' }],
        user_id: 'test-user'
      })
    });

    const response = await POST(req);
    const data = await response.json();

    expect(data.reply).toBe('Извините, не удалось получить ответ.');
  });

  test('включает инструкции в промпт', async () => {
    const { searchInstructionsServer } = require('../../app/supabaseServerHelpers');
    searchInstructionsServer.mockResolvedValue([
      { title: 'Инструкция 1', content: 'Содержание 1' },
      { title: 'Инструкция 2', content: 'Содержание 2', url: 'https://example.com' }
    ]);

    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        choices: [{
          message: { content: 'Ответ с инструкциями' },
          finish_reason: 'stop'
        }]
      })
    });

    const req = new NextRequest('http://localhost/api/ai', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Как принимать добавки?' }],
        user_id: 'test-user'
      })
    });

    await POST(req);

    expect(searchInstructionsServer).toHaveBeenCalledWith('Как принимать добавки?');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/chat/completions',
      expect.objectContaining({
        body: expect.stringContaining('Справочная информация по вашему вопросу')
      })
    );
  });

  test('включает информацию о пользователе в промпт', async () => {
    const { getUserOrdersServer, getUserMessagesServer, getUserSurveysServer } = require('../../app/supabaseServerHelpers');
    getUserOrdersServer.mockResolvedValue([
      { items: ['ezh100'], total: 1500, created_at: '2024-01-01' }
    ]);
    getUserMessagesServer.mockResolvedValue([
      { content: 'Первое сообщение' },
      { content: 'Второе сообщение' }
    ]);
    getUserSurveysServer.mockResolvedValue([
      { question: 'Цель', answer: 'Здоровье' }
    ]);

    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        choices: [{
          message: { content: 'Персонализированный ответ' },
          finish_reason: 'stop'
        }]
      })
    });

    const req = new NextRequest('http://localhost/api/ai', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Привет' }],
        user_id: 'test-user'
      })
    });

    await POST(req);

    expect(getUserOrdersServer).toHaveBeenCalledWith('test-user');
    expect(getUserMessagesServer).toHaveBeenCalledWith('test-user');
    expect(getUserSurveysServer).toHaveBeenCalledWith('test-user');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/chat/completions',
      expect.objectContaining({
        body: expect.stringContaining('[Память по пользователю]')
      })
    );
  });
}); 