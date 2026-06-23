"use client";
import { useState, useEffect, useRef } from "react";
import MotivationalHabit from "../../components/MotivationalHabit";

interface Metrics {
  memory: number;
  sleep: number;
  energy: number;
  stress: number;
}

interface WeekProgress {
  week: number;
  date: string;
  metrics: Metrics;
  notes: string;
  achievements: string[];
  extraHabits: number;
}

interface RoadMapProps {
  user: any;
}

// Обновленные награды для каждого уровня с актуальными SC
const levelRewards = [
  { level: 1, name: "🌱 Новичок", scRequired: 0, reward: "Доступ к базовым функциям", description: "Начальный уровень. Получите доступ к AI консультанту и базовому каталогу продуктов." },
  { level: 2, name: "🍄 Грибник", scRequired: 20, reward: "Бонусы и преимущества", description: "Доступ к расширенным функциям приложения и бонусным возможностям." },
  { level: 3, name: "🌿 Собиратель", scRequired: 100, reward: "Мотивационная привычка", description: "Открывается возможность мотивационной привычки для отслеживания прогресса." },
  { level: 4, name: "🌳 Эксперт", scRequired: 300, reward: "Закрытый чат экспертов", description: "Заказ от 5000₽ - доступ к закрытому чату с другими экспертами и практиками, участие в закрытых розыгрышах." },
  { level: 5, name: "👑 Мастер", scRequired: 600, reward: "Персональные наборы", description: "Заказ от 10000₽ - 5% скидка всегда, доступ к персональным наборам для практик (травы, благовония, чай)." },
  { level: 6, name: "🌟 Легенда", scRequired: 1000, reward: "Максимальные привилегии", description: "Заказ от 20000₽ - 10% скидка всегда, мерч от бренда, личные встречи, живой трекинг." }
];

