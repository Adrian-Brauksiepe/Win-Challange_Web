// ╔══════════════════════════════════════════════════════════╗
// ║   WIN CHALLENGE TRACKER  —  app.js                      ║
// ║   Features: tasks · timers · pin · icon-confetti ·      ║
// ║   cursor avatars · shatter launch · dark/sound toggles  ║
// ╚══════════════════════════════════════════════════════════╝

// ============================================================
// 🔐 PASSWORDS
// ============================================================
const ADMIN_PASSWORD = "win2024";

// ============================================================
// 🎭 CURSOR AVATARS
// ============================================================
const CURSOR_AVATARS = [
  { id:"c1", src:"icons/face1.png", fallback:"😀" },
  { id:"c2", src:"icons/face2.png", fallback:"😎" },
  { id:"c3", src:"icons/face3.png", fallback:"🤩" },
  { id:"c4", src:"icons/face4.png", fallback:"😤" },
];

const DEFAULT_TASKS = [
  { id:"task_01", label:"Lorem ipsum dolor sit amet consectetur",      icon:"🔥", tooltip:"", difficulty:"medium", checked:false, timerMs:0, timerRunning:false, timerStartedAt:null },
  { id:"task_02", label:"Adipiscing elit sed do eiusmod tempor",        icon:"⚡", tooltip:"", difficulty:"easy",   checked:false, timerMs:0, timerRunning:false, timerStartedAt:null },
  { id:"task_03", label:"Incididunt ut labore et dolore magna aliqua",  icon:"💪", tooltip:"", difficulty:"hard",   checked:false, timerMs:0, timerRunning:false, timerStartedAt:null },
  { id:"task_04", label:"Ut enim ad minim veniam quis nostrud",         icon:"🎯", tooltip:"", difficulty:"medium", checked:false, timerMs:0, timerRunning:false, timerStartedAt:null },
  { id:"task_05", label:"Exercitation ullamco laboris nisi aliquip",    icon:"🏋️", tooltip:"", difficulty:"hard",   checked:false, timerMs:0, timerRunning:false, timerStartedAt:null },
  { id:"task_06", label:"Duis aute irure dolor in reprehenderit",       icon:"📚", tooltip:"", difficulty:"easy",   checked:false, timerMs:0, timerRunning:false, timerStartedAt:null },
  { id:"task_07", label:"Voluptate velit esse cillum dolore eu fugiat", icon:"🧘", tooltip:"", difficulty:"medium", checked:false, timerMs:0, timerRunning:false, timerStartedAt:null },
  { id:"task_08", label:"Nulla pariatur excepteur sint occaecat",       icon:"💧", tooltip:"", difficulty:"easy",   checked:false, timerMs:0, timerRunning:false, timerStartedAt:null },
  { id:"task_09", label:"Cupidatat non proident sunt in culpa",         icon:"🥗", tooltip:"", difficulty:"medium", checked:false, timerMs:0, timerRunning:false, timerStartedAt:null },
  { id:"task_10", label:"Qui officia deserunt mollit anim id est",      icon:"😴", tooltip:"", difficulty:"easy",   checked:false, timerMs:0, timerRunning:false, timerStartedAt:null },
  { id:"task_11", label:"Laborum perspiciatis unde omnis iste natus",   icon:"🚶", tooltip:"", difficulty:"hard",   checked:false, timerMs:0, timerRunning:false, timerStartedAt:null },
  { id:"task_12", label:"Nemo enim ipsam voluptatem quia voluptas",     icon:"📵", tooltip:"", difficulty:"medium", checked:false, timerMs:0, timerRunning:false, timerStartedAt:null },
];

const DIFF = {
  easy:   { label:"Easy",   color:"#48c774", bg:"rgba(72,199,116,0.13)"  },
  medium: { label:"Medium", color:"#f0c040", bg:"rgba(240,192,64,0.13)"  },
  hard:   { label:"Hard",   color:"#e07830", bg:"rgba(224,120,48,0.13)"  },
};
const DIFF_WEIGHT = { easy:1, medium:2, hard:3 };

const TASKS_DOC    = "challenge/tasks";
const TIMER_DOC    = "challenge/timer";
const SETTINGS_DOC = "challenge/settings";

const IS_ADMIN = window.location.pathname.includes("admin");
const IS_MINI  = window.name === "WinChallengeMini"; // Check for mini-view context

