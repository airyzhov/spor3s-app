import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../supabaseServerClient';

export async function POST(req: NextRequest) {
  try {
    const { user_id, amount, description } = await req.json();
    if (!user_id || !amount) {
      return NextResponse.json({ error: 'user_id и amount обязательны' }, { status: 400 });
    }
    const { error } = await supabaseServer.from('coin_transactions').insert([
      {
        user_id,
        type: 'manual',
        amount,
        description: description || 'Ручное начисление админом',
        created_at: new Date().toISOString(),
      }
    ]);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
} 