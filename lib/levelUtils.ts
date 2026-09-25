// 🎯 НОВАЯ СИСТЕМА УРОВНЕЙ SPOR3S-APP
// Обновленные утилиты для работы с уровнями и SC
import { plural } from './plural';

export interface LevelInfo {
  level: number;
  levelName: string;
  levelIcon: string;
  levelCode: string;
  progress: number;
  scToNext: number;
  nextLevel: number | null;
  nextLevelName: string | null;
  benefits: string[];
}

export interface UserLevel {
  current_level: string;
  level_code: string;
  current_sc_balance: number;
  total_sc_earned: number;
  total_sc_spent: number;
  total_orders_amount: number;
  orders_count: number;
  has_motivational_habit: boolean;
  has_expert_chat_access: boolean;
  has_permanent_discount: boolean;
  has_vip_access: boolean;
  level_achieved_at: string | null;
}

// Конфигурация уровней согласно требованиям
export const LEVEL_CONFIG = [
  {
    level: 1,
    code: 'novice',
    name: '🌱 Новичок',
    icon: '🌱',
    scRequired: 0,
    ordersAmountRequired: 0,
    ordersCountRequired: 0,
    discountPercent: 0,
    benefits: ['Доступ к базовым функциям']
  },
  {
    level: 2,
    code: 'collector',
    name: '🌿 Собиратель',
    icon: '🌿',
    scRequired: 100,
    ordersAmountRequired: 0,
    ordersCountRequired: 1,
    discountPercent: 0,
    benefits: ['Открытие мотивационной привычки']
  },
  {
    level: 3,
    code: 'expert',
    name: '🌳 Эксперт',
    icon: '🌳',
    scRequired: 300,
    ordersAmountRequired: 5000,
    ordersCountRequired: 0,
    // Чата экспертов не будет — решение владельца 24.09: только ежемесячные розыгрыши
    discountPercent: 0,
    benefits: ['Ежемесячные закрытые розыгрыши']
  },
  {
    level: 4,
    code: 'master',
    name: '👑 Мастер',
    icon: '👑',
    scRequired: 600,
    ordersAmountRequired: 10000,
    ordersCountRequired: 0,
    // Скидка на любой заказ (решение владельца 25.09); считает lib/orderPricing.ts, текст должен совпадать
    discountPercent: 5,
    benefits: ['5% скидка на любой заказ', 'Наборы для практик: травы, благовония, чай']
  },
  {
    level: 5,
    code: 'legend',
    name: '🌟 Легенда',
    icon: '🌟',
    scRequired: 1000,
    ordersAmountRequired: 20000,
    ordersCountRequired: 0,
    discountPercent: 10,
    benefits: ['10% скидка на любой заказ', 'Мерч от бренда', 'Личные встречи', 'Живой трекинг']
  }
];
// benefits — только то, что уровень добавляет: награды прошлых уровней сохраняются.
// ЕДИНСТВЕННЫЙ источник уровней. Шкала согласована с UI (RoadMap.levelRewards):
// 0 / 100 / 300 / 600 / 1000 SC. Уровень считается от total_sc_earned
// (заработано за всё время), а не от текущего баланса — при трате SC уровень не падает.

// Механика начисления SC (дневной чек-ин убран — механика заменена на еженедельный отчёт)
export const SC_MECHANICS = {
  weekly_survey: { amount: 25, maxPerMonth: 100, description: 'Еженедельный отчёт' },
  month_goal: { amount: 50, maxPerMonth: 50, description: 'Цель месяца — 4 отчёта' },
  motivational_habit: { amount: 25, maxPerMonth: 100, description: 'Мотивационная привычка' }
};

// Доля от суммы заказа друга, зачисляемая пригласившему в виде SC-кэшбэка.
export const REFERRAL_PERCENT = 0.05;

export function getLevelInfo(sc: number, ordersAmount: number = 0, ordersCount: number = 0): LevelInfo {
  // Находим текущий уровень
  let currentLevel = LEVEL_CONFIG[0];
  let nextLevel = null;
  
  for (let i = 0; i < LEVEL_CONFIG.length; i++) {
    const level = LEVEL_CONFIG[i];
    if (sc >= level.scRequired && 
        ordersAmount >= level.ordersAmountRequired && 
        ordersCount >= level.ordersCountRequired) {
      currentLevel = level;
      nextLevel = LEVEL_CONFIG[i + 1] || null;
    } else {
      nextLevel = level;
      break;
    }
  }
  
  // Рассчитываем прогресс
  let progress = 0;
  let scToNext = 0;
  
  if (nextLevel) {
    const currentThreshold = currentLevel.scRequired;
    const nextThreshold = nextLevel.scRequired;
    progress = (sc - currentThreshold) / (nextThreshold - currentThreshold);
    scToNext = nextThreshold - sc;
  } else {
    progress = 1;
    scToNext = 0;
  }
  
  return {
    level: currentLevel.level,
    levelName: currentLevel.name,
    levelIcon: currentLevel.icon,
    levelCode: currentLevel.code,
    progress: Math.max(0, Math.min(1, progress)),
    scToNext,
    nextLevel: nextLevel?.level || null,
    nextLevelName: nextLevel?.name || null,
    benefits: currentLevel.benefits
  };
}

