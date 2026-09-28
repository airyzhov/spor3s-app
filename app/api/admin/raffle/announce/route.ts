import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, adminUnauthorized } from '../../../../../lib/adminAuth';
import { announceRaffle, RaffleJoinError } from '../../../../../lib/raffleServer';

export const dynamic = 'force-dynamic';

// Рассылка о розыгрыше — только по кнопке владельца в админке. Пишет пользователям Telegram,
// которые ещё не нажали «Участвую»; одному человеку — один раз (lib/raffleServer.ts announceRaffle).
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return adminUnauthorized();
  try {
    const { sent, failed } = await announceRaffle();
    return NextResponse.json({ success: true, sent, failed });
  } catch (e: any) {
    if (e instanceof RaffleJoinError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error('raffle announce error:', e);
    return NextResponse.json({ error: e?.message || 'Ошибка рассылки' }, { status: 500 });
  }
}
