import { NextRequest, NextResponse } from 'next/server';
import { isAdmin, adminUnauthorized } from '../../../../lib/adminAuth';
import { RAFFLE, toCsv } from '../../../../lib/raffle';
import { announceAudience, getLatestDraw, listParticipants } from '../../../../lib/raffleServer';

export const dynamic = 'force-dynamic';

// Учёт участников розыгрыша для админки; ?format=csv — таблица для Excel.
// announce — сколько человек получит рассылку о розыгрыше (кнопка «📣 Рассказать о розыгрыше»).
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return adminUnauthorized();
  try {
    const [participants, { draw, tableReady }, announce] = await Promise.all([
      listParticipants(),
      getLatestDraw(),
      announceAudience(),
    ]);

    if (new URL(req.url).searchParams.get('format') === 'csv') {
      const csv = toCsv([
        ['Участник', 'Telegram ID', 'Заданий', 'Друзей', 'Нажал «Участвую»', 'Участвует', 'Приз при победе'],
        ...participants.map((p) => [
          p.name,
          p.telegram_id || '',
          p.tasks,
          p.friends,
          p.joined ? 'да' : 'нет',
          p.eligible ? 'да' : 'нет',
          p.prize?.label || '',
        ]),
      ]);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${RAFFLE.id}.csv"`,
        },
      });
    }

    return NextResponse.json({ participants, draw, tableReady, announce });
  } catch (e: any) {
    console.error('admin raffle error:', e);
    return NextResponse.json({ error: e?.message || 'Ошибка загрузки розыгрыша' }, { status: 500 });
  }
}
