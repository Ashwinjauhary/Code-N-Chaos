import { supabase } from '../lib/supabaseClient';

export async function validateGameAccess(
  participantId: string, 
  gameId: string, 
  navigate: (path: string) => void
): Promise<{ allowed: boolean, completed: boolean }> {
  try {
    const [scoresResponse, eventResponse] = await Promise.all([
      supabase.from('game_scores').select('completed').eq('participant_id', participantId).eq('game', gameId).single(),
      supabase.from('event_state').select('status, unlocked_games, started_at').eq('id', 1).single()
    ]);

    const eState = eventResponse.data;
    if (!eState) return { allowed: false, completed: false };

    // 1. Enforce event state (must be running and game unlocked)
    if (eState.status !== 'running' || !eState.unlocked_games?.includes(gameId)) {
      navigate('/lobby');
      return { allowed: false, completed: false };
    }

    // 2. Clear old session storage if event was restarted
    const currentStartedAt = eState.started_at || 'not_started';
    const savedStartedAt = sessionStorage.getItem('event_started_at');
    
    if (savedStartedAt && savedStartedAt !== currentStartedAt) {
      // Clear all game-related session storage when event is reset or restarted
      const keysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (
          key.includes('emoji_') || 
          key.includes('crossword_') || 
          key.includes('wordsearch_') ||
          key.includes('memory_') ||
          key.includes('mm_') ||
          key.includes('game_start_time_')
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => sessionStorage.removeItem(key));
      sessionStorage.setItem('event_started_at', currentStartedAt);
      
      // If we had to clear their session because of a restart, reload the page to get fresh state
      window.location.reload();
      return { allowed: false, completed: false }; // Stop execution while reloading
    }

    sessionStorage.setItem('event_started_at', currentStartedAt);

    // 3. Check if they already completed this game
    if (scoresResponse.data?.completed) {
      return { allowed: true, completed: true };
    }

    return { allowed: true, completed: false };
  } catch (err) {
    console.error('Error validating game access:', err);
    return { allowed: false, completed: false };
  }
}
