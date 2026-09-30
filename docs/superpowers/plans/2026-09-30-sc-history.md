# История SC: поиск в админке, история в кабинете, сообщения в боте — план

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Владелец находит человека по нику или ID и видит его историю SC; покупатель видит свою историю
в кабинете; бот пишет о каждом начислении и списании SC.

**Architecture:** Форматирование и текст сообщения без базы — `lib/scHistory.ts`; отправка —
`lib/scNotify.ts` (из `creditSC` и из `lib/scLedger.ts`: ручная операция и списание при заказе);
чтение истории — `lib/scHistoryServer.ts` и два API; UI — `UserPicker` и `ScHistoryAdmin` в админке,
`ScHistorySection` в кабинете (`?open=sc`).

**Tech Stack:** Next.js 14, TypeScript, Supabase, Jest + RTL.

**Спека:** `docs/superpowers/specs/2026-09-30-sc-history-design.md`

## Global Constraints

- Сообщение: `💰 <b>+30 SC</b> — описание` / `💸 <b>−50 SC</b> — описание`, вторая строка
  `Баланс: <b>N SC</b>`, кнопка `🧾 История SC` → `https://ai.spor3s.ru/?open=sc` (web_app).
- Минус — U+2212 (`−`), номера заказов `#<uuid>` → `#<первые 8>`, даты `28.09 14:02` по Москве.
- Сообщение не должно ломать операцию с SC: `notifyScChange` и `sendTelegramNotice` не бросают,
  Telegram ждём не дольше 5 с.
- Пишем только на числовой Telegram ID (`/^\d{5,15}$/`); нет токена бота — ничего не делаем.
- Пустой комментарий ручной операции: «Начисление от магазина» / «Списание магазином».
- Код в `tg-bot/` не трогаем — выкладка только сайта.

---

### Task 1: Форматирование и текст сообщения (`lib/scHistory.ts`)

**Files:** создать `lib/scHistory.ts`; тест `lib/__tests__/scHistory.test.ts`.

**Interfaces (Produces):**
- `type ScTransaction = { id: string; created_at: string; amount: number; description: string | null; source_type: string | null }`;
- `type ScChange = { amount: number; description: string | null; balance: number }`;
- `SC_HISTORY_APP_URL = 'https://ai.spor3s.ru/?open=sc'`;
- `formatScAmount(amount): string` → `+30`, `−50`, `0`;
- `shortOrderIds(text: string | null | undefined): string`;
- `scDateLabel(iso: string): string` (`Intl.DateTimeFormat` `ru-RU`, `Europe/Moscow`, `hourCycle: 'h23'`; неверная дата → `''`);
- `scChangeNotice(change: ScChange, telegramId): TelegramNotice | null` (HTML в описании экранируется).

- [ ] Тесты (RED): знак суммы; сокращение одного и нескольких номеров, текст без номера, `null` → `''`;
  дата `2026-09-28T11:02:00Z` → `28.09 14:02`, полночь `2026-09-27T21:05:00Z` → `28.09 00:05`, мусор → `''`;
  сообщение о начислении и списании (точный текст, chatId, кнопка), экранирование `<b>` и `&`,
  без описания — только сумма, `null` для `guest-1` / `null` / суммы 0.
- [ ] Реализация (GREEN), прогон `npx jest lib/__tests__/scHistory.test.ts`, коммит.

### Task 2: Telegram не держит ответ (`lib/telegramSend.ts`)

**Files:** `lib/telegramSend.ts`; тест `lib/__tests__/telegramSend.test.ts` (node).

- [ ] Тесты (RED): в запросе есть `signal` (`AbortSignal`); `fetch` отклонён (таймаут, сеть) → `false`
  без исключения; в лог не попадает токен; без токена — `fetch` не вызывается.
- [ ] Реализация: `signal: AbortSignal.timeout(5000)`, `try/catch` → `console.error` (только
  `name: message`) и `false`. Прогон тестов + `raffleServer`, `courseNotify`, коммит.

### Task 3: Сообщение при каждом `creditSC` (`lib/scNotify.ts`, `lib/referral.ts`)

