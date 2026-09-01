// Инлайновая страховка загрузки (подключается в app/layout.tsx в конце <body>).
//
// SSR-оболочка приложения — это и есть экран «⏳ Загрузка...» (#app-loading в AppClient.tsx):
// если JS-чанки не доехали, человек сидит на нём вечно, без сообщения, кнопки и следа в логах.
// Скрипт от чанков не зависит. Что делает:
//   1. По DOMContentLoaded просит Telegram убрать свою заглушку (WebApp.ready), чтобы человек
//      видел нашу страницу, а не спиннер Телеграма — SDK лежит на нашем домене и к этому
//      моменту уже выполнен (defer).
//   2. Если через LOADING_FAILSAFE_MS экран загрузки всё ещё в DOM (React не смонтировался):
//      показывает сообщение с кнопкой «Обновить» и шлёт маячок в /api/nohydrate — nginx
//      залогирует его вместе с User-Agent: grep nohydrate /var/log/nginx/access.log.
//
// Держать в ES5 без внешних зависимостей: выполняется в любом WebView как есть.

export const LOADING_FAILSAFE_MS = 12000;

export const LOADING_FAILSAFE_SCRIPT = `
(function () {
  function telegramReady() {
    try {
      if (window.Telegram && window.Telegram.WebApp) { window.Telegram.WebApp.ready(); return 1; }
    } catch (e) {}
    return 0;
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', telegramReady, false);
  } else {
    telegramReady();
  }
  setTimeout(function () {
    var box = document.getElementById('app-loading');
    if (!box) return;
    var tg = telegramReady();
    var waited = 0;
    try { waited = Math.round(performance.now() / 1000); } catch (e) {}
    try {
      fetch('/api/nohydrate?t=' + waited + '&rs=' + document.readyState + '&tg=' + tg,
        { cache: 'no-store', keepalive: true }).catch(function () {});
    } catch (e) {}
    box.innerHTML =
      '<div style="font-size:24px;margin-bottom:15px">\\u26A0\\uFE0F</div>' +
      '<div style="margin-bottom:8px;font-weight:700">Не удалось загрузить приложение</div>' +
      '<div style="font-size:13px;color:#ccc;margin-bottom:18px">Проверьте интернет или VPN и попробуйте ещё раз</div>' +
      '<button type="button" style="background:linear-gradient(45deg,#ff00cc,#3333ff);color:#fff;border:none;border-radius:10px;padding:10px 18px;font-size:14px;font-weight:700;cursor:pointer">Обновить</button>';
    var btn = box.querySelector('button');
    if (btn) btn.onclick = function () { location.reload(); };
  }, ${LOADING_FAILSAFE_MS});
})();
`;
