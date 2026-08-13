/**
 * Disable DevTools & Console Inspection
 * Blocks all keyboard shortcuts that open browser developer tools
 * and disables the right-click context menu.
 */

// Block keyboard shortcuts for DevTools
document.addEventListener('keydown', (e: KeyboardEvent) => {
  // F12 — All browsers
  if (e.key === 'F12') {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }

  // Ctrl+Shift+I — Chrome/Edge/Firefox (DevTools)
  // Ctrl+Shift+J — Chrome/Edge (Console)
  // Ctrl+Shift+K — Firefox (Console)
  // Ctrl+Shift+C — Chrome/Edge (Inspect Element)
  if (
    (e.ctrlKey && e.shiftKey && ['I', 'i', 'J', 'j', 'K', 'k', 'C', 'c'].includes(e.key))
  ) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }

  // Cmd+Option+I — Mac Chrome/Edge (DevTools)
  // Cmd+Option+J — Mac Chrome/Edge (Console)
  // Cmd+Option+K — Mac Firefox (Console)
  // Cmd+Option+C — Mac Safari (Console)
  if (
    (e.metaKey && e.altKey && ['I', 'i', 'J', 'j', 'K', 'k', 'C', 'c'].includes(e.key))
  ) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }

  // Ctrl+U — View Source
  if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U')) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
});

// Disable right-click context menu
document.addEventListener('contextmenu', (e: Event) => {
  e.preventDefault();
  return false;
});

export {};
