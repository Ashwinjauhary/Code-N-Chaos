-- ============================================================
-- Code N Chaos — Round 2: Tech Gaming Arena
-- Supabase Database Schema (Complete Reset Script)
-- RUN THIS ENTIRE SCRIPT IN YOUR SUPABASE SQL EDITOR TO RESET EVERYTHING
-- ============================================================

-- 0. Drop existing tables and views to start fresh
drop view if exists leaderboard cascade;
drop table if exists game_scores cascade;
drop table if exists event_state cascade;
drop table if exists participants cascade;
drop function if exists submit_score cascade;

-- 1. Participants table
create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  roll_number text not null unique,
  email text not null,
  phone_number text not null,
  class text not null,
  section text not null,
  created_at timestamp with time zone default now()
);

-- 2. Game scores table
create table if not exists game_scores (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid references participants(id) on delete cascade,
  game text not null check (game in ('emoji', 'crossword', 'wordsearch')),
  score integer not null default 0,
  completion_time_seconds integer,
  completed boolean default false,
  updated_at timestamp with time zone default now(),
  unique (participant_id, game)
);

-- 3. Event state table (singleton row for admin control)
create table if not exists event_state (
  id int primary key default 1,
  status text not null default 'not_started' check (status in ('not_started', 'running', 'ended')),
  unlocked_games text[] default '{}',
  started_at timestamp with time zone,
  ended_at timestamp with time zone
);

-- Insert default event state
insert into event_state (id, status) values (1, 'not_started')
on conflict (id) do nothing;

-- 4. Leaderboard VIEW (auto-calculated totals)
create or replace view leaderboard as
select
  p.id as participant_id,
  p.name,
  p.roll_number,
  p.email,
  p.phone_number,
  p.class,
  p.section,
  coalesce(sum(gs.score), 0) as total_score,
  coalesce(sum(gs.completion_time_seconds), 0) as total_time,
  count(*) filter (where gs.completed) as games_completed
from participants p
left join game_scores gs on gs.participant_id = p.id
group by p.id, p.name, p.roll_number, p.email, p.phone_number, p.class, p.section
order by total_score desc, total_time asc;

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

-- Enable RLS
alter table participants enable row level security;
alter table game_scores enable row level security;
alter table event_state enable row level security;

-- Participants policies
create policy "Anyone can register" on participants for insert with check (true);
create policy "Anyone can view participants" on participants for select using (true);

-- Game scores policies
create policy "Anyone can view scores" on game_scores for select using (true);

-- Event state policies
create policy "Anyone can view event state" on event_state for select using (true);
create policy "Anyone can update event state" on event_state for update using (true);

-- ============================================================
-- RPC Function: submit_score
-- ============================================================

create or replace function submit_score(
  p_participant_id uuid,
  p_game text,
  p_score integer,
  p_time_seconds integer,
  p_completed boolean default true
)
returns void
language plpgsql
security definer
as $$
declare
  max_score integer;
begin
  if p_game not in ('emoji', 'crossword', 'wordsearch') then
    raise exception 'Invalid game: %', p_game;
  end if;

  case p_game
    when 'emoji' then max_score := 100;
    when 'crossword' then max_score := 50;
    when 'wordsearch' then max_score := 60;
  end case;

  if p_score > max_score then
    p_score := max_score;
  end if;

  if p_score < 0 then
    p_score := 0;
  end if;

  insert into game_scores (participant_id, game, score, completion_time_seconds, completed, updated_at)
  values (p_participant_id, p_game, p_score, p_time_seconds, p_completed, now())
  on conflict (participant_id, game)
  do update set
    score = excluded.score,
    completion_time_seconds = excluded.completion_time_seconds,
    completed = case when excluded.completed = true then true else game_scores.completed end,
    updated_at = excluded.updated_at;
end;
$$;

-- ============================================================
-- Enable Realtime
-- ============================================================
alter publication supabase_realtime add table game_scores;
alter publication supabase_realtime add table event_state;
