# Поле «Код друга» — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** В кабинете — поле, где пришедший без ссылки вводит @username или Telegram ID пригласившего и сразу получает 100 SC.

**Architecture:** Правила — в `lib/referral.ts` (`claimReferral`, `canEnterInviterCode`, `parseInviterCode`, `ownReferralCode`), начисление — уже готовый `grantReferralWelcome`. API `POST /api/referral-bonus` (легаси-код заменяется), `/api/referral-stats` отдаёт `canEnterInviterCode`. UI — компонент `InviterCodeForm` в разделе «Реферальная система».

**Tech Stack:** Next.js 14, TypeScript, Supabase (`supabaseServer`), Jest + ts-jest + RTL.

**Спека:** `docs/superpowers/specs/2026-09-25-inviter-code-design.md`

## Global Constraints

- Код: `@username` или числовой Telegram ID (5–15 цифр); телефон не принимается.
- Поле — только Telegram-пользователям без пригласившего и без оплаченных заказов (`paid`/`shipped`/`completed`).
- Пригласивший — только настоящий пользователь Telegram (числовой `telegram_id`).
- Тексты ошибок — как в спеке, дословно.
- Тесты: `npx jest <путь>`; полный прогон — 11 старых падений в 8 наборах не наши.

---

### Task 1: Правила кода друга (`lib/referral.ts`)

**Files:**
- Modify: `lib/referral.ts` (хелпер `hasPaidOrders`, новые функции в конце)
- Test: `lib/__tests__/referralClaim.test.ts` (создать)

**Interfaces:**
- Produces: `parseInviterCode(raw: unknown): { kind: 'telegram_id' | 'username'; value: string } | null`;
  `ownReferralCode(user: { username?: string | null; telegram_id?: string | null } | null): string | null`;
  `class ReferralClaimError extends Error { status: number }`;
  `canEnterInviterCode(userId: string): Promise<boolean>`;
  `claimReferral(userId: string, rawCode: unknown): Promise<{ name: string; welcomeSc: number }>`.

- [ ] **Step 1: Падающий тест** — `lib/__tests__/referralClaim.test.ts`: поддельная база как в
  `referralWelcome.test.ts`, плюс `ilike` (SQL LIKE → RegExp с учётом `\_`/`\%`); сценарии:
  разбор кода; привязка по `@ryzhov_ai` к `Ryzhov_ai`, а не к стоящему раньше `ryzhovXai`; по ID;
  +100 SC и `referral_welcome`; ошибки 400/403/404/404(pending-)/400(свой)/409/409 с текстами из спеки;
  `canEnterInviterCode` (да / уже приглашён / покупал / гость); `ownReferralCode` (ник / ID / гость / без телефона).
- [ ] **Step 2:** `npx jest lib/__tests__/referralClaim.test.ts` → FAIL (функций нет).
- [ ] **Step 3: Реализация** в `lib/referral.ts`:

```ts
async function hasPaidOrders(userId: string, exceptOrderId?: string): Promise<boolean> {
  const { data: orders, error } = await supabaseServer.from('orders').select('id, status').eq('user_id', userId);
  if (error) throw new Error(error.message);
  return (orders || []).some((o: { id: string; status: string | null }) => o.id !== exceptOrderId && isPaidStatus(o.status));
}
```

`grantReferralWelcome` проверяет покупки через `hasPaidOrders(userId, opts.orderId)`. Новые функции:

```ts
const TG_ID = /^\d{5,15}$/;

export function parseInviterCode(raw: unknown): { kind: 'telegram_id' | 'username'; value: string } | null {
  const code = String(raw ?? '').trim().replace(/^@/, '');
  if (TG_ID.test(code)) return { kind: 'telegram_id', value: code };
  if (/^[A-Za-z][A-Za-z0-9_]{3,31}$/.test(code)) return { kind: 'username', value: code };
  return null;
}

export function ownReferralCode(user: { username?: string | null; telegram_id?: string | null } | null): string | null {
  if (!user) return null;
  if (user.username) return '@' + user.username;
  const id = String(user.telegram_id ?? '');
  return TG_ID.test(id) ? id : null;
}

export class ReferralClaimError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function likeExact(value: string): string {
  return value.replace(/[\\%_]/g, (c) => '\\' + c);
}

async function isTelegramUser(userId: string): Promise<boolean> {
  const { data } = await supabaseServer.from('users').select('telegram_id').eq('id', userId).maybeSingle();
  return !!data && TG_ID.test(String(data.telegram_id ?? ''));
}

async function hasInviter(userId: string): Promise<boolean> {
  const { data } = await supabaseServer.from('referrals').select('id').eq('referred_user_id', userId).limit(1);
  return !!(data && data.length);
}

export async function canEnterInviterCode(userId: string): Promise<boolean> {
  if (!(await isTelegramUser(userId)) || (await hasInviter(userId))) return false;
  return !(await hasPaidOrders(userId));
}

export async function claimReferral(userId: string, rawCode: unknown): Promise<{ name: string; welcomeSc: number }> {
  const code = parseInviterCode(rawCode);
  if (!code) throw new ReferralClaimError(400, 'Введите @username или Telegram ID друга');
  if (!(await isTelegramUser(userId))) throw new ReferralClaimError(403, 'Код друга можно ввести в приложении из Telegram');

  const users = supabaseServer.from('users').select('id, telegram_id');
  const { data: found } = await (code.kind === 'telegram_id'
    ? users.eq('telegram_id', code.value)
    : users.ilike('username', likeExact(code.value))
  ).limit(1);
  const referrer = found?.[0];
  if (!referrer || !TG_ID.test(String(referrer.telegram_id ?? ''))) {
    throw new ReferralClaimError(404, 'Не нашли такого пользователя — проверьте код');
  }
  if (referrer.id === userId) throw new ReferralClaimError(400, 'Это ваш собственный код — отправьте его друзьям');
  if (await hasInviter(userId)) throw new ReferralClaimError(409, 'Пригласивший у вас уже есть');
  if (await hasPaidOrders(userId)) throw new ReferralClaimError(409, 'Код друга можно ввести только до первой покупки');

  const { error } = await supabaseServer.from('referrals').insert([{
    referrer_user_id: referrer.id,
    referred_user_id: userId,
    status: 'pending',
    created_at: new Date().toISOString(),
  }]);
  if (error) throw new Error(error.message);

  await grantReferralWelcome(userId);
  return (await getInvitedBy(userId)) ?? { name: 'друг', welcomeSc: 0 };
}
```

