"use client";
import { useState, type CSSProperties } from "react";
import { pickUsers } from "../../lib/adminSearch";
import { input } from "./styles";

// Выбор человека в «💰 Начислить SC»: поиск по части ника или Telegram ID вместо длинного списка
// (просьба владельца 30.09). У варианта видны ник, имя, ID и баланс — чтобы не перепутать.
export type PickerUser = { id: string; telegram_id: string | null; name: string | null; username?: string | null; balance: number };

export function userLine(u: PickerUser): string {
  const nick = String(u.username || "").replace(/^@/, "").trim();
  return [nick ? `@${nick}` : "без ника", u.name, u.telegram_id ? `ID ${u.telegram_id}` : null, `${u.balance} SC`]
    .filter(Boolean)
    .join(" · ");
}

const option: CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  background: "#0f172a",
  color: "#fff",
  border: "1px solid #334155",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 14,
  cursor: "pointer",
  marginTop: 6,
};
const hint: CSSProperties = { color: "#94a3b8", fontSize: 13, marginTop: 8 };

interface UserPickerProps {
  users: PickerUser[];
  value: string; // id выбранного или ""
  onChange: (id: string) => void;
}

export default function UserPicker({ users, value, onChange }: UserPickerProps) {
  const [query, setQuery] = useState("");
  const chosen = value ? users.find((u) => u.id === value) : undefined;

  if (chosen) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        background: "#0f172a",
        border: "1px solid #22c55e",
        borderRadius: 8,
        padding: "10px 12px",
        fontSize: 14,
      }}>
        <span>✅ Выбран: {userLine(chosen)}</span>
        <button
          type="button"
          onClick={() => onChange("")}
          style={{ background: "none", border: "none", color: "#38bdf8", cursor: "pointer", fontSize: 14, padding: 0 }}
        >
          сменить
        </button>
      </div>
    );
  }

  const { matches, total } = pickUsers(users, query);
  const choose = (id: string) => {
    setQuery("");
    onChange(id);
  };

  return (
    <div>
      <input
        type="search"
        aria-label="Поиск пользователя"
        placeholder="🔍 @ник или Telegram ID"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault(); // Enter в поле поиска не отправляет форму начисления
          if (matches[0]) choose(matches[0].id);
        }}
        autoComplete="off"
        style={input}
      />
      {query.trim() !== "" && (
        <div>
          {matches.map((u) => (
            <button key={u.id} type="button" onClick={() => choose(u.id)} style={option}>
              {userLine(u)}
            </button>
          ))}
          {total === 0 && <div style={hint}>Никого не нашли</div>}
          {total > matches.length && <div style={hint}>ещё {total - matches.length} — уточните поиск</div>}
        </div>
      )}
    </div>
  );
}
