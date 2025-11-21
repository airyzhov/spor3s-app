"use client";
import React, { useState, useEffect } from "react";
import { CartProvider } from "../CartContext";
import Chat from "./chat";
import Cart from "./Cart";
import OrderForm from "../order-form";
import Dashboard from "../Dashboard";
import RoadMap from "./RoadMap"; // Добавлено: импорт Ваш прогресс
import { useTelegramUser } from "../../hooks/useTelegramUser";

type Product = {
  id: string;
  name: string;
  price?: number;
  image?: string;
  description?: string;
  [key: string]: any;
};

export default function MainApp() {
  const [currentStep, setCurrentStep] = useState(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [referralCode, setReferralCode] = useState<string | null>(null);

  
  const telegramUser = useTelegramUser();





  useEffect(() => {
    setMounted(true);
    fetchProducts();
    
    // Проверяем реферальную ссылку
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get('ref');
      if (ref) {
        setReferralCode(ref);
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem('spor3s_referral', ref);
        }
        console.log('🎯 Реферальный код найден:', ref);
      } else {
        // Проверяем localStorage на случай, если пользователь уже был на сайте
        const savedRef = (typeof window !== 'undefined' && window.localStorage) ? localStorage.getItem('spor3s_referral') : null;
        if (savedRef) {
          setReferralCode(savedRef);
          console.log('🎯 Реферальный код из localStorage:', savedRef);
        }
      }
    }
  }, []);

  // Загружаем реферальную статистику
  useEffect(() => {
    if (userId) {

    }
  }, [userId]);



  // Авторизация пользователя
  useEffect(() => {
    // Принудительно снимаем загрузку через 3 секунды максимум
    const forceTimeout = setTimeout(() => {
      console.warn('⚠️ Force timeout - stopping auth loading');
      setAuthLoading(false);
      if (!userId) {
        setUserId('guest-' + Date.now());
      }
    }, 3000);

    const initUser = async () => {
      // Таймаут для авторизации 2 секунды
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Auth timeout')), 2000)
      );

      try {
        // Оборачиваем логику в Promise.race с таймаутом
        await Promise.race([
          (async () => {
      if (!telegramUser?.telegram_id) {
        // Если Telegram данных нет, используем тестового пользователя
              // Но в браузере лучше пропустить этот шаг, чтобы не спамить тестовыми юзерами
              // Или сохранить в localStorage
              let testUserId = '';
              if (typeof window !== 'undefined') {
                 testUserId = localStorage.getItem('spor3s_test_user_id') || `test-user-${Date.now()}`;
                 localStorage.setItem('spor3s_test_user_id', testUserId);
              } else {
                 testUserId = `test-user-${Date.now()}`;
              }
              
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);
          
          const response = await fetch('/api/init-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              telegram_id: testUserId,
              referral_code: referralCode 
            }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          
                if (response.ok) {
          const data = await response.json();
          if (data.id) {
            setUserId(data.id);
            console.log('✅ Test user initialized:', data.id);
                  }
          }
        } catch (error) {
          console.error('❌ Test user init failed:', error);
          // Fallback: создаем временный ID для работы приложения
          setUserId('temp-' + Date.now());
        }
      } else {
        // Реальная авторизация через Telegram
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);
          
          const response = await fetch('/api/init-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              telegram_id: telegramUser.telegram_id,
              referral_code: referralCode 
            }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          
                if (response.ok) {
          const data = await response.json();
          if (data.id) {
            setUserId(data.id);
                    console.log('✅ Telegram user authenticated:', data.id);
                  }
          }
        } catch (error) {
          console.error('❌ Telegram auth failed:', error);
          // Fallback: создаем временный ID для работы приложения
          setUserId('temp-' + Date.now());
        }
      }
          })(),
          timeoutPromise
        ]);
      } catch (error) {
        console.error('⚠️ Auth timed out or failed:', error);
        // Fallback: создаем временный ID для работы приложения
        if (!userId) {
          setUserId('guest-' + Date.now());
        }
      } finally {
        // Всегда убираем загрузку, даже при ошибке
        clearTimeout(forceTimeout);
        setAuthLoading(false);
      }
    };

    if (mounted) {
      initUser();
    }
  }, [mounted, telegramUser]);

  const fetchProducts = async () => {
    // Принудительно снимаем загрузку через 3 секунды
    const forceTimeout = setTimeout(() => {
      console.warn('⚠️ Force timeout - stopping products loading');
      setLoading(false);
      if (products.length === 0) {
        setProducts([
          { id: 'ezh100', name: 'Ежовик 100г', price: 1200, image: '/products/ezh100.jpg' },
          { id: 'mhm30', name: 'Мухомор 30г', price: 800, image: '/products/mhm30.jpg' }
        ]);
      }
    }, 3000);

    try {
      // Уменьшаем таймаут до 2 секунд
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch('/api/products', { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error(`HTTP status ${response.status}`);
      
      const data = await response.json();
      
      if (data.success && data.products) {
        setProducts(data.products);
      } else {
        console.warn('Products API returned no data, using fallback');
        // Fallback products
        setProducts([
          { id: 'ezh100', name: 'Ежовик 100г', price: 1200, image: '/products/ezh100.jpg' },
          { id: 'mhm30', name: 'Мухомор 30г', price: 800, image: '/products/mhm30.jpg' }
        ]);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      // Fallback products on error
      setProducts([
        { id: 'ezh100', name: 'Ежовик 100г', price: 1200, image: '/products/ezh100.jpg' },
        { id: 'mhm30', name: 'Мухомор 30г', price: 800, image: '/products/mhm30.jpg' }
      ]);
    } finally {
      clearTimeout(forceTimeout);
      setLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  const steps = [
    { id: 1, name: "🤖 AI Консультант", icon: "🤖", shortName: "AI" },
    { id: 2, name: "🛒 Каталог", icon: "🛒", shortName: "Каталог" },
    { id: 3, name: "👤 Личный кабинет", icon: "👤", shortName: "Кабинет" },
    { id: 4, name: "📊 Ваш прогресс", icon: "📊", shortName: "Прогресс" }
  ];

  const renderContent = () => {
    // Показываем контент даже если идет загрузка - не блокируем пользователя
    // Только показываем загрузку если нет продуктов
    if (loading && products.length === 0) {
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
    
    // Если продукты есть, показываем контент даже если authLoading еще true
    if (authLoading && !userId && products.length === 0) {
      return (
        <div style={{ 
          textAlign: "center", 
          padding: "50px",
          color: "#fff"
        }}>
          <div style={{ fontSize: 24, marginBottom: 15 }}>⏳</div>
          <div>Авторизация...</div>
        </div>
      );
    }

    switch (currentStep) {
      case 1:
        return <Chat products={products} setStep={setCurrentStep} />;
      case 2:
        return <Cart products={products} setStep={setCurrentStep} />;
      case 3:
        return <Dashboard 
          setStep={setCurrentStep} 
          userId={userId} 
          telegramUser={telegramUser ? { telegram_id: telegramUser.telegram_id, first_name: telegramUser.first_name, last_name: telegramUser.last_name, username: telegramUser.username } : null}
        />;
      case 4:
        return <RoadMap user={{ 
          id: userId || 'loading',
          telegram_id: telegramUser?.telegram_id,
          telegram_username: telegramUser?.username,
          first_name: telegramUser?.first_name,
          last_name: telegramUser?.last_name
        }} />;

      case 10: // Специальный шаг для оформления заказа (доступен только через корзину)
        return <OrderForm 
          products={products} 
          setStep={setCurrentStep} 
          userId={userId}
          telegramUser={telegramUser ? { telegram_id: telegramUser.telegram_id, first_name: telegramUser.first_name, last_name: telegramUser.last_name, username: telegramUser.username } : null}
          cartItems={[]} // TODO: Получить данные из корзины
        />;
      default:
        return <Chat products={products} setStep={setCurrentStep} />;
    }
  };

  return (
    <CartProvider>
      <div style={{ 
        minHeight: "100vh", 
        padding: "20px",
        maxWidth: "1200px",
        margin: "0 auto",
        background: "transparent",
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
      }}>
        {/* Navigation */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: 30,
          gap: 8,
          flexWrap: "wrap",
          width: "100%",
          maxWidth: "800px"
        }}>
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={() => setCurrentStep(step.id)}
              title={step.name}
              style={{
                background: currentStep === step.id 
                  ? "linear-gradient(45deg, #ff00cc, #3333ff)"
                  : "rgba(255, 255, 255, 0.1)",
                color: "#fff",
                border: currentStep === step.id 
                  ? "2px solid transparent" 
                  : "2px solid rgba(255, 255, 255, 0.2)",
                borderRadius: 25,
                padding: "10px 14px",
                fontSize: "clamp(13px, 2.5vw, 15px)",
                fontWeight: currentStep === step.id ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.3s ease",
                boxShadow: currentStep === step.id 
                  ? "0 4px 15px rgba(255, 0, 204, 0.3)"
                  : "none",
                flex: "0 1 auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
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
              <span style={{ fontSize: "clamp(16px, 3.5vw, 18px)", flexShrink: 0 }}>{step.icon}</span>
              <span style={{ 
                fontSize: "clamp(11px, 2vw, 13px)",
                display: (typeof window !== 'undefined' && window.innerWidth > 500) ? "inline" : "none"
              }}>
                {step.shortName}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{
          background: "rgba(255, 255, 255, 0.02)",
          borderRadius: 20,
          padding: "clamp(15px, 4vw, 20px)",
          minHeight: 400,
          boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          width: "100%",
          maxWidth: "1000px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}>
          {renderContent()}
        </div>

        {/* Footer info */}
        <div style={{ 
          textAlign: "center", 
          marginTop: 30, 
          color: "#ccc", 
          fontSize: "clamp(12px, 3vw, 14px)",
          width: "100%",
          maxWidth: "800px"
        }}>
          <div style={{ marginBottom: 10 }}>
            🍄 spor3s - натуральные грибные добавки для здоровья
          </div>
          <div style={{ 
            display: "flex", 
            justifyContent: "center", 
            alignItems: "center",
            gap: 10
          }}>
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ccc',
                fontSize: "clamp(16px, 4vw, 20px)",
                cursor: 'pointer',
                transition: 'color 0.2s',
                padding: '5px'
              }}
              onMouseOver={(e) => { e.currentTarget.style.color = "#ff00cc"; }}
              onMouseOut={(e) => { e.currentTarget.style.color = "#ccc"; }}
              title="Вернуться наверх"
            >
              ⬆️
            </button>
          </div>
        </div>
      </div>
    </CartProvider>
  );
}