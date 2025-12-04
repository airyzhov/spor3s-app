import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../supabaseServerClient";

// Функция отправки уведомления менеджеру через Telegram
async function notifyManagerTelegram(orderData: any, source: string = 'mini_app') {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const managerChatId = process.env.MANAGER_CHAT_ID;
  
  if (!botToken || !managerChatId) {
    console.log('⚠️ Telegram notification skipped: missing BOT_TOKEN or MANAGER_CHAT_ID');
    return;
  }

  try {
    // Формируем список товаров
    const items = Array.isArray(orderData.items) 
      ? orderData.items.map((item: any) => `• ${item.name || item.id} — ${item.price || 0}₽`).join('\n')
      : 'Товары не указаны';

    const message = `🆕 <b>НОВЫЙ ЗАКАЗ!</b>

📱 Источник: ${source === 'mini_app' ? 'Mini App' : source === 'bot' ? 'Telegram бот' : source}

👤 <b>Данные получателя для СДЭК:</b>
• ФИО: ${orderData.fio || '❌ Не указано'}
• Телефон: ${orderData.phone || '❌ Не указан'}
• Адрес ПВЗ СДЭК: ${orderData.address || '❌ Не указан'}

📦 <b>Товары:</b>
${items}

💰 <b>Итого: ${orderData.total || 0}₽</b>
💬 Комментарий: ${orderData.comment || 'нет'}

🕐 ${new Date().toLocaleString('ru-RU')}
📋 ID заказа: ${orderData.id || 'новый'}`;

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: managerChatId,
          text: message,
          parse_mode: 'HTML'
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Telegram API error:', errorText);
    } else {
      console.log('✅ Уведомление отправлено менеджеру @ai_ryzhov');
    }
  } catch (error) {
    console.error('❌ Ошибка отправки уведомления:', error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('📦 Получены данные заказа:', body);

    const {
      user_id,
      items,
      total,
      address,      // Адрес ПВЗ СДЭК
      fio,          // ФИО получателя
      phone,        // Телефон получателя
      referral_code,
      comment,
      coins_to_use = 0,
      source = 'mini_app'
    } = body;

    // Валидация обязательных полей для СДЭК
    const missingFields = [];
    if (!fio) missingFields.push('ФИО');
    if (!phone) missingFields.push('телефон');
    if (!address) missingFields.push('адрес ПВЗ СДЭК');

    if (missingFields.length > 0) {
      console.log('⚠️ Отсутствуют обязательные поля:', missingFields);
      // Продолжаем создание заказа, но логируем предупреждение
    }

    // Создание заказа в Supabase
    const { data, error } = await supabaseServer.from("orders").insert([
      {
        user_id,
        items,
        total: total || 0,
        address,      // Адрес ПВЗ СДЭК
        fio,          // ФИО получателя  
        phone,        // Телефон получателя
        referral_code,
        comment,
        status: "pending",
        created_at: new Date().toISOString(),
        spores_coin: 0,
        tracking_number: null,
        start_date: null,
      },
    ]).select();

    if (error) {
      console.error('❌ Ошибка создания заказа:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const order = data?.[0];
    if (!order) {
      console.error('❌ Заказ не создан');
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }

    console.log('✅ Заказ создан успешно:', order.id);

    // Отправляем уведомление менеджеру через Telegram
    await notifyManagerTelegram({ ...order, items, total }, source);

    return NextResponse.json({ 
      success: true, 
      order,
      message: "Заказ создан успешно"
    });

  } catch (e) {
    console.error('❌ Ошибка в API заказов:', e);
    return NextResponse.json({ error: "Ошибка оформления заказа" }, { status: 500 });
  }
}
