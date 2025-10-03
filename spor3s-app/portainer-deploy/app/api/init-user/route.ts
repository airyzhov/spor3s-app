import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/initUserHandler';
console.log('[init-user route] typeof getOrCreateUser:', typeof getOrCreateUser);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[init-user] Received body:', body);
    const { telegram_id, referral_code, source } = body;
    console.log('[init-user] telegram_id:', telegram_id);
    console.log('[init-user] referral_code:', referral_code);
    console.log('[init-user] source:', source || 'mini_app');
    if (!telegram_id) {
      console.log('[init-user] No telegram_id provided');
      return NextResponse.json({ error: 'telegram_id required' }, { status: 400 });
    }
    console.log('[init-user] Calling getOrCreateUser');
    const id = await getOrCreateUser(telegram_id, referral_code);
    console.log('[init-user] User ID:', id);
    
    // Создаем запись в ai_agent_status если она не существует
    const userSource = source || 'mini_app';
    console.log('[init-user] Creating/updating AI agent status for source:', userSource);
    
    return NextResponse.json({ id, source: userSource });
  } catch (e: any) {
    console.error('[init-user] Error:', e.message, e.stack);
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 });
  }
} 