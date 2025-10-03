import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../supabaseServerClient";

export async function POST(req: NextRequest) {
  try {
    const { user_id: rawUserId, telegram_id } = await req.json();

    // Разрешаем два варианта: передан готовый user_id (UUID) или telegram_id
    let user_id = rawUserId as string | undefined;

    if (!user_id && telegram_id) {
      const { data: userRow } = await supabaseServer
        .from('users')
        .select('id')
        .eq('telegram_id', String(telegram_id))
        .single();
      user_id = userRow?.id;
    }

    if (!user_id) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    }

    // Генерируем уникальный код
    const auth_code = generateAuthCode();
    const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 часа

    // Сохраняем код в базу
    const { data, error } = await supabaseServer
      .from('tg_link_codes')
      .insert([{
        auth_code,
        user_id,
        expires_at: expires_at.toISOString(),
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating auth code:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      auth_code,
      expires_at: expires_at.toISOString(),
      message: `Отправьте команду /start ${auth_code} боту @spor3z для привязки аккаунта`
    });

  } catch (error) {
    console.error('Error generating auth code:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function generateAuthCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
} 