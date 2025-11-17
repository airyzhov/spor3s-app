// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { searchInstructionsServer, getUserOrdersServer, getUserMessagesServer, getUserSurveysServer, getProductsServer, saveMessageServer, getUserProfileServer } from "../../supabaseServerHelpers";
import { supabaseServer } from "../../supabaseServerClient";
import { scenariosPrompt } from "../../ai/scenarios";
import { ContentManager } from "../../../lib/contentManager";

// Загружаем переменные окружения из .env.local для production
const loadEnvLocal = () => {
  if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.length > 20) {
    return; // Уже загружен
  }
  
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Пробуем разные пути
    const possiblePaths = [
      path.join(process.cwd(), '.env.local'),
      path.join('/var/www/spor3s-app/spor3s-app', '.env.local'),
      path.join(process.cwd(), '..', '.env.local'),
      '.env.local'
    ];
    
    for (const envLocalPath of possiblePaths) {
      if (fs.existsSync(envLocalPath)) {
        const envContent = fs.readFileSync(envLocalPath, 'utf8');
        const lines = envContent.split('\n');
        for (const line of lines) {
          const match = line.match(/^OPENROUTER_API_KEY=(.+)$/);
          if (match) {
            const key = match[1].trim();
            if (key && key.length > 20) {
              process.env.OPENROUTER_API_KEY = key;
              console.log(`[AI API] ✅ OPENROUTER_API_KEY загружен из ${envLocalPath} (длина: ${key.length})`);
              return;
            }
          }
        }
      }
    }
    console.error('[AI API] ⚠️ .env.local не найден или не содержит OPENROUTER_API_KEY');
  } catch (error) {
    console.error('[AI API] ⚠️ Ошибка загрузки .env.local:', error);
  }
};

// Загружаем при инициализации модуля
loadEnvLocal();

const PRODUCT_VARIANTS = {
  ezh: {
    label: 'Ежовик',
    powder: {
      1: { tag: 'ezh100', name: 'Ежовик 100г порошок', price: 1100 },
      3: { tag: 'ezh300', name: 'Ежовик 300г порошок', price: 3000 },
    },
    capsules: {
      1: { tag: 'ezh120k', name: 'Ежовик 120 капсул', price: 1100 },
      3: { tag: 'ezh360k', name: 'Ежовик 360 капсул', price: 3000 },
    },
  },
  mhm: {
    label: 'Мухомор',
    powder: {
      1: { tag: 'mhm30', name: 'Мухомор 30г (шляпки)', price: 1400 },
      3: { tag: 'mhm100', name: 'Мухомор 100г (шляпки)', price: 1800 },
    },
    capsules: {
      1: { tag: 'mhm60k', name: 'Мухомор 60 капсул', price: 1400 },
      3: { tag: 'mhm180k', name: 'Мухомор 180 капсул', price: 1800 },
    },
  },
  kor: {
    label: 'Кордицепс',
    powder: {
      1: { tag: 'kor50', name: 'Кордицепс 50г', price: 800 },
      3: { tag: 'kor150', name: 'Кордицепс 150г', price: 2000 },
    },
  },
  ci: {
    label: 'Цистозира',
    powder: {
      1: { tag: 'ci30', name: 'Цистозира 30г', price: 500 },
      3: { tag: 'ci90', name: 'Цистозира 90г', price: 1350 },
    },
  },
  combo: {
    label: 'Курс 4 в 1',
    bundle: {
      1: { tag: '4v1', name: '4 в 1 (1 месяц)', price: 3300 },
      3: { tag: '4v1-3', name: '4 в 1 (3 месяца)', price: 9000 },
      6: { tag: '4v1-6', name: '4 в 1 (6 месяцев)', price: 15000 },
    },
  },
};

