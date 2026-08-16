# Запуск игровых механик — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Включить геймификацию для живых пользователей: недельный отчёт вместо дневного чек-ина, цель месяца с бонусом 50 SC, уровни, и витрина прогресса с плашкой заданий на главном экране.

**Architecture:** Бэкенд почти весь уже есть — переиспользуем `POST /api/survey` (недельный отчёт +25 SC) и систему уровней в `lib/levelUtils.ts` + `creditSC`. Добавляем два чистых модуля (`lib/surveyWeeks.ts`, `lib/monthGoal.ts`) с юнит-тестами, их серверные обёртки (`lib/monthGoalServer.ts`), один агрегирующий эндпоинт `/api/home-summary` и один новый UI-компонент `app/(client)/HomeStatus.tsx`. Вся игровая часть в Кабинете остаётся за флагом `SHOW_GAMIFICATION = false` до последней задачи — промежуточные состояния до пользователей не доходят.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Supabase (supabase-js на сервере), Jest 30 + ts-jest.

**Спека:** `docs/superpowers/specs/2026-08-16-game-launch-design.md` — при расхождении плана и спеки прав документ спеки.

## Global Constraints

- Все суммы SC берутся из констант, а не хардкодятся в JSX: отчёт 25, цель месяца 50, привычка 25, задание 30.
- Цель месяца: 4 отчёта за календарный месяц → ровно один бонус 50 SC (`source_type='month_goal'`, `source_id='YYYY-MM'`).
- Уровень считается от `total_sc_earned`, **не** от текущего баланса.
- Флаг `SHOW_GAMIFICATION` в `app/(client)/RoadMap.tsx` остаётся `false` до Задачи 10 и остаётся в коде после неё (откат одной строкой).
- Таблицы `daily_checkins` и колонка `daily_activities.daily_checkin` не удаляются и не мигрируются — только перестают заполняться.
- Пользователи с не-UUID id (`guest-*`, `test-*`, `temp-user`) не должны вызывать ошибок и не должны порождать запросы в БД.
- Язык интерфейса — русский, тексты в UI пишем строчными предложениями как в существующих блоках.
- Каждая задача заканчивается коммитом. Ветка: `claude/shop-access-vpn-issue-febfa4`.

## Проверочные команды

| Что | Команда | Ожидание |
|---|---|---|
| Юнит-тесты новой логики | `npx jest lib/__tests__` | PASS (доступно после Задачи 1) |
| Полная сборка (тот же гейт, что в CI) | `npm run build` | `Compiled successfully`, exit 0 |
| Дев-сервер для ручной проверки | preview_start `{name: "dev"}` | http://localhost:3000 |

**Важно:** `npx tsc --noEmit` в этом проекте не работает — `tsconfig.json:13` содержит удалённую в TS 5.5 опцию `suppressImplicitAnyIndexErrors`. Не используй его как гейт, используй `npm run build`. Правку tsconfig в этот план не включаем.

**Легаси-тесты** (`components/__tests__/*`) написаны под `node-mocks-http` и App Router-роуты одновременно и не запускаются. Чинить их не в скоупе — гоняем только `lib/__tests__`.

**Дев-сервер в воркtree:** в `C:\Users\User\Documents\Claude\spor3s-app\.claude\worktrees\shop-access-vpn-issue-febfa4` нет `.env.local` (git worktree не копирует игнорируемые файлы). Перед первым запуском превью выполни:

```bash
cp "C:/Users/User/Documents/Claude/spor3s-app/.env.local" "C:/Users/User/Documents/Claude/spor3s-app/.claude/worktrees/shop-access-vpn-issue-febfa4/.env.local"
```

Файл уже в `.gitignore` — коммитить его нельзя.

## File Structure

**Создаём:**

| Файл | Ответственность |
|---|---|
| `lib/surveyWeeks.ts` | Чистая нумерация недель для записей `surveys`, включая нулевую точку (baseline). Без импортов. |
| `lib/monthGoal.ts` | Чистые правила цели месяца: константы, ключ месяца, расчёт статуса. Без импортов. |
| `lib/monthGoalServer.ts` | Доступ к БД для цели месяца: чтение статуса, идемпотентное начисление бонуса. |
| `lib/__tests__/surveyWeeks.test.ts` | Юнит-тесты нумерации недель. |
| `lib/__tests__/monthGoal.test.ts` | Юнит-тесты правил цели месяца. |
| `app/api/home-summary/route.ts` | Один агрегирующий GET для витрины на главном экране. |
| `app/(client)/HomeStatus.tsx` | Витрина: SC, друзья, уровень, раскрытие механики, плашка заданий. |
| `app/(client)/MetricsSliders.tsx` | Четыре слайдера самооценки (память/сон/энергия/стресс). Один компонент на два места: недельный отчёт и стартовая самооценка. |

**Меняем:**

| Файл | Что |
|---|---|
| `package.json` | скрипт `test`, dev-зависимость `jest-environment-jsdom` |
| `jest.config.js` | опечатка `moduleNameMapping` → `moduleNameMapper` |
| `app/api/survey/route.ts` | импорт общей нумерации недель, приём baseline, бонус цели месяца в ответе |
| `app/api/user-level/route.ts` | уровень от `total_sc_earned`, `activeDays` без дневного чек-ина |
| `lib/levelUtils.ts` | убрать `daily_checkin` из `SC_MECHANICS`, пересчитать `calculateMonthlySC` |
| `app/(client)/RoadMap.tsx` | гриб = отчёт, блок цели месяца, старт курса со стартовой самооценкой, удаление чек-ина, проп `focus`, флаг |
| `app/(client)/AppClient.tsx` | рендер `HomeStatus`, состояние `cabinetFocus` |

**Удаляем:** `app/api/checkin/route.ts`, `components/__tests__/checkinApi.test.ts`.

---

### Task 1: Починить запуск тестов

**Files:**
- Modify: `package.json`
- Modify: `jest.config.js:9`
- Delete: `components/__tests__/checkinApi.test.ts`

**Interfaces:**
- Consumes: ничего
- Produces: рабочая команда `npx jest lib/__tests__` — на неё опираются Задачи 2 и 3

- [ ] **Step 1: Убедиться, что jest сейчас не стартует**

Run: `npx jest --listTests`
Expected: FAIL — `Test environment jest-environment-jsdom cannot be found` и предупреждение `Unknown option "moduleNameMapping"`.

- [ ] **Step 2: Установить недостающее окружение**

```bash
npm install --save-dev jest-environment-jsdom@^30
```

Если сети нет, альтернатива — поменять в `jest.config.js` строку `testEnvironment: 'jsdom'` на `testEnvironment: 'node'`; тогда установка не нужна, но легаси-тест `useProducts.test.tsx` (React-хук) останется нерабочим. Он и сейчас не работает.

- [ ] **Step 3: Исправить опечатку в конфиге**

В `jest.config.js` заменить строку 9:

```js
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
```

- [ ] **Step 4: Добавить скрипт запуска**

В `package.json` в блок `"scripts"` добавить:

```json
    "test": "jest"
```

- [ ] **Step 5: Удалить мёртвый тест дневного чек-ина**

```bash
git rm components/__tests__/checkinApi.test.ts
```

Он проверяет поведение `supplement_type`, которого в роуте давно нет (роут отвечает «Чек-ин на сегодня уже сделан!»), а сам чек-ин удаляется в Задаче 5.

- [ ] **Step 6: Проверить, что раннер стартует**

Run: `npx jest lib/__tests__ --passWithNoTests`
Expected: PASS, `No tests found, exiting with code 0`, никаких предупреждений про `moduleNameMapping`.

- [ ] **Step 7: Коммит**

```bash
git add package.json package-lock.json jest.config.js
git commit -m "Tests: починить запуск jest (jsdom-окружение, moduleNameMapper, скрипт test)"
```

---

### Task 2: Нумерация недель с нулевой точкой

**Files:**
- Create: `lib/surveyWeeks.ts`
- Create: `lib/__tests__/surveyWeeks.test.ts`
- Modify: `app/api/survey/route.ts:1-21` (импорт вместо локальной копии), `:76-78`

**Interfaces:**
- Consumes: ничего
- Produces:
  - `BASELINE_KIND: 'baseline'`
  - `isBaseline(row: SurveyRow): boolean`
  - `surveysWithWeeks(rows: SurveyRow[]): { row: SurveyRow; week: number }[]`
  - `nextFreeWeek(rows: SurveyRow[]): number`

  Использует Задача 4 (baseline в `POST /api/survey`).

