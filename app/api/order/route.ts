import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../supabaseServerClient";

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

    // 7. Начисляем SC за заказ (если есть user_id)
    if (user_id) {
      const scEarned = Math.floor(finalTotal / 100); // 1 SC за каждые 100 рублей
      
      if (scEarned > 0) {
        const { error: earnError } = await supabaseServer
          .from("sc_transactions")
          .insert([{
            user_id: user_id,
            amount: scEarned,
            transaction_type: "earned",
            source_type: "order",
            description: `Начисление SC за заказ #${order.id}`,
            created_at: new Date().toISOString()
          }]);

        if (earnError) {
          console.error('❌ Ошибка начисления SC:', earnError);
        } else {
          // Обновляем баланс пользователя
          const currentBalance = scBalance - coinsToApply; // Учитываем уже списанные монеты
          const newBalance = currentBalance + scEarned;
          const { error: updateError } = await supabaseServer
            .from("user_levels")
            .update({ 
              current_sc_balance: newBalance,
              total_sc_earned: (userLevel?.total_sc_earned || 0) + scEarned
            })
            .eq("user_id", user_id);

          if (updateError) {
            console.error('❌ Ошибка обновления баланса SC:', updateError);
          }
        }
      }
    }

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

    // 9. Обрабатываем реферальный бонус (если есть referral_code, user_id и это первый заказ)
    if (referral_code && user_id) {
      try {
        // Проверяем, есть ли уже заказы у этого пользователя
        const { data: existingOrders, error: ordersError } = await supabaseServer
          .from("orders")
          .select("id")
          .eq("user_id", user_id)
          .neq("id", order.id); // Исключаем текущий заказ

        if (!ordersError && (!existingOrders || existingOrders.length === 0)) {
          // Это первый заказ пользователя, начисляем реферальный бонус
          console.log('[order] First order with referral_code, awarding bonus');
          
          const { error: bonusError } = await supabaseServer
            .from("sc_transactions")
            .insert([{
              user_id: user_id,
              amount: 50, // Реферальный бонус 50 SC
              transaction_type: "earned",
              source_type: "referral",
              description: `Реферальный бонус за код: ${referral_code}`,
              created_at: new Date().toISOString()
            }]);

          if (bonusError) {
            console.log('[order] Failed to award referral bonus:', bonusError);
          } else {
            console.log('[order] Referral bonus awarded successfully');
            
            // Обновляем баланс пользователя
            const currentBalance = scBalance - coinsToApply;
            const newBalance = currentBalance + 50;
            const { error: updateError } = await supabaseServer
              .from("user_levels")
              .update({ 
                current_sc_balance: newBalance,
                total_sc_earned: (userLevel?.total_sc_earned || 0) + 50
              })
              .eq("user_id", user_id);

            if (updateError) {
              console.error('❌ Ошибка обновления баланса SC:', updateError);
            }
          }
        }
      } catch (bonusError) {
        console.error('[order] Error awarding referral bonus:', bonusError);
      }
    }

    // 10. Отправляем уведомление менеджеру
    try {
      console.log(`🛒 НОВЫЙ ЗАКАЗ: #${order.id} | Пользователь: ${user_id} | Сумма: ${finalTotal} руб`);
      console.log(`📦 Товары: ${JSON.stringify(items)}`);
      console.log(`📞 Контакты: ${fio || 'Не указано'}, ${phone || 'Не указано'}`);
      console.log(`📍 Адрес: ${address || 'Не указано'}`);
      console.log(`💰 Скидки: Уровень ${levelDiscount}₽, SC ${scDiscount}₽, Итого ${totalDiscount}₽`);
    } catch (notificationError) {
      console.error('❌ Ошибка логирования заказа:', notificationError);
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