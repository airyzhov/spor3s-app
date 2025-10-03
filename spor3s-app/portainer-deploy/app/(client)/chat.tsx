"use client";
import { useState, useEffect, useRef } from "react";
import { useCart } from "../CartContext";

// Типы для Telegram WebApp

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatProps {
  products: any[];
  setStep?: (step: number) => void;
}

export default function Chat({ products, setStep }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [userId, setUserId] = useState<string>('test-user-123456789');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { addToCart, removeFromCart } = useCart();

  // Проверяем, что CartContext работает
  useEffect(() => {
    console.log('🔍 DEBUG: CartContext инициализирован');
    console.log('🔍 DEBUG: addToCart функция:', typeof addToCart);
    console.log('🔍 DEBUG: removeFromCart функция:', typeof removeFromCart);
  }, [addToCart, removeFromCart]);

  // Логируем продукты при загрузке компонента
  useEffect(() => {
    console.log('🔍 DEBUG: Продукты в чате:', products);
    console.log('🔍 DEBUG: Количество продуктов:', products?.length || 0);
    if (products && products.length > 0) {
      console.log('🔍 DEBUG: Доступные продукты:', products.map(p => ({ id: p.id, name: p.name })));
    }
  }, [products]);

  // Загружаем сохраненную историю чата
  useEffect(() => {
    const savedMessages = localStorage.getItem('chat_history');
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        setMessages(parsedMessages);
      } catch (error) {
        console.error('Ошибка загрузки истории чата:', error);
      }
    } else {
      // Улучшенное приветственное сообщение
      setMessages([{
        id: '1',
        role: 'assistant',
        content: 'Добро пожаловать в spor3s! 🍄 Помогу выбрать грибные добавки:\n\n🧠 Для памяти и концентрации — Ежовик\n😴 Для сна и снятия стресса — Мухомор\n⚡ Для энергии — Кордицепс\n🌟 Комплексное решение — курс 4 в 1\n\nВыберите товары внизу или напишите что вас интересует!',
        timestamp: new Date()
      }]);
    }
  }, []);

  // Сохраняем историю чата при изменении
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chat_history', JSON.stringify(messages));
    }
  }, [messages]);

  // Инициализация пользователя из Telegram WebApp
  useEffect(() => {
    const initializeUser = async () => {
      try {
        // Проверяем, доступен ли Telegram WebApp
        if (window.Telegram && window.Telegram.WebApp) {
          const webApp = window.Telegram.WebApp;
          const initData = webApp.initDataUnsafe;
          
          if (initData && initData.user) {
            const telegramUserId = initData.user.id.toString();
            console.log('🔍 DEBUG: Telegram User ID:', telegramUserId);
            setUserId(telegramUserId);
            
            // Инициализируем пользователя в базе данных
            try {
              const response = await fetch('/api/init-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  telegram_id: telegramUserId,
                  name: initData.user.first_name || 'Пользователь'
                })
              });
              
              if (response.ok) {
                const data = await response.json();
                console.log('✅ Пользователь инициализирован:', data);
              } else {
                console.error('❌ Ошибка инициализации пользователя:', response.status);
              }
            } catch (error) {
              console.error('❌ Ошибка инициализации пользователя:', error);
            }
          } else {
            console.log('⚠️ Telegram пользователь не найден, используем тестовый ID');
          }
        } else {
          console.log('⚠️ Telegram WebApp недоступен, используем тестовый ID');
        }
      } catch (error) {
        console.error('❌ Ошибка инициализации Telegram WebApp:', error);
      }
    };

    initializeUser();
    setMounted(true);
  }, []);

  // Убрана автопрокрутка чата - пользователь сам контролирует позицию просмотра
  // const scrollToBottom = () => {
  //   messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  // };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !mounted) return;

    // Очистка истории чата при команде "очистить"
    if (input.trim().toLowerCase() === 'очистить' || input.trim().toLowerCase() === 'clear') {
      setMessages([{
        id: '1',
        role: 'assistant',
        content: 'История чата очищена! 🧹\n\nДобро пожаловать в spor3s! 🍄 Помогу выбрать грибные добавки:\n\n🧠 Для памяти и концентрации — Ежовик\n😴 Для сна и снятия стресса — Мухомор\n⚡ Для энергии — Кордицепс\n🌟 Комплексное решение — курс 4 в 1\n\nВыберите товары внизу или напишите что вас интересует!',
        timestamp: new Date()
      }]);
      setInput("");
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Ограничиваем количество сообщений для отправки (последние 10 сообщений)
      const recentMessages = [...messages, userMessage].slice(-10);
      
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input.trim(),
          user_id: userId,
          source: 'mini_app'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('AI Response:', data); // DEBUG

      // Исправляем обработку ответа - API возвращает data.response
      let aiContent = '';
      if (data.response) {
        aiContent = data.response;
      } else {
        aiContent = "Извините, не удалось получить ответ.";
      }

      // Парсим теги и выполняем действия ОДИН РАЗ при получении ответа
      const addToCartMatches = [...aiContent.matchAll(/\[add_to_cart:([\w-]+)\]/g)];
      const removeFromCartMatches = [...aiContent.matchAll(/\[remove_from_cart:([\w-]+)\]/g)];
      const uniqueAddProductIds = [...new Set(addToCartMatches.map(m => m[1]))];
      const uniqueRemoveProductIds = [...new Set(removeFromCartMatches.map(m => m[1]))];
      
      console.log('🛒 DEBUG: AI Content:', aiContent);
      console.log('🛒 DEBUG: Add to cart matches:', addToCartMatches);
      console.log('🛒 DEBUG: Unique add product IDs:', uniqueAddProductIds);
      console.log('🛒 DEBUG: Available products:', products.map(p => ({ id: p.id, name: p.name })));
      console.log('🔔 DEBUG: Будем создавать уведомления для продуктов:', uniqueAddProductIds);

      // Добавляем товары в корзину
      uniqueAddProductIds.forEach((productId) => {
        console.log(`🛒 DEBUG: Ищем продукт с ID: ${productId}`);
        console.log(`🛒 DEBUG: Доступные продукты:`, products.map(p => ({ id: p.id, name: p.name })));
        const product = products.find(p => p.id === productId);
        console.log(`🛒 DEBUG: Найденный продукт:`, product);
        if (product) {
          console.log(`🛒 DEBUG: Вызываем addToCart для продукта:`, product);
          addToCart(product);
          console.log(`🛒 Автоматически добавлен в корзину: ${product.name}`);
          console.log(`🔔 Создаем уведомление для: ${product.name}`);

          // Показываем уведомление об автоматическом добавлении
          console.log(`🔔 Создаем уведомление для продукта: ${product.name} (ID: ${productId})`);
          const notification = document.createElement('div');
          notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(45deg, #28a745, #20c997);
            color: white;
            padding: 20px 25px;
            border-radius: 15px;
            font-weight: 700;
            font-size: 16px;
            z-index: 99999;
            box-shadow: 0 8px 25px rgba(40, 167, 69, 0.4);
            animation: slideInRight 0.4s ease-out;
            max-width: 350px;
            word-wrap: break-word;
            border: 2px solid rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
          `;
          notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="font-size: 24px;">✅</div>
              <div>
                <div style="font-weight: 700; margin-bottom: 4px;">${product.name}</div>
                <div style="font-size: 14px; opacity: 0.9;">Добавлен в корзину!</div>
              </div>
            </div>
          `;
          document.body.appendChild(notification);
          console.log(`✅ Уведомление создано и добавлено в DOM для: ${product.name}`);
          console.log(`🔍 DEBUG: Уведомление в DOM:`, notification);
          console.log(`🔍 DEBUG: Позиция уведомления:`, notification.style.position, notification.style.top, notification.style.right);
          console.log(`🔍 DEBUG: Z-index уведомления:`, notification.style.zIndex);

          // Добавляем звуковой эффект (если доступен)
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
        }
      });

      // Удаляем товары из корзины
      uniqueRemoveProductIds.forEach((productId) => {
        const product = products.find(p => p.id === productId);
        if (product) {
          removeFromCart(productId);
          console.log(`🗑️ Автоматически удален из корзины: ${product.name}`);

          // Показываем уведомление об автоматическом удалении
          const notification = document.createElement('div');
          notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(45deg, #dc3545, #c82333);
            color: white;
            padding: 20px 25px;
            border-radius: 15px;
            font-weight: 700;
            font-size: 16px;
            z-index: 99999;
            box-shadow: 0 8px 25px rgba(220, 53, 69, 0.4);
            animation: slideInRight 0.4s ease-out;
            max-width: 350px;
            word-wrap: break-word;
            border: 2px solid rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
          `;
          notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="font-size: 24px;">🗑️</div>
              <div>
                <div style="font-weight: 700; margin-bottom: 4px;">${product.name}</div>
                <div style="font-size: 14px; opacity: 0.9;">Удален из корзины!</div>
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
        }
      });

      const aiMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: aiContent,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: "Извините, произошла ошибка. Попробуйте еще раз.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = (productId: string) => {
    console.log(`🛒 DEBUG: handleAddToCart вызвана с productId: ${productId}`);
    console.log(`🛒 DEBUG: Доступные продукты:`, products);
    
    const product = products.find(p => p.id === productId);
    console.log(`🛒 DEBUG: Найденный продукт:`, product);
    
    if (product) {
      console.log(`🛒 DEBUG: Добавляем в корзину:`, product);
      addToCart(product);
      
      // Показываем уведомление об успешном добавлении
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(45deg, #28a745, #20c997);
        color: white;
        padding: 20px 25px;
        border-radius: 15px;
        font-weight: 700;
        font-size: 16px;
        z-index: 99999;
        box-shadow: 0 8px 25px rgba(40, 167, 69, 0.4);
        animation: slideInRight 0.4s ease-out;
        max-width: 350px;
        word-wrap: break-word;
        border: 2px solid rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
      `;
      notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="font-size: 24px;">✅</div>
          <div>
            <div style="font-weight: 700; margin-bottom: 4px;">${product.name}</div>
            <div style="font-size: 14px; opacity: 0.9;">Добавлен в корзину!</div>
          </div>
        </div>
      `;
      document.body.appendChild(notification);
      
      // Добавляем звуковой эффект (если доступен)
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
      
      console.log(`🛒 Товар добавлен в корзину: ${product.name}`);
    } else {
      console.error(`❌ DEBUG: Продукт с ID ${productId} не найден!`);
      console.error(`❌ DEBUG: Доступные ID:`, products.map(p => p.id));
    }
  };

  const handleOrderNow = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      addToCart(product);
      
      // Показываем уведомление и переходим к заказу
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(45deg, #ff00cc, #3333ff);
        color: white;
        padding: 20px 25px;
        border-radius: 15px;
        font-weight: 700;
        font-size: 16px;
        z-index: 99999;
        box-shadow: 0 8px 25px rgba(255, 0, 204, 0.4);
        animation: slideInRight 0.4s ease-out;
        max-width: 350px;
        word-wrap: break-word;
        border: 2px solid rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
      `;
      notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="font-size: 24px;">⚡</div>
          <div>
            <div style="font-weight: 700; margin-bottom: 4px;">${product.name}</div>
            <div style="font-size: 14px; opacity: 0.9;">Добавлен! Переходим к заказу...</div>
          </div>
        </div>
      `;
      document.body.appendChild(notification);
      
      // Добавляем звуковой эффект (если доступен)
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
        audio.volume = 0.3;
        audio.play().catch(() => {});
      } catch (e) {}
      
      // Переходим к оформлению заказа через 1.5 секунды
      setTimeout(() => {
        if (setStep) setStep(3);
        
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 2000);
      }, 1500);
      
      console.log(`⚡ Быстрый заказ: ${product.name}`);
    }
  };

  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user';
    let content = message.content;

    // Парсим action-кнопки только для AI сообщений
    if (!isUser) {
      // Исправляем регулярные выражения
      const addToCartMatches = [...content.matchAll(/\[add_to_cart:([\w-]+)\]/g)];
      const removeFromCartMatches = [...content.matchAll(/\[remove_from_cart:([\w-]+)\]/g)];
      const orderNowMatches = [...content.matchAll(/\[order_now:([\w-]+)\]/g)];
      const showInfoMatches = [...content.matchAll(/\[show_info:([\w-]+)\]/g)];

      console.log('🔍 DEBUG: Парсинг AI сообщения:', { 
        content: content.substring(0, 200) + '...',
        addToCartMatches: addToCartMatches.map(m => m[1]), 
        removeFromCartMatches: removeFromCartMatches.map(m => m[1]),
        orderNowMatches: orderNowMatches.map(m => m[1]),
        showInfoMatches: showInfoMatches.map(m => m[1]),
        productsAvailable: products.map(p => ({ id: p.id, name: p.name }))
      }); // DEBUG

      // Убираем маркеры из текста для отображения
      content = content
        .replace(/\[add_to_cart:[\w-]+\]/g, '')
        .replace(/\[remove_from_cart:[\w-]+\]/g, '')
        .replace(/\[order_now:[\w-]+\]/g, '')
        .replace(/\[show_info:[\w-]+\]/g, '')
        .trim();

      console.log('🧹 DEBUG: Очищенный текст для отображения:', content);

      return (
        <div key={message.id} style={{ marginBottom: 20 }}>
          <div style={{
            background: "#2a2a5a",
            padding: 15,
            borderRadius: 12,
            maxWidth: "80%",
            marginLeft: 0,
            border: "1px solid rgba(255, 255, 255, 0.1)"
          }}>
            <div style={{ color: "#fff", lineHeight: 1.5 }}>
              {content.split('\n').map((line, i) => (
                <p key={i} style={{ margin: i === 0 ? 0 : '10px 0 0 0' }}>{line}</p>
              ))}
            </div>

            {/* Убираем кнопки - товары добавляются автоматически */}
            {/* Кнопки действий показываем только для удаления и быстрого заказа */}
            {(removeFromCartMatches.length > 0 || orderNowMatches.length > 0 || showInfoMatches.length > 0) && (
              <div style={{ marginTop: 15, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {/* Кнопки удаления из корзины */}
                {removeFromCartMatches.map((m, i) => {
                  const productId = m[1];
                  const product = products.find(p => p.id === productId);
                  console.log(`🔍 DEBUG: Обрабатываем кнопку удаления для ${productId}:`, product);
                  return (
                    <button
                      key={`remove-${i}`}
                      onClick={() => {
                        console.log(`❌ DEBUG: Нажата кнопка удаления для ${productId}`);
                        removeFromCart(productId);
                      }}
                      style={{
                        background: "linear-gradient(45deg, #dc3545, #c82333)",
                        color: "white",
                        border: "none",
                        borderRadius: "20px",
                        padding: "8px 16px",
                        fontSize: "14px",
                        cursor: "pointer",
                        transition: "background 0.2s"
                      }}
                    >
                      ❌ Удалить {product?.name || productId}
                    </button>
                  );
                })}
                
                {/* Кнопки быстрого заказа */}
                {orderNowMatches.map((m, i) => {
                  const productId = m[1];
                  const product = products.find(p => p.id === productId);
                  console.log(`🔍 DEBUG: Обрабатываем кнопку быстрого заказа для ${productId}:`, product);
                  return (
                    <button
                      key={`order-${i}`}
                      onClick={() => {
                        console.log(`⚡ DEBUG: Нажата кнопка быстрого заказа для ${productId}`);
                        handleOrderNow(productId);
                      }}
                      style={{
                        background: "linear-gradient(45deg, #ff00cc, #3333ff)",
                        color: "white",
                        border: "none",
                        borderRadius: "20px",
                        padding: "8px 16px",
                        fontSize: "14px",
                        cursor: "pointer",
                        transition: "background 0.2s"
                      }}
                    >
                      ⚡ Заказать {product?.name || productId}
                    </button>
                  );
                })}
                
                {/* Кнопки показа информации */}
                {showInfoMatches.map((m, i) => {
                  const productId = m[1];
                  const product = products.find(p => p.id === productId);
                  console.log(`🔍 DEBUG: Обрабатываем кнопку информации для ${productId}:`, product);
                  return (
                    <button
                      key={`info-${i}`}
                      onClick={() => {
                        console.log(`ℹ️ DEBUG: Нажата кнопка информации для ${productId}`);
                        // Показываем информацию о продукте
                        const infoMessage = `ℹ️ **${product?.name || productId}**\n\nЦена: ${product?.price || 'N/A'}₽\nОписание: ${product?.description || 'Описание недоступно'}`;
                        setMessages(prev => [...prev, {
                          id: Date.now().toString(),
                          role: 'assistant',
                          content: infoMessage,
                          timestamp: new Date()
                        }]);
                      }}
                      style={{
                        background: "linear-gradient(45deg, #17a2b8, #138496)",
                        color: "white",
                        border: "none",
                        borderRadius: "20px",
                        padding: "8px 16px",
                        fontSize: "14px",
                        cursor: "pointer",
                        transition: "background 0.2s"
                      }}
                    >
                      ℹ️ Инфо {product?.name || productId}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Пользовательское сообщение
    return (
      <div key={message.id} style={{ marginBottom: 20, display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{
          background: "#ff00cc",
          color: "white",
          padding: 12,
          borderRadius: 12,
          maxWidth: "70%",
          marginRight: 0
        }}>
          {content}
        </div>
      </div>
    );
  };

  if (!mounted) {
    return null;
  }

          return (
    <>
      <style jsx global>{`
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
      `}</style>
      <div style={{ 
        maxWidth: 800, 
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 20,
        width: "100%",
        alignItems: "center"
      }}>
      {/* Основной чат */}
      <div style={{ 
        height: "clamp(400px, 60vh, 500px)",
        display: "flex",
        flexDirection: "column",
        background: "rgba(255, 255, 255, 0.05)",
        borderRadius: 12,
        overflow: "hidden",
        width: "100%",
        maxWidth: "700px"
      }}>
        {/* Заголовок чата */}
        <div style={{ 
          padding: "clamp(10px, 2vw, 15px)", 
          background: "rgba(255, 255, 255, 0.1)", 
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px"
        }}>
          <h3 style={{ 
            margin: 0, 
            color: "#fff",
            fontSize: "clamp(16px, 4vw, 18px)"
          }}>
            🤖 AI Консультант
          </h3>
          <div style={{ 
            fontSize: "clamp(10px, 2.5vw, 12px)", 
            color: "#ffffff",
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
            textShadow: "0 1px 2px rgba(0,0,0,0.3)"
          }}>
            <span>💬 {messages.length} сообщений</span>
            <button
              onClick={() => {
                setMessages([{
                  id: '1',
                  role: 'assistant',
                  content: 'История чата очищена! 🧹\n\nДобро пожаловать в spor3s! 🍄 Помогу выбрать грибные добавки:\n\n🧠 Для памяти и концентрации — Ежовик\n😴 Для сна и снятия стресса — Мухомор\n⚡ Для энергии — Кордицепс\n🌟 Комплексное решение — курс 4 в 1\n\nВыберите товары внизу или напишите что вас интересует!',
                  timestamp: new Date()
                }]);
              }}
              style={{
                background: "rgba(255, 107, 107, 0.2)",
                border: "1px solid rgba(255, 107, 107, 0.3)",
                borderRadius: 4,
                padding: "4px 8px",
                color: "#ff6b6b",
                fontSize: "clamp(8px, 2vw, 10px)",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseOver={(e) => {
                const target = e.currentTarget as HTMLButtonElement;
                target.style.background = "rgba(255, 107, 107, 0.3)";
              }}
              onMouseOut={(e) => {
                const target = e.currentTarget as HTMLButtonElement;
                target.style.background = "rgba(255, 107, 107, 0.2)";
              }}
            >
              🧹 Очистить
            </button>
          </div>
        </div>

        {/* Сообщения */}
        <div style={{ 
          flex: 1, 
          padding: "clamp(10px, 2vw, 15px)", 
          overflowY: "auto",
          display: "flex",
          flexDirection: "column"
        }}>
          {messages.map(renderMessage)}
          
          {isLoading && (
            <div style={{ 
              background: "#2a2a5a",
              padding: "clamp(10px, 2vw, 15px)",
              borderRadius: 12,
              maxWidth: "80%",
              marginLeft: 0,
              border: "1px solid rgba(255, 255, 255, 0.1)"
            }}>
              <div style={{ color: "#ffffff", textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
                AI печатает... ⏳
              </div>
            </div>
          )}
          
        <div ref={messagesEndRef} />
      </div>

        {/* Форма ввода */}
        <form onSubmit={handleSubmit} style={{ 
          padding: 15, 
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          display: "flex",
          gap: 10
        }}>
        <input
          type="text"
          value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Задайте вопрос о грибных добавках... (напишите 'очистить' для сброса истории)"
            disabled={isLoading}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 8,
              border: "1px solid rgba(255, 255, 255, 0.2)",
              background: "rgba(255, 255, 255, 0.1)",
              color: "#fff",
              fontSize: 14
            }}
            onFocus={(e) => {
              const target = e.currentTarget as HTMLInputElement;
              target.style.outline = "none";
              target.style.borderColor = "rgba(255, 255, 255, 0.5)";
            }}
            onBlur={(e) => {
              const target = e.currentTarget as HTMLInputElement;
              target.style.borderColor = "rgba(255, 255, 255, 0.2)";
            }}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            style={{
              padding: "12px 20px",
              background: isLoading ? "#666" : "#ff00cc",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: isLoading ? "not-allowed" : "pointer",
              fontSize: 14,
              fontWeight: "bold"
            }}
          >
            {isLoading ? "⏳" : "📤"}
        </button>
      </form>
      </div>

      {/* Меню витрины после чата */}
      <div style={{
        background: "rgba(255, 255, 255, 0.08)",
        borderRadius: 12,
        padding: 20,
        border: "1px solid rgba(255, 255, 255, 0.1)"
      }}>
        <h3 style={{ 
          color: "#fff", 
          textAlign: "center", 
          marginBottom: 20,
          fontSize: 18,
          fontWeight: 600
        }}>
          🛍️ Быстрый доступ к товарам
        </h3>
        
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
          gap: 15,
          marginBottom: 20
        }}>
          {products.slice(0, 4).map(product => (
            <div 
              key={product.id} 
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                borderRadius: 12,
                padding: 15,
                display: "flex",
                alignItems: "center",
                gap: 12,
                cursor: "pointer",
                transition: "transform 0.2s, box-shadow 0.2s",
                color: "#fff",
                border: "1px solid rgba(255, 255, 255, 0.2)"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.3)";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.25)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
              }}
              onClick={() => handleAddToCart(product.id)}
            >
              <div style={{ 
                width: 50, 
                height: 50, 
                borderRadius: 8, 
                overflow: "hidden",
                background: "#f0f0f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                {product.image ? (
                  <img 
                    src={product.image} 
                    alt={product.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      if (target.parentNode) {
                        (target.parentNode as HTMLElement).innerHTML = '<div style="font-size: 20px;">🍄</div>';
                      }
                    }}
                  />
                ) : (
                  <div style={{ fontSize: 20 }}>🍄</div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>
                  {product.name}
                </div>
                <div style={{ color: "#ff00cc", fontWeight: 700, fontSize: 16 }}>
                  {product.price}₽
                </div>
              </div>
              <div style={{ 
                background: "#ff00cc", 
                color: "white", 
                borderRadius: "50%", 
                width: 30, 
                height: 30,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                fontWeight: "bold"
              }}>
                +
              </div>
            </div>
          ))}
        </div>

        {/* Быстрые кнопки */}
        <div style={{ 
          display: "flex", 
          gap: 12, 
          justifyContent: "center",
          flexWrap: "wrap"
        }}>
          <button
            onClick={() => setStep && setStep(2)}
            style={{
              background: "linear-gradient(45deg, #ff00cc, #3333ff)",
              color: "white",
              border: "none",
              borderRadius: 20,
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "transform 0.2s"
            }}
            onMouseOver={(e) => {
              (e.target as HTMLButtonElement).style.transform = "scale(1.05)";
            }}
            onMouseOut={(e) => {
              (e.target as HTMLButtonElement).style.transform = "scale(1)";
            }}
          >
            🛒 Перейти в каталог
          </button>
          
          <button
            onClick={() => {
              const popularProducts = ['4v1']; // Изменено: теперь добавляем курс 4в1 на месяц
              popularProducts.forEach(id => {
                const product = products.find(p => p.id === id);
                if (product) handleAddToCart(id);
              });
            }}
            style={{
              background: "rgba(255, 255, 255, 0.15)",
              color: "#fff",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: 20,
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.2s"
            }}
            onMouseOver={(e) => {
              const target = e.target as HTMLButtonElement;
              target.style.background = "rgba(255, 255, 255, 0.25)";
              target.style.transform = "scale(1.05)";
            }}
            onMouseOut={(e) => {
              const target = e.target as HTMLButtonElement;
              target.style.background = "rgba(255, 255, 255, 0.15)";
              target.style.transform = "scale(1)";
            }}
          >
            ⭐ Добавить курс 4в1
          </button>
        </div>
      </div>
    </div>
    </>
  );
}