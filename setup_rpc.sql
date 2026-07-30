create or replace function admin_reset_event()
returns void
language plpgsql
security definer
as $$
begin
  -- Delete all game scores to reset the leaderboard
  -- Added 'where true' to bypass Supabase's safety check requiring a WHERE clause
  delete from game_scores where true;
  
  -- Reset event state
  update event_state set 
    status = 'not_started',
    unlocked_games = '{}',
    started_at = null,
    ended_at = null
  where id = 1;
end;
$$;
