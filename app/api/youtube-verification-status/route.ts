import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { user_id } = await req.json();

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    // Получаем последнюю заявку на верификацию
    const { data: verificationRequest, error } = await supabase
      .from('youtube_verification_requests')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Проверяем, получал ли пользователь уже бонус
    const { data: existingBonus } = await supabase
      .from('coin_transactions')
      .select('id')
      .eq('user_id', user_id)
      .eq('type', 'subscribe_youtube')
      .single();

    const hasReceivedBonus = !!existingBonus;

    return NextResponse.json({
      success: true,
      hasReceivedBonus,
      verificationRequest: verificationRequest || null,
      status: verificationRequest?.status || 'no_request'
    });

  } catch (error) {
    console.error('YouTube verification status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 