function forceAddToCartTag(text) {
  const productMap = [
         // Ежовик
     { keyword: /ежовик.*500.*г/i, id: 'ezh500' },
     { keyword: /ежовик.*500/i, id: 'ezh500' },
     { keyword: /ежовик.*300.*г/i, id: 'ezh300' },
     { keyword: /ежовик.*300/i, id: 'ezh300' },
     { keyword: /ежовик.*360.*капсул/i, id: 'ezh360k' },
     { keyword: /ежовик.*360/i, id: 'ezh360k' },
     { keyword: /ежовик.*100.*порошк/i, id: 'ezh100' },
     { keyword: /ежовик.*120.*капсул/i, id: 'ezh120k' },
     { keyword: /ежовик.*порошк/i, id: 'ezh100' },
     { keyword: /ежовик.*капсул/i, id: 'ezh120k' },
     // КРИТИЧНО: Убрали fallback /ежовик/i - если форма не указана, не добавляем автоматически!
    
         // Мухомор
     { keyword: /мухомор.*180.*капсул/i, id: 'mhm180k' },
     { keyword: /мухомор.*180/i, id: 'mhm180k' },
     { keyword: /мухомор.*60.*капсул/i, id: 'mhm60k' },
     { keyword: /мухомор.*60/i, id: 'mhm60k' },
     { keyword: /мухомор.*100.*г/i, id: 'mhm100' },
     { keyword: /мухомор.*50.*г/i, id: 'mhm50' },
     { keyword: /мухомор.*30.*г/i, id: 'mhm30' },
     { keyword: /мухомор.*100/i, id: 'mhm100' },
     { keyword: /мухомор.*50/i, id: 'mhm50' },
     { keyword: /мухомор.*30/i, id: 'mhm30' },
     { keyword: /мухомор.*капсул/i, id: 'mhm60k' },
     { keyword: /мухомор.*шляпк/i, id: 'mhm30' },
     // Убрали fallback - если форма не указана, не добавляем автоматически
    
         // Кордицепс
     { keyword: /кордицепс.*150.*г/i, id: 'kor150' },
     { keyword: /кордицепс.*150/i, id: 'kor150' },
     { keyword: /кордицепс.*50.*г/i, id: 'kor50' },
     { keyword: /кордицепс.*50/i, id: 'kor50' },
     { keyword: /кордицепс/i, id: 'kor50' },
    
    // Цистозира
    { keyword: /цистозира.*90.*г/i, id: 'ci90' },
    { keyword: /цистозира.*90/i, id: 'ci90' },
    { keyword: /цистозира.*3.*месяц/i, id: 'ci90' },
    { keyword: /цистозира.*3.*мес/i, id: 'ci90' },
    { keyword: /цистозира.*30.*г/i, id: 'ci30' },
    { keyword: /цистозира.*30/i, id: 'ci30' },
    { keyword: /цистозира.*месяц/i, id: 'ci30' },
    { keyword: /цистозира.*мес/i, id: 'ci30' },
    { keyword: /цистозира/i, id: 'ci30' },
    
         // Комплексы
     { keyword: /4 ?в ?1.*6.*месяц/i, id: '4v1-6' },
     { keyword: /4 ?в ?1.*6/i, id: '4v1-6' },
     { keyword: /комплекс.*6.*месяц/i, id: '4v1-6' },
     { keyword: /комплекс.*6/i, id: '4v1-6' },
     { keyword: /4 ?в ?1.*3.*месяц/i, id: '4v1-3' },
     { keyword: /4 ?в ?1.*3/i, id: '4v1-3' },
     { keyword: /комплекс.*3.*месяц/i, id: '4v1-3' },
     { keyword: /комплекс.*3/i, id: '4v1-3' },
     { keyword: /4 ?в ?1.*месяц/i, id: '4v1' },
     { keyword: /4 ?в ?1/i, id: '4v1' },
     { keyword: /комплекс.*4.*1/i, id: '4v1' },
  ];
  let fixed = text;
  
  // Расширенное регулярное выражение для фраз о добавлении в корзину и оформлении заказа
  const hasAddToCartPhrase = /добавил.*в.*корзин/i.test(text) || 
                             /добавлен.*в.*корзин/i.test(text) ||
                             /добавляю.*в.*корзин/i.test(text) ||
                             /добавил.*кордицепс/i.test(text) ||
                             /добавил.*мухомор/i.test(text) ||
                             /добавил.*ежовик/i.test(text) ||
                             /добавил.*цистозира/i.test(text) ||
                             /добавил.*цистозиру/i.test(text) ||
                             /добавил.*комплекс/i.test(text) ||
                             /добавил.*4.*1/i.test(text) ||
                             /добавлен.*кордицепс/i.test(text) ||
                             /добавлен.*мухомор/i.test(text) ||
                             /добавлен.*ежовик/i.test(text) ||
                             /добавлен.*цистозира/i.test(text) ||
                             /добавлен.*цистозиру/i.test(text) ||
                             /добавлен.*комплекс/i.test(text) ||
                             /добавлен.*4.*1/i.test(text) ||
                             /положил.*в.*корзин/i.test(text) ||
                             /положил.*кордицепс/i.test(text) ||
                             /положил.*мухомор/i.test(text) ||
                             /положил.*ежовик/i.test(text) ||
                             /положил.*цистозира/i.test(text) ||
                             /положил.*цистозиру/i.test(text) ||
                             /положил.*комплекс/i.test(text) ||
                             /положил.*4.*1/i.test(text) ||
                             // Фразы оформления заказа
                             /оформи.*заказ/i.test(text) ||
                             /сделай.*заказ/i.test(text) ||
                             /закажи.*ежовик/i.test(text) ||
                             /закажи.*мухомор/i.test(text) ||
                             /закажи.*кордицепс/i.test(text) ||
                             /закажи.*цистозира/i.test(text) ||
                             /закажи.*комплекс/i.test(text) ||
                             /закажи.*4.*1/i.test(text) ||
                             /ежовик.*оформить/i.test(text) ||
                             /ежовик.*заказать/i.test(text) ||
                             /ежовик.*купить/i.test(text) ||
                             /мухомор.*оформить/i.test(text) ||
                             /мухомор.*заказать/i.test(text) ||
                             /мухомор.*купить/i.test(text) ||
                             /кордицепс.*оформить/i.test(text) ||
                             /кордицепс.*заказать/i.test(text) ||
                             /кордицепс.*купить/i.test(text) ||
                             /оформи.*заказ.*ежовик/i.test(text) ||
                             /оформи.*заказ.*мухомор/i.test(text) ||
                             /оформи.*заказ.*кордицепс/i.test(text) ||
                             /оформи.*заказ.*порошок/i.test(text) ||
                             /оформи.*заказ.*капсул/i.test(text) ||
                             /оформи.*заказ/i.test(text) ||
                             /отправь.*ежовик/i.test(text) ||
                             /отправь.*мухомор/i.test(text) ||
                             /отправь.*кордицепс/i.test(text) ||
                             /отправь.*цистозира/i.test(text) ||
                             /отправь.*комплекс/i.test(text) ||
                             /отправь.*4.*1/i.test(text) ||
                             /купи.*ежовик/i.test(text) ||
                             /купи.*мухомор/i.test(text) ||
                             /купи.*кордицепс/i.test(text) ||
                             /купи.*цистозира/i.test(text) ||
                             /купи.*комплекс/i.test(text) ||
                             /купи.*4.*1/i.test(text) ||
                             // Подтверждение заказа с адресом
                             /отлично.*заказ/i.test(text) ||
                             /ваш.*заказ/i.test(text) ||
                             /подтверждаю.*заказ/i.test(text) ||
                             /заказ.*оформлен/i.test(text) ||
                             // Новые фразы для добавления
                             /добавь.*ежовик/i.test(text) ||
                             /добавь.*мухомор/i.test(text) ||
                             /добавь.*кордицепс/i.test(text) ||
                             /добавь.*цистозира/i.test(text) ||
                             /добавь.*комплекс/i.test(text) ||
                             /добавь.*4.*1/i.test(text) ||
                             // Фразы с формой и сроком
                             /ежовик.*порошок.*месяц.*добавь/i.test(text) ||
                             /ежовик.*капсул.*месяц.*добавь/i.test(text) ||
                             /мухомор.*порошок.*месяц.*добавь/i.test(text) ||
                             /мухомор.*капсул.*месяц.*добавь/i.test(text) ||
                             /ежовик.*в.*порошке.*добавь/i.test(text) ||
                             /ежовик.*в.*капсулах.*добавь/i.test(text) ||
                             /мухомор.*в.*порошке.*добавь/i.test(text) ||
                             /мухомор.*в.*капсулах.*добавь/i.test(text);
  const hasAddToCartTag = /\[add_to_cart:([\w-]+)\]/.test(text);
  
  console.log('[AI API] forceAddToCartTag DEBUG:', {
    text: text.substring(0, 200) + '...',
    hasAddToCartPhrase,
    hasAddToCartTag,
    testResults: {
      test1: /добавил.*в.*корзин/i.test(text),
      test2: /добавлен.*в.*корзин/i.test(text),
      test3: /добавляю.*в.*корзин/i.test(text),
      test4: /добавил.*кордицепс/i.test(text),
      test5: /добавил.*мухомор/i.test(text),
      test6: /добавил.*ежовик/i.test(text),
      test7: /добавил.*цистозира/i.test(text),
      test8: /добавил.*комплекс/i.test(text),
      test9: /добавил.*4.*1/i.test(text),
      test10: /положил.*в.*корзин/i.test(text),
      test11: /положил.*кордицепс/i.test(text),
      test12: /положил.*мухомор/i.test(text),
      test13: /положил.*ежовик/i.test(text),
      test14: /положил.*цистозира/i.test(text),
      test15: /положил.*комплекс/i.test(text),
      test16: /положил.*4.*1/i.test(text)
    }
  });
  
  if (hasAddToCartPhrase && !hasAddToCartTag) {
    console.log('[AI API] Нужно добавить тег, ищем продукт...');
    let foundProduct = false;
    
    // Специальная логика для определения формы продукта
    const isPowder = /порошок|порошк/i.test(text);
    const isCapsules = /капсул|капсул/i.test(text);
    const isMonth = /месяц/i.test(text) && !/3.*месяц|три.*месяц/i.test(text);
    const isThreeMonths = /3.*месяц|три.*месяц|трех.*месяц/i.test(text);
    
    console.log('[AI API] Форма продукта:', { isPowder, isCapsules, isMonth, isThreeMonths });
    
    // Приоритетная обработка по форме и сроку
    if (/ежовик/i.test(text)) {
      // Проверяем вес (500г, 300г, 100г) - приоритет над сроком
      const has500g = /500|500г|500\s*гр/i.test(text);
      const has300g = /300|300г|300\s*гр/i.test(text);
      const has100g = /100|100г|100\s*гр/i.test(text);
      const has120caps = /120|120\s*капсул/i.test(text);
      const has360caps = /360|360\s*капсул/i.test(text);
      
      if (isPowder && has500g) {
        fixed += ` [add_to_cart:ezh500]`;
        console.log('[AI API] Добавлен тег для ежовик порошок 500г: ezh500');
        foundProduct = true;
      } else if (isPowder && has300g) {
        fixed += ` [add_to_cart:ezh300]`;
        console.log('[AI API] Добавлен тег для ежовик порошок 300г: ezh300');
        foundProduct = true;
      } else if (isPowder && has100g) {
        fixed += ` [add_to_cart:ezh100]`;
        console.log('[AI API] Добавлен тег для ежовик порошок 100г: ezh100');
        foundProduct = true;
      } else if (isCapsules && has360caps) {
        fixed += ` [add_to_cart:ezh360k]`;
        console.log('[AI API] Добавлен тег для ежовик капсулы 360: ezh360k');
        foundProduct = true;
      } else if (isCapsules && has120caps) {
        fixed += ` [add_to_cart:ezh120k]`;
        console.log('[AI API] Добавлен тег для ежовик капсулы 120: ezh120k');
        foundProduct = true;
      } else if (isPowder && isMonth) {
        fixed += ` [add_to_cart:ezh100]`;
        console.log('[AI API] Добавлен тег для ежовик порошок месяц: ezh100');
        foundProduct = true;
      } else if (isCapsules && isMonth) {
        fixed += ` [add_to_cart:ezh120k]`;
        console.log('[AI API] Добавлен тег для ежовик капсулы месяц: ezh120k');
        foundProduct = true;
      } else if (isPowder && isThreeMonths) {
        fixed += ` [add_to_cart:ezh300]`;
        console.log('[AI API] Добавлен тег для ежовик порошок 3 месяца: ezh300');
        foundProduct = true;
      } else if (isCapsules && isThreeMonths) {
        fixed += ` [add_to_cart:ezh360k]`;
        console.log('[AI API] Добавлен тег для ежовик капсулы 3 месяца: ezh360k');
        foundProduct = true;
      } else if (isPowder) {
        fixed += ` [add_to_cart:ezh100]`;
        console.log('[AI API] Добавлен тег для ежовик порошок: ezh100');
        foundProduct = true;
      } else if (isCapsules) {
        fixed += ` [add_to_cart:ezh120k]`;
        console.log('[AI API] Добавлен тег для ежовик капсулы: ezh120k');
        foundProduct = true;
      } else {
        // КРИТИЧНО: Если форма не указана - НЕ добавляем тег, чтобы агент спросил уточнение
        // НЕ используем fallback, который добавляет капсулы по умолчанию!
        console.log('[AI API] ⚠️ КРИТИЧНО: Форма ежовика не указана (порошок/капсулы), тег НЕ добавляется');
        foundProduct = false; // Не добавляем, пусть агент спросит
        // НЕ добавляем fallback тег - это критично!
      }
    } else if (/мухомор/i.test(text)) {
      if (isPowder && isMonth) {
        fixed += ` [add_to_cart:mhm30]`;
        console.log('[AI API] Добавлен тег для мухомор порошок месяц: mhm30');
        foundProduct = true;
      } else if (isCapsules && isMonth) {
        fixed += ` [add_to_cart:mhm60k]`;
        console.log('[AI API] Добавлен тег для мухомор капсулы месяц: mhm60k');
        foundProduct = true;
      } else if (isPowder && isThreeMonths) {
        fixed += ` [add_to_cart:mhm100]`;
        console.log('[AI API] Добавлен тег для мухомор порошок 3 месяца: mhm100');
        foundProduct = true;
      } else if (isCapsules && isThreeMonths) {
        fixed += ` [add_to_cart:mhm180k]`;
        console.log('[AI API] Добавлен тег для мухомор капсулы 3 месяца: mhm180k');
        foundProduct = true;
      } else if (isPowder) {
        fixed += ` [add_to_cart:mhm30]`;
        console.log('[AI API] Добавлен тег для мухомор порошок: mhm30');
        foundProduct = true;
      } else if (isCapsules) {
        fixed += ` [add_to_cart:mhm60k]`;
        console.log('[AI API] Добавлен тег для мухомор капсулы: mhm60k');
        foundProduct = true;
      } else {
        // Если форма не указана - НЕ добавляем тег, чтобы агент спросил уточнение
        console.log('[AI API] Форма мухомора не указана (порошок/капсулы), тег не добавляется');
        foundProduct = false; // Не добавляем, пусть агент спросит
      }
    }
    
    // Если не нашли по специальной логике, используем старую
    // НО КРИТИЧНО: не добавляем ежовик и мухомор без формы!
    if (!foundProduct) {
      for (const { keyword, id } of productMap) {
        // КРИТИЧНО: Проверяем, не ежовик ли это или мухомор без формы
        const isEzhOrMhm = id.startsWith('ezh') || id.startsWith('mhm');
        if (isEzhOrMhm && !isPowder && !isCapsules) {
          console.log(`[AI API] ⚠️ КРИТИЧНО: Пропускаем ${id} - форма не указана`);
          continue; // Пропускаем этот товар
        }
        
        const matches = keyword.test(text);
        console.log(`[AI API] Проверяем ${keyword}: ${matches} для ${id}`);
        if (matches) {
          fixed += ` [add_to_cart:${id}]`;
          console.log('[AI API] Добавлен тег:', id);
          foundProduct = true;
          break;
        }
      }
    }
    if (!foundProduct) {
      console.log('[AI API] Продукт не найден в тексте:', text);
      console.log('[AI API] Проверка формы перед fallback:', { isPowder, isCapsules });
      // Принудительно добавляем fallback теги
      // НО КРИТИЧНО: для ежовика и мухомора без формы - НЕ добавляем!
      if (/мухомор.*180|мухомор.*180.*капсул/i.test(text)) {
        fixed += ` [add_to_cart:mhm180k]`;
        console.log('[AI API] Добавлен fallback тег для мухомора 180 капсул: mhm180k');
      } else if (/мухомор.*60|мухомор.*60.*капсул/i.test(text) && (isCapsules || !isPowder)) {
        // Добавляем только если явно указаны капсулы или нет упоминания порошка
        fixed += ` [add_to_cart:mhm60k]`;
        console.log('[AI API] Добавлен fallback тег для мухомора 60 капсул: mhm60k');
      } else if (/мухомор.*100|мухомор.*100г/i.test(text)) {
        fixed += ` [add_to_cart:mhm100]`;
        console.log('[AI API] Добавлен fallback тег для мухомора 100г: mhm100');
      } else if (/мухомор.*50|мухомор.*50г/i.test(text)) {
        fixed += ` [add_to_cart:mhm50]`;
        console.log('[AI API] Добавлен fallback тег для мухомора 50г: mhm50');
      } else if (/мухомор.*30|мухомор.*30г/i.test(text)) {
        fixed += ` [add_to_cart:mhm30]`;
        console.log('[AI API] Добавлен fallback тег для мухомора 30г: mhm30');
             } else if (/мухомор.*капсул/i.test(text) && !isPowder) {
         // Если явно указаны капсулы, но не порошок - добавляем
         fixed += ` [add_to_cart:mhm60k]`;
         console.log('[AI API] Добавлен fallback тег для мухомора капсулы: mhm60k');
       } else if (/мухомор.*шляпк/i.test(text)) {
         fixed += ` [add_to_cart:mhm30]`;
         console.log('[AI API] Добавлен fallback тег для мухомора шляпки: mhm30');
       } else if (/мухомор/i.test(text)) {
         // НЕ добавляем по умолчанию - пусть агент спросит форму
         console.log('[AI API] Мухомор без указания формы - тег НЕ добавляется, пусть агент спросит уточнение');
         // foundProduct остается false
             } else if (/ежовик.*500|ежовик.*500г/i.test(text)) {
         fixed += ` [add_to_cart:ezh500]`;
         console.log('[AI API] Добавлен fallback тег для ежовика 500г: ezh500');
       } else if (/ежовик.*300|ежовик.*300г/i.test(text)) {
         fixed += ` [add_to_cart:ezh300]`;
         console.log('[AI API] Добавлен fallback тег для ежовика 300г: ezh300');
       } else if (/ежовик.*360|ежовик.*360.*капсул/i.test(text)) {
         fixed += ` [add_to_cart:ezh360k]`;
         console.log('[AI API] Добавлен fallback тег для ежовика 360 капсул: ezh360k');
       } else if (/ежовик.*100|ежовик.*100г/i.test(text)) {
         fixed += ` [add_to_cart:ezh100]`;
         console.log('[AI API] Добавлен fallback тег для ежовика 100г: ezh100');
       } else if (/ежовик.*порошк/i.test(text)) {
         fixed += ` [add_to_cart:ezh100]`;
         console.log('[AI API] Добавлен fallback тег для ежовика порошок: ezh100');
       } else if (/ежовик.*капсул|ежовик.*120/i.test(text) && isCapsules) {
         // ТОЛЬКО если явно указаны капсулы
         fixed += ` [add_to_cart:ezh120k]`;
         console.log('[AI API] Добавлен fallback тег для ежовика капсулы: ezh120k');
       } else if (/ежовик/i.test(text)) {
         // КРИТИЧНО: НЕ добавляем капсулы по умолчанию - пусть агент спросит форму
         console.log('[AI API] ⚠️ КРИТИЧНО: Ежовик без указания формы - тег НЕ добавляется, пусть агент спросит уточнение');
         // foundProduct остается false - НЕ добавляем fallback!
      } else if (/кордицепс.*150|кордицепс.*150г/i.test(text)) {
        fixed += ` [add_to_cart:kor150]`;
        console.log('[AI API] Добавлен fallback тег для кордицепса 150г: kor150');
      } else if (/кордицепс.*50|кордицепс.*50г/i.test(text)) {
        fixed += ` [add_to_cart:kor50]`;
        console.log('[AI API] Добавлен fallback тег для кордицепса 50г: kor50');
      } else if (/кордицепс/i.test(text)) {
        fixed += ` [add_to_cart:kor50]`;
        console.log('[AI API] Добавлен fallback тег для кордицепса: kor50');
      } else if (/цистозира.*90|цистозира.*90г/i.test(text)) {
        fixed += ` [add_to_cart:ci90]`;
        console.log('[AI API] Добавлен fallback тег для цистозиры 90г: ci90');
      } else if (/цистозира.*3.*месяц|цистозира.*3.*мес/i.test(text)) {
        fixed += ` [add_to_cart:ci90]`;
        console.log('[AI API] Добавлен fallback тег для цистозиры 3 месяца: ci90');
      } else if (/цистозира.*30|цистозира.*30г/i.test(text)) {
        fixed += ` [add_to_cart:ci30]`;
        console.log('[AI API] Добавлен fallback тег для цистозиры 30г: ci30');
      } else if (/цистозира.*месяц|цистозира.*мес/i.test(text)) {
        fixed += ` [add_to_cart:ci30]`;
        console.log('[AI API] Добавлен fallback тег для цистозиры месяц: ci30');
      } else if (/цистозира/i.test(text)) {
        fixed += ` [add_to_cart:ci30]`;
        console.log('[AI API] Добавлен fallback тег для цистозиры: ci30');
      } else if (/комплекс.*6.*месяц|4.*1.*6.*месяц/i.test(text)) {
        fixed += ` [add_to_cart:4v1-6]`;
        console.log('[AI API] Добавлен fallback тег для комплекса 6 месяцев: 4v1-6');
      } else if (/комплекс.*6|4.*1.*6/i.test(text)) {
        fixed += ` [add_to_cart:4v1-6]`;
        console.log('[AI API] Добавлен fallback тег для комплекса 6 месяцев: 4v1-6');
      } else if (/комплекс.*3.*месяц|4.*1.*3.*месяц/i.test(text)) {
        fixed += ` [add_to_cart:4v1-3]`;
        console.log('[AI API] Добавлен fallback тег для комплекса 3 месяца: 4v1-3');
      } else if (/комплекс.*3|4.*1.*3/i.test(text)) {
        fixed += ` [add_to_cart:4v1-3]`;
        console.log('[AI API] Добавлен fallback тег для комплекса 3 месяца: 4v1-3');
      } else if (/комплекс.*месяц|4.*1.*месяц/i.test(text)) {
        fixed += ` [add_to_cart:4v1]`;
        console.log('[AI API] Добавлен fallback тег для комплекса месяц: 4v1');
      } else if (/комплекс|4.*1/i.test(text)) {
        fixed += ` [add_to_cart:4v1]`;
        console.log('[AI API] Добавлен fallback тег для комплекса: 4v1');
      }
    }
  }
  return fixed;
}

