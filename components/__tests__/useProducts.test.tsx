import { renderHook, act } from '@testing-library/react';
import { useProducts } from '../useProducts';

// Мокаем supabase
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        data: [
          { id: 'test1', name: 'Product 1', price: 100 },
          { id: 'test2', name: 'Product 2', price: 200 },
        ],
        error: null,
      })),
    })),
  },
}));

describe('useProducts', () => {
  it('должен загружать товары без ошибок', async () => {
    const { result } = renderHook(() => useProducts());
    // Ждем окончания загрузки
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(result.current.products.length).toBe(2);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });
}); 