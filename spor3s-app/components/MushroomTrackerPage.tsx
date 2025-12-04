"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import MushroomTracker from './MushroomTracker';

interface MushroomTrackerPageProps {
  userId: string;
  onCoinsEarned?: (amount: number) => void;
}

const MushroomTrackerPage: React.FC<MushroomTrackerPageProps> = ({ 
  userId, 
  onCoinsEarned 
}) => {
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || userId === 'loading') return;
    
    async function fetchActiveOrder() {
      setLoading(true);
      setError(null);
      
      if (!supabase) {
        setError('Ошибка подключения к базе данных');
        setLoading(false);
        return;
      }

      try {
        // Получаем самый последний заказ пользователя
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (ordersError) {
          throw new Error(ordersError.message);
        }

        if (!orders || orders.length === 0) {
          setError('У вас пока нет заказов. Сначала оформите заказ!');
          setLoading(false);
          return;
        }

        setActiveOrder(orders[0]);
        setLoading(false);
      } catch (err) {
        console.error('Ошибка получения заказа:', err);
        setError('Ошибка загрузки заказа');
        setLoading(false);
      }
    }

    fetchActiveOrder();
  }, [userId]);

  if (loading) {
    return (
      <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-lg p-6 mb-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto mb-4"></div>
        <div className="text-gray-600">Загружаем данные заказа...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-lg p-6 mb-6 text-center">
        <div className="text-red-500 text-lg mb-4">⚠️ {error}</div>
        <div className="text-gray-600 mb-4">
          Для отслеживания приема добавок необходимо оформить заказ.
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 px-4 rounded-full transition"
        >
          🔄 Обновить
        </button>
      </div>
    );
  }

  if (!activeOrder) {
    return (
      <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-lg p-6 mb-6 text-center">
        <div className="text-gray-600 text-lg mb-4">📦 Заказ не найден</div>
        <div className="text-gray-500 mb-4">
          Оформите заказ, чтобы начать отслеживать прием добавок.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Информация о заказе */}
      <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold text-pink-600 mb-2">📦 Ваш заказ</h2>
          <div className="text-sm text-gray-600">
            ID: {activeOrder.id.slice(0, 8)}...
          </div>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Статус:</span>
            <span className={`font-bold ${
              activeOrder.status === 'pending' ? 'text-yellow-600' : 
              activeOrder.status === 'completed' ? 'text-green-600' : 'text-gray-600'
            }`}>
              {activeOrder.status === 'pending' ? '⏳ В обработке' : 
               activeOrder.status === 'completed' ? '✅ Выполнен' : activeOrder.status}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Сумма:</span>
            <span className="font-bold text-blue-600">{activeOrder.total || 0} ₽</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">SC баланс:</span>
            <span className="font-bold text-green-600">{activeOrder.spores_coin || 0} SC</span>
          </div>
          
          {activeOrder.created_at && (
            <div className="flex justify-between">
              <span className="text-gray-600">Дата заказа:</span>
              <span className="text-gray-800">
                {new Date(activeOrder.created_at).toLocaleDateString('ru-RU')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Трекер грибов */}
      <MushroomTracker 
        userId={userId}
        orderId={activeOrder.id}
        onCoinsEarned={onCoinsEarned}
      />

      {/* Дополнительная информация */}
      <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="text-center mb-4">
          <h3 className="text-lg font-bold text-pink-600 mb-2">💡 Как это работает</h3>
        </div>
        
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start gap-3">
            <span className="text-pink-500 font-bold">🍄</span>
            <span>Тапай на гриб каждый день, когда принимаешь добавку</span>
          </div>
          
          <div className="flex items-start gap-3">
            <span className="text-green-500 font-bold">💰</span>
            <span>Получай +10 SC за каждый прием</span>
          </div>
          
          <div className="flex items-start gap-3">
            <span className="text-blue-500 font-bold">🔥</span>
            <span>Строй серию дней подряд для бонусов</span>
          </div>
          
          <div className="flex items-start gap-3">
            <span className="text-yellow-500 font-bold">⚠️</span>
            <span>Можно отметить прием только один раз в день</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MushroomTrackerPage; 