function forceRemoveFromCartTag(text) {
  const productMap = [
    // Ежовик
    { keyword: /ежовик.*500.*г/i, id: 'ezh500' },
    { keyword: /ежовик.*500/i, id: 'ezh500' },
    { keyword: /ежовик.*300.*г/i, id: 'ezh300' },
    { keyword: /ежовик.*300/i, id: 'ezh300' },
    { keyword: /ежовик.*360.*капсул/i, id: 'ezh360k' },
    { keyword: /ежовик.*360/i, id: 'ezh360k' },
    { keyword: /ежовик.*100.*порошк/i, id: 'ezh100' },
    { keyword: /ежовик.*120.*капсул/i, id: 'ezh120k' },
    { keyword: /ежовик.*порошк/i, id: 'ezh100' },
    { keyword: /ежовик.*капсул/i, id: 'ezh120k' },
    { keyword: /ежовик/i, id: 'ezh120k' }, // fallback для ежовика
    
    // Мухомор
    { keyword: /мухомор.*180.*капсул/i, id: 'mhm180k' },
    { keyword: /мухомор.*180/i, id: 'mhm180k' },
    { keyword: /мухомор.*60.*капсул/i, id: 'mhm60k' },
    { keyword: /мухомор.*60/i, id: 'mhm60k' },
    { keyword: /мухомор.*100.*г/i, id: 'mhm100' },
    { keyword: /мухомор.*50.*г/i, id: 'mhm50' },
    { keyword: /мухомор.*30.*г/i, id: 'mhm30' },
    { keyword: /мухомор.*100/i, id: 'mhm100' },
    { keyword: /мухомор.*50/i, id: 'mhm50' },
    { keyword: /мухомор.*30/i, id: 'mhm30' },
         { keyword: /мухомор.*капсул/i, id: 'mhm60k' },
     { keyword: /мухомор.*шляпк/i, id: 'mhm30' },
     { keyword: /мухомор/i, id: 'mhm30' }, // fallback для мухомора
    
    // Кордицепс
    { keyword: /кордицепс.*150.*г/i, id: 'kor150' },
    { keyword: /кордицепс.*150/i, id: 'kor150' },
    { keyword: /кордицепс.*50.*г/i, id: 'kor50' },
    { keyword: /кордицепс.*50/i, id: 'kor50' },
    { keyword: /кордицепс/i, id: 'kor50' },
    
    // Цистозира
    { keyword: /цистозира.*90.*г/i, id: 'ci90' },
    { keyword: /цистозира.*90/i, id: 'ci90' },
    { keyword: /цистозира.*3.*месяц/i, id: 'ci90' },
    { keyword: /цистозира.*3.*мес/i, id: 'ci90' },
    { keyword: /цистозира.*30.*г/i, id: 'ci30' },
    { keyword: /цистозира.*30/i, id: 'ci30' },
    { keyword: /цистозира.*месяц/i, id: 'ci30' },
    { keyword: /цистозира.*мес/i, id: 'ci30' },
    { keyword: /цистозира/i, id: 'ci30' },
    
    // Комплексы
    { keyword: /4 ?в ?1.*6.*месяц/i, id: '4v1-6' },
    { keyword: /4 ?в ?1.*6/i, id: '4v1-6' },
    { keyword: /комплекс.*6.*месяц/i, id: '4v1-6' },
    { keyword: /комплекс.*6/i, id: '4v1-6' },
    { keyword: /4 ?в ?1.*3.*месяц/i, id: '4v1-3' },
    { keyword: /4 ?в ?1.*3/i, id: '4v1-3' },
    { keyword: /комплекс.*3.*месяц/i, id: '4v1-3' },
    { keyword: /комплекс.*3/i, id: '4v1-3' },
    { keyword: /4 ?в ?1.*месяц/i, id: '4v1' },
    { keyword: /4 ?в ?1/i, id: '4v1' },
    { keyword: /комплекс.*4.*1/i, id: '4v1' },
  ];
  let fixed = text;
  if (
    /убрал[а-яё ]+из корзин[ау]/i.test(text) &&
    !/\[remove_from_cart:([\w-]+)\]/.test(text)
  ) {
    for (const { keyword, id } of productMap) {
      if (keyword.test(text)) {
        fixed += ` [remove_from_cart:${id}]`;
        break;
      }
    }
  }
  return fixed;
}

// TypeScript типы удалены - это JavaScript файл

