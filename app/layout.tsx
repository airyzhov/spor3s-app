
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spor3s - Грибные добавки",
  description: "Натуральные грибные добавки для здоровья и благополучия",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <head>
        <meta charSet="utf-8" />
        {/* Telegram WebApp SDK — defer (не async), чтобы SDK был готов до гидрации React.
            Раздаём СВОЮ копию (public/telegram-web-app.js), а не с telegram.org: из части
            российских сетей telegram.org недоступен, зависший <script> держит событие load
            минуты, Telegram всё это время показывает заглушку, а пользователь потом проваливается
            в гостя без SC и рефералки. Наш домен идёт через Cloudflare, который из РФ отвечает.
            Обновление SDK: скачать https://telegram.org/js/telegram-web-app.js в public/
            и поднять ?v= — файл отдаётся с кешем на год (см. headers() в next.config.js). */}
        <script src="/telegram-web-app.js?v=20260902" defer></script>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}