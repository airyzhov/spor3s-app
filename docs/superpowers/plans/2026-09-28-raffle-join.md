# Розыгрыш 10.10: «Участвую», новые призы, рассылка — план

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Участие — задание + кнопка «Участвую»; приз 0 друзей → 1 добавка, 1–2 → 2, 3+ → комплекс; друг засчитывается, только если открыл магазин; бот напоминает, админ рассылает.

**Architecture:** Правила без базы — `lib/raffle.ts`; запросы — `lib/raffleServer.ts` (нажатие `joinRaffle`, рассылка `announceRaffle`); API `/api/raffle` (GET + POST join), `/api/admin/raffle` (+ `announce`), `/api/admin/raffle/announce`; UI — `RaffleBanner`, `RaffleAdmin`.

**Tech Stack:** Next.js 14, TypeScript, Supabase, Jest + RTL.

**Спека:** `docs/superpowers/specs/2026-09-28-raffle-join-design.md`

## Global Constraints

- `RAFFLE` (сроки, id, 3 победителя) не меняется.
- Тексты призов: «1 добавка на выбор», «2 добавки на выбор», «комплекс добавок».
- «Открыл приложение»: `Date.parse(last_activity) > Date.parse(created_at)`.
- Без таблиц `raffle_entries`/`raffle_notices` ничего не падает: `joined=false`, нажатие → 503 «Скоро», рассылка → 409.
- Рассылка — только по кнопке админа; одному человеку `announce` уходит один раз.

---

### Task 1: Правила (`lib/raffle.ts`, `lib/course.ts`)

**Files:** `lib/raffle.ts`, `lib/course.ts`; тесты `lib/__tests__/raffle.test.ts`, `lib/__tests__/raffleNotice.test.ts`, `lib/__tests__/course.test.ts`.

**Interfaces (Produces):**
- `PRIZE_TIERS` = `[{0,one},{1,two},{3,set}]`; `prizeRulesText()` → «без друзей — 1 добавка на выбор, 1–2 друга — 2 добавки на выбор, 3 и больше — комплекс добавок»;
- `prizeForFriends(n): Prize` (всегда приз), `nextPrize(n)`;
- `isEligible(tasks: number, joined: boolean): boolean`;
- `openedMiniApp(row?: { last_activity: string | null; created_at: string | null } | null): boolean`;
- `RaffleMe` + `joined`; `RaffleParticipant` + `joined`; `buildParticipants(users, tasks, friends, joined: Set<string>)`;
- `raffleNotice(event, { tasks, friends, joined }): 'join_reminder' | 'tier_up' | null` —
  task: `tasks === 1 && !joined` → join_reminder; friend: `joined && tasks >= 1 && friends ∈ {1,3}` → tier_up,
  `!joined && friends === 1` → join_reminder;
- `joinReminderMessage({tasks, friends})`, `tierUpMessage(friends)`, `announceMessage({tasks, friends})`;
- `buildRaffleNotice(event, progress, telegramId, now)`, `buildAnnounceNotice(progress, telegramId, now)` (null, если joined / не open / нет числового ID);
- `RAFFLE_APP_URL = 'https://ai.spor3s.ru/?open=raffle'` — кнопка «🎁 Открыть розыгрыш»;
- `cabinetFocusFromUrl(search): 'course' | 'raffle' | null`.

- [ ] Step 1: обновить тесты под новые правила (красные).
- [ ] Step 2: `npx jest lib/__tests__/raffle.test.ts lib/__tests__/raffleNotice.test.ts lib/__tests__/course.test.ts` → FAIL.
- [ ] Step 3: реализация.
- [ ] Step 4: тесты → PASS; commit.

### Task 2: Сервер (`lib/raffleServer.ts`, `lib/raffleNotify.ts`, `app/api/init-user`)

**Interfaces (Produces):**
- `getUserProgress(userId): { tasks, friends, joined }`;
- `listParticipants()` — с `joined`;
- `class RaffleJoinError(status, message)`; `joinRaffle(userId): Promise<RaffleMe>` —
  не open → 409 «Приём заявок закрыт»; нет задания → 400 «Сначала выполни задание на подписку»;
  нет таблицы → 503 «Скоро можно будет нажать «Участвую»»; повторное нажатие — не ошибка;
- `announceAudience(): Promise<{ tableReady: boolean; pending: number }>`;
- `announceRaffle(): Promise<{ sent: number; failed: number }>` — всем Telegram-пользователям без «Участвую»
  и без записи `raffle_notices(kind='announce')`; запись — после попытки (и при отказе Telegram);
- `friendCounts` берёт `last_activity, created_at` и фильтрует `openedMiniApp`;
- init-user: `seenBefore = openedMiniApp(строка до upsert)`.

- [ ] Step 1: `lib/__tests__/raffleServer.test.ts` (поддельная база + `fetch` Telegram): join — правила и
  повтор; друг без входа в магазин не засчитан; рассылка — текст по заданию, повтор не шлёт, отказ Telegram
  тоже помечается; нет таблиц — 503 / 409.
- [ ] Step 2: FAIL → Step 3: реализация → Step 4: PASS; commit.

### Task 3: API

- `/api/raffle` GET — `me.joined`; POST `{ user_id, action: 'join' }` → `joinRaffle` → `{ success, me }` или ошибка со статусом.
- `/api/admin/raffle` GET — `announce: { tableReady, pending }`; CSV + колонка «Участвую».
- `POST /api/admin/raffle/announce` (isAdmin) → `announceRaffle()` → `{ success, sent, failed }`.
- draw: ошибка «Нет участников (задание + «Участвую»)».
- [ ] tsc по изменённым файлам чистый; commit.

### Task 4: UI

- `RaffleBanner`: условия (задание; «✋ Участвую» — POST, затем перечитать), друзья и приглашение, статус.
  Тест `RaffleBanner.test.tsx`: кнопка до задания неактивна с подсказкой; после задания — POST join и
  «✅ Ты участвуешь»; «N из 2 условий» считает задание и «Участвую».
- `AppClient`: `?open=raffle` → кабинет с раскрытым розыгрышем.
- `RaffleAdmin`: колонка, счётчик, кнопка «📣 Рассказать о розыгрыше (N)» с `confirm` и итогом.
- [ ] тесты PASS; commit.

### Task 5: SQL, проверка, PR

- `raffle_entries.sql` в корне (`git add -f`: корневые *.sql в .gitignore).
- `npx jest` (11 старых падений), `npm run build`, превью, PR. Выкладка — после того как владелец выполнит SQL.
