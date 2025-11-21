"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface MushroomTrackerProps {
  userId: string;
  orderId: string;
  onCoinsEarned?: (amount: number) => void;
}

interface MushroomDay {
  date: string;
  taken: boolean;
  coinsEarned: number;
}

const MushroomTracker: React.FC<MushroomTrackerProps> = ({ 
  userId, 
  orderId, 
  onCoinsEarned 
}) => {
  const [loading, setLoading] = useState(false);
  const [todayTaken, setTodayTaken] = useState(false);
  const [weekDays, setWeekDays] = useState<MushroomDay[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);

  // Генерируем дни недели
  useEffect(() => {
    const days: MushroomDay[] = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      days.push({
        date: dateStr,
        taken: false,
        coinsEarned: 0
      });
    }
    setWeekDays(days);
  }, []);

  // Проверяем статус приема за последние 7 дней
  useEffect(() => {
    if (!userId || !orderId) return;
    
    async function fetchCheckins() {
      if (!supabase) return; // Проверка наличия клиента Supabase
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      
      const { data: checkins, error } = await supabase
        .from('daily_checkins')
        .select('date')
        .eq('user_id', userId)
        .eq('order_id', orderId)
        .gte('date', weekAgo.toISOString())
        .order('date', { ascending: true });

      if (error) {
        console.error('Ошибка получения чек-инов:', error);
        return;
      }

      // Обновляем статус дней
      setWeekDays(prev => prev.map(day => {
        const taken = checkins?.some(checkin => 
          checkin.date.startsWith(day.date)
        ) || false;
        
        return {
          ...day,
          taken,
          coinsEarned: taken ? 10 : 0
        };
      }));

      // Проверяем сегодняшний день
      const todayStr = today.toISOString().split('T')[0];
      const todayCheckin = checkins?.find(checkin => 
        checkin.date.startsWith(todayStr)
      );
      setTodayTaken(!!todayCheckin);

      // Подсчитываем текущую серию
      let streak = 0;
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayTaken = checkins?.some(checkin => 
          checkin.date.startsWith(dateStr)
        );
        if (dayTaken) {
          streak++;
        } else {
          break;
        }
      }
      setCurrentStreak(streak);
    }

    fetchCheckins();
  }, [userId, orderId]);

  const handleMushroomClick = async (day: MushroomDay) => {
    if (day.taken || loading) return;
    
    // Проверяем, что это сегодняшний день
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    if (day.date !== todayStr) {
      alert('Можно отмечать прием только за сегодня!');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, order_id: orderId })
      });

      const data = await response.json();
      
      if (data.success) {
        // Обновляем статус дня
        setWeekDays(prev => prev.map(d => 
          d.date === day.date ? { ...d, taken: true, coinsEarned: 10 } : d
        ));
        setTodayTaken(true);
        setCurrentStreak(prev => prev + 1);
        
        if (onCoinsEarned) {
          onCoinsEarned(10);
        }
        
        // Показываем уведомление об успехе
        showSuccessNotification();
      } else {
        alert('Ошибка: ' + (data.error || 'Неизвестная ошибка'));
      }
    } catch (error) {
      console.error('Ошибка чек-ина:', error);
      alert('Ошибка при отметке приема');
    } finally {
      setLoading(false);
    }
  };

  const showSuccessNotification = () => {
    // Создаем временное уведомление
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
      color: white;
      padding: 15px 25px;
      border-radius: 25px;
      font-weight: bold;
      font-size: 16px;
      z-index: 1000;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      animation: slideIn 0.5s ease-out;
    `;
    notification.textContent = '🍄 +10 SC за прием добавки!';
    
    // Добавляем CSS анимацию
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(notification);
    
    // Удаляем через 3 секунды
    setTimeout(() => {
      document.body.removeChild(notification);
      document.head.removeChild(style);
    }, 3000);
  };

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Сегодня';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Вчера';
    } else {
      return date.toLocaleDateString('ru-RU', { weekday: 'short' });
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-lg p-6 mb-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-pink-600 mb-2">🍄 Отметка приема</h2>
        <p className="text-gray-600 mb-4">Тапай на гриб, чтобы отметить прием добавки</p>
        
        {currentStreak > 0 && (
          <div className="bg-gradient-to-r from-pink-100 to-blue-100 rounded-lg p-3 mb-4">
            <div className="text-lg font-bold text-pink-600">
              🔥 Серия: {currentStreak} дней подряд!
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-7 gap-2 mb-4">
        {weekDays.map((day, index) => (
          <div key={day.date} className="text-center">
            <div className="text-xs text-gray-500 mb-1">
              {getDayName(day.date)}
            </div>
            <button
              onClick={() => handleMushroomClick(day)}
              disabled={day.taken || loading || day.date !== new Date().toISOString().split('T')[0]}
              className={`
                w-12 h-12 rounded-full transition-all duration-300 transform hover:scale-110
                ${day.taken 
                  ? 'bg-green-500 text-white shadow-lg' 
                  : day.date === new Date().toISOString().split('T')[0]
                    ? 'bg-pink-500 hover:bg-pink-600 text-white shadow-md'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }
                ${loading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {day.taken ? '✅' : '🍄'}
            </button>
            {day.coinsEarned > 0 && (
              <div className="text-xs text-green-600 font-bold mt-1">
                +{day.coinsEarned}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="text-center text-sm text-gray-600">
        {todayTaken ? (
          <div className="text-green-600 font-bold">
            ✅ Сегодня уже принял добавку!
          </div>
        ) : (
          <div className="text-pink-600">
            💡 Тапай на гриб сегодня, чтобы получить +10 SC
          </div>
        )}
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto mb-2"></div>
            <div className="text-gray-600">Отмечаем прием...</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MushroomTracker; 