import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface SCTransactionsHistoryProps {
  userId: string;
  onClose: () => void;
}

const SCTransactionsHistory: React.FC<SCTransactionsHistoryProps> = ({ userId, onClose }) => {
  const [txs, setTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    async function fetchTxs() {
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('coin_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      setTxs(data || []);
      setLoading(false);
    }
    fetchTxs();
  }, [userId]);

  if (loading) {
    return <div className="w-full text-center py-4">Загрузка истории...</div>;
  }

  return (
    <div className="w-full max-w-lg mx-auto bg-white rounded-xl shadow-md p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <div className="text-lg font-bold text-blue-600">История транзакций</div>
        <button className="text-pink-500 hover:underline" onClick={onClose}>Закрыть</button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-2 py-1">Дата</th>
              <th className="px-2 py-1">Сумма</th>
              <th className="px-2 py-1">Тип</th>
              <th className="px-2 py-1">Описание</th>
            </tr>
          </thead>
          <tbody>
            {txs.map(tx => (
              <tr key={tx.id} className="border-b last:border-0">
                <td className="px-2 py-1 whitespace-nowrap">{new Date(tx.created_at).toLocaleDateString()}</td>
                <td className={"px-2 py-1 font-bold " + (tx.transaction_type === 'spent' ? 'text-red-500' : 'text-green-600')}>
                  {tx.transaction_type === 'spent' ? '-' : '+'}{tx.amount}
                </td>
                <td className="px-2 py-1">{tx.transaction_type}</td>
                <td className="px-2 py-1">{tx.description || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SCTransactionsHistory; 