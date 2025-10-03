export type User = {
  id: string; // UUID
  telegram_id: string; // Telegram user ID (string)
  name?: string | null;
  username?: string | null;
  // Добавьте другие поля по необходимости
}; 