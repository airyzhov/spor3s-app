import { NextRequest, NextResponse } from 'next/server';

// Проверка доступа к админ-API по секрету из заголовка x-admin-secret.
// Сравниваем с ADMIN_SECRET из окружения. Fail-closed: если секрет не задан — доступа нет.
export function isAdmin(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  const provided = req.headers.get('x-admin-secret');
  return !!provided && provided === secret;
}

// Удобный ответ 401 для неавторизованных запросов.
export function adminUnauthorized() {
  return NextResponse.json({ error: 'Доступ запрещён' }, { status: 401 });
}
