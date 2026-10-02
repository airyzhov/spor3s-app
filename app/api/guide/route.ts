import { NextRequest, NextResponse } from 'next/server';
import { completeGuide, guideCompleted } from '../../../lib/guideServer';
import { GUIDE_REWARD_SC } from '../../../lib/newbieGuide';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Гид новичка (lib/guideServer.ts). GET — пройден ли (строка в кабинете, плашка на главной);
// POST — ответы на все 7 вопросов → +100 SC один раз. Фоллбек-пользователь без UUID в базу не ходит.
export async function GET(req: NextRequest) {
  const userId = new URL(req.url).searchParams.get('user_id') || '';
  if (!UUID_RE.test(userId)) return NextResponse.json({ success: true, completed: false });
  try {
    return NextResponse.json({ success: true, completed: await guideCompleted(userId) });
  } catch (e) {
    console.error('guide status error:', e);
    return NextResponse.json({ success: false, completed: false }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user_id, answers } = await req.json();
    if (typeof user_id !== 'string' || !UUID_RE.test(user_id)) {
      return NextResponse.json({ success: false, error: 'Нужен user_id' }, { status: 400 });
    }
    const result = await completeGuide(user_id, answers);
    // 'reason' in — без strict в tsconfig сужение по result.ok не срабатывает
    if ('reason' in result) {
      return result.reason === 'answers'
        ? NextResponse.json({ success: false, error: 'Ответы не сходятся' }, { status: 400 })
        : NextResponse.json({ success: false, error: 'Пользователь не найден' }, { status: 404 });
    }
    return NextResponse.json({ success: true, credited: result.credited, reward: GUIDE_REWARD_SC });
  } catch (e) {
    console.error('guide complete error:', e);
    return NextResponse.json({ success: false, error: 'Ошибка начисления' }, { status: 500 });
  }
}
