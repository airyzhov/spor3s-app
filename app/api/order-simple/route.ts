import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../supabaseServerClient";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('📦 Получены данные заказа:', body);

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

    // Простое создание заказа без сложной логики
    const { data, error } = await supabaseServer.from("orders").insert([
      {
        user_id,
        items,
        total: total || 0,
        address,
        fio,
        phone,
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
