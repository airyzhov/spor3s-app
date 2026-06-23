import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../supabaseServerClient";

export async function POST(req: NextRequest) {
  try {
    const { user_id, channel_type } = await req.json();
    
    console.log('🔔 Subscribe bonus API called:', { user_id, channel_type });
    
    if (!user_id || !channel_type) {
      console.log('❌ Missing required fields');
      return NextResponse.json({ error: "Необходимы user_id и channel_type" }, { status: 400 });
    }

    if (!['telegram', 'youtube'].includes(channel_type)) {
      console.log('❌ Invalid channel type:', channel_type);
      return NextResponse.json({ error: "Неверный тип канала" }, { status: 400 });
    }

    const bonusAmount = 50; // 50 SC за подписку
    console.log('💰 Bonus amount:', bonusAmount);

    // Проверяем, не получал ли пользователь уже бонус за этот канал
    console.log('🔍 Checking existing bonus for:', `subscribe_${channel_type}`);
    const { data: existingBonus, error: checkError } = await supabaseServer
      .from("coin_transactions")
      .select("id")
      .eq("user_id", user_id)
      .eq("type", `subscribe_${channel_type}`)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.log('❌ Error checking existing bonus:', checkError);
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    if (existingBonus) {
      console.log('⚠️ Bonus already received for:', channel_type);
      return NextResponse.json({ 
        error: `Бонус за подписку на ${channel_type === 'telegram' ? 'Telegram' : 'YouTube'} уже получен!` 
      }, { status: 400 });
    }

    console.log('✅ No existing bonus found, proceeding...');

    // Получаем активный заказ пользователя
    console.log('🔍 Looking for active order...');
    let { data: activeOrder, error: orderError } = await supabaseServer
      .from("orders")
      .select("id, spores_coin")
      .eq("user_id", user_id)
      .eq("status", "active")
      .single();

    // Если активного заказа нет, создаем новый
    if (orderError || !activeOrder) {
      console.log('📝 Creating new active order...');
      const { data: newOrder, error: createError } = await supabaseServer
        .from("orders")
        .insert([{
          user_id,
          status: "active",
          spores_coin: 0,
          total: 0,
          created_at: new Date().toISOString()
        }])
        .select("id, spores_coin")
        .single();

      if (createError) {
        console.log('❌ Error creating order:', createError);
        return NextResponse.json({ error: "Ошибка создания заказа: " + createError.message }, { status: 500 });
      }

      activeOrder = newOrder;
      console.log('✅ New order created:', activeOrder.id);
    } else {
      console.log('✅ Found existing order:', activeOrder.id);
    }

    // Добавляем бонус в заказ
    console.log('💰 Adding bonus to order...');
    const { error: updateError } = await supabaseServer
      .from("orders")
      .update({
        spores_coin: (activeOrder.spores_coin || 0) + bonusAmount
      })
      .eq("id", activeOrder.id);

    if (updateError) {
      console.log('❌ Error updating order:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    console.log('✅ Order updated successfully');

    // Записываем транзакцию
    console.log('📝 Recording transaction...');
    const { error: txError } = await supabaseServer
      .from("coin_transactions")
      .insert([{
        user_id,
        order_id: activeOrder.id,
        type: `subscribe_${channel_type}`,
        amount: bonusAmount,
        description: `Бонус за подписку на ${channel_type === 'telegram' ? 'Telegram канал' : 'YouTube канал'}`,
        created_at: new Date().toISOString(),
      }]);

    if (txError) {
      console.log('❌ Error recording transaction:', txError);
      return NextResponse.json({ error: txError.message }, { status: 500 });
    }

    console.log('✅ Transaction recorded successfully');
    console.log('🎉 Bonus awarded successfully!');

    return NextResponse.json({ 
      success: true, 
      bonus: bonusAmount,
      message: `+${bonusAmount} SC за подписку на ${channel_type === 'telegram' ? 'Telegram' : 'YouTube'}!`
    });

  } catch (e) {
    console.error('Subscribe bonus error:', e);
    return NextResponse.json({ error: "Ошибка начисления бонуса" }, { status: 500 });
  }
} 