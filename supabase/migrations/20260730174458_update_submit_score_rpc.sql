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
