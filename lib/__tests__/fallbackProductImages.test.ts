/**
 * @jest-environment node
 */
import fs from 'fs';
import path from 'path';

// Запасной список товаров в app/api/products/route.ts витрина показывает, когда база недоступна.
// Его картинки должны лежать в public/products с точным совпадением регистра: на сервере Linux,
// и «.JPG» ≠ «.jpg» — локально на Windows такая ошибка не видна.
const ROOT = path.resolve(__dirname, '../..');

it('все картинки запасного списка товаров лежат в public/products', () => {
  const src = fs.readFileSync(path.join(ROOT, 'app/api/products/route.ts'), 'utf8');
  const images = Array.from(src.matchAll(/image:\s*['"]\/products\/([^'"]+)['"]/g), (m) => m[1]);
  expect(images.length).toBeGreaterThan(0);

  const files = new Set(fs.readdirSync(path.join(ROOT, 'public/products')));
  expect(images.filter((name) => !files.has(name))).toEqual([]);
});
