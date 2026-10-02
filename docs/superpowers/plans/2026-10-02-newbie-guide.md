# Гид новичка — план

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Гид из 7 коротких уроков в кабинете. После каждого урока вопрос, верный ответ открывает следующий урок,
за прохождение +100 SC.

**Architecture:**
- **Контент и правила** — в `lib/newbieGuide.ts`: чистые данные и функции, их используют клиент и сервер.
- **Начисление** — `lib/guideServer.ts` за `app/api/guide`, повтор отсекает проверка по `sc_transactions`.
- **Интерфейс:**
  - окно `GuideModal` (портал);
  - строка в `EarnList`;
  - плашка `GuideTeaser` на главной;
  - фокус кабинета `?open=guide`.
- **Прогресс** — в `localStorage`.

**Tech Stack:** Next.js 14, React, TypeScript, Jest + RTL.

**Спека:** `docs/superpowers/specs/2026-10-02-newbie-guide-design.md`

## Global Constraints

- Тексты уроков — дословно как согласовано в чате 02.10 (короткая версия, без шкалы 🟢🟡⚪).
- Награда 100 SC (`GUIDE_REWARD_SC`), `source_type = 'newbie_guide'`, описание «Гид новичка пройден».
- Суммы в текстах — из констант: `SC_MECHANICS.weekly_survey.amount`, `SUBSCRIBE_TASK_SC`, `SC_MAX_SHARE`.
- Под уроком «БАД. Не является лекарственным средством.», у мухомора — «Рассказы участников опроса — не
  рекомендация к применению. Посоветуйтесь с врачом.»
- Без новых таблиц и SQL. Стили инлайн (Tailwind в проекте не настроен).
- Ширина: окно на весь экран, на телефоне 375 px всё в одну колонку.

---

### Task 1: Контент и правила гида — `lib/newbieGuide.ts`

**Files:** Create `lib/newbieGuide.ts`, `lib/__tests__/newbieGuide.test.ts`

**Produces:**
- `GUIDE_REWARD_SC = 100`, `GUIDE_SOURCE = 'newbie_guide'`, `GUIDE_DESCRIPTION = 'Гид новичка пройден'`.
- Тип блока:
  `type GuideBlock = { kind: 'p'; lead?: string; text?: string } | { kind: 'list'; lead?: string; items: string[]; ordered?: boolean }`.
- Тип урока:
  `interface GuideLesson { id; title; video?: { youtubeId?: string; src?: string }; blocks: GuideBlock[]; question: { text; options: string[]; correct: number; hint }; note }`.
- `GUIDE_LESSONS: GuideLesson[]` — 7 уроков.
- `checkGuideAnswers(answers: unknown): boolean`.
- `restoreGuideProgress(raw: string | null): number[]` — верные ответы по порядку, остальное отбрасывается.
- `guideStorageKey(userId: string): string` → `spor3s_guide_v1:<userId>`.

- [ ] Тесты (RED):
  - 7 уроков с уникальными id;
  - у каждого 3 варианта и верный индекс 0..2;
  - верные индексы `[1,0,2,1,2,0,1]`;
  - видео `LOAIu2viFgo` у `ezhovik` и `H4ry6oER5Cc` у `muhomor`, у остальных видео нет;
  - строка про БАД у всех уроков, кроме мухомора;
  - в тексте урока 6 — +25 SC, в уроке 7 — +30 SC и 30%;
  - `checkGuideAnswers`: верные → true; один неверный, короче, длиннее, не массив, дробные → false;
  - `restoreGuideProgress`:
    - `null`, мусор, `{}` → `[]`;
    - `[1,0,2]` → `[1,0,2]`;
    - `[1,2,2]` → `[1]` (обрезка на первом неверном);
    - больше 7 → только 7.
- [ ] Реализация, `npx jest lib/__tests__/newbieGuide.test.ts` — PASS, коммит.

### Task 2: Начисление — `lib/guideServer.ts` + `app/api/guide/route.ts`

**Files:** Create `lib/guideServer.ts`, `app/api/guide/route.ts`, `lib/__tests__/guideServer.test.ts`

**Consumes:** `GUIDE_*`, `checkGuideAnswers`; `creditSC` из `lib/referral.ts`.

**Produces:**
- `guideCompleted(userId: string): Promise<boolean>`.
- `completeGuide(userId: string, answers: unknown): Promise<{ ok: true; credited: boolean } | { ok: false; reason: 'answers' | 'user' }>`.
- `GET /api/guide?user_id=` → `{ success, completed }`.
- `POST /api/guide { user_id, answers }`:
  - 200 `{ success: true, credited, reward }`;
  - 400 — не UUID или неверные ответы;
  - 404 — пользователя нет;
  - 500 — ошибка.

- [ ] Тесты (RED, поддельная база и Telegram как в `scLedger.test.ts`):
  - статус до и после начисления;
  - неверные ответы → `reason: 'answers'`, ничего не записано;
  - неизвестный пользователь → `reason: 'user'`;
  - первое прохождение → +100 SC (`source_type newbie_guide`, описание), баланс, сообщение бота «💰 +100 SC — Гид новичка пройден»;
  - повтор → `credited: false`, одна запись.
