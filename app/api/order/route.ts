import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../supabaseServerClient";
import { normalizePhone } from "../../../lib/referral";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      user_id,
      items,
      total,
      address,
      fio,
      phone,
      referral_code,
      comment,
      coins_to_use = 0
    } = body;

    console.log('📦 Создание заказа:', { user_id, total, fio, phone });

    // 1. Получаем информацию о пользователе и его уровне
    let userLevel = null;
    let scBalance = 0;
    
    if (user_id) {
      const { data: levelData, error: levelError } = await supabaseServer
        .from("user_levels")
        .select("*")
        .eq("user_id", user_id)
        .single();

      if (!levelError && levelData) {
        userLevel = levelData;
        scBalance = levelData.current_sc_balance || 0;
      }
    }

    // 2. Рассчитываем скидки на основе уровня
    let levelDiscount = 0;
    let levelDiscountPercent = 0;
    
    if (userLevel) {
      const levelCode = userLevel.level_code || 'novice';
      const totalAmount = total || 0;
      
      // Скидки по уровням
      if (levelCode === 'master' && totalAmount >= 10000) { // Мастер
        levelDiscountPercent = 5;
        levelDiscount = Math.floor(totalAmount * 0.05);
      } else if (levelCode === 'legend' && totalAmount >= 20000) { // Легенда
        levelDiscountPercent = 10;
        levelDiscount = Math.floor(totalAmount * 0.10);
      }
    }

    // 3. Проверяем и применяем SC скидку
    let scDiscount = 0;
    let coinsToApply = Math.min(coins_to_use, scBalance);
    
    if (coinsToApply > 0) {
      const maxScDiscount = Math.floor(total * 0.30); // Максимум 30% от суммы заказа
      scDiscount = Math.min(coinsToApply, maxScDiscount);
      coinsToApply = scDiscount; // Обновляем количество используемых монет
    }

    // 4. Рассчитываем итоговую сумму
    const totalDiscount = levelDiscount + scDiscount;
    const finalTotal = Math.max(0, total - totalDiscount);

    // 5. Создаем заказ
    const { data, error } = await supabaseServer.from("orders").insert([
      {
        user_id,
        items,
        total: finalTotal,
        address,
        fio,
        phone,
        referral_code,
        comment,
        status: "pending",
        created_at: new Date().toISOString(),
        spores_coin: coinsToApply,
        tracking_number: null,
        start_date: null,
        coins_spent: coinsToApply
      },
    ]).select();
    
    if (error) {
      console.error('❌ Ошибка создания заказа:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    const order = data?.[0];
    if (!order) {
      console.error('❌ Заказ не создан - data пустой');
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }

    // 6. Если использованы монеты — фиксируем транзакцию списания
    if (coinsToApply > 0) {
      console.log(`💰 Использовано SC: ${coinsToApply}`);
      
      const { error: scError } = await supabaseServer
        .from("sc_transactions")
        .insert([{
          user_id: user_id,
          amount: -coinsToApply, // Отрицательная сумма для списания
          transaction_type: "spent",
          source_type: "order_discount",
          description: `Списание SC для заказа #${order.id}`,
          created_at: new Date().toISOString()
        }]);

      if (scError) {
        console.error('❌ Ошибка списания SC:', scError);
      } else {
        // Обновляем баланс пользователя
        const newBalance = scBalance - coinsToApply;
        const { error: updateError } = await supabaseServer
          .from("user_levels")
          .update({ 
            current_sc_balance: newBalance,
            total_sc_spent: (userLevel?.total_sc_spent || 0) + coinsToApply
          })
          .eq("user_id", user_id);

        if (updateError) {
          console.error('❌ Ошибка обновления баланса SC:', updateError);
        }
      }
    }

    // 7. SC за заказ начисляются ПРИ ОПЛАТЕ (статус paid), а не при создании —
    //    иначе баланс накручивается неоплаченными заказами.
    //    См. app/api/admin/orders/route.ts → creditOrderScOnPaid.

    // 8. Обновляем информацию о заказах в уровне пользователя
    if (user_id) {
      const { data: existingOrders, error: ordersError } = await supabaseServer
        .from("orders")
        .select("total")
        .eq("user_id", user_id);

      if (!ordersError) {
        const totalOrdersAmount = existingOrders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
        const ordersCount = existingOrders?.length || 0;

        const { error: updateLevelError } = await supabaseServer
          .from("user_levels")
          .update({
            total_orders_amount: totalOrdersAmount,
            orders_count: ordersCount,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", user_id);

        if (updateLevelError) {
          console.error("❌ Ошибка обновления уровня пользователя:", updateLevelError);
        }
      }
    }

    // 9. Реферальные начисления перенесены на смену статуса заказа на "paid"
    //    (см. app/api/admin/orders/route.ts → processReferralOnPaid).
    //    Здесь же сохраняем телефон покупателя в его профиль, чтобы он мог
    //    выступать реферером по номеру телефона.
    if (user_id && phone) {
      try {
        const normPhone = normalizePhone(phone);
        if (normPhone) {
          await supabaseServer.from("users").update({ phone: normPhone }).eq("id", user_id);
        }
      } catch (e) {
        console.error('[order] Не удалось сохранить телефон пользователя:', e);
      }
    }

    // 10. Отправляем уведомление менеджеру в Telegram (напрямую через Bot API)
    try {
      console.log(`🛒 НОВЫЙ ЗАКАЗ: #${order.id} | Пользователь: ${user_id} | Сумма: ${finalTotal} руб`);

      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const managerChatId = process.env.MANAGER_CHAT_ID;

      if (botToken && managerChatId) {
        const itemsArr = Array.isArray(items) ? items : [];
        const itemsText = itemsArr.length > 0
          ? itemsArr.map((i: any) => `• ${i.name || i.id || 'Товар'}${i.quantity ? ` ×${i.quantity}` : ''} — ${i.price || 0}₽`).join('\n')
          : '—';

        const message = `🆕 НОВЫЙ ЗАКАЗ (приложение) #${order.id}

👤 ФИО: ${fio || 'не указано'}
📞 Телефон: ${phone || 'не указано'}
📍 Адрес: ${address || 'не указано'}

📦 Товары:
${itemsText}

💰 Сумма: ${finalTotal}₽${totalDiscount ? ` (скидка ${totalDiscount}₽)` : ''}
💬 Комментарий: ${comment || 'нет'}
🕐 ${new Date().toLocaleString('ru-RU')}`;

        const resp = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: managerChatId, text: message }),
        });
        if (!resp.ok) {
          console.error('❌ Telegram уведомление не отправлено:', resp.status, await resp.text());
        }
      } else {
        console.log('ℹ️ MANAGER_CHAT_ID или TELEGRAM_BOT_TOKEN не заданы — уведомление пропущено');
      }
    } catch (notificationError) {
      // Не валим заказ, если уведомление не ушло
      console.error('❌ Ошибка отправки уведомления:', notificationError);
    }

    // 11. Синхронизация заказа в Google Sheets (через Apps Script webhook, если задан)
    try {
      const sheetWebhook = process.env.SHEET_WEBHOOK_URL;
      if (sheetWebhook) {
        const itemsArr = Array.isArray(items) ? items : [];
        const itemsText = itemsArr
          .map((i: any) => `${i.name || i.id || 'Товар'}${i.quantity ? ` x${i.quantity}` : ''} (${i.price || 0})`)
          .join('; ');
        await fetch(sheetWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: order.id,
            created_at: order.created_at,
            fio: fio || '',
            phone: phone || '',
            address: address || '',
            items: itemsText,
            total: finalTotal,
            status: order.status || 'pending',
            comment: comment || '',
            referral_code: referral_code || '',
          }),
        });
      }
    } catch (sheetError) {
      // Синк в таблицу не должен ронять заказ
      console.error('❌ Ошибка синка в Google Sheets:', sheetError);
    }

    return NextResponse.json({
      success: true, 
      order,
      appliedDiscounts: {
        levelDiscount,
        levelDiscountPercent,
        scDiscount: coinsToApply,
        totalDiscount,
        finalTotal
      }
    });
  } catch (e) {
    console.error('❌ Ошибка в API заказов:', e);
    return NextResponse.json({ error: "Ошибка оформления заказа" }, { status: 500 });
  }
} 