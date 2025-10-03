// 🎮 ДЕМОНСТРАЦИЯ ГЕЙМИФИКАЦИИ spor3s-app
// Запустите в консоли браузера для интерактивного показа возможностей

console.log('🎮 ДЕМОНСТРАЦИЯ СИСТЕМЫ ГЕЙМИФИКАЦИИ spor3s-app');
console.log('===============================================');

class GamificationDemo {
  constructor() {
    this.user = {
      id: 'demo-user-123',
      name: 'Demo User',
      level: 1,
      xp: 0,
      coins: 0,
      streak: 0,
      achievements: []
    };
    
    this.currentDay = 1;
    this.weeklyProgress = [];
    this.habits = [];
    
    this.levelThresholds = [0, 100, 300, 500, 1000];
    this.levelNames = ['🌱 Новичок', '🍄 Грибник', '🌿 Знаток мицелия', '🧙‍♂️ Микотерапевт', '👑 Повелитель спор'];
  }

  // Получение текущего уровня
  getCurrentLevel() {
    for (let i = this.levelThresholds.length - 1; i >= 0; i--) {
      if (this.user.xp >= this.levelThresholds[i]) {
        return { level: i + 1, name: this.levelNames[i] };
      }
    }
    return { level: 1, name: this.levelNames[0] };
  }

  // Симуляция дня активности
  simulateDay(habitsCompleted = []) {
    console.log(`\n📅 ДЕНЬ ${this.currentDay}`);
    console.log('==============');
    
    // Базовые XP и coins за день
    let dayXP = 5; // базовые XP за активность
    let dayCoins = 0;
    
    // Добавляем XP и coins за привычки
    const habitRewards = {
      'meditation': { xp: 3, coins: 10, name: '🧘 Медитация' },
      'exercise': { xp: 4, coins: 12, name: '🏃 Зарядка' },
      'reading': { xp: 3, coins: 10, name: '📚 Чтение' },
      'water': { xp: 1, coins: 5, name: '💧 2л воды' },
      'no_social': { xp: 5, coins: 15, name: '🚫 Без соцсетей' },
      'healthy_food': { xp: 2, coins: 6, name: '🥗 Здоровая еда' }
    };
    
    console.log('✅ Базовая активность: +5 XP');
    
    // Обрабатываем выполненные привычки
    habitsCompleted.forEach(habit => {
      if (habitRewards[habit]) {
        const reward = habitRewards[habit];
        dayXP += reward.xp;
        dayCoins += reward.coins;
        console.log(`✅ ${reward.name}: +${reward.xp} XP, +${reward.coins} coins`);
      }
    });
    
    // Бонус за серию
    this.user.streak++;
    if (this.user.streak % 7 === 0) {
      dayXP += 25;
      dayCoins += 50;
      console.log(`🔥 Бонус за ${this.user.streak} дней подряд: +25 XP, +50 coins`);
      this.checkAchievement('week_streak');
    }
    
    // Обновляем статистику пользователя
    const oldLevel = this.getCurrentLevel();
    this.user.xp += dayXP;
    this.user.coins += dayCoins;
    const newLevel = this.getCurrentLevel();
    
    // Проверяем повышение уровня
    if (newLevel.level > oldLevel.level) {
      console.log(`🎉 ПОВЫШЕНИЕ УРОВНЯ! ${oldLevel.name} → ${newLevel.name}`);
      this.user.level = newLevel.level;
      this.showLevelUpAnimation(newLevel);
    }
    
    // Сохраняем прогресс дня
    this.habits.push({
      day: this.currentDay,
      habitsCompleted,
      xpEarned: dayXP,
      coinsEarned: dayCoins,
      streak: this.user.streak
    });
    
    console.log(`📊 Итоги дня: +${dayXP} XP, +${dayCoins} coins`);
    console.log(`💰 Общий баланс: ${this.user.xp} XP, ${this.user.coins} coins`);
    console.log(`🔥 Серия: ${this.user.streak} дней`);
    
    this.currentDay++;
    
    return { dayXP, dayCoins };
  }

