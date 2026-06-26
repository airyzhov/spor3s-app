import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '../../../supabaseServerClient';
import { isAdmin, adminUnauthorized } from '../../../../lib/adminAuth';

// Список заказов для админки (учёт продаж).
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return adminUnauthorized();
  const { data, error } = await supabaseServer
    .from('orders')
    .select('id, created_at, fio, phone, address, items, total, status, comment, referral_code, tracking_number, user_id')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ orders: data || [] });
}

// Обновление статуса заказа (pending / paid / shipped / completed / cancelled).
export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return adminUnauthorized();
  const { id, status } = await req.json();
  if (!id || !status) {
    return NextResponse.json({ error: 'id и status обязательны' }, { status: 400 });
  }
  const { error } = await supabaseServer.from('orders').update({ status }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