// ============================================================
// STATE
// ============================================================
let challengeInterval = null;
let challengeStarted  = false;
let currentTasks      = [];
let taskTickInterval  = null;
let prevCheckedCount  = -1;
let prevCheckedIds    = new Set();
let launchCdInterval  = null;
let audioCtx          = null;
let soundEnabled      = localStorage.getItem("wc_sound") !== "off";
let isDarkMode        = localStorage.getItem("wc_theme") !== "light";
let pinnedTaskId      = null;
let selectedAvatarId  = localStorage.getItem("wc_avatar") || null;
let cursorUpdateTimer = null;
let remoteCursorEls   = {};
let cursorLocks       = {}; // Map of avatarId -> deviceId
let globalCursorSize  = 28;
let globalCursorOpacity = 1;

// ============================================================
// ██  INIT
// ============================================================
async function init() {
  injectFeatureStyles();
  initBackground();
  unlockAudioOnGesture();
  applyTheme();

  if (IS_ADMIN) {
    document.body.classList.add("admin-mode");
    if (sessionStorage.getItem("adminUnlocked") === "yes") {
      showAdminContent();
      injectAdminCursorControls(); // [Req 4]
      startApp();
    } else {
      if (loadingEl) loadingEl.classList.add("hidden");
    }
  } else {
    startApp();
  }
}

function startApp() {
  if (IS_ADMIN) listenToSettings();
  else          listenToLaunchGate();

  listenToTasks();
  listenToTimer();
  startTaskTick();
  initViewerCount();
  injectViewerCountPill();
  injectDarkModeToggle();
  initSoundToggle();
  
  // [Req 7] Cursors inactive in mini view
  if (!IS_MINI) {
      initCursorAvatars();
      listenToRemoteCursors();
      listenToCursorSettings(); // [Req 4]
  }

  setTimeout(() => { if (loadingEl) loadingEl.classList.add("hidden"); }, 1000);
}