**Files:** создать `lib/scNotify.ts`; изменить `creditSC` в `lib/referral.ts`; тест
`lib/__tests__/scLedger.test.ts` (node; база в памяти с `order`/`limit`/`update`/`single`/`maybeSingle`,
набор `failing` для ошибок записи; `fetch` подменён и запоминает `chat_id`, `text`, `reply_markup`).

**Interfaces:**
- Consumes: `scChangeNotice`, `ScChange` (Task 1), `sendTelegramNotice` (Task 2).
- Produces: `notifyScChange(userId: string, change: ScChange): Promise<void>`.

- [ ] Тесты (RED): `creditSC` +30 при балансе 100 → баланс 130 и одно сообщение
  `💰 <b>+30 SC</b> — Бонус за задание: Telegram канал\nБаланс: <b>130 SC</b>` с кнопкой истории;
  первое начисление без строки уровня — баланс = сумме; `guest-1` — без сообщения; без токена —
  без сообщения; Telegram 403 и упавшая сеть — начисление прошло, исключения нет.
- [ ] Реализация: `notifyScChange` (нет токена → return; `users.telegram_id` → `scChangeNotice` →
  `sendTelegramNotice`; всё в `try/catch`); в `creditSC` посчитать `balance` и в конце вызвать
  `notifyScChange`. Прогон `scLedger`, `referralWelcome`, `referralClaim`, `habitServer`, коммит.

### Task 4: Ручная операция и списание при заказе (`lib/scLedger.ts`, маршруты)

**Files:** создать `lib/scLedger.ts`; изменить `app/api/admin/manual-coin/route.ts`,
`app/api/order/route.ts` (блок «6. Если использованы монеты»); тест — дописать `lib/__tests__/scLedger.test.ts`.

**Interfaces (Produces):**
- `manualAdjustSC({ userId, amount, description?, notify? = true }): Promise<number>` — новый баланс;
  ошибка записи/баланса → `throw`;
- `spendScForOrder({ userId, orderId, coins, balanceBefore, spentBefore }): Promise<void>` — ошибки в лог,
  тогда без сообщения.

- [ ] Тесты (RED): +50 с комментарием — `manual`/`earned`, баланс 150, `total_sc_earned`, сообщение
  с комментарием, вернул 150; −20 без комментария — «Списание магазином», `spent`, `total_sc_spent` 20;
  +10 без комментария — «Начисление от магазина»; `notify: false` — без сообщения; нет строки уровня —
  создаётся; упала запись операции — `throw`, баланс прежний, без сообщения. Списание при заказе:
  −40 → запись `order_discount` с полным номером, баланс 60, `total_sc_spent` 40, сообщение с `#03d1710f`;
  упала запись или баланс — без сообщения.
- [ ] Реализация + маршруты: `manual-coin` — `{ user_id, amount, description, notify }` →
  `manualAdjustSC(..., notify: notify !== false)` → `{ success: true, balance }`; `order` —
  `spendScForOrder({ userId: user_id, orderId: order.id, coins: coinsToApply, balanceBefore: scBalance,
  spentBefore: userLevel?.total_sc_spent || 0 })`. Прогон, коммит.

### Task 5: Чтение истории и API

**Files:** создать `lib/scHistoryServer.ts`, `app/api/sc-history/route.ts`,
`app/api/admin/sc-history/route.ts`; тест — дописать `lib/__tests__/scLedger.test.ts`.

**Interfaces (Produces):**
- `getScHistory(userId: string, limit = 100): Promise<ScTransaction[]>` — `id, created_at, amount,
  description, source_type`, `order('created_at', desc)`, `limit`;
- `GET /api/sc-history?user_id=` → `{ success: true, transactions }` (не UUID → пустой список; ошибка → 500);
- `GET /api/admin/sc-history?user_id=` → `isAdmin`; не UUID → 400 «Неверный user_id»; `{ transactions }`.

- [ ] Тесты (RED): только операции этого человека, новые сверху; `limit`.
- [ ] Реализация, прогон, коммит.

### Task 6: Поиск для «Начислить SC» (`pickUsers`, `UserPicker`)

