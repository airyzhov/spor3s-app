// Открыть внешнюю ссылку из Telegram Mini App.
// window.open() внутри WebView Telegram часто не открывает отдельное окно —
// Telegram.WebApp.openLink() гарантированно выводит ссылку в системный браузер.
export function openExternal(url: string): void {
  if (typeof window === 'undefined') return;
  const webApp = window.Telegram?.WebApp;
  if (webApp?.openLink) {
    webApp.openLink(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