// ============================================================
// ██  CSS Improvements
// ============================================================
function injectFeatureStyles() {
  if (document.getElementById("wc-feature-styles")) return;
  const el = document.createElement("style");
  el.id = "wc-feature-styles";
  el.textContent = `
    /* ── [Req 5] Borderless PNG Display ── */
    #local-cursor img, .remote-cursor-avatar {
      border-radius: 0 !important;
      border: none !important;
      background: transparent !important;
      box-shadow: none !important;
    }
    .avatar-btn img { border-radius: 4px; }
    .avatar-btn.locked { opacity: 0.3; cursor: not-allowed; filter: grayscale(1); }

    /* ── [Req 4] Admin Panel Controls UI ── */
    .admin-slider-group {
      background: var(--surface2); padding: 12px; border-radius: 10px; margin-bottom: 10px;
      display: flex; flex-direction: column; gap: 8px; font-size: 0.8rem;
    }
    .admin-slider-group input { width: 100%; cursor: pointer; }

    /* ── Existing Styles ── */
    .vc-pill {
      display:inline-flex;align-items:center;gap:6px;
      background:var(--surface2);border:1px solid var(--border);
      border-radius:99px;padding:5px 14px;
      font-size:0.75rem;color:var(--text-muted);
      letter-spacing:0.06em;margin-top:6px;
    }
    .vc-num { font-family:'Bebas Neue',sans-serif; font-size:1rem;color:var(--accent);letter-spacing:0.08em; }
    .diff-badge {
      display:inline-flex;align-items:center;
      font-size:0.6rem;font-weight:700;letter-spacing:0.1em;
      text-transform:uppercase;padding:2px 7px;
      border-radius:99px;border:1px solid;flex-shrink:0;line-height:1.4;
    }
    .pin-btn {
      background:none;border:none;cursor:pointer;
      font-size:0.85rem;padding:2px 4px;border-radius:5px;
      color:var(--text-muted);opacity:0.4;transition:opacity 0.15s,transform 0.15s;
      flex-shrink:0;line-height:1;
    }
    .pin-btn:hover { opacity:1;transform:scale(1.2); }
    .pin-btn.pinned { opacity:1;color:var(--accent);transform:rotate(-30deg); }
    
    #pinned-task-card {
      width:100%;max-width:600px;background:var(--surface);border:2px solid var(--accent);
      border-radius:16px;padding:20px 22px;margin:10px 0;
      box-shadow:0 0 32px rgba(240,192,64,0.18), 0 4px 24px rgba(0,0,0,0.5);
      display:flex;flex-direction:column;gap:14px;position:relative;overflow:hidden;z-index:1;
      animation:pinnedPop 0.35s cubic-bezier(0.34,1.56,0.64,1);
    }
    @keyframes pinnedPop { from { transform:scale(0.9);opacity:0; } to { transform:scale(1);opacity:1; } }
    #pinned-task-card::before { content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--accent),var(--accent2)); }
    .pinned-label { font-size:0.65rem;letter-spacing:0.2em;text-transform:uppercase;color:var(--accent);display:flex;align-items:center;gap:6px; }
    .pinned-body { display:flex;align-items:center;gap:16px; }
    .pinned-icon { font-size:2.8rem;line-height:1;flex-shrink:0; }
    .pinned-icon img { width:52px;height:52px;object-fit:contain;border-radius:8px; }
    .pinned-info { flex:1;min-width:0; }
    .pinned-task-label { font-family:'Bebas Neue',sans-serif; font-size:clamp(1.1rem,3vw,1.6rem); letter-spacing:0.06em;line-height:1.2;margin-bottom:6px; }
    .pinned-task-label.checked-label { text-decoration:line-through;color:var(--text-muted); }
    .pinned-timer-row { display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:4px; }
    .pinned-timer-val { font-family:'Bebas Neue',sans-serif; font-size:1.6rem;letter-spacing:0.08em;color:var(--success); }
    .pinned-unpin-btn { position:absolute;top:14px;right:14px;background:var(--surface2);border:1px solid var(--border);color:var(--text-muted);border-radius:8px;padding:5px 10px;font-size:0.75rem;cursor:pointer;transition:all 0.15s; }
    .pinned-unpin-btn:hover { border-color:var(--accent);color:var(--accent); }

    body.light-mode { --bg:#f0f2f5;--surface:#ffffff;--surface2:#e8ecf2;--border:#d0d8e4;--text:#1a1f2e;--text-muted:#6070a0; }
    #darkmode-toggle, #sound-toggle { background:var(--surface2);border:1px solid var(--border);color:var(--text-muted);font-family:'DM Sans',sans-serif;font-size:0.75rem;padding:6px 12px;border-radius:8px;cursor:pointer;transition:all 0.15s;display:flex;align-items:center;gap:6px; }
    #darkmode-toggle:hover, #sound-toggle:hover { border-color:var(--accent);color:var(--accent); }

    #cursor-picker { position:fixed;top:16px;right:16px;z-index:750;display:flex;flex-direction:column;align-items:flex-end;gap:6px; }
    .cursor-picker-label { font-size:0.6rem;color:var(--text-muted);letter-spacing:0.12em;text-transform:uppercase; }
    .cursor-picker-row { display:flex;gap:6px; }
    .avatar-btn { width:38px;height:38px;border-radius:50%;border:2px solid var(--border);background:var(--surface2);cursor:pointer;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:1.2rem;transition:all 0.2s; }
    .avatar-btn.selected { border-color:var(--accent);box-shadow:0 0 10px rgba(240,192,64,0.7);transform:scale(1.08); }

    #local-cursor { position:fixed;pointer-events:none;z-index:740;display:none; }
    .remote-cursor { position:fixed;pointer-events:none;z-index:730;display:flex;flex-direction:column;align-items:center;transition:left 0.12s linear, top 0.12s linear; }
    .icon-particle { position:fixed;pointer-events:none;z-index:500;will-change:transform;line-height:1; }
    #shatter-container { position:fixed;inset:0;z-index:992;pointer-events:none; }
    .shatter-tile { position:absolute;background:var(--bg);will-change:transform,opacity; }
    #shatter-flash { position:fixed;inset:0;z-index:993;pointer-events:none;background:white;opacity:0; }
  `;
  document.head.appendChild(el);
}

