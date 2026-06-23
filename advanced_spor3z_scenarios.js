require('dotenv').config({ path: 'env.local' });
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

console.log('👤 ПРОДВИНУТЫЙ SPOR3Z С МНОЖЕСТВЕННЫМИ СЦЕНАРИЯМИ');
console.log('==================================================');

const apiId = parseInt(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;
const sessionString = process.env.TELEGRAM_SESSION_STRING;

console.log('📋 API ID:', apiId ? 'НАЙДЕН' : 'НЕ НАЙДЕН');
console.log('📋 API Hash:', apiHash ? 'НАЙДЕН' : 'НЕ НАЙДЕН');
console.log('📋 Session:', sessionString ? 'НАЙДЕН' : 'НЕ НАЙДЕН');

if (!apiId || !apiHash || !sessionString) {
  console.log('❌ ОШИБКА: Не все параметры найдены в env.local');
  process.exit(1);
}

const stringSession = new StringSession(sessionString);
const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
});

// Расширенный контекст пользователей (тот же что в Telegram боте)
const userContext = {};

// Продукты и их синонимы (копия из Telegram бота)
const products = {
  'ежовик': {
    names: ['ежовик', 'ежевик', 'гребенчатый', 'hericium', 'lions mane', 'лионс мейн', 'память', 'концентрация'],
    fullName: 'Ежовик гребенчатый',
    description: 'отлично помогает с памятью, концентрацией и обучением',
    forms: {
      'капсулы': { price: 1100, description: 'удобно принимать, 120 капсул на месяц' },
      'порошок': { price: 1100, description: 'быстрее эффект, 100г на месяц' }
    }
  },
  'мухомор': {
    names: ['мухомор', 'красный мухомор', 'amanita', 'амания', 'сон', 'стресс', 'расслабление', 'спокойствие'],
    fullName: 'Мухомор красный',
    description: 'отлично помогает со сном и снимает стресс',
    forms: {
      'капсулы': { price: 1400, description: 'удобно принимать, 60 капсул на месяц' },
      'порошок': { price: 1400, description: 'быстрее эффект, 30г на месяц' }
    }
  },
  'кордицепс': {
    names: ['кордицепс', 'cordyceps', 'энергия', 'выносливость', 'сила', 'спорт'],
    fullName: 'Кордицепс',
    description: 'повышает энергию и выносливость',
    forms: {
      'капсулы': { price: 1200, description: 'удобно принимать, 90 капсул на месяц' },
      'порошок': { price: 1200, description: 'быстрее эффект, 50г на месяц' }
    }
  },
  'цистозира': {
    names: ['цистозира', 'cystoseira', 'щитовидка', 'щитовидная железа', 'гормоны', 'метаболизм'],
    fullName: 'Цистозира',
    description: 'поддерживает щитовидную железу',
    forms: {
      'капсулы': { price: 1000, description: 'удобно принимать, 60 капсул на месяц' },
      'порошок': { price: 1000, description: 'быстрее эффект, 40г на месяц' }
    }
  }
};

// Синонимы действий (копия из Telegram бота)
const actionSynonyms = {
  order: ['оформи', 'закажи', 'хочу', 'нужен', 'нужна', 'купить', 'заказать', 'приобрести', 'взять'],
  form: {
    capsules: ['капсулы', 'капсула', 'таблетки', 'таблетка', 'пилюли'],
    powder: ['порошок', 'пудра', 'измельченный', 'молотый']
  },
  duration: {
    '1': ['месяц', '1 месяц', 'один месяц', 'на месяц', '30 дней'],
    '3': ['3 месяца', 'три месяца', 'курс', '90 дней', 'квартал'],
    '6': ['6 месяцев', 'шесть месяцев', 'полгода', '180 дней', 'полный курс']
  },
  confirm: ['готово', 'да', 'подтверждаю', 'заказываю', 'оформляю', 'согласен', 'ок', 'окей']
};

// Вспомогательные функции (копии из Telegram бота)
function findProduct(text) {
  for (const [key, product] of Object.entries(products)) {
    if (product.names.some(name => text.includes(name))) {
      return key;
    }
  }
  return null;
}

function findForm(text) {
  if (actionSynonyms.form.capsules.some(word => text.includes(word))) return 'капсулы';
  if (actionSynonyms.form.powder.some(word => text.includes(word))) return 'порошок';
  return null;
}

function findDuration(text) {
  if (actionSynonyms.duration['1'].some(word => text.includes(word))) return '1 месяц';
  if (actionSynonyms.duration['3'].some(word => text.includes(word))) return '3 месяца';
  if (actionSynonyms.duration['6'].some(word => text.includes(word))) return '6 месяцев';
  return null;
}

function isOrderAction(text) {
  return actionSynonyms.order.some(word => text.includes(word));
}

function isConfirmAction(text) {
  return actionSynonyms.confirm.some(word => text.includes(word));
}

