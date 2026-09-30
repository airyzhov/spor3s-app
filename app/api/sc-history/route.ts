import { NextRequest, NextResponse } from 'next/server';
import { getScHistory } from '../../../lib/scHistoryServer';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// «🧾 История SC» в кабинете: операции человека, новые сверху (lib/scHistoryServer.ts).
// Фоллбек-пользователь без UUID — пустой список, в базу за ним не ходим (как у розыгрыша).
export async function GET(req: NextRequest) {
  const userId = new URL(req.url).searchParams.get('user_id') || '';
  if (!UUID_RE.test(userId)) return NextResponse.json({ success: true, transactions: [] });
  try {
    return NextResponse.json({ success: true, transactions: await getScHistory(userId) });
  } catch (e) {
    console.error('sc-history error:', e);
    return NextResponse.json({ success: false, transactions: [] }, { status: 500 });
  }
}
