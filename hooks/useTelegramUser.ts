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
    if (typeof window === 'undefined') return;
    let cancelled = false;
    let tries = 0;

    const tryInit = () => {
      if (cancelled) return;
      const wa = (window as any).Telegram?.WebApp;
      if (wa) {
        // Сообщаем Telegram, что приложение готово, и разворачиваем на весь экран
        try { wa.ready?.(); } catch {}
        try { wa.expand?.(); } catch {}
        const tgUser = wa.initDataUnsafe?.user;
        if (tgUser) {
          setUser({
            telegram_id: tgUser.id?.toString() || '',
            first_name: tgUser.first_name,
            last_name: tgUser.last_name,
            username: tgUser.username,
            photo_url: tgUser.photo_url,
          });
          return; // данные получены — опрос больше не нужен
        }
      }
      // SDK ещё не загрузился (defer/медленная сеть) — опрашиваем до ~3с
      if (tries++ < 15) {
        setTimeout(tryInit, 200);
      }
    };

    tryInit();
    return () => { cancelled = true; };
  }, []);

  return user;
} 