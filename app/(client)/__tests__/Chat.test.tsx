import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Chat from '../chat';

// Мокаем зависимости
jest.mock('../../CartContext', () => ({
  useCart: () => ({
    addToCart: jest.fn(),
    setModalProduct: jest.fn(),
    setStep: jest.fn(),
    cart: []
  })
}));

jest.mock('../../../hooks/useProducts', () => ({
  useProducts: () => ({
    products: [
      { id: 'ezh100', name: 'Ежовик 100мг', price: 1500 },
      { id: 'mhm50', name: 'МХМ 50мг', price: 2000 }
    ]
  })
}));

jest.mock('../../../hooks/useSupabaseUser', () => ({
  useSupabaseUser: () => 'test-user-id'
}));

jest.mock('../../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({ data: [] }))
        }))
      })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null }))
    }))
  }
}));

// Мокаем fetch для API вызовов
global.fetch = jest.fn();

describe('Chat Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ reply: 'Тестовый ответ от ИИ' })
    });
  });

  test('рендерится корректно', () => {
    render(<Chat />);
    
    expect(screen.getByPlaceholderText('')).toBeInTheDocument();
    expect(screen.getByText('Отправить')).toBeInTheDocument();
    expect(screen.getByText('Задай вопрос Спорсам по добавкам или заказу…')).toBeInTheDocument();
  });

  test('отправляет сообщение', async () => {
    render(<Chat />);
    
    const input = screen.getByPlaceholderText('');
    const sendButton = screen.getByText('Отправить');
    
    fireEvent.change(input, { target: { value: 'Привет, как дела?' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('Привет, как дела?')
      });
    });
  });

  test('показывает сообщения пользователя и ИИ', async () => {
    render(<Chat />);
    
    const input = screen.getByPlaceholderText('');
    const sendButton = screen.getByText('Отправить');
    
    fireEvent.change(input, { target: { value: 'Тестовое сообщение' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(screen.getByText('Тестовое сообщение')).toBeInTheDocument();
    });
  });

  test('обрабатывает кнопки действий в ответе ИИ', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ 
        reply: 'Вот продукт для вас [add_to_cart:ezh100] [show_info:mhm50]' 
      })
    });

    render(<Chat />);
    
    const input = screen.getByPlaceholderText('');
    const sendButton = screen.getByText('Отправить');
    
    fireEvent.change(input, { target: { value: 'Покажи продукты' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(screen.getByText('Добавить в корзину: Ежовик 100мг')).toBeInTheDocument();
      expect(screen.getByText('Подробнее: МХМ 50мг')).toBeInTheDocument();
    });
  });

  test('не отправляет пустое сообщение', () => {
    render(<Chat />);
    
    const sendButton = screen.getByText('Отправить');
    expect(sendButton).toBeDisabled();
  });

  test('показывает индикатор загрузки', async () => {
    (global.fetch as jest.Mock).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        json: () => Promise.resolve({ reply: 'Ответ' })
      }), 100))
    );

    render(<Chat />);
    
    const input = screen.getByPlaceholderText('');
    const sendButton = screen.getByText('Отправить');
    
    fireEvent.change(input, { target: { value: 'Тест' } });
    fireEvent.click(sendButton);
    
    expect(screen.getByText('...')).toBeInTheDocument();
  });

  test('обрабатывает ошибки API', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'));

    render(<Chat />);
    
    const input = screen.getByPlaceholderText('');
    const sendButton = screen.getByText('Отправить');
    
    fireEvent.change(input, { target: { value: 'Тест ошибки' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(screen.getByText('Ошибка ответа от ИИ.')).toBeInTheDocument();
    });
  });
}); 