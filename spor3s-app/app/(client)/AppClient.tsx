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
import { useState, useEffect } from "react";
import { CartProvider } from "../CartContext";
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
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Устанавливаем mounted сразу при монтировании
    setMounted(true);
    // Логируем только на клиенте
    if (typeof window !== 'undefined') {
      console.log("✅ AppClient mounted");
      console.log("NEXT_PUBLIC_SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
      console.log("NEXT_PUBLIC_SUPABASE_ANON_KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '***' : 'undefined');
    }
  }, []);

  // Инициализация пользователя: берём реальный Telegram ID из WebApp
  useEffect(() => {
    if (!mounted) return;
    
    let isMounted = true;
    let userCreated = false;

    // Принудительно снимаем загрузку через 3 секунды максимум
    const forceTimeout = setTimeout(() => {
      if (!isMounted) return;
      console.warn('⚠️ Force timeout - stopping auth loading');
      setAuthLoading(false);
      if (!userCreated) {
        // Создаем временного пользователя если авторизация не удалась
        setUser({ id: 'guest-' + Date.now(), telegram_id: 'guest', username: 'guest' });
        userCreated = true;
      }
    }, 3000);

    const initUser = async () => {
      // Уменьшаем timeout до 2 секунд
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Auth timeout')), 2000)
      );

      try {
        await Promise.race([
          (async () => {
            try {
              // 1) Telegram WebApp контекст
              const tg = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : undefined;
              const tgUser = tg?.initDataUnsafe?.user;
              console.log('🔍 TG WebApp check:', { tgAvailable: !!tg, userAvailable: !!tgUser });
              
              if (tgUser?.id) {
                const telegramId = String(tgUser.id);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 4000);
                
                try {
                  const response = await fetch('/api/init-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ telegram_id: telegramId }),
                    signal: controller.signal
                  });
                  clearTimeout(timeoutId);
                  
                  if (!response.ok) {
                    throw new Error(`API error: ${response.status}`);
                  }
                  
                  const data = await response.json();
                  if (data?.id && isMounted) {
                    setUser({
                      id: data.id,
                      telegram_id: telegramId,
                      username: tgUser.username,
                      first_name: tgUser.first_name,
                      last_name: tgUser.last_name
                    });
                    userCreated = true;
                    console.log('✅ Telegram user initialized:', data.id);
                    return;
                  }
                } catch (fetchError: any) {
                  clearTimeout(timeoutId);
                  if (fetchError.name === 'AbortError') {
                    console.warn('⚠️ API timeout, using fallback');
                  } else {
                    console.error('❌ API error:', fetchError);
                  }
                  throw fetchError;
                }
              }

              // 2) DEV-фоллбек (только если нет Telegram окружения)
              let devId = '';
              if (typeof window !== 'undefined') {
                 devId = localStorage.getItem('spor3s_dev_user_id') || `dev-${Date.now()}`;
                 localStorage.setItem('spor3s_dev_user_id', devId);
              } else {
                 devId = `dev-${Date.now()}`;
              }
              
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 4000);
              
              try {
                const resp = await fetch('/api/init-user', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ telegram_id: devId }),
                  signal: controller.signal
                });
                clearTimeout(timeoutId);
                
                if (resp.ok && isMounted) {
                  const resData = await resp.json();
                  if (resData?.id) {
                    setUser({ id: resData.id, telegram_id: devId, username: 'dev-user' });
                    userCreated = true;
                    console.log('⚙️ Dev user initialized:', resData.id);
                    return;
                  }
                }
              } catch (fetchError: any) {
                clearTimeout(timeoutId);
                console.error('❌ Dev user init failed:', fetchError);
              }
              
              // Финальный fallback - создаем временного пользователя
              if (isMounted && !userCreated) {
                console.warn('⚠️ Using temporary user');
                setUser({ id: 'temp-' + Date.now(), telegram_id: devId, username: 'temp-user' });
                userCreated = true;
              }
            } catch (error) {
              console.error('❌ User init error:', error);
              // В случае ошибки создаем временного пользователя
              if (isMounted && !userCreated) {
                const tempId = 'temp-' + Date.now();
                setUser({ id: tempId, telegram_id: tempId, username: 'temp-user' });
                userCreated = true;
              }
            }
          })(),
          timeoutPromise
        ]);
      } catch (error) {
        console.error('❌ initUser failed or timed out:', error);
        // В случае таймаута создаем временного пользователя
        if (isMounted && !userCreated) {
          const tempId = 'guest-' + Date.now();
          setUser({ id: tempId, telegram_id: tempId, username: 'guest' });
          userCreated = true;
        }
      } finally {
        clearTimeout(forceTimeout);
        if (isMounted) {
          setAuthLoading(false);
        }
      }
    };
    initUser();
    
    return () => {
      isMounted = false;
      clearTimeout(forceTimeout);
    };
  }, [mounted]);

  // Загружаем продукты
  useEffect(() => {
    if (!mounted) return;
    
    let isMounted = true;
    let productsLoaded = false;

    // Принудительно снимаем загрузку через 3 секунды
    const forceTimeout = setTimeout(() => {
      if (!isMounted) return;
      console.warn('⚠️ Force timeout - stopping products loading');
      setLoading(false);
      if (!productsLoaded) {
        // Устанавливаем fallback продукты
        setProducts([
          { id: 'ezh100', name: 'Ежовик 100г', price: 1200, image: '/products/ezh100.jpg' },
          { id: 'mhm30', name: 'Мухомор 30г', price: 800, image: '/products/mhm30.jpg' }
        ]);
        productsLoaded = true;
      }
    }, 3000);

    const fetchProducts = async () => {
      try {
        console.log('🛒 AppClient: Загружаем продукты...');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        
        const response = await fetch('/api/products', { signal: controller.signal });
        clearTimeout(timeoutId);
        
        const data = await response.json();
        if (response.ok && data.products && isMounted) {
          console.log('🛒 AppClient: Продукты загружены:', data.products);
          setProducts(data.products || []);
          productsLoaded = true;
        } else {
          console.error('🛒 AppClient: Ошибка загрузки продуктов:', response.status);
          setProducts([
            { id: 'ezh100', name: 'Ежовик 100г', price: 1200, image: '/products/ezh100.jpg' },
            { id: 'mhm30', name: 'Мухомор 30г', price: 800, image: '/products/mhm30.jpg' }
          ]);
        }
      } catch (error) {
        console.error('🛒 AppClient: Ошибка загрузки продуктов:', error);
        if (isMounted && !productsLoaded) {
          setProducts([
            { id: 'ezh100', name: 'Ежовик 100г', price: 1200, image: '/products/ezh100.jpg' },
            { id: 'mhm30', name: 'Мухомор 30г', price: 800, image: '/products/mhm30.jpg' }
          ]);
          productsLoaded = true;
        }
      } finally {
        clearTimeout(forceTimeout);
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    fetchProducts();
    
    return () => {
      isMounted = false;
      clearTimeout(forceTimeout);
    };
  }, [mounted]);

  const steps = [
    { id: 1, name: "AI Консультант", icon: "🤖" },
    { id: 2, name: "Каталог", icon: "🛒" },
    { id: 3, name: "Ваш прогресс", icon: "📊" }
  ];

  const renderContent = () => {
    // Показываем загрузку только если ничего не загружено
    // После 2 секунд показываем контент с fallback данными
    if (loading && products.length === 0 && authLoading && !user) {
      return (
        <div style={{ 
          textAlign: "center", 
          padding: "50px",
          color: "#fff"
        }}>
          <div style={{ fontSize: 24, marginBottom: 15 }}>⏳</div>
          <div>Загрузка...</div>
        </div>
      );
    }
    
    // Если есть хотя бы продукты или пользователь, показываем контент
    // Не блокируем пользователя ожиданием полной загрузки

    // Обеспечиваем безопасные значения для всех компонентов
    const safeProducts = Array.isArray(products) && products.length > 0 ? products : [
      { id: 'ezh100', name: 'Ежовик 100г', price: 1200, image: '/products/ezh100.jpg' },
      { id: 'mhm30', name: 'Мухомор 30г', price: 800, image: '/products/mhm30.jpg' }
    ];
    const safeUser = user || { 
      id: 'guest-' + Date.now(), 
      telegram_id: 'guest', 
      username: 'guest',
      first_name: 'Гость',
      last_name: ''
    };

    try {
      switch (currentStep) {
        case 1:
          return <Chat products={safeProducts} setStep={setCurrentStep} />;
        case 2:
          return <Cart products={safeProducts} setStep={setCurrentStep} />;
        case 3:
          return <RoadMap user={{ 
            id: safeUser.id,
            telegram_id: safeUser.telegram_id,
            telegram_username: safeUser.username,
            first_name: safeUser.first_name,
            last_name: safeUser.last_name
          }} />;
        case 10:
          return <OrderForm 
            products={safeProducts} 
            setStep={setCurrentStep} 
            userId={safeUser.id}
            telegramUser={{ 
              telegram_id: safeUser.telegram_id, 
              first_name: safeUser.first_name || '', 
              last_name: safeUser.last_name || '', 
              username: safeUser.username || ''
            }}
            cartItems={[]}
          />;
        default:
          return <Chat products={safeProducts} setStep={setCurrentStep} />;
      }
    } catch (error: any) {
      console.error('Error rendering content:', error);
      return (
        <div style={{ 
          textAlign: "center", 
          padding: "50px",
          color: "#fff"
        }}>
          <div style={{ fontSize: 24, marginBottom: 15 }}>⚠️</div>
          <div>Ошибка загрузки компонента</div>
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
            {error?.message || 'Неизвестная ошибка'}
          </div>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              marginTop: 20,
              padding: "10px 20px",
              background: "#ff00cc",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer"
            }}
          >
            Перезагрузить
          </button>
        </div>
      );
    }
  };


  if (!mounted) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        color: '#fff',
        background: 'linear-gradient(135deg, #1a1a40 0%, #2d0b3a 25%, #4a1b5a 50%, #2d0b3a 75%, #1a1a40 100%)'
      }}>
        <div>Загрузка...</div>
      </div>
    );
  }

  // Обеспечиваем что есть хотя бы минимальные данные для работы
  const safeProducts = products.length > 0 ? products : [
    { id: 'ezh100', name: 'Ежовик 100г', price: 1200, image: '/products/ezh100.jpg' },
    { id: 'mhm30', name: 'Мухомор 30г', price: 800, image: '/products/mhm30.jpg' }
  ];
  const safeUser = user || { id: 'guest-' + Date.now(), telegram_id: 'guest', username: 'guest' };

  return (
    <CartProvider>
        <div className={styles.page} style={{ background: 'linear-gradient(135deg, #1a1a40 0%, #2d0b3a 25%, #4a1b5a 50%, #2d0b3a 75%, #1a1a40 100%)' }}>
        <header className={styles.header} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 16, padding: '16px 0' }}>
          <div className={styles.headerWrap}>
            <div className={styles.headerRow}>
              <img src="/logo.png" alt="logo" className={styles.logo} />
              <div>
                <h1 className={styles.title}>ИИ + ГРИБЫ</h1>
                <div className={styles.subtitle}>для твоего развития</div>
              </div>
            </div>
          </div>
        </header>

        {/* Навигация */}
        <nav style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: 30,
          gap: 10,
          flexWrap: "wrap",
          padding: "0 20px"
        }}>
          {steps.map((step) => (
            <button
              key={step.id}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔘 Кнопка нажата:', step.id, step.name);
                setCurrentStep(step.id);
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
                zIndex: 10,
                position: "relative"
              }}
              onMouseOver={(e) => {
                if (currentStep !== step.id) {
                  const target = e.currentTarget as HTMLButtonElement;
                  target.style.background = "rgba(255, 255, 255, 0.15)";
                  target.style.transform = "translateY(-2px)";
                }
              }}
              onMouseOut={(e) => {
                if (currentStep !== step.id) {
                  const target = e.currentTarget as HTMLButtonElement;
                  target.style.background = "rgba(255, 255, 255, 0.1)";
                  target.style.transform = "translateY(0)";
                }
              }}
            >
              <span style={{ fontSize: 18 }}>{step.icon}</span>
              <span>{step.name}</span>
            </button>
          ))}
        </nav>

        <main className={styles.main}>
          {/* Основной контент */}
          <section className={styles.section}>
            {(() => {
              try {
                return renderContent();
              } catch (error: any) {
                console.error('Error in renderContent:', error);
                return (
                  <div style={{ 
                    textAlign: "center", 
                    padding: "50px",
                    color: "#fff"
                  }}>
                    <div style={{ fontSize: 24, marginBottom: 15 }}>⚠️</div>
                    <div>Ошибка загрузки компонента</div>
                    <div style={{ marginTop: 10, fontSize: 14, opacity: 0.8 }}>
                      {error?.message || 'Неизвестная ошибка'}
                    </div>
                    <button 
                      onClick={() => window.location.reload()} 
                      style={{
                        marginTop: 20,
                        padding: "10px 20px",
                        background: "#ff00cc",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer"
                      }}
                    >
                      Перезагрузить
                    </button>
                  </div>
                );
              }
            })()}
          </section>
        </main>
        <footer className={styles.footer}>
          <span>© {new Date().getFullYear()} spor3s</span>
        </footer>
        
        {/* Стрелка вверх */}
        <button
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
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
    </CartProvider>
  );
}