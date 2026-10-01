# Кабинет одним экраном — план

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Кабинет как бонусный экран Walt: крупный баланс, карточка розыгрыша с дедлайном и одной
кнопкой, единый список «Как получить SC».

**Architecture:** Новые компоненты `BonusHero` (+ `HowItWorksModal`), `EarnList`, `ReferralPanel`;
новая раскладка `RaffleBanner`; `RoadMap` собирает экран и держит состояние подписок; `CabinetSection`
получает `openSignal`. Удаляются `ScStatus`, `TasksBanner`.

**Tech Stack:** Next.js 14, React, TypeScript, Jest + RTL.

**Спека:** `docs/superpowers/specs/2026-10-01-cabinet-bonus-screen-design.md`

## Global Constraints

- Вкладка «🎁 Кабинет», верхняя навигация и `RaffleTeaser` не меняются.
- `?open=raffle|course|sc` и переход к заданиям работают как раньше.
- Суммы: подписка +30 SC, другу 100 SC (`REFERRAL_WELCOME_SC`), тебе 5% (`REFERRAL_PERCENT`),
  покупка 1 SC за 100 ₽, отчёт +25 (`SC_MECHANICS.weekly_survey`), цель месяца +50 за 4 отчёта.
- Тексты розыгрыша и правила — из `lib/raffle.ts`.

---

### Task 1: Дедлайн розыгрыша — `raffleDaysLeftLabel` (`lib/raffle.ts`)
- [ ] Тесты (RED): 9 дней 2 часа до конца → «⏳ Ещё 10 дней»; ровно сутки → «⏳ Ещё 1 день»;
  меньше суток → «⏳ Последний день»; 2 и 5 дней — «дня»/«дней»; после конца → `null`.
- [ ] Реализация (дни = ceil(до конца / сутки)), прогон, коммит.

### Task 2: `CabinetSection.openSignal`, проброс в `ScHistorySection`
- [ ] Тесты (RED): свёрнутый раздел раскрывается при смене `openSignal`; свернул — следующий сигнал
  снова раскрывает; `ScHistorySection` раскрывается по `openSignal`.
- [ ] Реализация, прогон, коммит.

### Task 3: Баланс — `BonusHero` и `HowItWorksModal`
- [ ] Тесты (RED) `BonusHero` (переезд проверок из `ScStatus`): «130» крупно и «= 130 ₽ скидки»;
  1000 SC без заказов — «До уровня 🌿 Собиратель: ещё 1 заказ»; уровень › — окно уровней;
  «🧾 История ›» вызывает `onOpenHistory`; «Как это работает» — окно с «1 SC = 1 ₽» и способами
  заработать, «Закрыть» закрывает; приглашение (с бонусом и без), без приглашения — нет строки;
  перечитывает по `refreshKey`.
- [ ] Реализация, прогон, коммит.

### Task 4: Список — `EarnList` и `ReferralPanel`
- [ ] Тесты (RED) `EarnList`: три подписки с «+30 SC»; «Подписаться» вызывает `onOpenChannel`;
  открытый канал — «Получить +30 SC» вызывает `onClaim`; выполненная — «✅ +30», без кнопок; загрузка —
  «⏳»; «Пригласи друга» раскрывает `children` и сворачивает обратно; «Покупки» вызывает `onOpenCatalog`;
  строка отчёта только при `showCourse` и вызывает `onOpenCourse`.
- [ ] `ReferralPanel` — перенос разметки из `RoadMap` (те же тексты).
- [ ] Реализация, прогон, коммит.

### Task 5: Карточка розыгрыша — новая раскладка (`RaffleBanner`)
- [ ] Тесты (RED, переписать `RaffleBanner.test.tsx`): без клика видно «⏳ Ещё N дней», шаги и кнопку;
  нет задания — «🎯 Выполнить задание (+30 SC)» вызывает `onOpenTasks`, «Участвую» нет;
  задание есть — «✋ Участвую» → «Ты участвуешь!…», POST как раньше; участник — «👥 Пригласить друга —
  приз вырастет» копирует ссылку; «Условия ›» показывает правила призов; гость — «только через
  Telegram»; приём закрыт; итоги; ошибка сервера под кнопкой; строка на главной — как раньше.
- [ ] Реализация, прогон, коммит.

### Task 6: Сборка экрана (`RoadMap`, `AppClient`), удаление `ScStatus`/`TasksBanner`
- [ ] `RoadMap`: порядок `BonusHero` → `RaffleBanner` → `EarnList` (в `tasksRef`) → `ScHistorySection`
  → курс → привычка → заказы; состояние «открыл канал»; `onOpenHistory` = сигнал + прокрутка `sc`;
  прокрутка `raffle` тем же механизмом; `onOpenCatalog`.
- [ ] `AppClient`: `onOpenCatalog={() => setCurrentStep(2)}` с прокруткой наверх.
- [ ] Удалить `ScStatus.tsx`, `TasksBanner.tsx`, `__tests__/ScStatus.test.tsx`; `tsc` по изменённым.
- [ ] Коммит.

### Task 7: Админка — «SC клиента» после смены статуса
- [ ] `updateOrderStatus`: после PATCH перечитать `/api/admin/users-balances`. Проверка в превью.
- [ ] Коммит.

### Task 8: Проверка и PR
- [ ] Полный Jest (падают только 11 старых), `npm run build`.
- [ ] Превью на ширине телефона: экран, подписка, приглашение, «Как это работает», уровни, история,
  розыгрыш во всех состояниях, `?open=sc|raffle|course`.
- [ ] PR и отчёт владельцу; после «мержи» — выкладка сайта.
