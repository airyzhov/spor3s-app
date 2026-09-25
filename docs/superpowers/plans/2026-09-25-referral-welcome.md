# Приглашение: 100 SC сразу — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Друг по реферальной ссылке сразу получает 100 SC (если ещё не покупал) и видит в кабинете, кто его пригласил.

**Architecture:** Правило начисления — одна функция `grantReferralWelcome` в `lib/referral.ts`; её зовут `/api/init-user` (каждый вход в магазин) и `processReferralOnPaid` (оплата заказа). `getInvitedBy` отдаёт «кто пригласил» для `/api/home-summary` (панель SC) и `/api/referral-stats` (форма заказа). Бот только меняет текст ответа на ссылку.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase (service role, `supabaseServer`), Jest + ts-jest + RTL, Telegraf 4 (tg-bot, отдельный tsc-проект).

**Спека:** `docs/superpowers/specs/2026-09-25-referral-welcome-design.md`

## Global Constraints

- 100 SC получает только приглашённый; пригласившему — как раньше, 5% с оплаченных заказов друга.
- Один раз на человека и только тому, у кого нет оплаченных заказов (`paid` / `shipped` / `completed`).
- Правило одно для ссылки из бота и реф-кода из формы заказа.
- Сумма — `REFERRAL_WELCOME_SC = 100` в `lib/levelUtils.ts`; бот (не видит `lib/`) пишет 100 в тексте.
- Ошибка начисления не валит вход в магазин и смену статуса заказа — только лог.
- Прод-база: локально с `.env.local` не запускать dev-сервер с записью; превью — только `start-isolated`.
- Тесты: `npx jest <путь>`; полный прогон — `npx jest` (11 старых падений в 8 наборах — не наши).

---

### Task 1: Правило начисления и «кто пригласил» (`lib/referral.ts`)

**Files:**
- Modify: `lib/levelUtils.ts` (после `REFERRAL_PERCENT`)
- Modify: `lib/referral.ts` (импорты; новые функции в конце файла)
- Test: `lib/__tests__/referralWelcome.test.ts` (создать)

**Interfaces:**
- Produces: `REFERRAL_WELCOME_SC: number` (lib/levelUtils.ts);
  `grantReferralWelcome(userId: string, opts?: { orderId?: string }): Promise<boolean>`;
  `getInvitedBy(userId: string): Promise<{ name: string; welcomeSc: number } | null>` (lib/referral.ts).

- [ ] **Step 1: Написать падающий тест** — `lib/__tests__/referralWelcome.test.ts`:

