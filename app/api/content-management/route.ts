import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error('Supabase configuration is missing. Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  }
  
  return createClient(url, key);
}

// GET - получение контента
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // ai_prompts, reminder_scenarios, gamification_rules, etc.
    const name = searchParams.get('name');
    const isActive = searchParams.get('active') !== 'false';

    let query = supabase.from(type || 'ai_prompts').select('*');
    
    if (name) {
      query = query.eq('name', name);
    }
    
    if (isActive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Content management GET error:', error);
      return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Content management GET exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - создание/обновление контента
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { type, name, content, description, isActive = true, ...otherFields } = await req.json();

    if (!type || !name) {
      return NextResponse.json({ error: 'Type and name are required' }, { status: 400 });
    }

    // Проверяем существование записи
    const { data: existing } = await supabase
      .from(type)
      .select('id')
      .eq('name', name)
      .single();

    let result;
    if (existing) {
      // Обновляем существующую запись
      const { data, error } = await supabase
        .from(type)
        .update({
          content,
          description,
          is_active: isActive,
          ...otherFields,
          updated_at: new Date().toISOString()
        })
        .eq('name', name)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Создаем новую запись
      const { data, error } = await supabase
        .from(type)
        .insert([{
          name,
          content,
          description,
          is_active: isActive,
          ...otherFields
        }])
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json({ 
      success: true, 
      data: result,
      message: existing ? 'Content updated' : 'Content created'
    });

  } catch (error: any) {
    console.error('Content management POST error:', error);
    return NextResponse.json({ 
      error: 'Failed to save content',
      details: error.message 
    }, { status: 500 });
  }
}

// PUT - обновление контента
export async function PUT(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { id, type, ...updateData } = await req.json();

    if (!id || !type) {
      return NextResponse.json({ error: 'ID and type are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from(type)
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Content updated'
    });

  } catch (error: any) {
    console.error('Content management PUT error:', error);
    return NextResponse.json({ 
      error: 'Failed to update content',
      details: error.message 
    }, { status: 500 });
  }
}

// DELETE - удаление контента (деактивация)
export async function DELETE(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const name = searchParams.get('name');
    const id = searchParams.get('id');

    if (!type || (!name && !id)) {
      return NextResponse.json({ error: 'Type and name or id are required' }, { status: 400 });
    }

    let query = supabase.from(type).update({ is_active: false });
    
    if (id) {
      query = query.eq('id', id);
    } else {
      query = query.eq('name', name);
    }

    const { data, error } = await query.select().single();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Content deactivated'
    });

  } catch (error: any) {
    console.error('Content management DELETE error:', error);
    return NextResponse.json({ 
      error: 'Failed to deactivate content',
      details: error.message 
    }, { status: 500 });
  }
}
