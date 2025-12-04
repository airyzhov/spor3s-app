import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface SCExchangeFormProps {
  userId: string;
  currentBalance: number;
  onSuccess: () => void;
  onCancel: () => void;
  dailyLimit?: number;
}

const SCExchangeForm: React.FC<SCExchangeFormProps> = ({ userId, currentBalance, onSuccess, onCancel, dailyLimit = 100 }) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleExchange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const num = parseInt(amount, 10);
    if (isNaN(num) || num <= 0) {
      setError('Введите корректную сумму');
      return;
    }
    if (num > currentBalance) {
      setError('Недостаточно SC на балансе');
      return;
    }
    if (num > dailyLimit) {
      setError(`Лимит обмена: ${dailyLimit} SC в день`);
      return;
    }
    setLoading(true);
    
    if (!supabase) {
      setError('Ошибка подключения к базе данных');
      setLoading(false);
      return;
    }

    // Пример: создаём транзакцию "spent" (реальный обмен — доработать под бизнес-логику)
    const { error: txError } = await supabase
      .from('coin_transactions')
      .insert([
        {
          user_id: userId,
          amount: num,
          transaction_type: 'spent',
          source: 'exchange',
          description: 'Обмен SC на бонус',
          created_at: new Date().toISOString(),
        }
      ]);
    setLoading(false);
    if (txError) {
      setError('Ошибка обмена: ' + txError.message);
      return;
    }
    setSuccess(true);
    setTimeout(() => {
      onSuccess();
    }, 1200);
  };

  return (
    <div className="w-full max-w-sm mx-auto bg-white rounded-xl shadow-md p-6 mb-6">
      <div className="text-lg font-bold text-pink-600 mb-2">Обменять SC</div>
      <form onSubmit={handleExchange}>
        <input
          type="number"
          min={1}
          max={currentBalance}
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="w-full border rounded px-3 py-2 mb-3 text-lg"
          placeholder="Сколько SC обменять?"
          disabled={loading || success}
        />
        <div className="text-xs text-gray-500 mb-2">Баланс: {currentBalance} SC. Лимит: {dailyLimit} SC/день.</div>
        {error && <div className="text-red-500 mb-2">{error}</div>}
        {success && <div className="text-green-600 mb-2">Обмен успешно выполнен!</div>}
        <div className="flex gap-2 mt-2">
          <button type="submit" className="bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 px-4 rounded-full transition w-full" disabled={loading || success}>
            {loading ? 'Обмен...' : 'Обменять'}
          </button>
          <button type="button" className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded-full transition w-full" onClick={onCancel} disabled={loading || success}>
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
};

export default SCExchangeForm; 