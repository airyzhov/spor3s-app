// Тестировщики видят в кабинете то, что покупателям ещё не показываем: начало курса,
// еженедельные отметки состояния (+SC за отчёт) и историю прогресса. Сейчас это только
// аккаунт владельца @web3grow — по его просьбе 25.09 («хочу посмотреть все фичи»).
const GAMIFICATION_TESTERS = ['5554098114'];

export function isGamificationTester(telegramId: string | number | null | undefined): boolean {
  return GAMIFICATION_TESTERS.includes(String(telegramId ?? '').trim());
}
