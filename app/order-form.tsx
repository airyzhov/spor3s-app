"use client";
import { useState, useEffect } from "react";

interface OrderFormProps {
  products?: any[];
  setStep?: (step: number) => void;
  userId?: string | null;
  telegramUser?: {
    telegram_id: string;
    first_name?: string;
    last_name?: string;
    username?: string;
  } | null;
  cartItems?: any[]; // Добавляем данные корзины
}

const initialSurvey = {
  stress: 5,
  anxiety: 5,
  joy: 5,
  pointA: "",
  progress: 5,
  referral: "",
  source: "",
  cdek_address: "",
  fio: "",
  phone: "",
  delivery_type: "cdek", // Добавляем тип доставки
  delivery_address: "" // Добавляем адрес доставки
};

export default function OrderForm({ products = [], setStep, userId, telegramUser, cartItems = [] }: OrderFormProps) {
  const [localProducts, setLocalProducts] = useState(products);
  const [selectedItems, setSelectedItems] = useState(cartItems);
  const [survey, setSurvey] = useState(initialSurvey);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  // Добавляем обработку ошибок
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('OrderForm Error:', event.error);
      setError('Произошла ошибка в приложении. Попробуйте перезагрузить страницу.');
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  useEffect(() => {
    setMounted(true);
    
    // Загружаем данные корзины из localStorage
    const savedCartItems = localStorage.getItem('spor3s_cart_items');
    if (savedCartItems) {
      try {
        const parsedCart = JSON.parse(savedCartItems);
        setSelectedItems(Array.isArray(parsedCart) ? parsedCart : []);
        console.log('🛒 Loaded cart items from localStorage:', parsedCart);
      } catch (error) {
        console.error('Error parsing cart items:', error);
        setSelectedItems(cartItems);
      }
    } else {
      setSelectedItems(cartItems);
    }
    
    // Если products не переданы или пусты, загружаем их самостоятельно
    if (!products || products.length === 0) {
      fetch("/api/products")
        .then(r => r.json())
        .then(d => setLocalProducts(Array.isArray(d.products) ? d.products : []))
        .catch(err => {
          console.error('Error loading products:', err);
          // Fallback products
          setLocalProducts([
            { id: 'ezh100', name: 'Ежовик 100г порошок', price: 1200 },
            { id: 'ezh120k', name: 'Ежовик 120 капсул', price: 1500 },
            { id: 'mhm30', name: 'Мухомор 30г', price: 800 },
            { id: 'mhm50', name: 'Мухомор 50г', price: 1200 },
            { id: 'mhm100', name: 'Мухомор 100г', price: 2000 },
          ]);
        });
    } else {
      setLocalProducts(products);
    }

    console.log('📋 OrderForm loaded with props:', {
      userId: userId ? userId.slice(0, 12) + '...' : 'NULL',
      telegramUser: telegramUser ? telegramUser.telegram_id : 'NULL',
      productsCount: products?.length || 0,
      cartItemsCount: selectedItems.length
    });
  }, [products, userId, telegramUser, cartItems]);

  // Проверяем, что компонент загружен
  if (!mounted) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '200px',
        color: '#fff',
        fontSize: '18px'
      }}>
        Загрузка формы заказа...
      </div>
    );
  }

  // Определяем тип пользователя и его данные
  const isRealTelegram = telegramUser && telegramUser.telegram_id && !telegramUser.telegram_id.startsWith('test-user-');
  const displayName = isRealTelegram 
    ? `${telegramUser.first_name || 'Пользователь'} ${telegramUser.last_name || ''}`.trim()
    : 'Тестовый пользователь';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Проверяем обязательные поля для заказа
    if (!survey.fio || !survey.phone) {
      setError("❌ Пожалуйста, заполните ФИО и номер телефона для оформления заказа.");
      return;
    }

    if (selectedItems.length === 0) {
      setError("❌ Корзина пуста. Добавьте товары в корзину.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Создаем заказ для каждого товара в корзине
      const orderPromises = selectedItems.map(item => {
        const orderData = {
          user_id: userId || null, // Может быть null для неавторизованных пользователей
          items: [{
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity || 1
          }],
          total: item.price * (item.quantity || 1),
          address: survey.delivery_type === 'courier' ? survey.delivery_address : survey.cdek_address,
          fio: survey.fio,
          phone: survey.phone,
          referral_code: survey.referral || null,
          comment: `Заказ через ${userId ? 'авторизованного пользователя' : 'гостя'}. ${telegramUser ? `Telegram: ${telegramUser.telegram_id}` : ''}`,
          coins_to_use: 0
        };

        console.log('📦 Submitting order for item:', orderData);

        return fetch("/api/order-simple", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(orderData),
        }).then(r => r.json());
      });

      const results = await Promise.all(orderPromises);
      const successfulOrders = results.filter(r => r.success);
      
      if (successfulOrders.length > 0) {
        setSuccess(`✅ Заказ успешно создан! Оформлено ${successfulOrders.length} товаров.`);
        // Сброс формы и очистка корзины
        setSelectedItems([]);
        setSurvey(initialSurvey);
        localStorage.removeItem('spor3s_cart_items'); // Очищаем корзину из localStorage
        
        setTimeout(() => {
          if (setStep) setStep(2); // Возвращаемся к корзине
        }, 2000);
      } else {
        setError(`❌ Ошибка при создании заказа: ${results[0]?.error || "Неизвестная ошибка"}`);
      }
    } catch (err) {
      console.error("Order submit error:", err);
      setError(`❌ Ошибка сети: ${err instanceof Error ? err.message : "Неизвестная ошибка"}`);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  // Обработка ошибок
  if (error) {
    return (
      <div style={{ 
        maxWidth: 800, 
        margin: "0 auto", 
        color: "#fff", 
        padding: "clamp(15px, 4vw, 20px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%"
      }}>
        <div style={{
          background: "rgba(220, 53, 69, 0.2)",
          border: "2px solid #dc3545",
          borderRadius: 12,
          padding: 20,
          textAlign: "center",
          marginBottom: 20
        }}>
          <h3 style={{ color: "#dc3545", marginBottom: 10 }}>🚨 Ошибка приложения</h3>
          <p style={{ marginBottom: 15 }}>{error}</p>
          <button
            onClick={() => {
              setError("");
              window.location.reload();
            }}
            style={{
              background: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "10px 20px",
              cursor: "pointer",
              fontSize: 14
            }}
          >
            🔄 Попробовать снова
          </button>
        </div>
        <button
          onClick={() => setStep && setStep(2)}
          style={{
            background: "rgba(255, 255, 255, 0.1)",
            color: "white",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            borderRadius: 8,
            padding: "10px 20px",
            cursor: "pointer",
            fontSize: 14
          }}
        >
          ← Вернуться к корзине
        </button>
      </div>
    );
  }

  return (
    <div style={{ 
      maxWidth: 800, 
      margin: "0 auto", 
      color: "#fff", 
      padding: "clamp(15px, 4vw, 20px)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      width: "100%"
    }}>
      {/* Заголовок */}
      <div style={{
        textAlign: "center",
        marginBottom: "clamp(20px, 5vw, 30px)",
        width: "100%",
        maxWidth: "600px"
      }}>
        <h2 style={{ 
          fontSize: "clamp(24px, 6vw, 32px)", 
          marginBottom: 10,
          color: "#ff00cc"
        }}>
          🛒 Оформление заказа
        </h2>
        <p style={{ 
          fontSize: "clamp(14px, 3.5vw, 16px)", 
          color: "#ccc",
          lineHeight: 1.5
        }}>
          Заполните форму для оформления заказа
        </p>
      </div>

      {/* Информация о пользователе */}
      <div style={{
        background: "rgba(255, 255, 255, 0.05)",
        borderRadius: 12,
        padding: "clamp(15px, 4vw, 20px)",
        marginBottom: "clamp(20px, 5vw, 30px)",
        width: "100%",
        maxWidth: "600px",
        textAlign: "center"
      }}>
        <div style={{ 
          fontSize: "clamp(16px, 4vw, 18px)", 
          color: "#ff00cc",
          marginBottom: 8
        }}>
          👤 {displayName}
        </div>
        <div style={{ 
          fontSize: "clamp(12px, 3vw, 14px)", 
          color: "#ccc",
          fontFamily: "monospace"
        }}>
          ID: {userId ? userId.slice(0, 8) + '...' + userId.slice(-4) : 'N/A'}
        </div>
      </div>

      {!userId && (
        <div style={{
          background: "rgba(255, 193, 7, 0.1)",
          border: "1px solid #ffc107",
          borderRadius: 8,
          padding: 15,
          marginBottom: 20,
          textAlign: "center"
        }}>
          <strong>⚠️ Гость</strong><br/>
          Вы можете оформить заказ без авторизации. Заполните контактные данные ниже.
          {telegramUser && (
            <div style={{ marginTop: 8, fontSize: 14, color: "#ccc" }}>
              💡 Для отслеживания заказов и уведомлений рекомендуем авторизоваться через Telegram.
            </div>
          )}
        </div>
      )}

      {success && (
        <div style={{
          background: "rgba(0, 255, 136, 0.1)",
          border: "1px solid #00ff88",
          borderRadius: 8,
          padding: 15,
          marginBottom: 20,
          color: "#00ff88",
          textAlign: "center"
        }}>
          {success}
        </div>
      )}

      {error && (
        <div style={{
          background: "rgba(255, 107, 107, 0.1)",
          border: "1px solid #ff6b6b",
          borderRadius: 8,
          padding: 15,
          marginBottom: 20,
          color: "#ff6b6b",
          textAlign: "center"
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Товары из корзины */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, marginBottom: 15, color: "#ff00cc" }}>
            🛒 Ваш заказ:
          </h3>
          
          {selectedItems.length > 0 ? (
            <div style={{ marginBottom: 20 }}>
              {selectedItems.map((item, index) => (
                <div key={index} style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  borderRadius: 8,
                  padding: 15,
                  marginBottom: 10,
                  border: "1px solid rgba(255, 255, 255, 0.1)"
                }}>
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 5 }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: 14, color: "#ccc" }}>
                    Цена: {item.price}₽ × {item.quantity || 1} шт. = {item.price * (item.quantity || 1)}₽
                  </div>
                </div>
              ))}
              
              <div style={{
                background: "rgba(255, 255, 255, 0.1)",
                borderRadius: 8,
                padding: 15,
                marginTop: 15,
                textAlign: "center"
              }}>
                <div style={{ fontSize: 18, fontWeight: 600 }}>
                  💰 Итого: <span style={{ color: "#ff00cc" }}>
                    {selectedItems.reduce((total, item) => total + (item.price * (item.quantity || 1)), 0)}₽
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              background: "rgba(255, 107, 107, 0.1)",
              border: "1px solid #ff6b6b",
              borderRadius: 8,
              padding: 15,
              textAlign: "center"
            }}>
              <strong>🛒 Корзина пуста!</strong><br/>
              Вернитесь к каталогу и добавьте товары в корзину.
            </div>
          )}
        </div>

        {/* Контактные данные */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, marginBottom: 15, color: "#ff00cc" }}>
            📝 Контактные данные:
          </h3>
          
          <div style={{ marginBottom: 15 }}>
            <label style={{ display: "block", marginBottom: 5, fontSize: 14 }}>
              👤 ФИО:
            </label>
            <input
              type="text"
              value={survey.fio}
              onChange={(e) => setSurvey(prev => ({...prev, fio: e.target.value}))}
              disabled={loading}
              placeholder="Введите ваше ФИО"
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 8,
                border: "1px solid #666",
                background: "#2a2a2a",
                color: "#fff",
                fontSize: 14
              }}
              required
            />
          </div>

          <div style={{ marginBottom: 15 }}>
            <label style={{ display: "block", marginBottom: 5, fontSize: 14 }}>
              📱 Телефон:
            </label>
            <input
              type="tel"
              value={survey.phone}
              onChange={(e) => setSurvey(prev => ({...prev, phone: e.target.value}))}
              disabled={loading}
              placeholder="+7 (___) ___-__-__"
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 8,
                border: "1px solid #666",
                background: "#2a2a2a",
                color: "#fff",
                fontSize: 14
              }}
              required
            />
          </div>

          {/* Тип доставки */}
          <div style={{ marginBottom: 15 }}>
            <label style={{ display: "block", marginBottom: 5, fontSize: 14 }}>
              🚚 Тип доставки:
            </label>
            <select
              value={survey.delivery_type}
              onChange={(e) => setSurvey(prev => ({...prev, delivery_type: e.target.value}))}
              disabled={loading}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 8,
                border: "1px solid #666",
                background: "#2a2a2a",
                color: "#fff",
                fontSize: 14,
                cursor: "pointer"
              }}
              required
            >
              <option value="cdek">📦 СДЭК (пункт выдачи)</option>
              <option value="ozon">📦 OZON (пункт выдачи)</option>
              <option value="courier">🚚 СДЭК (курьер)</option>
            </select>
          </div>

          {/* Адрес доставки */}
          <div style={{ marginBottom: 15 }}>
            <label style={{ display: "block", marginBottom: 5, fontSize: 14 }}>
              📍 {survey.delivery_type === 'cdek' ? 'Адрес СДЭК (пункт выдачи):'
                : survey.delivery_type === 'ozon' ? 'Адрес пункта выдачи OZON:'
                : 'Адрес доставки:'}
            </label>
            <input
              type="text"
              value={survey.delivery_type === 'courier' ? survey.delivery_address : survey.cdek_address}
              onChange={(e) => {
                if (survey.delivery_type === 'courier') {
                  setSurvey(prev => ({...prev, delivery_address: e.target.value}));
                } else {
                  setSurvey(prev => ({...prev, cdek_address: e.target.value}));
                }
              }}
              disabled={loading}
              placeholder={survey.delivery_type === 'cdek'
                ? "Укажите удобный филиал СДЭК"
                : survey.delivery_type === 'ozon'
                ? "Укажите удобный пункт выдачи OZON"
                : "Укажите ваш адрес для доставки курьером"
              }
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 8,
                border: "1px solid #666",
                background: "#2a2a2a",
                color: "#fff",
                fontSize: 14
              }}
              required
            />
          </div>
        </div>

        {/* Кнопки */}
        <div style={{
          display: "flex",
          gap: 15,
          justifyContent: "center",
          marginTop: 30
        }}>
          <button
            type="button"
            onClick={() => setStep && setStep(2)}
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              border: "1px solid #666",
              borderRadius: 25,
              color: "#fff",
              padding: "12px 24px",
              fontSize: 14,
              cursor: "pointer",
              transition: "all 0.3s ease"
            }}
          >
            ← Назад к корзине
          </button>
          
          <button
            type="submit"
                         disabled={loading || selectedItems.length === 0}
             style={{
               background: (loading || selectedItems.length === 0) 
                 ? "rgba(100, 100, 100, 0.5)"
                 : "linear-gradient(45deg, #00ff88, #00cc6a)",
               border: "none",
               borderRadius: 25,
               color: "#fff",
               padding: "12px 24px",
               fontSize: 14,
               fontWeight: 600,
               cursor: (loading || selectedItems.length === 0) ? "not-allowed" : "pointer",
               opacity: (loading || selectedItems.length === 0) ? 0.5 : 1,
               transition: "all 0.3s ease"
             }}
          >
            {loading ? "⏳ Оформляем..." : "✅ Оформить заказ"}
          </button>
        </div>
      </form>
    </div>
  );
} 