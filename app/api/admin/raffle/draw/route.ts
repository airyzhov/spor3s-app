import { NextRequest, NextResponse } from 'next/server';
import { randomInt } from 'crypto';
import { isAdmin, adminUnauthorized } from '../../../../../lib/adminAuth';
import { RAFFLE, pickWinners } from '../../../../../lib/raffle';
import { getLatestDraw, listParticipants, saveDraw } from '../../../../../lib/raffleServer';

export const dynamic = 'force-dynamic';

// Выбор победителей по команде владельца. Итог сохраняется ДО ответа: перезагрузка страницы
// или повторный клик его не переигрывают; переиграть можно только явно, с force.
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return adminUnauthorized();
  try {
    if (Date.now() < Date.parse(RAFFLE.endsAt)) {
      return NextResponse.json({ error: 'Приём заявок ещё идёт — розыгрыш после 10.10, 23:59 GMT' }, { status: 400 });
    }
    const { force } = await req.json().catch(() => ({ force: false }));

    const { draw: existing, tableReady } = await getLatestDraw();
    if (!tableReady) {
      return NextResponse.json(
        { error: 'Нет таблицы raffle_draws — выполни raffle_draws.sql в Supabase → SQL Editor' },
        { status: 409 },
      );
    }
    if (existing && !force) {
      return NextResponse.json({ error: 'Победители уже выбраны', draw: existing }, { status: 409 });
    }

    const participants = (await listParticipants()).filter((p) => p.eligible);
    if (!participants.length) {
      return NextResponse.json({ error: 'Нет участников, выполнивших оба условия' }, { status: 400 });
    }

    const winners = pickWinners(participants, RAFFLE.winnersCount, (max) => randomInt(max)).map((p) => ({
      user_id: p.user_id,
      name: p.name,
      friends: p.friends,
      prize: p.prize,
    }));
    const draw = await saveDraw(participants, winners);
    return NextResponse.json({ success: true, draw });
  } catch (e: any) {
    console.error('raffle draw error:', e);
    return NextResponse.json({ error: e?.message || 'Ошибка розыгрыша' }, { status: 500 });
  }
}
