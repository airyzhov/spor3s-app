import React, { useState } from 'react';

interface SCGiftFormProps {
  userId: string;
  currentBalance: number;
  onGiftSent?: (gift: any) => void;
}

interface Gift {
  id: string;
  amount: number;
  message: string;
  status: string;
  created_at: string;
  expires_at: string;
  receiver?: {
    name: string;
    telegram_id: string;
  };
  sender?: {
    name: string;
    telegram_id: string;
  };
}

const SCGiftForm: React.FC<SCGiftFormProps> = ({ userId, currentBalance, onGiftSent }) => {
  const [receiverId, setReceiverId] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [showGifts, setShowGifts] = useState(false);

  const handleSendGift = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!receiverId.trim()) {
      setError('Введите ID получателя');
      return;
    }

    const giftAmount = parseInt(amount);
    if (!giftAmount || giftAmount <= 0) {
      setError('Введите корректную сумму');
      return;
    }

    if (giftAmount > currentBalance) {
      setError(`Недостаточно SC. Ваш баланс: ${currentBalance} SC`);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/gift-sc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender_id: userId,
          receiver_telegram_id: receiverId.trim(),
          amount: giftAmount,
          message: message.trim() || 'Подарок от друга'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        setReceiverId('');
        setAmount('');
        setMessage('');
        onGiftSent?.(data.gift);
        loadGifts(); // Обновляем список подарков
      } else {
        setError(data.error || 'Ошибка отправки подарка');
      }
    } catch (err) {
      setError('Ошибка отправки подарка');
    } finally {
      setLoading(false);
    }
  };

  const loadGifts = async () => {
    try {
      const response = await fetch(`/api/gift-sc?user_id=${userId}`);
      const data = await response.json();
      
      if (response.ok) {
        setGifts([...data.incoming, ...data.outgoing]);
      }
    } catch (err) {
      console.error('Error loading gifts:', err);
    }
  };

  const handleGiftAction = async (giftId: string, action: 'accepted' | 'declined') => {
    try {
      const response = await fetch('/api/gift-sc', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gift_id: giftId,
          action
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        loadGifts(); // Обновляем список
      } else {
        setError(data.error || 'Ошибка обработки подарка');
      }
    } catch (err) {
      setError('Ошибка обработки подарка');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-md p-6 mb-6">
      <h3 className="text-lg font-bold text-pink-600 mb-4">🎁 Подарить SC другу</h3>
      
      {/* Форма подарка */}
      <form onSubmit={handleSendGift} className="mb-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ID получателя (Telegram ID)
          </label>
          <input
            type="text"
            value={receiverId}
            onChange={(e) => setReceiverId(e.target.value)}
            placeholder="Например: 123456789"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
            disabled={loading}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Количество SC
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Введите сумму"
            min="1"
            max={currentBalance}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
            disabled={loading}
          />
          <div className="text-xs text-gray-500 mt-1">
            Доступно: {currentBalance} SC
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Сообщение (необязательно)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Добавьте сообщение к подарку"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !receiverId.trim() || !amount}
          className="w-full bg-pink-500 text-white py-2 px-4 rounded-md hover:bg-pink-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Отправка...' : 'Отправить подарок'}
        </button>
      </form>

      {/* Сообщения об ошибках и успехе */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md">
          {success}
        </div>
      )}

      {/* Кнопка для просмотра подарков */}
      <button
        onClick={() => {
          setShowGifts(!showGifts);
          if (!showGifts) {
            loadGifts();
          }
        }}
        className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors mb-4"
      >
        {showGifts ? 'Скрыть подарки' : 'Показать мои подарки'}
      </button>

      {/* Список подарков */}
      {showGifts && (
        <div className="mt-4">
          <h4 className="text-md font-semibold text-gray-700 mb-3">Мои подарки</h4>
          {gifts.length === 0 ? (
            <p className="text-gray-500 text-sm">Подарков пока нет</p>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {gifts.map((gift) => (
                <div key={gift.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm font-medium">
                      {gift.sender ? 'Отправлен' : 'Получен'} {gift.amount} SC
                    </div>
                    <div className={`text-xs px-2 py-1 rounded ${
                      gift.status === 'accepted' ? 'bg-green-100 text-green-800' :
                      gift.status === 'declined' ? 'bg-red-100 text-red-800' :
                      gift.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {gift.status === 'accepted' ? 'Принят' :
                       gift.status === 'declined' ? 'Отклонен' :
                       gift.status === 'pending' ? 'Ожидает' : 'Истек'}
                    </div>
                  </div>
                  
                  {gift.message && (
                    <div className="text-sm text-gray-600 mb-2">
                      "{gift.message}"
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500">
                    {new Date(gift.created_at).toLocaleDateString('ru-RU')}
                  </div>

                  {/* Кнопки действий для входящих подарков */}
                  {!gift.sender && gift.status === 'pending' && (
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleGiftAction(gift.id, 'accepted')}
                        className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                      >
                        Принять
                      </button>
                      <button
                        onClick={() => handleGiftAction(gift.id, 'declined')}
                        className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                      >
                        Отклонить
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Информация о подарках */}
      <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
        <div className="text-sm text-yellow-700 mb-1">💡 Как это работает</div>
        <div className="text-xs text-yellow-600 space-y-1">
          <div>• Введите Telegram ID получателя</div>
          <div>• Укажите количество SC для подарка</div>
          <div>• Получатель сможет принять или отклонить подарок</div>
          <div>• Подарок действителен 7 дней</div>
        </div>
      </div>
    </div>
  );
};

export default SCGiftForm; 