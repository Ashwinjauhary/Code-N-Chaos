alter table participants
  add column email text not null default '',
  add column phone_number text not null default '',
  add column class text not null default '',
  add column section text not null default '';

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
