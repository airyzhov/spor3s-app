import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../supabaseServerClient";

export async function POST(req: NextRequest) {
  try {
    const { user_id, channel_type } = await req.json();
    
    console.log('🔍 Check subscription status API called:', { user_id, channel_type });
    
    if (!user_id || !channel_type) {
      console.log('❌ Missing required fields');
      return NextResponse.json({ error: "Необходимы user_id и channel_type" }, { status: 400 });
    }

    if (!['telegram', 'youtube'].includes(channel_type)) {
      console.log('❌ Invalid channel type:', channel_type);
      return NextResponse.json({ error: "Неверный тип канала" }, { status: 400 });
    }

    // Проверяем, получал ли пользователь уже бонус за этот канал
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

    const hasReceivedBonus = !!existingBonus;
    
    console.log(`✅ Subscription status for ${channel_type}:`, hasReceivedBonus ? 'Bonus received' : 'Bonus not received');

    return NextResponse.json({ 
      success: true,
      hasReceivedBonus,
      channel_type
    });

  } catch (e) {
    console.error('Check subscription status error:', e);
    return NextResponse.json({ error: "Ошибка проверки статуса подписки" }, { status: 500 });
  }
} 