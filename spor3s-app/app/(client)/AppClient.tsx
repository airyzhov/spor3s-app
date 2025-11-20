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

  useEffect(() => {
    setMounted(true);
  }, []);

  console.log("NEXT_PUBLIC_SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log("NEXT_PUBLIC_SUPABASE_ANON_KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  // Инициализация пользователя: берём реальный Telegram ID из WebApp
  useEffect(() => {
    const initUser = async () => {
      // Таймаут для авторизации 15 секунд
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Auth timeout')), 15000)
      );

      try {
        await Promise.race([
          (async () => {
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
            // Используем localStorage для dev-user
            let devId = '';
            if (typeof window !== 'undefined') {
               devId = localStorage.getItem('spor3s_dev_user_id') || `dev-${Date.now()}`;
               localStorage.setItem('spor3s_dev_user_id', devId);
            } else {
               devId = `dev-${Date.now()}`;
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
          })(),
          timeoutPromise
        ]);
      } catch (error) {
        console.error('❌ initUser failed or timed out:', error);
      }
    };
    initUser();
  }, []);

  // Загружаем продукты
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        console.log('🛒 AppClient: Загружаем продукты...');
        // Добавляем таймаут 10 секунд
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch('/api/products', { signal: controller.signal });
        clearTimeout(timeoutId);
        
        const data = await response.json();
        if (response.ok) {
          console.log('🛒 AppClient: Продукты загружены:', data.products);
          setProducts(data.products || []);
        } else {
          console.error('🛒 AppClient: Ошибка загрузки продуктов:', response.status);
          // Fallback products
          setProducts([
            { id: 'ezh100', name: 'Ежовик 100г', price: 1200, image: '/products/ezh100.jpg' },
            { id: 'mhm30', name: 'Мухомор 30г', price: 800, image: '/products/mhm30.jpg' }
          ]);
        }
      } catch (error) {
        console.error('🛒 AppClient: Ошибка загрузки продуктов:', error);
        // Fallback products
        setProducts([
          { id: 'ezh100', name: 'Ежовик 100г', price: 1200, image: '/products/ezh100.jpg' },
          { id: 'mhm30', name: 'Мухомор 30г', price: 800, image: '/products/mhm30.jpg' }
        ]);
      }
    };
    fetchProducts();
  }, []);

  const steps = [
    { id: 1, name: "AI Консультант", icon: "🤖" },
    { id: 2, name: "Каталог", icon: "🛒" },
    { id: 3, name: "Ваш прогресс", icon: "📊" }
  ];

  const renderContent = () => {
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
  };

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