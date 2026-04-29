(function () {

  const EMOJIS = ['🔥', '💪', '👏', '⚡', '🏆', '😤', '🎯', '💯'];

  // ---- Inject CSS ----
  const css = `
    /* Reaction bar container */
    .reaction-bar {
      width: 100%;
      max-width: 600px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 10px;
      position: relative;
      z-index: 1;
    }

    .reaction-label {
      font-size: 0.68rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.12em;
      margin-right: 4px;
    }

    /* Individual reaction buttons */
    .reaction-btn {
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 1.1rem;
      padding: 4px 8px;
      cursor: pointer;
      transition: transform 0.1s, border-color 0.15s;
      display: flex;
      align-items: center;
      gap: 4px;
      line-height: 1;
    }

    .reaction-btn:hover  { border-color: var(--accent); transform: scale(1.15); }
    .reaction-btn:active { transform: scale(0.95); }

    .reaction-btn-count {
      font-size: 0.7rem;
      font-family: 'DM Sans', sans-serif;
      color: var(--text-muted);
      min-width: 12px;
    }

    /* Floating emoji that fly up the screen */
    .floating-emoji {
      position: fixed;
      font-size: 1.8rem;
      pointer-events: none;
      z-index: 800;
      animation: floatUp 2.2s ease-out forwards;
      user-select: none;
    }

    @keyframes floatUp {
      0%   { transform: translateY(0)   scale(1);    opacity: 1; }
      70%  { transform: translateY(-220px) scale(1.2); opacity: 1; }
      100% { transform: translateY(-320px) scale(0.8); opacity: 0; }
    }
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ---- Inject HTML ----
  function injectHTML() {
    // Place the reaction bar above the checklist card
    const checklist = document.querySelector('.checklist-card');
    if (!checklist || document.querySelector('.reaction-bar')) return;

    const bar = document.createElement('div');
    bar.className = 'reaction-bar';
    bar.innerHTML = `<span class="reaction-label">React:</span>` +
      EMOJIS.map(e => `
        <button class="reaction-btn" data-emoji="${e}" onclick="window._sendReaction('${e}', this)">
          ${e} <span class="reaction-btn-count" id="rc-${encodeEmoji(e)}">0</span>
        </button>
      `).join('');

    checklist.parentNode.insertBefore(bar, checklist);
  }

  function encodeEmoji(e) {
    return [...e].map(c => c.codePointAt(0).toString(16)).join('-');
  }

  // ---- Send a reaction to Firestore ----
  window._sendReaction = async function (emoji, btnEl) {
    if (typeof db === 'undefined') return;

    // Animate the floating emoji near the button
    const rect = btnEl.getBoundingClientRect();
    spawnFloating(emoji, rect.left + rect.width / 2, rect.top);

    // Write to Firestore reactions collection
    try {
      await db.collection('reactions').add({ emoji, t: Date.now() });
    } catch (e) { console.error('Reaction write failed:', e); }
  };

  // ---- Spawn a floating emoji on screen ----
  function spawnFloating(emoji, x, y) {
    const el = document.createElement('div');
    el.className = 'floating-emoji';
    el.textContent = emoji;
    // Slight random horizontal spread
    el.style.left = (x + (Math.random() - 0.5) * 60) + 'px';
    el.style.top  = y + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2400);
  }

  // ---- Listen to recent reactions in Firestore ----
  function listenReactions() {
    if (typeof db === 'undefined') { setTimeout(listenReactions, 300); return; }

    // Track which doc IDs we've already animated so we don't re-animate on reconnect
    const seen = new Set();

    db.collection('reactions')
      .orderBy('t', 'desc')
      .limit(50)
      .onSnapshot(snapshot => {
        snapshot.docChanges().forEach(change => {
          if (change.type !== 'added') return;
          const { emoji, t } = change.doc.data();
          const id = change.doc.id;
          if (seen.has(id)) return;
          seen.add(id);

          // Only animate if the reaction arrived in the last 4 seconds (not historical)
          if (Date.now() - t > 4000) return;

          // Animate floating emoji from random bottom position
          const x = Math.random() * window.innerWidth * 0.8 + window.innerWidth * 0.1;
          spawnFloating(emoji, x, window.innerHeight - 80);
        });
      });

    // Clean up reactions older than 2 minutes every 60 seconds
    setInterval(async () => {
      try {
        const cutoff = Date.now() - 120000;
        const old    = await db.collection('reactions').where('t', '<', cutoff).get();
        old.docs.forEach(d => d.ref.delete().catch(() => {}));
      } catch (e) {}
    }, 60000);
  }

  // ---- Init ----
  function init() {
    injectHTML();
    listenReactions();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