// Чего не хватает до следующего уровня. Уровень требует и SC, и заказов: с 1000 SC,
// но без заказов человек остаётся Новичком — тогда sc = 0, а ordersCount = 1.
// null — уровень максимальный.
export interface LevelNeeds {
  name: string;
  sc: number;
  ordersAmount: number;
  ordersCount: number;
}

export function nextLevelNeeds(sc: number, ordersAmount: number = 0, ordersCount: number = 0): LevelNeeds | null {
  const info = getLevelInfo(sc, ordersAmount, ordersCount);
  const next = LEVEL_CONFIG.find(l => l.level === info.nextLevel);
  if (!next) return null;
  return {
    name: next.name,
    sc: Math.max(0, next.scRequired - sc),
    ordersAmount: Math.max(0, next.ordersAmountRequired - ordersAmount),
    ordersCount: Math.max(0, next.ordersCountRequired - ordersCount),
  };
}

// «200 SC и заказы на 5 000 ₽» — для строки «До уровня …: ещё …»
export function levelNeedsText(needs: LevelNeeds): string {
  const parts: string[] = [];
  if (needs.sc > 0) parts.push(`${needs.sc} SC`);
  if (needs.ordersCount > 0) parts.push(`${needs.ordersCount} ${plural(needs.ordersCount, 'заказ', 'заказа', 'заказов')}`);
  if (needs.ordersAmount > 0) parts.push(`заказы на ${formatOrderAmount(needs.ordersAmount)}`);
  return parts.join(' и ');
}

// Требования уровня одной строкой: «300 SC · заказы от 5 000 ₽»; первый уровень — «с первого входа»
export function levelRequirementText(level: (typeof LEVEL_CONFIG)[number]): string {
  const parts: string[] = [];
  if (level.scRequired > 0) parts.push(`${level.scRequired} SC`);
  if (level.ordersCountRequired > 0) parts.push(`${level.ordersCountRequired} ${plural(level.ordersCountRequired, 'заказ', 'заказа', 'заказов')}`);
  if (level.ordersAmountRequired > 0) parts.push(`заказы от ${formatOrderAmount(level.ordersAmountRequired)}`);
  return parts.length ? parts.join(' · ') : 'с первого входа';
}

// Потолок регулярного заработка за месяц: 4 отчёта + бонус цели месяца + 4 привычки.
export function calculateMonthlySC(activeWeeks: number = 4): number {
  const weeks = Math.max(0, Math.min(activeWeeks, 4));
  const weeklySurveys = SC_MECHANICS.weekly_survey.amount * weeks;
  const monthGoal = weeks >= 4 ? SC_MECHANICS.month_goal.amount : 0;
  const motivationalHabits = SC_MECHANICS.motivational_habit.amount * weeks;

  return weeklySurveys + monthGoal + motivationalHabits;
}

export function getLevelBenefits(levelCode: string): string[] {
  const level = LEVEL_CONFIG.find(l => l.code === levelCode);
  return level?.benefits || [];
}

export function canAccessMotivationalHabit(userLevel: UserLevel): boolean {
  return userLevel.has_motivational_habit;
}

export function getDiscountPercentage(userLevel: UserLevel): number {
  if (userLevel.has_vip_access) return 10; // Легенда и выше
  if (userLevel.has_permanent_discount) return 5; // Мастер
  return 0;
}

export function formatSCAmount(amount: number): string {
  return `${amount} SC`;
}

export function formatOrderAmount(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0
  }).format(amount);
}

// Функция для расчета времени до следующего уровня
export function estimateTimeToNextLevel(currentSC: number, monthlySC: number): string {
  const levelInfo = getLevelInfo(currentSC);
  if (!levelInfo.nextLevel || levelInfo.scToNext <= 0) {
    return 'Максимальный уровень достигнут';
  }
  
  const months = Math.ceil(levelInfo.scToNext / monthlySC);
  
  if (months <= 1) {
    return 'Менее месяца';
  } else if (months <= 3) {
    return `${months} месяца`;
  } else {
    return `${months} месяцев`;
  }
}

// Функция для проверки достижения нового уровня
export function checkLevelUp(oldLevel: UserLevel, newLevel: UserLevel): boolean {
  return oldLevel.level_code !== newLevel.level_code;
}

// Функция для получения мотивационного сообщения
export function getMotivationalMessage(userLevel: UserLevel, scToNext: number): string {
  const messages = [
    `Продолжайте в том же духе! До следующего уровня осталось ${scToNext} SC`,
    `Отличная работа! Вы на пути к новым достижениям`,
    `Каждый день - шаг к вашей цели. Продолжайте!`,
    `Ваша настойчивость впечатляет! Не останавливайтесь`,
    `Вы показываете отличные результаты! Так держать!`
  ];
  
  return messages[Math.floor(Math.random() * messages.length)];
} 