```ts
/**
 * @jest-environment node
 */
// Приветственные SC приглашённому: сразу, один раз и только тому, кто ещё не покупал
// (решение владельца 25.09). База — поддельная, в памяти.

type Row = Record<string, any>;
const db: Record<string, Row[]> = {};

function table(name: string) {
  const filters: ((r: Row) => boolean)[] = [];
  let patch: Row | null = null;
  const rows = () => (db[name] ||= []).filter((r) => filters.every((f) => f(r)));
  const run = async () => {
    if (patch) {
      rows().forEach((r) => Object.assign(r, patch));
      return { data: null, error: null };
    }
    return { data: rows(), error: null };
  };
  const api: any = {
    select: () => api,
    eq: (c: string, v: unknown) => { filters.push((r) => r[c] === v); return api; },
    in: (c: string, vs: unknown[]) => { filters.push((r) => vs.includes(r[c])); return api; },
    limit: () => api,
    update: (p: Row) => { patch = p; return api; },
    insert: async (items: Row[]) => {
      const t = (db[name] ||= []);
      items.forEach((i) => t.push({ id: `${name}-${t.length + 1}`, ...i }));
      return { data: null, error: null };
    },
    single: () => run().then((r) => ({ data: r.data?.[0] ?? null, error: r.data?.[0] ? null : { code: 'PGRST116' } })),
    maybeSingle: () => run().then((r) => ({ data: r.data?.[0] ?? null, error: null })),
    then: (res: any, rej: any) => run().then(res, rej),
  };
  return api;
}

jest.mock('../../app/supabaseServerClient', () => ({ supabaseServer: { from: (name: string) => table(name) } }));

import { grantReferralWelcome, getInvitedBy } from '../referral';

const welcomes = (userId: string) =>
  db.sc_transactions.filter((t) => t.user_id === userId && t.source_type === 'referral_welcome');
const balance = (userId: string) => db.user_levels.find((l) => l.user_id === userId)?.current_sc_balance ?? 0;

beforeEach(() => {
  db.users = [
    { id: 'inviter', username: 'web3grow' },
    { id: 'friend', username: 'friend' },
    { id: 'noname', username: null },
  ];
  db.referrals = [{ id: 'ref-1', referrer_user_id: 'inviter', referred_user_id: 'friend', status: 'pending' }];
  db.orders = [];
  db.sc_transactions = [];
  db.user_levels = [];
});

describe('grantReferralWelcome', () => {
  it('приглашённому, который ещё не покупал, сразу начисляет 100 SC', async () => {
    await expect(grantReferralWelcome('friend')).resolves.toBe(true);
    expect(welcomes('friend')).toEqual([
      expect.objectContaining({ amount: 100, source_id: 'ref-1', description: 'Приветственный бонус: вас пригласил @web3grow' }),
    ]);
    expect(balance('friend')).toBe(100);
  });

  it('повторный вход бонус не задваивает', async () => {
    await grantReferralWelcome('friend');
    await expect(grantReferralWelcome('friend')).resolves.toBe(false);
    expect(welcomes('friend')).toHaveLength(1);
    expect(balance('friend')).toBe(100);
  });

  it('без приглашения ничего не начисляет', async () => {
    await expect(grantReferralWelcome('inviter')).resolves.toBe(false);
    expect(db.sc_transactions).toEqual([]);
  });

  it('тому, кто уже покупал, бонус не положен', async () => {
    db.orders = [{ id: 'o1', user_id: 'friend', status: 'completed', total: 1100 }];
    await expect(grantReferralWelcome('friend')).resolves.toBe(false);
    expect(db.sc_transactions).toEqual([]);
  });

  it('неоплаченные и отменённые заказы покупкой не считаются', async () => {
    db.orders = [
      { id: 'o1', user_id: 'friend', status: 'pending', total: 1100 },
      { id: 'o2', user_id: 'friend', status: 'cancelled', total: 1400 },
    ];
    await expect(grantReferralWelcome('friend')).resolves.toBe(true);
  });

  it('при оплате первого заказа сам этот заказ прежней покупкой не считается', async () => {
    db.orders = [{ id: 'o1', user_id: 'friend', status: 'paid', total: 1100 }];
    await expect(grantReferralWelcome('friend', { orderId: 'o1' })).resolves.toBe(true);
    expect(welcomes('friend')[0].source_id).toBe('o1');
  });

  it('при оплате, если раньше уже был оплаченный заказ, бонуса нет', async () => {
    db.orders = [
      { id: 'o1', user_id: 'friend', status: 'completed', total: 1100 },
      { id: 'o2', user_id: 'friend', status: 'paid', total: 3000 },
    ];
    await expect(grantReferralWelcome('friend', { orderId: 'o2' })).resolves.toBe(false);
  });
});

describe('getInvitedBy', () => {
  it('имя пригласившего и сколько приветственных SC уже начислено', async () => {
    await expect(getInvitedBy('friend')).resolves.toEqual({ name: '@web3grow', welcomeSc: 0 });
    await grantReferralWelcome('friend');
    await expect(getInvitedBy('friend')).resolves.toEqual({ name: '@web3grow', welcomeSc: 100 });
  });

  it('у пригласившего без username — «друг»', async () => {
    db.referrals[0].referrer_user_id = 'noname';
    await expect(getInvitedBy('friend')).resolves.toEqual({ name: 'друг', welcomeSc: 0 });
  });

  it('не приглашён — null', async () => {
    await expect(getInvitedBy('inviter')).resolves.toBeNull();
  });
});
```

