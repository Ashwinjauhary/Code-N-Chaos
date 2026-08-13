/**
 * Disable DevTools & Console Inspection
 * Blocks all keyboard shortcuts that open browser developer tools,
 * disables the right-click context menu, and detects if DevTools are opened.
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
  // Ctrl+Shift+P — Hidden Command Menu (only works inside DevTools, but block anyway)
  if (
    (e.ctrlKey && e.shiftKey && ['I', 'i', 'J', 'j', 'K', 'k', 'C', 'c', 'P', 'p'].includes(e.key))
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

  // Ctrl+S — Save Page (prevents saving HTML source)
  if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S') && !e.shiftKey) {
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

// Disable drag (prevents dragging images/elements to inspect)
document.addEventListener('dragstart', (e: Event) => {
  e.preventDefault();
  return false;
});

// DevTools open detection using debugger timing
// If DevTools is open, the debugger statement causes a measurable delay
let _devtoolsWarned = false;
function detectDevTools() {
  const threshold = 160;
  const start = performance.now();
  // eslint-disable-next-line no-debugger
  debugger;
  const end = performance.now();
  if (end - start > threshold && !_devtoolsWarned) {
    _devtoolsWarned = true;
    document.body.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#000;color:#ff4444;font-family:monospace;font-size:2rem;text-align:center;padding:2rem;">
        ⚠️ Developer Tools Detected!<br/>
        Please close DevTools and refresh the page to continue.<br/>
        This incident has been logged.
      </div>
    `;
  }
}

// Check every 2 seconds (only in production)
if (import.meta.env.PROD) {
  setInterval(detectDevTools, 2000);
}

export {};

