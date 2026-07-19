"use client";
import { useState, useEffect, useRef } from "react";
import MotivationalHabit from "../../components/MotivationalHabit";
import { openExternal } from "../../lib/openExternal";

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
  { level: 1, name: "🌱 Новичок", scRequired: 0, reward: "Доступ к базовым функциям", description: "Доступ к базовым функциям и каталогу продуктов." },
  { level: 2, name: "🌿 Собиратель", scRequired: 100, reward: "Мотивационная привычка", description: "Открывается возможность мотивационной привычки для отслеживания прогресса." },
  { level: 3, name: "🌳 Эксперт", scRequired: 300, reward: "Закрытый чат экспертов", description: "Сумма заказов от 5000₽ — участие в закрытых розыгрышах." },
  { level: 4, name: "👑 Мастер", scRequired: 600, reward: "Персональные наборы", description: "Сумма заказов от 10 000₽ — 5% скидка всегда, доступ к персональным наборам для практик (травы, благовония, чай)." },
  { level: 5, name: "🌟 Легенда", scRequired: 1000, reward: "Максимальные привилегии", description: "Сумма заказов от 20000₽ — 10% скидка всегда, мерч от бренда, личные встречи, живой трекинг." }
];

// Задания: подписки на каналы, бонус за каждое — TASK_BONUS SC
const TASK_BONUS = 30;
const TASKS = [
  { id: 'telegram', icon: '📱', title: 'Telegram канал', desc: 'Подпишитесь на t.me/spor3s', url: 'https://t.me/spor3s', btnColor: 'linear-gradient(45deg, #0088cc, #00a8ff)' },
  { id: 'youtube', icon: '📺', title: 'YouTube канал', desc: 'Подпишитесь на @spor3s', url: 'https://www.youtube.com/@spor3s', btnColor: 'linear-gradient(45deg, #ff0000, #cc0000)' },
  { id: 'instagram', icon: '📸', title: 'Instagram', desc: 'Подпишитесь на @alex.spor3s', url: 'https://instagram.com/alex.spor3s', btnColor: 'linear-gradient(45deg, #e1306c, #f77737)' },
];

