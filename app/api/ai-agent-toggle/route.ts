import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error('Supabase configuration is missing. Please check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  }
  
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const { user_id, action } = await req.json();

    if (!user_id || !action) {
      return NextResponse.json({ error: 'user_id and action are required' }, { status: 400 });
    }

    if (!['start', 'stop'].includes(action)) {
      return NextResponse.json({ error: 'action must be "start" or "stop"' }, { status: 400 });
    }

    const isActive = action === 'start';

    // Создаем клиент Supabase
    const supabase = getSupabaseClient();

    // Обновляем или создаем статус агента
    const { data: agentStatus, error } = await supabase
      .from('ai_agent_status')
      .upsert({
        user_id,
        is_active: isActive,
        last_updated: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Ошибка обновления статуса агента:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Логируем действие
    console.log(`AI Agent ${action}ed for user ${user_id}`);

    // Если агент запускается, можно добавить дополнительную логику
    if (isActive) {
      // Например, отправка уведомления в Telegram
      console.log(`AI Agent activated for user ${user_id}`);
    } else {
      // Логика остановки агента
      console.log(`AI Agent deactivated for user ${user_id}`);
    }

    return NextResponse.json({
      success: true,
      isActive,
      message: `AI Agent ${action}ed successfully`,
      lastUpdated: agentStatus.last_updated
    });

  } catch (error) {
    console.error('Ошибка API ai-agent-toggle:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 