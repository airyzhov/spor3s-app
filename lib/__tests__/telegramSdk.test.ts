/** @jest-environment node */
import fs from 'fs';
import path from 'path';

// Страховка от регрессии: страница не должна зависеть от telegram.org при загрузке.
// Из части российских сетей telegram.org недоступен (проверено 2026-09-02 с узла в Москве:
// 3 из 3 попыток — Connection timed out), при этом наш домен через Cloudflare отвечает.
// Зависший <script defer> на telegram.org держит событие load минуты, и Telegram всё это
// время показывает свою заглушку вместо приложения, а пользователь проваливается в гостя.
// Поэтому SDK раздаём сами из public/, через тот же Cloudflare, что и всё остальное.

const root = path.join(__dirname, '..', '..');
const layout = fs.readFileSync(path.join(root, 'app', 'layout.tsx'), 'utf8');

describe('Telegram WebApp SDK', () => {
  it('layout не подключает SDK с telegram.org', () => {
    // Именно тег <script>, а не любое упоминание: в комментарии рядом лежит ссылка для обновления.
    expect(layout).not.toMatch(/<script[^>]*src="https?:\/\/telegram\.org\//);
  });

  it('layout подключает SDK со своего домена, с версией для сброса кеша', () => {
    expect(layout).toMatch(/<script src="\/telegram-web-app\.js\?v=\d{8}" defer><\/script>/);
  });

  it('файл SDK лежит в public/ и объявляет window.Telegram.WebApp', () => {
    const sdkPath = path.join(root, 'public', 'telegram-web-app.js');
    expect(fs.existsSync(sdkPath)).toBe(true);
    const sdk = fs.readFileSync(sdkPath, 'utf8');
    expect(sdk.length).toBeGreaterThan(50_000);
    expect(sdk).toMatch(/window\.Telegram/);
    expect(sdk).toMatch(/WebApp/);
  });
});
