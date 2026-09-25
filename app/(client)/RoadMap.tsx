"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import TasksBanner from "./TasksBanner";
import RaffleBanner from "./RaffleBanner";
import ScStatus from "./ScStatus";
import CopyLinkButton from "./CopyLinkButton";
import MotivationalHabit from "../../components/MotivationalHabit";
import CabinetSection from "./CabinetSection";
import CourseSection from "./CourseSection";
import { openExternal } from "../../lib/openExternal";
import { referralLink, referralShareUrl, REFERRAL_TERMS } from "../../lib/referralLink";
import { REFERRAL_WELCOME_SC } from "../../lib/levelUtils";
import InviterCodeForm from "./InviterCodeForm";
import { isGamificationTester } from "../../lib/testers";
import { ORDER_STATUS_LABELS, PAID_STATUSES } from "../../lib/orderStatus";

interface RoadMapProps {
  user: any;
  focus?: 'tasks' | 'raffle' | 'course' | null;
  onFocusHandled?: () => void;
}

// Задания: подписки на каналы, бонус за каждое — TASK_BONUS SC
const TASK_BONUS = 30;
// Сколько удерживать блок заданий в поле зрения, пока догружается контент кабинета.
const FOCUS_SETTLE_MS = 2500;
const TASKS = [
  { id: 'telegram', icon: '📱', title: 'Telegram канал', desc: 'Подпишитесь на t.me/spor3s', url: 'https://t.me/spor3s', btnColor: 'linear-gradient(45deg, #0088cc, #00a8ff)' },
  { id: 'youtube', icon: '📺', title: 'YouTube канал', desc: 'Подпишитесь на @spor3s', url: 'https://www.youtube.com/@spor3s', btnColor: 'linear-gradient(45deg, #ff0000, #cc0000)' },
  { id: 'instagram', icon: '📸', title: 'Instagram', desc: 'Подпишитесь на @alex.spor3s', url: 'https://instagram.com/alex.spor3s', btnColor: 'linear-gradient(45deg, #e1306c, #f77737)' },
];

