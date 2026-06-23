import React, { useState, useEffect } from 'react';

export default function AdminManualCoin() {
  const [show, setShow] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!show) return;
    setLoading(true);
    fetch('/api/admin/users-balances')
      .then(r => r.json())
      .then(data => {
        setUsers(data.users || []);
        setLoading(false);
      });
  }, [show]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    if (!selected || !amount) {
      setError('Выберите пользователя и введите сумму');
      return;
    }
    setLoading(true);
    const res = await fetch('/api/admin/manual-coin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: selected, amount: Number(amount), description: desc })
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) {
      setSuccess(true);
      setAmount('');
      setDesc('');
    } else {
      setError(data.error || 'Ошибка начисления');
    }
  };

  return (
    <div className="mb-8">
      <button className="bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 px-4 rounded-full transition" onClick={() => setShow(true)}>
        Начислить SC
      </button>
      {show && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-md p-6 w-full max-w-lg relative">
            <button className="absolute top-2 right-3 text-xl" onClick={() => setShow(false)}>&times;</button>
            <h2 className="text-lg font-bold mb-3">Начислить SC пользователю</h2>
            {loading ? <div>Загрузка...</div> : (
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="block mb-1 font-semibold">Пользователь:</label>
                  <select className="w-full border rounded px-2 py-1" value={selected} onChange={e => setSelected(e.target.value)} required>
                    <option value="">Выберите...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name || u.telegram_id || u.id.slice(0,8)} — {u.balance} SC
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="block mb-1 font-semibold">Сумма SC:</label>
                  <input type="number" className="w-full border rounded px-2 py-1" value={amount} onChange={e => setAmount(e.target.value)} required min={-100000} placeholder="Например, 10 или -10" />
                  <div className="text-xs text-gray-500 mt-1">
                    Введите положительное число для начисления, отрицательное — для списания. <br />
                    Чтобы выставить точный баланс, введите разницу между текущим и нужным значением.
                  </div>
                </div>
                <div className="mb-3">
                  <label className="block mb-1 font-semibold">Комментарий:</label>
                  <input type="text" className="w-full border rounded px-2 py-1" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Причина начисления" />
                </div>
                {error && <div className="text-red-600 mb-2">{error}</div>}
                {success && <div className="text-green-600 mb-2">Начисление успешно!</div>}
                <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full transition" disabled={loading}>
                  Начислить
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 