// ============================================================
// ██  CURSORS & LOCKING  [Req 1, 2, 3, 5]
// ============================================================
function initCursorAvatars() {
  const picker = document.createElement("div");
  picker.id = "cursor-picker";
  picker.innerHTML = `
    <span class="cursor-picker-label">Your cursor</span>
    <div class="cursor-picker-row" id="avatar-row-container"></div>
  `;
  document.body.appendChild(picker);
  renderAvatarButtons();

  const localEl = document.createElement("div");
  localEl.id = "local-cursor";
  document.body.appendChild(localEl);

  // Initial Sync for Locks
  db.collection("cursors").onSnapshot(snap => {
    cursorLocks = {};
    const myId = localStorage.getItem("wc_device_id");
    snap.docs.forEach(doc => {
      const data = doc.data();
      if(data.avatar) cursorLocks[data.avatar] = doc.id;
    });
    renderAvatarButtons();
    
    // [Req 1] If our saved avatar is taken by someone else, deselect it
    if (selectedAvatarId && cursorLocks[selectedAvatarId] && cursorLocks[selectedAvatarId] !== myId) {
        selectAvatar(null);
    }
  });

  if(selectedAvatarId) applyLocalAvatar(selectedAvatarId);

  document.addEventListener("mousemove", e => {
    const lc = document.getElementById("local-cursor");
    if(lc) { 
        lc.style.left = e.clientX + "px"; 
        lc.style.top = e.clientY + "px"; 
    }
    if(!selectedAvatarId) return;
    clearTimeout(cursorUpdateTimer);
    cursorUpdateTimer = setTimeout(() => uploadCursorPos(e.clientX, e.clientY), 80);
  });

  window.addEventListener("beforeunload", () => removeCursorDoc());
}

function renderAvatarButtons() {
    const container = document.getElementById("avatar-row-container");
    if(!container) return;
    const myId = localStorage.getItem("wc_device_id");

    container.innerHTML = CURSOR_AVATARS.map(av => {
        const lockOwner = cursorLocks[av.id];
        const isLocked = lockOwner && lockOwner !== myId;
        const isSelected = selectedAvatarId === av.id;
        
        return `
            <button class="avatar-btn ${isSelected ? "selected" : ""} ${isLocked ? "locked" : ""}"
                    data-id="${av.id}"
                    onclick="selectAvatar('${av.id}')"
                    ${isLocked ? "disabled" : ""}
                    title="${isLocked ? "In use" : av.fallback}">
              <img src="${av.src}" alt="${av.fallback}"
                   onerror="this.style.display='none';this.parentNode.textContent='${av.fallback}'"/>
            </button>
        `;
    }).join("");
}

function selectAvatar(id) {
  // [Req 3] Deselecting logic
  if (selectedAvatarId === id || id === null) {
      selectedAvatarId = null;
      localStorage.removeItem("wc_avatar");
      const lc = document.getElementById("local-cursor");
      if(lc) lc.style.display = "none";
      removeCursorDoc();
  } else {
      selectedAvatarId = id;
      localStorage.setItem("wc_avatar", id);
      applyLocalAvatar(id);
  }
  renderAvatarButtons();
}

function applyLocalAvatar(id) {
  const av = CURSOR_AVATARS.find(a => a.id === id);
  const lc = document.getElementById("local-cursor");
  if(!av || !lc) return;
  lc.style.display = "block";
  lc.style.opacity = globalCursorOpacity;
  lc.innerHTML = `<img src="${av.src}" alt="${av.fallback}"
    onerror="this.style.display='none';this.parentNode.textContent='${av.fallback}'"
    style="width:${globalCursorSize}px; height:${globalCursorSize}px; object-fit:contain;">`;
}

async function uploadCursorPos(cx, cy) {
  const deviceId = localStorage.getItem("wc_device_id");
  if(!deviceId) return;
  try {
    await db.collection("cursors").doc(deviceId).set({
      avatar: selectedAvatarId,
      x: cx / window.innerWidth,
      y: cy / window.innerHeight,
      lastSeen: Date.now()
    }, { merge: true });
  } catch(e) {}
}

// ============================================================
// ██  ADMIN CURSOR CONTROLS  [Req 4]
// ============================================================
function injectAdminCursorControls() {
    const adminPanel = document.getElementById("admin-content");
    if (!adminPanel) return;

    const controlDiv = document.createElement("div");
    controlDiv.className = "admin-controls";
    controlDiv.innerHTML = `
        <h3 style="margin-top:0">Global Cursor Styles</h3>
        <div class="admin-slider-group">
            <label>Cursor Size: <b id="val-size">28px</b></label>
            <input type="range" min="16" max="80" value="28" id="slider-size" oninput="updateCursorSettings()">
        </div>
        <div class="admin-slider-group">
            <label>Transparency: <b id="val-opacity">100%</b></label>
            <input type="range" min="10" max="100" value="100" id="slider-opacity" oninput="updateCursorSettings()">
        </div>
    `;
    // Insert before the task editor
    adminPanel.insertBefore(controlDiv, document.querySelector(".task-editor-card"));
}