export default function RoadMap({ user, focus, onFocusHandled }: RoadMapProps) {
  // Тестировщики (lib/testers.ts — аккаунт владельца) видят то, что покупателям ещё не показываем: привычку
  const SHOW_GAMIFICATION = isGamificationTester(user?.telegram_id);
  // Растёт после начисления за задание: панель SC и розыгрыш наверху перечитывают свои данные
  const [refreshKey, setRefreshKey] = useState(0);
  // Пришли со строки розыгрыша на главной — карточка розыгрыша открыта сразу
  const [raffleExpand, setRaffleExpand] = useState(false);
  const raffleRef = useRef<HTMLDivElement>(null);
  const [referralSC, setReferralSC] = useState(0);

  const [subscribeLoading, setSubscribeLoading] = useState<string | null>(null);
  const [tasksDone, setTasksDone] = useState<Record<string, boolean>>({});
  const [tasksOpen, setTasksOpen] = useState(false);
  // Пришли по кнопке бота «Отметить начало курса» (?open=course) — раздел курса раскрыт сразу
  const [courseFocus, setCourseFocus] = useState(false);
  const courseRef = useRef<HTMLDivElement>(null);

  const [referralStats, setReferralStats] = useState<any>(null);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [referralBonus, setReferralBonus] = useState(0);
  const [invitedCount, setInvitedCount] = useState(0);
  const tasksRef = useRef<HTMLDivElement>(null);
  const [scrollTarget, setScrollTarget] = useState<'tasks' | 'course' | null>(null);

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
  const focusTasks = useCallback(() => {
    setTasksOpen(true);
    setScrollTarget('tasks');
  }, []);

  // Приход с главного экрана. focus сбрасываем сразу: сам скролл живёт на
  // локальном scrollTarget, поэтому сброс пропа его не обрывает.
  // Розыгрыш — первый блок кабинета, над ним ничего не догружается: хватает одного скролла.
  useEffect(() => {
    if (focus === 'tasks') {
      focusTasks();
    } else if (focus === 'raffle') {
      setRaffleExpand(true);
      raffleRef.current?.scrollIntoView({ behavior: 'auto', block: 'nearest' });
    } else if (focus === 'course') {
      setCourseFocus(true);
      setScrollTarget('course');
    } else {
      return;
    }
    onFocusHandled?.();
  }, [focus, focusTasks]);

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

    const target = scrollTarget === 'course' ? courseRef : tasksRef;
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
      {/* Розыгрыш — первым: на главной от него осталась только строка-ссылка сюда (RaffleTeaser) */}
      <div ref={raffleRef}>
        <RaffleBanner
          userId={user?.id}
          telegramId={user?.telegram_id}
          onOpenTasks={focusTasks}
          expand={raffleExpand}
          refreshKey={refreshKey}
        />
      </div>

      {/* SC, друзья, уровень и как заработать SC (раньше — на главном экране) */}
      <ScStatus userId={user?.id} refreshKey={refreshKey} />

      {/* Плашка невыполненных заданий: клик раскрывает блок заданий ниже */}
      <TasksBanner
        left={TASKS.length - Object.values(tasksDone).filter(Boolean).length}
        bonusPerTask={TASK_BONUS}
        onClick={() => { focusTasks(); }}
        style={{ marginBottom: 20 }}
      />

      {/* «Мой курс»: бывшие «Начало курса» и «Еженедельные отметки» — одна кнопка «Я начал(а) курс»
          и отчёт раз в неделю. Бот зовёт сюда, когда заказ стал «✅ Доставлен» (lib/courseNotify.ts) */}
      <div ref={courseRef}>
        <CourseSection
          userId={user?.id}
          visible={!!eligibleOrder || SHOW_GAMIFICATION}
          forceOpen={courseFocus}
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

      {/* Реферальная система */}
      <CabinetSection
        title="🎁 Реферальная система"
        summary={referralStats?.canEnterInviterCode ? `код друга → +${REFERRAL_WELCOME_SC} SC` : `приглашено: ${invitedCount}`}
        storageKey="spor3s_referral_open"
      >
      <div style={{ textAlign: "center" }}>
        <div style={{
          color: "#fff",
          fontSize: "clamp(14px, 3.5vw, 16px)",
          lineHeight: "1.5",
          marginBottom: "20px",
          wordBreak: "break-word"
        }}>
          {REFERRAL_TERMS}
        </div>

        {/* Кто пригласил — или поле «Код друга» для того, кто пришёл без ссылки и ещё не покупал */}
        {referralStats?.invitedBy ? (
          <div style={{ marginBottom: 15, fontSize: "clamp(13px, 3.3vw, 15px)", color: "#10b981", fontWeight: 600 }}>
            🤝 Вас пригласил {referralStats.invitedBy.name}
            {referralStats.invitedBy.welcomeSc > 0 && ` · 🎁 +${referralStats.invitedBy.welcomeSc} SC`}
          </div>
        ) : referralStats?.canEnterInviterCode && user?.id ? (
          <InviterCodeForm
            userId={user.id}
            onClaimed={() => {
              fetchReferralStats();
              setRefreshKey(k => k + 1);
            }}
          />
        ) : null}

        {/* Персональная ссылка: друг кликает → бот сразу привязывает его к вам */}
        {referralLink(user?.telegram_id) && (() => {
          const refLink = referralLink(user.telegram_id)!;
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
                <CopyLinkButton
                  link={refLink}
                  label="📋 Скопировать"
                  style={{
                    background: "#ff00cc", color: "#fff", border: "none", borderRadius: 8,
                    padding: "8px 16px", fontSize: "clamp(12px, 3vw, 14px)", fontWeight: 700, cursor: "pointer"
                  }}
                />
                <button
                  onClick={() => openExternal(referralShareUrl(user.telegram_id)!)}
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
        {!referralLink(user?.telegram_id) && (
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
              onClick={() => openExternal('https://t.me/spor3sbot')}
              style={{ color: "#00a8ff", textDecoration: "underline", cursor: "pointer", fontWeight: 700 }}
            >
              @spor3sbot
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
              {referralLink(user?.telegram_id)
                ? "Или ваш код — друг введёт его в кабинете или при заказе:"
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
      </CabinetSection>

      {/* Задания (свёрнуты по умолчанию) */}
      <div ref={tasksRef} style={{
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

    </div>
  );
} 