import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';


interface Participant {
  id: string;
  name: string;
  roll_number: string;
  email: string;
  phone_number: string;
  class: string;
  section: string;
}

interface ParticipantContextType {
  participant: Participant | null;
  setParticipant: (p: Participant | null) => void;
  isLoggedIn: boolean;
  logout: () => void;
}

const ParticipantContext = createContext<ParticipantContextType>({
  participant: null,
  setParticipant: () => {},
  isLoggedIn: false,
  logout: () => {},
});

export function ParticipantProvider({ children }: { children: React.ReactNode }) {
  const [participant, setParticipantState] = useState<Participant | null>(() => {
    const saved = sessionStorage.getItem('participant_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const setParticipant = useCallback((p: Participant | null) => {
    setParticipantState(p);
    if (p) {
      sessionStorage.setItem('participant_session', JSON.stringify(p));
    } else {
      sessionStorage.removeItem('participant_session');
    }
  }, []);

  const logout = useCallback(() => {
    setParticipant(null);
  }, [setParticipant]);

  useEffect(() => {
    if (!participant) return;

    // Verify if participant still exists in DB (handles cases where they were deleted while offline)
    const verifyParticipant = async () => {
      const { data, error } = await supabase
        .from('participants')
        .select('id')
        .eq('id', participant.id)
        .single();
      
      if (error || !data) {
        logout();
      }
    };
    verifyParticipant();

    const channel = supabase
      .channel(`participant-${participant.id}`)
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'participants',
          filter: `id=eq.${participant.id}`,
        },
        () => {
          // If the admin deletes this participant, force logout
          logout();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [participant, logout]);

  return (
    <ParticipantContext.Provider
      value={{
        participant,
        setParticipant,
        isLoggedIn: participant !== null,
        logout,
      }}
    >
      {children}
    </ParticipantContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useParticipant() {
  const context = useContext(ParticipantContext);
  if (!context) {
    throw new Error('useParticipant must be used within a ParticipantProvider');
  }
  return context;
}