async function updateCursorSettings() {
    const size = document.getElementById("slider-size").value;
    const opacity = document.getElementById("slider-opacity").value / 100;
    
    document.getElementById("val-size").textContent = size + "px";
    document.getElementById("val-opacity").textContent = Math.round(opacity * 100) + "%";

    await db.doc(SETTINGS_DOC).set({
        cursorSize: parseInt(size),
        cursorOpacity: parseFloat(opacity)
    }, { merge: true });
}

function listenToCursorSettings() {
    db.doc(SETTINGS_DOC).onSnapshot(snap => {
        if (!snap.exists) return;
        const data = snap.data();
        globalCursorSize = data.cursorSize || 28;
        globalCursorOpacity = data.cursorOpacity || 1;

        // Apply immediately to local
        if (selectedAvatarId) applyLocalAvatar(selectedAvatarId);

        // Update admin sliders if they exist
        const sSize = document.getElementById("slider-size");
        const sOp = document.getElementById("slider-opacity");
        if (sSize) {
            sSize.value = globalCursorSize;
            document.getElementById("val-size").textContent = globalCursorSize + "px";
        }
        if (sOp) {
            sOp.value = globalCursorOpacity * 100;
            document.getElementById("val-opacity").textContent = Math.round(globalCursorOpacity * 100) + "%";
        }
    });
}

// ============================================================
// ██  IMPROVED EARLY ACCESS  [Req 6]
// ============================================================
function triggerShatterReveal() {
  if(launchCdInterval) clearInterval(launchCdInterval);
  const overlay = document.getElementById("launch-overlay");
  if(!overlay) return;

  const W = window.innerWidth, H = window.innerHeight;
  const cols = 8, rows = 12; // Higher resolution shatter
  const tW = Math.ceil(W/cols), tH = Math.ceil(H/rows);

  const flash = document.createElement("div");
  flash.id = "shatter-flash";
  document.body.appendChild(flash);

  const container = document.createElement("div");
  container.id = "shatter-container";
  document.body.appendChild(container);

  // Sync point: Start subtle rumble sound
  playTone(60, "sine", 0.8, 0.1); 

  for(let r=0; r<rows; r++){
    for(let c=0; c<cols; c++){
      const tile = document.createElement("div");
      tile.className = "shatter-tile";
      tile.style.cssText = `
        left:${c*tW}px; top:${r*tH}px;
        width:${tW+1}px; height:${tH+1}px;
        background: #0a0a0c; border: 0.5px solid rgba(255,255,255,0.05);
      `;
      
      const dx = (c + 0.5) / cols - 0.5;
      const dy = (r + 0.5) / rows - 0.5;
      tile._tx = dx * W * 1.5;
      tile._ty = dy * H * 1.5;
      tile._rot = (Math.random() - 0.5) * 200;
      tile._delay = (Math.abs(dx) + Math.abs(dy)) * 0.4; // Radial stagger
      container.appendChild(tile);
    }
  }

  // Fade actual content out slightly slower
  overlay.style.transition = "opacity 0.8s ease-in";
  overlay.style.opacity = "0";

  setTimeout(() => {
    playBoom(); // Synced with visual explosion
    flash.style.transition = "opacity 0.15s ease-out";
    flash.style.opacity = "1";

    setTimeout(() => {
      flash.style.opacity = "0";
      overlay.style.display = "none";
      
      const tiles = container.querySelectorAll(".shatter-tile");
      tiles.forEach(tile => {
        tile.style.transition = `transform 1.2s cubic-bezier(0.16, 1, 0.3, 1) ${tile._delay}s, opacity 0.8s ease ${tile._delay + 0.2}s`;
        tile.style.transform = `translate3d(${tile._tx}px, ${tile._ty}px, 0) rotate(${tile._rot}deg) scale(0.2)`;
        tile.style.opacity = "0";
      });
    }, 150);
  }, 600); // Wait for tension build

  setTimeout(() => { container.remove(); flash.remove(); }, 3000);
}