export default function RoadMap({ user }: RoadMapProps) {
  const [currentWeek, setCurrentWeek] = useState(1);
  const [startMetrics, setStartMetrics] = useState<Metrics>({ memory: 5, sleep: 4, energy: 3, stress: 7 });
  const [weeklyProgress, setWeeklyProgress] = useState<WeekProgress[]>([]);
  // Стартовая оценка отключена до подключения к API (не персистится) — не блокируем вкладку
  const [showStartAssessment, setShowStartAssessment] = useState(false);
  // Геймификация (уровни, недельные метрики, трекинг курса) скрыта до запуска.
  // Включить обратно: SHOW_GAMIFICATION = true
  const SHOW_GAMIFICATION = false;
  const [todayMetrics, setTodayMetrics] = useState<Metrics>({ memory: 5, sleep: 5, energy: 5, stress: 5 });
  const [weeklyObservations, setWeeklyObservations] = useState("");
  const [currentSC, setCurrentSC] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0); // заработано за всё время — для уровня
  const [referralSC, setReferralSC] = useState(0);
  const [checkinDoneToday, setCheckinDoneToday] = useState(false);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinMsg, setCheckinMsg] = useState<string | null>(null);

  const [subscribeLoading, setSubscribeLoading] = useState<string | null>(null);
  const [tasksDone, setTasksDone] = useState<Record<string, boolean>>({});
  const [tasksOpen, setTasksOpen] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showLevels, setShowLevels] = useState(false);
  
  // Новые состояния для курса и рефералов
  const [courseStarted, setCourseStarted] = useState(false);
  const [courseDuration, setCourseDuration] = useState<number | null>(null);
  const [courseStartDate, setCourseStartDate] = useState<string | null>(null);
  const [startCourseLoading, setStartCourseLoading] = useState(false);
  const [referralStats, setReferralStats] = useState<any>(null);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [referralBonus, setReferralBonus] = useState(0);
  const [invitedCount, setInvitedCount] = useState(0);

  // Реальная история еженедельных самооценок из БД (таблица surveys)
  const fetchSurveys = async () => {
    if (!user?.id) return;
    try {
      const resp = await fetch(`/api/survey?user_id=${user.id}`);
      const data = await resp.json();
      if (data.success) {
        const progress: WeekProgress[] = (data.surveys || []).map((s: any, i: number) => ({
          week: s.week || i + 1,
          date: (s.created_at || '').split('T')[0],
          metrics: { memory: s.memory ?? 5, sleep: s.sleep ?? 5, energy: s.energy ?? 5, stress: s.stress ?? 5 },
          notes: s.note || '',
          achievements: [],
          extraHabits: 0
        })).sort((a: WeekProgress, b: WeekProgress) => a.week - b.week);
        setWeeklyProgress(progress);
        setCurrentWeek(progress.length + 1);
      }
    } catch (e) {
      console.error('Fetch surveys error:', e);
    }
  };

  const handleStartAssessment = () => {
    setShowStartAssessment(false);
    // Здесь можно отправить startMetrics в API
  };

  const [saveProgressLoading, setSaveProgressLoading] = useState(false);
  const [saveProgressMsg, setSaveProgressMsg] = useState<string | null>(null);
  const saveWeeklyProgress = async () => {
    if (!user?.id || saveProgressLoading) return;
    setSaveProgressLoading(true);
    setSaveProgressMsg(null);
    try {
      const resp = await fetch('/api/survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          memory: todayMetrics.memory,
          sleep: todayMetrics.sleep,
          energy: todayMetrics.energy,
          stress: todayMetrics.stress,
          note: weeklyObservations
        })
      });
      const data = await resp.json();
      if (data.success) {
        const savedWeek = data.week || weeklyProgress.length + 1;
        setWeeklyProgress(prev => [...prev, {
          week: savedWeek,
          date: new Date().toISOString().split('T')[0],
          metrics: todayMetrics,
          notes: weeklyObservations,
          achievements: [],
          extraHabits: 0
        }].sort((a, b) => a.week - b.week));
        setCurrentWeek(prev => prev + 1);
        setWeeklyObservations("");
        if (typeof data.currentBalance === 'number') setCurrentSC(data.currentBalance);
        setTotalEarned(prev => prev + (data.scEarned || 0));
        setSaveProgressMsg(data.scLimitReached
          ? `✅ Неделя ${savedWeek} сохранена (без SC — исчерпан месячный лимит 100 SC)`
          : `✅ Неделя ${savedWeek} сохранена! +${data.scEarned || 25} SC`);
      } else {
        setSaveProgressMsg(`⚠️ ${data.error || 'Не удалось сохранить'}`);
      }
    } catch (e) {
      setSaveProgressMsg('⚠️ Ошибка сети, попробуйте ещё раз');
    } finally {
      setSaveProgressLoading(false);
      setTimeout(() => setSaveProgressMsg(null), 5000);
    }
  };

  // Следующая незаполненная неделя. При активном курсе недели идут от даты старта:
  // пропущенные можно досдать позже, но будущие недели закрыты до их наступления.
  const WEEK_MS = 7 * 24 * 3600 * 1000;
  const getNextWeekInfo = () => {
    const filledWeeks = new Set(weeklyProgress.map(p => p.week));
    let next = 1;
    while (filledWeeks.has(next)) next++;
    if (courseStarted && courseStartDate) {
      const start = new Date(courseStartDate).getTime();
      const currentCourseWeek = Math.floor((Date.now() - start) / WEEK_MS) + 1;
      if (next > currentCourseWeek) {
        return { next, locked: true, opensAt: new Date(start + (next - 1) * WEEK_MS) };
      }
    }
    return { next, locked: false, opensAt: null as Date | null };
  };
  const nextWeekInfo = getNextWeekInfo();

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

  // Уровень считаем от totalEarned (заработано за всё время), а не от текущего баланса —
  // потраченные на скидку SC не понижают уровень.
  const getCurrentLevel = () => {
    for (let i = levelRewards.length - 1; i >= 0; i--) {
      if (totalEarned >= levelRewards[i].scRequired) {
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
  const progressToNext = nextLevel ? ((totalEarned - currentLevel.scRequired) / (nextLevel.scRequired - currentLevel.scRequired)) * 100 : 0;

  const handleSubscribe = async (channelType: 'telegram' | 'youtube' | 'instagram') => {
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
        setTasksDone(prev => ({ ...prev, [channelType]: true }));
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

  // Статус чек-ина на сегодня
  const fetchCheckinStatus = async () => {
    if (!user?.id) return;
    try {
      const resp = await fetch(`/api/checkin?user_id=${user.id}`);
      const data = await resp.json();
      if (data.success) setCheckinDoneToday(!!data.doneToday);
    } catch {}
  };

  // Активный курс (восстановление состояния после перезахода)
  const fetchCourseStatus = async () => {
    if (!user?.id) return;
    try {
      const resp = await fetch(`/api/start-course?user_id=${user.id}`);
      const data = await resp.json();
      if (data.success && data.course) {
        setCourseStarted(true);
        setCourseDuration(data.course.course_duration);
        setCourseStartDate(data.course.start_date);
      }
    } catch {}
  };

  // Оплаченный заказ, к которому привязывается чек-ин/курс
  const eligibleOrder = myOrders.find((o: any) => ['paid', 'shipped', 'completed'].includes(o.status));

  // Ежедневный чек-ин: +3 SC, доступен при оплаченном заказе
  const handleDailyCheckin = async () => {
    if (!user?.id || checkinLoading) return;
    if (!eligibleOrder) {
      setCheckinMsg('🍄 Чек-ин станет доступен после оплаты заказа');
      setTimeout(() => setCheckinMsg(null), 4000);
      return;
    }
    if (checkinDoneToday) return;
    setCheckinLoading(true);
    try {
      const resp = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, order_id: eligibleOrder.id })
      });
      const data = await resp.json();
      if (data.success) {
        setCheckinDoneToday(true);
        if (typeof data.currentBalance === 'number') setCurrentSC(data.currentBalance);
        setTotalEarned(prev => prev + (data.scEarned || 0));
        setCheckinMsg(`✅ Отмечено! +${data.scEarned || 3} SC`);
      } else {
        if ((data.error || '').includes('уже')) setCheckinDoneToday(true);
        setCheckinMsg(`⚠️ ${data.error || 'Не получилось, попробуйте позже'}`);
      }
    } catch {
      setCheckinMsg('⚠️ Ошибка сети');
    } finally {
      setCheckinLoading(false);
      setTimeout(() => setCheckinMsg(null), 4000);
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
        setReferralBonus(data.stats.referralEarned);
        setInvitedCount(data.stats.totalReferrals);
        if (typeof data.stats.balance === 'number') setCurrentSC(data.stats.balance);
        if (typeof data.stats.totalEarned === 'number') setTotalEarned(data.stats.totalEarned);
      }
    } catch (error) {
      console.error('Fetch referral stats error:', error);
    }
  };

  // История заказов пользователя (для блока «Мои заказы»)
  const fetchMyOrders = async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(`/api/my-orders?user_id=${user.id}`);
      const data = await response.json();
      if (data.success) setMyOrders(data.orders || []);
    } catch (error) {
      console.error('Fetch my orders error:', error);
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
      for (const ch of ['telegram', 'youtube', 'instagram']) {
        const resp = await fetch('/api/check-subscription-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id, channel_type: ch })
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.hasReceivedBonus) {
            setTasksDone(prev => ({ ...prev, [ch]: true }));
          }
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
      fetchMyOrders();
      fetchSurveys();
      fetchCheckinStatus();
      fetchCourseStatus();
    }
  }, [user?.id]);

  if (SHOW_GAMIFICATION && showStartAssessment) {
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
          color: "#fff",
          fontWeight: 600,
          marginBottom: 6
        }}>
          1 Spor3s Coin = 1 рубль
        </div>
        {/* Технический ID/username больше не показываем (не должен светиться dev-user/temp-user).
            Персональная реферальная ссылка — ниже, в блоке «Реферальная система». */}

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
            🎁 {referralBonus} ₽ реф.
          </div>
        </div>
      </div>

      {SHOW_GAMIFICATION && (<>
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
      </>)}

      {/* Мои заказы */}
      {myOrders.length > 0 && (
        <div style={{
          background: "linear-gradient(135deg, #0f172a, #1e293b)",
          borderRadius: "20px",
          padding: "clamp(20px, 5vw, 25px)",
          marginBottom: "30px",
          border: "2px solid rgba(255, 255, 255, 0.1)",
          width: "100%",
          boxSizing: "border-box",
          overflow: "hidden"
        }}>
          <div style={{
            fontSize: "clamp(18px, 4.5vw, 20px)",
            fontWeight: "bold",
            color: "#ff00cc",
            marginBottom: "15px",
            textAlign: "center"
          }}>
            📦 Мои заказы
          </div>
          {myOrders.map((order: any) => {
            const statusInfo: Record<string, { label: string; color: string }> = {
              pending: { label: "⏳ В обработке", color: "#ffc107" },
              paid: { label: "💰 Оплачен", color: "#00ff88" },
              shipped: { label: "🚚 Отправлен", color: "#38bdf8" },
              completed: { label: "✅ Выполнен", color: "#8bc34a" },
              cancelled: { label: "❌ Отменён", color: "#ff6b6b" },
            };
            const st = statusInfo[order.status] || { label: order.status || "—", color: "#ccc" };
            const items = Array.isArray(order.items) ? order.items : [];
            return (
              <div key={order.id} style={{
                background: "rgba(255, 255, 255, 0.05)",
                borderRadius: "12px",
                padding: "14px 16px",
                marginBottom: "10px",
                textAlign: "left"
              }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "6px",
                  marginBottom: "8px"
                }}>
                  <span style={{ color: "#ccc", fontSize: "clamp(12px, 3vw, 13px)" }}>
                    {order.created_at ? new Date(order.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }) : ""}
                  </span>
                  <span style={{
                    color: st.color,
                    fontWeight: 700,
                    fontSize: "clamp(13px, 3.2vw, 14px)",
                    whiteSpace: "nowrap"
                  }}>
                    {st.label}
                  </span>
                </div>
                <div style={{ color: "#fff", fontSize: "clamp(13px, 3.2vw, 15px)", lineHeight: 1.5 }}>
                  {items.length > 0
                    ? items.map((it: any, i: number) => (
                        <div key={i}>{it.name || it.id}{it.quantity > 1 ? ` ×${it.quantity}` : ""}</div>
                      ))
                    : "—"}
                </div>
                {order.admin_comment && (
                  <div style={{
                    background: "rgba(56, 189, 248, 0.1)",
                    border: "1px solid rgba(56, 189, 248, 0.4)",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    marginTop: "8px",
                    color: "#bae6fd",
                    fontSize: "clamp(12px, 3vw, 14px)",
                    lineHeight: 1.4
                  }}>
                    💬 {order.admin_comment}
                  </div>
                )}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "6px",
                  marginTop: "8px"
                }}>
                  <span style={{ color: "#ff00cc", fontWeight: 700 }}>{order.total}₽</span>
                  {order.tracking_number && (
                    <span style={{ color: "#38bdf8", fontSize: "clamp(12px, 3vw, 13px)", fontFamily: "monospace" }}>
                      трек: {order.tracking_number}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
        
        {/* Персональная ссылка: друг кликает → бот сразу привязывает его к вам */}
        {user?.telegram_id && /^\d+$/.test(String(user.telegram_id)) && (() => {
          const refLink = `https://t.me/Spor3s_bot?start=${user.telegram_id}`;
          const shareText = 'Грибные добавки СПОРС 🍄 Перейди по моей ссылке — получишь 100 SC (100₽) на первый заказ!';
          return (
            <div style={{
              background: "rgba(255, 255, 255, 0.1)",
              borderRadius: "12px",
              padding: "15px",
              marginBottom: "15px",
              width: "100%",
              boxSizing: "border-box"
            }}>
              <div style={{ fontSize: "clamp(12px, 3vw, 14px)", color: "#fff", marginBottom: "10px", fontWeight: 600 }}>
                🔗 Ваша персональная ссылка:
              </div>
              <div style={{
                background: "rgba(255, 255, 255, 0.2)",
                padding: "8px 12px",
                borderRadius: "8px",
                fontSize: "clamp(12px, 3vw, 14px)",
                color: "#ff7ae0",
                fontFamily: "monospace",
                wordBreak: "break-all",
                marginBottom: "10px"
              }}>
                {refLink}
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                <button
                  onClick={() => { navigator.clipboard.writeText(refLink); alert('Ссылка скопирована!'); }}
                  style={{
                    background: "#ff00cc", color: "#fff", border: "none", borderRadius: 8,
                    padding: "8px 16px", fontSize: "clamp(12px, 3vw, 14px)", fontWeight: 700, cursor: "pointer"
                  }}
                >
                  📋 Скопировать
                </button>
                <button
                  onClick={() => openExternal(`https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent(shareText)}`)}
                  style={{
                    background: "linear-gradient(45deg, #0088cc, #00a8ff)", color: "#fff", border: "none", borderRadius: 8,
                    padding: "8px 16px", fontSize: "clamp(12px, 3vw, 14px)", fontWeight: 700, cursor: "pointer"
                  }}
                >
                  📤 Поделиться
                </button>
              </div>
            </div>
          );
        })()}

        {/* Гость из браузера: ссылки нет — подсказываем открыть через Telegram */}
        {!(user?.telegram_id && /^\d+$/.test(String(user.telegram_id))) && (
          <div style={{
            background: "rgba(0, 136, 204, 0.15)",
            border: "1px solid rgba(0, 168, 255, 0.5)",
            borderRadius: "12px",
            padding: "15px",
            marginBottom: "15px",
            width: "100%",
            boxSizing: "border-box",
            fontSize: "clamp(12px, 3vw, 14px)",
            color: "#fff",
            lineHeight: 1.5
          }}>
            🔗 Персональная реферальная ссылка появится здесь, если открыть
            приложение через Telegram:{" "}
            <span
              onClick={() => openExternal('https://t.me/Spor3s_bot')}
              style={{ color: "#00a8ff", textDecoration: "underline", cursor: "pointer", fontWeight: 700 }}
            >
              @Spor3s_bot
            </span>
          </div>
        )}

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
              {user?.telegram_id && /^\d+$/.test(String(user.telegram_id))
                ? "Или код для ввода при заказе:"
                : "Ваш реферальный код:"}
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

        {/* Список приглашённых: кто, статус, сколько SC принёс */}
        {referralStats?.referrals?.length > 0 && (
          <div style={{ marginTop: "12px", width: "100%" }}>
            <div style={{ fontSize: "13px", color: "#ccc", marginBottom: "8px" }}>
              👥 Ваши приглашённые:
            </div>
            {referralStats.referrals.map((r: any) => {
              const u = r.referred_user;
              const name = u?.username
                ? `@${u.username}`
                : `ID ${String(u?.telegram_id || "").slice(0, 4)}…`;
              return (
                <div key={r.id} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "8px",
                  flexWrap: "wrap",
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  marginBottom: "6px",
                  fontSize: "13px",
                  boxSizing: "border-box"
                }}>
                  <span style={{ fontWeight: 600 }}>👤 {name}</span>
                  <span style={{ color: r.status === "completed" ? "#10b981" : "#f59e0b" }}>
                    {r.status === "completed"
                      ? `✅ активен${r.scEarned > 0 ? ` · принёс ${r.scEarned} SC` : ""}`
                      : "⏳ ждёт первого заказа"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {SHOW_GAMIFICATION && (<>
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
          cursor: checkinDoneToday ? "default" : "pointer",
          transition: "transform 0.3s ease",
          filter: checkinDoneToday
            ? "drop-shadow(0 4px 8px rgba(16,185,129,0.5))"
            : "drop-shadow(0 4px 8px rgba(0,0,0,0.3))",
          opacity: checkinLoading ? 0.5 : 1
        }}
        onClick={handleDailyCheckin}
        onMouseOver={(e) => {
          if (!checkinDoneToday) e.currentTarget.style.transform = "scale(1.1)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
        title={checkinDoneToday ? "Сегодня уже отмечено" : "Нажми, чтобы отметить приём"}
        >
          {checkinDoneToday ? "✅" : "🍄"}
        </div>

        <div style={{
          color: checkinDoneToday ? "#10b981" : "#ccc",
          fontSize: "clamp(12px, 3vw, 14px)",
          lineHeight: "1.5",
          fontWeight: checkinDoneToday ? 700 : 400,
          wordBreak: "break-word"
        }}>
          {checkinDoneToday
            ? "Сегодня отмечено! +3 SC. Возвращайся завтра 🍄"
            : eligibleOrder
              ? "Отметь, что сегодня принял добавки → +3 SC"
              : "Чек-ин откроется после оплаты заказа (+3 SC каждый день)"}
        </div>
        {checkinMsg && (
          <div style={{
            marginTop: "10px",
            color: checkinMsg.startsWith("✅") ? "#10b981" : "#ffc107",
            fontSize: "clamp(13px, 3.2vw, 15px)",
            fontWeight: 600
          }}>
            {checkinMsg}
          </div>
        )}
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
            {totalEarned} / {nextLevel ? nextLevel.scRequired : currentLevel.scRequired} SC
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
              До следующего уровня: {nextLevel.scRequired - totalEarned} SC
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

      </>)}

      {/* Задания (свёрнуты по умолчанию) */}
      <div style={{
        background: "linear-gradient(135deg, #0f172a, #1e293b)",
        borderRadius: "20px",
        padding: "clamp(20px, 5vw, 25px)",
        marginBottom: "30px",
        border: "2px solid rgba(255, 255, 255, 0.1)",
        width: "100%",
        boxSizing: "border-box",
        overflow: "hidden"
      }}>
        <button
          onClick={() => setTasksOpen(o => !o)}
          style={{
            width: "100%",
            background: "none",
            border: "none",
            color: "#fff",
            fontSize: "clamp(18px, 4.5vw, 20px)",
            fontWeight: "bold",
            cursor: "pointer",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 0
          }}
        >
          <span>🎯 Задания</span>
          <span style={{ fontSize: "clamp(12px, 3vw, 14px)", color: "#ccc", fontWeight: 500 }}>
            {Object.values(tasksDone).filter(Boolean).length}/{TASKS.length} выполнено {tasksOpen ? "▲" : "▼"}
          </span>
        </button>
        {tasksOpen && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "clamp(12px, 3vw, 15px)",
            marginTop: 20,
            width: "100%"
          }}>
            {TASKS.map((t) => (
              <div key={t.id} style={{
                background: "rgba(255, 255, 255, 0.1)",
                borderRadius: 15,
                padding: 18,
                textAlign: "center",
                border: tasksDone[t.id] ? "2px solid #10b981" : "2px solid rgba(255, 255, 255, 0.1)"
              }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>{t.icon}</div>
                <div style={{ fontSize: 17, fontWeight: "bold", color: "#fff", marginBottom: 6 }}>{t.title}</div>
                <div style={{ fontSize: 13, color: "#ccc", marginBottom: 10, wordBreak: "break-word" }}>{t.desc}</div>
                {tasksDone[t.id] ? (
                  <div style={{
                    background: "linear-gradient(45deg, #10b981, #059669)",
                    color: "#fff",
                    padding: "10px 14px",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: "bold"
                  }}>
                    ✅ Готово — бонус +{TASK_BONUS} SC получен
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 15, fontWeight: "bold", color: "#ff00cc", marginBottom: 10 }}>+{TASK_BONUS} SC</div>
                    <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                      <button
                        onClick={() => openExternal(t.url)}
                        style={{
                          background: t.btnColor,
                          color: "#fff",
                          border: "none",
                          borderRadius: 8,
                          padding: "8px 14px",
                          fontSize: 13,
                          fontWeight: "bold",
                          cursor: "pointer"
                        }}
                      >
                        Подписаться
                      </button>
                      <button
                        onClick={() => handleSubscribe(t.id as 'telegram' | 'youtube' | 'instagram')}
                        disabled={subscribeLoading === t.id}
                        style={{
                          background: subscribeLoading === t.id ? "rgba(255, 0, 204, 0.5)" : "linear-gradient(45deg, #ff00cc, #3333ff)",
                          color: "#fff",
                          border: "none",
                          borderRadius: 8,
                          padding: "8px 14px",
                          fontSize: 13,
                          fontWeight: "bold",
                          cursor: subscribeLoading === t.id ? "not-allowed" : "pointer"
                        }}
                      >
                        {subscribeLoading === t.id ? "⏳" : "💰 Получить бонус"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {SHOW_GAMIFICATION && (<>
      {/* Кнопки действий */}
      <div style={{
        display: "flex",
        gap: "15px",
        flexWrap: "wrap",
        justifyContent: "center"
      }}>
        <button
          onClick={saveWeeklyProgress}
          disabled={saveProgressLoading || nextWeekInfo.locked}
          style={{
            background: nextWeekInfo.locked
              ? "linear-gradient(45deg, #10b981, #059669)"
              : "linear-gradient(45deg, #ff00cc, #3333ff)",
            color: "white",
            border: "none",
            borderRadius: "12px",
            padding: "15px 30px",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: nextWeekInfo.locked ? "default" : "pointer",
            flex: "1",
            minWidth: "200px",
            transition: "transform 0.2s"
          }}
          onMouseOver={(e) => { if (!nextWeekInfo.locked) e.currentTarget.style.transform = "scale(1.02)"; }}
          onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
        >
          {saveProgressLoading
            ? '⏳ Сохраняю...'
            : nextWeekInfo.locked
              ? `✅ Все недели заполнены — неделя ${nextWeekInfo.next} откроется ${nextWeekInfo.opensAt?.toLocaleDateString('ru-RU')}`
              : `💾 Сохранить прогресс недели ${nextWeekInfo.next}`}
        </button>
        {saveProgressMsg && (
          <div style={{
            width: "100%",
            textAlign: "center",
            color: saveProgressMsg.startsWith("✅") ? "#10b981" : "#ffc107",
            fontWeight: 600,
            fontSize: "clamp(13px, 3.2vw, 15px)"
          }}>
            {saveProgressMsg}
          </div>
        )}
        
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
                    {weeklyProgress.length === 0 && (
                      <div style={{ color: "#ccc", textAlign: "center", padding: "20px" }}>
                        Пока нет записей — сохраните первую еженедельную самооценку во вкладке «Кабинет»
                      </div>
                    )}
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
      </>)}
    </div>
  );
} 