- [ ] **Step 2: Запустить — должен упасть**

Run: `npx jest lib/__tests__/referralWelcome.test.ts`
Expected: FAIL — `grantReferralWelcome` / `getInvitedBy` не экспортируются из `../referral` (TypeError: ... is not a function или ошибка ts-jest).

- [ ] **Step 3: Реализация**

`lib/levelUtils.ts` — сразу после `export const REFERRAL_PERCENT = 0.05;`:

```ts
// Приветственные SC другу, пришедшему по приглашению: сразу, один раз и только тому, кто ещё
// не покупал (lib/referral.ts grantReferralWelcome). Бот пишет ту же сумму (tg-bot/replies.ts).
export const REFERRAL_WELCOME_SC = 100;
```

`lib/referral.ts` — импорты:

```ts
import { getLevelInfo, LEVEL_CONFIG, REFERRAL_WELCOME_SC } from './levelUtils';
import { isPaidStatus, paidOrderTotals } from './orderStatus';
```

`lib/referral.ts` — в конец файла:

```ts
// Имя пригласившего для текстов: @username или «друг», если ника нет
async function inviterName(referrerUserId: string): Promise<string> {
  const { data } = await supabaseServer.from('users').select('username').eq('id', referrerUserId).maybeSingle();
  return data?.username ? `@${data.username}` : 'друг';
}

// Кто пригласил пользователя (реф-ссылка бота или реф-код оплаченного заказа) и сколько приветственных
// SC он уже получил — для панели SC (/api/home-summary) и формы заказа (/api/referral-stats).
// null — не приглашён.
export async function getInvitedBy(userId: string): Promise<{ name: string; welcomeSc: number } | null> {
  const { data: link } = await supabaseServer
    .from('referrals').select('referrer_user_id').eq('referred_user_id', userId).limit(1);
  if (!link || !link.length) return null;
  const { data: welcome } = await supabaseServer
    .from('sc_transactions').select('amount').eq('user_id', userId).eq('source_type', 'referral_welcome');
  return {
    name: await inviterName(link[0].referrer_user_id),
    welcomeSc: (welcome || []).reduce((sum: number, t: { amount: number | null }) => sum + (t.amount || 0), 0),
  };
}

// Приветственные SC приглашённому — сразу, один раз и только тому, кто ещё не покупал (решение
// владельца 25.09). Зовут при каждом входе в магазин (/api/init-user) и при оплате заказа (реф-код
// из формы или заказ через бота до первого входа). orderId — оплачиваемый заказ: сам он прежней
// покупкой не считается и становится source_id начисления. true — начислили сейчас.
export async function grantReferralWelcome(userId: string, opts: { orderId?: string } = {}): Promise<boolean> {
  const { data: link } = await supabaseServer
    .from('referrals').select('id, referrer_user_id').eq('referred_user_id', userId).limit(1);
  if (!link || !link.length) return false;

  const { data: prior } = await supabaseServer
    .from('sc_transactions').select('id').eq('user_id', userId).eq('source_type', 'referral_welcome').limit(1);
  if (prior && prior.length) return false;

  const { data: orders, error } = await supabaseServer.from('orders').select('id, status').eq('user_id', userId);
  if (error) throw new Error(error.message);
  const boughtBefore = (orders || []).some(
    (o: { id: string; status: string | null }) => o.id !== opts.orderId && isPaidStatus(o.status)
  );
  if (boughtBefore) return false;

  await creditSC({
    userId,
    amount: REFERRAL_WELCOME_SC,
    sourceType: 'referral_welcome',
    sourceId: opts.orderId || link[0].id,
    description: `Приветственный бонус: вас пригласил ${await inviterName(link[0].referrer_user_id)}`,
  });
  return true;
}
```

