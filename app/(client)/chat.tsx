"use client";
import { useState, useEffect, useRef } from "react";
import { useCart } from "../CartContext";
import { findProductByAITag } from "../../lib/productIdMap";
import { assetUrl } from "../../lib/cdn";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatProps {
  products: any[];
  setStep?: (step: number) => void;
}

export default function Chat({ products, setStep }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [userId, setUserId] = useState<string>('test-user-123456789');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { addToCart, removeFromCart } = useCart();
  
  // Кеш для подтверждения добавления товаров
  const [pendingProducts, setPendingProducts] = useState<Array<{id: string, name: string, price: number}>>([]);

  // Проверяем, что CartContext работает
  useEffect(() => {
    console.log('🔍 DEBUG: CartContext инициализирован');
    console.log('🔍 DEBUG: addToCart функция:', typeof addToCart);
    console.log('🔍 DEBUG: removeFromCart функция:', typeof removeFromCart);
  }, [addToCart, removeFromCart]);

  // Логируем продукты при загрузке компонента
  useEffect(() => {
    console.log('🔍 DEBUG: Продукты в чате:', products);
    console.log('🔍 DEBUG: Количество продуктов:', products?.length || 0);
    if (products && products.length > 0) {
      console.log('🔍 DEBUG: Доступные продукты:', products.map(p => ({ id: p.id, name: p.name })));
    }
  }, [products]);

  // Загружаем сохраненную историю чата
  useEffect(() => {
    // Не используем localStorage - браузер Telegram его ломает с Unicode
    // Всегда показываем приветственное сообщение
    setMessages([{
      id: '1',
      role: 'assistant',
      content: 'Привет! 🍄 Я консультант по грибным добавкам СПОРС.\n\nПомогу выбрать то, что вам нужно:\n\n🧠 Для памяти и концентрации — Ежовик\n😴 Для сна и стресса — Мухомор\n⚡ Для энергии — Кордицепс\n🌟 Полный комплекс — курс 4 в 1\n\n✅ Товары добавляются прямо в корзину приложения. Просто напишите что вас интересует или выберите товары ниже!',
      timestamp: new Date()
    }]);
  }, []);

  // Сохраняем историю чата при изменении (только для dev, не используется на практике в Telegram)
  useEffect(() => {
    if (messages.length > 0 && typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      // Не сохраняем в localStorage в production (Telegram WebApp)
      try {
        // Только для отладки в браузере
        console.log('[Chat History Debug] messages:', messages.length);
      } catch (e) {
        // игнорируем ошибки
      }
    }
  }, [messages]);

  // Инициализация пользователя из Telegram WebApp
  useEffect(() => {
    const initializeUser = async () => {
      try {
        // Проверяем, доступен ли Telegram WebApp
        let webApp;
        try {
          if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
            webApp = window.Telegram.WebApp;
          }
        } catch (e) {
          console.warn('⚠️ Telegram WebApp недоступен:', e);
          setMounted(true);
          return; // Выходим, если Telegram недоступен
        }
        
        if (webApp) {
          const initData = webApp.initDataUnsafe;
          
          // Обработка deep link с товаром (cart_<productId>)
          const startParam = initData?.start_param;
          if (startParam && startParam.startsWith('cart_')) {
            const productId = startParam.replace('cart_', '');
            console.log('🛒 Deep link: добавляем товар в корзину:', productId);
            
            // Ищем товар по ID или AI тегу
            const product = products.find(p => p.id === productId) || findProductByAITag(productId, products);
            if (product) {
              setTimeout(() => {
                addToCart({ id: product.id, name: product.name, price: product.price });
                console.log('✅ Товар добавлен из deep link:', product.name);
                // Переходим в каталог
                if (setStep) setStep(2);
              }, 500); // Ждём пока CartContext инициализируется
            } else {
              console.warn('⚠️ Товар не найден по deep link:', productId);
            }
          }
          
          if (initData && initData.user) {
            const telegramUserId = initData.user.id.toString();
            console.log('🔍 DEBUG: Telegram User ID:', telegramUserId);
            setUserId(telegramUserId);
            
            // Инициализируем пользователя в базе данных
            try {
              const response = await fetch('/api/init-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  telegram_id: telegramUserId,
                  name: initData.user.first_name || 'Пользователь'
                })
              });
              
              if (response.ok) {
                const data = await response.json();
                console.log('✅ Пользователь инициализирован:', data);
              } else {
                console.error('❌ Ошибка инициализации пользователя:', response.status);
              }
            } catch (error) {
              console.error('❌ Ошибка при запросе инициализации пользователя:', error);
              // Продолжаем работу без инициализации пользователя
            }
          } else {
            console.log('⚠️ Telegram пользователь не найден, используем тестовый ID');
          }
        } else {
          console.log('⚠️ Telegram WebApp недоступен, используем тестовый ID');
        }
      } catch (error) {
        console.error('❌ Ошибка инициализации Telegram WebApp:', error);
        // Продолжаем работу без инициализации пользователя
      } finally {
        setMounted(true);
      }
    };

    initializeUser();
  }, []);

  // Убрана автопрокрутка чата - пользователь сам контролирует позицию просмотра
  // const scrollToBottom = () => {
  //   messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  // };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !mounted) return;

    // Очистка истории чата при команде "очистить"
    if (input.trim().toLowerCase() === 'очистить' || input.trim().toLowerCase() === 'clear') {
      setMessages([{
        id: '1',
        role: 'assistant',
        content: 'История чата очищена! 🧹\n\nДобро пожаловать в spor3s! 🍄 Помогу выбрать грибные добавки:\n\n🧠 Для памяти и концентрации — Ежовик\n😴 Для сна и снятия стресса — Мухомор\n⚡ Для энергии — Кордицепс\n🌟 Комплексное решение — курс 4 в 1\n\nВыберите товары внизу или напишите что вас интересует!',
        timestamp: new Date()
      }]);
      setInput("");
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // DEBUG: проверяем состояние messages
      console.log('[Mini App Chat] messages.length:', messages.length);
      console.log('[Mini App Chat] messages:', messages);
      
      // Ограничиваем количество сообщений для отправки (последние 10 сообщений)
      const recentMessages = [...messages, userMessage].slice(-10);
      
      // Формируем контекст с ролями для AI
      const context = recentMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      console.log('[Mini App Chat] Отправляем контекст:', context.length, 'сообщений');
      console.log('[Mini App Chat] context:', context);
      
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input.trim(),
          context: context,  // передаем полную историю диалога
          user_id: userId,
          source: 'mini_app'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('AI Response:', data); // DEBUG

      // Исправляем обработку ответа - API возвращает data.response
      let aiContent = '';
      if (data.response) {
        aiContent = data.response;
      } else {
        aiContent = "Извините, не удалось получить ответ.";
      }

      // КРИТИЧНО: Проверяем сообщение пользователя ПЕРЕД парсингом тегов!
      // Проверяем ВСЕ сообщения пользователя, включая текущее
      const allUserMessages = [...messages.filter(m => m.role === 'user').map(m => m.content), input.trim()];
      const allMessagesText = allUserMessages.join(' ').toLowerCase();
      
      // КРИТИЧНО: Если пользователь спросил про ежовик/мухомор БЕЗ формы - удаляем теги ДО парсинга!
      const userHasEzhOrMhm = /ежовик|мухомор/i.test(allMessagesText);
      const userHasForm = /порошок|капсул|порошк|шляпк/i.test(allMessagesText);
      const userWantsToAdd = /добав|закаж|купи|полож|оформ/i.test(allMessagesText);
      // КРИТИЧНО: Проверяем, что это НЕ вопрос о наличии
      const isQuestionAboutAvailability = /есть\s+(ли|у вас)?.*?(ежовик|мухомор)|какие|что\s+есть|расскажи|подскаж|хочу узнать|интересует|можно\s+узнать|есть\?\s*$/i.test(allMessagesText);
      
      console.log('[Mini App] 🔍 РАННЯЯ проверка пользователя:', {
        userHasEzhOrMhm,
        userHasForm,
        userWantsToAdd,
        isQuestionAboutAvailability,
        shouldBlock: (userHasEzhOrMhm && !userHasForm && !userWantsToAdd) || isQuestionAboutAvailability,
        allMessagesText: allMessagesText.substring(0, 200)
      });
      
      // КРИТИЧНО: Если форма НЕ указана ИЛИ это вопрос о наличии - удаляем теги ДО парсинга!
      if ((userHasEzhOrMhm && !userHasForm && !userWantsToAdd) || isQuestionAboutAvailability) {
        console.log('[Mini App] ⚠️ КРИТИЧНО: Форма НЕ указана - удаляем теги ДО парсинга!');
        const tagsBefore = [...aiContent.matchAll(/\[add_to_cart:([\w-]+)\]/g)].map(m => m[1]);
        console.log('[Mini App] Теги ДО удаления:', tagsBefore);
        aiContent = aiContent.replace(/\[add_to_cart:[\w-]+\]/g, '').trim();
        aiContent = aiContent.replace(/✅\s*Товар\s+добавлен\s+в\s+корзин[уа]!?\s*Что\s+еще\s+добавить\?/gi, '').trim();
        const tagsAfter = [...aiContent.matchAll(/\[add_to_cart:([\w-]+)\]/g)].map(m => m[1]);
        console.log('[Mini App] Теги ПОСЛЕ удаления:', tagsAfter);
      }

      // Парсим теги и выполняем действия ОДИН РАЗ при получении ответа
      const addToCartMatches = [...aiContent.matchAll(/\[add_to_cart:([\w-]+)\]/g)];
      const removeFromCartMatches = [...aiContent.matchAll(/\[remove_from_cart:([\w-]+)\]/g)];
      let uniqueAddProductIds = [...new Set(addToCartMatches.map(m => m[1]))];
      const uniqueRemoveProductIds = [...new Set(removeFromCartMatches.map(m => m[1]))];
      
      console.log('🛒 DEBUG: AI Content:', aiContent);
      console.log('🛒 DEBUG: Add to cart matches:', addToCartMatches);
      console.log('🛒 DEBUG: Unique add product IDs (from tags):', uniqueAddProductIds);
      console.log('🛒 DEBUG: Available products:', products.map(p => ({ id: p.id, name: p.name })));
      
      // Более строгая проверка формы продукта - только явные упоминания
      const hasPowderKeyword = /\bпорошок|\bпорошк|в\s+порошке|порошке|порошоком|порошков/i.test(allMessagesText);
      const hasCapsulesKeyword = /\bкапсул|капсулы|капсул/i.test(allMessagesText);
      
      // КРИТИЧНО: Форма считается указанной только если явно упомянута пользователем
      const userWantsPowder = hasPowderKeyword && !hasCapsulesKeyword;
      const userWantsCapsules = hasCapsulesKeyword && !hasPowderKeyword;
      
      console.log('[Mini App] 🔍 СТРОГАЯ проверка формы:', {
        allMessagesText: allMessagesText.substring(0, 200),
        hasPowderKeyword,
        hasCapsulesKeyword,
        userWantsPowder,
        userWantsCapsules,
        'ФОРМА УКАЗАНА': userWantsPowder || userWantsCapsules,
        uniqueAddProductIds,
        input: input.trim()
      });
      
      // Маппинг продуктов с несколькими формами
      const productFormMap: Record<string, { powder: string[], capsules: string[], name: string, isPowderOnly?: boolean }> = {
        'ezh': { powder: ['ezh100', 'ezh300', 'ezh500'], capsules: ['ezh120k', 'ezh360k'], name: 'Ежовик' },
        'mhm': { powder: ['mhm30', 'mhm50', 'mhm100'], capsules: ['mhm60k', 'mhm180k'], name: 'Мухомор' },
        'kor': { powder: ['kor50', 'kor150'], capsules: [], name: 'Кордицепс Милитарис плодовые тела', isPowderOnly: false },
        'ci': { powder: ['ci30', 'ci90'], capsules: [], name: 'Цистозира', isPowderOnly: false }
      };
      
      // Инициализируем переменные для проверки формы
      let needsFormClarification = false;
      let clarificationProduct: { prefix: string, name: string, powder: string[], capsules: string[] } | null = null;
      
      // КРИТИЧНО: Сначала проверяем, есть ли товары ежовика или мухомора без указания формы
      // Если есть - сразу удаляем теги и спрашиваем уточнение
      const hasEzhOrMhm = uniqueAddProductIds.some(id => id.startsWith('ezh') || id.startsWith('mhm'));
      if (hasEzhOrMhm && !userWantsPowder && !userWantsCapsules) {
        console.log('[Mini App] ⚠️ КРИТИЧНО: Обнаружен ежовик или мухомор БЕЗ указания формы');
        console.log('[Mini App] ⚠️ Удаляем ВСЕ теги [add_to_cart] из ответа');
        // Определяем, какой именно продукт (ежовик или мухомор)
        const detectedProduct = uniqueAddProductIds.find(id => id.startsWith('ezh') || id.startsWith('mhm'));
        if (detectedProduct) {
          const prefix = detectedProduct.startsWith('ezh') ? 'ezh' : 'mhm';
          clarificationProduct = { 
            prefix, 
            name: productFormMap[prefix].name, 
            powder: productFormMap[prefix].powder, 
            capsules: productFormMap[prefix].capsules 
          };
        }
        // Удаляем ВСЕ теги [add_to_cart] из ответа
        aiContent = aiContent.replace(/\[add_to_cart:[\w-]+\]/g, '').trim();
        // Очищаем список товаров - ЭТО КРИТИЧНО!
        uniqueAddProductIds = [];
        // Устанавливаем флаг для уточнения
        needsFormClarification = true;
        console.log('[Mini App] ⚠️ КРИТИЧНО: uniqueAddProductIds очищен, товары НЕ будут добавлены');
      }
      
      // Проверяем вес, указанный пользователем (500г, 300г, 100г, 120 капсул, 360 капсул)
      const has500g = /500|500г|500\s*гр/i.test(allMessagesText);
      const has300g = /300|300г|300\s*гр/i.test(allMessagesText);
      const has100g = /100|100г|100\s*гр/i.test(allMessagesText);
      const has120caps = /120|120\s*капсул/i.test(allMessagesText);
      const has360caps = /360|360\s*капсул/i.test(allMessagesText);
      
      // Проверяем и корректируем товары в зависимости от формы и веса
      // (needsFormClarification и clarificationProduct уже определены выше)
      let correctedProductIds = [...uniqueAddProductIds];
      
      // Функция для выбора правильного продукта с учетом веса
      const selectProductByWeight = (forms: { powder: string[], capsules: string[] }, isPowder: boolean) => {
        if (isPowder) {
          // Проверяем вес в порядке приоритета (500 > 300 > 100)
          if (has500g) {
            const product500 = forms.powder.find(p => p.includes('500') || p === 'ezh500');
            if (product500) return product500;
          }
          if (has300g) {
            const product300 = forms.powder.find(p => p.includes('300') || p === 'ezh300');
            if (product300) return product300;
          }
          if (has100g) {
            const product100 = forms.powder.find(p => p.includes('100') || p === 'ezh100');
            if (product100) return product100;
          }
          // Если вес не указан, возвращаем первый доступный
          return forms.powder[0];
        } else {
          // Проверяем количество капсул (360 > 120)
          if (has360caps) {
            const product360 = forms.capsules.find(p => p.includes('360') || p === 'ezh360k');
            if (product360) return product360;
          }
          if (has120caps) {
            const product120 = forms.capsules.find(p => p.includes('120') || p === 'ezh120k');
            if (product120) return product120;
          }
          // Если количество не указано, возвращаем первый доступный
          return forms.capsules[0];
        }
      };
      
      // КРИТИЧНО: Проверяем каждый товар, который хочет добавить AI
      // Для ежовика и мухомора ОБЯЗАТЕЛЬНО нужна форма, даже если AI добавил тег
      const productsToRemove: string[] = [];
      for (let i = 0; i < uniqueAddProductIds.length; i++) {
        const productId = uniqueAddProductIds[i];
        for (const [prefix, forms] of Object.entries(productFormMap)) {
          if (productId.startsWith(prefix)) {
            // Проверяем, есть ли у продукта обе формы (порошок И капсулы)
            // Это относится к ежовику (ezh) и мухомору (mhm)
            if (forms.powder.length > 0 && forms.capsules.length > 0) {
              // КРИТИЧНО: Если форма НЕ указана явно - ОБЯЗАТЕЛЬНО нужно уточнение
              // Даже если AI добавил тег (например, mhm60k или ezh120k) - удаляем его и спрашиваем
              if (!userWantsPowder && !userWantsCapsules) {
                needsFormClarification = true;
                clarificationProduct = { prefix, name: forms.name, powder: forms.powder, capsules: forms.capsules };
                console.log(`[Mini App] ⚠️ КРИТИЧНО: Форма продукта ${forms.name} (${productId}) НЕ указана пользователем`);
                console.log(`[Mini App] ⚠️ Тег [add_to_cart:${productId}] будет удален, форма будет уточнена`);
                // Помечаем этот товар для удаления из списка
                productsToRemove.push(productId);
                break;
              }
              // Если пользователь хочет порошок, но AI добавил капсулы - заменяем
              else if (userWantsPowder && forms.capsules.includes(productId)) {
                const correctProduct = selectProductByWeight(forms, true);
                correctedProductIds[i] = correctProduct;
                console.log(`[Mini App] 🔄 Коррекция: ${productId} → ${correctProduct} (пользователь хочет порошок${has500g ? ' 500г' : has300g ? ' 300г' : has100g ? ' 100г' : ''})`);
                // Обновляем тег в ответе AI
                aiContent = aiContent.replace(
                  new RegExp(`\\[add_to_cart:${productId}\\]`, 'g'),
                  `[add_to_cart:${correctProduct}]`
                );
              }
              // Если пользователь хочет капсулы, но AI добавил порошок - заменяем
              else if (userWantsCapsules && forms.powder.includes(productId)) {
                const correctProduct = selectProductByWeight(forms, false);
                correctedProductIds[i] = correctProduct;
                console.log(`[Mini App] 🔄 Коррекция: ${productId} → ${correctProduct} (пользователь хочет капсулы${has360caps ? ' 360' : has120caps ? ' 120' : ''})`);
                // Обновляем тег в ответе AI
                aiContent = aiContent.replace(
                  new RegExp(`\\[add_to_cart:${productId}\\]`, 'g'),
                  `[add_to_cart:${correctProduct}]`
                );
              }
            }
          }
        }
        if (needsFormClarification) break;
      }
      
      // Удаляем товары, которые требуют уточнения формы
      correctedProductIds = correctedProductIds.filter(id => !productsToRemove.includes(id));
      
      // Обновляем список товаров с учетом коррекций
      uniqueAddProductIds = [...new Set(correctedProductIds)];
      
      // Если форма не указана - ОБЯЗАТЕЛЬНО не добавляем в корзину, очищаем теги из ответа
      if (needsFormClarification && clarificationProduct) {
        // Убираем теги [add_to_cart] из ответа ПЕРЕД отображением (на всякий случай еще раз)
        aiContent = aiContent.replace(/\[add_to_cart:[\w-]+\]/g, '').trim();
        
        // Очищаем список товаров для добавления (на всякий случай еще раз)
        uniqueAddProductIds = [];
        
        // Добавляем вопрос об уточнении формы
        let clarificationMessage = '';
        if (clarificationProduct.name === 'Цистозира') {
          clarificationMessage = `📋 **Уточните вариант:**

Для ${clarificationProduct.name} доступны варианты:

• **30г на месяц** - 500₽
• **90г на 3 месяца** - 1350₽

Какой вариант вы предпочитаете?`;
        } else if (clarificationProduct.name.includes('Кордицепс')) {
          clarificationMessage = `📋 **Уточните вариант:**

Для ${clarificationProduct.name} доступны варианты:

• **50г на месяц** - одна упаковка
• **150г на курс** - три упаковки

Какой вариант вы предпочитаете?`;
        } else {
          // Для ежовика и мухомора
          clarificationMessage = `📋 **Уточните форму продукта:**

Для ${clarificationProduct.name} доступны две формы:

• **Порошок** - быстрее эффект, удобно для опытных пользователей
• **Капсулы** - удобно принимать, идеально для новичков

Какую форму вы предпочитаете? Напишите "порошок" или "капсулы".`;
        }
        
        aiContent += '\n\n' + clarificationMessage;
        
        // НЕ добавляем товары в корзину - это критично!
        console.log('[Mini App] ⚠️ Форма не указана, товары НЕ будут добавлены в корзину');
        console.log('[Mini App] ⚠️ uniqueAddProductIds после очистки:', uniqueAddProductIds);
        
        // КРИТИЧНО: Убеждаемся, что список пуст и не будет обработан дальше
        uniqueAddProductIds = [];
      }
      
      // Логируем финальный список товаров после коррекций
      console.log('[Mini App] 🔍 ФИНАЛЬНАЯ проверка перед добавлением:', {
        needsFormClarification,
        uniqueAddProductIdsLength: uniqueAddProductIds.length,
        uniqueAddProductIds,
        clarificationProduct: clarificationProduct?.name || 'нет'
      });
      
      // КРИТИЧНО: Если форма не указана, ВСЕГДА очищаем список
      if (needsFormClarification) {
        uniqueAddProductIds = [];
        console.log('[Mini App] ⚠️ КРИТИЧНО: needsFormClarification=true, список очищен окончательно');
        // УБЕЖДАЕМСЯ что список пуст - это критично!
        if (uniqueAddProductIds.length > 0) {
          console.error('[Mini App] ❌ ОШИБКА: uniqueAddProductIds не очищен!');
          uniqueAddProductIds = [];
        }
      }

      // КРИТИЧНО: Проверяем, что для ежовика и мухомора без формы список пуст
      const hasEzhOrMhmWithoutForm = uniqueAddProductIds.some(id => {
        const isEzh = id.startsWith('ezh');
        const isMhm = id.startsWith('mhm');
        return (isEzh || isMhm) && !userWantsPowder && !userWantsCapsules;
      });
      
      if (hasEzhOrMhmWithoutForm) {
        console.log('[Mini App] ⚠️ КРИТИЧНО: Обнаружен ежовик/мухомор без формы в финальном списке! Очищаем!');
        uniqueAddProductIds = uniqueAddProductIds.filter(id => !id.startsWith('ezh') && !id.startsWith('mhm'));
        needsFormClarification = true;
      }

      // Проверяем, есть ли подтверждение добавления товаров
      const isConfirmAdd = /да|подтверждаю|добавь|добавить|добавляй|ок|хорошо|согласен/i.test(input.trim().toLowerCase());
      
      // Если есть подтверждение и есть товары в ожидании - добавляем их
      if (isConfirmAdd && pendingProducts.length > 0) {
        console.log('[Mini App] ✅ Подтверждение получено, добавляем товары в корзину');
        pendingProducts.forEach((product) => {
          const fullProduct = products.find(p => p.id === product.id);
          if (fullProduct) {
            addToCart(fullProduct);
            console.log(`🛒 Добавлен в корзину: ${product.name}`);
            
            // Показываем уведомление
            const notification = document.createElement('div');
            notification.style.cssText = `
              position: fixed;
              top: 20px;
              right: 20px;
              background: linear-gradient(45deg, #28a745, #20c997);
              color: white;
              padding: 20px 25px;
              border-radius: 15px;
              font-weight: 700;
              font-size: 16px;
              z-index: 99999;
              box-shadow: 0 8px 25px rgba(40, 167, 69, 0.4);
              animation: slideInRight 0.4s ease-out;
              max-width: 350px;
              word-wrap: break-word;
              border: 2px solid rgba(255, 255, 255, 0.2);
              backdrop-filter: blur(10px);
            `;
            notification.innerHTML = `
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="font-size: 24px;">✅</div>
                <div>
                  <div style="font-weight: 700; margin-bottom: 4px;">${product.name}</div>
                  <div style="font-size: 14px; opacity: 0.9;">Добавлен в корзину!</div>
                </div>
              </div>
            `;
            document.body.appendChild(notification);
            
            setTimeout(() => {
              notification.style.animation = 'slideOutRight 0.4s ease-out';
              setTimeout(() => {
                if (notification.parentNode) {
                  notification.parentNode.removeChild(notification);
                }
              }, 400);
            }, 3000);
          }
        });
        
        // Очищаем список ожидающих товаров
        setPendingProducts([]);
        
        // Добавляем подтверждение в сообщения
        const confirmationMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: input.trim(),
          timestamp: new Date()
        };
        setMessages(prev => [...prev, confirmationMessage]);
        
        // Добавляем ответ об успешном добавлении
        const successMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `✅ Товары добавлены в корзину!\n\n${pendingProducts.map(p => `• ${p.name} - ${p.price}₽`).join('\n')}\n\nМожете перейти в корзину для оформления заказа.`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, successMessage]);
        setInput("");
        setIsLoading(false);
        return;
      }

      // КРИТИЧНО: ВСЕГДА показываем подтверждение перед добавлением, даже если форма указана
      // Если форма указана и есть товары для добавления - показываем подтверждение
      // НО ТОЛЬКО если форма была указана и список не пуст
      // И КРИТИЧНО: если это ежовик или мухомор - проверяем форму еще раз!
      const hasEzhOrMhmInList = uniqueAddProductIds.some(id => id.startsWith('ezh') || id.startsWith('mhm'));
      const shouldBlock = hasEzhOrMhmInList && !userWantsPowder && !userWantsCapsules;
      
      if (shouldBlock) {
        console.log('[Mini App] ⚠️ КРИТИЧНО: Обнаружен ежовик/мухомор без формы в финальном списке перед подтверждением!');
        // КРИТИЧНО: Определяем продукт ДО очистки списка!
        const detectedProduct = uniqueAddProductIds.find(id => id.startsWith('ezh') || id.startsWith('mhm'));
        if (detectedProduct && !clarificationProduct) {
          const prefix = detectedProduct.startsWith('ezh') ? 'ezh' : 'mhm';
          clarificationProduct = { 
            prefix, 
            name: productFormMap[prefix].name, 
            powder: productFormMap[prefix].powder, 
            capsules: productFormMap[prefix].capsules 
          };
        }
        // Теперь очищаем список
        uniqueAddProductIds = [];
        needsFormClarification = true;
        console.log('[Mini App] ⚠️ КРИТИЧНО: Список очищен, needsFormClarification=true');
      }
      
      if (!needsFormClarification && uniqueAddProductIds.length > 0 && !shouldBlock) {
        console.log('[Mini App] 📋 Проверка перед подтверждением:', {
          needsFormClarification,
          uniqueAddProductIdsLength: uniqueAddProductIds.length,
          uniqueAddProductIds,
          hasEzhOrMhmInList,
          shouldBlock
        });
        console.log('[Mini App] 📋 Формируем подтверждение для добавления товаров');
        
        // Получаем информацию о товарах
        const productsToAdd: Array<{id: string, name: string, price: number}> = [];
        
        for (const productId of uniqueAddProductIds) {
          const product = findProductByAITag(productId, products);
          if (product) {
            productsToAdd.push({
              id: product.id,
              name: product.name,
              price: product.price || 0
            });
          }
        }
        
        if (productsToAdd.length > 0) {
          // Сохраняем товары для подтверждения
          setPendingProducts(productsToAdd);
          
          // Формируем сообщение с деталями товаров
          const totalPrice = productsToAdd.reduce((sum, p) => sum + p.price, 0);
          const confirmationMessage = `📋 **Подтвердите добавление в корзину:**

${productsToAdd.map(p => `• **${p.name}** - ${p.price}₽`).join('\n')}

💰 **Итого:** ${totalPrice}₽

✅ Напишите "да" или "подтверждаю" для добавления в корзину
❌ Или укажите, что нужно изменить`;
          
          // Убираем теги из ответа AI
          aiContent = aiContent.replace(/\[add_to_cart:[\w-]+\]/g, '').trim();
          
          // Добавляем сообщение с подтверждением
          aiContent += '\n\n' + confirmationMessage;
          
          // ОБЯЗАТЕЛЬНО очищаем список товаров, чтобы они НЕ добавлялись автоматически
          uniqueAddProductIds = [];
          
          // НЕ добавляем товары в корзину сразу - ждем подтверждения
          console.log('[Mini App] ⏳ Товары сохранены для подтверждения, ожидаем ответ пользователя');
          console.log('[Mini App] ⚠️ КРИТИЧНО: uniqueAddProductIds очищен, товары НЕ будут добавлены автоматически');
          console.log('[Mini App] ⚠️ КРИТИЧНО: uniqueAddProductIds.length =', uniqueAddProductIds.length);
        }
      }
      
      // Старая логика автоматического добавления удалена - теперь всегда нужно подтверждение

      // Удаляем товары из корзины
      uniqueRemoveProductIds.forEach((aiTag) => {
        const product = findProductByAITag(aiTag, products);
        if (product) {
          removeFromCart(product.id);
          console.log(`🗑️ Автоматически удален из корзины: ${product.name}`);

          // Показываем уведомление об автоматическом удалении
          const notification = document.createElement('div');
          notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(45deg, #dc3545, #c82333);
            color: white;
            padding: 20px 25px;
            border-radius: 15px;
            font-weight: 700;
            font-size: 16px;
            z-index: 99999;
            box-shadow: 0 8px 25px rgba(220, 53, 69, 0.4);
            animation: slideInRight 0.4s ease-out;
            max-width: 350px;
            word-wrap: break-word;
            border: 2px solid rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
          `;
          notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="font-size: 24px;">🗑️</div>
              <div>
                <div style="font-weight: 700; margin-bottom: 4px;">${product.name}</div>
                <div style="font-size: 14px; opacity: 0.9;">Удален из корзины!</div>
              </div>
            </div>
          `;
          document.body.appendChild(notification);

          // Удаляем уведомление через 4 секунды
          setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.4s ease-out';
            setTimeout(() => {
              if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
              }
            }, 400);
          }, 4000);
        }
      });

      // КРИТИЧНО: Финальная проверка перед добавлением сообщения
      // Если needsFormClarification = true, товары НЕ должны быть в списке
      if (needsFormClarification) {
        uniqueAddProductIds = [];
        console.log('[Mini App] ⚠️ КРИТИЧНО: Финальная проверка - needsFormClarification=true, список очищен');
      }
      
      // КРИТИЧНО: Убеждаемся, что для ежовика/мухомора без формы список пуст
      const finalCheck = uniqueAddProductIds.some(id => {
        const isEzh = id.startsWith('ezh');
        const isMhm = id.startsWith('mhm');
        return (isEzh || isMhm) && !userWantsPowder && !userWantsCapsules;
      });
      
      if (finalCheck) {
        console.error('[Mini App] ❌ КРИТИЧЕСКАЯ ОШИБКА: Ежовик/мухомор без формы в финальном списке! Очищаем!');
        uniqueAddProductIds = [];
        needsFormClarification = true;
        // Удаляем теги из ответа еще раз
        aiContent = aiContent.replace(/\[add_to_cart:[\w-]+\]/g, '').trim();
      }
      
      // КРИТИЧНО: Если список не пуст, но needsFormClarification=true - это ошибка!
      if (needsFormClarification && uniqueAddProductIds.length > 0) {
        console.error('[Mini App] ❌ КРИТИЧЕСКАЯ ОШИБКА: needsFormClarification=true, но список не пуст!', uniqueAddProductIds);
        uniqueAddProductIds = [];
      }
      
      console.log('[Mini App] 🔍 ФИНАЛЬНАЯ проверка перед добавлением сообщения:', {
        needsFormClarification,
        uniqueAddProductIdsLength: uniqueAddProductIds.length,
        uniqueAddProductIds,
        finalCheck,
        'ТОВАРЫ БУДУТ ДОБАВЛЕНЫ': uniqueAddProductIds.length > 0 && !needsFormClarification
      });

      const aiMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: aiContent,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: "Извините, произошла ошибка. Попробуйте еще раз.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = (productId: string) => {
    console.log(`🛒 DEBUG: handleAddToCart вызвана с productId: ${productId}`);
    console.log(`🛒 DEBUG: Доступные продукты:`, products);
    
    const product = products.find(p => p.id === productId);
    console.log(`🛒 DEBUG: Найденный продукт:`, product);
    
    if (product) {
      console.log(`🛒 DEBUG: Добавляем в корзину:`, product);
      addToCart(product);
      
      // Добавляем сообщение в чат
      const cartMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `✅ **${product.name}** добавлен в корзину! (${product.price}₽)\n\nТовар появился в вашей корзине. Продолжайте делать покупки или перейдите в корзину для оформления заказа.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, cartMessage]);
      
      // Показываем уведомление об успешном добавлении
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(45deg, #28a745, #20c997);
        color: white;
        padding: 20px 25px;
        border-radius: 15px;
        font-weight: 700;
        font-size: 16px;
        z-index: 99999;
        box-shadow: 0 8px 25px rgba(40, 167, 69, 0.4);
        animation: slideInRight 0.4s ease-out;
        max-width: 350px;
        word-wrap: break-word;
        border: 2px solid rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
      `;
      notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="font-size: 24px;">✅</div>
          <div>
            <div style="font-weight: 700; margin-bottom: 4px;">${product.name}</div>
            <div style="font-size: 14px; opacity: 0.9;">Добавлен в корзину!</div>
          </div>
        </div>
      `;
      document.body.appendChild(notification);
      
      // Добавляем звуковой эффект (если доступен)
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
        audio.volume = 0.3;
        audio.play().catch(() => {});
      } catch (e) {}
      
      // Удаляем уведомление через 4 секунды
      setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.4s ease-out';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 400);
      }, 4000);
      
      console.log(`🛒 Товар добавлен в корзину: ${product.name}`);
    } else {
      console.error(`❌ DEBUG: Продукт с ID ${productId} не найден!`);
      console.error(`❌ DEBUG: Доступные ID:`, products.map(p => p.id));
    }
  };

  const handleOrderNow = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      addToCart(product);
      
      // Показываем уведомление и переходим к заказу
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(45deg, #ff00cc, #3333ff);
        color: white;
        padding: 20px 25px;
        border-radius: 15px;
        font-weight: 700;
        font-size: 16px;
        z-index: 99999;
        box-shadow: 0 8px 25px rgba(255, 0, 204, 0.4);
        animation: slideInRight 0.4s ease-out;
        max-width: 350px;
        word-wrap: break-word;
        border: 2px solid rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
      `;
      notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="font-size: 24px;">⚡</div>
          <div>
            <div style="font-weight: 700; margin-bottom: 4px;">${product.name}</div>
            <div style="font-size: 14px; opacity: 0.9;">Добавлен! Переходим к заказу...</div>
          </div>
        </div>
      `;
      document.body.appendChild(notification);
      
      // Добавляем звуковой эффект (если доступен)
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
        audio.volume = 0.3;
        audio.play().catch(() => {});
      } catch (e) {}
      
      // Переходим к оформлению заказа через 1.5 секунды
      setTimeout(() => {
        if (setStep) setStep(3);
        
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 2000);
      }, 1500);
      
      console.log(`⚡ Быстрый заказ: ${product.name}`);
    }
  };

  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user';
    let content = message.content;

    // Парсим action-кнопки только для AI сообщений
    if (!isUser) {
      // Исправляем регулярные выражения
      const addToCartMatches = [...content.matchAll(/\[add_to_cart:([\w-]+)\]/g)];
      const removeFromCartMatches = [...content.matchAll(/\[remove_from_cart:([\w-]+)\]/g)];
      const orderNowMatches = [...content.matchAll(/\[order_now:([\w-]+)\]/g)];
      const showInfoMatches = [...content.matchAll(/\[show_info:([\w-]+)\]/g)];

      console.log('🔍 DEBUG: Парсинг AI сообщения:', { 
        content: content.substring(0, 200) + '...',
        addToCartMatches: addToCartMatches.map(m => m[1]), 
        removeFromCartMatches: removeFromCartMatches.map(m => m[1]),
        orderNowMatches: orderNowMatches.map(m => m[1]),
        showInfoMatches: showInfoMatches.map(m => m[1]),
        productsAvailable: products.map(p => ({ id: p.id, name: p.name }))
      }); // DEBUG

      // Убираем маркеры из текста для отображения
      content = content
        .replace(/\[add_to_cart:[\w-]+\]/g, '')
        .replace(/\[remove_from_cart:[\w-]+\]/g, '')
        .replace(/\[order_now:[\w-]+\]/g, '')
        .replace(/\[show_info:[\w-]+\]/g, '')
        .trim();

      console.log('🧹 DEBUG: Очищенный текст для отображения:', content);

      return (
        <div key={message.id} style={{ marginBottom: 20 }}>
          <div style={{
            background: "#2a2a5a",
            padding: 15,
            borderRadius: 12,
            maxWidth: "80%",
            marginLeft: 0,
            border: "1px solid rgba(255, 255, 255, 0.1)"
          }}>
            <div style={{ color: "#fff", lineHeight: 1.5 }}>
              {content.split('\n').map((line, i) => (
                <p key={i} style={{ margin: i === 0 ? 0 : '10px 0 0 0' }}>{line}</p>
              ))}
            </div>

            {/* Убираем кнопки - товары добавляются автоматически */}
            {/* Кнопки действий показываем только для удаления и быстрого заказа */}
            {(removeFromCartMatches.length > 0 || orderNowMatches.length > 0 || showInfoMatches.length > 0) && (
              <div style={{ marginTop: 15, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {/* Кнопки удаления из корзины */}
                {removeFromCartMatches.map((m, i) => {
                  const productId = m[1];
                  const product = products.find(p => p.id === productId);
                  console.log(`🔍 DEBUG: Обрабатываем кнопку удаления для ${productId}:`, product);
                  return (
                    <button
                      key={`remove-${i}`}
                      onClick={() => {
                        console.log(`❌ DEBUG: Нажата кнопка удаления для ${productId}`);
                        removeFromCart(productId);
                      }}
                      style={{
                        background: "linear-gradient(45deg, #dc3545, #c82333)",
                        color: "white",
                        border: "none",
                        borderRadius: "20px",
                        padding: "8px 16px",
                        fontSize: "14px",
                        cursor: "pointer",
                        transition: "background 0.2s"
                      }}
                    >
                      ❌ Удалить {product?.name || productId}
                    </button>
                  );
                })}
                
                {/* Кнопки быстрого заказа */}
                {orderNowMatches.map((m, i) => {
                  const productId = m[1];
                  const product = products.find(p => p.id === productId);
                  console.log(`🔍 DEBUG: Обрабатываем кнопку быстрого заказа для ${productId}:`, product);
                  return (
                    <button
                      key={`order-${i}`}
                      onClick={() => {
                        console.log(`⚡ DEBUG: Нажата кнопка быстрого заказа для ${productId}`);
                        handleOrderNow(productId);
                      }}
                      style={{
                        background: "linear-gradient(45deg, #ff00cc, #3333ff)",
                        color: "white",
                        border: "none",
                        borderRadius: "20px",
                        padding: "8px 16px",
                        fontSize: "14px",
                        cursor: "pointer",
                        transition: "background 0.2s"
                      }}
                    >
                      ⚡ Заказать {product?.name || productId}
                    </button>
                  );
                })}
                
                {/* Кнопки показа информации */}
                {showInfoMatches.map((m, i) => {
                  const productId = m[1];
                  const product = products.find(p => p.id === productId);
                  console.log(`🔍 DEBUG: Обрабатываем кнопку информации для ${productId}:`, product);
                  return (
                    <button
                      key={`info-${i}`}
                      onClick={() => {
                        console.log(`ℹ️ DEBUG: Нажата кнопка информации для ${productId}`);
                        // Показываем информацию о продукте
                        const infoMessage = `ℹ️ **${product?.name || productId}**\n\nЦена: ${product?.price || 'N/A'}₽\nОписание: ${product?.description || 'Описание недоступно'}`;
                        setMessages(prev => [...prev, {
                          id: Date.now().toString(),
                          role: 'assistant',
                          content: infoMessage,
                          timestamp: new Date()
                        }]);
                      }}
                      style={{
                        background: "linear-gradient(45deg, #17a2b8, #138496)",
                        color: "white",
                        border: "none",
                        borderRadius: "20px",
                        padding: "8px 16px",
                        fontSize: "14px",
                        cursor: "pointer",
                        transition: "background 0.2s"
                      }}
                    >
                      ℹ️ Инфо {product?.name || productId}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Пользовательское сообщение
    return (
      <div key={message.id} style={{ marginBottom: 20, display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{
          background: "#ff00cc",
          color: "white",
          padding: 12,
          borderRadius: 12,
          maxWidth: "70%",
          marginRight: 0
        }}>
          {content}
        </div>
      </div>
    );
  };

  if (!mounted) {
    return null;
  }

          return (
    <>
      <style jsx global>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes slideOutRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `}</style>
      <div style={{ 
        maxWidth: 800, 
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 20,
        width: "100%",
        alignItems: "center"
      }}>
      {/* Основной чат */}
      <div style={{ 
        height: "clamp(400px, 60vh, 500px)",
        display: "flex",
        flexDirection: "column",
        background: "rgba(255, 255, 255, 0.05)",
        borderRadius: 12,
        overflow: "hidden",
        width: "100%",
        maxWidth: "700px"
      }}>
        {/* Заголовок чата */}
        <div style={{ 
          padding: "clamp(10px, 2vw, 15px)", 
          background: "rgba(255, 255, 255, 0.1)", 
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px"
        }}>
          <h3 style={{ 
            margin: 0, 
            color: "#fff",
            fontSize: "clamp(16px, 4vw, 18px)"
          }}>
            🤖 AI Консультант
          </h3>
          <div style={{ 
            fontSize: "clamp(10px, 2.5vw, 12px)", 
            color: "#ffffff",
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
            textShadow: "0 1px 2px rgba(0,0,0,0.3)"
          }}>
            <span>💬 {messages.length} сообщений</span>
            <button
              onClick={() => {
                setMessages([{
                  id: '1',
                  role: 'assistant',
                  content: 'История чата очищена! 🧹\n\nДобро пожаловать в spor3s! 🍄 Помогу выбрать грибные добавки:\n\n🧠 Для памяти и концентрации — Ежовик\n😴 Для сна и снятия стресса — Мухомор\n⚡ Для энергии — Кордицепс\n🌟 Комплексное решение — курс 4 в 1\n\nВыберите товары внизу или напишите что вас интересует!',
                  timestamp: new Date()
                }]);
              }}
              style={{
                background: "rgba(255, 107, 107, 0.2)",
                border: "1px solid rgba(255, 107, 107, 0.3)",
                borderRadius: 4,
                padding: "4px 8px",
                color: "#ff6b6b",
                fontSize: "clamp(8px, 2vw, 10px)",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseOver={(e) => {
                const target = e.currentTarget as HTMLButtonElement;
                target.style.background = "rgba(255, 107, 107, 0.3)";
              }}
              onMouseOut={(e) => {
                const target = e.currentTarget as HTMLButtonElement;
                target.style.background = "rgba(255, 107, 107, 0.2)";
              }}
            >
              🧹 Очистить
            </button>
          </div>
        </div>

        {/* Сообщения */}
        <div style={{ 
          flex: 1, 
          padding: "clamp(10px, 2vw, 15px)", 
          overflowY: "auto",
          display: "flex",
          flexDirection: "column"
        }}>
          {messages.map(renderMessage)}
          
          {isLoading && (
            <div style={{ 
              background: "#2a2a5a",
              padding: "clamp(10px, 2vw, 15px)",
              borderRadius: 12,
              maxWidth: "80%",
              marginLeft: 0,
              border: "1px solid rgba(255, 255, 255, 0.1)"
            }}>
              <div style={{ color: "#ffffff", textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
                AI печатает... ⏳
              </div>
            </div>
          )}
          
        <div ref={messagesEndRef} />
      </div>

        {/* Форма ввода */}
        <form onSubmit={handleSubmit} style={{ 
          padding: 15, 
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          display: "flex",
          gap: 10
        }}>
        <input
          type="text"
          value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Задайте вопрос о грибных добавках... (напишите 'очистить' для сброса истории)"
            disabled={isLoading}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 8,
              border: "1px solid rgba(255, 255, 255, 0.2)",
              background: "rgba(255, 255, 255, 0.1)",
              color: "#fff",
              fontSize: 14
            }}
            onFocus={(e) => {
              const target = e.currentTarget as HTMLInputElement;
              target.style.outline = "none";
              target.style.borderColor = "rgba(255, 255, 255, 0.5)";
            }}
            onBlur={(e) => {
              const target = e.currentTarget as HTMLInputElement;
              target.style.borderColor = "rgba(255, 255, 255, 0.2)";
            }}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            style={{
              padding: "12px 20px",
              background: isLoading ? "#666" : "#ff00cc",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: isLoading ? "not-allowed" : "pointer",
              fontSize: 14,
              fontWeight: "bold"
            }}
          >
            {isLoading ? "⏳" : "📤"}
        </button>
      </form>
      </div>

      {/* Меню витрины после чата */}
      <div style={{
        background: "rgba(255, 255, 255, 0.08)",
        borderRadius: 12,
        padding: 20,
        border: "1px solid rgba(255, 255, 255, 0.1)"
      }}>
        <h3 style={{ 
          color: "#fff", 
          textAlign: "center", 
          marginBottom: 20,
          fontSize: 18,
          fontWeight: 600
        }}>
          🛍️ Быстрый доступ к товарам
        </h3>
        
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
          gap: 15,
          marginBottom: 20
        }}>
          {products.slice(0, 4).map(product => (
            <div 
              key={product.id} 
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                borderRadius: 12,
                padding: 15,
                display: "flex",
                alignItems: "center",
                gap: 12,
                cursor: "pointer",
                transition: "transform 0.2s, box-shadow 0.2s",
                color: "#fff",
                border: "1px solid rgba(255, 255, 255, 0.2)"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.3)";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.25)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
              }}
              onClick={() => handleAddToCart(product.id)}
            >
              <div style={{ 
                width: 50, 
                height: 50, 
                borderRadius: 8, 
                overflow: "hidden",
                background: "#f0f0f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                {product.image ? (
                  <img 
                    src={assetUrl(product.image)} 
                    alt={product.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      if (target.parentNode) {
                        (target.parentNode as HTMLElement).innerHTML = '<div style="font-size: 20px;">🍄</div>';
                      }
                    }}
                  />
                ) : (
                  <div style={{ fontSize: 20 }}>🍄</div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>
                  {product.name}
                </div>
                <div style={{ color: "#ff00cc", fontWeight: 700, fontSize: 16 }}>
                  {product.price}₽
                </div>
              </div>
              <div style={{ 
                background: "#ff00cc", 
                color: "white", 
                borderRadius: "50%", 
                width: 30, 
                height: 30,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                fontWeight: "bold"
              }}>
                +
              </div>
            </div>
          ))}
        </div>

        {/* Быстрые кнопки */}
        <div style={{ 
          display: "flex", 
          gap: 12, 
          justifyContent: "center",
          flexWrap: "wrap"
        }}>
          <button
            onClick={() => setStep && setStep(2)}
            style={{
              background: "linear-gradient(45deg, #ff00cc, #3333ff)",
              color: "white",
              border: "none",
              borderRadius: 20,
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "transform 0.2s"
            }}
            onMouseOver={(e) => {
              (e.target as HTMLButtonElement).style.transform = "scale(1.05)";
            }}
            onMouseOut={(e) => {
              (e.target as HTMLButtonElement).style.transform = "scale(1)";
            }}
          >
            🛒 Перейти в каталог
          </button>
          
          <button
            onClick={() => {
              const popularProducts = ['4v1']; // Изменено: теперь добавляем курс 4в1 на месяц
              popularProducts.forEach(id => {
                const product = products.find(p => p.id === id);
                if (product) handleAddToCart(id);
              });
            }}
            style={{
              background: "rgba(255, 255, 255, 0.15)",
              color: "#fff",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: 20,
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.2s"
            }}
            onMouseOver={(e) => {
              const target = e.target as HTMLButtonElement;
              target.style.background = "rgba(255, 255, 255, 0.25)";
              target.style.transform = "scale(1.05)";
            }}
            onMouseOut={(e) => {
              const target = e.target as HTMLButtonElement;
              target.style.background = "rgba(255, 255, 255, 0.15)";
              target.style.transform = "scale(1)";
            }}
          >
            ⭐ Добавить курс 4в1
          </button>
        </div>
      </div>
    </div>
    </>
  );
}