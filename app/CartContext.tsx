"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: { id: string; name: string; price: number }) => void;
  removeFromCart: (productId: string) => void;
  changeQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Отладочная информация при изменении корзины
  useEffect(() => {
    console.log('🛒 CartContext: Состояние корзины изменилось:', cart);
  }, [cart]);

  const addToCart = (product: { id: string; name: string; price: number }) => {
    console.log('🛒 CartContext: addToCart вызвана с продуктом:', product);
    setCart(prev => {
      console.log('🛒 CartContext: Текущая корзина:', prev);
      const existingItem = prev.find(item => item.id === product.id);
      if (existingItem) {
        console.log('🛒 CartContext: Продукт уже в корзине, увеличиваем количество');
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      console.log('🛒 CartContext: Добавляем новый продукт в корзину');
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const changeQuantity = (productId: string, quantity: number) => {
    if (quantity < 0) return;
    if (quantity === 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const getTotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        changeQuantity,
        clearCart,
        getTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
} 