-- Розыгрыш 10.10 (с 28.09): кто нажал «✋ Участвую» и кому бот уже отправил рассылку о розыгрыше.
-- Выполнить ОДИН раз в Supabase → SQL Editor (как raffle_draws.sql). Повторный запуск безопасен.
-- Приложение пишет в эти таблицы ключом service role; из браузера доступа нет (RLS без политик).

create table if not exists public.raffle_entries (
  id uuid primary key default gen_random_uuid(),
  raffle_id text not null,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (raffle_id, user_id)
);

create table if not exists public.raffle_notices (
  id uuid primary key default gen_random_uuid(),
  raffle_id text not null,
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null,
  sent_at timestamptz not null default now(),
  unique (raffle_id, user_id, kind)
);

alter table public.raffle_entries enable row level security;
alter table public.raffle_notices enable row level security;
