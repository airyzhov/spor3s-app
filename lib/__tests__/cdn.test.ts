/**
 * @jest-environment jsdom
 */
import { assetUrl, cdnFallbackScript } from '../cdn';

// С обычных адресов Cloudflare часть российских сетей отдает на соединение только ~25 КБ:
// HTML и API проходят, а JS-чанки и картинки зависают. Поэтому статика собирается с префиксом
// jsDelivr, а если он недоступен, браузер должен вернуться на наш домен.

const PREFIX = 'https://cdn.jsdelivr.net/gh/o/r@cdn-1';

describe('assetUrl', () => {
  it('без префикса возвращает путь как есть', () => {
    expect(assetUrl('/products/ezh100.jpg', '')).toBe('/products/ezh100.jpg');
  });

  it('с префиксом ведет путь нашего домена на CDN', () => {
    expect(assetUrl('/products/ezh100.jpg', PREFIX)).toBe(`${PREFIX}/products/ezh100.jpg`);
  });

  it('не трогает внешние адреса и пустые значения', () => {
    expect(assetUrl('https://x.ru/a.jpg', PREFIX)).toBe('https://x.ru/a.jpg');
    expect(assetUrl('//x.ru/a.jpg', PREFIX)).toBe('//x.ru/a.jpg');
    expect(assetUrl('', PREFIX)).toBe('');
    expect(assetUrl(undefined, PREFIX)).toBe('');
  });
});

describe('cdnFallbackScript', () => {
  function run() {
    // eslint-disable-next-line no-new-func
    new Function(cdnFallbackScript(PREFIX))();
  }
  function fail(el: Element) {
    el.dispatchEvent(new Event('error'));
  }

  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  it('упавший с CDN скрипт подключает заново с нашего домена', () => {
    run();
    const s = document.createElement('script');
    s.setAttribute('src', `${PREFIX}/_next/static/chunks/a.js`);
    document.head.appendChild(s);
    fail(s);
    const srcs = Array.from(document.scripts).map((x) => x.getAttribute('src'));
    expect(srcs).toEqual(['/_next/static/chunks/a.js']);
  });

  it('упавшим стилям и картинкам меняет адрес на наш домен', () => {
    run();
    const l = document.createElement('link');
    l.setAttribute('rel', 'stylesheet');
    l.setAttribute('href', `${PREFIX}/_next/static/css/a.css`);
    const i = document.createElement('img');
    i.setAttribute('src', `${PREFIX}/products/a.jpg`);
    document.body.append(l, i);
    fail(l);
    fail(i);
    expect(l.getAttribute('href')).toBe('/_next/static/css/a.css');
    expect(i.getAttribute('src')).toBe('/products/a.jpg');
  });

  it('не трогает файлы не с CDN', () => {
    run();
    const i = document.createElement('img');
    i.setAttribute('src', '/products/a.jpg');
    document.body.appendChild(i);
    fail(i);
    expect(i.getAttribute('src')).toBe('/products/a.jpg');
  });
});
