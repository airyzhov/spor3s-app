import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, adminUnauthorized } from '../../../../lib/adminAuth';
import { manualAdjustSC } from '../../../../lib/scLedger';

// Ручное начисление или списание SC из админки («💰 Начислить SC»). Запись, баланс и сообщение
// в боте — lib/scLedger.ts manualAdjustSC; notify: false — галочка «Уведомить в боте» снята.
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return adminUnauthorized();
  try {
    const { user_id, amount, description, notify } = await req.json();
    const amt = Number(amount);
    if (!user_id || !amt) {
      return NextResponse.json({ error: 'user_id и amount обязательны' }, { status: 400 });
    }

    const balance = await manualAdjustSC({ userId: user_id, amount: amt, description, notify: notify !== false });
    return NextResponse.json({ success: true, balance });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