- [ ] **Step 4: Запустить — должен пройти**

Run: `npx jest lib/__tests__/referralWelcome.test.ts lib/__tests__/recalcOrderTotals.test.ts lib/__tests__/levelNeeds.test.ts`
Expected: PASS, все тесты зелёные.

- [ ] **Step 5: Commit**

```bash
git add lib/levelUtils.ts lib/referral.ts lib/__tests__/referralWelcome.test.ts
git commit -m "Приглашённому — 100 SC сразу, если ещё не покупал: grantReferralWelcome, getInvitedBy"
```

---

### Task 2: Подключить к API и форме заказа

**Files:**
- Modify: `app/api/init-user/route.ts` (импорт; вызов перед `return`)
- Modify: `app/api/admin/orders/route.ts:4,9,135-152`
- Modify: `app/api/home-summary/route.ts` (импорт, `emptySummary`, `Promise.all`, ответ)
- Modify: `app/api/referral-stats/route.ts:38-52`
- Modify: `app/order-form.tsx:48,604`

**Interfaces:**
- Consumes: `grantReferralWelcome`, `getInvitedBy` (Task 1).
- Produces: `/api/home-summary` → поле `invitedBy: { name: string; welcomeSc: number } | null`;
  `/api/referral-stats` → `stats.invitedBy` той же формы (было `{ username, telegram_id }`).

Логика — в Task 1 (покрыта тестами); здесь проводка, её проверяют `tsc` и превью (Task 5).

- [ ] **Step 1: `/api/init-user`** — импорт `import { grantReferralWelcome } from '../../../lib/referral';`, перед `return NextResponse.json({ id, source: userSource });`:

```ts
    // Пришёл по приглашению и ещё не покупал — приветственные SC сразу, при входе в магазин
    try {
      await grantReferralWelcome(id);
    } catch (e) {
      console.error('[referral] приветственный бонус:', e);
    }
```

- [ ] **Step 2: `/api/admin/orders`** — в импорте из `lib/referral` добавить `grantReferralWelcome`; удалить строку `const WELCOME_SC = 100; // приветственный бонус приглашённому`; блок «2) Приглашённому — приветственные 100 SC (только за первый оплаченный заказ)» целиком (от комментария до закрывающей `}` перед концом функции) заменить на:

```ts
  // 2) Приглашённому — приветственные SC, если до этого заказа он не покупал и ещё не получал их
  //    (обычно они приходят раньше — при первом входе в магазин по приглашению)
  if (order.user_id) await grantReferralWelcome(order.user_id, { orderId: order.id });
```

- [ ] **Step 3: `/api/home-summary`** — импорт `import { getInvitedBy } from "../../../lib/referral";`; в `emptySummary()` после `telegramId: null as string | null,`:

```ts
    invitedBy: null as { name: string; welcomeSc: number } | null,
```

в `Promise.all` добавить последним элементом `getInvitedBy(user_id),`, а в деструктуризацию — `invitedBy`:

```ts
    const [levelRes, refRes, txRes, legacyRes, userRes, monthGoal, invitedBy] = await Promise.all([
```

в ответе после `telegramId,`:

```ts
      // Кто пригласил и сколько приветственных SC уже начислено — строка в панели SC
      invitedBy,
```

- [ ] **Step 4: `/api/referral-stats`** — импорт `import { getInvitedBy } from "../../../lib/referral";`; блок от `// Кто пригласил ЭТОГО пользователя` до конца `if (inviterLink && inviterLink.length) { ... }` заменить на:

```ts
    // Кто пригласил ЭТОГО пользователя (реф-ссылка бота или реф-код оплаченного заказа)
    const invitedBy = await getInvitedBy(user_id);
```

- [ ] **Step 5: форма заказа** — `app/order-form.tsx`, тип состояния:

```ts
  const [invitedBy, setInvitedBy] = useState<{ name: string; welcomeSc: number } | null>(null);
```

