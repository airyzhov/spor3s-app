import { useEffect, useState } from 'react';

export type TelegramUser = {
  telegram_id: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
};

export function useTelegramUser(): TelegramUser | null {
  const [user, setUser] = useState<TelegramUser | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe?.user) {
      const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
      setUser({
        telegram_id: tgUser.id?.toString() || '',
        first_name: tgUser.first_name,
        last_name: tgUser.last_name,
        username: tgUser.username,
        photo_url: (tgUser as any).photo_url,
      });
    }
  }, []);

  return user;
} 