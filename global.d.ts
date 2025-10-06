type TelegramWebAppUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

type TelegramWebAppInitData = {
  user?: TelegramWebAppUser;
  [key: string]: any;
};

type TelegramWebApp = {
  initDataUnsafe?: TelegramWebAppInitData;
  ready?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  [key: string]: any;
};

interface TelegramWindow {
  WebApp?: TelegramWebApp;
}

declare global {
  interface Window {
    Telegram?: TelegramWindow;
  }
}

export {};