export default function RoadMap({ user }: RoadMapProps) {
  const [currentWeek, setCurrentWeek] = useState(1);
  const [startMetrics, setStartMetrics] = useState<Metrics>({ memory: 5, sleep: 4, energy: 3, stress: 7 });
  const [weeklyProgress, setWeeklyProgress] = useState<WeekProgress[]>([]);
  const [showStartAssessment, setShowStartAssessment] = useState(true);
  const [todayMetrics, setTodayMetrics] = useState<Metrics>({ memory: 5, sleep: 5, energy: 5, stress: 5 });
  const [weeklyObservations, setWeeklyObservations] = useState("");
  const [currentSC, setCurrentSC] = useState(0);
  const [referralSC, setReferralSC] = useState(0);

  const [subscribeLoading, setSubscribeLoading] = useState<string | null>(null);
  const [subscribeSuccess, setSubscribeSuccess] = useState<string | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showLevels, setShowLevels] = useState(false);
  
  // Новые состояния для курса и рефералов
  const [courseStarted, setCourseStarted] = useState(false);
  const [courseDuration, setCourseDuration] = useState<number | null>(null);
  const [courseStartDate, setCourseStartDate] = useState<string | null>(null);
  const [startCourseLoading, setStartCourseLoading] = useState(false);
  const [referralStats, setReferralStats] = useState<any>(null);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [referralBonus, setReferralBonus] = useState(0);
  const [invitedCount, setInvitedCount] = useState(0);

  // Симуляция данных для демонстрации
  useEffect(() => {
    // Генерируем прогресс за несколько недель
    const mockProgress: WeekProgress[] = [
      {
        week: 1,
        date: "2024-01-01",
        metrics: { memory: 5, sleep: 5, energy: 4, stress: 6 },
        notes: "Начал прием мухомора. Лёгкое покалывание в первые дни.",
        achievements: ["Первый день", "Неделя адаптации"],
        extraHabits: 12
      },
      {
        week: 2,
        date: "2024-01-08", 
        metrics: { memory: 6, sleep: 6, energy: 5, stress: 5 },
        notes: "Сон стал немного лучше. Меньше тревожности.",
        achievements: ["7 дней подряд"],
        extraHabits: 18
      },
      {
        week: 3,
        date: "2024-01-15",
        metrics: { memory: 7, sleep: 7, energy: 6, stress: 4 },
        notes: "Заметил улучшение концентрации на работе!",
        achievements: ["Первые ростки", "Мудрец"],
        extraHabits: 25
      }
    ];
    setWeeklyProgress(mockProgress);
    setCurrentWeek(4);
    if (mockProgress.length > 0) {
      setShowStartAssessment(false);
    }
  }, []);

  const handleStartAssessment = () => {
    setShowStartAssessment(false);
    // Здесь можно отправить startMetrics в API
  };

  const saveWeeklyProgress = () => {
    const newProgress: WeekProgress = {
      week: currentWeek,
      date: new Date().toISOString().split('T')[0],
      metrics: todayMetrics,
      notes: weeklyObservations,
      achievements: ["Активный грибник"],
      extraHabits: 0 // Убираем подсчет привычек
    };
    setWeeklyProgress([...weeklyProgress, newProgress]);
    setCurrentWeek(currentWeek + 1);
    setWeeklyObservations(""); // Reset observations after saving
  };

  const getProgressPhase = (week: number) => {
    if (week <= 4) return { name: "🌱 Адаптация", color: "#4ade80" };
    if (week <= 8) return { name: "🍄 Первые ростки", color: "#f97316" };
    if (week <= 12) return { name: "🌿 Укрепление грибницы", color: "#8b5cf6" };
    return { name: "👑 Мастерство", color: "#fbbf24" };
  };

  const calculateImprovement = (metric: keyof Metrics) => {
    if (weeklyProgress.length === 0) return 0;
    const latest = weeklyProgress[weeklyProgress.length - 1].metrics[metric];
    const first = weeklyProgress[0].metrics[metric];
    return latest - first;
  };

  const getCurrentLevel = () => {
    for (let i = levelRewards.length - 1; i >= 0; i--) {
      if (currentSC >= levelRewards[i].scRequired) {
        return levelRewards[i];
      }
    }
    return levelRewards[0];
  };

  const getNextLevel = () => {
    const current = getCurrentLevel();
    const nextIndex = levelRewards.findIndex(level => level.level === current.level) + 1;
    return nextIndex < levelRewards.length ? levelRewards[nextIndex] : null;
  };

  const currentLevel = getCurrentLevel();
  const nextLevel = getNextLevel();
  const progressToNext = nextLevel ? ((currentSC - currentLevel.scRequired) / (nextLevel.scRequired - currentLevel.scRequired)) * 100 : 0;

  const handleSubscribe = async (channelType: 'telegram' | 'youtube') => {
    if (!user?.id) return;
    
    setSubscribeLoading(channelType);
    try {
      const response = await fetch('/api/subscribe-bonus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, channel_type: channelType })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSubscribeSuccess(channelType);
        // Обновляем баланс SC
        setCurrentSC(prev => prev + data.bonus);
        
        // Показываем красивое уведомление об успехе
        const notification = document.createElement('div');
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: linear-gradient(45deg, #10b981, #059669);
          color: white;
          padding: 20px 25px;
          border-radius: 15px;
          font-weight: 600;
          z-index: 10000;
          box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
          animation: slideInRight 0.4s ease-out;
          max-width: 350px;
          font-size: 16px;
        `;
        notification.innerHTML = `
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 24px;">🎉</div>
            <div>
              <div style="font-weight: 700; margin-bottom: 4px;">Бонус получен!</div>
              <div style="font-size: 14px; opacity: 0.9;">+${data.bonus} SC за подписку на ${channelType === 'telegram' ? 'Telegram' : 'YouTube'}</div>
            </div>
          </div>
        `;
        document.body.appendChild(notification);
        
        // Удаляем уведомление через 4 секунды
        setTimeout(() => {
          notification.style.animation = 'slideOutRight 0.4s ease-out';
          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
          }, 400);
        }, 4000);
        
      } else {
        // Если бонус уже получен, обновляем состояние
        if (data.error && data.error.includes('уже получен')) {
          setSubscribeSuccess(channelType);
        }
        
        // Показываем уведомление об ошибке
        const errorNotification = document.createElement('div');
        errorNotification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: linear-gradient(45deg, #ef4444, #dc2626);
          color: white;
          padding: 20px 25px;
          border-radius: 15px;
          font-weight: 600;
          z-index: 10000;
          box-shadow: 0 8px 25px rgba(239, 68, 68, 0.3);
          animation: slideInRight 0.4s ease-out;
          max-width: 350px;
          font-size: 16px;
        `;
        errorNotification.innerHTML = `
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 24px;">⚠️</div>
            <div>
              <div style="font-weight: 700; margin-bottom: 4px;">Ошибка</div>
              <div style="font-size: 14px; opacity: 0.9;">${data.error || 'Не удалось получить бонус'}</div>
            </div>
          </div>
        `;
        document.body.appendChild(errorNotification);
        
        // Удаляем уведомление через 4 секунды
        setTimeout(() => {
          errorNotification.style.animation = 'slideOutRight 0.4s ease-out';
          setTimeout(() => {
            if (errorNotification.parentNode) {
              errorNotification.parentNode.removeChild(errorNotification);
            }
          }, 400);
        }, 4000);
      }
    } catch (error) {
      console.error('Subscribe error:', error);
      
      // Показываем уведомление об ошибке сети
      const networkErrorNotification = document.createElement('div');
      networkErrorNotification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(45deg, #f59e0b, #d97706);
        color: white;
        padding: 20px 25px;
        border-radius: 15px;
        font-weight: 600;
        z-index: 10000;
        box-shadow: 0 8px 25px rgba(245, 158, 11, 0.3);
        animation: slideInRight 0.4s ease-out;
        max-width: 350px;
        font-size: 16px;
      `;
      networkErrorNotification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="font-size: 24px;">🌐</div>
          <div>
            <div style="font-weight: 700; margin-bottom: 4px;">Ошибка сети</div>
            <div style="font-size: 14px; opacity: 0.9;">Проверьте подключение к интернету</div>
          </div>
        </div>
      `;
      document.body.appendChild(networkErrorNotification);
      
      // Удаляем уведомление через 4 секунды
      setTimeout(() => {
        networkErrorNotification.style.animation = 'slideOutRight 0.4s ease-out';
        setTimeout(() => {
          if (networkErrorNotification.parentNode) {
            networkErrorNotification.parentNode.removeChild(networkErrorNotification);
          }
        }, 400);
      }, 4000);
    } finally {
      setSubscribeLoading(null);
    }
  };

  // Функция для начала курса
  const handleStartCourse = async (duration: number) => {
    if (!user?.id) return;
    
    setStartCourseLoading(true);
    try {
      const response = await fetch('/api/start-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: user.id, 
          course_duration: duration.toString() 
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCourseStarted(true);
        setCourseDuration(duration);
        setCourseStartDate(new Date().toISOString());
        alert(data.message);
      } else {
        if (data.requiresOrder) {
          alert('Для начала отслеживания курса необходимо оформить заказ. Перейдите в каталог и добавьте товары в корзину.');
        } else {
          alert(data.error || 'Ошибка начала курса');
        }
      }
    } catch (error) {
      console.error('Start course error:', error);
      alert('Ошибка начала курса');
    } finally {
      setStartCourseLoading(false);
    }
  };

  // Функция для получения реферальной статистики
  const fetchReferralStats = async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`/api/referral-stats?user_id=${user.id}`);
      const data = await response.json();
      
      if (data.success) {
        setReferralStats(data.stats);
        setReferralCode(data.stats.referralCode);
        setReferralBonus(data.stats.cashbackAmount);
        setInvitedCount(data.stats.totalReferrals);
      }
    } catch (error) {
      console.error('Fetch referral stats error:', error);
    }
  };

  // Функция для копирования реферального кода
  const copyReferralCode = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      alert('Реферальный код скопирован!');
    }
  };

  // Функция для проверки уже полученных бонусов подписки
  const checkSubscriptionBonuses = async () => {
    if (!user?.id) return;
    
    try {
      // Проверяем Telegram подписку
      const telegramResponse = await fetch('/api/check-subscription-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, channel_type: 'telegram' })
      });
      
      if (telegramResponse.ok) {
        const telegramData = await telegramResponse.json();
        if (telegramData.hasReceivedBonus) {
          setSubscribeSuccess('telegram');
        }
      }
      
      // Проверяем YouTube подписку
      const youtubeResponse = await fetch('/api/check-subscription-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, channel_type: 'youtube' })
      });
      
      if (youtubeResponse.ok) {
        const youtubeData = await youtubeResponse.json();
        if (youtubeData.hasReceivedBonus) {
          setSubscribeSuccess('youtube');
        }
      }
    } catch (error) {
      console.error('Check subscription bonuses error:', error);
    }
  };

  // Загружаем данные при монтировании компонента
  useEffect(() => {
    if (user?.id) {
      fetchReferralStats();
      checkSubscriptionBonuses();
    }
  }, [user?.id]);

  if (showStartAssessment) {
    return (
      <div style={{ 
        maxWidth: "800px", 
        margin: "0 auto", 
        padding: "20px",
        color: "#fff"
      }}>
        <div style={{
          background: "linear-gradient(135deg, #0f172a, #1e293b)",
          borderRadius: "20px",
          padding: "30px",
          border: "2px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)"
        }}>
          <h2 style={{ textAlign: "center", color: "#fff", fontSize: "24px", marginBottom: "30px" }}>
            📊 Ваш прогресс
          </h2>
          
          <div style={{ color: "#fff", marginBottom: "30px" }}>
            <h3 style={{ color: "#ff00cc", marginBottom: "20px" }}>📋 Точка А - Откуда начинаем?</h3>
            <p style={{ color: "#ccc", marginBottom: "20px" }}>
              Оцените ваше текущее состояние по шкале от 1 до 10:
            </p>
            
            {Object.entries(startMetrics).map(([key, value]) => (
              <div key={key} style={{ marginBottom: "20px" }}>
                <label style={{ 
                  display: "block", 
                  marginBottom: "8px", 
                  fontSize: "16px",
                  color: "#fff"
                }}>
                  {key === 'memory' && '🧠 Память и концентрация'}
                  {key === 'sleep' && '😴 Качество сна'}
                  {key === 'energy' && '⚡ Уровень энергии'}
                  {key === 'stress' && '😌 Стрессоустойчивость'}
                </label>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={value}
                    onChange={(e) => setStartMetrics({
                      ...startMetrics,
                      [key]: parseInt(e.target.value)
                    })}
                    style={{ flex: 1, height: "8px" }}
                  />
                  <span style={{ 
                    background: value > 7 ? "#10b981" : value > 4 ? "#f59e0b" : "#ef4444",
                    color: "white",
                    padding: "4px 12px",
                    borderRadius: "12px",
                    fontWeight: "bold",
                    minWidth: "40px",
                    textAlign: "center"
                  }}>
                    {value}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleStartAssessment}
            style={{
              background: "linear-gradient(45deg, #ff00cc, #3333ff)",
              color: "white",
              border: "none",
              borderRadius: "12px",
              padding: "15px 30px",
              fontSize: "18px",
              fontWeight: "bold",
              cursor: "pointer",
              width: "100%",
              transition: "transform 0.2s"
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.02)"}
            onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            🚀 Начать путешествие
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      maxWidth: "1000px", 
      margin: "0 auto", 
      padding: "clamp(10px, 3vw, 20px)",
      overflowX: "hidden",
      width: "100%",
      boxSizing: "border-box"
    }}>
      {/* Информация о пользователе - компактная версия */}
      <div style={{
        background: "linear-gradient(135deg, rgba(255, 0, 204, 0.1), rgba(51, 51, 255, 0.1))",
        borderRadius: 16,
        padding: "clamp(15px, 4vw, 20px)",
        marginBottom: 25,
        border: "2px solid #ff00cc",
        textAlign: "center",
        width: "100%",
        boxSizing: "border-box",
        overflow: "hidden"
      }}>
        <div style={{ 
          fontSize: "clamp(12px, 3vw, 14px)", 
          color: "#ccc",
          marginBottom: 10,
          fontFamily: "monospace",
          wordBreak: "break-word"
        }}>
          ID: {user?.telegram_username || user?.telegram_id || (user?.id ? user.id.slice(0, 8) + '...' + user.id.slice(-4) : 'Loading...')}
        </div>
        
        {/* Компактное отображение коинов */}
        <div style={{
          display: "flex",
          gap: "clamp(10px, 2vw, 15px)",
          justifyContent: "center",
          flexWrap: "wrap",
          marginTop: "10px",
          width: "100%"
        }}>
          <div style={{ 
            background: "linear-gradient(45deg, #ff00cc, #3333ff)",
            color: "white",
            padding: "clamp(8px, 2vw, 10px) clamp(15px, 3vw, 20px)",
            borderRadius: "15px",
            fontSize: "clamp(14px, 3.5vw, 18px)",
            fontWeight: "bold",
            display: "inline-block",
            whiteSpace: "nowrap"
          }}>
            💰 {currentSC} SC
          </div>
          <div style={{ 
            background: "linear-gradient(45deg, #10b981, #059669)",
            color: "white",
            padding: "clamp(8px, 2vw, 10px) clamp(15px, 3vw, 20px)",
            borderRadius: "15px",
            fontSize: "clamp(14px, 3.5vw, 18px)",
            fontWeight: "bold",
            display: "inline-block",
            whiteSpace: "nowrap"
          }}>
            🎁 {referralSC} Реф.
          </div>
        </div>
      </div>

      {/* Информация о начале курса */}
      <div style={{
        background: "linear-gradient(135deg, rgba(255, 193, 7, 0.1), rgba(255, 152, 0, 0.1))",
        borderRadius: "20px",
        padding: "clamp(20px, 5vw, 25px)",
        marginBottom: "30px",
        border: "2px solid #ffc107",
        textAlign: "center",
        width: "100%",
        boxSizing: "border-box",
        overflow: "hidden"
      }}>
        <div style={{
          fontSize: "clamp(18px, 4.5vw, 20px)",
          fontWeight: "bold",
          color: "#ffc107",
          marginBottom: "15px",
          wordBreak: "break-word"
        }}>
          📅 Начало курса
        </div>
        <div style={{
          color: "#fff",
          fontSize: "clamp(14px, 3.5vw, 16px)",
          lineHeight: "1.5",
          marginBottom: "20px",
          wordBreak: "break-word"
        }}>
          Чтобы отслеживать ваше состояние и прогресс включите отслеживание в 1 день приема курса и выберите функцию 1, 3 или 6 месяцев
        </div>
        
        {!courseStarted ? (
          <div style={{
            display: "flex",
            gap: "10px",
            justifyContent: "center",
            flexWrap: "wrap",
            width: "100%"
          }}>
            {[1, 3, 6].map((duration) => (
              <button
                key={duration}
                onClick={() => handleStartCourse(duration)}
                disabled={startCourseLoading}
                style={{
                  background: startCourseLoading 
                    ? "rgba(255, 255, 255, 0.3)" 
                    : "linear-gradient(45deg, #ffc107, #ff9800)",
                  color: "white",
                  border: "none",
                  borderRadius: "12px",
                  padding: "clamp(10px, 2.5vw, 12px) clamp(15px, 3.5vw, 20px)",
                  fontSize: "clamp(14px, 3.5vw, 16px)",
                  fontWeight: "bold",
                  cursor: startCourseLoading ? "not-allowed" : "pointer",
                  transition: "transform 0.2s",
                  opacity: startCourseLoading ? 0.6 : 1,
                  whiteSpace: "nowrap"
                }}
                onMouseOver={(e) => {
                  if (!startCourseLoading) {
                    e.currentTarget.style.transform = "scale(1.05)";
                  }
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                {startCourseLoading ? "⏳" : `${duration} мес.`}
              </button>
            ))}
          </div>
        ) : (
          <div style={{
            background: "rgba(255, 255, 255, 0.1)",
            borderRadius: "12px",
            padding: "15px",
            marginTop: "15px",
            width: "100%",
            boxSizing: "border-box"
          }}>
            <div style={{ fontSize: "clamp(12px, 3vw, 14px)", color: "#ffc107", fontWeight: "bold", marginBottom: "8px" }}>
              ✅ Курс начат
            </div>
            <div style={{ fontSize: "clamp(10px, 2.5vw, 12px)", color: "#fff" }}>
              Длительность: {courseDuration} месяц(ев)
              {courseStartDate && (
                <div style={{ marginTop: "5px", fontSize: "clamp(9px, 2.5vw, 11px)", color: "#ccc" }}>
                  Дата начала: {new Date(courseStartDate).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Реферальная система */}
      <div style={{
        background: "linear-gradient(135deg, rgba(255, 0, 204, 0.1), rgba(51, 51, 255, 0.1))",
        borderRadius: "20px",
        padding: "clamp(20px, 5vw, 25px)",
        marginBottom: "30px",
        border: "2px solid #ff00cc",
        textAlign: "center",
        width: "100%",
        boxSizing: "border-box",
        overflow: "hidden"
      }}>
        <div style={{
          fontSize: "clamp(18px, 4.5vw, 20px)",
          fontWeight: "bold",
          color: "#ff00cc",
          marginBottom: "15px",
          wordBreak: "break-word"
        }}>
          🎁 Реферальная система
        </div>
        <div style={{
          color: "#fff",
          fontSize: "clamp(14px, 3.5vw, 16px)",
          lineHeight: "1.5",
          marginBottom: "20px",
          wordBreak: "break-word"
        }}>
          Получай 5% от заказов друзей, они получат приветственные 100SC
        </div>
        
        {referralCode && (
          <div style={{
            background: "rgba(255, 255, 255, 0.1)",
            borderRadius: "12px",
            padding: "15px",
            marginBottom: "15px",
            width: "100%",
            boxSizing: "border-box"
          }}>
            <div style={{ fontSize: "clamp(12px, 3vw, 14px)", color: "#fff", marginBottom: "10px" }}>
              Ваш реферальный код:
            </div>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              flexWrap: "wrap"
            }}>
              <div style={{
                background: "rgba(255, 255, 255, 0.2)",
                padding: "8px 15px",
                borderRadius: "8px",
                fontSize: "clamp(14px, 3.5vw, 16px)",
                fontWeight: "bold",
                color: "#ff00cc",
                fontFamily: "monospace",
                wordBreak: "break-all"
              }}>
                {referralCode}
              </div>
              <button
                onClick={copyReferralCode}
                style={{
                  background: "#ff00cc",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  fontSize: "clamp(12px, 3vw, 14px)",
                  cursor: "pointer",
                  transition: "transform 0.2s",
                  whiteSpace: "nowrap"
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
              >
                📋
              </button>
            </div>
          </div>
        )}
        
        {/* Статистика рефералов */}
        {referralStats && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: "10px",
            marginTop: "15px",
            width: "100%"
          }}>
            <div style={{
              background: "rgba(255, 255, 255, 0.1)",
              borderRadius: "8px",
              padding: "10px",
              textAlign: "center",
              boxSizing: "border-box"
            }}>
              <div style={{ fontSize: "clamp(10px, 2.5vw, 12px)", color: "#ccc", marginBottom: "5px" }}>
                Приглашено
              </div>
              <div style={{ fontSize: "clamp(16px, 4vw, 18px)", fontWeight: "bold", color: "#ff00cc" }}>
                {invitedCount}
              </div>
            </div>
            
            <div style={{
              background: "rgba(255, 255, 255, 0.1)",
              borderRadius: "8px",
              padding: "10px",
              textAlign: "center",
              boxSizing: "border-box"
            }}>
              <div style={{ fontSize: "clamp(10px, 2.5vw, 12px)", color: "#ccc", marginBottom: "5px" }}>
                Кешбек
              </div>
              <div style={{ fontSize: "clamp(16px, 4vw, 18px)", fontWeight: "bold", color: "#10b981" }}>
                {referralBonus}₽
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Гриб мухомор с сообщением */}
      <div style={{
        background: "linear-gradient(135deg, rgba(255, 0, 204, 0.1), rgba(51, 51, 255, 0.1))",
        borderRadius: "20px",
        padding: "clamp(25px, 6vw, 30px)",
        marginBottom: "30px",
        border: "2px solid rgba(255, 255, 255, 0.2)",
        textAlign: "center",
        width: "100%",
        boxSizing: "border-box",
        overflow: "hidden"
      }}>
        <div style={{
          fontSize: "clamp(60px, 15vw, 80px)",
          marginBottom: "20px",
          cursor: "pointer",
          transition: "transform 0.3s ease",
          filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))"
        }}
        onClick={() => {
          alert("🍄 Начните прием курса, чтобы кнопка была активна!");
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = "scale(1.1)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
        title="Нажмите для информации"
        >
          🍄
        </div>

        <div style={{
          color: "#ccc",
          fontSize: "clamp(12px, 3vw, 14px)",
          lineHeight: "1.5",
          wordBreak: "break-word"
        }}>
          Отметь что сегодня принял добавки → +3 SC
        </div>
      </div>

      {/* Enhanced Motivational Habit Component */}
      {user?.id && (
        <MotivationalHabit 
          userId={user.id} 
          onSCUpdate={(newSC) => setCurrentSC(prev => prev + newSC)}
        />
      )}

      {/* Уровни и награды - по умолчанию показываем текущий и следующий */}
      <div style={{
        background: "linear-gradient(135deg, #0f172a, #1e293b)",
        borderRadius: "20px",
        padding: "clamp(15px, 4vw, 20px)",
        marginBottom: "30px",
        border: "2px solid rgba(255, 255, 255, 0.1)",
        width: "100%",
        boxSizing: "border-box",
        overflow: "hidden"
      }}>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          marginBottom: "15px",
          cursor: "pointer",
          width: "100%",
          flexWrap: "wrap",
          gap: "10px"
        }}
        onClick={() => setShowLevels(!showLevels)}
        >
          <h3 style={{ 
            color: "#fff", 
            fontSize: "clamp(16px, 4vw, 18px)", 
            margin: 0,
            flex: "1",
            minWidth: "200px"
          }}>
            🎯 Уровни и награды
          </h3>
          <div style={{ 
            fontSize: "clamp(16px, 4vw, 20px)", 
            color: "#fff",
            transition: "transform 0.3s",
            transform: showLevels ? "rotate(180deg)" : "rotate(0deg)",
            flex: "0 0 auto"
          }}>
            ▼
          </div>
        </div>
        
        {/* Текущий уровень - крупное поле в начале */}
        <div style={{
          background: "rgba(255, 0, 204, 0.2)",
          borderRadius: "15px",
          padding: "clamp(20px, 5vw, 25px)",
          marginBottom: "20px",
          border: "2px solid #ff00cc",
          textAlign: "center",
          width: "100%",
          boxSizing: "border-box",
          overflow: "hidden"
        }}>
          <div style={{ 
            fontSize: "clamp(20px, 5vw, 28px)", 
            fontWeight: "bold", 
            color: "#ff00cc", 
            marginBottom: "10px",
            wordBreak: "break-word"
          }}>
            {currentLevel.name}
          </div>
          <div style={{ 
            fontSize: "clamp(14px, 3.5vw, 18px)", 
            color: "#fff", 
            marginBottom: "15px",
            wordBreak: "break-word"
          }}>
            {currentLevel.reward}
          </div>
          <div style={{ 
            fontSize: "clamp(12px, 3vw, 16px)", 
            color: "#ccc", 
            marginBottom: "15px",
            lineHeight: "1.4",
            wordBreak: "break-word"
          }}>
            {currentLevel.description}
          </div>
          <div style={{ 
            fontSize: "clamp(12px, 3vw, 14px)", 
            color: "#fff", 
            marginBottom: "10px",
            wordBreak: "break-word"
          }}>
            {currentSC} / {nextLevel ? nextLevel.scRequired : currentLevel.scRequired} SC
          </div>
          {nextLevel && (
            <div style={{
              background: "rgba(255, 255, 255, 0.2)",
              borderRadius: "10px",
              height: "10px",
              overflow: "hidden",
              marginBottom: "10px",
              width: "100%",
              maxWidth: "300px",
              margin: "0 auto 10px auto"
            }}>
              <div style={{
                background: "linear-gradient(90deg, #ff00cc, #3333ff)",
                height: "100%",
                width: `${Math.min(progressToNext, 100)}%`,
                transition: "width 0.3s ease"
              }} />
            </div>
          )}
          {nextLevel && (
            <div style={{ 
              fontSize: "clamp(10px, 2.5vw, 12px)", 
              color: "#ccc",
              wordBreak: "break-word"
            }}>
              До следующего уровня: {nextLevel.scRequired - currentSC} SC
            </div>
          )}
        </div>

        {/* Следующий уровень - если есть */}
        {nextLevel && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "15px",
            justifyContent: "center",
            width: "100%"
          }}>
            <div style={{
              background: "rgba(255, 255, 255, 0.05)",
              borderRadius: "12px",
              padding: "15px",
              border: "2px solid rgba(255, 255, 255, 0.1)",
              opacity: 0.6,
              maxWidth: "400px",
              margin: "0 auto",
              width: "100%",
              boxSizing: "border-box",
              overflow: "hidden"
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
                flexWrap: "wrap",
                gap: "5px"
              }}>
                <div style={{ 
                  fontSize: "clamp(12px, 3.5vw, 14px)", 
                  fontWeight: "bold", 
                  color: "#fff",
                  wordBreak: "break-word"
                }}>
                  {nextLevel.name}
                </div>
                <div style={{ 
                  fontSize: "clamp(10px, 2.5vw, 11px)", 
                  color: "#ccc",
                  fontWeight: "bold",
                  whiteSpace: "nowrap"
                }}>
                  {nextLevel.scRequired} SC
                </div>
              </div>
              <div style={{ 
                fontSize: "clamp(10px, 2.5vw, 11px)", 
                color: "#ffffff",
                lineHeight: "1.3",
                marginBottom: "6px",
                wordBreak: "break-word",
                textShadow: "0 1px 2px rgba(0,0,0,0.3)"
              }}>
                {nextLevel.reward}
              </div>
              <div style={{ 
                fontSize: "clamp(8px, 2vw, 9px)", 
                color: "#ffffff",
                lineHeight: "1.2",
                wordBreak: "break-word",
                textShadow: "0 1px 2px rgba(0,0,0,0.3)"
              }}>
                {nextLevel.description}
              </div>
            </div>
          </div>
        )}
        
        {/* При раскрытии показываем все уровни (исключая текущий и следующий) */}
        {showLevels && (
          <>
            {/* Сетка всех карточек уровней (исключая текущий и следующий) */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "15px",
              marginTop: "20px",
              justifyContent: "center",
              width: "100%"
            }}>
              {levelRewards
                .filter(level => level.level !== currentLevel.level && level.level !== nextLevel?.level)
                .map((level, index) => (
                <div key={level.level} style={{
                  background: currentLevel.level >= level.level 
                    ? "rgba(255, 0, 204, 0.2)" 
                    : "rgba(255, 255, 255, 0.05)",
                  borderRadius: "12px",
                  padding: "15px",
                  border: currentLevel.level >= level.level 
                    ? "2px solid #ff00cc" 
                    : "2px solid rgba(255, 255, 255, 0.1)",
                  opacity: currentLevel.level >= level.level ? 1 : 0.6,
                  maxWidth: "400px",
                  margin: "0 auto",
                  width: "100%",
                  boxSizing: "border-box",
                  overflow: "hidden"
                }}>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "8px",
                    flexWrap: "wrap",
                    gap: "5px"
                  }}>
                    <div style={{ 
                      fontSize: "clamp(12px, 3.5vw, 14px)", 
                      fontWeight: "bold", 
                      color: "#fff",
                      wordBreak: "break-word"
                    }}>
                      {level.name}
                    </div>
                    <div style={{ 
                      fontSize: "clamp(10px, 2.5vw, 11px)", 
                      color: currentLevel.level >= level.level ? "#ff00cc" : "#ccc",
                      fontWeight: "bold",
                      whiteSpace: "nowrap"
                    }}>
                      {level.scRequired} SC
                    </div>
                  </div>
                  <div style={{ 
                    fontSize: "clamp(10px, 2.5vw, 11px)", 
                    color: currentLevel.level >= level.level ? "#ffffff" : "#ffffff",
                    lineHeight: "1.3",
                    marginBottom: "6px",
                    wordBreak: "break-word",
                    textShadow: "0 1px 2px rgba(0,0,0,0.3)"
                  }}>
                    {level.reward}
                  </div>
                  <div style={{ 
                    fontSize: "clamp(8px, 2vw, 9px)", 
                    color: currentLevel.level >= level.level ? "#ffffff" : "#ffffff",
                    lineHeight: "1.2",
                    wordBreak: "break-word",
                    textShadow: "0 1px 2px rgba(0,0,0,0.3)"
                  }}>
                    {level.description}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>



      {/* Еженедельные отметки состояния */}
      <div style={{
        background: "linear-gradient(135deg, #0f172a, #1e293b)",
        borderRadius: "20px",
        padding: "clamp(25px, 6vw, 30px)",
        marginBottom: "30px",
        border: "2px solid rgba(255, 255, 255, 0.1)",
        width: "100%",
        boxSizing: "border-box",
        overflow: "hidden"
      }}>
        <h3 style={{ 
          color: "#fff", 
          textAlign: "center", 
          marginBottom: "25px", 
          fontSize: "clamp(18px, 4.5vw, 20px)",
          wordBreak: "break-word"
        }}>
          📊 Еженедельные отметки состояния
        </h3>
        
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "clamp(15px, 3vw, 20px)",
          marginBottom: "20px",
          width: "100%"
        }}>
          {Object.entries(todayMetrics).map(([key, value]) => (
            <div key={key} style={{
              background: "rgba(255, 255, 255, 0.1)",
              borderRadius: "12px",
              padding: "clamp(15px, 4vw, 20px)",
              textAlign: "center",
              boxSizing: "border-box"
            }}>
              <div style={{ 
                fontSize: "clamp(14px, 3.5vw, 16px)", 
                fontWeight: "bold", 
                color: "#fff",
                marginBottom: "10px",
                wordBreak: "break-word"
              }}>
                {key === 'memory' && '🧠 Память и концентрация'}
                {key === 'sleep' && '😴 Качество сна'}
                {key === 'energy' && '⚡ Уровень энергии'}
                {key === 'stress' && '😌 Стрессоустойчивость'}
              </div>
              <div style={{ 
                fontSize: "clamp(20px, 5vw, 24px)", 
                fontWeight: "bold",
                color: value > 7 ? "#10b981" : value > 4 ? "#f59e0b" : "#ef4444",
                marginBottom: "10px"
              }}>
                {value}/10
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={value}
                onChange={(e) => setTodayMetrics({
                  ...todayMetrics,
                  [key]: parseInt(e.target.value)
                })}
                style={{ 
                  width: "100%", 
                  height: "8px",
                  borderRadius: "4px",
                  background: "rgba(255, 255, 255, 0.2)",
                  outline: "none"
                }}
              />
            </div>
          ))}
        </div>
        
        <div style={{
          background: "rgba(255, 255, 255, 0.1)",
          borderRadius: "12px",
          padding: "clamp(15px, 4vw, 20px)",
          marginBottom: "20px",
          width: "100%",
          boxSizing: "border-box"
        }}>
          <div style={{ 
            fontSize: "clamp(14px, 3.5vw, 16px)", 
            fontWeight: "bold", 
            color: "#fff",
            marginBottom: "10px",
            wordBreak: "break-word"
          }}>
            📝 Заметки о неделе
          </div>
          <textarea
            value={weeklyObservations}
            onChange={(e) => setWeeklyObservations(e.target.value)}
            placeholder="Опишите ваши наблюдения за неделю, изменения в самочувствии, достижения..."
            style={{
              width: "100%",
              minHeight: "80px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "8px",
              padding: "12px",
              color: "#fff",
              fontSize: "clamp(12px, 3vw, 14px)",
              fontFamily: "inherit",
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box"
            }}
          />
        </div>
      </div>

      {/* Подписки на каналы */}
      <div style={{
        background: "linear-gradient(135deg, #0f172a, #1e293b)",
        borderRadius: "20px",
        padding: "clamp(25px, 6vw, 30px)",
        marginBottom: "30px",
        border: "2px solid rgba(255, 255, 255, 0.1)",
        width: "100%",
        boxSizing: "border-box",
        overflow: "hidden"
      }}>
        <h3 style={{ 
          color: "#fff", 
          textAlign: "center", 
          marginBottom: "25px", 
          fontSize: "clamp(18px, 4.5vw, 20px)",
          wordBreak: "break-word"
        }}>
          📱 Подписки на каналы
        </h3>
        
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "clamp(15px, 3vw, 20px)",
          width: "100%"
        }}>
          {/* Telegram канал */}
          <div style={{
            background: "rgba(255, 255, 255, 0.1)",
            borderRadius: "15px",
            padding: "20px",
            textAlign: "center",
            border: subscribeSuccess === 'telegram' ? "2px solid #10b981" : "2px solid rgba(255, 255, 255, 0.1)"
          }}>
            <div style={{ fontSize: "48px", marginBottom: "15px" }}>📱</div>
            <div style={{ fontSize: "18px", fontWeight: "bold", color: "#fff", marginBottom: "10px" }}>
              Telegram канал
            </div>
            <div style={{ fontSize: "14px", color: "#ccc", marginBottom: "15px" }}>
              Подпишитесь на t.me/spor3s
            </div>
            <div style={{ fontSize: "16px", fontWeight: "bold", color: "#ff00cc", marginBottom: "15px" }}>
              +50 SC
            </div>
            {subscribeSuccess === 'telegram' ? (
              <div style={{
                background: "linear-gradient(45deg, #10b981, #059669)",
                color: "white",
                padding: "12px 20px",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: "0 4px 15px rgba(16, 185, 129, 0.3)"
              }}>
                <span style={{ fontSize: "18px" }}>✅</span>
                <span>Задание выполнено</span>
              </div>
            ) : (
              <div style={{ 
                display: "flex", 
                gap: "8px", 
                justifyContent: "center",
                flexWrap: "wrap"
              }}>
                <button
                  onClick={() => window.open('https://t.me/spor3s', '_blank')}
                  style={{
                    background: "linear-gradient(45deg, #0088cc, #00a8ff)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    padding: "8px 16px",
                    fontSize: "14px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    transition: "transform 0.2s"
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                  onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                >
                  📱 Подписаться
                </button>
                <button
                  onClick={() => handleSubscribe('telegram')}
                  disabled={subscribeLoading === 'telegram'}
                  style={{
                    background: subscribeLoading === 'telegram' 
                      ? "rgba(255, 0, 204, 0.5)" 
                      : "linear-gradient(45deg, #ff00cc, #3333ff)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    padding: "8px 16px",
                    fontSize: "14px",
                    fontWeight: "bold",
                    cursor: subscribeLoading === 'telegram' ? "not-allowed" : "pointer",
                    transition: "transform 0.2s",
                    opacity: subscribeLoading === 'telegram' ? 0.7 : 1
                  }}
                  onMouseOver={(e) => {
                    if (subscribeLoading !== 'telegram') {
                      e.currentTarget.style.transform = "scale(1.05)";
                    }
                  }}
                  onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                >
                  {subscribeLoading === 'telegram' ? '⏳' : '💰 Получить бонус'}
                </button>
              </div>
            )}
          </div>

          {/* YouTube канал */}
          <div style={{
            background: "rgba(255, 255, 255, 0.1)",
            borderRadius: "15px",
            padding: "20px",
            textAlign: "center",
            border: subscribeSuccess === 'youtube' ? "2px solid #10b981" : "2px solid rgba(255, 255, 255, 0.1)"
          }}>
            <div style={{ fontSize: "48px", marginBottom: "15px" }}>📺</div>
            <div style={{ fontSize: "18px", fontWeight: "bold", color: "#fff", marginBottom: "10px" }}>
              YouTube канал
            </div>
            <div style={{ fontSize: "14px", color: "#ccc", marginBottom: "15px" }}>
              Подпишитесь на @spor3s
            </div>
            <div style={{ fontSize: "16px", fontWeight: "bold", color: "#ff00cc", marginBottom: "15px" }}>
              +50 SC
            </div>
            {subscribeSuccess === 'youtube' ? (
              <div style={{
                background: "linear-gradient(45deg, #10b981, #059669)",
                color: "white",
                padding: "12px 20px",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: "0 4px 15px rgba(16, 185, 129, 0.3)"
              }}>
                <span style={{ fontSize: "18px" }}>✅</span>
                <span>Задание выполнено</span>
              </div>
            ) : (
              <div style={{ 
                display: "flex", 
                gap: "8px", 
                justifyContent: "center",
                flexWrap: "wrap"
              }}>
                <button
                  onClick={() => window.open('https://www.youtube.com/@spor3s', '_blank')}
                  style={{
                    background: "linear-gradient(45deg, #ff0000, #cc0000)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    padding: "8px 16px",
                    fontSize: "14px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    transition: "transform 0.2s"
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                  onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                >
                  📺 Подписаться
                </button>
                <button
                  onClick={() => handleSubscribe('youtube')}
                  disabled={subscribeLoading === 'youtube'}
                  style={{
                    background: subscribeLoading === 'youtube' 
                      ? "rgba(255, 0, 204, 0.5)" 
                      : "linear-gradient(45deg, #ff00cc, #3333ff)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    padding: "8px 16px",
                    fontSize: "14px",
                    fontWeight: "bold",
                    cursor: subscribeLoading === 'youtube' ? "not-allowed" : "pointer",
                    transition: "transform 0.2s",
                    opacity: subscribeLoading === 'youtube' ? 0.7 : 1
                  }}
                  onMouseOver={(e) => {
                    if (subscribeLoading !== 'youtube') {
                      e.currentTarget.style.transform = "scale(1.05)";
                    }
                  }}
                  onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                >
                  {subscribeLoading === 'youtube' ? '⏳' : '💰 Получить бонус'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Кнопки действий */}
      <div style={{
        display: "flex",
        gap: "15px",
        flexWrap: "wrap",
        justifyContent: "center"
      }}>
        <button
          onClick={saveWeeklyProgress}
          style={{
            background: "linear-gradient(45deg, #ff00cc, #3333ff)",
            color: "white",
            border: "none",
            borderRadius: "12px",
            padding: "15px 30px",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: "pointer",
            flex: "1",
            minWidth: "200px",
            transition: "transform 0.2s"
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.02)"}
          onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
        >
          💾 Сохранить прогресс недели {currentWeek} (с 01.01.2024)
        </button>
        
        <button
          onClick={() => setShowHistoryModal(true)}
          style={{
            background: "linear-gradient(45deg, #10b981, #059669)",
            color: "white",
            border: "none",
            borderRadius: "12px",
            padding: "15px 30px",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: "pointer",
            flex: "1",
            minWidth: "200px",
            transition: "transform 0.2s"
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.02)"}
          onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
        >
          📈 История прогресса
        </button>
      </div>

      {/* Модальное окно истории прогресса */}
      {showHistoryModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px"
        }}>
          <div style={{
            background: "linear-gradient(135deg, #0f172a, #1e293b)",
            borderRadius: "20px",
            padding: "30px",
            maxWidth: "600px",
            width: "100%",
            maxHeight: "80vh",
            overflowY: "auto",
            border: "2px solid rgba(255, 255, 255, 0.1)"
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "25px"
            }}>
              <h3 style={{ color: "#fff", fontSize: "20px", margin: 0 }}>
                📈 История прогресса
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "none",
                  borderRadius: "50%",
                  width: "40px",
                  height: "40px",
                  color: "#fff",
                  fontSize: "20px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                ✕
              </button>
            </div>

            {weeklyProgress.length === 0 ? (
              <div style={{ textAlign: "center", color: "#ccc", padding: "40px" }}>
                📊 Пока нет данных для отображения
              </div>
            ) : (
              <>
                {/* График накопительного прогресса */}
                <div style={{ marginBottom: "30px" }}>
                  <h4 style={{ color: "#fff", marginBottom: "15px", textAlign: "center" }}>
                    📊 Общий прогресс (накопительный итог)
                  </h4>
                  <div style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    borderRadius: "12px",
                    padding: "20px",
                    marginBottom: "20px"
                  }}>
                    {['memory', 'sleep', 'energy', 'stress'].map((metric) => {
                      const cumulativeData = weeklyProgress.map((week, index) => {
                        const total = weeklyProgress.slice(0, index + 1).reduce((sum, w) => sum + w.metrics[metric as keyof Metrics], 0);
                        return total / (index + 1);
                      });
                      
                      const latest = cumulativeData[cumulativeData.length - 1];
                      const improvement = latest - cumulativeData[0];
                      
                      return (
                        <div key={metric} style={{ marginBottom: "15px" }}>
                          <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "5px"
                          }}>
                            <span style={{ color: "#fff", fontSize: "14px" }}>
                              {metric === 'memory' && '🧠 Память'}
                              {metric === 'sleep' && '😴 Сон'}
                              {metric === 'energy' && '⚡ Энергия'}
                              {metric === 'stress' && '😌 Стресс'}
                            </span>
                            <span style={{ 
                              color: improvement > 0 ? "#10b981" : improvement < 0 ? "#ef4444" : "#ccc",
                              fontSize: "14px",
                              fontWeight: "bold"
                            }}>
                              {latest.toFixed(1)}/10
                              {improvement > 0 && ` (+${improvement.toFixed(1)})`}
                              {improvement < 0 && ` (${improvement.toFixed(1)})`}
                            </span>
                          </div>
                          <div style={{
                            background: "rgba(255, 255, 255, 0.1)",
                            borderRadius: "8px",
                            height: "8px",
                            overflow: "hidden"
                          }}>
                            <div style={{
                              background: "linear-gradient(90deg, #ff00cc, #3333ff)",
                              height: "100%",
                              width: `${(latest / 10) * 100}%`,
                              transition: "width 0.3s ease"
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Детальная история по неделям */}
                <div>
                  <h4 style={{ color: "#fff", marginBottom: "15px", textAlign: "center" }}>
                    📅 История по неделям
                  </h4>
                  <div style={{
                    maxHeight: "300px",
                    overflowY: "auto"
                  }}>
                    {weeklyProgress.map((week, index) => (
                      <div key={week.week} style={{
                        background: "rgba(255, 255, 255, 0.05)",
                        borderRadius: "12px",
                        padding: "15px",
                        marginBottom: "10px"
                      }}>
                        <div style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "10px"
                        }}>
                          <div style={{ color: "#ff00cc", fontWeight: "bold" }}>
                            Неделя {week.week}
                          </div>
                          <div style={{ color: "#ccc", fontSize: "12px" }}>
                            {new Date(week.date).toLocaleDateString('ru-RU')}
                          </div>
                        </div>
                        
                        <div style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(4, 1fr)",
                          gap: "10px",
                          marginBottom: "10px"
                        }}>
                          {Object.entries(week.metrics).map(([key, value]) => (
                            <div key={key} style={{ textAlign: "center" }}>
                              <div style={{ fontSize: "12px", color: "#ccc", marginBottom: "2px" }}>
                                {key === 'memory' && '🧠'}
                                {key === 'sleep' && '😴'}
                                {key === 'energy' && '⚡'}
                                {key === 'stress' && '😌'}
                              </div>
                              <div style={{ 
                                fontSize: "14px", 
                                fontWeight: "bold",
                                color: value > 7 ? "#10b981" : value > 4 ? "#f59e0b" : "#ef4444"
                              }}>
                                {value}/10
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {week.notes && (
                          <div style={{ 
                            fontSize: "12px", 
                            color: "#ccc", 
                            fontStyle: "italic",
                            marginBottom: "8px"
                          }}>
                            {week.notes}
                          </div>
                        )}
                        
                        {week.achievements.length > 0 && (
                          <div style={{ fontSize: "12px", color: "#ff00cc" }}>
                            🏆 {week.achievements.join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 