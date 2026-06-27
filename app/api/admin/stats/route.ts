import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../supabaseServerClient';
import { isAdmin, adminUnauthorized } from '../../../../lib/adminAuth';

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return adminUnauthorized();
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

    // 2. Суммарный SC — из user_levels (тратимый баланс)
    const { data: levels, error: levelsError } = await supabaseServer
      .from('user_levels')
      .select('user_id, current_sc_balance');
    if (levelsError) {
      console.error('levelsError:', levelsError);
      return NextResponse.json({ error: levelsError.message }, { status: 500 });
    }
    let totalSC = 0;
    (levels || []).forEach(l => { totalSC += l.current_sc_balance || 0; });

    // 3. Топ-10 пользователей по SC
    const topUsers = [...(levels || [])]
      .sort((a, b) => (b.current_sc_balance || 0) - (a.current_sc_balance || 0))
      .slice(0, 10)
      .map(l => ({ user_id: l.user_id, sc: l.current_sc_balance || 0 }));

    // 4. Количество заказов
    const { data: orders, error: ordersError } = await supabaseServer
      .from('orders')
      .select('id');
    if (ordersError) {
      console.error('ordersError:', ordersError);
      return NextResponse.json({ error: ordersError.message }, { status: 500 });
    }
    const totalOrders = orders.length;

    // 5. Количество транзакций SC
    const { count: txCount } = await supabaseServer
      .from('sc_transactions')
      .select('id', { count: 'exact', head: true });
    const totalTransactions = txCount || 0;

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