- [ ] **Step 1: Написать падающий тест**

Создать `lib/__tests__/surveyWeeks.test.ts`:

```ts
/** @jest-environment node */
import { surveysWithWeeks, nextFreeWeek, isBaseline, BASELINE_KIND } from '../surveyWeeks';

const baseline = { id: 'b', data: { week: 0, kind: BASELINE_KIND } };
const w1 = { id: 'w1', data: { week: 1 } };
const w2 = { id: 'w2', data: { week: 2 } };

describe('surveysWithWeeks', () => {
  it('берёт номер недели из data.week', () => {
    expect(surveysWithWeeks([w1, w2]).map(s => s.week)).toEqual([1, 2]);
  });

  it('нулевую точку отдаёт неделей 0 и не занимает ею первую неделю', () => {
    expect(surveysWithWeeks([baseline, w1]).map(s => s.week)).toEqual([0, 1]);
  });

  it('старым записям без week выдаёт первые свободные номера', () => {
    const rows = [{ id: 'a', data: null }, { id: 'b', data: null }];
    expect(surveysWithWeeks(rows).map(s => s.week)).toEqual([1, 2]);
  });

  it('разводит дублирующиеся номера недель', () => {
    const rows = [w1, { id: 'dup', data: { week: 1 } }];
    expect(surveysWithWeeks(rows).map(s => s.week)).toEqual([1, 2]);
  });

  it('пустой список не ломает', () => {
    expect(surveysWithWeeks([])).toEqual([]);
  });
});

describe('nextFreeWeek', () => {
  it('без записей — первая неделя', () => {
    expect(nextFreeWeek([])).toBe(1);
  });

  it('после одной нулевой точки всё ещё первая неделя', () => {
    expect(nextFreeWeek([baseline])).toBe(1);
  });

  it('после недель 1 и 2 — третья', () => {
    expect(nextFreeWeek([baseline, w1, w2])).toBe(3);
  });
});

describe('isBaseline', () => {
  it('отличает нулевую точку от обычного отчёта', () => {
    expect(isBaseline(baseline)).toBe(true);
    expect(isBaseline(w1)).toBe(false);
    expect(isBaseline({ id: 'x' })).toBe(false);
  });
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `npx jest lib/__tests__/surveyWeeks.test.ts`
Expected: FAIL — `Cannot find module '../surveyWeeks'`.

- [ ] **Step 3: Написать минимальную реализацию**

Создать `lib/surveyWeeks.ts`:

```ts
// Нумерация недель для записей таблицы surveys.
// Нулевая точка (стартовая самооценка) помечается data.kind = 'baseline' и всегда занимает неделю 0:
// без явной ветки Number(0) считается «не задано», и нулевая точка съедает первый отчёт.

export const BASELINE_KIND = 'baseline';

export type SurveyRow = {
  data?: { week?: number | string | null; kind?: string | null } | null;
  [key: string]: any;
};

export function isBaseline(row: SurveyRow): boolean {
  return row?.data?.kind === BASELINE_KIND;
}

export function surveysWithWeeks(rows: SurveyRow[]): { row: SurveyRow; week: number }[] {
  const used = new Set<number>();
  return (rows || []).map((row) => {
    if (isBaseline(row)) return { row, week: 0 };
    let week = Number(row?.data?.week);
    if (!Number.isFinite(week) || week < 1 || used.has(week)) {
      week = 1;
      while (used.has(week)) week++;
    }
    used.add(week);
    return { row, week };
  });
}

// Первая незаполненная неделя отчётов. Нулевая точка не считается — отчёты всегда начинаются с 1.
export function nextFreeWeek(rows: SurveyRow[]): number {
  const filled = new Set(surveysWithWeeks(rows).map(s => s.week));
  let week = 1;
  while (filled.has(week)) week++;
  return week;
}
```

- [ ] **Step 4: Запустить тест и убедиться, что он проходит**

Run: `npx jest lib/__tests__/surveyWeeks.test.ts`
Expected: PASS, 9 тестов.

- [ ] **Step 5: Переключить роут на общий модуль**

В `app/api/survey/route.ts` удалить локальную функцию `surveysWithWeeks` (строки 9-21) и добавить импорт после строки 3:

```ts
import { surveysWithWeeks, nextFreeWeek } from "../../../lib/surveyWeeks";
```

Заменить блок подбора недели (строки 76-78):

```ts
    const targetWeek = nextFreeWeek(existing || []);
```

- [ ] **Step 6: Проверить сборку**

Run: `npm run build`
Expected: `Compiled successfully`, exit 0.

- [ ] **Step 7: Коммит**

```bash
git add lib/surveyWeeks.ts lib/__tests__/surveyWeeks.test.ts app/api/survey/route.ts
git commit -m "Survey: вынести нумерацию недель в lib/surveyWeeks с поддержкой нулевой точки"
```

---

### Task 3: Правила цели месяца

**Files:**
- Create: `lib/monthGoal.ts`
- Create: `lib/monthGoalServer.ts`
- Create: `lib/__tests__/monthGoal.test.ts`

**Interfaces:**
- Consumes: `creditSC` из `lib/referral.ts` (сигнатура: `creditSC({ userId, amount, sourceType, sourceId?, description }): Promise<void>`), `supabaseServer` из `app/supabaseServerClient`
- Produces:
  - `MONTH_GOAL = { reportsTarget: 4, bonus: 50 }`
  - `monthKey(d?: Date): string` — `"2026-08"`
  - `monthStart(d?: Date): Date`
  - `computeMonthGoal(reportsDone: number, bonusPaid: boolean): MonthGoal`
  - `type MonthGoal = { reportsDone, reportsTarget, bonus, bonusPaid, completed }`
  - `getMonthGoal(userId: string, now?: Date): Promise<MonthGoal>`
  - `grantMonthGoalIfComplete(userId: string, now?: Date): Promise<number>`

  Использует Задача 4 (`POST /api/survey`) и Задача 6 (`/api/home-summary`).

**Почему два файла:** правила — чистые и тестируются без БД, доступ к Supabase — отдельно. Это тот же раздел, что уже есть в проекте между `lib/levelUtils.ts` (чистое) и `lib/referral.ts` (БД).

- [ ] **Step 1: Написать падающий тест**

Создать `lib/__tests__/monthGoal.test.ts`:

```ts
/** @jest-environment node */
import { MONTH_GOAL, monthKey, monthStart, computeMonthGoal } from '../monthGoal';

describe('monthKey', () => {
  it('форматирует месяц с ведущим нулём', () => {
    expect(monthKey(new Date(2026, 7, 16))).toBe('2026-08');
    expect(monthKey(new Date(2026, 11, 31))).toBe('2026-12');
  });
});

describe('monthStart', () => {
  it('возвращает первое число месяца в полночь', () => {
    const start = monthStart(new Date(2026, 7, 16, 13, 45));
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(7);
    expect(start.getDate()).toBe(1);
    expect(start.getHours()).toBe(0);
  });
});

