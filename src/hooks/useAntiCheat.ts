import { useState, useEffect, useCallback } from 'react';
import { playWarning } from '../utils/sfx';

interface UseAntiCheatProps {
  isActive: boolean;
  onForceSubmit: () => void;
  maxWarnings?: number;
}

export function useAntiCheat({ isActive, onForceSubmit, maxWarnings = 2 }: UseAntiCheatProps) {
  const [warnings, setWarnings] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

  const triggerWarning = useCallback((message: string) => {
    if (!isActive || showWarningModal) return;

    const newWarnings = warnings + 1;
    
    if (newWarnings > maxWarnings) {
      alert("Maximum warnings exceeded. Your assessment is being automatically submitted.");
      onForceSubmit();
      return;
    }

    setWarnings(newWarnings);
    setWarningMessage(message);
    setShowWarningModal(true);
    playWarning();
  }, [isActive, showWarningModal, warnings, maxWarnings, onForceSubmit]);

  const dismissWarning = useCallback(async () => {
    setShowWarningModal(false);
    // Force back to fullscreen
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) {
      console.error("Could not enter fullscreen", e);
    }
  }, []);

  const requestFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) {
      console.error("Could not enter fullscreen", e);
    }
  }, []);

  useEffect(() => {
    if (!isActive) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        triggerWarning("You switched tabs or minimized the browser. This is a violation of the rules.");
      }
    };

    const handleBlur = () => {
      triggerWarning("You clicked outside the assessment window. Please keep your focus on the test.");
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        triggerWarning("You exited fullscreen mode. Please remain in fullscreen during the assessment.");
      }
    };

    const blockKeys = (e: KeyboardEvent) => {
      // Block Ctrl+C, Ctrl+V, Ctrl+X, F12
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'x')) {
        e.preventDefault();
        triggerWarning("Copy and paste are disabled during this assessment.");
      }
      if (e.key === 'F12') {
        e.preventDefault();
      }
    };

    const blockContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    
    const blockCopy = (e: ClipboardEvent) => {
      e.preventDefault();
    };

    // Block back button / swipe gesture
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      triggerWarning("Navigating back or using swipe gestures is prohibited during the assessment.");
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('keydown', blockKeys);
    document.addEventListener('contextmenu', blockContextMenu);
    document.addEventListener('copy', blockCopy);
    document.addEventListener('cut', blockCopy);
    document.addEventListener('paste', blockCopy);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', blockKeys);
      document.removeEventListener('contextmenu', blockContextMenu);
      document.removeEventListener('copy', blockCopy);
      document.removeEventListener('cut', blockCopy);
      document.removeEventListener('paste', blockCopy);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isActive, triggerWarning]);

  return {
    warnings,
    showWarningModal,
    warningMessage,
    dismissWarning,
    requestFullscreen,
  };
}