export async function POST(req) {
  let requestBody;
  
  try {
    const bodyText = await req.text();
    console.log('[AI API] Raw body:', bodyText);
    
    if (!bodyText || bodyText.trim() === '') {
      return NextResponse.json({ response: "Пустой запрос", error: 'EMPTY_REQUEST' }, { status: 400 });
    }
    
    requestBody = JSON.parse(bodyText);
  } catch (error) {
    console.error('[AI API] JSON parse error:', error);
    return NextResponse.json({ response: "Ошибка парсинга JSON", error: 'JSON_PARSE_ERROR' }, { status: 400 });
  }
  
  const {
    message,
    context: rawContext,
    source,
    user_id,
    products_prompt,
    telegram_id,
  } = requestBody;
  const context = Array.isArray(rawContext) ? rawContext : [];
  console.log("[AI API] OR_TOKEN:", process.env.OPENROUTER_API_KEY);
  console.log("[AI API] user_id:", user_id);
  if (telegram_id) console.log("[AI API] telegram_id:", telegram_id);
  console.log("[AI API] message:", message);
  console.log("[AI API] source:", source || 'mini_app');
  console.log("[AI API] context:", context);
  
  // Определяем источник для сохранения в БД
  const messageSource = source || 'mini_app';
  
  // КРИТИЧНО: ВСЕГДА загружаем ключ из .env.local ПРИ КАЖДОМ запросе
  // Next.js в production НЕ загружает .env.local автоматически
  let OR_TOKEN = null;
  
  // Сначала пробуем из process.env (может быть установлен через PM2)
  if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.length > 20) {
    OR_TOKEN = process.env.OPENROUTER_API_KEY;
    console.log('[AI API] ✅ Ключ найден в process.env');
  }
  
  // ВСЕГДА загружаем из .env.local для надежности
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Пробуем все возможные пути в порядке приоритета
    const envPaths = [
      path.join('/var/www/spor3s-app/spor3s-app', '.env.local'),
      path.join('/var/www/spor3s-app', '.env.local'),
      path.join(process.cwd(), '.env.local'),
      path.join(process.cwd(), '..', '.env.local'),
      '.env.local'
    ];
    
    console.log('[AI API] 🔍 Поиск .env.local по путям...');
    console.log('[AI API] process.cwd():', process.cwd());
    
    for (const envPath of envPaths) {
      try {
        if (fs.existsSync(envPath)) {
          console.log(`[AI API] ✅ Найден файл: ${envPath}`);
          const content = fs.readFileSync(envPath, 'utf8');
          console.log(`[AI API] Размер файла: ${content.length} символов`);
          console.log(`[AI API] Первые 200 символов:`, content.substring(0, 200));
          const lines = content.split('\n');
          for (const line of lines) {
            // Поддерживаем формат OPENROUTER_API_KEY=value и OPENROUTER_API_KEY="value"
            const match = line.match(/^OPENROUTER_API_KEY=(.+)$/);
            if (match) {
              let key = match[1].trim();
              // Убираем кавычки если есть
              key = key.replace(/^["']|["']$/g, '');
              if (key && key.length > 20) {
                OR_TOKEN = key;
                process.env.OPENROUTER_API_KEY = key;
                console.log(`[AI API] ✅✅✅ Ключ загружен из ${envPath} (длина: ${key.length})`);
                console.log(`[AI API] Первые 20 символов ключа: ${key.substring(0, 20)}...`);
                break;
              } else {
                console.log(`[AI API] ⚠️ Ключ слишком короткий: ${key.length} символов`);
              }
            }
          }
          if (OR_TOKEN && OR_TOKEN.length > 20) break;
        } else {
          console.log(`[AI API] ⚠️ Файл не найден: ${envPath}`);
        }
      } catch (pathError) {
        console.error(`[AI API] ⚠️ Ошибка проверки ${envPath}:`, pathError.message);
      }
    }
    
    // Если все еще не найден, пробуем loadEnvLocal
    if (!OR_TOKEN || OR_TOKEN.length < 20) {
      console.log('[AI API] 🔄 Пробуем loadEnvLocal()...');
      loadEnvLocal();
      if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.length > 20) {
        OR_TOKEN = process.env.OPENROUTER_API_KEY;
      }
    }
  } catch (e) {
    console.error("[AI API] ❌ Критическая ошибка загрузки .env.local:", e.message);
    console.error("[AI API] Stack:", e.stack);
  }
  
  if (OR_TOKEN && OR_TOKEN.length > 20) {
    console.log('[AI API] ✅ Ключ успешно загружен, длина:', OR_TOKEN.length);
  } else {
    console.error('[AI API] ❌ Ключ НЕ загружен!');
  }
  
  console.log("[AI API] ========== DEBUG INFO ==========");
  console.log("[AI API] OR_TOKEN length:", OR_TOKEN?.length || 0);
  console.log("[AI API] OR_TOKEN starts with:", OR_TOKEN?.substring(0, 10) || 'undefined');
  console.log("[AI API] OR_TOKEN from env:", !!process.env.OPENROUTER_API_KEY);
  console.log("[AI API] process.cwd():", process.cwd());
  console.log("[AI API] NODE_ENV:", process.env.NODE_ENV);
  console.log("[AI API] ================================");
  
  if (!OR_TOKEN || OR_TOKEN.length < 20) {
    console.error("[AI API] ⚠️ OpenRouter API ключ не настроен!");
    console.error("[AI API] OR_TOKEN value:", OR_TOKEN || 'undefined');
    return NextResponse.json({ 
      response: "Извините, произошла ошибка. Попробуйте еще раз.",
      error: 'OPENROUTER_KEY_MISSING'
    }, { status: 503 });
  }

  // Валидация входного сообщения
  if (typeof message !== 'string' || message.trim().length === 0) {
    return NextResponse.json({ response: 'Сообщение пустое.', error: 'EMPTY_MESSAGE' }, { status: 400 });
  }

  // Автоопределение user_id по telegram_id, если не передан
  let resolvedUserId = user_id || null;
  if (!resolvedUserId && telegram_id) {
    try {
      const tid = String(telegram_id);
      const { data: existing } = await supabaseServer
        .from('users')
        .select('id')
        .eq('telegram_id', tid)
        .single();
      if (existing?.id) {
        resolvedUserId = existing.id;
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      console.warn('[AI API] Не удалось автоопределить user_id по telegram_id:', message);
    }
  }

  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const isResolvedUserUuid = resolvedUserId ? uuidV4Regex.test(String(resolvedUserId)) : false;

  // Обработка запросов о балансе SC
  const userMessage = message.toLowerCase();
  const balanceKeywords = ['коин', 'балл', 'spor3s coin', 'сколько у меня', 'мой баланс', 'моих коинов', 'баллов у меня'];
  if (balanceKeywords.some(keyword => userMessage.includes(keyword))) {
    let balanceResponse = `Spor3s Coins (SC) — это внутренняя валюта нашей платформы! 
    
🪙 **Как зарабатывать SC:**
• Ежедневные чекины 
• Прохождение опросов
• Покупки товаров
• Реферальная программа

💰 **Как тратить SC:**
• Скидки до 30% от суммы заказа
• Обмен на товары

📱 **Проверить баланс:** откройте приложение → раздел "Прогресс"`;
    
    if (messageSource !== 'mini_app') {
      balanceResponse += '\n\nДля быстрого оформления используйте приложение: 👉 t.me/spor3s_bot';
    }
    
    return NextResponse.json({ response: balanceResponse });
  }

  // Формируем сообщения для AI
  const messages = [];
  
  // Добавляем контекст если есть (сначала контекст, потом текущее сообщение)
  if (context && context.length > 0) {
    // Ограничиваем контекст последними 10 сообщениями
    const recentContext = context.slice(-10);
    console.log('[AI API] Контекст диалога:', recentContext.length, 'сообщений');
    recentContext.forEach((msg) => {
      if (msg.role && msg.content) {
      messages.push({ role: msg.role, content: msg.content });
        console.log('[AI API] Добавлено в контекст:', msg.role, ':', msg.content.substring(0, 50) + '...');
      }
    });
  }
  
  // Добавляем текущее сообщение пользователя
  messages.push({ role: "user", content: message });
  console.log('[AI API] Всего сообщений для AI:', messages.length);
  
  // Отладочная информация о контексте
  if (context && context.length > 0) {
    console.log('[AI API] ДЕТАЛЬНЫЙ КОНТЕКСТ:');
    context.forEach((msg, index) => {
      console.log(`[AI API] ${index + 1}. ${msg.role}: ${msg.content?.substring(0, 100)}...`);
    });
  }

  // --- RAG: поиск инструкций ---
  const instructions = message ? await searchInstructionsServer(message) : [];
  let instructionsText = "";
  if (instructions.length > 0) {
    instructionsText = '\n\nСправочная информация по вашему вопросу:\n' + instructions.map(i => `• ${i.title}${i.content ? ': ' + i.content : ''}${i.url ? ' (' + i.url + ')' : ''}`).join("\n");
  }

  // --- Память по пользователю: полная картина ---
  let userSummary = "";
  if (isResolvedUserUuid && resolvedUserId) {
    const userProfile = await getUserProfileServer(resolvedUserId);
    
    if (userProfile) {
      const { preferences } = userProfile;
      
      // Формируем детальную сводку
      let ordersSummary = preferences.totalOrders > 0
        ? `Заказов: ${preferences.totalOrders}, общая сумма: ${preferences.totalSpent}₽, последний заказ: ${preferences.lastOrderDate ? new Date(preferences.lastOrderDate).toLocaleDateString() : 'N/A'}`
        : "Заказов нет.";
      
      let messagesSummary = preferences.totalMessages > 0
        ? `Сообщений: ${preferences.totalMessages} (пользователь: ${preferences.userMessages}, бот: ${preferences.assistantMessages})`
        : "Сообщений нет.";
      
      let activitySummary = `Активность: ${preferences.totalSurveys} анкет, ${preferences.totalCheckins} чекинов, ${preferences.isActive ? 'активен' : 'неактивен'}`;
      
      let topicsSummary = preferences.commonTopics.length > 0
        ? `Популярные темы: ${preferences.commonTopics.map(t => `${t.topic}(${t.count})`).join(', ')}`
        : "Темы не определены";
      
      let favoritesSummary = preferences.favoriteProducts.length > 0
        ? `Любимые продукты: ${preferences.favoriteProducts.map(p => `${p.productId}(${p.count})`).join(', ')}`
        : "Предпочтения не определены";
      
      userSummary = `\n\n[ПОЛНАЯ КАРТИНА ПОЛЬЗОВАТЕЛЯ]\n${ordersSummary}\n${messagesSummary}\n${activitySummary}\n${topicsSummary}\n${favoritesSummary}`;
    } else {
      // Fallback к старой системе
      const orders = await getUserOrdersServer(resolvedUserId);
      const surveys = await getUserSurveysServer(resolvedUserId);
      const userMessages = await getUserMessagesServer(resolvedUserId);
      
      let ordersSummary = orders.length > 0
        ? `Заказов: ${orders.length}. Последний: ${orders[0].items ? JSON.stringify(orders[0].items) : ''}, сумма: ${orders[0].total || '-'}₽, дата: ${orders[0].created_at ? new Date(orders[0].created_at).toLocaleDateString() : '-'} `
        : "Заказов нет.";
      
      let surveysSummary = surveys.length > 0
        ? `Анкет: ${surveys.length}. Последняя: ${JSON.stringify(surveys[0])}`
        : "Анкет нет.";
      
      let messagesSummary = userMessages.length > 0
        ? `Сообщений: ${userMessages.length}. Последние: \n- "${userMessages[0].content}"${userMessages[1] ? `\n- "${userMessages[1].content}"` : ''}${userMessages[2] ? `\n- "${userMessages[2].content}"` : ''}${userMessages[3] ? `\n- "${userMessages[3].content}"` : ''}${userMessages[4] ? `\n- "${userMessages[4].content}"` : ''}`
        : "Сообщений нет.";
      
      userSummary = `\n\n[Память по пользователю]\n${ordersSummary}\n${surveysSummary}\n${messagesSummary}`;
    }
  }

  // --- Добавляем предложение авторизации, если аноним и запрос о заказе ---
  let authPrompt = "";
  if (!user_id) {
    const isOrderRelated = /заказ|купить|order|buy|\[order_now|\[add_to_cart/i.test(message);
    if (isOrderRelated) {
      authPrompt = "\n\nЕсли пользователь спрашивает о заказе или покупке, добавь в конец ответа: 'Если вы хотите получать скидки и Spor3s Coins, а также поддержку ИИ куратора авторизуйтесь через телеграм'.";
    }
  }

  // Интеллектуальный fallback ответ на основе RAG
  function generateIntelligentFallback(msgs, userSummary, productsInfo) {
    console.log('[AI API] === FALLBACK FUNCTION CALLED ===');
    const lastMessage = msgs[msgs.length - 1]?.content?.toLowerCase() || '';
    const normalize = (value) => (value || '').toLowerCase();

    const detectProductKey = (text) => {
      if (text.includes('ежовик') || text.includes('lion')) return 'ezh';
      if (text.includes('мухомор')) return 'mhm';
      if (text.includes('кордицепс')) return 'kor';
      if (text.includes('цистозира')) return 'ci';
      if (/4\s*в\s*1/.test(text) || text.includes('комплекс')) return 'combo';
      return null;
    };

    const detectFormKey = (text) => {
      if (/капсул/.test(text)) return 'capsules';
      if (/шляпк/.test(text) || /порош/.test(text)) return 'powder';
      if (/комплекс/.test(text) || /4\s*в\s*1/.test(text)) return 'bundle';
      return null;
    };

    const collectUserContext = (messages) => {
      let product = null;
      let form = null;
      for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        if (msg.role !== 'user') continue;
        const text = normalize(msg.content);
        if (!product) {
          product = detectProductKey(text);
        }
        if (!form) {
          form = detectFormKey(text);
        }
        if (product && form) break;
      }
      return { product, form };
    };

    const resolveVariant = (product, form, duration) => {
      try {
        // Используем JSON для обхода проблем с типами
        const productVariantsAny = PRODUCT_VARIANTS;
        const productDataStr = JSON.stringify(productVariantsAny[product]);
        const productData = JSON.parse(productDataStr);
        
        if (!productData || typeof productData !== 'object') return null;
        
        const formData = productData[form];
        if (!formData || typeof formData !== 'object') return null;
        
        const variant = formData[duration];
        if (variant && typeof variant === 'object' && 'tag' in variant && 'name' in variant && 'price' in variant) {
          return {
            tag: String(variant.tag),
            name: String(variant.name),
            price: Number(variant.price)
          };
        }
        return null;
      } catch (error) {
        console.error('Error in resolveVariant:', error);
        return null;
      }
    };

    const formatDuration = (duration) => {
      if (duration === 1) return 'месяц';
      if (duration === 3) return '3 месяца';
      if (duration === 6) return '6 месяцев';
      return `${duration} месяцев`;
    };
    
    console.log('[AI API] Генерируем интеллектуальный fallback ответ');
    console.log('[AI API] Последнее сообщение:', lastMessage);
    console.log('[AI API] Проверяем условия:', {
      hasEzhovik: lastMessage.includes('ежовик'),
      hasMemory: lastMessage.includes('память'),
      hasConcentration: lastMessage.includes('концентрация')
    });
    
    // Анализируем намерение пользователя
    if (lastMessage.includes('ежовик') || lastMessage.includes('память') || lastMessage.includes('концентрация')) {
      // Проверяем, есть ли указание формы и срока
      const isPowder = /порошок|порошк/i.test(lastMessage);
      const isCapsules = /капсул|капсул/i.test(lastMessage);
      const isMonth = /месяц/i.test(lastMessage) && !/3.*месяц|три.*месяц/i.test(lastMessage);
      const isThreeMonths = /3.*месяц|три.*месяц|трех.*месяц/i.test(lastMessage);
      const hasAddPhrase = /добавь|добав|закажи|купи/i.test(lastMessage);
      
      console.log('[AI API] Fallback анализ:', { isPowder, isCapsules, isMonth, isThreeMonths, hasAddPhrase });
      
      // Если есть четкое указание формы и срока + фраза добавления
      if (hasAddPhrase && isPowder && isMonth) {
        return `Отлично! Добавил Ежовик 100г порошок на месяц в корзину за 1100₽. Он отлично помогает с памятью и концентрацией. [add_to_cart:ezh100]`;
      } else if (hasAddPhrase && isCapsules && isMonth) {
        return `Отлично! Добавил Ежовик 120 капсул на месяц в корзину за 1100₽. Он отлично помогает с памятью и концентрацией. [add_to_cart:ezh120k]`;
      } else if (hasAddPhrase && isPowder && isThreeMonths) {
        return `Отлично! Добавил Ежовик 300г порошок на 3 месяца в корзину за 3000₽. Он отлично помогает с памятью и концентрацией. [add_to_cart:ezh300]`;
      } else if (hasAddPhrase && isCapsules && isThreeMonths) {
        return `Отлично! Добавил Ежовик 360 капсул на 3 месяца в корзину за 3000₽. Он отлично помогает с памятью и концентрацией. [add_to_cart:ezh360k]`;
      } else if (hasAddPhrase && isPowder) {
        return `Отлично! Добавил Ежовик 100г порошок в корзину за 1100₽. Он отлично помогает с памятью и концентрацией. [add_to_cart:ezh100]`;
      } else if (hasAddPhrase && isCapsules) {
        return `Отлично! Добавил Ежовик 120 капсул в корзину за 1100₽. Он отлично помогает с памятью и концентрацией. [add_to_cart:ezh120k]`;
      } else if (hasAddPhrase) {
        // КРИТИЧНО: Если форма НЕ указана - НЕ добавляем тег, спрашиваем уточнение!
        // Вместо автоматического добавления капсул - спрашиваем форму
        return `Отлично! Ежовик гребенчатый отлично помогает с памятью, концентрацией и обучением.

В какой форме предпочитаете:
• Капсулы (удобно принимать, 120 капсул на месяц за 1100₽)
• Порошок (быстрее эффект, 100г на месяц за 1100₽)

И на какой срок:
• Месяц (для начала)
• 3 месяца (курс, экономично)
• 6 месяцев (максимальный эффект)

Также у вас уже есть опыт приема добавок или начинаете впервые?`;
      }
      
      // Если нет фразы добавления, задаем уточняющие вопросы
      return `Отлично! Ежовик гребенчатый отлично помогает с памятью, концентрацией и обучением.

В какой форме предпочитаете:
• Капсулы (удобно принимать, 120 капсул на месяц за 1100₽)
• Порошок (быстрее эффект, 100г на месяц за 1100₽)

И на какой срок:
• Месяц (для начала)
• 3 месяца (курс, экономично)
• 6 месяцев (максимальный эффект)

Также у вас уже есть опыт приема добавок или начинаете впервые?`;
    }
    
    if (lastMessage.includes('мухомор') || lastMessage.includes('сон') || lastMessage.includes('стресс')) {
      // КРИТИЧНО: Проверяем форму ПЕРЕД добавлением тега
      const isPowder = /порошок|порошк|шляпк/i.test(lastMessage);
      const isCapsules = /капсул/i.test(lastMessage);
      const hasAddPhrase = /добавь|добав|закажи|купи/i.test(lastMessage);
      
      // Если форма указана И есть фраза добавления - добавляем тег
      if (hasAddPhrase && (isPowder || isCapsules)) {
        if (isCapsules) {
          return `Отлично! Добавил Мухомор 60 капсул в корзину за 1400₽. Он отлично помогает со сном и снимает стресс. [add_to_cart:mhm60k]`;
        } else {
          return `Отлично! Добавил Мухомор 30г (шляпки) в корзину за 1400₽. Он отлично помогает со сном и снимает стресс. [add_to_cart:mhm30]`;
        }
      }
      
      // Если форма НЕ указана - спрашиваем уточнение БЕЗ тега
      return `Отлично! Мухомор красный отлично помогает со сном, стрессом и тревожностью.

В какой форме предпочитаете:
• Капсулы (удобно принимать, 60 капсул на месяц за 1400₽)
• Шляпки (порошок, быстрее эффект, 30г на месяц за 1400₽)

И на какой срок:
• Месяц (для начала)
• 3 месяца (курс, экономично)

Также у вас уже есть опыт приема добавок или начинаете впервые?`;
    }
    
    if (lastMessage.includes('кордицепс') || lastMessage.includes('энергия') || lastMessage.includes('выносливость')) {
      return `Отлично! Кордицепс Милитарис плодовые тела отлично помогает с энергией, выносливостью и спортивными результатами.

В какой форме предпочитаете:
• Порошок плодовые тела (50г на месяц за 800₽)
• Порошок плодовые тела (150г на 3 месяца за 2000₽)

Также у вас уже есть опыт приема добавок или начинаете впервые?`;
    }
    
    if (lastMessage.includes('цистозира') || lastMessage.includes('щитовидка') || lastMessage.includes('йод')) {
      // КРИТИЧНО: Проверяем срок и фразу добавления
      const hasAddPhrase = /добавь|добав|закажи|купи/i.test(lastMessage);
      const isThreeMonths = /3.*месяц|три.*месяц|трех.*месяц/i.test(lastMessage);
      
      // Если есть фраза добавления и указан срок - добавляем тег
      if (hasAddPhrase) {
        if (isThreeMonths) {
          return `Отлично! Добавил Цистозира 90г на 3 месяца в корзину за 1350₽. Он отлично помогает с щитовидной железой. [add_to_cart:ci90]`;
        } else {
          return `Отлично! Добавил Цистозира 30г на месяц в корзину за 500₽. Он отлично помогает с щитовидной железой. [add_to_cart:ci30]`;
        }
      }
      
      // Если нет фразы добавления - спрашиваем уточнение БЕЗ тега
      return `Отлично! Цистозира отлично помогает с щитовидной железой и гормональной системой.

Варианты:
• 30г на месяц за 500₽
• 90г на 3 месяца за 1350₽

Также у вас уже есть опыт приема добавок или начинаете впервые?`;
    }
    
    if (lastMessage.includes('комплекс') || lastMessage.includes('4 в 1') || lastMessage.includes('все вместе')) {
      return `Отлично! Комплекс 4 в 1 включает все основные добавки для максимального эффекта.

Варианты:
• 4 в 1 (месяц) - 3300₽
• 4 в 1 (3 месяца) - 9000₽

Включает: Ежовик + Мухомор + Кордицепс + Цистозира

Также у вас уже есть опыт приема добавок или начинаете впервые? [add_to_cart:4v11m]`;
    }
    
    // Обработка выбора формы (порошок/капсулы) БЕЗ указания месяца
    const isFormSelection = (/порошок|порошк|капсул/i.test(lastMessage) && !/месяц/i.test(lastMessage));
    if (isFormSelection) {
      const previousContext = collectUserContext(msgs.slice(0, -1));
      const productKey = detectProductKey(lastMessage) || previousContext.product;
      const formKey = detectFormKey(lastMessage);
      
      if (productKey && formKey) {
        const productDataStr = JSON.stringify(PRODUCT_VARIANTS[productKey]);
        const productData = JSON.parse(productDataStr);
        const productTitle = productData.label || 'продукт';
        const formText = formKey === 'powder' ? 'порошок' : 'капсулы';
        
        return `Отлично! ${productTitle} (${formText}) - хороший выбор!

Теперь уточните срок:

• Месяц (для начала)
• 3 месяца (курс, экономично)${productKey === 'combo' ? '\n• 6 месяцев (максимальный эффект)' : ''}

Какой срок вам подходит?`;
      }
    }
    
    // Обработка выбора месяца после выбора формы
    if (lastMessage.includes('месяц') || lastMessage.includes('3 месяца') || lastMessage.includes('6 месяцев')) {
      const duration = lastMessage.includes('3 месяца') ? 3 : lastMessage.includes('6 месяцев') ? 6 : 1;
      
      // Собираем контекст из всех предыдущих сообщений
      const previousMessages = msgs.slice(0, -1);
      const previousUserContext = collectUserContext(previousMessages);
      
      // Пытаемся определить продукт и форму из текущего или предыдущих сообщений
      let productKey = detectProductKey(lastMessage) || previousUserContext.product;
      let formKey = detectFormKey(lastMessage) || previousUserContext.form;
      
      // Для кордицепса и цистозиры форма всегда порошок
      if (productKey === 'kor' || productKey === 'ci') {
        formKey = 'powder';
      } else if (productKey === 'combo') {
        formKey = 'bundle';
      }

      // Если продукт не определен - спрашиваем
      if (!productKey) {
        return `Отлично! Вы выбрали ${formatDuration(duration)}.

Для какого продукта нужен курс?
• Ежовик (память и концентрация)
• Мухомор (сон и стресс)
• Кордицепс (энергия)
• Цистозира (щитовидная железа)
• Комплекс 4 в 1 (все вместе)`;
      }

      // Если продукт ежовик/мухомор, но форма не указана - спрашиваем форму
      if ((productKey === 'ezh' || productKey === 'mhm') && !formKey) {
        const productDataStr = JSON.stringify(PRODUCT_VARIANTS[productKey]);
        const productData = JSON.parse(productDataStr);
        const productTitle = productData.label || 'продукт';
        return `Отлично! Вы выбрали ${formatDuration(duration)} для ${productTitle.toLowerCase()}.

Осталось выбрать форму:
• Порошок (быстрее эффект)
• Капсулы (удобнее принимать)

Что предпочитаете?`;
      }

      // Если форма все еще не определена, устанавливаем дефолт
      if (!formKey) {
        if (productKey === 'combo') {
          formKey = 'bundle';
        } else {
          formKey = 'powder';
        }
      }

      // Определяем вариант товара
      const variant = productKey && formKey ? resolveVariant(productKey, formKey, duration) : null;

      // Если вариант не найден - сообщаем об ошибке
      if (!variant) {
        const productDataStr = JSON.stringify(PRODUCT_VARIANTS[productKey]);
        const productData = JSON.parse(productDataStr);
        const productTitle = productData.label || 'продукт';
        const availableDurations = productKey === 'combo' ? '1, 3 или 6 месяцев' : '1 или 3 месяца';
        return `Отлично! Вы выбрали ${productTitle.toLowerCase()} на ${formatDuration(duration)}.

К сожалению, для этого срока сейчас доступны варианты на ${availableDurations}. Выберите подходящий срок, и я добавлю товар в корзину.`;
      }

      // Формируем ответ с добавлением в корзину
      const productDataStr = JSON.stringify(PRODUCT_VARIANTS[productKey]);
      const productData: any = JSON.parse(productDataStr);
      const productTitle = productData.label || 'продукт';
      const formText = formKey === 'powder' ? 'порошок' : formKey === 'capsules' ? 'капсулы' : 'комплекс';
      
      return `Отлично! Вы выбрали ${productTitle.toLowerCase()} (${formText}) на ${formatDuration(duration)}.

Добавил **${variant.name}** в корзину за ${variant.price}₽.

[add_to_cart:${variant.tag}]

Продолжайте оформление заказа в Mini App или сообщите, если нужно что-то изменить.`;
    }
    
    // Общий ответ для неопределенных запросов
    return `Привет! Я консультант по грибным добавкам СПОРС.

Помогу подобрать добавки для ваших целей:

🧠 **Память и концентрация** → Ежовик
😴 **Сон и стресс** → Мухомор  
⚡ **Энергия и выносливость** → Кордицепс
🦋 **Щитовидная железа** → Цистозира
🎯 **Все вместе** → Комплекс 4 в 1

Что вас интересует? Расскажите о ваших целях, и я подберу оптимальный вариант!`;
  }

  async function fetchCompletion(msgs) {
    try {
      // Используем переданные цены от Telegram бота или получаем из БД
      let productsInfo = '';
      
      if (products_prompt) {
        // Используем цены от Telegram бота
        productsInfo = products_prompt;
      } else {
        // Получаем актуальные продукты из базы данных для Mini App
        const products = await getProductsServer();
        
        // Формируем строку с актуальными ценами
        productsInfo = "🛍️ АКТУАЛЬНЫЕ ЦЕНЫ И ПРОДУКТЫ:\n\n";
        
        // Группируем продукты по категориям
        const categories = {
          'Ежовик': products.filter(p => (p.name || '').includes('Ежовик')),
          'Мухомор': products.filter(p => (p.name || '').includes('Мухомор')),
          'Кордицепс': products.filter(p => (p.name || '').includes('Кордицепс')),
          'Цистозира': products.filter(p => (p.name || '').includes('Цистозира')),
          'Комплекс': products.filter(p => {
            const productName = p.name || '';
            return productName.includes('Комплекс') || productName.includes('4 в 1');
          })
        };
        
        // Добавляем продукты по категориям
        Object.entries(categories).forEach(([category, categoryProducts]) => {
          if (categoryProducts.length > 0) {
            productsInfo += `🟠 ${category}:\n`;
            categoryProducts.forEach(product => {
              productsInfo += `- ${product.id ?? '-'}: ${product.name ?? 'Без названия'} - ${product.price ?? '-'}₽\n`;
            });
            productsInfo += "\n";
          }
        });
      }
      
      // Отладочная информация о том, что отправляется в AI
      console.log('[AI API] ОТПРАВЛЯЕМ В AI:');
      console.log('[AI API] Количество сообщений:', msgs.length);
      msgs.forEach((msg, index) => {
        console.log(`[AI API] ${index + 1}. ${msg.role}: ${msg.content.substring(0, 100)}...`);
      });
       
       // Получаем промпт из системы управления контентом
      const aiPrompt = await ContentManager.getFullAIPrompt('main_ai_prompt', 
        `${userSummary}${instructionsText}${authPrompt}${productsInfo}${scenariosPrompt}`
      );
       
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
       
      // Пробуем OpenRouter с улучшенными заголовками
       const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
         method: "POST",
         headers: {
           "Authorization": `Bearer ${OR_TOKEN}`,
           "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json",
          "HTTP-Referer": "https://ai.spor3s.ru",
          "X-Title": "Spor3s AI"
         },
         body: JSON.stringify({
           model: "openai/gpt-4o-mini",
           messages: [
             { role: "system", content: aiPrompt },
            ...msgs  // Передаем всю историю диалога
           ],
          max_tokens: 800,
          temperature: 0.8,  // Более естественные ответы
         }),
        signal: controller.signal,
       });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error('[AI API] HTTP Error:', response.status, response.statusText);
        
        // FALLBACK: Если OpenRouter не работает, используем интеллектуальный ответ
        console.log('[AI API] OpenRouter недоступен, используем fallback ответ');
        let fallbackResponse = generateIntelligentFallback(msgs, userSummary, productsInfo);
        
        // КРИТИЧНО: Применяем те же проверки к fallback ответу!
        const userMessageLower = message.toLowerCase();
        const userHasEzhOrMhm = /ежовик|мухомор/i.test(userMessageLower);
        const userHasForm = /порошок|капсул|порошк|шляпк/i.test(userMessageLower);
        const userWantsToAdd = /добав|закаж|купи|полож|оформ/i.test(userMessageLower);
        const isQuestionAboutAvailability = /есть\s+(ли|у вас)?.*?(ежовик|мухомор)|какие|что\s+есть|расскажи|подскаж|хочу узнать|интересует|можно\s+узнать|есть\?\s*$/i.test(userMessageLower);
        
        if ((userHasEzhOrMhm && !userHasForm && !userWantsToAdd) || isQuestionAboutAvailability) {
          console.log('[AI API] ⚠️ КРИТИЧНО: Fallback - форма НЕ указана, удаляем теги!');
          fallbackResponse = fallbackResponse.replace(/\[add_to_cart:[\w-]+\]/g, '').trim();
          fallbackResponse = fallbackResponse.replace(/✅\s*Товар\s+добавлен\s+в\s+корзин[уа]!?\s*Что\s+еще\s+добавить\?/gi, '').trim();
        }
        
        return fallbackResponse;
      }

             const data = await response.json();
       
       if (!data.choices || !data.choices[0] || !data.choices[0].message) {
         console.error('[AI API] Invalid response structure:', data);
         throw new Error('Invalid AI response structure');
       }

              let aiResponse = data.choices[0].message.content;
              console.log('[AI API] ============================================');
              console.log('[AI API] Original AI Response:', aiResponse);
              console.log('[AI API] User message:', message);
              
      // КРИТИЧНО: Проверяем СООБЩЕНИЕ ПОЛЬЗОВАТЕЛЯ - если форма НЕ указана, блокируем теги
      const userMessageLowerCheck = message.toLowerCase();
      const userHasEzhOrMhm = /ежовик|мухомор/i.test(userMessageLowerCheck);
      const userHasForm = /порошок|капсул|порошк|шляпк/i.test(userMessageLowerCheck);
      const userWantsToAdd = /добав|закаж|купи|полож|оформ/i.test(userMessageLowerCheck);
      // КРИТИЧНО: Проверяем, что это НЕ вопрос о наличии
      const isQuestionAboutAvailability = /есть\s+(ли|у вас)?.*?(ежовик|мухомор)|какие|что\s+есть|расскажи|подскаж|хочу узнать|интересует|можно\s+узнать|есть\?\s*$/i.test(userMessageLowerCheck);
      
      console.log('[AI API] Проверка пользователя:', {
        userHasEzhOrMhm,
        userHasForm,
        userWantsToAdd,
        isQuestionAboutAvailability,
        shouldBlock: (userHasEzhOrMhm && !userHasForm && !userWantsToAdd) || isQuestionAboutAvailability
      });
      
      // КРИТИЧНО: Если пользователь спросил про ежовик/мухомор БЕЗ формы и БЕЗ явного запроса добавления
      // ИЛИ это вопрос о наличии - УДАЛЯЕМ ВСЕ ТЕГИ из ответа AI немедленно!
      if ((userHasEzhOrMhm && !userHasForm && !userWantsToAdd) || isQuestionAboutAvailability) {
        const tagsBefore = [...aiResponse.matchAll(/\[add_to_cart:([\w-]+)\]/g)].map(m => m[1]);
        console.log('[AI API] ⚠️ КРИТИЧНО: Пользователь спросил про ежовик/мухомор БЕЗ формы - удаляем ВСЕ теги из ответа!');
        console.log('[AI API] Теги ДО удаления:', tagsBefore);
        aiResponse = aiResponse.replace(/\[add_to_cart:[\w-]+\]/g, '').trim();
        aiResponse = aiResponse.replace(/✅\s*Товар\s+добавлен\s+в\s+корзин[уа]!?\s*Что\s+еще\s+добавить\?/gi, '').trim();
        const tagsAfter = [...aiResponse.matchAll(/\[add_to_cart:([\w-]+)\]/g)].map(m => m[1]);
        console.log('[AI API] Теги ПОСЛЕ удаления:', tagsAfter);
        console.log('[AI API] После удаления тегов:', aiResponse);
        console.log('[AI API] ============================================');
      }
      
      // КРИТИЧНО: Проверяем, есть ли ежовик или мухомор БЕЗ указания формы в ответе AI
      // Если есть - НЕ вызываем forceAddToCartTag, чтобы не добавить тег автоматически
      const hasEzhOrMhm = /ежовик|мухомор/i.test(aiResponse);
      const hasFormSpecified = /порошок|капсул|порошк/i.test(aiResponse);
      const hasAddPhrase = /добав|полож|положил/i.test(aiResponse);
      
      // КРИТИЧНО: Если есть ежовик/мухомор БЕЗ формы и БЕЗ фразы добавления - НЕ вызываем forceAddToCartTag
      const shouldSkipForceAdd = hasEzhOrMhm && !hasFormSpecified && !hasAddPhrase;
      
      if (shouldSkipForceAdd) {
        console.log('[AI API] ⚠️ КРИТИЧНО: Обнаружен ежовик/мухомор БЕЗ формы - пропускаем forceAddToCartTag');
      } else {
        const beforeForceAdd = aiResponse;
        console.log('[AI API] About to call forceAddToCartTag...');
        aiResponse = forceAddToCartTag(aiResponse);
        console.log('[AI API] After forceAddToCartTag:', aiResponse);
        console.log('[AI API] Changed:', beforeForceAdd !== aiResponse);
        console.log('[AI API] ForceAddToCartTag DEBUG - Input:', beforeForceAdd);
        console.log('[AI API] ForceAddToCartTag DEBUG - Output:', aiResponse);
      }
       
       const beforeForceRemove = aiResponse;
       aiResponse = forceRemoveFromCartTag(aiResponse);
       console.log('[AI API] After forceRemoveFromCartTag:', aiResponse);
       
                 // Сохраняем теги для обработки, но заменяем их на предложение перехода в приложение
        let finalResponse = aiResponse;
        
                 // Заменяем теги add_to_cart на естественную фразу в зависимости от канала
        // КРИТИЧНО: Если пользователь спросил про ежовик/мухомор БЕЗ формы - удаляем теги!
        // Используем переменные, объявленные выше (строки 988-990)
        const shouldRemoveTags = userHasEzhOrMhm && !userHasForm && !userWantsToAdd;
        
        if (shouldRemoveTags) {
          console.log('[AI API] ⚠️ КРИТИЧНО: Пользователь спросил БЕЗ формы - удаляем ВСЕ теги!');
          finalResponse = aiResponse.replace(/\[add_to_cart:[\w-]+\]/g, '').trim();
          finalResponse = finalResponse.replace(/✅\s*Товар\s+добавлен\s+в\s+корзин[уа]!?\s*Что\s+еще\s+добавить\?/gi, '').trim();
        } else if (/\[add_to_cart:[\w-]+\]/.test(aiResponse)) {
          if (messageSource === 'mini_app') {
            // В Mini App - теги остаются для обработки приложением
            finalResponse = aiResponse;
          } else if (messageSource === 'telegram_bot') {
            // В Telegram Bot - предлагаем перейти в приложение и удаляем теги
            finalResponse = aiResponse.replace(/\[add_to_cart:[\w-]+\]/g, '').trim();
            finalResponse += '\n\nДобавил все в корзину, продолжи оформление в приложении:\n👉 t.me/spor3s_bot\n\nИли укажите ФИО+телефон+адрес СДЭК для оформления здесь.';
          } else {
            // В Spor3z - удаляем теги (агент их обработает)
            finalResponse = aiResponse.replace(/\[add_to_cart:[\w-]+\]/g, '').trim();
          }
         }
         
         // Заменяем теги remove_from_cart
         finalResponse = finalResponse.replace(/\[remove_from_cart:[\w-]+\]/g, '').trim();
         
         console.log('[AI API] Final AI Response (cleaned):', finalResponse);
      
      // Проверяем наличие тегов в ответе
      const hasAddToCartTags = /\[add_to_cart:[\w-]+\]/.test(aiResponse);
      const hasRemoveFromCartTags = /\[remove_from_cart:[\w-]+\]/.test(aiResponse);
      const hasOrderNowTags = /\[order_now:[\w-]+\]/.test(aiResponse);
      
      console.log('[AI API] Tags found:', { 
        hasAddToCartTags, 
        hasRemoveFromCartTags,
        hasOrderNowTags,
        addToCartMatches: [...aiResponse.matchAll(/\[add_to_cart:([\w-]+)\]/g)].map(m => m[1]),
        removeFromCartMatches: [...aiResponse.matchAll(/\[remove_from_cart:([\w-]+)\]/g)].map(m => m[1]),
        orderNowMatches: [...aiResponse.matchAll(/\[order_now:([\w-]+)\]/g)].map(m => m[1])
      });

                  return finalResponse;
         } catch (error) {
       const message = error instanceof Error ? error.message : 'Unknown error';
       console.error('[AI API] Fetch error:', message);
       console.error('[AI API] Error stack:', error instanceof Error ? error.stack : 'No stack');
       
       // Получаем продукты для fallback ответов
       let products = [];
       try {
         products = await getProductsServer();
       } catch (productsError) {
         console.error('[AI API] Error getting products:', productsError);
       }
     
      // Вспомогательная функция для нормализации названий
      const normalizeName = (value) => (value || '').toLowerCase();
      
             // Fallback ответы в зависимости от запроса
       const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
       const rawUserMessage = (lastMsg && typeof lastMsg.content === 'string')
         ? lastMsg.content
         : (typeof message === 'string' ? message : '');
       const userMessage = normalizeName(rawUserMessage || '');
       
       // Проверяем контекст на наличие уточнений
       const hasContext = context.length > 0;
       const hasFormSpecification = hasContext && context.some(msg => 
         msg.content && (
           msg.content.includes('капсулы') || 
           msg.content.includes('порошок') || 
           msg.content.includes('месяц')
         )
       );
       
      // Находим подходящие продукты для fallback

      const findProduct = (keywords: string[]) =>
        products.find(p => {
          const name = normalizeName(p.name);
          return keywords.some(keyword => name.includes(keyword.toLowerCase()));
        });
      
             // Специальная обработка шляпок (высший приоритет)
       // КРИТИЧНО: Шляпки - это уже указание формы, но проверяем фразу добавления
       if (userMessage.includes('шляпки') && userMessage.includes('мухомор')) {
         const wantsToAdd = /добав|закаж|купи|полож/i.test(userMessage);
         if (wantsToAdd) {
           // Шляпки = мухомор 30г порошок
           return forceAddToCartTag(`Отлично! Добавил Мухомор 30г (шляпки) в корзину за 600₽. Он отлично помогает со сном и снимает стресс. Кстати, для лучшего эффекта рекомендую также Ежовик для улучшения памяти за 1200₽. Добавить его тоже? [add_to_cart:mhm30]`);
         }
       }
       
       // Специальная обработка "30 гр" (высший приоритет)
       // КРИТИЧНО: 30гр - это указание веса, но нужно проверить форму и фразу добавления
       if ((userMessage.includes('30 гр') || userMessage.includes('30гр')) && userMessage.includes('мухомор')) {
         const hasForm = /шляпк|порошок|капсул/i.test(userMessage);
         const wantsToAdd = /добав|закаж|купи|полож/i.test(userMessage);
         
         if (wantsToAdd && hasForm) {
           // 30 гр = мухомор 30г
           return forceAddToCartTag(`Отлично! Добавил Мухомор 30г в корзину за 600₽. Он отлично помогает со сном и снимает стресс. Кстати, для лучшего эффекта рекомендую также Ежовик для улучшения памяти за 1200₽. Добавить его тоже? [add_to_cart:mhm30]`);
         } else if (!hasForm) {
           // Если форма не указана - спрашиваем
           return `Отлично! Мухомор 30г - хороший выбор для начала.

В какой форме предпочитаете:
• Шляпки (порошок) - 30г на месяц за 600₽
• Капсулы - 60 капсул на месяц за 1400₽

Хотите добавить в корзину?`;
         }
       }
       
       // Специальная обработка "на месяц" (высший приоритет)
       // КРИТИЧНО: "на месяц" - это срок, но нужно проверить форму
       if (userMessage.includes('на месяц') && userMessage.includes('мухомор')) {
         const hasForm = /шляпк|порошок|капсул/i.test(userMessage);
         const wantsToAdd = /добав|закаж|купи|полож/i.test(userMessage);
         
         if (wantsToAdd && hasForm) {
           // на месяц = мухомор 30г или 60 капсул
           if (userMessage.includes('капсул')) {
             return forceAddToCartTag(`Отлично! Добавил Мухомор 60 капсул (месяц) в корзину за 1400₽. Он отлично помогает со сном и снимает стресс. Кстати, для лучшего эффекта рекомендую также Ежовик для улучшения памяти за 1200₽. Добавить его тоже? [add_to_cart:mhm60k]`);
           } else {
             return forceAddToCartTag(`Отлично! Добавил Мухомор 30г (шляпки, месяц) в корзину за 600₽. Он отлично помогает со сном и снимает стресс. Кстати, для лучшего эффекта рекомендую также Ежовик для улучшения памяти за 1200₽. Добавить его тоже? [add_to_cart:mhm30]`);
           }
         } else if (!hasForm) {
           // Если форма не указана - спрашиваем
           return `Отлично! Мухомор на месяц - хороший выбор для начала.

В какой форме предпочитаете:
• Шляпки (порошок) - 30г на месяц за 600₽
• Капсулы - 60 капсул на месяц за 1400₽

Хотите добавить в корзину?`;
         }
       }

       // Специальная обработка "оформи ежовик на 3 месяца" (высший приоритет)
       if (userMessage.includes('оформи') && userMessage.includes('ежовик') && userMessage.includes('3 месяца')) {
         return `Отлично! Для курса Ежовик на 3 месяца у нас есть два варианта:

• Ежовик в порошке 3 упаковки по 100гр - цена 3000₽
• Ежовик в капсулах 3 баночки по 120 капсул - также 3000₽

В какой форме предпочитаете: порошок или капсулы?

Начинать можно с месячного курса, чтобы понять насколько нравится эффект, он накопительный поэтому в идеале пройти курс 3-6 месяцев до достижения результата. Потом можно повторять при необходимости)

Плюсы порошка - быстрее эффект наступает и есть вкус, т.к. идёт процесс пережёвывания) можно мерить чайной ложкой без горки, мухомор на весах

Плюсы веган капсул что не нужно мерить и многим так привычнее 😊`;
       }

       // Специальная обработка "мухомор на 3 месяца" (высший приоритет)
       if (userMessage.includes('мухомор') && userMessage.includes('3 месяца')) {
         return `Отлично! Для курса Мухомор на 3 месяца у нас есть два варианта:

• 100гр шляпки (порошок) - цена 1800₽
• 3 баночки по 60 капсул - также 1800₽

В какой форме предпочитаете: порошок из шляпок или капсулы?

Начинать можно с месячного курса, чтобы понять насколько нравится эффект, он накопительный поэтому в идеале пройти курс 3-6 месяцев до достижения результата. Потом можно повторять при необходимости)

Плюсы порошка - быстрее эффект наступает и есть вкус, т.к. идёт процесс пережёвывания) можно мерить чайной ложкой без горки, мухомор на весах

Плюсы веган капсул что не нужно мерить и многим так привычнее 😊`;
       }

       // Специальная обработка "ежовик на 3 месяца" (высший приоритет)
       if (userMessage.includes('ежовик') && userMessage.includes('3 месяца')) {
         return `Отлично! Для курса Ежовик на 3 месяца у нас есть два варианта:

• Ежовик в порошке 3 упаковки по 100гр - цена 3000₽
• Ежовик в капсулах 3 баночки по 120 капсул - также 3000₽

В какой форме предпочитаете: порошок или капсулы?

Начинать можно с месячного курса, чтобы понять насколько нравится эффект, он накопительный поэтому в идеале пройти курс 3-6 месяцев до достижения результата. Потом можно повторять при необходимости)

Плюсы порошка - быстрее эффект наступает и есть вкус, т.к. идёт процесс пережёвывания) можно мерить чайной ложкой без горки, мухомор на весах

Плюсы веган капсул что не нужно мерить и многим так привычнее 😊`;
       }
       
       // Приоритетная обработка мухомора и шляпок
       if (userMessage.includes('мухомор') || userMessage.includes('сон') || userMessage.includes('стресс')) {
        // Проверяем, есть ли уже контекст о добавлении в корзину
        const hasAddContext = context.some(msg =>
          msg.content && (
            msg.content.includes('добавил') || 
            msg.content.includes('добавлен') || 
            msg.content.includes('корзин')
          )
        );
        
        // Проверяем, есть ли уточнения формы и срока
        const hasFormSpecification = userMessage.includes('капсулы') || userMessage.includes('порошок') || userMessage.includes('шляпки') || userMessage.includes('месяц') || userMessage.includes('30') || userMessage.includes('3') || userMessage.includes('три');
        
        // КРИТИЧНО: Проверяем форму ПЕРЕД установкой дефолтного значения!
        const hasFormInMessage = /капсул|шляпк|порошок|порошк/i.test(userMessage);
        const wantsToAddInMessage = /добав|закаж|купи|полож/i.test(userMessage);
        
        // Если это первый запрос о мухоморе БЕЗ формы - уточняем детали
        if (!hasAddContext && !wantsToAddInMessage && !hasFormSpecification && !hasFormInMessage) {
          return `Отлично! Мухомор красный отлично помогает со сном, стрессом и тревожностью.

В какой форме предпочитаете:
• Капсулы (удобно принимать, 60 капсул на месяц за 1400₽)
• Шляпки (порошок, быстрее эффект, 30г на месяц за 600₽)

И на какой срок:
• Месяц (для начала)
• 3 месяца (курс, экономично)

Также у вас уже есть опыт приема добавок или начинаете впервые?`;
        }
        
        // Если пользователь уже указал форму и срок, добавляем в корзину
        let productId = 'mhm30';
        let productName = 'Мухомор 30г (шляпки)';
        
        // Приоритет: сначала проверяем "30", потом "на месяц", потом "3 месяца"
        if (userMessage.includes('30') || userMessage.includes('тридцать')) {
          // Мухомор 30г
          if (userMessage.includes('капсул') || userMessage.includes('капсул')) {
            productId = 'mhm60k';
            productName = 'Мухомор 60 капсул';
          } else {
            productId = 'mhm30';
            productName = 'Мухомор 30г';
          }
        } else if (userMessage.includes('месяц') && !userMessage.includes('3') && !userMessage.includes('три') && !userMessage.includes('трех')) {
          // Мухомор на месяц
          // КРИТИЧНО: Проверяем форму ПЕРЕД установкой дефолтного значения!
          const hasForm = /капсул|шляпк|порошок|порошк/i.test(userMessage);
          
          if (!hasForm) {
            // Если форма НЕ указана - спрашиваем уточнение БЕЗ добавления
            return `Отлично! Мухомор на месяц - хороший выбор для начала.

В какой форме предпочитаете:
• Шляпки (порошок) - 30г на месяц за 600₽
• Капсулы - 60 капсул на месяц за 1400₽

Хотите добавить в корзину?`;
          }
          
          if (userMessage.includes('капсул') || userMessage.includes('капсул')) {
            productId = 'mhm60k';
            productName = 'Мухомор 60 капсул (месяц)';
          } else if (userMessage.includes('шляпки') || userMessage.includes('порошок') || userMessage.includes('порошк')) {
            productId = 'mhm30';
            productName = 'Мухомор 30г (шляпки, месяц)';
          }
        } else if (userMessage.includes('3') || userMessage.includes('три') || userMessage.includes('трех')) {
          // Мухомор на 3 месяца - предлагаем выбор между шляпками и капсулами
          if (userMessage.includes('капсул') || userMessage.includes('капсул')) {
            productId = 'mhm180k';
            productName = 'Мухомор 180 капсул (3 месяца)';
          } else {
            productId = 'mhm100';
            productName = 'Мухомор 100г (3 месяца)';
          }
        } else if (userMessage.includes('50') || userMessage.includes('пятьдесят')) {
          productId = 'mhm50';
          productName = 'Мухомор 50г';
        } else if (userMessage.includes('100') || userMessage.includes('сто')) {
          productId = 'mhm100';
          productName = 'Мухомор 100г';
        } else if (userMessage.includes('капсул') || userMessage.includes('капсул')) {
          productId = 'mhm60k';
          productName = 'Мухомор 60 капсул';
        } else if (userMessage.includes('шляпки') || userMessage.includes('порошок') || userMessage.includes('порошк')) {
          productId = 'mhm30';
          productName = 'Мухомор 30г';
        }
        
        const product = findProduct(['мухомор', '30г']);
        const productPrice = product?.price ?? '600';
        const productTitle = product?.name || productName;
        const ezhProduct = findProduct(['ежовик']);
        const ezhPrice = ezhProduct?.price ?? '1200';
         return forceAddToCartTag(`Отлично! Добавил ${productTitle} в корзину за ${productPrice}₽. Он отлично помогает со сном и снимает стресс. Кстати, для лучшего эффекта рекомендую также Ежовик для улучшения памяти за ${ezhPrice}₽. Добавить его тоже? [add_to_cart:${product?.id || productId}]`);
      } else if (userMessage.includes('ежовик') || userMessage.includes('память') || userMessage.includes('мозг') || userMessage.includes('концентрация')) {
        // Проверяем, есть ли уже контекст о добавлении в корзину
        const hasAddContext = context.some(msg =>
          msg.content && (
            msg.content.includes('добавил') || 
            msg.content.includes('добавлен') || 
            msg.content.includes('корзин')
          )
        );
        
        // Если это первый запрос о ежовике, уточняем детали
        if (!hasAddContext && !userMessage.includes('добавь') && !userMessage.includes('закажи') && !userMessage.includes('купи') && !userMessage.includes('капсулы') && !userMessage.includes('порошок') && !userMessage.includes('месяц')) {
          return `Отлично! Ежовик гребенчатый отлично помогает с памятью, концентрацией и обучением.

В какой форме предпочитаете:
• Капсулы (удобно принимать, 120 капсул на месяц за 1100₽)
• Порошок (быстрее эффект, 100г на месяц за 1100₽)

И на какой срок:
• Месяц (для начала)
• 3 месяца (курс, экономично)
• 6 месяцев (максимальный эффект)

Также у вас уже есть опыт приема добавок или начинаете впервые?`;
        }
        
        // Если пользователь уже указал форму и срок, добавляем в корзину
        let productId = 'ezh120k';
        let productName = 'Ежовик в капсулах';
        
        if (userMessage.includes('100') || userMessage.includes('порошок') || userMessage.includes('порошк')) {
          productId = 'ezh100';
          productName = 'Ежовик 100г порошок';
        }
        
        const product = findProduct(['ежовик', 'капсул']);
        const productTitle = product?.name || productName;
        const productPrice = product?.price ?? '1200';
        const kordiceps = findProduct(['кордицепс']);
        const kordicepsPrice = kordiceps?.price ?? '800';
         return forceAddToCartTag(`Добавил ${productTitle} в корзину за ${productPrice}₽! Он прекрасно помогает с памятью и концентрацией. Хотите также попробовать Кордицепс для энергии за ${kordicepsPrice}₽? [add_to_cart:${product?.id || productId}]`);

      } else if (userMessage.includes('капсулы') || userMessage.includes('порошок') || userMessage.includes('месяц') || userMessage.includes('шляпки')) {
        // Обработка уточнений формы и срока
        if (userMessage.includes('мухомор') || context.some(msg => msg.content?.includes('мухомор'))) {
          // КРИТИЧНО: Проверяем форму ПЕРЕД установкой дефолтного значения!
          const hasForm = /порошок|капсул|порошк|шляпк/i.test(userMessage);
          const wantsToAdd = /добав|закаж|купи|полож/i.test(userMessage);
          
          // Если форма НЕ указана и нет явного запроса добавления - НЕ добавляем тег!
          if (!hasForm && !wantsToAdd) {
            return `Отлично! Мухомор красный отлично помогает со сном, стрессом и тревожностью.

В какой форме предпочитаете:
• Капсулы (удобно принимать, 60 капсул на месяц за 1400₽)
• Шляпки (порошок, быстрее эффект, 30г на месяц за 1400₽)

И на какой срок:
• Месяц (для начала)
• 3 месяца (курс, экономично)

Также у вас уже есть опыт приема добавок или начинаете впервые?`;
          }
          
          // Обработка мухомора
          let productId = 'mhm30';
          let productName = 'Мухомор 30г (шляпки)';
          
          // Приоритет: сначала проверяем "на месяц", потом "3 месяца"
          if (userMessage.includes('месяц') && !userMessage.includes('3') && !userMessage.includes('три') && !userMessage.includes('трех')) {
            // Мухомор на месяц
            if (userMessage.includes('капсул') || userMessage.includes('капсул')) {
              productId = 'mhm60k';
              productName = 'Мухомор 60 капсул (месяц)';
            } else if (userMessage.includes('шляпки') || userMessage.includes('порошок') || userMessage.includes('порошк')) {
              productId = 'mhm30';
              productName = 'Мухомор 30г (шляпки, месяц)';
            }
          } else if (userMessage.includes('3') || userMessage.includes('три') || userMessage.includes('трех')) {
            // Мухомор на 3 месяца
            if (userMessage.includes('капсул') || userMessage.includes('капсул')) {
              productId = 'mhm180k';
              productName = 'Мухомор 180 капсул (3 месяца)';
            } else if (userMessage.includes('шляпки') || userMessage.includes('порошок') || userMessage.includes('порошк')) {
              productId = 'mhm100';
              productName = 'Мухомор 100г (шляпки, 3 месяца)';
            }
          } else if (userMessage.includes('капсул') || userMessage.includes('капсул')) {
            productId = 'mhm60k';
            productName = 'Мухомор 60 капсул';
          } else if (userMessage.includes('шляпки') || userMessage.includes('порошок') || userMessage.includes('порошк')) {
            productId = 'mhm30';
            productName = 'Мухомор 30г (шляпки)';
          }
          
          const product = findProduct(['мухомор']);
          const productTitle = product?.name || productName;
          const productPrice = product?.price ?? '1400';
          const ezhProduct = findProduct(['ежовик']);
          const ezhPrice = ezhProduct?.price ?? '1100';
          return forceAddToCartTag(`Отлично! Добавил ${productTitle} в корзину за ${productPrice}₽. Он отлично помогает со сном и снимает стресс. Кстати, для лучшего эффекта рекомендую также Ежовик для улучшения памяти за ${ezhPrice}₽. Добавить его тоже? [add_to_cart:${product?.id || productId}]`);
        } else if (userMessage.includes('ежовик') || context.some(msg => msg.content?.includes('ежовик'))) {
          // КРИТИЧНО: Проверяем форму ПЕРЕД установкой дефолтного значения!
          const hasForm = /порошок|капсул|порошк/i.test(userMessage);
          const wantsToAdd = /добав|закаж|купи|полож/i.test(userMessage);
          
          // Если форма НЕ указана и нет явного запроса добавления - НЕ добавляем тег!
          if (!hasForm && !wantsToAdd) {
            return `Отлично! Ежовик гребенчатый отлично помогает с памятью, концентрацией и обучением.

В какой форме предпочитаете:
• Капсулы (удобно принимать, 120 капсул на месяц за 1100₽)
• Порошок (быстрее эффект, 100г на месяц за 1100₽)

И на какой срок:
• Месяц (для начала)
• 3 месяца (курс, экономично)
• 6 месяцев (максимальный эффект)

Также у вас уже есть опыт приема добавок или начинаете впервые?`;
          }
          
          // Обработка ежовика
          let productId = 'ezh120k';
          let productName = 'Ежовик 120 капсул';
          
          if (userMessage.includes('порошок')) {
            productId = 'ezh100';
            productName = 'Ежовик 100г порошок';
          } else if (userMessage.includes('капсул')) {
            productId = 'ezh120k';
            productName = 'Ежовик 120 капсул';
          }
          
          const product = findProduct(['ежовик']);
          const productTitle = product?.name || productName;
          const productPrice = product?.price ?? '1100';
          const kordProduct = findProduct(['кордицепс']);
          const kordPrice = kordProduct?.price ?? '800';
          return forceAddToCartTag(`Отлично! Добавил ${productTitle} в корзину за ${productPrice}₽. Он прекрасно помогает с памятью и концентрацией. Кстати, для лучшего эффекта рекомендую также Кордицепс для энергии за ${kordPrice}₽. Добавить его тоже? [add_to_cart:${product?.id || productId}]`);
        }
      } else if (userMessage.includes('кордицепс') || userMessage.includes('энергия') || userMessage.includes('выносливость')) {
        const product = findProduct(['кордицепс']);
        const productId = product?.id || 'kor50';
        const productName = product?.name || 'Кордицепс Милитарис плодовые тела 50г';
         return forceAddToCartTag(`Добавил ${productName} в корзину за ${product?.price || '800'}₽! Он отлично повышает энергию и выносливость. Хотите также попробовать Мухомор для сна за ${findProduct(['мухомор'])?.price || '600'}₽? [add_to_cart:${productId}]`);
      } else if (userMessage.includes('цистозира') || userMessage.includes('щитовидка') || userMessage.includes('щитовидная')) {
        const product = findProduct(['цистозира']);
        const productId = product?.id || 'ci30';
         return forceAddToCartTag(`Добавил ${product?.name || 'Цистозира 30г'} в корзину за ${product?.price || '500'}₽! Он отлично поддерживает здоровье щитовидной железы. Хотите также попробовать Ежовик для памяти за ${findProduct(['ежовик'])?.price || '1200'}₽? [add_to_cart:${productId}]`);
      } else if (userMessage.includes('комплекс') || userMessage.includes('всё вместе') || userMessage.includes('4 в 1') || userMessage.includes('4в1')) {
        // Определяем какой комплекс нужен
        let productId = '4v1';
        let productName = 'курс 4 в 1 на месяц';
        
        if (userMessage.includes('3') || userMessage.includes('три') || userMessage.includes('трех')) {
          productId = '4v1-3';
          productName = 'курс 4 в 1 на 3 месяца';
        }
        
        const product = findProduct(['комплекс', '4 в 1']);
        const productTitle = product?.name || productName;
        const productPrice = product?.price ?? '2000';
         return forceAddToCartTag(`Добавил ${productTitle} в корзину за ${productPrice}₽! Это комплексное решение для всех ваших потребностей. Хотите оформить заказ? [add_to_cart:${product?.id || productId}]`);
      } else if (userMessage.includes('убрать') || userMessage.includes('удалить') || userMessage.includes('убери')) {
        const product = products[0]; // Берем первый продукт для примера
        const productId = product?.id || 'ezh100';
        return forceRemoveFromCartTag(`Убрал товар из корзины. Что еще хотите добавить? [remove_from_cart:${productId}]`);
      } else if (userMessage.includes('заказ') || userMessage.includes('корзин')) {
        return 'Для оформления заказа выберите нужные товары и перейдите в корзину. Если нужна консультация по продуктам - задавайте вопросы!';
      } else if (userMessage.includes('монет') || userMessage.includes('sc') || userMessage.includes('coin')) {
        return 'Spor3s Coins (SC) — это внутренняя валюта платформы. Зарабатываете за активности и можете тратить на скидки до 30% от суммы заказа. Проверьте свой баланс в разделе "Прогресс"!';
             } else if (userMessage.includes('как дела') || userMessage.includes('как ты')) {
         return 'Хорошо, спасибо! Готов помочь с выбором добавок. Что вас интересует?';
      } else {
        return 'Здравствуйте! Я ваш персональный консультант по грибным добавкам spor3s. Расскажите, что вас беспокоит или какие цели хотите достичь? Помогу подобрать подходящие продукты.';
      }
    }
    return null; // fallback return
  }
  
  let allContent = '';
  const msgs = [...messages];
  for (let i = 0; i < 3; i++) { // максимум 3 достроя
    const content = await fetchCompletion(msgs);
    if (!content) {
      console.warn('[AI API] Пустой ответ от fetchCompletion, прерываю достройку.');
      break;
    }
    allContent += content;
    if (content.length < 400 || !content.includes('...')) {
      break; // если ответ короткий, не продолжаем
    }
    msgs.push({ role: 'assistant', content });
    msgs.push({ role: 'user', content: 'Продолжи.' });
  }
  // Убеждаемся, что reply всегда определена
  let reply = "";
  if (allContent && typeof allContent === 'string' && allContent.trim().length > 0) {
    reply = allContent;
  } else {
    // Fallback ответ если AI не вернул ответ
    reply = generateIntelligentFallback(messages, userSummary, productsInfo || '');
  }
  
  // Применяем логику замены тегов к финальному ответу
  // КРИТИЧНО: Для Mini App НЕ добавляем строку "Товар добавлен в корзину" здесь
  // Клиент сам решает, что показывать, на основе наличия тегов и проверки формы
  
  // КРИТИЧНО: Проверяем намерение пользователя, чтобы не добавлять ежовик/мухомор без формы
  const userMessageLower = message.toLowerCase();
  const userMentionsEzhOrMhm = /ежовик|мухомор/i.test(userMessageLower);
  const userMentionsForm = /порошок|капсул|шляпк/i.test(userMessageLower);
  const userExplicitAdd = /добав|закаж|купи|полож|оформ/i.test(userMessageLower);
  const userAvailabilityQuestion = /есть\s+(ли|у вас)?.*?(ежовик|мухомор)|какие|что\s+есть|расскажи|подскаж|хочу узнать|интересует|можно\s+узнать|есть\?\s*$/i.test(userMessageLower);
  const shouldForceRemoveByUserIntent =
    userMentionsEzhOrMhm &&
    (
      (!userMentionsForm && !userExplicitAdd) ||
      (!userExplicitAdd && userAvailabilityQuestion)
    );

  if (shouldForceRemoveByUserIntent) {
    reply = reply.replace(/\[add_to_cart:[\w-]+\]/g, '').trim();
    reply = reply.replace(/✅\s*Товар\s+добавлен\s+в\s+корзин[уа]!?\s*Что\s+еще\s+добавить\?/gi, '').trim();
    console.log('[AI API] ⚠️ КРИТИЧНО: Удалены теги и подтверждение из ответа — пользователь не указал форму/только спрашивает наличие');
  } else {
    // КРИТИЧНО: Проверяем, есть ли ежовик/мухомор БЕЗ формы непосредственно в ответе
    const hasEzhOrMhmInReply = /ежовик|мухомор/i.test(reply);
    const hasFormInReply = /порошок|капсул|порошк/i.test(reply);
    const shouldRemoveFromReply = hasEzhOrMhmInReply && !hasFormInReply;
    
    if (shouldRemoveFromReply) {
      // Удаляем теги и строку "✅ Товар добавлен в корзину!"
      reply = reply.replace(/\[add_to_cart:[\w-]+\]/g, '').trim();
      reply = reply.replace(/✅\s*Товар\s+добавлен\s+в\s+корзин[уа]!?\s*Что\s+еще\s+добавить\?/gi, '').trim();
      console.log('[AI API] ⚠️ КРИТИЧНО: Удалены теги и строка из ответа для ежовика/мухомора БЕЗ формы (по ответу)');
    }
  }
  
  if (/\[add_to_cart:[\w-]+\]/.test(reply)) {
    if (messageSource === 'mini_app') {
      // Для Mini App просто сохраняем теги - клиент сам обработает их
      // НЕ добавляем строку "Товар добавлен в корзину" - клиент сам решает!
      // Удаляем строку, если AI её добавила
      reply = reply.replace(/✅\s*Товар\s+добавлен\s+в\s+корзин[уа]!?\s*Что\s+еще\s+добавить\?/gi, '').trim();
      console.log('[AI API] Обнаружены теги [add_to_cart] для Mini App - клиент обработает их');
    } else {
      // Для других источников удаляем теги и добавляем ссылку
      reply = reply.replace(/\[add_to_cart:[\w-]+\]/g, '').trim();
      if (messageSource === 'telegram_bot') {
        reply += '\n\nДобавил все в корзину, продолжи оформление в приложении:\n👉 t.me/spor3s_bot\n\nИли укажите ФИО+телефон+адрес СДЭК для оформления здесь.';
      } else {
        reply += '\n\nДобавил все в корзину, продолжи оформление в приложении:\n👉 t.me/spor3s_bot';
      }
    }
  }
  
  // Заменяем теги remove_from_cart
  reply = reply.replace(/\[remove_from_cart:[\w-]+\]/g, '').trim();
  
  // Добавляем ссылку на приложение для внешних каналов (если еще не добавлена)
  if (messageSource !== 'mini_app' && !reply.includes('t.me/spor3s_bot')) {
    reply += '\n\nДля быстрого оформления используйте приложение: 👉 t.me/spor3s_bot';
  }
  
  // Сохраняем сообщения в Supabase, если есть user_id
  // Простая проверка UUID v4, чтобы не падать на тестовых строках
  if (isResolvedUserUuid && resolvedUserId) {
    try {
      // Сохраняем сообщение пользователя с указанием источника
      await saveMessageServer(resolvedUserId, 'user', message, messageSource);
      // Сохраняем ответ AI с указанием источника
      await saveMessageServer(resolvedUserId, 'assistant', reply, messageSource);
    } catch (error) {
      console.error('Ошибка сохранения сообщений в Supabase:', error);
    }
  }
  
  return NextResponse.json({ response: reply });
} 