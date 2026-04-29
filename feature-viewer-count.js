cat > /mnt/user-data/outputs/win-challenge/feature-viewer-count.js << 'ENDOFFILE'


(function () {

  // ---- Inject CSS ----
  const css = `
    .viewer-count-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 99px;
      padding: 5px 14px;
      font-size: 0.75rem;
      color: var(--text-muted);
      letter-spacing: 0.06em;
      margin-top: 6px;
      transition: color 0.3s;
    }
    .viewer-count-pill .vc-dot {
      width: 7px; height: 7px;
      border-radius: 50%;
      background: var(--success);
      animation: pulse 1.6s infinite;
    }
    .viewer-count-num {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 1rem;
      color: var(--accent);
      letter-spacing: 0.08em;
    }
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ---- Inject HTML (into header, below subtitle) ----
  function injectHTML() {
    const header = document.querySelector('header');
    if (!header || document.getElementById('viewer-count-pill')) return;
    const pill = document.createElement('div');
    pill.className = 'viewer-count-pill';
    pill.id = 'viewer-count-pill';
    pill.innerHTML = `
      <span class="vc-dot"></span>
      <span id="viewer-count" class="viewer-count-num">--</span>
      <span>watching</span>
    `;
    header.appendChild(pill);
  }

  // ---- Presence tracking via Firestore ----
  function initPresence() {
    // Wait for `db` (from firebase.js) to be available
    if (typeof db === 'undefined') { setTimeout(initPresence, 300); return; }

    // Unique session ID for this browser tab
    const sessionId = Math.random().toString(36).slice(2) + Date.now();
    const presenceRef = db.collection('presence').doc(sessionId);

    // Write this session's heartbeat
    async function heartbeat() {
      try { await presenceRef.set({ lastSeen: Date.now() }); } catch (e) {}
    }

    heartbeat();
    const hbInterval = setInterval(heartbeat, 25000); // every 25 seconds

    // Delete this session on page close (best-effort)
    window.addEventListener('beforeunload', () => {
      clearInterval(hbInterval);
      presenceRef.delete().catch(() => {});
    });

    // Listen to presence collection and count active sessions
    // "active" = last heartbeat within the last 60 seconds
    db.collection('presence').onSnapshot(snapshot => {
      const now   = Date.now();
      const count = snapshot.docs.filter(d => (now - (d.data().lastSeen || 0)) < 60000).length;
      const el    = document.getElementById('viewer-count');
      if (el) el.textContent = count;
    });

    // Periodically clean up stale presence docs (only run once per session
    // to avoid hammering Firestore — only the most recently arrived tab cleans)
    setTimeout(async () => {
      try {
        const snap = await db.collection('presence').get();
        const now  = Date.now();
        snap.docs.forEach(doc => {
          if ((now - (doc.data().lastSeen || 0)) > 120000) doc.ref.delete().catch(() => {});
        });
      } catch (e) {}
    }, 10000);
  }

  // ---- Init ----
  function init() {
    injectHTML();
    initPresence();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
ENDOFFILE