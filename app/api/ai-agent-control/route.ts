import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../supabaseServerClient';

// API для управления состоянием AI агента (старт/стоп)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { telegram_id, action, auto_mode } = body;
    
    console.log('[ai-agent-control] Received:', { telegram_id, action, auto_mode });

    if (!telegram_id) {
      return NextResponse.json({ error: 'telegram_id required' }, { status: 400 });
    }

    if (!['start', 'stop', 'toggle', 'set_auto', 'set_manual'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Получаем текущий статус AI агента
    const { data: existingStatus, error: fetchError } = await supabaseServer
      .from('ai_agent_status')
      .select('*')
      .eq('telegram_id', telegram_id.toString())
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('[ai-agent-control] Error fetching status:', fetchError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    let updateData: any = {
      last_activity: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Определяем новое состояние на основе действия
    switch (action) {
      case 'start':
        updateData.is_active = true;
        break;
      case 'stop':
        updateData.is_active = false;
        break;
      case 'toggle':
        updateData.is_active = !existingStatus?.is_active;
        break;
      case 'set_auto':
        updateData.auto_mode = true;
        break;
      case 'set_manual':
        updateData.auto_mode = false;
        break;
    }

    if (auto_mode !== undefined) {
      updateData.auto_mode = auto_mode;
    }

    if (!existingStatus) {
      // Создаем новую запись
      const { data: userData } = await supabaseServer
        .from('users')
        .select('id')
        .eq('telegram_id', telegram_id.toString())
        .single();

      if (!userData) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const { data, error } = await supabaseServer
        .from('ai_agent_status')
        .insert({
          user_id: userData.id,
          telegram_id: telegram_id.toString(),
          is_active: updateData.is_active ?? true,
          auto_mode: updateData.auto_mode ?? true,
          last_activity: updateData.last_activity,
          created_at: new Date().toISOString(),
          updated_at: updateData.updated_at
        })
        .select()
        .single();

      if (error) {
        console.error('[ai-agent-control] Error creating status:', error);
        return NextResponse.json({ error: 'Failed to create status' }, { status: 500 });
      }

      console.log('[ai-agent-control] Created new status:', data);
      return NextResponse.json({
        success: true,
        status: data,
        message: `AI agent ${data.is_active ? 'started' : 'stopped'}`
      });
    } else {
      // Обновляем существующую запись
      const { data, error } = await supabaseServer
        .from('ai_agent_status')
        .update(updateData)
        .eq('telegram_id', telegram_id.toString())
        .select()
        .single();

      if (error) {
        console.error('[ai-agent-control] Error updating status:', error);
        return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
      }

      console.log('[ai-agent-control] Updated status:', data);
      return NextResponse.json({
        success: true,
        status: data,
        message: `AI agent ${data.is_active ? 'started' : 'stopped'}`
      });
    }

  } catch (e: any) {
    console.error('[ai-agent-control] Error:', e.message, e.stack);
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}

// API для получения статуса AI агента
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const telegram_id = searchParams.get('telegram_id');

    if (!telegram_id) {
      return NextResponse.json({ error: 'telegram_id required' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('ai_agent_status')
      .select('*')
      .eq('telegram_id', telegram_id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[ai-agent-control] Error fetching status:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!data) {
      // Если записи нет, возвращаем дефолтные значения
      return NextResponse.json({
        is_active: true,
        auto_mode: true,
        exists: false
      });
    }

    return NextResponse.json({
      ...data,
      exists: true
    });

  } catch (e: any) {
    console.error('[ai-agent-control] Error:', e.message, e.stack);
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 });
  }
}
