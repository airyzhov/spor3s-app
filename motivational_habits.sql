-- Мотивационная привычка — награда уровня 🌿 Собиратель.
-- Выполнить один раз: Supabase → SQL Editor → вставить файл целиком → Run. Повторный запуск ничего не ломает.
-- Правила: lib/habit.ts, база: lib/habitServer.ts, API: app/api/motivational-habit/route.ts.

-- Готовые привычки на выбор (список можно править прямо в таблице: is_active = false прячет строку)
create table if not exists predefined_habits (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  icon text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Привычка пользователя на 4 недели от started_at. Активна одна; законченная гасится при выборе новой.
create table if not exists user_habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  habit_name text not null,
  habit_type text not null default 'custom' check (habit_type in ('predefined', 'custom')),
  description text,
  started_at timestamptz not null default now(),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists user_habits_user_idx on user_habits (user_id, is_active, started_at desc);

-- Отчёт за неделю: один на неделю привычки (unique), SC начисляются в sc_transactions (source_type habit_week)
create table if not exists weekly_habit_reports (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references user_habits(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  week_number int not null check (week_number between 1 and 4),
  is_completed boolean not null,
  note text,
  sc_earned int not null default 0,
  created_at timestamptz not null default now(),
  unique (habit_id, week_number)
);

-- Доступ только у сервера (service role), как у raffle_draws
alter table predefined_habits enable row level security;
alter table user_habits enable row level security;
alter table weekly_habit_reports enable row level security;

insert into predefined_habits (name, description, icon, sort_order) values
  ('Принимать добавки каждый день', 'Ни одного пропуска курса за неделю', '🍄', 1),
  ('Прогулка 30 минут', 'Каждый день на свежем воздухе', '🚶', 2),
  ('Ложиться до 23:00', 'Режим сна — основа восстановления', '😴', 3),
  ('Медитация 10 минут', 'Утром или перед сном', '🧘', 4),
  ('Без телефона за час до сна', 'Экран мешает мозгу отдыхать', '📵', 5),
  ('2 литра воды в день', 'Вода помогает телу и голове', '💧', 6),
  ('Зарядка 10 минут', 'Каждое утро', '🤸', 7),
  ('Чтение 20 минут', 'Книга вместо ленты', '📖', 8),
  ('3 благодарности в дневник', 'Каждый вечер', '📝', 9),
  ('Без сладкого', 'Всю неделю без сахара и сладостей', '🍬', 10)
on conflict (name) do nothing;
