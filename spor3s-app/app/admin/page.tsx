'use client';

import React, { useEffect, useState } from 'react';
import AdminManualCoin from '../../components/AdminManualCoin';

const isAdmin = true; // TODO: заменить на реальную проверку

const SHEETS_BASE = "https://docs.google.com/spreadsheets/d/1ZS8C0_mwUsWr1vgy_lLJ0XPDTmKYT5S9JMWQKfkvADU/edit#gid=";
const SHEET_LINKS = [
  { name: "Заказы", sheet: "orders", gid: "0" },
  { name: "Пользователи", sheet: "users", gid: "TODO_USERS_GID" },
  { name: "Транзакции", sheet: "coin_transactions", gid: "TODO_COIN_GID" },
  { name: "Челленджи", sheet: "challenges", gid: "TODO_CHALLENGE_GID" },
  { name: "Дневные чекины", sheet: "daily_checkins", gid: "TODO_DAILY_GID" },
  { name: "Инструкции", sheet: "instructions", gid: "TODO_INSTR_GID" },
  { name: "Сообщения", sheet: "messages", gid: "TODO_MSG_GID" },
  { name: "Продукты", sheet: "products", gid: "TODO_PROD_GID" },
  { name: "Саплименты", sheet: "supplement_checkins", gid: "TODO_SUPPL_GID" },
  { name: "Опросы", sheet: "surveys", gid: "TODO_SURVEY_GID" },
  { name: "Еженедельные отзывы", sheet: "weekly_reviews", gid: "TODO_WEEKLY_GID" },
];

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/admin/stats');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Ошибка запроса');
        setStats(data);
      } catch (e: any) {
        setError(e.message);
      }
      setLoading(false);
    }
    fetchStats();
  }, []);

  if (!isAdmin) {
    return <div className="max-w-xl mx-auto mt-20 text-center text-red-600 text-xl font-bold">Доступ только для админов</div>;
  }

  return (
    <div className="max-w-2xl mx-auto mt-12 p-6 bg-white rounded-xl shadow-md">
      <h1 className="text-2xl font-bold text-pink-600 mb-6">Админ-панель: Статистика</h1>
      <AdminManualCoin />
      {/* Быстрые ссылки на Google Sheets */}
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-2">Быстрые ссылки на таблицы Google Sheets</h2>
        <ul className="space-y-2">
          {SHEET_LINKS.map(link => (
            <li key={link.sheet}>
              <a href={`${SHEETS_BASE}${link.gid}`} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline font-bold hover:text-pink-600">
                {link.name}
              </a>
              <span className="text-xs text-gray-500 ml-2">({link.sheet})</span>
            </li>
          ))}
        </ul>
      </div>
      {/* Новые заказы за сегодня/неделю и активные чаты */}
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-2">Быстрый доступ к аналитике</h2>
        <ul className="space-y-2">
          <li>
            <a href="https://docs.google.com/spreadsheets/d/1ZS8C0_mwUsWr1vgy_lLJ0XPDTmKYT5S9JMWQKfkvADU/edit#gid=0" target="_blank" rel="noopener noreferrer" className="text-green-700 underline font-bold hover:text-pink-600">
              Новые заказы за сегодня (фильтр по дате в orders)
            </a>
          </li>
          <li>
            <a href="https://docs.google.com/spreadsheets/d/1ZS8C0_mwUsWr1vgy_lLJ0XPDTmKYT5S9JMWQKfkvADU/edit#gid=0" target="_blank" rel="noopener noreferrer" className="text-green-700 underline font-bold hover:text-pink-600">
              Новые заказы за неделю (фильтр по дате в orders)
            </a>
          </li>
          <li>
            <a href="https://docs.google.com/spreadsheets/d/1ZS8C0_mwUsWr1vgy_lLJ0XPDTmKYT5S9JMWQKfkvADU/edit#gid=TODO_MSG_GID" target="_blank" rel="noopener noreferrer" className="text-purple-700 underline font-bold hover:text-pink-600">
              Активные чаты за день (messages, фильтр по дате, группировка по user_id)
            </a>
          </li>
        </ul>
        <div className="text-xs text-gray-500 mt-2">* Используйте фильтры Google Sheets для отбора по дате/статусу.</div>
      </div>
      {/* Старая статистика */}
      {loading ? (
        <div className="max-w-xl mx-auto mt-20 text-center text-lg">Загрузка статистики...</div>
      ) : error ? (
        <div className="max-w-xl mx-auto mt-20 text-center text-red-600">Ошибка: {error}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-extrabold text-blue-700">{stats.totalUsers}</div>
              <div className="text-gray-600">Пользователей</div>
            </div>
            <div className="bg-pink-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-extrabold text-pink-700">{stats.totalSC}</div>
              <div className="text-gray-600">Суммарный SC</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-extrabold text-green-700">{stats.totalOrders}</div>
              <div className="text-gray-600">Заказов</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-extrabold text-yellow-700">{stats.totalTransactions}</div>
              <div className="text-gray-600">Транзакций</div>
            </div>
          </div>
          <h2 className="text-xl font-bold mb-2 mt-6">Топ-10 пользователей по SC</h2>
          <div className="overflow-x-auto mb-8">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-2 py-1">User ID</th>
                  <th className="px-2 py-1">SC</th>
                </tr>
              </thead>
              <tbody>
                {stats.topUsers.map((u: any) => (
                  <tr key={u.user_id} className="border-b last:border-0">
                    <td className="px-2 py-1 font-mono">{u.user_id.slice(0, 8)}...</td>
                    <td className="px-2 py-1 font-bold text-blue-600">{u.sc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
} 