async function runAdvancedSpor3z() {
    console.log('🚀 Запускаю продвинутый Spor3z...');
    await client.start({ botAuth: false });
    console.log('✅ Продвинутый Spor3z запущен!');
    console.log('🎯 Поддерживаемые сценарии:');
    console.log('   • "хочу ежовик на месяц"');
    console.log('   • "нужен мухомор в капсулах"');
    console.log('   • "закажи кордицепс курс"');
    console.log('   • И многие другие варианты!');

    client.addEventHandler(async (message) => {
        if (message.isPrivate && message.message) {
            const text = message.message.toLowerCase();
            const userId = message.peerId.userId;
            
            console.log(`📝 Получено сообщение: "${text}" от ${userId}`);
            
            // Инициализируем контекст если нет
            if (!userContext[userId]) {
                userContext[userId] = { state: 'start', product: null, form: null, duration: null };
            }
            
            const context = userContext[userId];
            
            // Определяем продукт, форму и срок из текущего сообщения
            const currentProduct = findProduct(text);
            const currentForm = findForm(text);
            const currentDuration = findDuration(text);
            const isOrder = isOrderAction(text);
            const isConfirm = isConfirmAction(text);
            
            console.log(`🔍 Анализ: product=${currentProduct}, form=${currentForm}, duration=${currentDuration}, order=${isOrder}, confirm=${isConfirm}`);
            
            // Сохраняем предыдущий продукт для проверки
            const previousProduct = context.product;
            
            // Обновляем контекст если найдены новые данные
            if (currentProduct) context.product = currentProduct;
            if (currentForm) context.form = currentForm;
            if (currentDuration) context.duration = currentDuration;
            
            let response = '';
            
            // Логика состояний (та же что в Telegram боте)
            if (currentProduct && !previousProduct) {
                context.state = 'product_selected';
                const prod = products[currentProduct];
                response = `Отлично! ${prod.fullName} ${prod.description}.

В какой форме предпочитаете:
• Капсулы (${prod.forms.капсулы.description} за ${prod.forms.капсулы.price}₽)
• Порошок (${prod.forms.порошок.description} за ${prod.forms.порошок.price}₽)

И на какой срок:
• Месяц (для начала)
• 3 месяца (курс, экономично)
• 6 месяцев (максимальный эффект)

Для быстрого оформления используйте приложение: 👉 https://t.me/Spor3s_bot/app`;
            }
            else if (context.product && (currentForm || currentDuration || isOrder)) {
                context.state = 'ordering';
                const prod = products[context.product];
                
                response = `Понял! Вы хотите оформить ${prod.fullName}.

${context.form ? `✅ Форма: ${context.form}` : '• Форма: не выбрана'}
${context.duration ? `✅ Срок: ${context.duration}` : '• Срок: не выбран'}

${!context.form || !context.duration ? 
  `Для завершения заказа нужно уточнить:\n${!context.form ? '• Форма: капсулы или порошок?\n' : ''}${!context.duration ? '• Срок: месяц, 3 месяца или 6 месяцев?\n' : ''}` : 
  'Все параметры выбраны! Напишите "готово" для подтверждения заказа.'}

Или переходите в приложение для быстрого оформления: 👉 https://t.me/Spor3s_bot/app`;
            }
            else if (context.state === 'ordering' && isConfirm && context.product && context.form && context.duration) {
                const prod = products[context.product];
                const formPrice = prod.forms[context.form].price;
                const multiplier = context.duration === '3 месяца' ? 3 : context.duration === '6 месяцев' ? 6 : 1;
                const totalPrice = formPrice * multiplier;
                
                response = `🎉 Заказ подтвержден!

📦 **Ваш заказ:**
• Товар: ${prod.fullName}
• Форма: ${context.form}
• Срок: ${context.duration}
• Стоимость: ${totalPrice}₽

✅ Заказ передан в обработку
📱 Для оплаты и указания адреса доставки переходите в приложение: 👉 https://t.me/Spor3s_bot/app

Спасибо за заказ! 🙏`;
                
                // Сбрасываем контекст
                context.state = 'start';
                context.product = null;
                context.form = null;
                context.duration = null;
            }
            else if (text.includes('коин') || text.includes('балл')) {
                response = `Spor3s Coins (SC) — это внутренняя валюта нашей платформы! 

🪙 **Как зарабатывать SC:**
• Ежедневные чекины 
• Прохождение опросов
• Покупки товаров
• Реферальная программа

💰 **Как тратить SC:**
• Скидки до 30% от суммы заказа
• Обмен на товары

📱 **Проверить баланс:** откройте приложение → раздел "Прогресс"

Для быстрого оформления используйте приложение: 👉 https://t.me/Spor3s_bot/app`;
            }
            else {
                context.state = 'start';
                context.product = null;
                context.form = null;
                context.duration = null;
                response = `Привет! Я AI консультант СПОРС.

У нас есть:
🧠 Ежовик гребенчатый - для памяти и концентрации
😴 Мухомор красный - для сна и спокойствия
💪 Кордицепс - для энергии
🦋 Цистозира - для щитовидной железы

Что вас интересует? Можете написать:
• "хочу ежовик на месяц"
• "нужен мухомор в капсулах"
• "закажи кордицепс курс"

Для быстрого оформления используйте приложение: 👉 https://t.me/Spor3s_bot/app`;
            }
            
            try {
                await client.sendMessage(message.peerId, { message: response });
                console.log(`🤖 Отправил ответ: "${response}"`);
                console.log(`📊 Контекст: state=${context.state}, product=${context.product}, form=${context.form}, duration=${context.duration}`);
            } catch (error) {
                console.error('❌ Ошибка при отправке сообщения:', error);
            }
        }
    });
}

runAdvancedSpor3z().catch(console.error);