// ============================================================
// ██  UPDATED REMOTE CURSORS  [Req 4, 5]
// ============================================================
function listenToRemoteCursors() {
  const myDeviceId = localStorage.getItem("wc_device_id") || "";
  db.collection("cursors").onSnapshot(snap => {
    const now = Date.now();
    const active = new Set();

    snap.docs.forEach(doc => {
      const id = doc.id;
      if(id === myDeviceId) return;
      const {avatar, x, y, lastSeen} = doc.data();
      if(!avatar || (now - lastSeen) > 12000) return;
      active.add(id);

      let el = remoteCursorEls[id];
      if(!el){
        el = document.createElement("div");
        el.className = "remote-cursor";
        document.body.appendChild(el);
        remoteCursorEls[id] = el;
      }
      
      const av = CURSOR_AVATARS.find(a => a.id === avatar);
      const fb = av ? av.fallback : "👤";
      const src = av ? av.src : "";
      
      // Update remote cursor appearance based on global settings
      el.style.opacity = globalCursorOpacity;
      el.innerHTML = `
        <img class="remote-cursor-avatar" src="${src}" alt="${fb}"
             style="width:${globalCursorSize}px; height:${globalCursorSize}px; object-fit:contain;"
             onerror="this.style.display='none';this.parentNode.innerHTML='<span style=\'font-size:${globalCursorSize*0.8}px\'>${fb}</span>'">
      `;

      el.style.left = (x * window.innerWidth) + "px";
      el.style.top  = (y * window.innerHeight) + "px";
    });

    Object.keys(remoteCursorEls).forEach(id => {
      if(!active.has(id)){
        remoteCursorEls[id].remove();
        delete remoteCursorEls[id];
      }
    });
  });
}

