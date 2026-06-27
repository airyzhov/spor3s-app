import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../supabaseServerClient';
import { isAdmin, adminUnauthorized } from '../../../../lib/adminAuth';

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return adminUnauthorized();
  // Пользователи
  const { data: users, error: usersError } = await supabaseServer
    .from('users')
    .select('id, telegram_id, name, username, phone');
  if (usersError) return NextResponse.json({ error: usersError.message }, { status: 500 });

  // Баланс берём из user_levels.current_sc_balance (тот же, что тратится на скидку)
  const { data: levels, error: levelsError } = await supabaseServer
    .from('user_levels')
    .select('user_id, current_sc_balance');
  if (levelsError) return NextResponse.json({ error: levelsError.message }, { status: 500 });

  const balances: Record<string, number> = {};
  (levels || []).forEach(l => { balances[l.user_id] = l.current_sc_balance || 0; });

  const result = (users || []).map(u => ({
    id: u.id,
    telegram_id: u.telegram_id,
    name: u.name,
    username: u.username,
    phone: u.phone,
    balance: balances[u.id] || 0,
  }));

  return NextResponse.json({ users: result });
}