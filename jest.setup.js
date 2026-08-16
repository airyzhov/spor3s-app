import '@testing-library/jest-dom';

// Мокаем window.Telegram для тестирования
// (только в jsdom-окружении: тесты с /** @jest-environment node */ не имеют window)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'Telegram', {
    value: {
      WebApp: {
        initDataUnsafe: {
          user: {
            id: 123456789,
            first_name: 'Test',
            last_name: 'User',
            username: 'testuser'
          }
        },
        ready: jest.fn(),
        expand: jest.fn(),
        close: jest.fn()
      }
    },
    writable: true
  });
}

// Мокаем ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Мокаем IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
})); 