- [ ] **Step 4:** `npx jest lib/__tests__/referralClaim.test.ts lib/__tests__/referralWelcome.test.ts` → PASS.
- [ ] **Step 5:** commit «Код друга: claimReferral, canEnterInviterCode, ownReferralCode».

### Task 2: API

**Files:** `app/api/referral-bonus/route.ts` (переписать), `app/api/referral-stats/route.ts`.

- [ ] **Step 1:** `/api/referral-bonus`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { claimReferral, ReferralClaimError } from "../../../lib/referral";

// Поле «Код друга» в кабинете (InviterCodeForm): привязать пригласившего по @username или
// Telegram ID и сразу начислить приветственные SC. Правила — lib/referral.ts claimReferral.
export async function POST(req: NextRequest) {
  try {
    const { user_id, code } = await req.json();
    if (!user_id) return NextResponse.json({ error: "Нужен user_id" }, { status: 400 });
    const invitedBy = await claimReferral(String(user_id), code);
    return NextResponse.json({ success: true, invitedBy });
  } catch (e) {
    if (e instanceof ReferralClaimError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[referral] код друга:", e);
    return NextResponse.json({ error: "Не получилось, попробуйте ещё раз" }, { status: 500 });
  }
}
```

- [ ] **Step 2:** `/api/referral-stats`: `const referralCode = ownReferralCode(user);`, в ответ — `canEnterInviterCode: await canEnterInviterCode(user_id)`.
- [ ] **Step 3:** `npx tsc --noEmit -p tsconfig.json | grep -E "referral-bonus|referral-stats|lib/referral"` → пусто; commit.

### Task 3: Форма в кабинете

**Files:** создать `app/(client)/InviterCodeForm.tsx`, тест `app/(client)/__tests__/InviterCodeForm.test.tsx`; изменить `app/(client)/RoadMap.tsx`.

- [ ] **Step 1: Падающий тест** — рендер с `userId`; ввод `@web3grow` и клик «Получить 100 SC» → `fetch('/api/referral-bonus', POST {user_id, code: '@web3grow'})`, при `{success:true}` — вызван `onClaimed`; при `{error:'Пригласивший у вас уже есть'}` (409) — текст ошибки в `role="alert"`, `onClaimed` не вызван; пустое поле — кнопка неактивна.
- [ ] **Step 2:** `npx jest "app/(client)/__tests__/InviterCodeForm.test.tsx"` → FAIL (нет компонента).
- [ ] **Step 3: Реализация** `InviterCodeForm` (props `userId`, `onClaimed`; форма, поле `aria-label="Код друга"`, placeholder «@username или ID друга», кнопка `Получить ${REFERRAL_WELCOME_SC} SC`, ошибка `role="alert"`, «Нет связи — попробуйте ещё раз» при сбое сети). В `RoadMap` — раздел «🎁 Реферальная система»: после условий `referralStats?.invitedBy` → строка «🤝 Вас пригласил … · 🎁 +N SC», иначе при `referralStats?.canEnterInviterCode` → `<InviterCodeForm userId={user.id} onClaimed={() => { fetchReferralStats(); setRefreshKey(k => k + 1); }} />`; `summary` раздела — `код друга → +100 SC`, пока форма доступна; подпись кода — «Или ваш код — друг введёт его в кабинете или при заказе:».
- [ ] **Step 4:** тест → PASS; commit.

### Task 4: Проверка и PR

- [ ] `npx jest` (только 11 старых падений), `npm run build`, превью `start-isolated` на ширине телефона (форма, ошибка, успех), PR.
