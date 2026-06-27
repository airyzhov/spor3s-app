import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../supabaseServerClient';
import { isAdmin, adminUnauthorized } from '../../../../lib/adminAuth';

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return adminUnauthorized();
  try {
    const { user_id, amount, description } = await req.json();
    const amt = Number(amount);
    if (!user_id || !amt) {
      return NextResponse.json({ error: 'user_id и amount обязательны' }, { status: 400 });
    }

    // Лог транзакции (тот же леджер, что и заказы/рефералка)
    await supabaseServer.from('sc_transactions').insert([{
      user_id,
      amount: amt,
      transaction_type: amt >= 0 ? 'earned' : 'spent',
      source_type: 'manual',
      description: description || 'Ручное начисление админом',
      created_at: new Date().toISOString(),
    }]);

    // Обновляем тратимый баланс в user_levels (создаём строку при отсутствии)
    const { data: level } = await supabaseServer
      .from('user_levels')
      .select('current_sc_balance, total_sc_earned, total_sc_spent')
      .eq('user_id', user_id)
      .single();

    if (!level) {
      await supabaseServer.from('user_levels').insert([{
        user_id,
        current_level: '🌱 Новичок',
        level_code: 'novice',
        current_sc_balance: amt,
        total_sc_earned: amt > 0 ? amt : 0,
        total_sc_spent: amt < 0 ? -amt : 0,
      }]);
    } else {
      await supabaseServer.from('user_levels').update({
        current_sc_balance: (level.current_sc_balance || 0) + amt,
        total_sc_earned: (level.total_sc_earned || 0) + (amt > 0 ? amt : 0),
        total_sc_spent: (level.total_sc_spent || 0) + (amt < 0 ? -amt : 0),
        updated_at: new Date().toISOString(),
      }).eq('user_id', user_id);
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}