  // Проверка достижений
  checkAchievement(type) {
    const achievements = {
      'first_day': { name: 'Первый день', icon: '🌱', condition: () => this.currentDay === 2 },
      'week_streak': { name: 'Огонек', icon: '🔥', condition: () => this.user.streak >= 7 },
      'month_streak': { name: 'Разряд', icon: '⚡', condition: () => this.user.streak >= 30 },
      'coin_collector': { name: 'Коллекционер', icon: '💰', condition: () => this.user.coins >= 100 },
      'habit_master': { name: 'Мастер привычек', icon: '🌟', condition: () => this.habits.filter(h => h.habitsCompleted.length >= 4).length >= 10 }
    };
    
    Object.keys(achievements).forEach(key => {
      const achievement = achievements[key];
      if (!this.user.achievements.includes(key) && achievement.condition()) {
        this.user.achievements.push(key);
        console.log(`🏆 ДОСТИЖЕНИЕ РАЗБЛОКИРОВАНО: ${achievement.icon} ${achievement.name}`);
        this.showAchievementAnimation(achievement);
        this.user.xp += 25; // бонус за достижение
        this.user.coins += 50;
      }
    });
  }

  // Анимация повышения уровня
  showLevelUpAnimation(level) {
    console.log(`
╔════════════════════════════════════╗
║           🎉 НОВЫЙ УРОВЕНЬ!        ║
║                                    ║
║            ${level.name}            ║
║                                    ║
║      Вы становитесь сильнее! ⚡    ║
╚════════════════════════════════════╝`);
  }

  // Анимация достижения
  showAchievementAnimation(achievement) {
    console.log(`
┌─────────────────────────────────┐
│  🏆 ДОСТИЖЕНИЕ РАЗБЛОКИРОВАНО!  │
│                                 │
│     ${achievement.icon} ${achievement.name}     │
│                                 │
│       +25 XP, +50 coins! 💎     │
└─────────────────────────────────┘`);
  }

  // Генерация Road Map
  generateRoadMap() {
    console.log('\n🗺️ ROAD MAP - ПУТЬ ГРИБНИКА');
    console.log('============================');
    
    const weeks = Math.ceil(this.currentDay / 7);
    for (let week = 1; week <= weeks; week++) {
      const weekHabits = this.habits.filter(h => h.day > (week - 1) * 7 && h.day <= week * 7);
      const weekXP = weekHabits.reduce((sum, h) => sum + h.xpEarned, 0);
      const weekCoins = weekHabits.reduce((sum, h) => sum + h.coinsEarned, 0);
      const avgHabits = weekHabits.reduce((sum, h) => sum + h.habitsCompleted.length, 0) / weekHabits.length || 0;
      
      let phase = '🌱 Адаптация';
      if (week > 4 && week <= 8) phase = '🍄 Первые ростки';
      else if (week > 8) phase = '🌿 Укрепление грибницы';
      
      console.log(`
📊 НЕДЕЛЯ ${week} (${phase})
├── XP заработано: ${weekXP}
├── Coins заработано: ${weekCoins}
├── Среднее привычек в день: ${avgHabits.toFixed(1)}
└── Активность: ${weekHabits.length}/7 дней`);
    }
  }

  // Показать статистику
  showStats() {
    const level = this.getCurrentLevel();
    const totalHabits = this.habits.reduce((sum, h) => sum + h.habitsCompleted.length, 0);
    
    console.log(`
📊 ОБЩАЯ СТАТИСТИКА
==================
👤 Пользователь: ${this.user.name}
🏆 Уровень: ${level.name} (${level.level})
⚡ Опыт: ${this.user.xp} XP
💰 Монеты: ${this.user.coins} coins
🔥 Серия: ${this.user.streak} дней
📅 Активных дней: ${this.currentDay - 1}
🌟 Привычек выполнено: ${totalHabits}
🏅 Достижений: ${this.user.achievements.length}
`);
  }

  // Демонстрация недели активности
  simulateWeek() {
    console.log('\n🎬 СИМУЛЯЦИЯ НЕДЕЛИ АКТИВНОГО ПОЛЬЗОВАТЕЛЯ');
    console.log('==========================================');
    
    const weekSchedule = [
      ['meditation', 'water'], // Понедельник - легкий старт
      ['meditation', 'water', 'exercise'], // Вторник - добавляем спорт
      ['meditation', 'water', 'reading'], // Среда - интеллектуальный день
      ['meditation', 'water', 'exercise', 'healthy_food'], // Четверг - полный день
      ['meditation', 'water', 'no_social'], // Пятница - цифровой детокс
      ['meditation', 'water', 'exercise', 'reading', 'healthy_food'], // Суббота - максимум
      ['meditation', 'water', 'reading'] // Воскресенье - отдых
    ];
    
    weekSchedule.forEach(habits => {
      this.simulateDay(habits);
      this.checkAchievement();
    });
    
    this.generateRoadMap();
    this.showStats();
  }