и строка приглашения:

```tsx
                ✅ Вас пригласил {invitedBy.name}
```

- [ ] **Step 6: Проверка типов**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "lib/referral|init-user|admin/orders|home-summary|referral-stats|order-form"`
Expected: пусто (новых ошибок нет).

- [ ] **Step 7: Тесты формы заказа и полный набор lib**

Run: `npx jest app/__tests__ lib/__tests__`
Expected: PASS (кроме старого `lib/levelUtils.test.ts` вне `__tests__` — он сюда не попадает).

- [ ] **Step 8: Commit**

```bash
git add app/api/init-user/route.ts app/api/admin/orders/route.ts app/api/home-summary/route.ts app/api/referral-stats/route.ts app/order-form.tsx
git commit -m "Приветственные SC — при входе в магазин и при оплате; «кто пригласил» отдают home-summary и referral-stats"
```

---

### Task 3: Кабинет — строка «Вас пригласил» и тексты приглашения

**Files:**
- Modify: `app/(client)/ScStatus.tsx` (тип `Summary`; строка под шапкой)
- Modify: `lib/referralLink.ts` (текст «Поделиться», `REFERRAL_TERMS`)
- Modify: `app/(client)/RoadMap.tsx:481` (текст раздела)
- Test: `app/(client)/__tests__/ScStatus.test.tsx`, `lib/__tests__/referralLink.test.ts`

**Interfaces:**
- Consumes: `/api/home-summary` → `invitedBy` (Task 2); `REFERRAL_WELCOME_SC`, `REFERRAL_PERCENT` (lib/levelUtils.ts).
- Produces: `REFERRAL_TERMS: string` (lib/referralLink.ts).

- [ ] **Step 1: Падающие тесты**

`app/(client)/__tests__/ScStatus.test.tsx` — `mockSummary` принимает `invitedBy`:

```ts
function mockSummary({ sc, telegramId = '54993853', invitedBy = null }: {
  sc: number;
  telegramId?: string | null;
  invitedBy?: { name: string; welcomeSc: number } | null;
}) {
```

и в объект ответа после `telegramId,` добавить `invitedBy,`. Новые тесты в конец файла:

```ts
it('приглашённому сразу видно, кто пригласил, и приветственные SC — без раскрытия панели', async () => {
  mockSummary({ sc: 100, invitedBy: { name: '@web3grow', welcomeSc: 100 } });
  render(<ScStatus userId={USER_ID} />);
  expect(await screen.findByText('🤝 Вас пригласил @web3grow · 🎁 +100 SC')).toBeInTheDocument();
});

it('пока бонус не начислен — только кто пригласил', async () => {
  mockSummary({ sc: 0, invitedBy: { name: 'друг', welcomeSc: 0 } });
  render(<ScStatus userId={USER_ID} />);
  expect(await screen.findByText('🤝 Вас пригласил друг')).toBeInTheDocument();
});

it('без приглашения строки нет', async () => {
  mockSummary({ sc: 0 });
  render(<ScStatus userId={USER_ID} />);
  await screen.findByText('💰 0 SC');
  expect(screen.queryByText(/Вас пригласил/)).toBeNull();
});
```

`lib/__tests__/referralLink.test.ts` — импорт `import { referralLink, referralShareUrl, REFERRAL_TERMS } from '../referralLink';` и в конец файла:

```ts
describe('тексты приглашения', () => {
  it('«Поделиться» обещает 100 SC сразу, а не на первый заказ', () => {
    const text = new URL(referralShareUrl('54993853')!).searchParams.get('text')!;
    expect(text).toMatch(/сразу получишь 100 SC/);
    expect(text).not.toMatch(/первый заказ/);
  });

  it('условия в кабинете: другу 100 SC сразу, пригласившему 5% с оплаченных заказов', () => {
    expect(REFERRAL_TERMS).toBe('Друг сразу получает 100 SC, а вы — 5% с каждого его оплаченного заказа');
  });
});
```

- [ ] **Step 2: Запустить — должны упасть**

Run: `npx jest "app/(client)/__tests__/ScStatus.test.tsx" lib/__tests__/referralLink.test.ts`
Expected: FAIL — нет строки «Вас пригласил», нет `REFERRAL_TERMS`, текст «Поделиться» про первый заказ.

- [ ] **Step 3: Реализация**

`lib/referralLink.ts` — импорт и тексты (заменить строку `const SHARE_TEXT = ...`):

```ts
import { REFERRAL_PERCENT, REFERRAL_WELCOME_SC } from './levelUtils';

const SHARE_TEXT = `Грибные добавки СПОРС 🍄 Перейди по моей ссылке — сразу получишь ${REFERRAL_WELCOME_SC} SC (= ${REFERRAL_WELCOME_SC} ₽ скидки)!`;

// Условия приглашения — раздел «Реферальная система» в кабинете
export const REFERRAL_TERMS = `Друг сразу получает ${REFERRAL_WELCOME_SC} SC, а вы — ${Math.round(REFERRAL_PERCENT * 100)}% с каждого его оплаченного заказа`;
```

`app/(client)/ScStatus.tsx` — в тип `Summary` после `telegramId: string | null;`:

```ts
  invitedBy?: { name: string; welcomeSc: number } | null;
```

и сразу после закрывающего `</div>` строки-шапки (перед `{open && (`):

```tsx
        {/* Пришёл по приглашению — видно всегда, без раскрытия панели */}
        {data.invitedBy && (
          <div style={{ padding: "0 16px 10px", fontSize: "clamp(12px, 3vw, 14px)", color: "#10b981", fontWeight: 600 }}>
            🤝 Вас пригласил {data.invitedBy.name}
            {data.invitedBy.welcomeSc > 0 && ` · 🎁 +${data.invitedBy.welcomeSc} SC`}
          </div>
        )}
```

`app/(client)/RoadMap.tsx` — импорт из `"../../lib/referralLink"` дополнить `REFERRAL_TERMS`, строку
`Получай 5% от заказов друзей, они получат приветственные 100SC` заменить на `{REFERRAL_TERMS}`.

- [ ] **Step 4: Запустить — должны пройти**

Run: `npx jest "app/(client)/__tests__/ScStatus.test.tsx" lib/__tests__/referralLink.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/(client)/ScStatus.tsx" "app/(client)/RoadMap.tsx" lib/referralLink.ts "app/(client)/__tests__/ScStatus.test.tsx" lib/__tests__/referralLink.test.ts
git commit -m "Кабинет: «🤝 Вас пригласил @… · 🎁 +100 SC»; тексты приглашения — 100 SC сразу"
```

---

### Task 4: Бот — ответ на реферальную ссылку

**Files:**
- Modify: `tg-bot/replies.ts` (новая функция)
- Modify: `tg-bot/bot.ts` (импорт; `handleReferralStart` — текст ответа)
- Test: `tg-bot/__tests__/replies.test.ts`

**Interfaces:**
- Produces: `referralWelcomeText(refName: string, eligible: boolean): string` (tg-bot/replies.ts).

- [ ] **Step 1: Падающий тест** — `tg-bot/__tests__/replies.test.ts`, импорт `import { shopKeyboard, botFallbackReply, referralWelcomeText } from '../replies';` и в конец:

```ts
describe('referralWelcomeText — ответ другу по реферальной ссылке', () => {
  it('ещё не покупал — 100 SC сразу, они уже в кабинете', () => {
    const text = referralWelcomeText('@web3grow', true);
    expect(text).toMatch(/^🎁 Вас пригласил @web3grow!/);
    expect(text).toMatch(/Дарим вам 100 SC \(= 100 ₽ скидки\) — они уже ждут в кабинете/);
    expect(text).not.toMatch(/первый оплаченный заказ/);
  });

  it('уже покупал — без обещания SC', () => {
    const text = referralWelcomeText('друг', false);
    expect(text).toMatch(/^🎁 Вас пригласил друг!/);
    expect(text).not.toMatch(/SC/);
  });
});
```

- [ ] **Step 2: Запустить — должен упасть**

Run: `npx jest tg-bot/__tests__/replies.test.ts`
Expected: FAIL — `referralWelcomeText is not a function`.

- [ ] **Step 3: Реализация** — `tg-bot/replies.ts`, в конец:

```ts
// Ответ другу, пришедшему по реферальной ссылке. eligible — ещё не покупал: сайт начислит ему
// 100 SC при входе в магазин (lib/referral.ts grantReferralWelcome, REFERRAL_WELCOME_SC).
export function referralWelcomeText(refName: string, eligible: boolean): string {
  if (!eligible) return `🎁 Вас пригласил ${refName}!\n\nВыбирайте грибные добавки 👇`;
  return (
    `🎁 Вас пригласил ${refName}!\n\n` +
    `Дарим вам 100 SC (= 100 ₽ скидки) — они уже ждут в кабинете. Списать можно при заказе, до 30% суммы.\n\n` +
    `Выбирайте грибные добавки 👇`
  );
}
```

`tg-bot/bot.ts` — импорт `import { shopKeyboard, botFallbackReply, referralWelcomeText } from './replies';`; в `handleReferralStart` блок от `const refName = ...` до конца `await ctx.reply(...)` заменить на:

```ts
  // Ещё не покупал — сайт начислит 100 SC при входе в магазин (lib/referral.ts grantReferralWelcome).
  // Оплаченные статусы — как PAID_STATUSES в lib/orderStatus.ts (бот не видит lib/).
  const { data: paid, error: paidError } = await supabase
    .from('orders').select('id').eq('user_id', invited.id).in('status', ['paid', 'shipped', 'completed']).limit(1);
  const eligible = !paidError && !(paid && paid.length);

  const refName = referrer.username ? `@${referrer.username}` : 'друг';
  await ctx.reply(referralWelcomeText(refName, eligible), openShop);
```

- [ ] **Step 4: Запустить — должен пройти; бот собирается**

Run: `npx jest tg-bot/__tests__/replies.test.ts` → PASS.
Run: `cd tg-bot && npx tsc --noEmit -p tsconfig.json` → без ошибок.

- [ ] **Step 5: Commit**

```bash
git add tg-bot/replies.ts tg-bot/bot.ts tg-bot/__tests__/replies.test.ts
git commit -m "Бот: по реферальной ссылке — «Дарим вам 100 SC, они уже в кабинете» (если ещё не покупал)"
```

---

### Task 5: Проверка и PR

- [ ] **Step 1: Полный прогон** — `npx jest 2>&1 | grep -E "^(Tests|Test Suites):|^FAIL " | sort -u`
  Expected: падают только 8 старых наборов (11 тестов): `lib/levelUtils.test.ts`, `Chat.test.tsx`, `AuthWrapper.test.tsx`, `useProducts.test.tsx`, `tgLinkApi.test.ts`, `aiApi.test.ts`, `orderApi.test.ts`, `babel.config.test.js`.
- [ ] **Step 2: Сборка** — `npm run build` → «Compiled successfully».
- [ ] **Step 3: Превью** — `start-isolated`, ширина телефона, подмена `/api/home-summary` с `invitedBy: { name: '@web3grow', welcomeSc: 100 }`: в кабинете под балансом «🤝 Вас пригласил @web3grow · 🎁 +100 SC»; в разделе «🎁 Реферальная система» — `REFERRAL_TERMS`.
- [ ] **Step 4: PR** — push ветки `claude/referral-welcome`, `gh pr create` (описание: что меняется для друга, правило «не покупал», пятеро получат 500 SC при следующем входе, выкладка — сайт + пересборка бота).
