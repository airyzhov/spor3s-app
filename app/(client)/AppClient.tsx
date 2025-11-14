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
  const [currentStep, setCurrentStep] = useState<number>(1);
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
    
    const initUser = async () => {
      try {
        setError(null);
        // 1) Telegram WebApp контекст
        const tg = (typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined);
        const tgUser = tg?.initDataUnsafe?.user;
        if (tgUser?.id) {
          const telegramId = String(tgUser.id);
          const response = await fetch('/api/init-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegram_id: telegramId })
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
        }

        // 2) DEV-фоллбек (только если нет Telegram окружения)
        const devId = `dev-${Date.now()}`;
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
      } catch (error) {
        console.error('❌ initUser failed:', error);
        setError(error instanceof Error ? error.message : 'Ошибка инициализации пользователя');
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
        const data = await response.json();
        if (response.ok) {
          console.log('🛒 AppClient: Продукты загружены:', data.products);
          setProducts(data.products || []);
        } else {
          console.error('🛒 AppClient: Ошибка загрузки продуктов:', response.status);
        }
      } catch (error) {
        console.error('🛒 AppClient: Ошибка загрузки продуктов:', error);
        setError(error instanceof Error ? error.message : 'Ошибка загрузки продуктов');
      }
    };
    fetchProducts();
  }, [mounted]);

  // Привязываем обработчики через addEventListener после монтирования
  useEffect(() => {
    if (!mounted) {
      console.log('🔘 Компонент еще не смонтирован');
      return;
    }
    
    // Небольшая задержка для гарантии, что DOM готов
    const timeoutId = setTimeout(() => {
      if (!navRef.current) {
        console.log('🔘 navRef.current все еще null');
        return;
      }
      
      const buttons = navRef.current.querySelectorAll('button[data-step-id]');
      console.log('🔘 Найдено кнопок навигации:', buttons.length);
      
      if (buttons.length === 0) {
        console.warn('⚠️ Кнопки навигации не найдены!');
        return;
      }
      
      const handlers: Array<(e: Event) => void> = [];
      
      buttons.forEach((button) => {
        const stepId = parseInt(button.getAttribute('data-step-id') || '0');
        const handler = (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('🔘 КНОПКА КЛИКНУТА через addEventListener:', stepId);
          setCurrentStep(stepId);
        };
        button.addEventListener('click', handler, { capture: true });
        handlers.push(handler);
        console.log('🔘 Обработчик addEventListener привязан к кнопке:', stepId);
      });
      
      return () => {
        buttons.forEach((button, index) => {
          const handler = handlers[index];
          if (handler) {
            button.removeEventListener('click', handler, { capture: true });
          }
        });
      };
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [mounted]);

  const steps = [
    { id: 1, name: "AI Консультант", icon: "🤖" },
    { id: 2, name: "Каталог", icon: "🛒" },
    { id: 3, name: "Ваш прогресс", icon: "📊" }
  ];

  // Простой обработчик клика - без useCallback для тестирования
  const handleStepClick = (stepId: number) => {
    console.log('🔘 handleStepClick вызван:', stepId);
    console.log('🔘 Текущий шаг:', currentStep);
    setCurrentStep(stepId);
    console.log('🔘 setCurrentStep вызван с:', stepId);
  };

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
        return <Chat products={products} setStep={setCurrentStep} />;
      case 2:
        return <Cart products={products} setStep={setCurrentStep} />;
      case 3:
        return <RoadMap user={{ 
          id: user?.id,
          telegram_id: user?.telegram_id,
          telegram_username: user?.username,
          first_name: user?.first_name,
          last_name: user?.last_name
        }} />;
      case 10:
        return <OrderForm 
          products={products} 
          setStep={setCurrentStep} 
          userId={user?.id}
          telegramUser={user ? { 
            telegram_id: user.telegram_id, 
            first_name: user.first_name, 
            last_name: user.last_name, 
            username: user.username 
          } : null}
          cartItems={[]} // Добавляем пустой массив cartItems
        />;
      default:
        return <Chat products={products} setStep={setCurrentStep} />;
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
        {/* ТЕСТОВАЯ КНОПКА для проверки работы */}
        <button
          onClick={() => {
            alert('ТЕСТОВАЯ КНОПКА РАБОТАЕТ! Текущий шаг: ' + currentStep);
            setCurrentStep(2);
          }}
          style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            zIndex: 99999,
            background: '#ff00cc',
            color: 'white',
            padding: '10px',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          ТЕСТ
        </button>
        
        <header className={styles.header} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 16, padding: '16px 0' }}>
          <div className={styles.headerWrap}>
            <div className={styles.headerRow}>
              <img 
                src="/logo.png" 
                alt="logo" 
                className={styles.logo}
                style={{
                  objectFit: 'contain',
                  width: '54px',
                  height: '54px',
                  display: 'block'
                }}
              />
              <div>
                <h1 className={styles.title}>ИИ + ГРИБЫ</h1>
                <div className={styles.subtitle}>для твоего развития</div>
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
            marginBottom: 30,
            gap: 10,
            flexWrap: "wrap",
            padding: "0 20px",
            position: "relative",
            zIndex: 9999,
            pointerEvents: "auto",
            isolation: "isolate"
          }}
        >
          {steps.map((step) => (
            <button
              key={`nav-btn-${step.id}`}
              data-step-id={step.id}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔘 onClick (React) вызван для:', step.id, step.name);
                console.log('🔘 Событие:', e);
                console.log('🔘 Текущий шаг до:', currentStep);
                setCurrentStep(step.id);
                console.log('🔘 setCurrentStep вызван напрямую с:', step.id);
              }}
              style={{
                background: currentStep === step.id 
                  ? "linear-gradient(45deg, #ff00cc, #3333ff)"
                  : "rgba(255, 255, 255, 0.1)",
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