  // Демонстрация месяца прогресса
  simulateMonth() {
    console.log('\n🎬 СИМУЛЯЦИЯ МЕСЯЦА ПРОГРЕССА');
    console.log('=============================');
    
    for (let week = 1; week <= 4; week++) {
      console.log(`\n--- НЕДЕЛЯ ${week} ---`);
      
      // Постепенное увеличение активности
      const baseHabits = ['meditation', 'water'];
      const additionalHabits = [
        [], // неделя 1
        ['exercise'], // неделя 2
        ['exercise', 'reading'], // неделя 3
        ['exercise', 'reading', 'healthy_food', 'no_social'] // неделя 4
      ];
      
      for (let day = 1; day <= 7; day++) {
        const habits = [...baseHabits, ...additionalHabits[week - 1]];
        // Иногда пропускаем привычки (реалистично)
        const completedHabits = habits.filter(() => Math.random() > 0.2);
        this.simulateDay(completedHabits);
        this.checkAchievement();
      }
    }
    
    this.generateRoadMap();
    this.showStats();
    this.showMilestones();
  }

  // Показать основные вехи
  showMilestones() {
    console.log('\n🎯 КЛЮЧЕВЫЕ ДОСТИЖЕНИЯ');
    console.log('=====================');
    
    this.user.achievements.forEach(achievementId => {
      const achievements = {
        'first_day': '🌱 Первый день - начало пути',
        'week_streak': '🔥 Огонек - первая неделя',
        'month_streak': '⚡ Разряд - месяц постоянства',
        'coin_collector': '💰 Коллекционер - собрал 100+ coins',
        'habit_master': '🌟 Мастер привычек - регулярная практика'
      };
      
      if (achievements[achievementId]) {
        console.log(`✅ ${achievements[achievementId]}`);
      }
    });
  }

  // Прогноз развития
  showProjection() {
    console.log('\n🔮 ПРОГНОЗ РАЗВИТИЯ НА 3 МЕСЯЦА');
    console.log('================================');
    
    const projectedXP = this.user.xp + (30 * 3 * 20); // 20 XP в день среднем
    const projectedCoins = this.user.coins + (30 * 3 * 40); // 40 coins в день
    const projectedLevel = this.levelThresholds.findIndex(threshold => projectedXP < threshold) || 5;
    
    console.log(`📊 Через 3 месяца (при текущей активности):`);
    console.log(`├── Уровень: ${this.levelNames[projectedLevel - 1]}`);
    console.log(`├── Опыт: ~${projectedXP} XP`);
    console.log(`├── Монеты: ~${projectedCoins} coins`);
    console.log(`├── Возможные достижения: Алмазная серия 💎`);
    console.log(`└── Экономия на покупках: ~${Math.floor(projectedCoins / 100) * 10}%`);
  }
}

// Создаем демо и запускаем
const demo = new GamificationDemo();

// Функции для интерактивного тестирования
window.demoDay = (habits = ['meditation', 'water']) => {
  demo.simulateDay(habits);
  demo.checkAchievement();
  demo.showStats();
};

window.demoWeek = () => demo.simulateWeek();
window.demoMonth = () => demo.simulateMonth();
window.showProjection = () => demo.showProjection();

// Автоматический запуск демонстрации
console.log('\n🚀 АВТОМАТИЧЕСКАЯ ДЕМОНСТРАЦИЯ...');
demo.simulateWeek();
demo.showProjection();

console.log('\n💡 ИНТЕРАКТИВНЫЕ КОМАНДЫ:');
console.log('========================');
console.log('demoDay([\"meditation\", \"exercise\"]) - симуляция дня с привычками');
console.log('demoWeek() - симуляция недели');
console.log('demoMonth() - симуляция месяца');
console.log('showProjection() - прогноз на 3 месяца');

console.log('\n🎯 ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ:');
console.log('demoDay([\"meditation\", \"exercise\", \"reading\"])');
console.log('demoDay([\"water\", \"no_social\", \"healthy_food\"])');

export default GamificationDemo; 