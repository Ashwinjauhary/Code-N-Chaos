-- 1. Add metadata column to game_scores to store extra game-specific metrics (like moves)
alter table game_scores add column if not exists metadata jsonb default '{}'::jsonb;

-- 2. Update the submit_score RPC to accept and save p_metadata
create or replace function submit_score(
  p_participant_id uuid,
  p_game text,
  p_score integer,
  p_time_seconds integer,
  p_completed boolean default true,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
as $$
declare
  max_score integer;
begin
  if p_game not in ('emoji', 'crossword', 'wordsearch', 'memorymatch') then
    raise exception 'Invalid game: %', p_game;
  end if;

  case p_game
    when 'emoji' then max_score := 100;
    when 'crossword' then max_score := 50;
    when 'wordsearch' then max_score := 60;
    when 'memorymatch' then max_score := 80;
  end case;

  if p_score > max_score then
    p_score := max_score;
  end if;

  if p_score < 0 then
    p_score := 0;
  end if;

  insert into game_scores (participant_id, game, score, completion_time_seconds, completed, metadata, updated_at)
  values (p_participant_id, p_game, p_score, p_time_seconds, p_completed, p_metadata, now())
  on conflict (participant_id, game)
  do update set
    score = excluded.score,
    completion_time_seconds = excluded.completion_time_seconds,
    completed = case when excluded.completed = true then true else game_scores.completed end,
    metadata = excluded.metadata,
    updated_at = excluded.updated_at;
end;
$$;