- [ ] Реализация (`guideCompleted` — `sc_transactions` по user_id и source_type, `limit(1)`; ошибка базы → throw).
- [ ] Роут:
  - UUID-проверка как в `app/api/sc-history`;
  - GET: не UUID → `completed: false`;
  - POST: не UUID → 400, «Ответы не сходятся» → 400, «Пользователь не найден» → 404.
- [ ] Прогон, коммит.

### Task 3: Окно гида — `app/(client)/GuideModal.tsx`

**Files:** Create `app/(client)/GuideModal.tsx`, `app/(client)/__tests__/GuideModal.test.tsx`

**Consumes:** `GUIDE_LESSONS`, `restoreGuideProgress`, `guideStorageKey`, `GUIDE_REWARD_SC`; `POST /api/guide`.

**Produces:** `GuideModal({ userId, onClose, onCompleted, onOpenCatalog })` (default export).

- [ ] Тесты (RED):
  - открытие: «Урок 1 из 7», заголовок «Что такое грибные добавки», вопрос, 3 варианта, строка про БАД;
  - неверный вариант → подсказка урока и «Ещё раз» → варианты снова доступны, подсказки нет;
  - верный вариант → «✅ Верно!» и «Дальше →» → «Урок 2 из 7», iframe с `youtube-nocookie.com/embed/LOAIu2viFgo`;
  - прогресс пишется в `localStorage`;
  - сохранённые 6 верных ответов → «Урок 7 из 7»;
  - на 7-м верный ответ → «Получить 100 SC»:
    - POST `/api/guide` с `user_id` и всеми ответами;
    - `credited: true` → «🎉 Гид пройден!», «+100 SC — это 100 ₽ скидки на заказ», `onCompleted`;
    - «Подобрать курс» → `onOpenCatalog`;
  - `credited: false` → «100 SC уже начислены»;
  - сервер ответил ошибкой → «Не получилось начислить SC» и «Попробовать ещё раз» → повторный POST;
  - урок 3 — особая строка вместо «БАД…»;
  - ✕ и Escape → `onClose`.
- [ ] Реализация:
  - портал в `body`, `role="dialog"`, `aria-labelledby`;
  - блокировка прокрутки `body`;
  - `localStorage` в try/catch;
  - YouTube через `youtube-nocookie`, `src` → `<video controls playsInline>`;
  - ссылка «Не грузится? Открыть на YouTube» через `openExternal`.
- [ ] Прогон, коммит.

### Task 4: Входы — строка в «Как получить SC», плашка на главной, `?open=guide`

**Files:**
- Modify `app/(client)/EarnList.tsx`, `app/(client)/RoadMap.tsx`, `app/(client)/AppClient.tsx`, `lib/course.ts`.
- Create `app/(client)/GuideTeaser.tsx`.
- Tests: `EarnList.test.tsx`, `GuideTeaser.test.tsx`, `lib/__tests__/course.test.ts`.

**Consumes:** `GuideModal`, `GET /api/guide`.

- [ ] Тесты (RED):
  - `EarnList`: с `onOpenGuide` первая строка «Гид новичка» с подписью «+100 SC · 7 уроков, 10 минут» → клик вызывает
    `onOpenGuide`; при `guideDone` подпись «✅ +100 SC получено»; без `onOpenGuide` строки нет;
  - `GuideTeaser`:
    - не пройден → кнопка «🎓 Гид новичка: 7 уроков → +100 SC», клик → `onOpen`;
    - `completed: true` → ничего;
    - без `userId` → ничего, запроса нет;
  - `cabinetFocusFromUrl('?open=guide')` → `'guide'`.
- [ ] Реализация:
  - `EarnList`: пропсы `guideDone?`, `onOpenGuide?`;
  - `RoadMap`: `guideDone` из GET, `guideOpen`, focus `'guide'` открывает окно, `onCompleted` → `guideDone` и `refreshKey`,
    `onOpenCatalog` закрывает окно и ведёт в каталог;
  - `AppClient`: тип фокуса и `GuideTeaser` под `RaffleTeaser` на шаге 2;
  - `course.ts`: `'guide'`.
- [ ] Прогон, коммит.

### Task 5: Проверка и PR

- [ ] `npx jest` — новые зелёные, старые 11 падений в 8 наборах без изменений.
- [ ] `npx tsc --noEmit -p tsconfig.json | grep` по изменённым файлам — без новых ошибок.
- [ ] Превью `start-isolated` (подмена fetch, телефон 375 px):
  - урок 1;
  - неверный ответ;
  - урок 2 с видео;
  - урок 3;
  - финал;
  - строка в кабинете;
  - плашка на главной.
- [ ] Пуш ветки `claude/newbie-guide`, PR с описанием.
- [ ] После «мержи»:
  - выкладка вручную;
  - проверка через Cloudflare;
  - живая проверка API на одноразовом пользователе.
