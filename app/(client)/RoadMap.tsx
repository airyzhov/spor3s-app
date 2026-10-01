"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import RaffleBanner from "./RaffleBanner";
import MotivationalHabit from "../../components/MotivationalHabit";
import CabinetSection from "./CabinetSection";
import CourseSection from "./CourseSection";
import ScHistorySection from "./ScHistorySection";
import BonusHero from "./BonusHero";
import EarnList, { EARN_TASKS, type EarnTaskId } from "./EarnList";
import ReferralPanel from "./ReferralPanel";
import { openExternal } from "../../lib/openExternal";
import { isGamificationTester } from "../../lib/testers";
import { ORDER_STATUS_LABELS, PAID_STATUSES } from "../../lib/orderStatus";

interface RoadMapProps {
  user: any;
  focus?: 'tasks' | 'raffle' | 'course' | 'sc' | null;
  onFocusHandled?: () => void;
  onOpenCatalog?: () => void; // «🛒 Покупки» в «Как получить SC» — в каталог
}

// Сколько удерживать нужный блок в поле зрения, пока догружается контент кабинета.
const FOCUS_SETTLE_MS = 2500;
const CHANNEL_NAMES: Record<EarnTaskId, string> = { telegram: 'Telegram', youtube: 'YouTube', instagram: 'Instagram' };

