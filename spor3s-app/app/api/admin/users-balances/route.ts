import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../supabaseServerClient';

export async function GET(req: NextRequest) {
  // Получить всех пользователей
  const { data: users, error: usersError } = await supabaseServer
    .from('users')
    .select('id, telegram_id, name');
  if (usersError) return NextResponse.json({ error: usersError.message }, { status: 500 });

  // Получить все coin_transactions
  const { data: txs, error: txsError } = await supabaseServer
    .from('coin_transactions')
    .select('user_id, amount, type');
  if (txsError) return NextResponse.json({ error: txsError.message }, { status: 500 });

  // Посчитать баланс для каждого пользователя
  const balances: Record<string, number> = {};
  (txs || []).forEach(tx => {
    if (!balances[tx.user_id]) balances[tx.user_id] = 0;
    balances[tx.user_id] += tx.type === 'spent' ? -tx.amount : tx.amount;
  });

  const result = users.map(u => ({
    id: u.id,
    telegram_id: u.telegram_id,
    name: u.name,
    balance: balances[u.id] || 0
  }));

  return NextResponse.json({ users: result });
} 