// ============================================================
// ██  REMAINING CORE LOGIC (UNMODIFIED)
// ============================================================
function initBackground() {
  const canvas = document.getElementById("bg-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let W, H, stars = [];
  function resize() { W=canvas.width=window.innerWidth; H=canvas.height=window.innerHeight; }
  function makeStars() {
    stars=[];
    const n=Math.floor((W*H)/9000);
    for(let i=0;i<n;i++) stars.push({
      x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.2+0.3,
      a:Math.random()*0.5+0.1,dx:(Math.random()-0.5)*0.12,dy:(Math.random()-0.5)*0.08,
      da:(Math.random()-0.5)*0.003
    });
  }
  function draw() {
    ctx.clearRect(0,0,W,H);
    for(const s of stars){
      s.x+=s.dx;s.y+=s.dy;s.a+=s.da;
      if(s.a>0.65||s.a<0.05)s.da*=-1;
      if(s.x<0)s.x=W;if(s.x>W)s.x=0;if(s.y<0)s.y=H;if(s.y>H)s.y=0;
      ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(255,220,100,${s.a})`;ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  resize();makeStars();draw();
  window.addEventListener("resize",()=>{resize();makeStars();});
}

function isImageIcon(icon) {
  return icon && (icon.includes("/") || /\.(png|jpg|gif|webp|svg)$/i.test(icon) || icon.startsWith("http"));
}

function launchIconConfetti(icons, big=false) {
  if(!icons||!icons.length) return;
  const count = big ? 110 : 48;
  const maxLife = big ? 210 : 150;
  const particles = [];
  for(let i=0;i<count;i++){
    const icon = icons[Math.floor(Math.random()*icons.length)];
    const size = big ? 1.1+Math.random()*1.0 : 0.9+Math.random()*0.7;
    const px = Math.random()*window.innerWidth;
    const el = document.createElement("div");
    el.className = "icon-particle";
    el.style.cssText = `font-size:${size}rem;left:0;top:0;`;
    if(isImageIcon(icon)){
      const img = document.createElement("img");
      img.src = icon;
      img.style.cssText=`width:${Math.round(size*18)}px;height:${Math.round(size*18)}px;object-fit:contain;border-radius:3px;`;
      el.appendChild(img);
    } else { el.textContent = icon; }
    document.body.appendChild(el);
    particles.push({ el, x: px, y: -30 - Math.random()*60, vx: (Math.random()-0.5)*5, vy: 1.8 + Math.random()*3.5, rot: Math.random()*360, vrot: (Math.random()-0.5)*10, opacity: 1, life: Math.floor(Math.random()*30) });
  }
  function tick() {
    let alive = false;
    for(const p of particles){
      if(p.life<0){p.life++;continue;}
      p.x+=p.vx; p.y+=p.vy; p.vy*=1.008; p.rot+=p.vrot; p.life++;
      if(p.life>maxLife*0.65) p.opacity=Math.max(0,p.opacity-0.03);
      if(p.life<maxLife){ p.el.style.transform=`translate(${p.x}px,${p.y}px) rotate(${p.rot}deg)`; p.el.style.opacity=p.opacity; alive=true; }
      else { p.el.remove(); }
    }
    if(alive) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function unlockAudioOnGesture() {
  const unlock = () => {
    if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==="suspended") audioCtx.resume();
  };
  document.addEventListener("click", unlock, {once:true});
}
function getAudioCtx() {
  if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
  if(audioCtx.state==="suspended") audioCtx.resume();
  return audioCtx;
}
function playTone(freq,type,dur,gain=0.25,offset=0){
  if(!soundEnabled) return;
  try{
    const ac=getAudioCtx(),osc=ac.createOscillator(),env=ac.createGain();
    osc.connect(env);env.connect(ac.destination);
    osc.type=type;
    const t=ac.currentTime+offset;
    osc.frequency.setValueAtTime(freq,t);
    env.gain.setValueAtTime(0,t);
    env.gain.linearRampToValueAtTime(gain,t+0.02);
    env.gain.exponentialRampToValueAtTime(0.001,t+dur);
    osc.start(t);osc.stop(t+dur+0.01);
  }catch(e){}
}
function playTick() { playTone(880,"sine",0.12,0.25); }
function playTimerStart() { playTone(660,"triangle",0.09,0.14); }
function playTimerStop() { playTone(330,"triangle",0.09,0.14); }
function playFanfare() { [523,659,784,1047].forEach((f,i)=>playTone(f,"triangle",0.35,0.26,i*0.13)); }
function playBoom() {
  if(!soundEnabled) return;
  try{
    const ac = getAudioCtx();
    const osc=ac.createOscillator(),g=ac.createGain(),filt=ac.createBiquadFilter();
    osc.type="sawtooth";filt.type="lowpass";filt.frequency.value=180;
    osc.connect(filt);filt.connect(g);g.connect(ac.destination);
    osc.frequency.setValueAtTime(90,ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(22,ac.currentTime+0.55);
    g.gain.setValueAtTime(0.55,ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+0.6);
    osc.start(ac.currentTime);osc.stop(ac.currentTime+0.65);
  }catch(e){}
}

function applyTheme() {
  document.body.classList.toggle("light-mode",!isDarkMode);
  const btn=document.getElementById("darkmode-toggle");
  if(btn) btn.textContent=isDarkMode?"☀️ Light":"🌙 Dark";
}
function toggleDarkMode() {
  isDarkMode=!isDarkMode;
  localStorage.setItem("wc_theme",isDarkMode?"dark":"light");
  applyTheme();
}
function injectDarkModeToggle() {
  const bar=document.querySelector(".status-bar");
  if(!bar||document.getElementById("darkmode-toggle")) return;
  const btn=document.createElement("button");
  btn.id="darkmode-toggle"; btn.className="btn-mini";
  btn.onclick=toggleDarkMode;
  bar.insertBefore(btn,bar.firstChild);
}
function initSoundToggle() {
  const bar=document.querySelector(".status-bar");
  if(!bar||document.getElementById("sound-toggle")) return;
  const btn=document.createElement("button");
  btn.id="sound-toggle"; btn.className="btn-mini";
  btn.textContent=soundEnabled?"🔊 Sound":"🔇 Sound";
  btn.onclick=()=>{
    soundEnabled=!soundEnabled;
    localStorage.setItem("wc_sound",soundEnabled?"on":"off");
    btn.textContent=soundEnabled?"🔊 Sound":"🔇 Sound";
    if(soundEnabled) playTick();
  };
  bar.appendChild(btn);
}

function initViewerCount() {
  let deviceId=localStorage.getItem("wc_device_id");
  if(!deviceId){ deviceId="d_"+Math.random().toString(36).slice(2)+Date.now(); localStorage.setItem("wc_device_id",deviceId); }
  const ref=db.collection("presence").doc(deviceId);
  async function hb(){ try{ await ref.set({lastSeen:Date.now()}); }catch(e){} }
  hb(); setInterval(hb,25000);
  window.addEventListener("beforeunload",()=>{ ref.delete().catch(()=>{}); });
  db.collection("presence").onSnapshot(snap=>{
    const now=Date.now();
    const count=snap.docs.filter(d=>(now-(d.data().lastSeen||0))<60000).length;
    const el=document.getElementById("vc-num");
    if(el) el.textContent=count;
  });
}
function injectViewerCountPill() {
  const header=document.querySelector("header");
  if(!header||document.querySelector(".vc-pill")) return;
  const pill=document.createElement("div");
  pill.className="vc-pill";
  pill.innerHTML=`<span class="pulse-dot"></span><span id="vc-num" class="vc-num">--</span><span>watching</span>`;
  header.appendChild(pill);
}

async function removeCursorDoc() {
  const deviceId=localStorage.getItem("wc_device_id");
  if(!deviceId) return;
  try{ await db.collection("cursors").doc(deviceId).delete(); }catch(e){}
}

function checkAdminPassword() {
  const input=document.getElementById("pw-input");
  if(input && input.value===ADMIN_PASSWORD){
    sessionStorage.setItem("adminUnlocked","yes");
    showAdminContent(); injectAdminCursorControls(); startApp();
  }
}
function showAdminContent() {
  const gate=document.getElementById("password-gate");
  const content=document.getElementById("admin-content");
  if(gate) gate.style.display="none";
  if(content) content.style.display="flex";
}

function listenToLaunchGate() {
  db.doc(SETTINGS_DOC).onSnapshot(snap=>{
    const data=snap.exists?snap.data():{};
    if(sessionStorage.getItem("viewerUnlocked")==="yes"){hideLaunchOverlay();return;}
    window._viewerPassword=data.viewerPassword||"";
    const launchMs=data.launchMs||null;
    if(!launchMs||Date.now()>=launchMs) hideLaunchOverlay();
    else showLaunchOverlay(launchMs);
  });
}
function showLaunchOverlay(launchMs) {
  const overlay=document.getElementById("launch-overlay");
  if(overlay) overlay.classList.add("active");
  function tick(){
    const rem=launchMs-Date.now();
    if(rem<=0){clearInterval(launchCdInterval);triggerShatterReveal();return;}
    const d=Math.floor(rem/86400000),h=Math.floor((rem%86400000)/3600000),m=Math.floor((rem%3600000)/60000),s=Math.floor((rem%60000)/1000);
    const q=id=>document.getElementById(id);
    if(q("cd-days")) q("cd-days").textContent=String(d).padStart(2,"0");
    if(q("cd-hours")) q("cd-hours").textContent=String(h).padStart(2,"0");
    if(q("cd-mins")) q("cd-mins").textContent=String(m).padStart(2,"0");
    if(q("cd-secs")) q("cd-secs").textContent=String(s).padStart(2,"0");
  }
  tick(); launchCdInterval=setInterval(tick,1000);
}
function checkViewerPassword() {
  const input=document.getElementById("viewer-pw-input");
  if(input && input.value===window._viewerPassword){
    sessionStorage.setItem("viewerUnlocked","yes");
    triggerShatterReveal();
  }
}
function hideLaunchOverlay() {
  const overlay=document.getElementById("launch-overlay");
  if(launchCdInterval) clearInterval(launchCdInterval);
  if(!overlay) return;
  overlay.style.display="none";
}

function listenToSettings() {
  db.doc(SETTINGS_DOC).onSnapshot(snap=>{
    if(!snap.exists) return;
    const {launchMs,viewerPassword,pinnedTaskId:pid}=snap.data();
    const li=document.getElementById("launch-date-input");
    if(li&&launchMs) li.value=new Date(launchMs - new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);
    if(pid!==undefined) pinnedTaskId=pid||null;
    if(currentTasks.length) renderPinnedTask();
  });
}

function listenToTasks(){
  db.doc(TASKS_DOC).onSnapshot(snap=>{
    if(!snap.exists) return;
    currentTasks=snap.data().tasks;
    renderTasks(currentTasks);
    renderPinnedTask();
    updateTotalTime(currentTasks);
  });
}
function startTaskTick(){
  setInterval(()=>{
    currentTasks.forEach(t=>{
      const el=document.getElementById(`task-timer-${t.id}`);
      if(el) el.textContent=fmtMs(liveMs(t));
    });
    updateTotalTime(currentTasks);
  },1000);
}
function liveMs(task){
  let ms=task.timerMs||0;
  if(task.timerRunning&&task.timerStartedAt) ms+=Date.now()-task.timerStartedAt;
  return ms;
}
function updateTotalTime(tasks){
  const el=document.getElementById("total-time-display");
  if(el) el.textContent=fmtMs(tasks.reduce((s,t)=>s+liveMs(t),0));
}
function fmtMs(ms){
  const t=Math.floor(Math.max(0,ms)/1000);
  const h=Math.floor(t/3600),m=Math.floor((t%3600)/60),s=t%60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

init();
