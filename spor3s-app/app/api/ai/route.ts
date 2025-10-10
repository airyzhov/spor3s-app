import { NextRequest, NextResponse } from "next/server";
import { searchInstructionsServer, getUserOrdersServer, getUserMessagesServer, getUserSurveysServer, getProductsServer, saveMessageServer, getUserProfileServer } from "../../../../app/supabaseServerHelpers";
import { supabaseServer } from "../../../../app/supabaseServerClient";
import { scenariosPrompt } from "../../../../app/ai/scenarios";
import { ContentManager } from "../../../../lib/contentManager";

function forceAddToCartTag(text: string): string {
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
                             /заказ.*оформлен/i.test(text);
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
    for (const { keyword, id } of productMap) {
      const matches = keyword.test(text);
      console.log(`[AI API] Проверяем ${keyword}: ${matches} для ${id}`);
      if (matches) {
        fixed += ` [add_to_cart:${id}]`;
        console.log('[AI API] Добавлен тег:', id);
        foundProduct = true;
        break;
      }
    }
    if (!foundProduct) {
      console.log('[AI API] Продукт не найден в тексте:', text);
      // Принудительно добавляем fallback теги
      if (/мухомор.*180|мухомор.*180.*капсул/i.test(text)) {
        fixed += ` [add_to_cart:mhm180k]`;
        console.log('[AI API] Добавлен fallback тег для мухомора 180 капсул: mhm180k');
      } else if (/мухомор.*60|мухомор.*60.*капсул/i.test(text)) {
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
             } else if (/мухомор.*капсул/i.test(text)) {
         fixed += ` [add_to_cart:mhm60k]`;
         console.log('[AI API] Добавлен fallback тег для мухомора капсулы: mhm60k');
       } else if (/мухомор.*шляпк/i.test(text)) {
         fixed += ` [add_to_cart:mhm30]`;
         console.log('[AI API] Добавлен fallback тег для мухомора шляпки: mhm30');
       } else if (/мухомор/i.test(text)) {
         fixed += ` [add_to_cart:mhm30]`;
         console.log('[AI API] Добавлен fallback тег для мухомора: mhm30');
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
       } else if (/ежовик.*капсул|ежовик.*120/i.test(text)) {
         fixed += ` [add_to_cart:ezh120k]`;
         console.log('[AI API] Добавлен fallback тег для ежовика капсулы: ezh120k');
       } else if (/ежовик/i.test(text)) {
         fixed += ` [add_to_cart:ezh120k]`;
         console.log('[AI API] Добавлен fallback тег для ежовика: ezh120k');
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

function forceRemoveFromCartTag(text: string): string {
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

type ContextMessage = {
  role?: string;
  content?: string;
};

type DialogMessage = {
  role: string;
  content: string;
};

type ProductRecord = {
  id?: string;
  name?: string;
  price?: number;
  description?: string | null;
};

type AiRequestBody = {
  message: string;
  context?: ContextMessage[];
  source?: string;
  user_id?: string;
  products_prompt?: string;
  telegram_id?: string | number;
};

export async function POST(req: NextRequest) {
  let requestBody: AiRequestBody;
  
  try {
    const bodyText = await req.text();
    console.log('[AI API] Raw body:', bodyText);
    
    if (!bodyText || bodyText.trim() === '') {
      return NextResponse.json({ response: "Пустой запрос", error: 'EMPTY_REQUEST' }, { status: 400 });
    }
    
    requestBody = JSON.parse(bodyText) as AiRequestBody;
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
  
  const OR_TOKEN = process.env.OPENROUTER_API_KEY || "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";
  console.log("[AI API] OR_TOKEN length:", OR_TOKEN?.length || 0);
  console.log("[AI API] OR_TOKEN starts with:", OR_TOKEN?.substring(0, 10) || 'undefined');
  
  if (!OR_TOKEN || OR_TOKEN === 'undefined' || OR_TOKEN.length < 10) {
    console.error('[AI API] Invalid OR_TOKEN:', OR_TOKEN);
    return NextResponse.json({ response: "OpenRouter токен не найден.", error: 'NO_API_KEY' }, { status: 500 });
  }

  // Валидация входного сообщения
  if (typeof message !== 'string' || message.trim().length === 0) {
    return NextResponse.json({ response: 'Сообщение пустое.', error: 'EMPTY_MESSAGE' }, { status: 400 });
  }

  // Автоопределение user_id по telegram_id, если не передан
  let resolvedUserId: string | null = user_id || null;
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
  const messages: DialogMessage[] = [];
  
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

  async function fetchCompletion(msgs: DialogMessage[]): Promise<string | null> {
    try {
      // Используем переданные цены от Telegram бота или получаем из БД
      let productsInfo = '';
      
      if (products_prompt) {
        // Используем цены от Telegram бота
        productsInfo = products_prompt;
      } else {
        // Получаем актуальные продукты из базы данных для Mini App
        const products = (await getProductsServer()) as ProductRecord[];
        
        // Формируем строку с актуальными ценами
        productsInfo = "🛍️ АКТУАЛЬНЫЕ ЦЕНЫ И ПРОДУКТЫ:\n\n";
        
        // Группируем продукты по категориям
        const categories: Record<string, ProductRecord[]> = {
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
       
       const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
         method: "POST",
         headers: {
           "Authorization": `Bearer ${OR_TOKEN}`,
           "Content-Type": "application/json",
         },
         body: JSON.stringify({
           model: "openai/gpt-4o-mini",
           messages: [
             { role: "system", content: aiPrompt },
             { role: "user", content: userMessage }
           ],
           max_tokens: 600,
         }),
        signal: controller.signal,
       });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error('[AI API] HTTP Error:', response.status, response.statusText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

             const data = await response.json();
       
       if (!data.choices || !data.choices[0] || !data.choices[0].message) {
         console.error('[AI API] Invalid response structure:', data);
         throw new Error('Invalid AI response structure');
       }

              let aiResponse = data.choices[0].message.content;
              console.log('[AI API] Original AI Response:', aiResponse);
              

      
      const beforeForceAdd = aiResponse;
      console.log('[AI API] About to call forceAddToCartTag...');
      aiResponse = forceAddToCartTag(aiResponse);
      console.log('[AI API] After forceAddToCartTag:', aiResponse);
      console.log('[AI API] Changed:', beforeForceAdd !== aiResponse);
      console.log('[AI API] ForceAddToCartTag DEBUG - Input:', beforeForceAdd);
      console.log('[AI API] ForceAddToCartTag DEBUG - Output:', aiResponse);
       
       const beforeForceRemove = aiResponse;
       aiResponse = forceRemoveFromCartTag(aiResponse);
       console.log('[AI API] After forceRemoveFromCartTag:', aiResponse);
       
                 // Сохраняем теги для обработки, но заменяем их на предложение перехода в приложение
         let finalResponse = aiResponse;
         
                 // Заменяем теги add_to_cart на естественную фразу в зависимости от канала
        if (/\[add_to_cart:[\w-]+\]/.test(aiResponse)) {
          finalResponse = aiResponse.replace(/\[add_to_cart:[\w-]+\]/g, '').trim();
          
          if (messageSource === 'mini_app') {
            // В Mini App - товар уже добавлен в корзину приложения
            finalResponse += '\n\n✅ Товар добавлен в корзину! Что еще добавить?';
          } else if (messageSource === 'telegram_bot') {
            // В Telegram Bot - предлагаем перейти в приложение
            finalResponse += '\n\nДобавил все в корзину, продолжи оформление в приложении:\n👉 t.me/spor3s_bot\n\nИли укажите ФИО+телефон+адрес СДЭК для оформления здесь.';
          } else {
            // В Spor3z - персональный подход  
            finalResponse += '\n\nДобавил все в корзину, продолжи оформление в приложении:\n👉 t.me/spor3s_bot';
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
       
      // Получаем продукты для fallback ответов
      const products = (await getProductsServer()) as ProductRecord[];
     
      // Вспомогательная функция для нормализации названий
      const normalizeName = (value?: string) => (value || '').toLowerCase();
      
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
       if (userMessage.includes('шляпки')) {
         // Шляпки = мухомор 30г порошок
         return forceAddToCartTag(`Отлично! Добавил Мухомор 30г в корзину за 600₽. Он отлично помогает со сном и снимает стресс. Кстати, для лучшего эффекта рекомендую также Ежовик для улучшения памяти за 1200₽. Добавить его тоже? [add_to_cart:mhm30]`);
       }
       
       // Специальная обработка "30 гр" (высший приоритет)
       if (userMessage.includes('30 гр') || userMessage.includes('30гр')) {
         // 30 гр = мухомор 30г
         return forceAddToCartTag(`Отлично! Добавил Мухомор 30г в корзину за 600₽. Он отлично помогает со сном и снимает стресс. Кстати, для лучшего эффекта рекомендую также Ежовик для улучшения памяти за 1200₽. Добавить его тоже? [add_to_cart:mhm30]`);
       }
       
       // Специальная обработка "на месяц" (высший приоритет)
       if (userMessage.includes('на месяц') && userMessage.includes('мухомор')) {
         // на месяц = мухомор 30г
         return forceAddToCartTag(`Отлично! Добавил Мухомор 30г (месяц) в корзину за 600₽. Он отлично помогает со сном и снимает стресс. Кстати, для лучшего эффекта рекомендую также Ежовик для улучшения памяти за 1200₽. Добавить его тоже? [add_to_cart:mhm30]`);
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
        
        // Если это первый запрос о мухоморе, уточняем детали
        if (!hasAddContext && !userMessage.includes('добавь') && !userMessage.includes('закажи') && !userMessage.includes('купи') && !hasFormSpecification) {
          return `Отлично! Мухомор отлично помогает со сном и снимает стресс. 

В какой форме предпочитаете:
• Капсулы (удобно принимать, 60 капсул на месяц за 1400₽)
• Порошок из шляпок (быстрее эффект, 30г на месяц за 1400₽)

И на какой срок:
• Месяц (для начала)
• 3 месяца (курс, экономично)
• 6 месяцев (максимальный эффект)

Также у вас уже есть опыт приема добавок или начинаете впервые?`;
        }
        
        // Если пользователь уже указал форму и срок, добавляем в корзину
        let productId = 'mhm30';
        let productName = 'Мухомор 30г';
        
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
          if (userMessage.includes('капсул') || userMessage.includes('капсул')) {
            productId = 'mhm60k';
            productName = 'Мухомор 60 капсул (месяц)';
          } else if (userMessage.includes('шляпки') || userMessage.includes('порошок') || userMessage.includes('порошк')) {
            productId = 'mhm30';
            productName = 'Мухомор 30г (месяц)';
          } else {
            // По умолчанию для месяца - порошок 30г
            productId = 'mhm30';
            productName = 'Мухомор 30г (месяц)';
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

      } else if (userMessage.includes('капсулы') || userMessage.includes('порошок') || userMessage.includes('месяц')) {
        // Обработка уточнений формы и срока
        if (userMessage.includes('мухомор') || context.some(msg => msg.content?.includes('мухомор'))) {
          // Обработка мухомора
          let productId = 'mhm30';
          let productName = 'Мухомор 30г';
          
          // Приоритет: сначала проверяем "на месяц", потом "3 месяца"
          if (userMessage.includes('месяц') && !userMessage.includes('3') && !userMessage.includes('три') && !userMessage.includes('трех')) {
            // Мухомор на месяц
            if (userMessage.includes('капсул') || userMessage.includes('капсул')) {
              productId = 'mhm60k';
              productName = 'Мухомор 60 капсул (месяц)';
            } else if (userMessage.includes('шляпки') || userMessage.includes('порошок') || userMessage.includes('порошк')) {
              productId = 'mhm30';
              productName = 'Мухомор 30г (месяц)';
            } else {
              // По умолчанию для месяца - порошок 30г
              productId = 'mhm30';
              productName = 'Мухомор 30г (месяц)';
            }
          } else if (userMessage.includes('3') || userMessage.includes('три') || userMessage.includes('трех')) {
            // Мухомор на 3 месяца
            if (userMessage.includes('капсул') || userMessage.includes('капсул')) {
              productId = 'mhm180k';
              productName = 'Мухомор 180 капсул (3 месяца)';
            } else {
              productId = 'mhm100';
              productName = 'Мухомор 100г (3 месяца)';
            }
          } else if (userMessage.includes('капсул') || userMessage.includes('капсул')) {
            productId = 'mhm60k';
            productName = 'Мухомор 60 капсул';
          } else if (userMessage.includes('шляпки') || userMessage.includes('порошок') || userMessage.includes('порошк')) {
            productId = 'mhm30';
            productName = 'Мухомор 30г';
          }
          
          const product = findProduct(['мухомор']);
          const productTitle = product?.name || productName;
          const productPrice = product?.price ?? '1400';
          const ezhProduct = findProduct(['ежовик']);
          const ezhPrice = ezhProduct?.price ?? '1100';
          return forceAddToCartTag(`Отлично! Добавил ${productTitle} в корзину за ${productPrice}₽. Он отлично помогает со сном и снимает стресс. Кстати, для лучшего эффекта рекомендую также Ежовик для улучшения памяти за ${ezhPrice}₽. Добавить его тоже? [add_to_cart:${product?.id || productId}]`);
        } else if (userMessage.includes('ежовик') || context.some(msg => msg.content?.includes('ежовик'))) {
          // Обработка ежовика
          let productId = 'ezh120k';
          let productName = 'Ежовик 120 капсул';
          
          if (userMessage.includes('порошок')) {
            productId = 'ezh100';
            productName = 'Ежовик 100г порошок';
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
         return forceAddToCartTag(`Добавил ${product?.name || 'Кордицепс 50г'} в корзину за ${product?.price || '800'}₽! Он отлично повышает энергию и выносливость. Хотите также попробовать Мухомор для сна за ${findProduct(['мухомор'])?.price || '600'}₽? [add_to_cart:${productId}]`);
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
  let reply = allContent || "Извините, не удалось получить ответ.";
  
  // Применяем логику замены тегов к финальному ответу
  if (/\[add_to_cart:[\w-]+\]/.test(reply)) {
    if (messageSource === 'mini_app') {
      // Для Mini App сохраняем теги для обработки на фронтенде
      reply += '\n\n✅ Товар добавлен в корзину! Что еще добавить?';
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