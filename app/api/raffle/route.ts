import { NextRequest, NextResponse } from 'next/server';
import { raffleMe, raffleStage, type RaffleMe, type RaffleView } from '../../../lib/raffle';
import { getLatestDraw, getUserProgress, joinRaffle, RaffleJoinError } from '../../../lib/raffleServer';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Карточка «Розыгрыш 10.10» в кабинете и строка на главной: стадия, личный прогресс, победители.
export async function GET(req: NextRequest) {
  try {
    const userId = new URL(req.url).searchParams.get('user_id') || '';
    const { draw } = await getLatestDraw();
    const stage = raffleStage(new Date(), !!draw);

    // Фоллбек-пользователь без UUID — прогресс не считаем, в базу за ним не ходим
    let me: RaffleMe | null = null;
    if (stage !== 'hidden' && UUID_RE.test(userId)) me = raffleMe(await getUserProgress(userId));

    const body: RaffleView = {
      success: true,
      stage,
      me,
      winners: draw ? draw.winners.map((w) => ({ name: w.name, prize: w.prize })) : null,
    };
    return NextResponse.json(body);
  } catch (e) {
    console.error('raffle error:', e);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

// Кнопка «✋ Участвую»: { user_id, action: 'join' } → обновлённый прогресс. Правила — lib/raffleServer.ts joinRaffle
export async function POST(req: NextRequest) {
  try {
    const { user_id, action } = await req.json();
    if (action !== 'join' || !UUID_RE.test(String(user_id || ''))) {
      return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 });
    }
    const me = await joinRaffle(String(user_id));
    return NextResponse.json({ success: true, me });
  } catch (e) {
    if (e instanceof RaffleJoinError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error('raffle join error:', e);
    return NextResponse.json({ error: 'Не получилось, попробуй ещё раз' }, { status: 500 });
  }
}
