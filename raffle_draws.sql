-- Итоги розыгрышей (см. docs/superpowers/specs/2026-09-24-raffle-10-10-design.md, §6).
-- Выполнить один раз в Supabase → SQL Editor. Текущий итог — последняя строка по drawn_at,
-- каждая попытка «переиграть» — новая строка, история остаётся.
create table if not exists raffle_draws (
  id uuid primary key default gen_random_uuid(),
  raffle_id text not null,
  drawn_at timestamptz not null default now(),
  participants jsonb not null,
  winners jsonb not null
);
create index if not exists raffle_draws_raffle_idx on raffle_draws (raffle_id, drawn_at desc);
-- RLS без политик: читать и писать может только сервер (service role)
alter table raffle_draws enable row level security;
