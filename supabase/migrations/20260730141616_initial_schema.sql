-- ============================================================
-- Code N Chaos — Round 2: Tech Gaming Arena
-- Supabase Database Schema
-- Run this in your Supabase SQL Editor (supabase.com → SQL Editor)
-- ============================================================

-- 1. Participants table
create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  roll_number text not null unique,
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
  coalesce(sum(gs.score), 0) as total_score,
  coalesce(sum(gs.completion_time_seconds), 0) as total_time,
  count(*) filter (where gs.completed) as games_completed
from participants p
left join game_scores gs on gs.participant_id = p.id
group by p.id, p.name, p.roll_number
order by total_score desc, total_time asc;

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

-- Enable RLS
alter table participants enable row level security;
alter table game_scores enable row level security;
alter table event_state enable row level security;

-- Participants: anyone can insert (registration) and select
create policy "Anyone can register" on participants
  for insert with check (true);

create policy "Anyone can view participants" on participants
  for select using (true);

-- Game scores: anyone can view (for leaderboard)
create policy "Anyone can view scores" on game_scores
  for select using (true);

-- Game scores: insert/update only through RPC (no direct client writes)
-- We don't create INSERT/UPDATE policies — all writes go through submit_score RPC

-- Event state: anyone can read (participants need to see event status)
create policy "Anyone can view event state" on event_state
  for select using (true);

-- Event state: only service role can update (admin actions go through RPC or service key)
-- For simplicity at this scale, we allow updates from anon too (admin password check is client-side)
create policy "Anyone can update event state" on event_state
  for update using (true);

-- ============================================================
-- RPC Function: submit_score
-- All score submissions must go through this function
-- ============================================================

create or replace function submit_score(
  p_participant_id uuid,
  p_game text,
  p_score integer,
  p_time_seconds integer
)
returns void
language plpgsql
security definer
as $$
declare
  max_score integer;
begin
  -- Validate game name
  if p_game not in ('emoji', 'crossword', 'wordsearch') then
    raise exception 'Invalid game: %', p_game;
  end if;

  -- Set max possible scores per game to prevent tampering
  case p_game
    when 'emoji' then max_score := 100;       -- 10 questions × 10 pts
    when 'crossword' then max_score := 50;     -- 10 words × 5 pts
    when 'wordsearch' then max_score := 60;    -- 30 words × 2 pts
  end case;

  -- Cap score at maximum
  if p_score > max_score then
    p_score := max_score;
  end if;

  if p_score < 0 then
    p_score := 0;
  end if;

  -- Upsert the score
  insert into game_scores (participant_id, game, score, completion_time_seconds, completed, updated_at)
  values (p_participant_id, p_game, p_score, p_time_seconds, true, now())
  on conflict (participant_id, game)
  do update set
    score = excluded.score,
    completion_time_seconds = excluded.completion_time_seconds,
    completed = excluded.completed,
    updated_at = excluded.updated_at;
end;
$$;

-- ============================================================
-- Enable Realtime on relevant tables
-- ============================================================

-- Enable realtime for game_scores (leaderboard updates)
alter publication supabase_realtime add table game_scores;

-- Enable realtime for event_state (lobby updates)
alter publication supabase_realtime add table event_state;
