"use client";
import { useState, useEffect } from "react";
import { useCart } from "./CartContext";

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
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [scBalance, setScBalance] = useState(0);
  const [coinsToUse, setCoinsToUse] = useState(0);
  const { clearCart } = useCart();

  // Загружаем баланс SC пользователя (для списания)
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/referral-stats?user_id=${userId}`)
      .then(r => r.json())
      .then(d => { if (d?.stats && typeof d.stats.balance === 'number') setScBalance(d.stats.balance); })
      .catch(() => {});
  }, [userId]);

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
          // Fallback products (цены должны совпадать с таблицей products в Supabase)
          setLocalProducts([
            { id: 'ezh100', name: 'Ежовик 100г порошок', price: 1100 },
            { id: 'ezh120k', name: 'Ежовик 120 капсул', price: 1100 },
            { id: 'mhm30', name: 'Мухомор 30г', price: 1400 },
            { id: 'mhm50', name: 'Мухомор 50г', price: 2200 },
            { id: 'mhm100', name: 'Мухомор 100г', price: 4000 },
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
      // Один заказ на всю корзину (через полный /api/order: списание SC, уведомление, сохранение телефона)
      const total = selectedItems.reduce((s, it) => s + (it.price || 0) * (it.quantity || 1), 0);
      const coins = Math.max(0, Math.min(Number(coinsToUse) || 0, scBalance, Math.floor(total * 0.3)));
      const orderData = {
        user_id: userId || null,
        items: selectedItems.map(it => ({ id: it.id, name: it.name, price: it.price, quantity: it.quantity || 1 })),
        total,
        address: survey.delivery_type === 'courier' ? survey.delivery_address : survey.cdek_address,
        fio: survey.fio,
        phone: survey.phone,
        referral_code: survey.referral || null,
        comment: `Заказ через ${userId ? 'авторизованного пользователя' : 'гостя'}. ${telegramUser ? `Telegram: ${telegramUser.telegram_id}` : ''}`,
        coins_to_use: coins,
      };

      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });
      const result = await res.json();

      if (result.success) {
        const fin = result.appliedDiscounts?.finalTotal;
        setSuccess(fin != null ? `К оплате: ${fin}₽` : '');
        setOrderPlaced(true);
        setSelectedItems([]);
        setSurvey(initialSurvey);
        setCoinsToUse(0);
        localStorage.removeItem('spor3s_cart_items');
        clearCart(); // сбрасываем и корзину каталога (CartContext), а не только localStorage
      } else {
        setError(`❌ Ошибка при создании заказа: ${result.error || "Неизвестная ошибка"}`);
      }
    } catch (err) {
      console.error("Order submit error:", err);
      setError(`❌ Ошибка сети: ${err instanceof Error ? err.message : "Неизвестная ошибка"}`);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  // Экран успешного заказа
  if (orderPlaced) {
    return (
      <div style={{
        maxWidth: 500,
        margin: "0 auto",
        color: "#fff",
        padding: "clamp(20px, 5vw, 40px)",
        textAlign: "center"
      }}>
        <div style={{
          background: "rgba(0, 255, 136, 0.08)",
          border: "2px solid #00ff88",
          borderRadius: 16,
          padding: "clamp(24px, 6vw, 40px)",
          marginBottom: 24
        }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
          <h2 style={{ color: "#00ff88", margin: "0 0 12px 0", fontSize: "clamp(20px, 5vw, 26px)" }}>
            Заказ оформлен!
          </h2>
          {success && (
            <div style={{ fontSize: "clamp(16px, 4vw, 20px)", fontWeight: 700, marginBottom: 12 }}>
              {success}
            </div>
          )}
          <div style={{ color: "#ccc", fontSize: "clamp(14px, 3.5vw, 16px)", lineHeight: 1.5 }}>
            Мы свяжемся с вами для подтверждения и оплаты.
            Статус заказа можно отслеживать во вкладке «Бонусы».
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => setStep && setStep(2)}
            style={{
              background: "linear-gradient(45deg, #ff00cc, #3333ff)",
              color: "#fff", border: "none", borderRadius: 25,
              padding: "12px 28px", fontSize: 16, fontWeight: 700, cursor: "pointer"
            }}
          >
            🛒 В каталог
          </button>
          <button
            onClick={() => setStep && setStep(3)}
            style={{
              background: "rgba(255,255,255,0.1)",
              color: "#fff", border: "2px solid rgba(255,255,255,0.3)", borderRadius: 25,
              padding: "12px 28px", fontSize: 16, fontWeight: 700, cursor: "pointer"
            }}
          >
            📦 Мои заказы
          </button>
        </div>
      </div>
    );
  }

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
        {/* Товары из корзины — блок закреплён при скролле формы */}
        <div style={{
          position: "sticky",
          top: 8,
          zIndex: 20,
          background: "rgba(26, 16, 48, 0.97)",
          backdropFilter: "blur(6px)",
          borderRadius: 12,
          border: "1px solid rgba(255, 0, 204, 0.35)",
          padding: "12px 14px",
          marginBottom: 20
        }}>
          <h3 style={{ fontSize: 18, marginBottom: 15, color: "#ff00cc", marginTop: 0 }}>
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
                boxSizing: "border-box",
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
                boxSizing: "border-box",
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

          {/* Реферальный код: username или телефон пригласившего */}
          <div style={{ marginBottom: 15 }}>
            <label style={{ display: "block", marginBottom: 5, fontSize: 14 }}>
              🎁 Реферальный код (необязательно):
            </label>
            <input
              type="text"
              value={survey.referral}
              onChange={(e) => setSurvey(prev => ({...prev, referral: e.target.value}))}
              disabled={loading}
              placeholder="username или телефон того, кто пригласил"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: 12,
                borderRadius: 8,
                border: "1px solid #666",
                background: "#2a2a2a",
                color: "#fff",
                fontSize: 14
              }}
            />
            <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>
              Кто пригласил получит бонус после оплаты вашего заказа
            </div>
          </div>

          {/* Списание SC (если есть баланс) */}
          {userId && scBalance > 0 && (() => {
            const total = selectedItems.reduce((s: number, it: any) => s + (it.price || 0) * (it.quantity || 1), 0);
            const maxCoins = Math.min(scBalance, Math.floor(total * 0.3));
            return (
              <div style={{ marginBottom: 15 }}>
                <label style={{ display: "block", marginBottom: 5, fontSize: 14 }}>
                  💰 Списать SC (баланс: {scBalance}, до {maxCoins}):
                </label>
                <input
                  type="number"
                  min={0}
                  max={maxCoins}
                  value={coinsToUse || ''}
                  onChange={(e) => setCoinsToUse(Math.max(0, Math.min(Number(e.target.value) || 0, maxCoins)))}
                  disabled={loading}
                  placeholder={`0 — ${maxCoins}`}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: 12,
                    borderRadius: 8,
                    border: "1px solid #666",
                    background: "#2a2a2a",
                    color: "#fff",
                    fontSize: 14
                  }}
                />
                <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>
                  1 SC = 1₽ скидки, максимум 30% от суммы заказа
                </div>
              </div>
            );
          })()}

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
                boxSizing: "border-box",
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
                boxSizing: "border-box",
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