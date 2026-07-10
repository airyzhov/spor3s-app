"use client";
import Image from "next/image";
import styles from "../page.module.css";
import Chat from "./chat";
import Cart from "./Cart";
import Dashboard from "../Dashboard";
import RoadMap from "./RoadMap";
import OrderForm from "../order-form";
import LevelProgress from "../../components/LevelProgress";
import MotivationalHabit from "../../components/MotivationalHabit";
import SCGiftForm from "../../components/SCGiftForm";
import { useState, useEffect, useRef } from "react";
// Removed test AI agent control panel from main screen

type Product = {
  id: string;
  name: string;
  price: number;
  description?: string;
  image?: string;
};

type AppUser = {
  id: string;
  telegram_id: string;
  username?: string;
  first_name?: string;
  last_name?: string;
};

interface TelegramWebApp {
  initDataUnsafe?: {
    user?: {
      id: number;
      username?: string;
      first_name?: string;
      last_name?: string;
    };
  };
}

// Type declaration moved to global.d.ts to avoid conflicts

export default function AppClient() {
  const [user, setUser] = useState<AppUser | null>(null);
  // Стартовый экран — Каталог (шаг 2). AI-чат отключён до запуска (см. SHOW_AI ниже).
  const [currentStep, setCurrentStep] = useState<number>(2);
  const [products, setProducts] = useState<Product[]>([]);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  console.log("NEXT_PUBLIC_SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log("NEXT_PUBLIC_SUPABASE_ANON_KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  // Инициализация пользователя: берём реальный Telegram ID из WebApp
  useEffect(() => {
    if (!mounted) return;
    
    // Скрипт telegram-web-app.js подключён async и может загрузиться позже
    // первого рендера — без ожидания реальный покупатель из Telegram
    // успевает провалиться в dev-фоллбек и теряет бонусы/рефералку.
    const waitForTelegramWebApp = async (timeoutMs = 3000) => {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        try {
          if (typeof window !== 'undefined' && window.Telegram?.WebApp) return window.Telegram.WebApp;
        } catch {}
        await new Promise(r => setTimeout(r, 100));
      }
      return undefined;
    };

    const initUser = async () => {
      try {
        setError(null);
        // 1) Telegram WebApp контекст (ждём загрузки скрипта)
        const tg = await waitForTelegramWebApp();

        const tgUser = tg?.initDataUnsafe?.user;
        if (tgUser?.id) {
          const telegramId = String(tgUser.id);
          try {
            const response = await fetch('/api/init-user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ telegram_id: telegramId, username: tgUser.username })
            });
            const data = await response.json();
            if (response.ok && data?.id) {
              setUser({
                id: data.id,
                telegram_id: telegramId,
                username: tgUser.username,
                first_name: tgUser.first_name,
                last_name: tgUser.last_name
              });
              console.log('✅ Telegram user initialized:', data.id);
              return;
            }
          } catch (fetchError) {
            console.error('❌ Ошибка fetch при инициализации пользователя:', fetchError);
            // Продолжаем с dev-фоллбеком
          }
        }

        // 2) DEV-фоллбек (только если нет Telegram окружения).
        //    Id сохраняем в localStorage, чтобы не плодить нового юзера в БД
        //    на каждое открытие страницы.
        try {
          let devId = '';
          try {
            devId = localStorage.getItem('spor3s_dev_id') || '';
          } catch {}
          if (!devId) {
            devId = `dev-${Date.now()}`;
            try { localStorage.setItem('spor3s_dev_id', devId); } catch {}
          }
          const resp = await fetch('/api/init-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegram_id: devId })
          });
          const resData = await resp.json();
          if (resp.ok && resData?.id) {
            setUser({ id: resData.id, telegram_id: devId, username: 'dev-user' });
            console.log('⚙️ Dev user initialized:', resData.id);
          }
        } catch (devError) {
          console.error('❌ Ошибка dev-фоллбека:', devError);
          // Устанавливаем минимальный пользователь для работы приложения
          setUser({ id: 'temp-user', telegram_id: 'temp', username: 'temp-user' });
        }
      } catch (error) {
        console.error('❌ initUser failed:', error);
        // Не устанавливаем критическую ошибку, позволяем приложению работать
        const errorMessage = error instanceof Error ? error.message : 'Ошибка инициализации пользователя';
        console.warn('⚠️ Продолжаем работу с ограниченной функциональностью:', errorMessage);
        // Устанавливаем временного пользователя для работы приложения
        setUser({ id: 'temp-user', telegram_id: 'temp', username: 'temp-user' });
      }
    };
    initUser();
  }, [mounted]);

  // Загружаем продукты
  useEffect(() => {
    if (!mounted) return;
    
    const fetchProducts = async () => {
      try {
        setError(null);
        console.log('🛒 AppClient: Загружаем продукты...');
        const response = await fetch('/api/products');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        console.log('🛒 AppClient: Продукты загружены:', data.products);
        setProducts(data.products || []);
      } catch (error) {
        console.error('🛒 AppClient: Ошибка загрузки продуктов:', error);
        // Не устанавливаем критическую ошибку, используем пустой массив
        setProducts([]);
        console.warn('⚠️ Продолжаем работу без продуктов');
      }
    };
    fetchProducts();
  }, [mounted]);

  // Привязываем обработчики через addEventListener после монтирования
  // Fallback механизм удален - используем только onClick

  // Включить AI-консультанта обратно: поставить SHOW_AI = true
  const SHOW_AI = false;
  const steps = [
    ...(SHOW_AI ? [{ id: 1, name: "AI Консультант", icon: "🤖" }] : []),
    { id: 2, name: "Каталог", icon: "🛒" },
    { id: 3, name: "Бонусы", icon: "🎁" }
  ];

  // Обработчик клика (не используется, оставлен для совместимости)

  if (!mounted) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', color: '#fff' }}>
        <div style={{ fontSize: 24, marginBottom: 15 }}>⏳</div>
        <div>Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', color: '#fff' }}>
        <div style={{ fontSize: 24, marginBottom: 15, color: '#ff00cc' }}>⚠️</div>
        <div style={{ marginBottom: 15 }}>Ошибка: {error}</div>
        <button
          onClick={() => {
            setError(null);
            window.location.reload();
          }}
          style={{
            padding: '10px 20px',
            background: '#ff00cc',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Перезагрузить
        </button>
      </div>
    );
  }

  const renderContent = () => {
    console.log('🔘 renderContent вызван, currentStep:', currentStep);
    try {
      switch (currentStep) {
      case 1:
        return <Chat products={products || []} setStep={setCurrentStep} />;
      case 2:
        return <Cart products={products || []} setStep={setCurrentStep} />;
      case 3:
        return <RoadMap user={{ 
          id: user?.id || 'temp-user',
          telegram_id: user?.telegram_id || 'temp',
          telegram_username: user?.username,
          first_name: user?.first_name,
          last_name: user?.last_name
        }} />;
      case 10:
        return <OrderForm 
          products={products || []} 
          setStep={setCurrentStep} 
          userId={user?.id || 'temp-user'}
          telegramUser={user ? { 
            telegram_id: user.telegram_id, 
            first_name: user.first_name, 
            last_name: user.last_name, 
            username: user.username 
          } : null}
          cartItems={[]} // Добавляем пустой массив cartItems
        />;
      default:
        return <Cart products={products || []} setStep={setCurrentStep} />;
    }
    } catch (err) {
      console.error('❌ Ошибка рендеринга контента:', err);
      return (
        <div style={{ textAlign: 'center', padding: '50px', color: '#fff' }}>
          <div style={{ fontSize: 24, marginBottom: 15, color: '#ff00cc' }}>⚠️</div>
          <div>Ошибка загрузки контента</div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 15,
              padding: '10px 20px',
              background: '#ff00cc',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Перезагрузить
          </button>
        </div>
      );
    }
  };

  return (
      <div 
        className={styles.page} 
        style={{ 
          background: 'linear-gradient(135deg, #1a1a40 0%, #2d0b3a 25%, #4a1b5a 50%, #2d0b3a 75%, #1a1a40 100%)',
          position: 'relative',
          zIndex: 1
        }}
      >
        <header className={styles.header} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 16, padding: '16px 0' }}>
          <div className={styles.headerWrap}>
            <div className={styles.headerRow}>
              <img
                src="/logo.jpg"
                alt="logo"
                className={styles.logo}
                onError={(e) => {
                  const img = e.currentTarget;
                  // Если нет logo.jpg — показываем запасной logo.svg, иначе прячем
                  if (img.src.endsWith('/logo.jpg')) { img.src = '/logo.svg'; }
                  else { img.style.display = 'none'; }
                }}
                style={{
                  objectFit: 'contain',
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  display: 'block'
                }}
              />
              <div>
                <h1 className={styles.title}>СПОРС</h1>
                <div className={styles.subtitle}>Грибные добавки из Крыма</div>
              </div>
            </div>
          </div>
        </header>

        {/* Навигация */}
        <nav 
          ref={navRef}
          style={{
            display: "flex",
            justifyContent: "center",
            position: "relative",
            zIndex: 1000,
            pointerEvents: "auto",
            marginBottom: 30,
            gap: 10,
            flexWrap: "wrap",
            padding: "0 20px",
            position: "relative",
            zIndex: 10000,
            pointerEvents: "auto",
            isolation: "isolate"
          }}
        >
          {steps.map((step) => (
            <button
              key={`nav-btn-${step.id}`}
              data-step-id={step.id}
              type="button"
              onClick={() => {
                console.log('🔘 onClick вызван для:', step.id, step.name);
                setCurrentStep(step.id);
              }}
              style={{
                background: currentStep === step.id 
                  ? "linear-gradient(45deg, #ff00cc, #3333ff)"
                  : "rgba(255, 255, 255, 0.1)",
                cursor: "pointer",
                pointerEvents: "auto",
                position: "relative",
                zIndex: 1001,
                userSelect: "none",
                WebkitUserSelect: "none",
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
                isolation: "isolate",
                color: "#fff",
                border: currentStep === step.id 
                  ? "2px solid transparent" 
                  : "2px solid rgba(255, 255, 255, 0.2)",
                borderRadius: 25,
                padding: "12px 20px",
                fontSize: 16,
                fontWeight: currentStep === step.id ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.3s ease",
                boxShadow: currentStep === step.id 
                  ? "0 4px 15px rgba(255, 0, 204, 0.3)"
                  : "none",
                minWidth: 120,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                pointerEvents: "auto",
                position: "relative",
                zIndex: 9999,
                userSelect: "none",
                WebkitUserSelect: "none",
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
                isolation: "isolate"
              }}
            >
              <span style={{ fontSize: 18 }}>{step.icon}</span>
              <span>{step.name}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => window.open('https://t.me/web3grow', '_blank')}
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              color: "#fff",
              border: "2px solid rgba(255, 255, 255, 0.2)",
              borderRadius: 25,
              padding: "12px 20px",
              fontSize: 16,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.3s ease",
              minWidth: 120,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              pointerEvents: "auto",
              position: "relative",
              zIndex: 9999,
              userSelect: "none",
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent"
            }}
          >
            <span style={{ fontSize: 18 }}>💬</span>
            <span>Задать вопрос</span>
          </button>
        </nav>

        <main className={styles.main}>
          {/* Управление AI агентом — скрыто на проде */}
          
          {/* Основной контент */}
          <section className={styles.section}>
            {renderContent()}
          </section>
        </main>
        <footer className={styles.footer}>
          <span>© {new Date().getFullYear()} spor3s</span>
        </footer>
        
        {/* Стрелка вверх */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            width: "50px",
            height: "50px",
            background: "linear-gradient(45deg, #ff00cc, #3333ff)",
            color: "white",
            border: "none",
            borderRadius: "50%",
            fontSize: "20px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 15px rgba(255, 0, 204, 0.3)",
            transition: "transform 0.2s, box-shadow 0.2s",
            zIndex: 1000
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = "scale(1.1)";
            e.currentTarget.style.boxShadow = "0 6px 20px rgba(255, 0, 204, 0.4)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 4px 15px rgba(255, 0, 204, 0.3)";
          }}
        >
          ↑
        </button>
        
        <style jsx global>{`
@media (max-width: 600px) {
  .${styles.header} h1 {
    font-size: 16px !important;
    margin-bottom: 4px !important;
    margin-top: 0 !important;
  }
  .${styles.header} {
    flex-direction: row;
    align-items: flex-start;
    padding: 8px 0 !important;
  }
}`}</style>
      </div>
  );
} 