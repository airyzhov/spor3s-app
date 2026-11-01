// Статика через jsDelivr. С обычных адресов Cloudflare часть российских сетей отдает на одно
// соединение только ~25 КБ: HTML и API проходят, а JS-чанки и картинки зависают, приложение
// остается на экране загрузки. Префикс задается при сборке (CDN_PREFIX в next.config.js,
// см. .github/workflows/deploy.yml). Без него все работает с нашего домена, как раньше.

export const CDN_PREFIX = process.env.NEXT_PUBLIC_CDN_PREFIX || '';

export function assetUrl(path: string | undefined | null, prefix: string = CDN_PREFIX): string {
  if (!path) return '';
  if (!prefix || !path.startsWith('/') || path.startsWith('//')) return path;
  return prefix + path;
}

// Инлайновая страховка: если файл с CDN не загрузился, берем его с нашего домена.
// Подключается в <head> до чанков. Держать в ES5, как lib/loadingFailsafe.ts.
export function cdnFallbackScript(prefix: string): string {
  return `
(function () {
  var prefix = ${JSON.stringify(prefix)};
  window.addEventListener('error', function (e) {
    var el = e.target;
    if (!el || !el.getAttribute) return;
    var attr = el.tagName === 'LINK' ? 'href' : 'src';
    var url = el.getAttribute(attr);
    if (!url || url.indexOf(prefix) !== 0) return;
    var local = url.slice(prefix.length);
    if (el.tagName === 'SCRIPT') {
      var s = document.createElement('script');
      s.src = local;
      s.async = false;
      el.parentNode.insertBefore(s, el);
      el.parentNode.removeChild(el);
    } else {
      el.setAttribute(attr, local);
    }
  }, true);
})();
`;
}
