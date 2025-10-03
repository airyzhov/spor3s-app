import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../supabaseServerClient';

export async function POST(request: NextRequest) {
  try {
    const { telegramUser } = await request.json();
    
    if (!telegramUser || !telegramUser.id) {
      return NextResponse.json({ error: 'Invalid telegram user data' }, { status: 400 });
    }

    // Ищем пользователя в Supabase по telegram_id
    const { data: existingUser, error: fetchError } = await supabaseServer
      .from('users')
      .select('*')
      .eq('telegram_id', telegramUser.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching user:', fetchError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    let user;

    if (existingUser) {
      // Пользователь существует - обновляем данные
      const { data: updatedUser, error: updateError } = await supabaseServer
        .from('users')
        .update({
          first_name: telegramUser.first_name,
          last_name: telegramUser.last_name,
          username: telegramUser.username,
          photo_url: telegramUser.photo_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating user:', updateError);
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
      }

      user = updatedUser;
    } else {
      // Создаем нового пользователя
      const { data: newUser, error: insertError } = await supabaseServer
        .from('users')
        .insert({
          telegram_id: telegramUser.id,
          first_name: telegramUser.first_name,
          last_name: telegramUser.last_name,
          username: telegramUser.username,
          photo_url: telegramUser.photo_url,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating user:', insertError);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
      }

      user = newUser;
    }

    return NextResponse.json({ 
      success: true, 
      user: {
        id: user.id, // UUID из Supabase
        telegram_id: user.telegram_id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        photo_url: user.photo_url
      }
    });
  } catch (e) {
    return NextResponse.json({ error: 'Ошибка авторизации' }, { status: 500 });
  }
} 