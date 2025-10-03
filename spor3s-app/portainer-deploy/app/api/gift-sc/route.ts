import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../supabaseServerClient";

export async function POST(req: NextRequest) {
  try {
    const { sender_id, receiver_telegram_id, amount, message } = await req.json();
    
    if (!sender_id || !receiver_telegram_id || !amount) {
      return NextResponse.json({ error: "sender_id, receiver_telegram_id и amount обязательны" }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json({ error: "Количество SC должно быть больше 0" }, { status: 400 });
    }

    // 1. Находим получателя по telegram_id
    const { data: receiver, error: receiverError } = await supabaseServer
      .from("users")
      .select("id, name")
      .eq("telegram_id", receiver_telegram_id)
      .single();

    if (receiverError || !receiver) {
      return NextResponse.json({ error: "Пользователь с таким ID не найден в системе" }, { status: 404 });
    }

    if (receiver.id === sender_id) {
      return NextResponse.json({ error: "Нельзя дарить SC самому себе" }, { status: 400 });
    }

    // 2. Проверяем баланс отправителя
    const { data: senderLevel, error: senderError } = await supabaseServer
      .from("user_levels")
      .select("current_sc_balance")
      .eq("user_id", sender_id)
      .single();

    if (senderError) {
      return NextResponse.json({ error: senderError.message }, { status: 500 });
    }

    if (senderLevel.current_sc_balance < amount) {
      return NextResponse.json({ 
        error: `Недостаточно SC. Ваш баланс: ${senderLevel.current_sc_balance} SC` 
      }, { status: 400 });
    }

    // 3. Создаем подарок
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Подарок действителен 7 дней

    const { data: gift, error: giftError } = await supabaseServer
      .from("sc_gifts")
      .insert([{
        sender_id,
        receiver_id: receiver.id,
        amount,
        message: message || "Подарок от друга",
        expires_at: expiresAt.toISOString()
      }])
      .select()
      .single();

    if (giftError) {
      return NextResponse.json({ error: giftError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      gift,
      receiverName: receiver.name,
      message: `Подарок на ${amount} SC отправлен ${receiver.name}`
    });
  } catch (e) {
    return NextResponse.json({ error: "Ошибка отправки подарка" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get('user_id');
    
    if (!user_id) {
      return NextResponse.json({ error: "user_id required" }, { status: 400 });
    }

    // Получаем входящие подарки
    const { data: incomingGifts, error: incomingError } = await supabaseServer
      .from("sc_gifts")
      .select(`
        id,
        amount,
        message,
        status,
        created_at,
        expires_at,
        sender:users!sc_gifts_sender_id_fkey(name, telegram_id)
      `)
      .eq("receiver_id", user_id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (incomingError) {
      return NextResponse.json({ error: incomingError.message }, { status: 500 });
    }

    // Получаем исходящие подарки
    const { data: outgoingGifts, error: outgoingError } = await supabaseServer
      .from("sc_gifts")
      .select(`
        id,
        amount,
        message,
        status,
        created_at,
        expires_at,
        receiver:users!sc_gifts_receiver_id_fkey(name, telegram_id)
      `)
      .eq("sender_id", user_id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (outgoingError) {
      return NextResponse.json({ error: outgoingError.message }, { status: 500 });
    }

    return NextResponse.json({
      incoming: incomingGifts || [],
      outgoing: outgoingGifts || [],
      totalIncoming: incomingGifts?.length || 0,
      totalOutgoing: outgoingGifts?.length || 0
    });
  } catch (e) {
    return NextResponse.json({ error: "Ошибка получения подарков" }, { status: 500 });
  }
}

// API для принятия/отклонения подарка
export async function PUT(req: NextRequest) {
  try {
    const { gift_id, action } = await req.json();
    
    if (!gift_id || !action) {
      return NextResponse.json({ error: "gift_id и action обязательны" }, { status: 400 });
    }

    if (!['accepted', 'declined'].includes(action)) {
      return NextResponse.json({ error: "action должен быть 'accepted' или 'declined'" }, { status: 400 });
    }

    // Обновляем статус подарка
    const { data: updatedGift, error: updateError } = await supabaseServer
      .from("sc_gifts")
      .update({ status: action })
      .eq("id", gift_id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!updatedGift) {
      return NextResponse.json({ error: "Подарок не найден" }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      gift: updatedGift,
      message: action === 'accepted' ? 
        `Подарок принят! +${updatedGift.amount} SC` : 
        "Подарок отклонен"
    });
  } catch (e) {
    return NextResponse.json({ error: "Ошибка обработки подарка" }, { status: 500 });
  }
} 