describe('computeMonthGoal', () => {
  it('три отчёта — цель не выполнена', () => {
    expect(computeMonthGoal(3, false)).toEqual({
      reportsDone: 3, reportsTarget: 4, bonus: 50, bonusPaid: false, completed: false,
    });
  });

  it('четыре отчёта — цель выполнена', () => {
    expect(computeMonthGoal(4, false).completed).toBe(true);
  });

  it('пять отчётов — по-прежнему выполнена, цель не растёт', () => {
    const goal = computeMonthGoal(5, true);
    expect(goal.completed).toBe(true);
    expect(goal.reportsTarget).toBe(MONTH_GOAL.reportsTarget);
  });

  it('уже оплаченный бонус помечен', () => {
    expect(computeMonthGoal(4, true).bonusPaid).toBe(true);
  });
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `npx jest lib/__tests__/monthGoal.test.ts`
Expected: FAIL — `Cannot find module '../monthGoal'`.

- [ ] **Step 3: Написать чистый модуль**

Создать `lib/monthGoal.ts`:

```ts
// Цель месяца: 4 еженедельных отчёта за календарный месяц → разовый бонус.
// Только правила, без обращений к БД — серверная часть в lib/monthGoalServer.ts.

export const MONTH_GOAL = {
  reportsTarget: 4,
  bonus: 50,
} as const;

export type MonthGoal = {
  reportsDone: number;
  reportsTarget: number;
  bonus: number;
  bonusPaid: boolean;
  completed: boolean;
};

// Ключ месяца для идемпотентности начисления: source_id транзакции.
export function monthKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthStart(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function computeMonthGoal(reportsDone: number, bonusPaid: boolean): MonthGoal {
  return {
    reportsDone,
    reportsTarget: MONTH_GOAL.reportsTarget,
    bonus: MONTH_GOAL.bonus,
    bonusPaid,
    completed: reportsDone >= MONTH_GOAL.reportsTarget,
  };
}
```

- [ ] **Step 4: Запустить тест и убедиться, что он проходит**

Run: `npx jest lib/__tests__/monthGoal.test.ts`
Expected: PASS, 7 тестов.

- [ ] **Step 5: Написать серверную часть**

Создать `lib/monthGoalServer.ts`:

```ts
import { supabaseServer } from '../app/supabaseServerClient';
import { creditSC } from './referral';
import { MONTH_GOAL, MonthGoal, computeMonthGoal, monthKey, monthStart } from './monthGoal';

// Отчёты месяца считаем по транзакциям source_type='survey': стартовая самооценка SC не даёт
// и в цель не попадает, а сверх месячного лимита транзакция не создаётся.
export async function getMonthGoal(userId: string, now: Date = new Date()): Promise<MonthGoal> {
  const { data } = await supabaseServer
    .from('sc_transactions')
    .select('source_type, source_id')
    .eq('user_id', userId)
    .in('source_type', ['survey', 'month_goal'])
    .gte('created_at', monthStart(now).toISOString());

  const rows = data || [];
  const reportsDone = rows.filter(r => r.source_type === 'survey').length;
  const bonusPaid = rows.some(r => r.source_type === 'month_goal' && r.source_id === monthKey(now));
  return computeMonthGoal(reportsDone, bonusPaid);
}

// Идемпотентно: повторный вызов в том же месяце вернёт 0.
export async function grantMonthGoalIfComplete(userId: string, now: Date = new Date()): Promise<number> {
  const goal = await getMonthGoal(userId, now);
  if (!goal.completed || goal.bonusPaid) return 0;

  await creditSC({
    userId,
    amount: MONTH_GOAL.bonus,
    sourceType: 'month_goal',
    sourceId: monthKey(now),
    description: `Цель месяца — ${MONTH_GOAL.reportsTarget} отчёта за месяц`,
  });
  return MONTH_GOAL.bonus;
}
```

- [ ] **Step 6: Проверить сборку**

Run: `npm run build`
Expected: `Compiled successfully`, exit 0.

- [ ] **Step 7: Коммит**

```bash
git add lib/monthGoal.ts lib/monthGoalServer.ts lib/__tests__/monthGoal.test.ts
git commit -m "SC: правила цели месяца (4 отчёта = +50 SC) и идемпотентное начисление"
```

---

### Task 4: Приём стартовой самооценки и бонус цели месяца в /api/survey

**Files:**
- Modify: `app/api/survey/route.ts`

**Interfaces:**
- Consumes: `surveysWithWeeks`, `nextFreeWeek`, `BASELINE_KIND` (Задача 2); `getMonthGoal`, `grantMonthGoalIfComplete` (Задача 3)
- Produces: контракт `POST /api/survey`, на который опирается Задача 8 и Задача 9:
  - запрос: `{ user_id, memory, sleep, energy, stress, note?, baseline?: true }`
  - ответ обычного отчёта: `{ success, survey, week, scEarned, scLimitReached, monthGoalBonus, monthGoal, currentBalance, level, levelCode }`
  - ответ нулевой точки: `{ success: true, baseline: true, week: 0, scEarned: 0 }`

- [ ] **Step 1: Добавить импорты**

В `app/api/survey/route.ts` после существующих импортов:

```ts
import { surveysWithWeeks, nextFreeWeek, BASELINE_KIND } from "../../../lib/surveyWeeks";
import { getMonthGoal, grantMonthGoalIfComplete } from "../../../lib/monthGoalServer";
```

(строка импорта `surveyWeeks` уже добавлена в Задаче 2 — дополни её `BASELINE_KIND`, не дублируй.)

- [ ] **Step 2: Принять флаг baseline в теле запроса**

Заменить деструктуризацию тела (строка 52):

```ts
    const { user_id, order_id: _ignoredOrderId, baseline, ...surveyFields } = body;
```

- [ ] **Step 3: Обработать нулевую точку до всей логики недель**

Сразу после проверки `user_id` (после строки 55, перед `const now = new Date();` оставить `now` выше) вставить:

```ts
    const now = new Date();

    // Стартовая самооценка: нулевая точка курса. SC не даёт, недели не занимает, пишется один раз.
    if (baseline) {
      const { data: existingBaseline } = await supabaseServer
        .from("surveys")
        .select("id")
        .eq("user_id", user_id)
        .eq("data->>kind", BASELINE_KIND)
        .limit(1);
      if (existingBaseline && existingBaseline.length) {
        return NextResponse.json({ error: "Стартовая самооценка уже сохранена" }, { status: 400 });
      }
      const { data: created, error: baselineError } = await supabaseServer
        .from("surveys")
        .insert([{
          user_id,
          ...surveyFields,
          data: { week: 0, kind: BASELINE_KIND },
          created_at: now.toISOString(),
        }])
        .select()
        .single();
      if (baselineError) {
        return NextResponse.json({ error: baselineError.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, baseline: true, survey: created, week: 0, scEarned: 0 });
    }
```

Убедиться, что старое объявление `const now = new Date();` ниже удалено, чтобы не было повторного объявления.

- [ ] **Step 4: Начислить бонус цели месяца после отчёта**

Заменить блок начисления SC (строки 146-155) на:

```ts
    // 6. Начисляем SC (единый леджер, пересчёт уровня внутри)
    if (scEarned > 0) {
      await creditSC({
        userId: user_id,
        amount: scEarned,
        sourceType: "survey",
        sourceId: survey.id,
        description: `Еженедельная самооценка — неделя ${targetWeek}`,
      });
    }

    // 6.1 Цель месяца: 4 отчёта за календарный месяц → разовый бонус.
    // Ошибка бонуса не должна терять сохранённый отчёт.
    let monthGoalBonus = 0;
    let monthGoal = null;
    try {
      monthGoalBonus = await grantMonthGoalIfComplete(user_id, now);
      monthGoal = await getMonthGoal(user_id, now);
    } catch (e) {
      console.error('[monthGoal] ошибка начисления бонуса цели месяца:', e);
    }
```

- [ ] **Step 5: Отдать бонус в ответе**

В финальном `NextResponse.json` добавить два поля рядом с `scEarned`:

```ts
      scEarned,
      monthGoalBonus,
      monthGoal,
```

- [ ] **Step 6: Проверить сборку**

Run: `npm run build`
Expected: `Compiled successfully`, exit 0.

- [ ] **Step 7: Проверить на живом дев-сервере**

Скопировать `.env.local` (команда в разделе «Проверочные команды»), затем preview_start `{name: "dev"}` и выполнить:

```bash
curl -s "http://localhost:3000/api/survey?user_id=00000000-0000-0000-0000-000000000000"
```

Expected: `{"success":true,"surveys":[]}` — роут отвечает, импорты не сломаны.

- [ ] **Step 8: Коммит**

```bash
git add app/api/survey/route.ts
git commit -m "Survey: приём стартовой самооценки и бонус за цель месяца"
```

---

### Task 5: Удалить дневной чек-ин

**Files:**
- Delete: `app/api/checkin/route.ts`
- Modify: `lib/levelUtils.ts:89-93`, `:140-146`
- Modify: `app/api/user-level/route.ts:108`, `:142`
- Modify: `app/(client)/RoadMap.tsx` — состояния 57-59, `fetchCheckinStatus` ~390-400, `handleDailyCheckin` 418-450, блок гриба 1128-1185

**Interfaces:**
- Consumes: ничего
- Produces: `SC_MECHANICS` без `daily_checkin`; `calculateMonthlySC(activeWeeks?: number)` — новую сигнатуру использует Задача 8

- [ ] **Step 1: Удалить роут**

```bash
git rm app/api/checkin/route.ts
```

- [ ] **Step 2: Убрать дневную механику из levelUtils**

В `lib/levelUtils.ts` заменить `SC_MECHANICS` (строки 89-93):

```ts
// Механика начисления SC (дневной чек-ин убран — механика заменена на еженедельный отчёт)
export const SC_MECHANICS = {
  weekly_survey: { amount: 25, maxPerMonth: 100, description: 'Еженедельный отчёт' },
  month_goal: { amount: 50, maxPerMonth: 50, description: 'Цель месяца — 4 отчёта' },
  motivational_habit: { amount: 25, maxPerMonth: 100, description: 'Мотивационная привычка' }
};
```

и `calculateMonthlySC` (строки 140-146):

```ts
// Потолок регулярного заработка за месяц: 4 отчёта + бонус цели месяца + 4 привычки.
export function calculateMonthlySC(activeWeeks: number = 4): number {
  const weeks = Math.max(0, Math.min(activeWeeks, 4));
  const weeklySurveys = SC_MECHANICS.weekly_survey.amount * weeks;
  const monthGoal = weeks >= 4 ? SC_MECHANICS.month_goal.amount : 0;
  const motivationalHabits = SC_MECHANICS.motivational_habit.amount * weeks;

  return weeklySurveys + monthGoal + motivationalHabits;
}
```

- [ ] **Step 3: Поправить user-level**

В `app/api/user-level/route.ts` три правки.

Удалить строку 108 целиком (`activeDays` считался по дневным чек-инам, которых больше нет):

```ts
    const activeDays = (activities || []).filter(a => a.daily_checkin).length;
```

Удалить строку 145 (`activeDays,`) из блока `activities` в ответе — поле не читает ни один клиент (проверено: в `components/LevelProgress.tsx` и остальном UI обращений нет), а `total`, `surveyWeeks`, `habitDays` остаются.

Заменить строку 154:

```ts
        monthlySC: calculateMonthlySC(surveyWeeks)
```

В том же файле уровень считается от баланса, хотя по правилу (`lib/levelUtils.ts:84-86`) должен считаться от заработанного за всё время — иначе трата SC на скидку понижает уровень. Заменить строку 63:

```ts
        levelInfo: getLevelInfo(newUserLevel.total_sc_earned, newUserLevel.total_orders_amount, newUserLevel.orders_count),
```

и строку 142:

```ts
      levelInfo: getLevelInfo(updatedUserLevel.total_sc_earned, updatedUserLevel.total_orders_amount, updatedUserLevel.orders_count),
```

- [ ] **Step 4: Вычистить чек-ин из RoadMap**

В `app/(client)/RoadMap.tsx` удалить:

- состояния `checkinDoneToday`, `checkinLoading`, `checkinMsg` (строки 57-59);
- функцию `fetchCheckinStatus` целиком (строки 389-397 — комментарий «Статус чек-ина на сегодня» и тело с `fetch(\`/api/checkin?user_id=${user.id}\`)`);
- вызов `fetchCheckinStatus();` внутри `useEffect` загрузки данных (строка 521) — остальные вызовы в этом эффекте не трогать;
- функцию `handleDailyCheckin` целиком (строки 418-450);
- JSX-карточку гриба целиком (строки 1128-1185) — она пересоздаётся в Задаче 8.

Открывающий `{SHOW_GAMIFICATION && (<>` на строке 1127 **оставить** — он открывает большой блок, закрывающийся на 1583.

- [ ] **Step 5: Убедиться, что ссылок не осталось**

Run: `grep -rn "api/checkin\|handleDailyCheckin\|checkinDoneToday" app lib components --include=*.ts --include=*.tsx`
Expected: единственные совпадения — в мёртвом дубле `components/MushroomTracker.tsx` и `app/(client)/page.tsx` (техдолг, §11.2 спеки). В `app/(client)/RoadMap.tsx`, `app/api/` совпадений быть не должно.

- [ ] **Step 6: Проверить, что напоминания про чек-ин никто не шлёт**

В `db-check.sql:217` есть сид напоминания `daily_checkin` для таблицы `reminders` («Не забудьте отметить ежедневный чекин…»). В `tg-bot/bot.ts` кода рассылки напоминаний нет (проверено grep'ом), то есть шлёт это ничто. Убедиться ещё раз:

Run: `grep -rn "reminders" tg-bot/bot.ts app/api --include=*.ts`
Expected: пусто. Если найдутся отправки — отключить запись `daily_checkin` в таблице `reminders` (руками через Supabase, не миграцией) и сообщить пользователю.

- [ ] **Step 7: Проверить сборку и тесты**

Run: `npm run build && npx jest lib/__tests__`
Expected: `Compiled successfully`; тесты PASS.

- [ ] **Step 8: Коммит**

```bash
git add -A app/api lib app/\(client\)/RoadMap.tsx
git commit -m "Гейм: убрать дневной чек-ин, уровень считать от заработанного за всё время"
```

---

### Task 6: Агрегирующий эндпоинт /api/home-summary

**Files:**
- Create: `app/api/home-summary/route.ts`

**Interfaces:**
- Consumes: `getLevelInfo` (`lib/levelUtils.ts`), `getMonthGoal` (Задача 3)
- Produces: `GET /api/home-summary?user_id=` → JSON, который читает Задача 7:

```ts
{
  success: true,
  sc: number, totalEarned: number,
  level: { code: string, name: string, icon: string, progress: number, scToNext: number, nextName: string | null },
  friends: number, referralEarned: number, referralCode: string | null,
  tasks: { done: number, total: number, left: number, bonusPerTask: number },
  monthGoal: { reportsDone, reportsTarget, bonus, bonusPaid, completed }
}
```

- [ ] **Step 1: Написать роут**

Создать `app/api/home-summary/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "../../supabaseServerClient";
import { getLevelInfo } from "../../../lib/levelUtils";
import { getMonthGoal } from "../../../lib/monthGoalServer";
import { computeMonthGoal } from "../../../lib/monthGoal";

// Витрина на главном экране: один запрос вместо пяти (уровень, рефералы, статусы трёх заданий).
const TASK_CHANNELS = ["telegram", "youtube", "instagram"];
const TASK_BONUS = 30;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function emptySummary() {
  const level = getLevelInfo(0, 0, 0);
  return {
    success: true,
    sc: 0,
    totalEarned: 0,
    level: {
      code: level.levelCode,
      name: level.levelName,
      icon: level.levelIcon,
      progress: level.progress,
      scToNext: level.scToNext,
      nextName: level.nextLevelName,
    },
    friends: 0,
    referralEarned: 0,
    referralCode: null as string | null,
    tasks: { done: 0, total: TASK_CHANNELS.length, left: TASK_CHANNELS.length, bonusPerTask: TASK_BONUS },
    monthGoal: computeMonthGoal(0, false),
  };
}

export async function GET(req: NextRequest) {
  try {
    const user_id = new URL(req.url).searchParams.get("user_id");
    if (!user_id) {
      return NextResponse.json({ error: "user_id required" }, { status: 400 });
    }
    // Гость/фоллбек-пользователь: игровых данных нет, в БД не ходим.
    if (!UUID_RE.test(user_id)) {
      return NextResponse.json(emptySummary());
    }

    // Подписочные бонусы лежат в двух леджерах: новом sc_transactions и легаси coin_transactions
    // (та же двойная проверка, что в app/api/check-subscription-status/route.ts).
    const subscribeTypes = TASK_CHANNELS.map(c => `subscribe_${c}`);

    const [levelRes, refRes, txRes, legacyRes, userRes, monthGoal] = await Promise.all([
      supabaseServer
        .from("user_levels")
        .select("current_sc_balance, total_sc_earned, total_orders_amount, orders_count")
        .eq("user_id", user_id)
        .maybeSingle(),
      supabaseServer.from("referrals").select("id").eq("referrer_user_id", user_id),
      supabaseServer
        .from("sc_transactions")
        .select("amount, source_type")
        .eq("user_id", user_id)
        .in("source_type", [...subscribeTypes, "referral_cashback"]),
      supabaseServer
        .from("coin_transactions")
        .select("type")
        .eq("user_id", user_id)
        .in("type", subscribeTypes),
      supabaseServer.from("users").select("username, phone, telegram_id").eq("id", user_id).maybeSingle(),
      getMonthGoal(user_id),
    ]);

    const lvl = levelRes.data || { current_sc_balance: 0, total_sc_earned: 0, total_orders_amount: 0, orders_count: 0 };
    const txs = txRes.data || [];
    const legacy = legacyRes.data || [];

    const doneChannels = new Set<string>();
    txs.forEach(t => {
      if (t.source_type?.startsWith("subscribe_")) doneChannels.add(t.source_type.replace("subscribe_", ""));
    });
    legacy.forEach(t => {
      if (t.type?.startsWith("subscribe_")) doneChannels.add(t.type.replace("subscribe_", ""));
    });
    const done = TASK_CHANNELS.filter(c => doneChannels.has(c)).length;

    const referralEarned = txs
      .filter(t => t.source_type === "referral_cashback")
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const level = getLevelInfo(lvl.total_sc_earned || 0, lvl.total_orders_amount || 0, lvl.orders_count || 0);
    const user = userRes.data;
    const referralCode = user ? (user.username ? "@" + user.username : (user.phone || user.telegram_id)) : null;

    return NextResponse.json({
      success: true,
      sc: lvl.current_sc_balance || 0,
      totalEarned: lvl.total_sc_earned || 0,
      level: {
        code: level.levelCode,
        name: level.levelName,
        icon: level.levelIcon,
        progress: level.progress,
        scToNext: level.scToNext,
        nextName: level.nextLevelName,
      },
      friends: (refRes.data || []).length,
      referralEarned,
      referralCode,
      tasks: { done, total: TASK_CHANNELS.length, left: TASK_CHANNELS.length - done, bonusPerTask: TASK_BONUS },
      monthGoal,
    });
  } catch (e) {
    console.error("home-summary error:", e);
    // Витрина не должна ронять главный экран — отдаём нули.
    return NextResponse.json(emptySummary());
  }
}
```

- [ ] **Step 2: Проверить сборку**

Run: `npm run build`
Expected: `Compiled successfully`, exit 0.

- [ ] **Step 3: Проверить ответ гостя на дев-сервере**

preview_start `{name: "dev"}`, затем:

```bash
curl -s "http://localhost:3000/api/home-summary?user_id=guest-123"
```

Expected: JSON с `"sc":0`, `"friends":0`, `"tasks":{"done":0,"total":3,"left":3,"bonusPerTask":30}`, `"monthGoal":{"reportsDone":0,...,"completed":false}`.

```bash
curl -s "http://localhost:3000/api/home-summary"
```

Expected: `{"error":"user_id required"}` со статусом 400.

- [ ] **Step 4: Коммит**

```bash
git add app/api/home-summary/route.ts
git commit -m "API: агрегирующий /api/home-summary для витрины на главном экране"
```

---

### Task 7: Витрина прогресса на главном экране

**Files:**
- Create: `app/(client)/HomeStatus.tsx`
- Modify: `app/(client)/AppClient.tsx` — импорт, состояние `cabinetFocus`, рендер витрины, проп в `RoadMap`
- Modify: `app/(client)/RoadMap.tsx` — пропсы `focus`/`onFocusHandled`, `tasksRef`, эффект раскрытия заданий

**Interfaces:**
- Consumes: `GET /api/home-summary` (Задача 6)
- Produces: `RoadMap` принимает `focus?: 'tasks' | null` и `onFocusHandled?: () => void`

- [ ] **Step 1: Создать компонент витрины**

Создать `app/(client)/HomeStatus.tsx`:

```tsx
"use client";
import { useEffect, useState } from "react";
import { openExternal } from "../../lib/openExternal";
import { SC_MECHANICS } from "../../lib/levelUtils";

type Summary = {
  sc: number;
  totalEarned: number;
  level: { code: string; name: string; icon: string; progress: number; scToNext: number; nextName: string | null };
  friends: number;
  referralEarned: number;
  referralCode: string | null;
  tasks: { done: number; total: number; left: number; bonusPerTask: number };
  monthGoal: { reportsDone: number; reportsTarget: number; bonus: number; bonusPaid: boolean; completed: boolean };
};

interface HomeStatusProps {
  userId?: string;
  onOpenTasks: () => void;
  onOpenCabinet: () => void;
}

const OPEN_KEY = "spor3s_home_status_open";

function plural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

export default function HomeStatus({ userId, onOpenTasks, onOpenCabinet }: HomeStatusProps) {
  const [data, setData] = useState<Summary | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      setOpen(localStorage.getItem(OPEN_KEY) === "1");
    } catch {}
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch(`/api/home-summary?user_id=${userId}`);
        const json = await resp.json();
        if (!cancelled && json?.success) setData(json);
      } catch {
        // витрина необязательна — молча остаёмся без неё
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  if (!data) return null;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    try { localStorage.setItem(OPEN_KEY, next ? "1" : "0"); } catch {}
  };

  const share = () => {
    if (!data.referralCode) return;
    const link = `https://t.me/Spor3s_bot?start=${encodeURIComponent(data.referralCode)}`;
    const text = "Грибные добавки СПОРС 🍄 Перейди по моей ссылке — получишь 100 SC (100₽) на первый заказ!";
    openExternal(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);
  };

  const chip = {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: "clamp(13px, 3.4vw, 16px)",
    fontWeight: 700,
    color: "#fff",
    whiteSpace: "nowrap" as const,
  };

  const row = {
    fontSize: "clamp(12px, 3vw, 14px)",
    color: "#ddd",
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    padding: "6px 0",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  };

  return (
    <div style={{ padding: "0 20px", marginBottom: 20 }}>
      <div style={{
        background: "linear-gradient(135deg, rgba(255,0,204,0.12), rgba(51,51,255,0.12))",
        border: "2px solid rgba(255,255,255,0.15)",
        borderRadius: 16,
        overflow: "hidden"
      }}>
        <button
          type="button"
          onClick={toggle}
          style={{
            width: "100%",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap"
          }}
        >
          <span style={chip}>💰 {data.sc} SC</span>
          <span style={chip}>
            👥 {data.friends} {plural(data.friends, "друг", "друга", "друзей")}
          </span>
          <span style={{ ...chip, color: "#ffc107" }}>{data.level.name}</span>
          <span style={{ color: "#ccc", fontSize: 14 }}>{open ? "▲" : "▼"}</span>
        </button>

        {open && (
          <div style={{ padding: "0 16px 16px" }}>
            <div style={{ fontWeight: 700, color: "#fff", fontSize: "clamp(13px, 3.2vw, 15px)", margin: "6px 0 8px" }}>
              Как заработать SC
            </div>
            <div style={row}><span>🍄 Отчёт за неделю</span><span>+{SC_MECHANICS.weekly_survey.amount} SC</span></div>
            <div style={row}>
              <span>🏆 Цель месяца: {data.monthGoal.reportsTarget} отчёта</span>
              <span>+{data.monthGoal.bonus} SC</span>
            </div>
            <div style={row}><span>🌟 Мотивационная привычка</span><span>до {SC_MECHANICS.motivational_habit.maxPerMonth} SC/мес</span></div>
            <div style={row}><span>🎯 Задания: 3 подписки</span><span>+{data.tasks.bonusPerTask} SC каждое</span></div>
            <div style={row}><span>👥 Друг оформил заказ</span><span>5% суммы в SC</span></div>
            <div style={row}><span>🛒 Свой заказ</span><span>1 SC за 100 ₽</span></div>

            <div style={{ marginTop: 12, fontSize: "clamp(12px, 3vw, 14px)", color: "#10b981", fontWeight: 600 }}>
              1 SC = 1 ₽ скидки, до 30% суммы заказа
            </div>

            {data.level.nextName && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: "clamp(12px, 3vw, 14px)", color: "#ccc", marginBottom: 6 }}>
                  До уровня {data.level.nextName}: {data.level.scToNext} SC
                </div>
                <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.15)", overflow: "hidden" }}>
                  <div style={{
                    width: `${Math.round(data.level.progress * 100)}%`,
                    height: "100%",
                    background: "linear-gradient(45deg, #ff00cc, #3333ff)"
                  }} />
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              {data.referralCode && (
                <button
                  type="button"
                  onClick={share}
                  style={{
                    flex: 1,
                    minWidth: 140,
                    background: "linear-gradient(45deg, #ff00cc, #3333ff)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding: "10px 14px",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  👥 Пригласить друга
                </button>
              )}
              <button
                type="button"
                onClick={onOpenCabinet}
                style={{
                  flex: 1,
                  minWidth: 140,
                  background: "rgba(255,255,255,0.12)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.25)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                🎁 Открыть кабинет
              </button>
            </div>
          </div>
        )}
      </div>

      {data.tasks.left > 0 && (
        <button
          type="button"
          onClick={onOpenTasks}
          style={{
            width: "100%",
            marginTop: 10,
            background: "rgba(255,193,7,0.12)",
            border: "2px solid rgba(255,193,7,0.5)",
            borderRadius: 16,
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            cursor: "pointer",
            color: "#ffc107",
            fontSize: "clamp(13px, 3.2vw, 15px)",
            fontWeight: 700
          }}
        >
          <span>
            🎯 {data.tasks.left} {plural(data.tasks.left, "задание", "задания", "заданий")} не{" "}
            {plural(data.tasks.left, "выполнено", "выполнены", "выполнены")} · +{data.tasks.left * data.tasks.bonusPerTask} SC
          </span>
          <span>→</span>
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Встроить витрину в AppClient**

В `app/(client)/AppClient.tsx`:

добавить импорт рядом с остальными (после строки 7):

```tsx
import HomeStatus from "./HomeStatus";
```

добавить состояние рядом с `currentStep` (после строки 59):

```tsx
  // Куда проскроллить в Кабинете после перехода с главного экрана
  const [cabinetFocus, setCabinetFocus] = useState<'tasks' | null>(null);
```

в `renderContent`, в `case 3`, передать пропсы в `RoadMap`:

```tsx
      case 3:
        return <RoadMap
          user={{
            id: user?.id || 'temp-user',
            telegram_id: user?.telegram_id || 'temp',
            telegram_username: user?.username,
            first_name: user?.first_name,
            last_name: user?.last_name
          }}
          focus={cabinetFocus}
          onFocusHandled={() => setCabinetFocus(null)}
        />;
```

вставить витрину сразу после закрывающего `</nav>` (строка 467), перед `<main`:

```tsx
        {currentStep === 2 && (
          <HomeStatus
            userId={user?.id}
            onOpenTasks={() => { setCabinetFocus('tasks'); setCurrentStep(3); }}
            onOpenCabinet={() => setCurrentStep(3)}
          />
        )}
```

- [ ] **Step 3: Принять фокус в RoadMap**

В `app/(client)/RoadMap.tsx`:

расширить интерфейс пропсов (рядом с существующим `RoadMapProps`):

```tsx
  focus?: 'tasks' | null;
  onFocusHandled?: () => void;
```

изменить сигнатуру компонента:

```tsx
export default function RoadMap({ user, focus, onFocusHandled }: RoadMapProps) {
```

добавить ref рядом с остальными состояниями (`useRef` уже импортирован на строке 2, добавлять импорт не нужно):

```tsx
  const tasksRef = useRef<HTMLDivElement>(null);
```

добавить эффект после объявления состояний:

```tsx
  // Переход с плашки на главном экране: раскрыть задания и подвести к ним
  useEffect(() => {
    if (focus !== 'tasks') return;
    setTasksOpen(true);
    tasksRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    onFocusHandled?.();
  }, [focus]);
```

повесить ref на контейнер блока заданий (строка 1586, `<div style={{ background: "linear-gradient(135deg, #0f172a, #1e293b)", ...`, тот, внутри которого кнопка «🎯 Задания»):

```tsx
      <div ref={tasksRef} style={{
```

- [ ] **Step 4: Проверить сборку**

Run: `npm run build`
Expected: `Compiled successfully`, exit 0.

- [ ] **Step 5: Проверить в превью**

preview_start `{name: "dev"}`, открыть http://localhost:3000.

Проверить через read_page:
- на «Каталоге» видна строка `💰 0 SC`, `👥 0 друзей`, `🌱 Новичок`;
- видна плашка `🎯 3 задания не выполнены · +90 SC`;
- клик по строке раскрывает список источников SC и текст `1 SC = 1 ₽ скидки, до 30% суммы заказа`;
- клик по плашке переключает на «Кабинет», блок «🎯 Задания» раскрыт.

Проверить консоль через read_console_messages: ошибок нет.

Сделать screenshot для отчёта.

- [ ] **Step 6: Коммит**

```bash
git add app/\(client\)/HomeStatus.tsx app/\(client\)/AppClient.tsx app/\(client\)/RoadMap.tsx
git commit -m "Главный экран: витрина SC/друзей с раскрытием механики и плашка невыполненных заданий"
```

---

### Task 8: Гриб = отчёт за неделю и блок цели месяца

**Files:**
- Modify: `app/(client)/RoadMap.tsx` — новая карточка гриба на месте удалённой (после строки 1127), блок цели месяца, удаление отдельной кнопки сохранения (1699-1736) и блока метрик (1467-1581)

**Interfaces:**
- Consumes: `POST /api/survey` с полями `monthGoalBonus`, `monthGoal` (Задача 4); `nextWeekInfo` (уже есть, `RoadMap.tsx:171`)
- Produces: ничего для других задач

- [ ] **Step 0: Вынести слайдеры самооценки в общий компонент**

Один и тот же набор из четырёх слайдеров нужен в двух местах: недельный отчёт (эта задача) и стартовая самооценка (Задача 9). Чтобы не копировать 40 строк JSX, создать `app/(client)/MetricsSliders.tsx`:

```tsx
"use client";

export interface Metrics {
  memory: number;
  sleep: number;
  energy: number;
  stress: number;
}

const LABELS: Record<keyof Metrics, string> = {
  memory: '🧠 Память и концентрация',
  sleep: '😴 Качество сна',
  energy: '⚡ Уровень энергии',
  stress: '😌 Стрессоустойчивость',
};

interface MetricsSlidersProps {
  metrics: Metrics;
  onChange: (metrics: Metrics) => void;
}

export default function MetricsSliders({ metrics, onChange }: MetricsSlidersProps) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: "clamp(12px, 3vw, 16px)",
      marginBottom: 16
    }}>
      {(Object.keys(LABELS) as (keyof Metrics)[]).map((key) => {
        const value = metrics[key];
        return (
          <div key={key} style={{
            background: "rgba(255, 255, 255, 0.1)",
            borderRadius: "12px",
            padding: "clamp(12px, 3.5vw, 16px)",
            textAlign: "center",
            boxSizing: "border-box"
          }}>
            <div style={{ fontSize: "clamp(13px, 3.2vw, 15px)", fontWeight: "bold", color: "#fff", marginBottom: 8 }}>
              {LABELS[key]}
            </div>
            <div style={{
              fontSize: "clamp(18px, 4.5vw, 22px)",
              fontWeight: "bold",
              color: value > 7 ? "#10b981" : value > 4 ? "#f59e0b" : "#ef4444",
              marginBottom: 8
            }}>
              {value}/10
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={value}
              onChange={(e) => onChange({ ...metrics, [key]: parseInt(e.target.value) })}
              style={{ width: "100%", height: 8, borderRadius: 4, background: "rgba(255,255,255,0.2)", outline: "none" }}
            />
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 1: Добавить состояние цели месяца и раскрытия формы**

В `app/(client)/RoadMap.tsx` добавить импорты рядом с существующими (строки 2-4):

```tsx
import MetricsSliders from "./MetricsSliders";
import { SC_MECHANICS } from "../../lib/levelUtils";
```

и состояния рядом с остальными:

```tsx
  const [reportOpen, setReportOpen] = useState(false);
  const [monthGoal, setMonthGoal] = useState<{ reportsDone: number; reportsTarget: number; bonus: number; bonusPaid: boolean; completed: boolean } | null>(null);
```

- [ ] **Step 2: Подтянуть цель месяца при загрузке**

Рядом с `fetchSurveys` добавить функцию:

```tsx
  const fetchMonthGoal = async () => {
    if (!user?.id) return;
    try {
      const resp = await fetch(`/api/home-summary?user_id=${user.id}`);
      const data = await resp.json();
      if (data?.success && data.monthGoal) setMonthGoal(data.monthGoal);
    } catch {}
  };
```

и вызвать её в существующем `useEffect` загрузки данных (был на строках 516-524, после Задачи 5 из него убран `fetchCheckinStatus`):

```tsx
  useEffect(() => {
    if (user?.id) {
      fetchReferralStats();
      checkSubscriptionBonuses();
      fetchMyOrders();
      fetchSurveys();
      fetchCourseStatus();
      fetchMonthGoal();
    }
  }, [user?.id]);
```

- [ ] **Step 3: Обновлять цель месяца после сохранения отчёта**

В `saveWeeklyProgress` (строка 127, ветка `data.success`) добавить после обновления баланса:

```tsx
        if (data.monthGoal) setMonthGoal(data.monthGoal);
        if (data.monthGoalBonus > 0) {
          setTotalEarned(prev => prev + data.monthGoalBonus);
        }
```

и расширить сообщение об успехе:

```tsx
        setSaveProgressMsg(
          data.scLimitReached
            ? `✅ Неделя ${savedWeek} сохранена (без SC — исчерпан месячный лимит ${SC_MECHANICS.weekly_survey.maxPerMonth} SC)`
            : `✅ Неделя ${savedWeek} сохранена! +${data.scEarned || SC_MECHANICS.weekly_survey.amount} SC` +
              (data.monthGoalBonus > 0 ? ` и +${data.monthGoalBonus} SC за цель месяца 🏆` : '')
        );
        setReportOpen(false);
```

- [ ] **Step 4: Вставить блок цели месяца и новую карточку гриба**

Сразу после строки `{SHOW_GAMIFICATION && (<>` (строка 1127, там, где в Задаче 5 удалена старая карточка) вставить:

```tsx
      {/* Цель месяца */}
      {monthGoal && (
        <div style={{
          background: "linear-gradient(135deg, rgba(255,193,7,0.1), rgba(255,152,0,0.1))",
          border: "2px solid rgba(255,193,7,0.5)",
          borderRadius: "20px",
          padding: "clamp(18px, 4.5vw, 22px)",
          marginBottom: "20px",
          width: "100%",
          boxSizing: "border-box"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <span style={{ fontSize: "clamp(15px, 3.8vw, 17px)", fontWeight: "bold", color: "#ffc107" }}>
              🏆 Цель месяца
            </span>
            <span style={{ fontSize: "clamp(13px, 3.2vw, 15px)", color: "#fff", fontWeight: 600 }}>
              {monthGoal.reportsDone} из {monthGoal.reportsTarget} отчётов
            </span>
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {Array.from({ length: monthGoal.reportsTarget }).map((_, i) => (
              <div key={i} style={{
                flex: 1,
                height: 10,
                borderRadius: 5,
                background: i < monthGoal.reportsDone
                  ? "linear-gradient(45deg, #ffc107, #ff9800)"
                  : "rgba(255,255,255,0.15)"
              }} />
            ))}
          </div>
          <div style={{ fontSize: "clamp(12px, 3vw, 14px)", color: monthGoal.bonusPaid ? "#10b981" : "#ccc", fontWeight: monthGoal.bonusPaid ? 700 : 400 }}>
            {monthGoal.bonusPaid
              ? `✅ Цель месяца выполнена — +${monthGoal.bonus} SC получены`
              : `Собери ${monthGoal.reportsTarget} отчёта за месяц → +${monthGoal.bonus} SC`}
          </div>
        </div>
      )}

      {/* Гриб — отчёт за неделю */}
      <div style={{
        background: "linear-gradient(135deg, rgba(255, 0, 204, 0.1), rgba(51, 51, 255, 0.1))",
        borderRadius: "20px",
        padding: "clamp(25px, 6vw, 30px)",
        marginBottom: "30px",
        border: "2px solid rgba(255, 255, 255, 0.2)",
        textAlign: "center",
        width: "100%",
        boxSizing: "border-box",
        overflow: "hidden"
      }}>
        <div style={{
          fontSize: "clamp(60px, 15vw, 80px)",
          marginBottom: "20px",
          cursor: courseStarted && !nextWeekInfo.locked ? "pointer" : "default",
          transition: "transform 0.3s ease",
          filter: nextWeekInfo.locked
            ? "drop-shadow(0 4px 8px rgba(16,185,129,0.5))"
            : "drop-shadow(0 4px 8px rgba(0,0,0,0.3))",
          opacity: courseStarted ? 1 : 0.45
        }}
        onClick={() => {
          if (!courseStarted || nextWeekInfo.locked) return;
          setReportOpen(o => !o);
        }}
        title={
          !courseStarted
            ? "Начни курс, чтобы вести отчёты"
            : nextWeekInfo.locked
              ? "Все недели заполнены"
              : `Собери отчёт за неделю ${nextWeekInfo.next}`
        }
        >
          {nextWeekInfo.locked ? "✅" : "🍄"}
        </div>

        <div style={{
          color: nextWeekInfo.locked ? "#10b981" : "#ccc",
          fontSize: "clamp(12px, 3vw, 14px)",
          lineHeight: "1.5",
          fontWeight: nextWeekInfo.locked ? 700 : 400,
          wordBreak: "break-word"
        }}>
          {!courseStarted
            ? `Начни курс — и открой еженедельные отчёты (+${SC_MECHANICS.weekly_survey.amount} SC за неделю)`
            : nextWeekInfo.locked
              ? `Все недели заполнены — неделя ${nextWeekInfo.next} откроется ${nextWeekInfo.opensAt?.toLocaleDateString('ru-RU')}`
              : `Собери отчёт за неделю ${nextWeekInfo.next} → +${SC_MECHANICS.weekly_survey.amount} SC`}
        </div>

        {reportOpen && courseStarted && !nextWeekInfo.locked && (
          <div style={{ marginTop: 20, textAlign: "left" }}>
            <MetricsSliders metrics={todayMetrics} onChange={setTodayMetrics} />

            <textarea
              value={weeklyObservations}
              onChange={(e) => setWeeklyObservations(e.target.value)}
              placeholder="Что изменилось за неделю? Самочувствие, сон, настроение…"
              style={{
                width: "100%",
                minHeight: 70,
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: 8,
                padding: 12,
                color: "#fff",
                fontSize: "clamp(12px, 3vw, 14px)",
                fontFamily: "inherit",
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
                marginBottom: 14
              }}
            />

            <button
              onClick={saveWeeklyProgress}
              disabled={saveProgressLoading}
              style={{
                width: "100%",
                background: saveProgressLoading
                  ? "rgba(255,255,255,0.3)"
                  : "linear-gradient(45deg, #ff00cc, #3333ff)",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                padding: "14px 20px",
                fontSize: 16,
                fontWeight: "bold",
                cursor: saveProgressLoading ? "not-allowed" : "pointer"
              }}
            >
              {saveProgressLoading ? '⏳ Сохраняю…' : `🍄 Сдать отчёт за неделю ${nextWeekInfo.next} → +${SC_MECHANICS.weekly_survey.amount} SC`}
            </button>
          </div>
        )}

        {saveProgressMsg && (
          <div style={{
            marginTop: "12px",
            color: saveProgressMsg.startsWith("✅") ? "#10b981" : "#ffc107",
            fontSize: "clamp(13px, 3.2vw, 15px)",
            fontWeight: 600
          }}>
            {saveProgressMsg}
          </div>
        )}
      </div>
```

- [ ] **Step 5: Удалить осиротевшие блоки**

- Удалить блок «📊 Еженедельные отметки состояния» целиком (строки 1467-1581) — слайдеры и заметка теперь внутри карточки гриба.
- Удалить кнопку «💾 Сохранить прогресс недели N» и её сообщение (строки 1699-1736), оставив в блоке кнопок только «История» — теперь единственная точка сдачи отчёта это гриб.

- [ ] **Step 6: Проверить сборку и тесты**

Run: `npm run build && npx jest lib/__tests__`
Expected: `Compiled successfully`; тесты PASS.

- [ ] **Step 7: Коммит**

```bash
git add app/\(client\)/RoadMap.tsx
git commit -m "Кабинет: гриб становится кнопкой недельного отчёта, добавлен блок цели месяца"
```

---

### Task 9: Стартовая самооценка внутри старта курса

**Files:**
- Modify: `app/(client)/RoadMap.tsx` — удалить блокирующий экран (строки 527-...), переписать карточку старта курса (685-781), расширить `handleStartCourse`

**Interfaces:**
- Consumes: `POST /api/survey` с `baseline: true` (Задача 4)
- Produces: ничего для других задач

- [ ] **Step 1: Удалить блокирующий экран стартовой самооценки**

В `app/(client)/RoadMap.tsx` удалить весь блок `if (SHOW_GAMIFICATION && showStartAssessment) { ... }` (начало — строка 527), состояние `showStartAssessment` и пустую функцию `handleStartAssessment` (строки 102-105). Состояние `startMetrics` оставить — оно становится значениями стартовой самооценки.

- [ ] **Step 2: Добавить состояние выбора длительности**

Рядом с остальными состояниями:

```tsx
  const [pendingDuration, setPendingDuration] = useState<number | null>(null);
```

- [ ] **Step 3: Сохранять нулевую точку при старте курса**

Существующая функция (`app/(client)/RoadMap.tsx:353-387`) выглядит так:

```tsx
  // Функция для начала курса
  const handleStartCourse = async (duration: number) => {
    if (!user?.id) return;

    setStartCourseLoading(true);
    try {
      const response = await fetch('/api/start-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          course_duration: duration.toString()
        })
      });

      const data = await response.json();

      if (data.success) {
        setCourseStarted(true);
        setCourseDuration(duration);
        setCourseStartDate(new Date().toISOString());
        alert(data.message);
      } else {
        if (data.requiresOrder) {
          alert('Для начала отслеживания курса необходимо оформить заказ. Перейдите в каталог и добавьте товары в корзину.');
        } else {
          alert(data.error || 'Ошибка начала курса');
        }
      }
    } catch (error) {
      console.error('Start course error:', error);
      alert('Ошибка начала курса');
    } finally {
      setStartCourseLoading(false);
    }
  };
```

Заменить её целиком на версию с флагом самооценки. Обработка ответа (включая `requiresOrder` и `alert(data.message)`) сохранена, дата старта теперь берётся из ответа сервера — так недели считаются от той же отметки, что лежит в `user_courses`:

```tsx
  // Начало курса. withBaseline — сохранить нулевую точку (стартовую самооценку) перед стартом.
  const handleStartCourse = async (duration: number, withBaseline: boolean) => {
    if (!user?.id) return;

    setStartCourseLoading(true);
    try {
      if (withBaseline) {
        // Нулевая точка: SC не даёт, нужна для сравнения «было → стало».
        // Ошибку не показываем — она не должна мешать старту курса.
        try {
          await fetch('/api/survey', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: user.id,
              baseline: true,
              memory: startMetrics.memory,
              sleep: startMetrics.sleep,
              energy: startMetrics.energy,
              stress: startMetrics.stress,
              note: 'Стартовая самооценка'
            })
          });
        } catch (e) {
          console.error('Baseline save error:', e);
        }
      }

      const response = await fetch('/api/start-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          course_duration: duration.toString()
        })
      });

      const data = await response.json();

      if (data.success) {
        setCourseStarted(true);
        setCourseDuration(duration);
        setCourseStartDate(data.course?.start_date || new Date().toISOString());
        setPendingDuration(null);
        alert(data.message);
        fetchSurveys();
      } else {
        if (data.requiresOrder) {
          alert('Для начала отслеживания курса необходимо оформить заказ. Перейдите в каталог и добавьте товары в корзину.');
        } else {
          alert(data.error || 'Ошибка начала курса');
        }
      }
    } catch (error) {
      console.error('Start course error:', error);
      alert('Ошибка начала курса');
    } finally {
      setStartCourseLoading(false);
    }
  };
```

- [ ] **Step 4: Переписать карточку старта курса**

Заменить блок выбора длительности (строки 717-757, ветка `!courseStarted`) на:

```tsx
          pendingDuration === null ? (
            <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap", width: "100%" }}>
              {[1, 3, 6].map((duration) => (
                <button
                  key={duration}
                  onClick={() => setPendingDuration(duration)}
                  style={{
                    background: "linear-gradient(45deg, #ffc107, #ff9800)",
                    color: "white",
                    border: "none",
                    borderRadius: "12px",
                    padding: "clamp(10px, 2.5vw, 12px) clamp(15px, 3.5vw, 20px)",
                    fontSize: "clamp(14px, 3.5vw, 16px)",
                    fontWeight: "bold",
                    cursor: "pointer",
                    whiteSpace: "nowrap"
                  }}
                >
                  {duration} мес.
                </button>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "left", width: "100%" }}>
              <div style={{ color: "#fff", fontSize: "clamp(13px, 3.2vw, 15px)", fontWeight: 600, marginBottom: 12, textAlign: "center" }}>
                Отметь, как сейчас — это нулевая точка курса
              </div>
              <MetricsSliders metrics={startMetrics} onChange={setStartMetrics} />
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={() => handleStartCourse(pendingDuration, true)}
                  disabled={startCourseLoading}
                  style={{
                    flex: 1,
                    minWidth: 160,
                    background: startCourseLoading ? "rgba(255,255,255,0.3)" : "linear-gradient(45deg, #ffc107, #ff9800)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 12,
                    padding: "12px 18px",
                    fontSize: 15,
                    fontWeight: "bold",
                    cursor: startCourseLoading ? "not-allowed" : "pointer"
                  }}
                >
                  {startCourseLoading ? '⏳ Начинаю…' : `Начать курс на ${pendingDuration} мес.`}
                </button>
                <button
                  onClick={() => handleStartCourse(pendingDuration, false)}
                  disabled={startCourseLoading}
                  style={{
                    flex: 1,
                    minWidth: 120,
                    background: "rgba(255,255,255,0.12)",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.25)",
                    borderRadius: 12,
                    padding: "12px 18px",
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: startCourseLoading ? "not-allowed" : "pointer"
                  }}
                >
                  Пропустить
                </button>
              </div>
            </div>
          )
```

- [ ] **Step 5: Показать нулевую точку в истории**

Нулевая точка приходит из `GET /api/survey` вместе с остальными записями и получает `week: 0`, поэтому в модалке истории она встанет первой. Заменить подпись (`app/(client)/RoadMap.tsx:1912-1914`):

```tsx
                          <div style={{ color: "#ff00cc", fontWeight: "bold" }}>
                            Неделя {week.week}
                          </div>
```

на:

```tsx
                          <div style={{ color: "#ff00cc", fontWeight: "bold" }}>
                            {week.week === 0 ? 'Старт' : `Неделя ${week.week}`}
                          </div>
```

`getNextWeekInfo` (строка 158) трогать не нужно: подбор свободной недели начинается с 1, поэтому нулевая точка первую неделю не занимает.

- [ ] **Step 6: Проверить сборку**

Run: `npm run build`
Expected: `Compiled successfully`, exit 0.

- [ ] **Step 7: Коммит**

```bash
git add app/\(client\)/RoadMap.tsx
git commit -m "Кабинет: стартовая самооценка встроена в старт курса вместо блокирующего экрана"
```

---

### Task 10: Включить геймификацию и проверить целиком

**Files:**
- Modify: `app/(client)/RoadMap.tsx:51`

**Interfaces:**
- Consumes: всё предыдущее
- Produces: включённые игровые механики в проде

- [ ] **Step 1: Включить флаг**

В `app/(client)/RoadMap.tsx` заменить строки 49-51:

```tsx
  // Геймификация (уровни, недельные отчёты, цель месяца, трекинг курса).
  // Аварийный откат: SHOW_GAMIFICATION = false
  const SHOW_GAMIFICATION = true;
```

- [ ] **Step 2: Полная сборка**

Run: `npm run build`
Expected: `Compiled successfully`, exit 0, без warnings об отсутствующих модулях.

- [ ] **Step 3: Юнит-тесты**

Run: `npx jest lib/__tests__`
Expected: PASS, 16 тестов (9 в surveyWeeks + 7 в monthGoal).

- [ ] **Step 4: Проверка в превью**

preview_start `{name: "dev"}` и пройти по критериям готовности из спеки:

- «Каталог»: витрина с SC/друзьями/уровнем, плашка заданий, раскрытие механики.
- Клик по плашке → «Кабинет», блок «🎯 Задания» раскрыт и в зоне видимости.
- «Кабинет»: виден блок цели месяца, гриб, уровни и награды, история.
- Без оплаченного заказа: гриб приглушён с текстом «Начни курс…», вкладка не заблокирована никаким экраном самооценки.
- read_console_messages: ошибок нет.

Сделать screenshot обоих экранов.

- [ ] **Step 5: Проверить, что чек-ина не осталось**

Run: `grep -rn "api/checkin" app lib --include=*.ts --include=*.tsx`
Expected: пусто.

- [ ] **Step 6: Коммит**

```bash
git add app/\(client\)/RoadMap.tsx
git commit -m "Гейм: включить геймификацию (SHOW_GAMIFICATION = true)"
```

- [ ] **Step 7: Отчёт пользователю перед мержем**

Показать: скриншоты главного экрана и Кабинета, вывод `npm run build`, вывод `npx jest lib/__tests__`. Мерж в `main` (и, соответственно, деплой через CI) — только после подтверждения пользователя.

---

## Порядок и зависимости

```
Task 1 (тесты)
  └→ Task 2 (surveyWeeks) ─┐
  └→ Task 3 (monthGoal) ───┴→ Task 4 (survey API)
                                 ├→ Task 6 (home-summary) → Task 7 (витрина)
                                 ├→ Task 8 (гриб + цель месяца)
                                 └→ Task 9 (стартовая самооценка)
Task 5 (удаление чек-ина) — независима, но должна идти до Task 8 (освобождает место карточки гриба)
Task 10 — последняя, после всех
```

## Что осталось за рамками

- Мёртвый дубль `app/(client)/page.tsx` + `components/MushroomTracker.tsx` / `MushroomTrackerPage.tsx` (техдолг, §11.2 спеки).
- Починка легаси-тестов в `components/__tests__/`.
- Правка `tsconfig.json` (`suppressImplicitAnyIndexErrors`).
- Пересмотр порогов уровней (§11.1 спеки).
- Напоминания в боте про недельный отчёт.
