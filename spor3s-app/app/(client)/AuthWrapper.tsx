"use client";
import { useEffect, useState } from "react";
import TelegramLoginButton from "../TelegramLoginButton";
import { supabase } from "../../lib/supabase";

// Список Telegram username админов
const ADMINS = ["spor3z"];

interface Order {
  id: string;
  user_id: string;
  items: string;
  total: number;
  status: string;
  fio: string;
  phone: string;
  address: string;
  comment?: string;
  created_at: string;
}

interface AdminUser {
  id: string;
  telegram_id: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

function AdminOrders({ user }: { user: AdminUser }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      setError(null);
      if (!supabase) {
        setError("Supabase client not initialized");
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) setError(error.message);
      setOrders(data || []);
      setLoading(false);
    }
    fetchOrders();
  }, []);

  if (loading) return <div>Загрузка заказов...</div>;
  if (error) return <div style={{ color: "red" }}>Ошибка: {error}</div>;
  if (orders.length === 0) return <div>Нет заказов.</div>;

  return (
    <div>
      <table style={{ width: "100%", fontSize: 14 }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>User ID</th>
            <th>Items</th>
            <th>Сумма</th>
            <th>Статус</th>
            <th>ФИО</th>
            <th>Телефон</th>
            <th>Адрес</th>
            <th>Комментарий</th>
            <th>Дата</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(order => (
            <tr key={order.id}>
              <td>{order.id}</td>
              <td>{order.user_id}</td>
              <td>
                {order.items ? JSON.stringify(order.items) : "-"}
              </td>
              <td>{order.total || "-"}</td>
              <td>{order.status || "pending"}</td>
              <td>{order.fio || "-"}</td>
              <td>{order.phone || "-"}</td>
              <td>{order.address || "-"}</td>
              <td>{order.comment || "-"}</td>
              <td>{order.created_at ? new Date(order.created_at).toLocaleString() : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UserOrders({ user }: { user: any }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinSuccess, setCheckinSuccess] = useState(false);
  const [checkinToday, setCheckinToday] = useState(false);

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      setError(null);
      if (!supabase) {
        setError("Supabase client not initialized");
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) setError(error.message);
      setOrders(data || []);
      setLoading(false);
    }
    fetchOrders();
  }, [user.id]);

  // Находим активный заказ (например, первый в списке)
  const activeOrder = orders && orders.length > 0 ? orders[0] : null;

  // Проверяем, был ли чек-ин сегодня для активного заказа
  useEffect(() => {
    if (!activeOrder) return;
    async function checkCheckinToday() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      if (!supabase) return;
      const { data, error } = await supabase
        .from("daily_checkins")
        .select("id, date")
        .eq("user_id", user.id)
        .eq("order_id", activeOrder.id)
        .gte("date", today.toISOString())
        .lt("date", tomorrow.toISOString());
      if (data && data.length > 0) {
        setCheckinToday(true);
        setCheckinSuccess(true);
      } else {
        setCheckinToday(false);
        setCheckinSuccess(false);
      }
    }
    checkCheckinToday();
  }, [activeOrder, user.id]);

  const handleCheckin = async () => {
    if (!activeOrder) return;
    setCheckinLoading(true);
    setCheckinSuccess(false);
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, order_id: activeOrder.id })
      });
      const data = await res.json();
      if (data.success) {
        setCheckinSuccess(true);
        setCheckinToday(true);
      } else {
        alert("Ошибка чек-ина: " + (data.error || "unknown"));
      }
    } catch (e) {
      alert("Ошибка чек-ина");
    } finally {
      setCheckinLoading(false);
    }
  };

  if (loading) return <div>Загрузка заказов...</div>;
  if (error) return <div style={{ color: "red" }}>Ошибка: {error}</div>;
  if (orders.length === 0) return <div>У вас пока нет заказов.</div>;

  return (
    <div>
      <button
        onClick={handleCheckin}
        disabled={checkinLoading || checkinSuccess || checkinToday || !activeOrder}
        style={{
          marginBottom: 16,
          background: checkinSuccess || checkinToday ? '#ccc' : '#ff00cc',
          color: '#fff',
          border: 'none',
          borderRadius: 999,
          padding: '10px 28px',
          fontWeight: 700,
          fontSize: 17,
          cursor: checkinSuccess || checkinToday ? 'not-allowed' : 'pointer',
          boxShadow: '0 2px 8px #ff00cc33',
          transition: 'background 0.2s'
        }}
      >
        {checkinSuccess || checkinToday ? 'Чек-ин на сегодня уже сделан!' : checkinLoading ? 'Чекаемся...' : 'Сегодня принял добавку'}
      </button>
      <table style={{ width: "100%", fontSize: 14 }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Items</th>
            <th>Сумма</th>
            <th>Статус</th>
            <th>ФИО</th>
            <th>Телефон</th>
            <th>Адрес</th>
            <th>Комментарий</th>
            <th>Дата</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(order => (
            <tr key={order.id}>
              <td>{order.id}</td>
              <td>
                {order.items ? JSON.stringify(order.items) : `${order.product_id} x${order.quantity}`}
              </td>
              <td>{order.total || "-"}</td>
              <td>{order.status || "pending"}</td>
              <td>{order.fio || "-"}</td>
              <td>{order.phone || "-"}</td>
              <td>{order.address || "-"}</td>
              <td>{order.comment || "-"}</td>
              <td>{order.created_at ? new Date(order.created_at).toLocaleString() : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AuthWrapper({ showAuth, setShowAuth, user, setUser }: { showAuth: boolean, setShowAuth: (v: boolean) => void, user: any, setUser: (u: any) => void }) {
  console.log('AuthWrapper user:', user); // DEBUG: log user object
  const [balance, setBalance] = useState(0);
  const [refCode, setRefCode] = useState("");
  const [hasOrders, setHasOrders] = useState(false);

  useEffect(() => {
    if (!user) return;
    async function fetchBalanceAndCode() {
      if (!supabase) return;
      const { data } = await supabase
        .from("orders")
        .select("spores_coin, referral_code")
        .eq("user_id", user.id);
      if (data && data.length > 0) {
        setHasOrders(true);
        setBalance(data.reduce((sum, o) => sum + (o.spores_coin || 0), 0));
        setRefCode(user.username ? user.username : user.id);
      } else {
        setHasOrders(false);
        setBalance(0);
        setRefCode("");
      }
    }
    fetchBalanceAndCode();
  }, [user]);

  if (!showAuth && !user) return null;

  if (!user) {
    return (
      <div style={{ textAlign: "center", margin: 32 }}>
        <h2>Вход через Telegram</h2>
        <TelegramLoginButton onAuth={async tgUser => {
          const res = await fetch('/api/init-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegram_id: tgUser.id.toString() })
          });
          const { id } = await res.json();
          setUser({ ...tgUser, id, telegram_id: tgUser.id.toString() });
          setShowAuth(false);
        }} />
        <button style={{ marginTop: 16 }} onClick={() => setShowAuth(false)}>Отмена</button>
      </div>
    );
  }

  const isAdmin = user && ADMINS.includes(user.username);

  return (
    <div>
      <div style={{ marginBottom: 16, textAlign: "center" }}>
        <b>Вы вошли как:</b> @{user.username} (id: {user.id})
        <button style={{ marginLeft: 16, cursor: 'pointer' }} onClick={() => { setUser(null); setShowAuth(true); }}>Выйти</button>
      </div>
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <div style={{ fontWeight: 600, fontSize: 16, color: '#333', marginBottom: 2 }}>
          Ваш баланс Spor3s
        </div>
        <div style={{ fontSize: 12, color: '#ffffff', marginBottom: 8, textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
          Пользователь: @{user.username || user.id} (ID: {user.id})
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ verticalAlign: 'middle' }}>
            <circle cx="11" cy="11" r="10" fill="#fff" stroke="#ff00cc" strokeWidth="1.5"/>
            <ellipse cx="11" cy="10" rx="6" ry="3.5" fill="#fff" stroke="#3333ff" strokeWidth="0.8"/>
            <ellipse cx="11" cy="10" rx="3.5" ry="1.5" fill="#fff" stroke="#ff00cc" strokeWidth="0.5"/>
            <path d="M8.5 13 Q11 15 13.5 13" stroke="#ff00cc" strokeWidth="0.6" fill="none"/>
            <circle cx="9.5" cy="12" r="0.4" fill="#3333ff"/>
            <circle cx="12.5" cy="12" r="0.4" fill="#3333ff"/>
          </svg>
          <span style={{ fontWeight: 700, color: '#ff00cc', fontSize: 18 }}>{balance}</span>
        </span>
      </div>
      {/* Баллы и скидки только после авторизации */}
      {hasOrders && (
        <section style={{ background: "#f8fafc", borderRadius: 12, padding: 16, marginBottom: 16, fontSize: 15 }}>
          <h2 style={{ fontSize: 18, margin: "0 0 8px 0" }}>Ваши баллы и скидки</h2>
          <b>Баланс Spor3s coin:</b> <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ verticalAlign: 'middle' }}>
              <circle cx="14" cy="14" r="13" fill="#fff" stroke="#ff00cc" strokeWidth="2"/>
              <ellipse cx="14" cy="13" rx="8" ry="5" fill="#fff" stroke="#ff00cc" strokeWidth="1.2"/>
              <ellipse cx="14" cy="13" rx="6" ry="3.2" fill="#fff" stroke="#3333ff" strokeWidth="0.8"/>
              <ellipse cx="14" cy="13" rx="3.2" ry="1.7" fill="#fff" stroke="#ff00cc" strokeWidth="0.5"/>
              <path d="M11.5 16 Q14 18 16.5 16" stroke="#ff00cc" strokeWidth="0.7" fill="none"/>
              <circle cx="12.2" cy="15" r="0.7" fill="#3333ff"/>
              <circle cx="15.8" cy="15" r="0.7" fill="#3333ff"/>
            </svg>
            <span style={{ fontWeight: 700, fontSize: 18, color: '#ff00cc' }}>{balance}</span>
          </span>
          <br />
          <b>Реферальный код:</b> <span style={{ fontFamily: "monospace" }}>{refCode}</span>
          <br />
          <span style={{ fontSize: 13, color: "#ffffff", textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
            Дайте этот код друзьям — они получат скидку, а вы кешбек!
          </span>
        </section>
      )}
      {/* История заказов только после авторизации */}
      {isAdmin ? <AdminOrders user={user} /> : <UserOrders user={user} />}
    </div>
  );
} 