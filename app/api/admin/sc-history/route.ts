import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, adminUnauthorized } from '../../../../lib/adminAuth';
import { getScHistory } from '../../../../lib/scHistoryServer';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// История SC выбранного в «💰 Начислить SC» пользователя (app/admin/ScHistoryAdmin.tsx)
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return adminUnauthorized();
  const userId = new URL(req.url).searchParams.get('user_id') || '';
  if (!UUID_RE.test(userId)) return NextResponse.json({ error: 'Неверный user_id' }, { status: 400 });
  try {
    return NextResponse.json({ transactions: await getScHistory(userId) });
  } catch (e: any) {
    console.error('admin sc-history error:', e);
    return NextResponse.json({ error: e?.message || 'Ошибка загрузки истории' }, { status: 500 });
  }
}
