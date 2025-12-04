import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface SCBalanceProps {
  userId: string;
  onExchange: () => void;
  onShowHistory: () => void;
}

const SCBalance: React.FC<SCBalanceProps> = ({ userId, onExchange, onShowHistory }) => {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !supabase) return;
    setLoading(true);
    async function fetchBalance() {
      if (!supabase) {
        setBalance(0);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('coin_transactions')
        .select('amount, transaction_type')
        .eq('user_id', userId);
      if (error) {
        setBalance(0);
        setLoading(false);
        return;
      }
      const total = (data || []).reduce((sum, tx) =>
        sum + (tx.transaction_type === 'spent' ? -tx.amount : tx.amount), 0);
      setBalance(total);
      setLoading(false);
    }
    fetchBalance();
  }, [userId]);

  if (loading || balance === null) {
    return <div className="w-full text-center py-4">Загрузка баланса...</div>;
  }

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-md p-6 mb-6 text-center">
      <div className="text-2xl font-bold text-pink-600 mb-2">Ваш баланс</div>
      <div className="text-4xl font-extrabold text-blue-600 mb-4">{balance} SC</div>
      <div className="flex justify-center gap-4">
        <button className="bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 px-4 rounded-full transition" onClick={onExchange}>
          Обменять SC
        </button>
        <button className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full transition" onClick={onShowHistory}>
          История
        </button>
      </div>
    </div>
  );
};

export default SCBalance; 