**Files:** `lib/adminSearch.ts` (+ `pickUsers`), создать `app/admin/UserPicker.tsx`; тесты — дописать
`lib/__tests__/adminSearch.test.ts`, создать `app/admin/__tests__/UserPicker.test.tsx`.

**Interfaces (Produces):**
- `pickUsers<T extends { telegram_id?: string | null; username?: string | null }>(users: T[], query, limit = 8): { matches: T[]; total: number }`
  — ищет по нику и Telegram ID (не по внутреннему UUID), без учёта регистра и @; порядок: точное
  совпадение, начало, середина;
- `type PickerUser = { id; telegram_id: string | null; name: string | null; username?: string | null; balance: number }`;
- `userLine(u)` → `@Lopata03 · Алексей · ID 1688404602 · 0 SC` (нет ника — «без ника»);
- `<UserPicker users value onChange />`.

- [ ] Тесты (RED) `pickUsers`: пустой запрос — никого; `@LOPA` → точное/начало/середина по порядку;
  часть ID; UUID не ищется; `limit` и `total`.
  `UserPicker`: пусто — нет вариантов; часть ника — строки с ID и балансом; часть ID; клик выбирает
  («✅ Выбран: …»), «сменить» сбрасывает; Enter — первый; «Никого не нашли»; «ещё N — уточните поиск».
- [ ] Реализация, прогон, коммит.

### Task 7: История в админке и сборка формы

**Files:** создать `app/admin/ScHistoryAdmin.tsx`, тест `app/admin/__tests__/ScHistoryAdmin.test.tsx`;
изменить `app/admin/page.tsx`.

- [ ] Тесты (RED) `ScHistoryAdmin`: заголовок «🧾 История SC — 3 операции», `+50`/`+30`/`−50`,
  короткий номер заказа, «· вручную» только у ручной, дата по Москве, заголовок `x-admin-secret`;
  `refreshKey` — перечитывает; пусто — «Операций пока нет»; ошибка API — её текст.
- [ ] Реализация `ScHistoryAdmin`; `page.tsx`: `UserPicker` вместо `<select>`, подпись «Его увидит
  покупатель — в боте и в истории SC», галочка «Уведомить в боте» (`notify` в запросе), кнопка
  неактивна без выбранного, после успеха «✅ Начислено»/«✅ Списано», перечитать данные и историю
  (`historyKey`). Прогон, коммит.

### Task 8: Кабинет — «🧾 История SC» и `?open=sc`

**Files:** `lib/course.ts` (`cabinetFocusFromUrl` → `'sc'`), тест `lib/__tests__/course.test.ts`;
создать `app/(client)/ScHistorySection.tsx`, тест `app/(client)/__tests__/ScHistorySection.test.tsx`;
изменить `app/(client)/RoadMap.tsx`, `app/(client)/AppClient.tsx`.

- [ ] Тесты (RED): `?open=sc` → `'sc'`; раздел: нет операций — ничего; свёрнут, в заголовке число;
  раскрыт — `+30 SC`, `−50 SC`, короткий номер, дата; `forceOpen` — раскрыт сразу; `refreshKey` — перечитывает.
- [ ] Реализация: раздел на `CabinetSection` (`spor3s_sc_history_open`); `RoadMap` — сразу под
  `ScStatus` в `<div ref={scHistoryRef}>`, фокус `sc` → `forceOpen` + прокрутка (`scrollTarget` `'sc'`);
  типы фокуса в `RoadMap` и `AppClient`. Прогон, коммит.

### Task 9: Проверка и PR

- [ ] Полный прогон Jest: новые зелёные, падают только 11 старых тестов (8 легаси-наборов).
- [ ] `npx tsc --noEmit -p tsconfig.json` — нет новых ошибок в изменённых файлах; `npm run build`.
- [ ] Превью `start-isolated` (заглушки fetch): админка — поиск, выбор, история, галочка; кабинет —
  раздел и `?open=sc`, ширина телефона.
- [ ] PR, отчёт владельцу; после «мержи» — выкладка сайта и живая проверка на одноразовом пользователе.
