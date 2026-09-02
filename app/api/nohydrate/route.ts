import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Маячок страховки загрузки (lib/loadingFailsafe.ts): сюда стучится страница, на которой React
// не смонтировался за отведённое время. Тело не нужно — nginx логирует URL с параметрами
// (t — секунд ждали, rs — document.readyState, tg — был ли SDK Телеграма) и User-Agent.
// Смотреть: grep nohydrate /var/log/nginx/access.log
export async function GET() {
  return new NextResponse(null, { status: 204 });
}
