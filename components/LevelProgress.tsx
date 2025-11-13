import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient.client';
import { getLevelInfo, formatSCAmount, formatOrderAmount } from '../lib/levelUtils';

interface LevelProgressProps {
  userId: string;
}

interface UserLevelData {
  current_level: string;
  level_code: string;
  current_sc_balance: number;
  total_sc_earned: number;
  total_sc_spent: number;
  total_orders_amount: number;
  orders_count: number;
  has_motivational_habit: boolean;
  has_expert_chat_access: boolean;
  has_permanent_discount: boolean;
  has_vip_access: boolean;
  level_achieved_at: string | null;
}

const LevelProgress: React.FC<LevelProgressProps> = ({ userId }) => {
  const [userLevel, setUserLevel] = useState<UserLevelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    
    setLoading(true);
    async function fetchUserLevel() {
      try {
        const response = await fetch(`/api/user-level?user_id=${userId}`);
        const data = await response.json();
        
        if (response.ok) {
          setUserLevel(data.level);
        } else {
          setError(data.error || 'Ошибка загрузки данных');
        }
      } catch (err) {
        setError('Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    }
    
    fetchUserLevel();
  }, [userId]);

  if (loading) {
    return (
      <div className="w-full text-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto"></div>
        <p className="mt-2 text-gray-600">Загрузка прогресса...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full text-center py-4">
        <p className="text-red-500">Ошибка: {error}</p>
      </div>
    );
  }

  if (!userLevel) {
    return (
      <div className="w-full text-center py-4">
        <p className="text-gray-500">Данные не найдены</p>
      </div>
    );
  }

  const levelInfo = getLevelInfo(
    userLevel.current_sc_balance, 
    userLevel.total_orders_amount, 
    userLevel.orders_count
  );

  const discountPercentage = userLevel.has_vip_access ? 10 : 
                           userLevel.has_permanent_discount ? 5 : 0;

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-md p-6 mb-6" style={{
      width: "100%",
      maxWidth: "500px",
      margin: "0 auto",
      display: "flex",
      flexDirection: "column",
      alignItems: "center"
    }}>
      {/* Текущий уровень */}
      <div className="flex items-center justify-between mb-4" style={{
        width: "100%",
        flexWrap: "wrap",
        gap: "10px"
      }}>
        <div className="flex items-center" style={{
          flex: "1",
          minWidth: "200px"
        }}>
          <span className="text-2xl mr-2" style={{
            fontSize: "clamp(20px, 5vw, 24px)"
          }}>{levelInfo.levelIcon}</span>
          <div>
            <div className="text-lg font-bold text-pink-600" style={{
              fontSize: "clamp(16px, 4vw, 18px)"
            }}>{levelInfo.levelName}</div>
            <div className="text-sm text-gray-500" style={{
              fontSize: "clamp(12px, 3vw, 14px)"
            }}>Уровень {levelInfo.level}</div>
          </div>
        </div>
        <div className="text-right" style={{
          flex: "0 0 auto"
        }}>
          <div className="text-lg font-bold text-blue-600" style={{
            fontSize: "clamp(16px, 4vw, 18px)"
          }}>{formatSCAmount(userLevel.current_sc_balance)}</div>
          <div className="text-xs text-gray-500" style={{
            fontSize: "clamp(10px, 2.5vw, 12px)"
          }}>Баланс</div>
        </div>
      </div>

      {/* Прогресс-бар */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Прогресс к следующему уровню</span>
          <span>{Math.round(levelInfo.progress * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-pink-400 to-blue-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${Math.round(levelInfo.progress * 100)}%` }}
          ></div>
        </div>
        {levelInfo.nextLevelName && (
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>До следующего уровня: {formatSCAmount(levelInfo.scToNext)}</span>
            <span>{levelInfo.nextLevelName}</span>
          </div>
        )}
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-sm text-gray-600">Заработано</div>
          <div className="text-lg font-bold text-green-600">{formatSCAmount(userLevel.total_sc_earned)}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-sm text-gray-600">Потрачено</div>
          <div className="text-lg font-bold text-red-600">{formatSCAmount(userLevel.total_sc_spent)}</div>
        </div>
      </div>

      {/* Информация о заказах */}
      <div className="bg-blue-50 rounded-lg p-3 mb-4">
        <div className="text-sm text-blue-600 mb-2">Информация о заказах</div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-600">Количество:</span>
            <span className="font-bold ml-1">{userLevel.orders_count}</span>
          </div>
          <div>
            <span className="text-gray-600">Сумма:</span>
            <span className="font-bold ml-1">{formatOrderAmount(userLevel.total_orders_amount)}</span>
          </div>
        </div>
      </div>

      {/* Преимущества уровня */}
      <div className="mb-4">
        <div className="text-sm font-semibold text-gray-700 mb-2">Ваши преимущества:</div>
        <div className="space-y-1">
          {levelInfo.benefits.map((benefit, index) => (
            <div key={index} className="flex items-center text-sm text-gray-600">
              <span className="text-green-500 mr-2">✓</span>
              {benefit}
            </div>
          ))}
        </div>
      </div>

      {/* Скидка */}
      {discountPercentage > 0 && (
        <div className="bg-pink-50 rounded-lg p-3">
          <div className="text-sm text-pink-600 mb-1">Ваша скидка</div>
          <div className="text-lg font-bold text-pink-600">{discountPercentage}%</div>
          <div className="text-xs text-pink-500">
            {discountPercentage === 10 ? 'Постоянная скидка на все заказы' : 'Скидка на заказы'}
          </div>
        </div>
      )}

      {/* Конвертация SC */}
      <div className="bg-yellow-50 rounded-lg p-3 mt-4">
        <div className="text-sm text-yellow-700 mb-1">💡 Конвертация SC</div>
        <div className="text-xs text-yellow-600">
          1 SC = 1 рубль при оплате до 30% заказа
        </div>
      </div>
    </div>
  );
};

export default LevelProgress; 