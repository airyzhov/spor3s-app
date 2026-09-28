import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../supabaseServerClient';
import { getOrCreateUser } from '../../../lib/initUserHandler';
import { notifyReferrerOfNewFriend } from '../../../lib/raffleNotify';
import { grantReferralWelcome } from '../../../lib/referral';
import { openedAt, openedMiniApp } from '../../../lib/raffle';
console.log('[init-user route] typeof getOrCreateUser:', typeof getOrCreateUser);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[init-user] Received body:', body);
    const { telegram_id, referral_code, source, username } = body;
    console.log('[init-user] telegram_id:', telegram_id);
    if (!telegram_id) {
      console.log('[init-user] No telegram_id provided');
      return NextResponse.json({ error: 'telegram_id required' }, { status: 400 });
    }
    const id = await getOrCreateUser(telegram_id, referral_code, username);
    console.log('[init-user] User ID:', id);
    
    // Создаем запись в ai_agent_status если она не существует
    const userSource = source || 'mini_app';
    console.log('[init-user] Creating/updating AI agent status for source:', userSource);

    // Строку ai_agent_status каждому новому пользователю создаёт триггер БД (last_activity = created_at),
    // поэтому первый вход — это не «строки нет», а «last_activity ещё не сдвигался» (lib/raffle.ts openedMiniApp).
    // По тому же признаку розыгрыш засчитывает друга («открыл приложение»).
    const { data: seenBefore } = await supabaseServer
      .from('ai_agent_status')
      .select('user_id, last_activity, created_at')
      .eq('user_id', id)
      .maybeSingle();

    await supabaseServer
      .from('ai_agent_status')
      .upsert({
        user_id: id,
        telegram_id,
        source: userSource,
        is_active: true,
        auto_mode: true,
        last_activity: openedAt(seenBefore, Date.now()),
      }, { onConflict: 'user_id' });

    // Первый вход друга, пришедшего по ссылке, — повод написать пригласившему (lib/raffleNotify.ts)
    if (!openedMiniApp(seenBefore)) {
      try {
        await notifyReferrerOfNewFriend(id);
      } catch (e) {
        console.error('[raffle] уведомление пригласившему:', e);
      }
    }

    // Пришёл по приглашению и ещё не покупал — приветственные SC сразу, при входе в магазин
    try {
      await grantReferralWelcome(id);
    } catch (e) {
      console.error('[referral] приветственный бонус:', e);
    }

    return NextResponse.json({ id, source: userSource });
  } catch (e: any) {
    console.error('[init-user] Error:', e.message, e.stack);
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 });
  }
} 