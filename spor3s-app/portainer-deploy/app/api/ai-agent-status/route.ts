import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from '../../supabaseServerClient';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const user_id = searchParams.get('user_id');

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    // Получаем статус агента из базы данных
    const { data: agentStatus, error } = await supabaseServer
      .from('ai_agent_status')
      .select('is_active, last_updated')
      .eq('user_id', user_id)
      .single();

    if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
      console.error('Ошибка получения статуса агента:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Если таблицы нет (42P01) — возвращаем дефолтный статус, не падаем
    if (error && error.code === '42P01') {
      return NextResponse.json({ isActive: true, lastUpdated: new Date().toISOString() });
    }

    // Если записи нет, создаем новую с неактивным статусом
    if (!agentStatus) {
      const { data: newStatus, error: insertError } = await supabaseServer
        .from('ai_agent_status')
        .insert({
          user_id,
          is_active: false,
          last_updated: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error('Ошибка создания статуса агента:', insertError);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }

      return NextResponse.json({
        isActive: false,
        lastUpdated: newStatus.last_updated
      });
    }

    return NextResponse.json({
      isActive: agentStatus.is_active,
      lastUpdated: agentStatus.last_updated
    });

  } catch (error) {
    console.error('Ошибка API ai-agent-status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 