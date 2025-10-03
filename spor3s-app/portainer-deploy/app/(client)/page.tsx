"use client";
import React, { useState, useEffect } from "react";
import { CartProvider } from "../CartContext";
import Chat from "./chat";
import Cart from "./Cart";
import OrderForm from "../order-form";
import Dashboard from "../Dashboard";
import RoadMap from "./RoadMap"; // Добавлено: импорт Ваш прогресс
import MushroomTracker from "../../components/MushroomTracker"; // Добавлено: импорт трекера грибов
import MushroomTrackerPage from "../../components/MushroomTrackerPage"; // Добавлено: импорт страницы трекера

type Product = {
  id: string;
  name: string;
  price?: number;
  image?: string;
};

export default function MainApp() {
  const [currentStep, setCurrentStep] = useState(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [referralCode, setReferralCode] = useState<string | null>(null);

  const telegramUser = null;

  useEffect(() => {
    setMounted(true);
    fetchProducts();
    
    // Проверяем реферальную ссылку
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get('ref');
      if (ref) {
        setReferralCode(ref);
        localStorage.setItem('spor3s_referral', ref);
        console.log('🎯 Реферальный код найден:', ref);
      } else {
        // Проверяем localStorage на случай, если пользователь уже был на сайте
        const savedRef = localStorage.getItem('spor3s_referral');
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
    const initUser = async () => {
      const testUserId = `test-user-${Date.now()}`;
      try {
        const response = await fetch('/api/init-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            telegram_id: testUserId,
            referral_code: referralCode 
          }),
        });
        
        const data = await response.json();
        if (data.id) {
          setUserId(data.id);
          console.log('✅ Test user initialized:', data.id);
        }
      } catch (error) {
        console.error('❌ Test user init failed:', error);
      }
      setAuthLoading(false);
    };

    if (mounted) {
      initUser();
    }
  }, [mounted]);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      
      if (data.success && data.products) {
        setProducts((data.products || []) as Product[]);
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
      // Fallback products
      setProducts([
        { id: 'ezh100', name: 'Ежовик 100г', price: 1200, image: '/products/ezh100.jpg' },
        { id: 'mhm30', name: 'Мухомор 30г', price: 800, image: '/products/mhm30.jpg' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  const steps = [
    { id: 1, name: "🤖 AI Консультант", icon: "🤖" },
    { id: 2, name: "🛒 Каталог", icon: "🛒" },
    { id: 3, name: "👤 Личный кабинет", icon: "👤" },
    { id: 4, name: "📊 Ваш прогресс", icon: "📊" }
  ];

  const renderContent = () => {
    if (loading || authLoading) {
      return (
        <div style={{ 
          textAlign: "center", 
          padding: "50px",
          color: "#fff"
        }}>
          <div style={{ fontSize: 24, marginBottom: 15 }}>⏳</div>
          <div>{authLoading ? 'Авторизация...' : 'Загрузка...'}</div>
          {userId && (
            <div style={{ marginTop: 5, fontSize: 12, opacity: 0.6 }}>
              🆔 ID: {userId.slice(0, 8)}...
            </div>
          )}
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
          telegramUser={null}
        />;
      case 4:
        return <RoadMap user={{ 
          id: userId || 'loading',
          telegram_id: null,
          telegram_username: null,
          first_name: null,
          last_name: null
        }} />;

      case 10: // Специальный шаг для оформления заказа (доступен только через корзину)
        return <OrderForm 
          products={products} 
          setStep={setCurrentStep} 
          userId={userId}
          telegramUser={null}
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
          gap: 10,
          flexWrap: "wrap",
          width: "100%",
          maxWidth: "800px"
        }}>
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={() => setCurrentStep(step.id)}
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
                fontSize: "clamp(14px, 3vw, 16px)",
                fontWeight: currentStep === step.id ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.3s ease",
                boxShadow: currentStep === step.id 
                  ? "0 4px 15px rgba(255, 0, 204, 0.3)"
                  : "none",
                minWidth: "clamp(100px, 20vw, 120px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                flex: "1 1 auto"
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
              <span style={{ fontSize: "clamp(16px, 4vw, 18px)" }}>{step.icon}</span>
              <span style={{ 
                fontSize: "clamp(12px, 2.5vw, 14px)",
                display: window.innerWidth > 600 ? "inline" : "none"
              }}>
                {step.name.replace(/^[^\s]+ /, '')}
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