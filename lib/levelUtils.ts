// 🎯 НОВАЯ СИСТЕМА УРОВНЕЙ SPOR3S-APP
// Обновленные утилиты для работы с уровнями и SC

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
    benefits: ['Доступ к базовым функциям']
  },
  {
    level: 2,
    code: 'mushroom_picker',
    name: '🍄 Грибник',
    icon: '🍄',
    scRequired: 20,
    ordersAmountRequired: 0,
    ordersCountRequired: 0,
    benefits: ['Доступ к базовым функциям']
  },
  {
    level: 3,
    code: 'collector',
    name: '🌿 Собиратель',
    icon: '🌿',
    scRequired: 100,
    ordersAmountRequired: 0,
    ordersCountRequired: 1,
    benefits: ['Открытие мотивационной привычки', 'Доступ к базовым функциям']
  },
  {
    level: 4,
    code: 'expert',
    name: '🌳 Эксперт',
    icon: '🌳',
    scRequired: 300,
    ordersAmountRequired: 5000,
    ordersCountRequired: 0,
    benefits: ['Доступ к закрытому чату с экспертами', 'Участие в розыгрышах', 'Доступ к базовым функциям']
  },
  {
    level: 5,
    code: 'master',
    name: '👑 Мастер',
    icon: '👑',
    scRequired: 600,
    ordersAmountRequired: 10000,
    ordersCountRequired: 0,
    benefits: ['Постоянная 5% скидка', 'Доступ к наборам для практик', 'Доступ к базовым функциям']
  },
  {
    level: 6,
    code: 'legend',
    name: '🌟 Легенда',
    icon: '🌟',
    scRequired: 1000,
    ordersAmountRequired: 20000,
    ordersCountRequired: 0,
    benefits: ['10% скидка навсегда', 'Мерч', 'Личные встречи', 'Живой трекинг', 'Доступ к базовым функциям']
  }
];
// ЕДИНСТВЕННЫЙ источник уровней. Шкала согласована с UI (RoadMap.levelRewards):
// 0 / 20 / 100 / 300 / 600 / 1000 SC. Уровень считается от total_sc_earned
// (заработано за всё время), а не от текущего баланса — при трате SC уровень не падает.

// Механика начисления SC
export const SC_MECHANICS = {
  daily_checkin: { amount: 3, maxPerMonth: 90, description: 'Ежедневный чек-ин' },
  weekly_survey: { amount: 25, maxPerMonth: 100, description: 'Еженедельная самооценка' },
  motivational_habit: { amount: 25, maxPerMonth: 100, description: 'Мотивационная привычка' }
};

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

export function calculateMonthlySC(activeDays: number = 30): number {
  const dailyCheckin = SC_MECHANICS.daily_checkin.amount * Math.min(activeDays, 30);
  const weeklySurveys = SC_MECHANICS.weekly_survey.amount * Math.min(Math.floor(activeDays / 7), 4);
  const motivationalHabits = SC_MECHANICS.motivational_habit.amount * Math.min(Math.floor(activeDays / 7), 4);
  
  return dailyCheckin + weeklySurveys + motivationalHabits;
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