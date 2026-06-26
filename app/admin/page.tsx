"use client";
import { useState, useEffect, useCallback } from "react";

type Stats = {
  totalUsers: number;
  totalSC: number;
  totalOrders: number;
  totalTransactions: number;
  topUsers: { user_id: string; sc: number }[];
};
type UserBal = { id: string; telegram_id: string; name: string | null; balance: number };

const card: React.CSSProperties = {
  background: "#1e293b",
  borderRadius: 12,
  padding: "16px 20px",
  border: "1px solid #334155",
};
const input: React.CSSProperties = {
  width: "100%",
  padding: 12,
  borderRadius: 8,
  border: "1px solid #475569",
  background: "#0f172a",
  color: "#fff",
  fontSize: 14,
  boxSizing: "border-box",
};
const btn: React.CSSProperties = {
  background: "linear-gradient(45deg, #ff00cc, #3333ff)",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "12px 20px",
  fontSize: 14,
  fontWeight: "bold",
  cursor: "pointer",
};

export default function AdminPage() {
  const [secretInput, setSecretInput] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserBal[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  const [coinUser, setCoinUser] = useState("");
  const [coinAmount, setCoinAmount] = useState("");
  const [coinDesc, setCoinDesc] = useState("");
  const [coinMsg, setCoinMsg] = useState("");

  // Ссылка на внешнюю общую таблицу (Google Sheets) — задаётся в .env.local
  const sheetUrl = process.env.NEXT_PUBLIC_SHEET_URL;

  const loadData = useCallback(async (s: string) => {
    setLoading(true);
    setError("");
    try {
      const [rs, ru, ro] = await Promise.all([
        fetch("/api/admin/stats", { headers: { "x-admin-secret": s } }),
        fetch("/api/admin/users-balances", { headers: { "x-admin-secret": s } }),
        fetch("/api/admin/orders", { headers: { "x-admin-secret": s } }),
      ]);
      if (rs.status === 401 || ru.status === 401 || ro.status === 401) throw new Error("unauthorized");
      const sd = await rs.json();
      const ud = await ru.json();
      const od = await ro.json();
      setStats(sd);
      setUsers(ud.users || []);
      setOrders(od.orders || []);
      setAuthed(true);
      setSecret(s);
      sessionStorage.setItem("admin_secret", s);
    } catch (e: any) {
      setAuthed(false);
      setSecret(null);
      sessionStorage.removeItem("admin_secret");
      setError(e?.message === "unauthorized" ? "Неверный пароль" : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? sessionStorage.getItem("admin_secret") : null;
    if (saved) loadData(saved);
  }, [loadData]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (secretInput) loadData(secretInput);
  };

  const logout = () => {
    sessionStorage.removeItem("admin_secret");
    setAuthed(false);
    setSecret(null);
    setSecretInput("");
  };

  const grantCoins = async (e: React.FormEvent) => {
    e.preventDefault();
    setCoinMsg("");
    if (!coinUser || !coinAmount) {
      setCoinMsg("Выберите пользователя и введите сумму");
      return;
    }
    const r = await fetch("/api/admin/manual-coin", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-secret": secret || "" },
      body: JSON.stringify({ user_id: coinUser, amount: Number(coinAmount), description: coinDesc }),
    });
    const d = await r.json();
    if (d.success) {
      setCoinMsg("✅ Начислено");
      setCoinAmount("");
      setCoinDesc("");
      if (secret) loadData(secret);
    } else {
      setCoinMsg("❌ " + (d.error || "Ошибка"));
    }
  };

  const updateOrderStatus = async (id: string, status: string) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-secret": secret || "" },
      body: JSON.stringify({ id, status }),
    });
  };

  const itemsSummary = (items: any) => {
    const arr = Array.isArray(items) ? items : [];
    if (arr.length === 0) return "—";
    return arr.map((i: any) => `${i.name || i.id || "товар"}${i.quantity ? ` ×${i.quantity}` : ""}`).join(", ");
  };

  const ORDER_STATUSES = ["pending", "paid", "shipped", "completed", "cancelled"];

  const wrap: React.CSSProperties = {
    minHeight: "100vh",
    background: "#0b1220",
    color: "#fff",
    padding: 20,
    fontFamily: "system-ui, sans-serif",
  };

  if (!authed) {
    return (
      <div style={wrap}>
        <div style={{ maxWidth: 360, margin: "60px auto" }}>
          <h1 style={{ fontSize: 22, marginBottom: 20 }}>🔐 Админка spor3s</h1>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="Пароль администратора"
              value={secretInput}
              onChange={(e) => setSecretInput(e.target.value)}
              style={{ ...input, marginBottom: 12 }}
              autoFocus
            />
            <button type="submit" style={{ ...btn, width: "100%" }} disabled={loading}>
              {loading ? "Проверяю…" : "Войти"}
            </button>
          </form>
          {error && <div style={{ color: "#f87171", marginTop: 12 }}>{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, gap: 10, flexWrap: "wrap" }}>
          <h1 style={{ fontSize: 22, margin: 0 }}>📊 Админка spor3s</h1>
          <div style={{ display: "flex", gap: 10 }}>
            {sheetUrl && (
              <a
                href={sheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ ...btn, background: "#0f766e", padding: "8px 14px", textDecoration: "none", display: "inline-flex", alignItems: "center" }}
              >
                📋 Общая таблица
              </a>
            )}
            <button onClick={logout} style={{ ...btn, background: "#334155", padding: "8px 14px" }}>
              Выйти
            </button>
          </div>
        </div>

        {/* Статистика */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 28 }}>
          <div style={card}>
            <div style={{ color: "#94a3b8", fontSize: 13 }}>Пользователей</div>
            <div style={{ fontSize: 26, fontWeight: "bold" }}>{stats?.totalUsers ?? "—"}</div>
          </div>
          <div style={card}>
            <div style={{ color: "#94a3b8", fontSize: 13 }}>Всего SC</div>
            <div style={{ fontSize: 26, fontWeight: "bold" }}>{stats?.totalSC ?? "—"}</div>
          </div>
          <div style={card}>
            <div style={{ color: "#94a3b8", fontSize: 13 }}>Заказов</div>
            <div style={{ fontSize: 26, fontWeight: "bold" }}>{stats?.totalOrders ?? "—"}</div>
          </div>
          <div style={card}>
            <div style={{ color: "#94a3b8", fontSize: 13 }}>Транзакций SC</div>
            <div style={{ fontSize: 26, fontWeight: "bold" }}>{stats?.totalTransactions ?? "—"}</div>
          </div>
        </div>

        {/* Заказы / продажи */}
        <div style={{ ...card, marginBottom: 28 }}>
          <h2 style={{ fontSize: 17, marginTop: 0, marginBottom: 14 }}>🛒 Заказы ({orders.length})</h2>
          {orders.length === 0 ? (
            <div style={{ color: "#94a3b8", fontSize: 14 }}>Пока заказов нет.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ color: "#94a3b8", textAlign: "left" }}>
                    <th style={{ padding: "8px 8px" }}>Дата</th>
                    <th style={{ padding: "8px 8px" }}>ФИО</th>
                    <th style={{ padding: "8px 8px" }}>Телефон</th>
                    <th style={{ padding: "8px 8px" }}>Товары</th>
                    <th style={{ padding: "8px 8px" }}>Адрес</th>
                    <th style={{ padding: "8px 8px", textAlign: "right" }}>Сумма</th>
                    <th style={{ padding: "8px 8px" }}>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} style={{ borderTop: "1px solid #334155", verticalAlign: "top" }}>
                      <td style={{ padding: "8px 8px", whiteSpace: "nowrap", color: "#cbd5e1" }}>
                        {o.created_at ? new Date(o.created_at).toLocaleDateString("ru-RU") : "—"}
                      </td>
                      <td style={{ padding: "8px 8px" }}>{o.fio || "—"}</td>
                      <td style={{ padding: "8px 8px", whiteSpace: "nowrap" }}>{o.phone || "—"}</td>
                      <td style={{ padding: "8px 8px", maxWidth: 220 }}>{itemsSummary(o.items)}</td>
                      <td style={{ padding: "8px 8px", maxWidth: 200, color: "#cbd5e1" }}>{o.address || "—"}</td>
                      <td style={{ padding: "8px 8px", textAlign: "right", fontWeight: "bold", whiteSpace: "nowrap" }}>{o.total} ₽</td>
                      <td style={{ padding: "8px 8px" }}>
                        <select
                          value={o.status || "pending"}
                          onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                          style={{ ...input, padding: 6, width: "auto", fontSize: 12 }}
                        >
                          {ORDER_STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Ручное начисление SC */}
        <div style={{ ...card, marginBottom: 28 }}>
          <h2 style={{ fontSize: 17, marginTop: 0, marginBottom: 14 }}>💰 Начислить SC</h2>
          <form onSubmit={grantCoins} style={{ display: "grid", gap: 10 }}>
            <select value={coinUser} onChange={(e) => setCoinUser(e.target.value)} style={input}>
              <option value="">— выберите пользователя —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {(u.name || u.telegram_id || u.id.slice(0, 8))} — {u.balance} SC
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Сумма SC (можно отрицательную для списания)"
              value={coinAmount}
              onChange={(e) => setCoinAmount(e.target.value)}
              style={input}
            />
            <input
              type="text"
              placeholder="Комментарий (необязательно)"
              value={coinDesc}
              onChange={(e) => setCoinDesc(e.target.value)}
              style={input}
            />
            <button type="submit" style={btn}>Начислить</button>
            {coinMsg && <div style={{ fontSize: 14 }}>{coinMsg}</div>}
          </form>
        </div>

        {/* Балансы пользователей */}
        <div style={card}>
          <h2 style={{ fontSize: 17, marginTop: 0, marginBottom: 14 }}>👥 Балансы пользователей ({users.length})</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ color: "#94a3b8", textAlign: "left" }}>
                  <th style={{ padding: "8px 10px" }}>Имя</th>
                  <th style={{ padding: "8px 10px" }}>Telegram ID</th>
                  <th style={{ padding: "8px 10px", textAlign: "right" }}>Баланс SC</th>
                </tr>
              </thead>
              <tbody>
                {users
                  .slice()
                  .sort((a, b) => b.balance - a.balance)
                  .map((u) => (
                    <tr key={u.id} style={{ borderTop: "1px solid #334155" }}>
                      <td style={{ padding: "8px 10px" }}>{u.name || "—"}</td>
                      <td style={{ padding: "8px 10px", fontFamily: "monospace", color: "#cbd5e1" }}>{u.telegram_id}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: "bold" }}>{u.balance}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