// Кабинет одним экраном (как бонусный экран Walt, 01.10): крупный баланс, карточка розыгрыша,
// список «Как получить SC»; ниже история SC, курс и заказы. Спека: 2026-10-01-cabinet-bonus-screen-design.md
export default function RoadMap({ user, focus, onFocusHandled, onOpenCatalog }: RoadMapProps) {
  // Тестировщики (lib/testers.ts — аккаунт владельца) видят то, что покупателям ещё не показываем: привычку
  const SHOW_GAMIFICATION = isGamificationTester(user?.telegram_id);
  // Растёт после начисления за задание: баланс, розыгрыш и история перечитывают свои данные
  const [refreshKey, setRefreshKey] = useState(0);
  const raffleRef = useRef<HTMLDivElement>(null);

  const [subscribeLoading, setSubscribeLoading] = useState<EarnTaskId | null>(null);
  const [tasksDone, setTasksDone] = useState<Partial<Record<EarnTaskId, boolean>>>({});
  // Перешёл в канал из списка — рядом с заданием появляется «Получить +30 SC»
  const [channelOpened, setChannelOpened] = useState<Partial<Record<EarnTaskId, boolean>>>({});
  // Пришли по кнопке бота «Отметить начало курса» (?open=course) — раздел курса раскрыт сразу
  const [courseFocus, setCourseFocus] = useState(false);
  // Строка «🍄 Отчёт о самочувствии» — раскрыть курс (каждый раз)
  const [courseSignal, setCourseSignal] = useState(0);
  const courseRef = useRef<HTMLDivElement>(null);
  // «🧾 История ›» в шапке и кнопка бота «🧾 История SC» (?open=sc) — раскрыть историю (каждый раз)
  const [historySignal, setHistorySignal] = useState(0);
  const scHistoryRef = useRef<HTMLDivElement>(null);

  const [referralStats, setReferralStats] = useState<any>(null);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [referralCode, setReferralCode] = useState("");
  const [referralBonus, setReferralBonus] = useState(0);
  const [invitedCount, setInvitedCount] = useState(0);
  const tasksRef = useRef<HTMLDivElement>(null);
  const [scrollTarget, setScrollTarget] = useState<'tasks' | 'raffle' | 'course' | 'sc' | null>(null);

  // Раскрывает блок заданий и подводит к нему. Используется и плашкой на главном
  // экране (через проп focus), и плашкой здесь, в кабинете.
  //
  // Одного scrollIntoView мало, и фиксированной задержки тоже: в момент открытия
  // кабинета ещё летят запросы разделов (заказы, рефералы, курс). Пока их нет,
  // страница короткая — скролл отрабатывает, но «приезжает» почти в начало. Затем
  // ответы приходят, контент над блоком заданий вырастает, и блок уезжает вниз.
  // Поэтому держим его в поле зрения, пока высота страницы меняется, но не дольше
  // FOCUS_SETTLE_MS — и сразу отпускаем, если пользователь начал листать сам.
  //
  // Возвращает cleanup — вызов из эффекта обязан его вернуть, иначе размонтирование
  // оставит висящий observer. onDone дёргается только в конце: сбросить focus раньше
  // — значит перезапустить эффект и оборвать ещё не доехавший скролл.
  // Задания теперь — строки списка «Как получить SC», он всегда раскрыт: только подводим к нему
  const focusTasks = useCallback(() => {
    setScrollTarget('tasks');
  }, []);

  const openHistory = useCallback(() => {
    setHistorySignal((n) => n + 1);
    setScrollTarget('sc');
  }, []);

  // Приход с главного экрана или по кнопке бота. focus сбрасываем сразу: сам скролл живёт на
  // локальном scrollTarget, поэтому сброс пропа его не обрывает. Над розыгрышем теперь шапка
  // с балансом, которая догружается, — поэтому и к нему подводим с удержанием.
  useEffect(() => {
    if (focus === 'tasks') {
      focusTasks();
    } else if (focus === 'raffle') {
      setScrollTarget('raffle');
    } else if (focus === 'course') {
      setCourseFocus(true);
      setScrollTarget('course');
    } else if (focus === 'sc') {
      openHistory();
    } else {
      return;
    }
    onFocusHandled?.();
  }, [focus, focusTasks, openHistory]);

  // Скролл вынесен в отдельный эффект намеренно. Раньше он жил в том же эффекте,
  // что и реакция на focus, и запускался через requestAnimationFrame — кадр не успевал
  // наступить: эффект пересоздавался (StrictMode + сброс focus) и отменял его каждый раз.
  // Здесь якорь — собственное состояние, которое никто извне не дёргает.
  // Позиционируем мгновенно ('auto', не 'smooth': повторные вызовы перезапускали бы
  // анимацию с текущей точки и она бы не доезжала) и повторяем, пока догружаются
  // данные кабинета и высота страницы ещё гуляет. Отпускаем сразу, как только
  // пользователь начал листать сам.
  useEffect(() => {
    if (!scrollTarget) return;

    const target = { tasks: tasksRef, raffle: raffleRef, course: courseRef, sc: scHistoryRef }[scrollTarget];
    const scroll = () => target.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
    scroll();

    const poll = setInterval(scroll, 200);
    const stop = setTimeout(() => setScrollTarget(null), FOCUS_SETTLE_MS);
    const releaseToUser = () => setScrollTarget(null);
    window.addEventListener('wheel', releaseToUser, { passive: true });
    window.addEventListener('touchstart', releaseToUser, { passive: true });

    return () => {
      clearInterval(poll);
      clearTimeout(stop);
      window.removeEventListener('wheel', releaseToUser);
      window.removeEventListener('touchstart', releaseToUser);
    };
  }, [scrollTarget]);

  // «Подписаться» в списке: открыть канал и показать рядом «Получить +30 SC»
  const openChannel = (id: EarnTaskId) => {
    const task = EARN_TASKS.find((t) => t.id === id);
    if (task) openExternal(task.url);
    setChannelOpened((prev) => ({ ...prev, [id]: true }));
  };

  const handleSubscribe = async (channelType: EarnTaskId) => {
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
        // Баланс в панели SC и условие розыгрыша «задание выполнено» — перечитать
        setRefreshKey(k => k + 1);
        
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
              <div style="font-size: 14px; opacity: 0.9;">+${data.bonus} SC за подписку на ${CHANNEL_NAMES[channelType]}</div>
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
        // Если бонус уже получен, обновляем состояние (раньше здесь звалась несуществующая
        // setSubscribeSuccess — ReferenceError уходил в catch и человек видел «Ошибка сети»)
        if (data.error && data.error.includes('уже получен')) {
          setTasksDone(prev => ({ ...prev, [channelType]: true }));
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

  // Оплаченный заказ: без него курс не начать (/api/start-course) — раздел «Мой курс» не показываем
  const eligibleOrder = myOrders.find((o: any) => PAID_STATUSES.includes(o.status));

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

  // Функция для проверки уже полученных бонусов подписки
  const checkSubscriptionBonuses = async () => {
    if (!user?.id) return;

    try {
      for (const ch of EARN_TASKS.map((t) => t.id)) {
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
    }
  }, [user?.id]);

  return (
    <div style={{ 
      maxWidth: "1000px", 
      margin: "0 auto", 
      padding: "clamp(10px, 3vw, 20px)",
      overflowX: "hidden",
      width: "100%",
      boxSizing: "border-box"
    }}>
      {/* Баланс крупно: «= N ₽ скидки», уровень, история, «Как это работает» */}
      <BonusHero userId={user?.id} refreshKey={refreshKey} onOpenHistory={openHistory} />

      {/* Розыгрыш: на главной от него только строка-ссылка сюда (RaffleTeaser) */}
      <div ref={raffleRef}>
        <RaffleBanner
          userId={user?.id}
          telegramId={user?.telegram_id}
          onOpenTasks={focusTasks}
          refreshKey={refreshKey}
        />
      </div>

      {/* «Как получить SC»: подписки, приглашение (бывшая «Реферальная система»), покупки, отчёт по курсу */}
      <div ref={tasksRef}>
        <EarnList
          tasksDone={tasksDone}
          opened={channelOpened}
          loading={subscribeLoading}
          onOpenChannel={openChannel}
          onClaim={handleSubscribe}
          showCourse={!!eligibleOrder || SHOW_GAMIFICATION}
          onOpenCourse={() => { setCourseSignal((n) => n + 1); setScrollTarget('course'); }}
          onOpenCatalog={() => onOpenCatalog?.()}
        >
          <ReferralPanel
            userId={user?.id}
            telegramId={user?.telegram_id}
            stats={referralStats}
            referralCode={referralCode}
            invitedCount={invitedCount}
            referralBonus={referralBonus}
            onClaimed={() => {
              fetchReferralStats();
              setRefreshKey(k => k + 1);
            }}
          />
        </EarnList>
      </div>

      {/* История SC: все начисления и списания. Ведут сюда «🧾 История ›» в шапке и кнопка бота (?open=sc) */}
      <div ref={scHistoryRef}>
        <ScHistorySection userId={user?.id} refreshKey={refreshKey} openSignal={historySignal} />
      </div>

      {/* «Мой курс»: бывшие «Начало курса» и «Еженедельные отметки» — одна кнопка «Я начал(а) курс»
          и отчёт раз в неделю. Бот зовёт сюда, когда заказ стал «✅ Доставлен» (lib/courseNotify.ts) */}
      <div ref={courseRef}>
        <CourseSection
          userId={user?.id}
          visible={!!eligibleOrder || SHOW_GAMIFICATION}
          forceOpen={courseFocus}
          openSignal={courseSignal}
          onSCUpdate={() => setRefreshKey(k => k + 1)}
        />
      </div>

      {/* Мотивационная привычка (награда Собирателя) — пока только тестировщикам */}
      {SHOW_GAMIFICATION && user?.id && (
        <MotivationalHabit
          userId={user.id}
          onSCUpdate={() => setRefreshKey(k => k + 1)}
        />
      )}

      {/* Мои заказы */}
      {myOrders.length > 0 && (
        <CabinetSection title="📦 Мои заказы" summary={`${myOrders.length}`} storageKey="spor3s_orders_open">
          {myOrders.map((order: any) => {
            const statusColor: Record<string, string> = {
              pending: "#ffc107", paid: "#00ff88", shipped: "#38bdf8", completed: "#8bc34a", cancelled: "#ff6b6b",
            };
            const st = { label: ORDER_STATUS_LABELS[order.status] || order.status || "—", color: statusColor[order.status] || "#ccc" };
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
        </CabinetSection>
      )}

    </div>
  );
} 