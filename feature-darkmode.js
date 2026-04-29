cat > /mnt/user-data/outputs/win-challenge/feature-darkmode.js << 'ENDOFFILE'
// ============================================
// FEATURE: Dark / Light Mode Toggle
// ============================================
// HOW TO ADD THIS:
//   1. Copy this file into your project folder
//   2. In BOTH index.html AND admin.html, paste this
//      line just before the closing </body> tag,
//      AFTER the line that loads app.js:
//
//      <script src="feature-darkmode.js"></script>
//
// That's it. No other changes needed.
// The user's preference is saved automatically.
// ============================================

(function () {

  // ---- Light theme CSS variable overrides ----
  const css = `
    /* Light mode overrides — applied to <body> when .light-mode class is added */
    body.light-mode {
      --bg:        #f0f2f5;
      --surface:   #ffffff;
      --surface2:  #e8ecf2;
      --border:    #d0d8e4;
      --text:      #1a1f2e;
      --text-muted:#6070a0;
      background: var(--bg);
    }

    /* Re-color the star canvas particles in light mode */
    body.light-mode #bg-canvas { opacity: 0.18; }

    /* Fix timer display color in light mode */
    body.light-mode #timer-display { text-shadow: none; }

    /* Make cards feel lighter */
    body.light-mode .timer-card,
    body.light-mode .checklist-card,
    body.light-mode .total-time-card,
    body.light-mode .admin-controls {
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    }

    /* Dark/light toggle button */
    #darkmode-toggle {
      background: var(--surface2);
      border: 1px solid var(--border);
      color: var(--text-muted);
      font-family: 'DM Sans', sans-serif;
      font-size: 0.75rem;
      padding: 6px 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    #darkmode-toggle:hover {
      border-color: var(--accent);
      color: var(--accent);
    }

    /* Smooth transition when switching modes */
    body {
      transition: background 0.3s, color 0.3s;
    }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ---- State: read saved preference ----
  let isDark = localStorage.getItem('wc_theme') !== 'light';

  // ---- Apply theme to body ----
  function applyTheme() {
    if (isDark) {
      document.body.classList.remove('light-mode');
    } else {
      document.body.classList.add('light-mode');
    }
    const btn = document.getElementById('darkmode-toggle');
    if (btn) btn.textContent = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
  }

  // ---- Toggle handler ----
  window._toggleDarkMode = function () {
    isDark = !isDark;
    localStorage.setItem('wc_theme', isDark ? 'dark' : 'light');
    applyTheme();
  };

  // ---- Inject the toggle button into the status bar ----
  function injectToggle() {
    const statusBar = document.querySelector('.status-bar');
    if (!statusBar || document.getElementById('darkmode-toggle')) return;

    const btn = document.createElement('button');
    btn.id        = 'darkmode-toggle';
    btn.className = 'btn-mini';
    btn.onclick   = window._toggleDarkMode;
    statusBar.insertBefore(btn, statusBar.firstChild);

    applyTheme(); // set correct label
  }

  // ---- Init ----
  function init() {
    applyTheme(); // apply before render to avoid flash
    injectToggle();
  }

  // Apply theme immediately (before DOM loads) to prevent flash of wrong theme
  applyTheme();

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
ENDOFFILE