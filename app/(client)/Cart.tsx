"use client";
import { useCart } from "../CartContext";
import { useState, useEffect } from "react";

type Product = {
  id: string;
  name: string;
  description?: string;
  image?: string;
  benefits?: string[];
  price?: number;
  [key: string]: any;
};

interface CartProps {
  products?: Product[];
  setStep?: (step: number) => void;
}

export default function Cart({ products = [], setStep }: CartProps) {
  const { cart, addToCart, changeQuantity, removeFromCart, getTotal } = useCart();
  const [mounted, setMounted] = useState(false);
  const [showVitrina, setShowVitrina] = useState(false);
  const [modalProduct, setModalProduct] = useState<Product | null>(null);

  // Отладочные логи
  useEffect(() => {
    console.log('🛒 Cart: Компонент смонтирован');
    console.log('🛒 Cart: Получены продукты:', products);
    console.log('🛒 Cart: Текущая корзина:', cart);
  }, [products, cart]);

  // Функция показа уведомлений
  const showNotification = (productName: string, type: 'add' | 'remove' = 'add') => {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'add' ? 'linear-gradient(45deg, #28a745, #20c997)' : 'linear-gradient(45deg, #dc3545, #c82333)'};
      color: white;
      padding: 20px 25px;
      border-radius: 15px;
      font-weight: 700;
      font-size: 16px;
      z-index: 99999;
      box-shadow: 0 8px 25px ${type === 'add' ? 'rgba(40, 167, 69, 0.4)' : 'rgba(220, 53, 69, 0.4)'};
      animation: slideInRight 0.4s ease-out;
      max-width: 350px;
      word-wrap: break-word;
      border: 2px solid rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(10px);
    `;
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="font-size: 24px;">${type === 'add' ? '✅' : '❌'}</div>
        <div>
          <div style="font-weight: 700; margin-bottom: 4px;">${productName}</div>
          <div style="font-size: 14px; opacity: 0.9;">${type === 'add' ? 'Добавлен в корзину!' : 'Удален из корзины!'}</div>
        </div>
      </div>
    `;
    document.body.appendChild(notification);
    
    // Добавляем звуковой эффект
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch (e) {}
    
    // Удаляем уведомление через 4 секунды
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.4s ease-out';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 400);
    }, 4000);
  };

  // Функция добавления в корзину с уведомлением
  const handleAddToCart = (product: any) => {
    console.log('🛒 Cart: handleAddToCart вызвана с продуктом:', product);
    console.log('🛒 Cart: Текущая корзина до добавления:', cart);
    
    if (!product || !product.id || !product.name || product.price === undefined) {
      console.error('🛒 Cart: Ошибка - продукт неполный:', product);
      return;
    }
    
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price || 0
    });
    
    console.log('🛒 Cart: Продукт добавлен, показываем уведомление');
    showNotification(product.name, 'add');
  };

  // Функция удаления из корзины с уведомлением
  const handleRemoveFromCart = (productId: string) => {
    const product = safeProducts.find(p => p.id === productId);
    if (product) {
      removeFromCart(productId);
      showNotification(product.name, 'remove');
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const safeCart = Array.isArray(cart) ? cart : [];
  const safeProducts = Array.isArray(products) ? products : [];

  // Проверка, есть ли товар в корзине
  const getCartItem = (id: string) => cart.find(item => item.id === id);

  const handleOrderClick = () => {
    if (setStep) {
      // Сохраняем данные корзины в localStorage для передачи в форму заказа
      localStorage.setItem('spor3s_cart_items', JSON.stringify(cart));
      setStep(10); // Переход к оформлению заказа (специальный шаг)
    } else {
      console.log('Переход к оформлению заказа - setStep не передан');
    }
  };

  return (
    <>
      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes slideOutRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
        
        @media (max-width: 480px) {
          .product-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 10px !important;
            padding: 0 8px !important;
          }
          
          .product-card {
            min-height: 280px !important;
            max-width: 140px !important;
            padding: 8px !important;
          }
          
          .product-image {
            width: 70px !important;
            height: 70px !important;
          }
          
          .product-title {
            font-size: 11px !important;
          }
          
          .product-description {
            font-size: 9px !important;
            min-height: 22px !important;
          }
          
          .product-price {
            font-size: 13px !important;
          }
          
          .product-button {
            font-size: 10px !important;
            padding: 6px 0 !important;
          }
        }
      `}</style>
      <div style={{ 
        maxWidth: 600, 
        margin: "0 auto", 
        color: "#fff", 
        padding: "clamp(10px, 3vw, 16px)",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
      }}>
      {/* Кнопка показать витрину */}
      {!showVitrina && (
        <div style={{ 
          textAlign: "center", 
          marginBottom: 30,
          width: "100%",
          maxWidth: "500px"
        }}>
          <button
            onClick={() => setShowVitrina(true)}
            style={{
              background: "linear-gradient(45deg, #ff00cc, #3333ff)",
              color: "white",
              border: "none",
              borderRadius: "12px",
              padding: "clamp(12px, 3vw, 15px) clamp(20px, 5vw, 30px)",
              fontSize: "clamp(16px, 4vw, 18px)",
              fontWeight: "bold",
              cursor: "pointer",
              transition: "transform 0.2s",
              width: "100%",
              maxWidth: "300px"
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.02)"}
            onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            🛍️ Показать витрину
          </button>
          
          {/* Показываем корзину если есть товары */}
          {safeCart.length > 0 && (
            <div style={{
              marginTop: 25,
              padding: 20,
              background: "rgba(255, 255, 255, 0.15)",
              borderRadius: 12,
              border: "2px solid #ff00cc"
            }}>
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center",
                fontSize: 20,
                fontWeight: "bold",
                marginBottom: 15
              }}>
                <span>🛒 Ваш заказ:</span>
                <span style={{ color: "#ff00cc" }}>
                  {getTotal ? getTotal().toLocaleString() : '0'}₽
                </span>
              </div>
              
              {/* Список товаров в корзине */}
              <div style={{ marginBottom: 15 }}>
                {safeCart.map((item) => {
                  const product = safeProducts.find(p => p.id === item.id);
                  if (!product) return null;
                  
                  return (
                    <div key={item.id} style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "6px 0",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.2)",
                      fontSize: 13
                    }}>
                      <div style={{ flex: 1, color: "#fff" }}>
                        <div style={{ fontWeight: 500, marginBottom: 2 }}>{product.name}</div>
                        <div style={{ fontSize: 11, color: "#ccc" }}>
                          {item.quantity} × {product.price}₽
                        </div>
                      </div>
                      <div style={{ 
                        display: "flex",
                        alignItems: "center",
                        gap: 10
                      }}>
                        <div style={{ 
                          color: "#ff00cc", 
                          fontWeight: 600,
                          fontSize: 14
                        }}>
                          {product?.price ? item.quantity * product.price : 0}₽
                        </div>
                        <button
                          onClick={() => handleRemoveFromCart(item.id)}
                          style={{
                            background: "rgba(220, 53, 69, 0.2)",
                            border: "1px solid #dc3545",
                            borderRadius: "50%",
                            width: 24,
                            height: 24,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            color: "#dc3545",
                            fontSize: 12,
                            transition: "all 0.2s ease"
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = "rgba(220, 53, 69, 0.3)";
                            e.currentTarget.style.transform = "scale(1.1)";
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = "rgba(220, 53, 69, 0.2)";
                            e.currentTarget.style.transform = "scale(1)";
                          }}
                          title="Удалить из корзины"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div style={{ 
                fontSize: 13,
                color: "#ccc",
                textAlign: "center",
                marginBottom: 15
              }}>
                Доставка по России через СДЭК: 250-600₽
              </div>
              
              <div style={{ textAlign: "center" }}>
                <button
                  onClick={handleOrderClick}
                  style={{
                    background: "linear-gradient(45deg, #ff00cc, #ff6b9d)",
                    color: "white",
                    border: "none",
                    borderRadius: 25,
                    padding: "12px 30px",
                    fontSize: 16,
                    fontWeight: "bold",
                    cursor: "pointer",
                    boxShadow: "0 4px 15px rgba(255, 0, 204, 0.3)",
                    transition: "transform 0.2s, box-shadow 0.2s"
                  }}
                  onMouseOver={(e) => {
                    const target = e.currentTarget as HTMLButtonElement;
                    target.style.transform = "scale(1.05)";
                    target.style.boxShadow = "0 6px 20px rgba(255, 0, 204, 0.4)";
                  }}
                  onMouseOut={(e) => {
                    const target = e.currentTarget as HTMLButtonElement;
                    target.style.transform = "scale(1)";
                    target.style.boxShadow = "0 4px 15px rgba(255, 0, 204, 0.3)";
                  }}
                >
                  🚀 Оформить заказ
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Витрина товаров */}
      {showVitrina && (
        <>
          <h2 style={{ 
            fontFamily: "Montserrat, Arial, sans-serif", 
            fontWeight: 700, 
            fontSize: "clamp(20px, 5vw, 24px)", 
            marginBottom: 16, 
            textAlign: "center",
            width: "100%"
          }}>
            Витрина товаров
          </h2>
          
          {/* Кнопки управления витриной */}
          <div style={{ 
            display: "flex", 
            gap: 12, 
            justifyContent: "center", 
            marginBottom: 20,
            flexWrap: "wrap",
            width: "100%",
            maxWidth: "500px"
          }}>
            <button
              onClick={() => {
                // Добавляем курс 4в1
                const course4v1 = safeProducts.find(p => p.name.includes('4в1') || p.name.includes('4 в 1'));
                if (course4v1) {
                  handleAddToCart(course4v1);
                }
              }}
              style={{
                background: "linear-gradient(45deg, #10b981, #059669)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "10px 20px",
                fontSize: "14px",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "transform 0.2s"
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.05)"}
              onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
              🌟 Добавить курс 4в1
            </button>
            
            <button
              onClick={() => setShowVitrina(false)}
              style={{
                background: "rgba(255, 255, 255, 0.2)",
                color: "white",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                borderRadius: "8px",
                padding: "10px 20px",
                fontSize: "14px",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "transform 0.2s"
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.05)"}
              onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
              ✕ Скрыть витрину
            </button>
          </div>

          {/* Корзина - перемещена выше витрины */}
          {safeCart.length > 0 && (
            <div style={{
              marginBottom: 25,
              padding: 20,
              background: "rgba(255, 255, 255, 0.15)",
              borderRadius: 12,
              border: "2px solid #ff00cc",
              position: "sticky",
              top: 10,
              zIndex: 100
            }}>
              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center",
                fontSize: 20,
                fontWeight: "bold",
                marginBottom: 15
              }}>
                <span>🛒 Ваш заказ:</span>
                <span style={{ color: "#ff00cc" }}>
                  {getTotal ? getTotal().toLocaleString() : '0'}₽
                </span>
              </div>
              
              {/* Список товаров в корзине */}
              <div style={{ marginBottom: 15 }}>
                {safeCart.map((item) => {
                  const product = safeProducts.find(p => p.id === item.id);
                  if (!product) return null;
                  
                  return (
                    <div key={item.id} style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 0",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.2)",
                      fontSize: 14
                    }}>
                      <div style={{ flex: 1, color: "#fff" }}>
                        <div style={{ fontWeight: 500, marginBottom: 2 }}>{product.name}</div>
                        <div style={{ fontSize: 12, color: "#ccc" }}>
                          {item.quantity} × {product.price}₽
                        </div>
                      </div>
                      <div style={{ 
                        display: "flex",
                        alignItems: "center",
                        gap: 12
                      }}>
                        <div style={{ 
                          color: "#ff00cc", 
                          fontWeight: 600,
                          fontSize: 15
                        }}>
                          {product?.price ? item.quantity * product.price : 0}₽
                        </div>
                        <button
                          onClick={() => handleRemoveFromCart(item.id)}
                          style={{
                            background: "rgba(220, 53, 69, 0.2)",
                            border: "1px solid #dc3545",
                            borderRadius: "50%",
                            width: 28,
                            height: 28,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            color: "#dc3545",
                            fontSize: 14,
                            transition: "all 0.2s ease"
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = "rgba(220, 53, 69, 0.3)";
                            e.currentTarget.style.transform = "scale(1.1)";
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = "rgba(220, 53, 69, 0.2)";
                            e.currentTarget.style.transform = "scale(1)";
                          }}
                          title="Удалить из корзины"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div style={{ 
                fontSize: 14,
                color: "#ffffff",
                textAlign: "center",
                marginBottom: 15,
                textShadow: "0 1px 2px rgba(0,0,0,0.3)"
              }}>
                Доставка по России через СДЭК: 250-600₽
              </div>
              
              <div style={{ textAlign: "center" }}>
                <button
                  onClick={handleOrderClick}
                  style={{
                    background: "linear-gradient(45deg, #ff00cc, #ff6b9d)",
                    color: "white",
                    border: "none",
                    borderRadius: 25,
                    padding: "12px 30px",
                    fontSize: 16,
                    fontWeight: "bold",
                    cursor: "pointer",
                    boxShadow: "0 4px 15px rgba(255, 0, 204, 0.3)",
                    transition: "transform 0.2s, box-shadow 0.2s"
                  }}
                  onMouseOver={(e) => {
                    const target = e.currentTarget as HTMLButtonElement;
                    target.style.transform = "scale(1.05)";
                    target.style.boxShadow = "0 6px 20px rgba(255, 0, 204, 0.4)";
                  }}
                  onMouseOut={(e) => {
                    const target = e.currentTarget as HTMLButtonElement;
                    target.style.transform = "scale(1)";
                    target.style.boxShadow = "0 4px 15px rgba(255, 0, 204, 0.3)";
                  }}
                >
                  🚀 Оформить заказ
                </button>
              </div>
            </div>
          )}
          
          {/* Витрина товаров в 2 столбца */}
          <div className="product-grid" style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(2, 1fr)", 
            gap: 16, 
            marginBottom: 32,
            maxWidth: "100%",
            padding: "0 12px"
          }}>
            {safeProducts.map(product => {
              const cartItem = getCartItem(product.id);
              const shortDesc = product.description && product.description.length > 90
                ? product.description.slice(0, 90) + "…"
                : product.description;

              return (
                <div key={product.id} className="product-card" style={{ 
                  background: "rgba(255, 255, 255, 0.15)", 
                  borderRadius: 16, 
                  boxShadow: "0 2px 12px rgba(0,0,0,0.2)", 
                  padding: 10, 
                  display: "flex", 
                  flexDirection: "column", 
                  alignItems: "center", 
                  minHeight: 300, 
                  width: "100%", 
                  maxWidth: "160px",
                  margin: "0 auto", 
                  justifyContent: "space-between",
                  color: "#fff",
                  border: "1px solid rgba(255, 255, 255, 0.2)"
                }}>
                  <div className="product-image" style={{ 
                    width: 100, 
                    height: 100, 
                    borderRadius: 14, 
                    overflow: "hidden", 
                    marginBottom: 8, 
                    background: "#f8fafc", 
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                    onClick={() => setModalProduct(product)}
                  >
                    {product.image ? (
                      <img 
                        src={product.image} 
                        alt={product.name} 
                        style={{ 
                          objectFit: "cover", 
                          width: "100%", 
                          height: "100%" 
                        }}
                        onError={(e) => {
                          const target = e.currentTarget as HTMLImageElement;
                          target.style.display = 'none';
                          if (target.parentNode instanceof HTMLElement) {
                            target.parentNode.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background: #f0f0f0; color: #999; font-size: 12px;">🍄</div>`;
                          }
                        }}
                      />
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", background: "#f0f0f0", color: "#666", fontSize: 24 }}>
                        🍄
                      </div>
                    )}
                  </div>
                  
                  <div className="product-title" style={{ fontWeight: 700, fontSize: 13, marginBottom: 3, textAlign: "center", lineHeight: "1.2" }}>{product.name}</div>
                  <div className="product-description" style={{ fontSize: 11, color: "#ffffff", marginBottom: 5, textAlign: "center", minHeight: 28, textShadow: "0 1px 2px rgba(0,0,0,0.3)", lineHeight: "1.3" }}>
                    {shortDesc}
                    {product.description && product.description.length > 90 && (
                      <button 
                        onClick={() => setModalProduct(product)} 
                        style={{ 
                          background: "none", 
                          color: "#ff00cc", 
                          border: "none", 
                          cursor: "pointer", 
                          textDecoration: "underline", 
                          fontSize: 13, 
                          marginLeft: 4,
                          fontWeight: "600"
                        }}
                      >
                        Подробнее
                      </button>
                    )}
                  </div>
                  
                  {/* Цена отдельной строкой */}
                  <div className="product-price" style={{ fontWeight: 700, fontSize: 16, color: "#ff00cc", textAlign: "center", margin: "8px 0 5px 0" }}>
                    {product.price} ₽
                  </div>
                  
                  {/* Кнопка на всю ширину */}
                  {!cartItem ? (
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="product-button"
                      style={{
                        background: "#ff00cc",
                        color: "#fff",
                        fontFamily: "Montserrat, Arial, sans-serif",
                        fontWeight: 600,
                        fontSize: 12,
                        border: "none",
                        borderRadius: 999,
                        padding: "8px 0",
                        cursor: "pointer",
                        transition: "background 0.2s",
                        boxShadow: "0 2px 8px rgba(255,0,204,0.08)",
                        width: "100%",
                        minWidth: 0,
                        margin: "0 auto"
                      }}
                    >
                      Добавить в корзину
                    </button>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, width: "100%", justifyContent: "center" }}>
                      <button
                        onClick={() => changeQuantity(product.id, cartItem.quantity - 1)}
                        style={{
                          background: "#ff00cc",
                          color: "#fff",
                          fontFamily: "Montserrat, Arial, sans-serif",
                          fontWeight: 700,
                          fontSize: 14,
                          border: "none",
                          borderRadius: 999,
                          width: 28,
                          height: 28,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          transition: "background 0.2s"
                        }}
                      >–</button>
                      <span style={{ fontWeight: 700, fontSize: 12, color: "#333" }}>{cartItem.quantity}</span>
                      <button
                        onClick={() => changeQuantity(product.id, cartItem.quantity + 1)}
                        style={{
                          background: "#ff00cc",
                          color: "#fff",
                          fontFamily: "Montserrat, Arial, sans-serif",
                          fontWeight: 700,
                          fontSize: 14,
                          border: "none",
                          borderRadius: 999,
                          width: 28,
                          height: 28,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          transition: "background 0.2s"
                        }}
                      >+</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <button
            onClick={() => setShowVitrina(false)}
            style={{ 
              display: 'block', 
              margin: '0 auto 24px auto', 
              minWidth: 180, 
              cursor: 'pointer',
              background: "#666",
              color: "white",
              border: "none",
              borderRadius: 12,
              padding: "12px 24px"
            }}
          >
            Скрыть витрину
          </button>

          {/* Модальное окно с описанием товара */}
          {modalProduct && (
            <div
              onClick={e => {
                if (e.target === e.currentTarget) setModalProduct(null);
              }}
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                background: "rgba(0,0,0,0.35)",
                zIndex: 1000,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <div style={{ 
                background: "#fff", 
                borderRadius: 18, 
                maxWidth: 360, 
                width: "90%", 
                padding: 24, 
                boxShadow: "0 4px 32px rgba(0,0,0,0.18)", 
                position: "relative",
                color: "#333"
              }}>
                <button 
                  onClick={() => setModalProduct(null)} 
                  style={{ 
                    position: "absolute", 
                    top: 12, 
                    right: 12, 
                    background: "none", 
                    border: "none", 
                    fontSize: 22, 
                    color: "#888", 
                    cursor: "pointer" 
                  }}
                >
                  &times;
                </button>
                <div style={{ 
                  width: 180, 
                  height: 180, 
                  borderRadius: 16, 
                  overflow: "hidden", 
                  margin: "0 auto 16px auto", 
                  background: "#f8fafc",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  {modalProduct?.image ? (
                    <img 
                      src={modalProduct.image} 
                      alt={modalProduct?.name || 'product'} 
                      style={{ objectFit: "cover", width: "100%", height: "100%" }}
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.style.display = 'none';
                        if (target.parentNode instanceof HTMLElement) {
                          target.parentNode.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background: #f0f0f0; color: #999; font-size: 48px;">🍄</div>`;
                        }
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: 48 }}>🍄</div>
                  )}
                </div>
                <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 8, textAlign: "center" }}>{modalProduct?.name}</div>
                <div style={{ fontSize: 15, color: "#ffffff", marginBottom: 16, textAlign: "center", whiteSpace: "pre-line", textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>{modalProduct?.description}</div>
                <div style={{ fontWeight: 700, fontSize: 18, color: "#ff00cc", marginBottom: 16, textAlign: "center" }}>{modalProduct?.price ? `${modalProduct.price} ₽` : ''}</div>
                <button
                  onClick={() => {
                    if (modalProduct) {
                      handleAddToCart(modalProduct);
                    }
                    setModalProduct(null);
                  }}
                  style={{ 
                    background: "#ff00cc", 
                    color: "#fff", 
                    fontWeight: 600, 
                    border: "none", 
                    borderRadius: 999, 
                    padding: "10px 22px", 
                    fontSize: 16, 
                    cursor: "pointer", 
                    width: "100%" 
                  }}
                >
                  Добавить в корзину
                </button>
              </div>
            </div>
          )}
        </>
      )}




      </div>
    </>
  );
} 