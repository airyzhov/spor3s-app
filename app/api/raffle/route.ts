import { NextRequest, NextResponse } from 'next/server';
import { isEligible, nextPrize, prizeForFriends, raffleStage, type RaffleMe, type RaffleView } from '../../../lib/raffle';
import { getLatestDraw, getUserProgress } from '../../../lib/raffleServer';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Кнопка «Розыгрыш 10.10» на главной: стадия, личный прогресс, победители.
export async function GET(req: NextRequest) {
  try {
    const userId = new URL(req.url).searchParams.get('user_id') || '';
    const { draw } = await getLatestDraw();
    const stage = raffleStage(new Date(), !!draw);

    // Фоллбек-пользователь без UUID — прогресс не считаем, в базу за ним не ходим
    let me: RaffleMe | null = null;
    if (stage !== 'hidden' && UUID_RE.test(userId)) {
      const { tasks, friends } = await getUserProgress(userId);
      const eligible = isEligible(tasks, friends);
      me = { tasks, friends, eligible, prize: eligible ? prizeForFriends(friends) : null, next: nextPrize(friends) };
    }

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
