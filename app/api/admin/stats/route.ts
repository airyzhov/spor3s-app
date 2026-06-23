import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../supabaseServerClient';

export async function GET(req: NextRequest) {
  try {
    // 1. Общее число пользователей
    const { data: users, error: usersError } = await supabaseServer
      .from('users')
      .select('id');
    if (usersError) {
      console.error('usersError:', usersError);
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }
    const totalUsers = users.length;

    // 2. Суммарный SC
    const { data: coins, error: coinsError } = await supabaseServer
      .from('coin_transactions')
      .select('user_id, amount, type');
    if (coinsError) {
      console.error('coinsError:', coinsError);
      return NextResponse.json({ error: coinsError.message }, { status: 500 });
    }
    const userSC: Record<string, number> = {};
    let totalSC = 0;
    (coins || []).forEach(tx => {
      if (!userSC[tx.user_id]) userSC[tx.user_id] = 0;
      userSC[tx.user_id] += tx.type === 'spent' ? -tx.amount : tx.amount;
      totalSC += tx.type === 'spent' ? -tx.amount : tx.amount;
    });

    // 3. Топ-10 пользователей по SC
    const topUsers = Object.entries(userSC)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([user_id, sc]) => ({ user_id, sc }));

    // 4. Количество заказов
    const { data: orders, error: ordersError } = await supabaseServer
      .from('orders')
      .select('id');
    if (ordersError) {
      console.error('ordersError:', ordersError);
      return NextResponse.json({ error: ordersError.message }, { status: 500 });
    }
    const totalOrders = orders.length;

    // 5. Количество транзакций
    const totalTransactions = coins.length;

    return NextResponse.json({
      totalUsers,
      totalSC,
      topUsers,
      totalOrders,
      totalTransactions
    });
  } catch (e) {
    console.error('UNCAUGHT ERROR in /api/admin/stats:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
} 