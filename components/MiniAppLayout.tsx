"use client";
import { useEffect } from 'react';

export default function MiniAppLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.ready?.();
      // Включаем тёмную тему
      window.Telegram.WebApp.setHeaderColor && window.Telegram.WebApp.setHeaderColor('#18181b');
      window.Telegram.WebApp.setBackgroundColor && window.Telegram.WebApp.setBackgroundColor('#18181b');
      window.Telegram.WebApp.themeParams = {
        bg_color: '#18181b',
        text_color: '#fff',
        hint_color: '#aaa',
        link_color: '#ff00cc',
        button_color: '#ff00cc',
        button_text_color: '#fff',
      };
    }
  }, []);

  return <div>{children}</div>;
} 