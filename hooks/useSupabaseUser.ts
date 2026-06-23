import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export const useSupabaseUser = () => {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      // Реальный Telegram init
      const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
      let telegramId = telegramUser?.id?.toString();

      // Mock для разработки (если не в Telegram)
      if (!telegramId && process.env.NODE_ENV === 'development') {
        telegramId = 'mock-telegram-id-123'; // Mock telegram_id
        console.log('🧪 DEV MOCK: Используем mock telegram_id для теста');
      }

      if (!telegramId) {
        console.error('Ошибка: Нет telegram_id. Запустите в Telegram Mini App.');
        return;
      }

      // Вызов API для init-user
      try {
        console.log('[useSupabaseUser] Starting fetch to /api/init-user with telegramId:', telegramId);
        const response = await fetch('/api/init-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telegram_id: telegramId }),
        });
        console.log('[useSupabaseUser] Fetch response status:', response.status);
        const data = await response.json();
        console.log('[useSupabaseUser] Fetch data:', data);
        if (data.id) {
          setUserId(data.id);
          console.log('✅ UserId инициализирован:', data.id);
        } else {
          console.error('Ошибка init-user:', data.error);
        }
      } catch (error) {
        console.error('Ошибка при init-user:', error);
      }
    };

    getUser();
  }, []);

  return userId;
}; 