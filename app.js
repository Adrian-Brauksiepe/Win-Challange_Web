
// ╔══════════════════════════════════════════════╗
// ║   WIN CHALLENGE TRACKER  —  app.js           ║
// ║   All features consolidated in one file      ║
// ╚══════════════════════════════════════════════╝

// ============================================================
// CONFIG  —  change passwords here
// ============================================================
const ADMIN_PASSWORD = "0405";

// ============================================================
// DEFAULT TASKS  —  edit label/icon/tooltip/difficulty here
// difficulty: "easy" | "medium" | "hard" | ""
// icon: emoji string OR image path/URL
// ============================================================
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

// Reaction emojis shown per task
const REACTION_EMOJIS = ["🔥","💪","👏","⚡","🏆"];

// Difficulty config
const DIFF = {
  easy:   { label:"Easy",   color:"#48c774", bg:"rgba(72,199,116,0.13)"  },
  medium: { label:"Medium", color:"#f0c040", bg:"rgba(240,192,64,0.13)"  },
  hard:   { label:"Hard",   color:"#e07830", bg:"rgba(224,120,48,0.13)"  },
};
const DIFF_WEIGHT = { easy:1, medium:2, hard:3 };

// ============================================================
// FIRESTORE PATHS
// ============================================================
const TASKS_DOC    = "challenge/tasks";
const TIMER_DOC    = "challenge/timer";
const SETTINGS_DOC = "challenge/settings";

const IS_ADMIN = window.location.pathname.includes("admin");

// ============================================================
// DOM REFS
// ============================================================
const timerDisplay = document.getElementById("timer-display");
const timerSubline = document.getElementById("timer-subline");
const taskList     = document.getElementById("task-list");
const progressText = document.getElementById("progress-text");
const progressFill = document.getElementById("progress-fill");
const loadingEl    = document.getElementById("loading");
const tooltipEl    = document.getElementById("tooltip");

// ============================================================
// STATE
// ============================================================
let challengeInterval  = null;
let challengeStarted   = false;
let currentTasks       = [];
let taskTickInterval   = null;
let prevCheckedCount   = -1;
let launchCdInterval   = null;
let audioCtx           = null;       // created lazily on first user gesture
let soundEnabled       = localStorage.getItem("wc_sound") !== "off";
let reactionSeenIds    = new Set();  // tracks reaction docs we've already animated

// ============================================================
// ██████████  INIT
// ============================================================
async function init() {
  injectFeatureStyles();
  initBackground();
  unlockAudioOnGesture();

  if (IS_ADMIN) {
    document.body.classList.add("admin-mode");
    if (sessionStorage.getItem("adminUnlocked") === "yes") {
      showAdminContent();
      startApp();
    } else {
      if (loadingEl) loadingEl.classList.add("hidden");
    }
  } else {
    startApp();
  }
}

function startApp() {
  if (IS_ADMIN) {
    listenToSettings();
  } else {
    listenToLaunchGate();
  }
  listenToTasks();
  listenToTimer();
  startTaskTick();
  initViewerCount();
  initSoundToggle();
  injectViewerCountPill();
  injectDarkModeToggle();
  setTimeout(() => { if (loadingEl) loadingEl.classList.add("hidden"); }, 1000);
}

// ============================================================
// ██████████  INJECTED CSS  (all feature styles in one block)
// ============================================================
function injectFeatureStyles() {
  if (document.getElementById("wc-feature-styles")) return;
  const el = document.createElement("style");
  el.id = "wc-feature-styles";
  el.textContent = `

    /* ---- Viewer count pill ---- */
    .vc-pill {
      display:inline-flex; align-items:center; gap:6px;
      background:var(--surface2); border:1px solid var(--border);
      border-radius:99px; padding:5px 14px;
      font-size:0.75rem; color:var(--text-muted);
      letter-spacing:0.06em; margin-top:6px;
    }
    .vc-num {
      font-family:'Bebas Neue',sans-serif;
      font-size:1rem; color:var(--accent); letter-spacing:0.08em;
    }

    /* ---- Difficulty badge ---- */
    .diff-badge {
      display:inline-flex; align-items:center;
      font-size:0.6rem; font-weight:700; letter-spacing:0.1em;
      text-transform:uppercase; padding:2px 7px;
      border-radius:99px; border:1px solid; flex-shrink:0; line-height:1.4;
    }

    /* ---- Per-task reaction buttons (right side of row) ---- */
    .task-react-group {
      display:flex; gap:3px; align-items:center; flex-shrink:0; margin-left:4px;
    }
    .react-btn {
      background:none; border:none;
      font-size:0.9rem; cursor:pointer; padding:2px 3px;
      border-radius:6px; line-height:1;
      transition:transform 0.1s;
      opacity:0.45;
    }
    .react-btn:hover  { opacity:1; transform:scale(1.25); }
    .react-btn:active { transform:scale(0.9); }

    /* ---- Floating emoji animation ---- */
    .float-emoji {
      position:fixed; pointer-events:none; z-index:800;
      font-size:1.7rem; user-select:none;
      animation:floatUp 2.2s ease-out forwards;
    }
    @keyframes floatUp {
      0%   { transform:translateY(0)    scale(1);    opacity:1; }
      65%  { transform:translateY(-200px) scale(1.2); opacity:1; }
      100% { transform:translateY(-300px) scale(0.8); opacity:0; }
    }

    /* ---- Sound toggle button ---- */
    #sound-toggle {
      background:var(--surface2); border:1px solid var(--border);
      color:var(--text-muted); font-family:'DM Sans',sans-serif;
      font-size:0.75rem; padding:6px 12px; border-radius:8px;
      cursor:pointer; transition:all 0.15s;
      display:flex; align-items:center; gap:6px;
    }
    #sound-toggle:hover { border-color:var(--accent); color:var(--accent); }

    /* ---- Dark/light mode ---- */
    body.light-mode {
      --bg:#f0f2f5; --surface:#ffffff; --surface2:#e8ecf2;
      --border:#d0d8e4; --text:#1a1f2e; --text-muted:#6070a0;
      background:var(--bg);
    }
    body.light-mode #bg-canvas { opacity:0.15; }
    body.light-mode .timer-card,
    body.light-mode .checklist-card,
    body.light-mode .total-time-card,
    body.light-mode .admin-controls { box-shadow:0 2px 12px rgba(0,0,0,0.08); }
    #darkmode-toggle {
      background:var(--surface2); border:1px solid var(--border);
      color:var(--text-muted); font-family:'DM Sans',sans-serif;
      font-size:0.75rem; padding:6px 12px; border-radius:8px;
      cursor:pointer; transition:all 0.15s;
      display:flex; align-items:center; gap:6px;
    }
    #darkmode-toggle:hover { border-color:var(--accent); color:var(--accent); }

    /* ---- Cinematic launch reveal ---- */
    #launch-overlay {
      transition:opacity 0.9s ease, backdrop-filter 0.9s ease;
    }
    #launch-overlay.cinematic-out {
      opacity:0 !important;
      pointer-events:none;
    }

    /* ---- Task editor difficulty select ---- */
    .task-editor-diff-select {
      background:var(--surface2); border:1px solid var(--border);
      color:var(--text); font-family:'DM Sans',sans-serif;
      font-size:0.78rem; padding:5px 8px; border-radius:7px;
      outline:none; cursor:pointer; width:100%;
    }
    .task-editor-diff-select:focus { border-color:var(--accent); }
  `;
  document.head.appendChild(el);
}

// ============================================================
// ██████████  BACKGROUND STARS
// ============================================================
function initBackground() {
  const canvas = document.getElementById("bg-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let W, H, stars = [];

  function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
  function makeStars() {
    stars = [];
    const n = Math.floor((W * H) / 9000);
    for (let i = 0; i < n; i++) stars.push({
      x: Math.random()*W, y: Math.random()*H,
      r: Math.random()*1.2+0.3, a: Math.random()*0.5+0.1,
      dx:(Math.random()-0.5)*0.12, dy:(Math.random()-0.5)*0.08,
      da:(Math.random()-0.5)*0.003
    });
  }
  function draw() {
    ctx.clearRect(0,0,W,H);
    for (const s of stars) {
      s.x+=s.dx; s.y+=s.dy; s.a+=s.da;
      if (s.a>0.65||s.a<0.05) s.da*=-1;
      if (s.x<0) s.x=W; if (s.x>W) s.x=0;
      if (s.y<0) s.y=H; if (s.y>H) s.y=0;
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(255,220,100,${s.a})`; ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  resize(); makeStars(); draw();
  window.addEventListener("resize", ()=>{ resize(); makeStars(); });
}

// ============================================================
// ██████████  CONFETTI
// ============================================================
function launchConfetti(big=false) {
  const canvas = document.getElementById("confetti-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  const colors = ["#f0c040","#e07830","#48c774","#60a0ff","#e060e0","#ffffff"];
  const pieces = [];
  const count  = big ? 260 : 80;
  for (let i=0;i<count;i++) pieces.push({
    x:Math.random()*canvas.width,
    y:big?Math.random()*canvas.height*0.4:(Math.random()-0.3)*canvas.height*0.5,
    w:Math.random()*10+5, h:Math.random()*5+3,
    color:colors[Math.floor(Math.random()*colors.length)],
    rot:Math.random()*360, drot:(Math.random()-0.5)*8,
    dy:Math.random()*3+1.5, dx:(Math.random()-0.5)*2, opacity:1
  });
  let frame=0; const maxF=big?280:160;
  function tick() {
    ctx.clearRect(0,0,canvas.width,canvas.height); frame++;
    for (const p of pieces) {
      p.y+=p.dy; p.x+=p.dx; p.rot+=p.drot; p.dy*=0.995;
      if (frame>maxF*0.6) p.opacity=Math.max(0,p.opacity-0.025);
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot*Math.PI/180);
      ctx.globalAlpha=p.opacity; ctx.fillStyle=p.color;
      ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); ctx.restore();
    }
    if (frame<maxF) requestAnimationFrame(tick);
    else ctx.clearRect(0,0,canvas.width,canvas.height);
  }
  tick();
}

// ============================================================
// ██████████  SOUND ENGINE
// ============================================================
// AudioContext is created lazily on first user gesture to
// satisfy browser autoplay policy — this is the fix for
// sounds that exist but never play.
// ============================================================
function unlockAudioOnGesture() {
  const unlock = () => {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    document.removeEventListener("click",  unlock);
    document.removeEventListener("touchend", unlock);
  };
  document.addEventListener("click",   unlock, { once:true });
  document.addEventListener("touchend", unlock, { once:true });
}

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playTone(freq, type, duration, gain=0.28, startOffset=0) {
  if (!soundEnabled) return;
  try {
    const ac  = getAudioCtx();
    const osc = ac.createOscillator();
    const env = ac.createGain();
    osc.connect(env); env.connect(ac.destination);
    osc.type = type;
    const t = ac.currentTime + startOffset;
    osc.frequency.setValueAtTime(freq, t);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(gain, t + 0.02);
    env.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.start(t); osc.stop(t + duration + 0.01);
  } catch(e) {}
}

function playTick()        { playTone(880, "sine",     0.12, 0.28); }
function playTimerStart()  { playTone(660, "triangle", 0.09, 0.15); }
function playTimerStop()   { playTone(330, "triangle", 0.09, 0.15); }
function playLaunchSound() {
  // Sweeping "reveal" sound — rising chord
  playTone(440,  "sine", 0.4, 0.2, 0);
  playTone(550,  "sine", 0.4, 0.2, 0.1);
  playTone(660,  "sine", 0.5, 0.2, 0.2);
  playTone(880,  "sine", 0.6, 0.2, 0.35);
}
function playFanfare() {
  [523,659,784,1047].forEach((f,i) => playTone(f,"triangle",0.35,0.28,i*0.13));
}

// ============================================================
// ██████████  DARK MODE TOGGLE
// ============================================================
let isDarkMode = localStorage.getItem("wc_theme") !== "light";

function applyTheme() {
  document.body.classList.toggle("light-mode", !isDarkMode);
  const btn = document.getElementById("darkmode-toggle");
  if (btn) btn.textContent = isDarkMode ? "☀️ Light" : "🌙 Dark";
}

function toggleDarkMode() {
  isDarkMode = !isDarkMode;
  localStorage.setItem("wc_theme", isDarkMode ? "dark" : "light");
  applyTheme();
}

function injectDarkModeToggle() {
  const bar = document.querySelector(".status-bar");
  if (!bar || document.getElementById("darkmode-toggle")) return;
  const btn = document.createElement("button");
  btn.id = "darkmode-toggle"; btn.className = "btn-mini";
  btn.onclick = toggleDarkMode;
  bar.insertBefore(btn, bar.firstChild);
  applyTheme();
}

// ============================================================
// ██████████  SOUND TOGGLE
// ============================================================
function initSoundToggle() {
  const bar = document.querySelector(".status-bar");
  if (!bar || document.getElementById("sound-toggle")) return;
  const btn = document.createElement("button");
  btn.id = "sound-toggle"; btn.className = "btn-mini";
  btn.textContent = soundEnabled ? "🔊 Sound" : "🔇 Sound";
  btn.onclick = () => {
    soundEnabled = !soundEnabled;
    localStorage.setItem("wc_sound", soundEnabled ? "on" : "off");
    btn.textContent = soundEnabled ? "🔊 Sound" : "🔇 Sound";
    if (soundEnabled) playTick(); // demo the sound on enable
  };
  bar.appendChild(btn);
}

// ============================================================
// ██████████  LIVE VIEWER COUNT
// ============================================================
// Uses a stable localStorage device ID so ALL tabs from the
// same browser share one presence document → count = 1 device.
// ============================================================
function initViewerCount() {
  // Get or create a stable device ID (persists across tabs/reloads)
  let deviceId = localStorage.getItem("wc_device_id");
  if (!deviceId) {
    deviceId = "d_" + Math.random().toString(36).slice(2) + Date.now();
    localStorage.setItem("wc_device_id", deviceId);
  }

  const presenceRef = db.collection("presence").doc(deviceId);

  // Write heartbeat
  async function heartbeat() {
    try { await presenceRef.set({ lastSeen: Date.now() }); } catch(e) {}
  }

  heartbeat();
  const hbInterval = setInterval(heartbeat, 25000);

  // Remove on page unload (best-effort)
  window.addEventListener("beforeunload", () => {
    clearInterval(hbInterval);
    presenceRef.delete().catch(()=>{});
  });

  // Listen and count active devices (last heartbeat < 60s ago)
  db.collection("presence").onSnapshot(snap => {
    const now   = Date.now();
    const count = snap.docs.filter(d => (now - (d.data().lastSeen||0)) < 60000).length;
    const el    = document.getElementById("vc-num");
    if (el) el.textContent = count;
  });

  // Clean up stale docs once per session after 10s
  setTimeout(async () => {
    try {
      const snap = await db.collection("presence").get();
      const now  = Date.now();
      snap.docs.forEach(d => {
        if ((now - (d.data().lastSeen||0)) > 120000) d.ref.delete().catch(()=>{});
      });
    } catch(e) {}
  }, 10000);
}

function injectViewerCountPill() {
  const header = document.querySelector("header");
  if (!header || document.querySelector(".vc-pill")) return;
  const pill = document.createElement("div");
  pill.className = "vc-pill";
  pill.innerHTML = `<span class="pulse-dot"></span><span id="vc-num" class="vc-num">--</span><span>watching</span>`;
  header.appendChild(pill);
}

// ============================================================
// ██████████  ADMIN PASSWORD GATE
// ============================================================
function checkAdminPassword() {
  const input = document.getElementById("pw-input");
  const error = document.getElementById("pw-error");
  if (!input) return;
  if (input.value === ADMIN_PASSWORD) {
    sessionStorage.setItem("adminUnlocked","yes");
    showAdminContent();
    startApp();
  } else {
    error.textContent = "❌ Wrong password, try again";
    input.value = ""; input.focus();
    const card = document.querySelector(".pw-card");
    if (card) { card.classList.add("shake"); setTimeout(()=>card.classList.remove("shake"),500); }
  }
}

function showAdminContent() {
  const gate    = document.getElementById("password-gate");
  const content = document.getElementById("admin-content");
  if (gate)    gate.style.display    = "none";
  if (content) content.style.display = "flex";
}

// ============================================================
// ██████████  LAUNCH GATE  (viewer side)
// ============================================================
function listenToLaunchGate() {
  db.doc(SETTINGS_DOC).onSnapshot(snap => {
    const data = snap.exists ? snap.data() : {};
    if (sessionStorage.getItem("viewerUnlocked") === "yes") { hideLaunchOverlay(); return; }
    window._viewerPassword = data.viewerPassword || "";
    const launchMs = data.launchMs || null;
    if (!launchMs || Date.now() >= launchMs) hideLaunchOverlay();
    else showLaunchOverlay(launchMs);
  });
}

function showLaunchOverlay(launchMs) {
  const overlay = document.getElementById("launch-overlay");
  if (overlay) overlay.classList.add("active");
  if (launchCdInterval) clearInterval(launchCdInterval);
  function tick() {
    const rem = launchMs - Date.now();
    if (rem <= 0) { clearInterval(launchCdInterval); hideLaunchOverlay(true); return; }
    const d=Math.floor(rem/86400000), h=Math.floor((rem%86400000)/3600000),
          m=Math.floor((rem%3600000)/60000), s=Math.floor((rem%60000)/1000);
    const pad = n => String(n).padStart(2,"0");
    const q   = id => document.getElementById(id);
    if (q("cd-days"))  q("cd-days").textContent  = pad(d);
    if (q("cd-hours")) q("cd-hours").textContent = pad(h);
    if (q("cd-mins"))  q("cd-mins").textContent  = pad(m);
    if (q("cd-secs"))  q("cd-secs").textContent  = pad(s);
  }
  tick();
  launchCdInterval = setInterval(tick, 1000);
}

// ---- Cinematic hide: fade out, play sound, then remove ----
function hideLaunchOverlay(cinematic=false) {
  const overlay = document.getElementById("launch-overlay");
  if (launchCdInterval) clearInterval(launchCdInterval);
  if (!overlay) return;

  if (cinematic) {
    // Play reveal sound (AudioContext already unlocked by this point via countdown interaction)
    playLaunchSound();
    overlay.classList.add("cinematic-out");
    setTimeout(() => { overlay.style.display = "none"; }, 950);
  } else {
    overlay.classList.add("fade-out");
    setTimeout(() => { overlay.style.display = "none"; }, 600);
  }
}

function checkViewerPassword() {
  const input = document.getElementById("viewer-pw-input");
  const error = document.getElementById("viewer-pw-error");
  if (!input) return;
  if (!window._viewerPassword) { error.textContent = "No early-access password set."; return; }
  if (input.value === window._viewerPassword) {
    sessionStorage.setItem("viewerUnlocked","yes");
    hideLaunchOverlay(true); // cinematic even on password entry
  } else {
    error.textContent = "❌ Wrong password";
    input.value = ""; input.focus();
    const card = document.querySelector(".launch-card");
    if (card) { card.classList.add("shake"); setTimeout(()=>card.classList.remove("shake"),500); }
  }
}

// ============================================================
// ██████████  SETTINGS  (admin side)
// ============================================================
function listenToSettings() {
  db.doc(SETTINGS_DOC).onSnapshot(snap => {
    if (!snap.exists) return;
    const { launchMs, viewerPassword } = snap.data();
    const li = document.getElementById("launch-date-input");
    if (li && launchMs) {
      const d = new Date(launchMs);
      li.value = new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
    }
    const vp = document.getElementById("viewer-pw-set");
    if (vp && viewerPassword !== undefined) vp.value = viewerPassword;
    const st = document.getElementById("launch-date-status");
    if (st) {
      if (launchMs) {
        const d = new Date(launchMs);
        if (Date.now()>=launchMs) { st.textContent=`✅ Site is LIVE — launched ${d.toLocaleString()}`; st.style.color="var(--success)"; }
        else { st.textContent=`⏳ Countdown active — opens ${d.toLocaleString()}`; st.style.color="var(--accent)"; }
      } else { st.textContent="No launch date set — site is publicly visible."; st.style.color="var(--text-muted)"; }
    }
  });
}

async function saveLaunchDate() {
  const input = document.getElementById("launch-date-input");
  if (!input||!input.value) { showToast("⚠️ Pick a date first"); return; }
  await db.doc(SETTINGS_DOC).set({ launchMs: new Date(input.value).getTime() }, { merge:true });
  showToast("📅 Launch date saved!");
}

async function clearLaunchDate() {
  if (!confirm("Remove the countdown? The site will be visible to everyone immediately.")) return;
  await db.doc(SETTINGS_DOC).set({ launchMs:null }, { merge:true });
  document.getElementById("launch-date-input").value = "";
  showToast("✅ Countdown removed");
}

async function saveViewerPassword() {
  const input = document.getElementById("viewer-pw-set");
  const pw = input ? input.value.trim() : "";
  await db.doc(SETTINGS_DOC).set({ viewerPassword:pw }, { merge:true });
  const st = document.getElementById("viewer-pw-status");
  if (st) { st.textContent=pw?`✅ Password set to "${pw}"`:"✅ Password cleared"; st.style.color="var(--success)"; }
  showToast("🔓 Viewer password saved!");
}

// ============================================================
// ██████████  TASKS  —  real-time listener
// ============================================================
function listenToTasks() {
  db.doc(TASKS_DOC).onSnapshot(async snap => {
    let tasks;
    if (!snap.exists) {
      tasks = DEFAULT_TASKS;
      await db.doc(TASKS_DOC).set({ tasks: DEFAULT_TASKS });
    } else {
      // Merge defaults so new fields (difficulty, tooltip) always exist
      tasks = snap.data().tasks.map(t => ({
        timerMs:0, timerRunning:false, timerStartedAt:null,
        tooltip:"", difficulty:"", ...t
      }));
    }
    currentTasks = tasks;
    renderTasks(tasks);
    updateTotalTime(tasks);
    checkCompletionEffects(tasks);
    if (IS_ADMIN) renderTaskEditor(tasks);
  }, err => { console.error("Tasks error:",err); showToast("⚠️ Database connection failed"); });
}

// Local tick: updates task timer cells every second without hitting Firestore
function startTaskTick() {
  if (taskTickInterval) clearInterval(taskTickInterval);
  taskTickInterval = setInterval(() => {
    currentTasks.forEach(t => {
      const el = document.getElementById(`task-timer-${t.id}`);
      if (el) el.textContent = fmtMs(liveMs(t));
    });
    updateTotalTime(currentTasks);
  }, 1000);
}

function liveMs(task) {
  let ms = task.timerMs || 0;
  if (task.timerRunning && task.timerStartedAt) ms += Date.now() - task.timerStartedAt;
  return ms;
}

function updateTotalTime(tasks) {
  const el = document.getElementById("total-time-display");
  if (el) el.textContent = fmtMs(tasks.reduce((s,t)=>s+liveMs(t),0));
}

// ---- Completion effects ----
function checkCompletionEffects(tasks) {
  const done = tasks.filter(t=>t.checked).length;
  if (prevCheckedCount === -1) { prevCheckedCount = done; return; }
  if (done > prevCheckedCount) {
    if (done === tasks.length) {
      launchConfetti(true);
      playFanfare();
      showToast("🏆 ALL TASKS COMPLETE! CHAMPION!");
    } else {
      launchConfetti(false);
      playTick();
    }
  }
  prevCheckedCount = done;
}

// ---- Render helpers ----
function renderIcon(icon) {
  if (icon && (icon.includes("/")||/\.(png|jpg|gif|webp|svg)$/i.test(icon)||icon.startsWith("http")))
    return `<img class="task-img" src="${icon}" alt="icon"/>`;
  return `<span class="task-emoji">${icon||"⭐"}</span>`;
}

function diffBadgeHtml(difficulty) {
  const d = DIFF[difficulty];
  if (!d) return "";
  return `<span class="diff-badge" style="color:${d.color};background:${d.bg};border-color:${d.color}55">${d.label}</span>`;
}

function escHtml(s) { return String(s).replace(/"/g,"&quot;").replace(/</g,"&lt;"); }

// ---- Render task list ----
function renderTasks(tasks) {
  if (!taskList) return;
  const scrollY = window.scrollY;
  taskList.innerHTML = "";

  // Weighted progress
  const hasDiff    = tasks.some(t => t.difficulty);
  const totalW     = tasks.reduce((s,t)=>s+(DIFF_WEIGHT[t.difficulty]||1),0);
  const doneW      = tasks.filter(t=>t.checked).reduce((s,t)=>s+(DIFF_WEIGHT[t.difficulty]||1),0);
  const pct        = totalW ? (doneW/totalW)*100 : 0;
  const doneCount  = tasks.filter(t=>t.checked).length;

  if (progressText) progressText.textContent = `${doneCount} / ${tasks.length}`;
  if (progressFill) progressFill.style.width  = `${hasDiff ? pct : (tasks.length ? (doneCount/tasks.length)*100 : 0)}%`;

  tasks.forEach(task => {
    const li = document.createElement("li");
    li.className = "task-item" + (task.checked?" checked":"");
    li.dataset.id = task.id;

    const reactBtns = REACTION_EMOJIS.map(e =>
      `<button class="react-btn" onclick="sendReaction(event,'${e}')" title="React">${e}</button>`
    ).join("");

    li.innerHTML = `
      <div class="task-checkbox"
        ${IS_ADMIN ? `onclick="toggleTask(event,'${task.id}')" style="cursor:pointer"` : ""}>
        <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
          <path d="M1.5 5L5 8.5L11.5 1.5" stroke="white" stroke-width="2.2"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      ${renderIcon(task.icon||task.emoji)}
      <span class="task-label">${task.label}</span>
      ${task.tooltip ? `<span class="tooltip-anchor" data-tip="${escHtml(task.tooltip)}">ℹ️</span>` : ""}
      ${diffBadgeHtml(task.difficulty)}
      <div class="task-timer-group">
        <span class="task-timer-display" id="task-timer-${task.id}">${fmtMs(liveMs(task))}</span>
        <div class="task-timer-btns">
          <button class="ttbtn ttbtn-start${task.timerRunning?" active":""}"
                  onclick="taskTimerStart(event,'${task.id}')"
                  title="${task.timerRunning?"Stop timer":"Start timer"}">
            ${task.timerRunning?"⏸":"▶"}
          </button>
          ${IS_ADMIN?`<button class="ttbtn ttbtn-reset" onclick="taskTimerReset(event,'${task.id}')" title="Reset timer">↺</button>`:""}
        </div>
      </div>
      <div class="task-react-group">${reactBtns}</div>
    `;
    taskList.appendChild(li);
  });

  attachTooltips();
  window.scrollTo(0, scrollY);
}

// ---- Tooltips ----
function attachTooltips() {
  document.querySelectorAll(".tooltip-anchor").forEach(el => {
    el.addEventListener("mouseenter", e => {
      const tip = e.currentTarget.dataset.tip;
      if (!tip||!tooltipEl) return;
      tooltipEl.textContent = tip;
      tooltipEl.classList.add("visible");
    });
    el.addEventListener("mousemove", e => {
      if (!tooltipEl) return;
      tooltipEl.style.left = (e.clientX+12)+"px";
      tooltipEl.style.top  = (e.clientY-8)+"px";
    });
    el.addEventListener("mouseleave", ()=>{ if (tooltipEl) tooltipEl.classList.remove("visible"); });
  });
}

// ---- Task interactions ----
async function toggleTask(e, taskId) {
  e.stopPropagation();
  const updated = currentTasks.map(t => t.id===taskId ? {...t, checked:!t.checked} : t);
  try { await db.doc(TASKS_DOC).set({ tasks:updated }); } catch { showToast("❌ Failed to save"); }
}

async function taskTimerStart(e, taskId) {
  e.stopPropagation();
  const task = currentTasks.find(t=>t.id===taskId); if (!task) return;
  const now  = Date.now();
  let updated;
  if (task.timerRunning) {
    playTimerStop();
    const elapsed = task.timerStartedAt ? now-task.timerStartedAt : 0;
    updated = currentTasks.map(t => t.id===taskId
      ? {...t, timerRunning:false, timerMs:(t.timerMs||0)+elapsed, timerStartedAt:null} : t);
  } else {
    playTimerStart();
    updated = currentTasks.map(t => t.id===taskId
      ? {...t, timerRunning:true, timerStartedAt:now} : t);
  }
  await db.doc(TASKS_DOC).set({ tasks:updated });
}

async function taskTimerReset(e, taskId) {
  e.stopPropagation();
  if (!confirm("Reset this task timer to 0?")) return;
  const updated = currentTasks.map(t => t.id===taskId
    ? {...t, timerMs:0, timerRunning:false, timerStartedAt:null} : t);
  await db.doc(TASKS_DOC).set({ tasks:updated });
  showToast("↺ Timer reset");
}

async function resetTasks() {
  if (!confirm("Reset ALL tasks to unchecked?")) return;
  const snap = await db.doc(TASKS_DOC).get(); if (!snap.exists) return;
  await db.doc(TASKS_DOC).set({ tasks: snap.data().tasks.map(t=>({...t,checked:false})) });
  showToast("🔄 All tasks reset");
}

async function checkAll() {
  const snap = await db.doc(TASKS_DOC).get(); if (!snap.exists) return;
  await db.doc(TASKS_DOC).set({ tasks: snap.data().tasks.map(t=>({...t,checked:true})) });
  showToast("🎉 All tasks checked!");
}

// ============================================================
// ██████████  TASK EDITOR  (admin)
// ============================================================
function renderTaskEditor(tasks) {
  const container = document.getElementById("task-editor-list");
  if (!container) return;
  container.innerHTML = "";
  tasks.forEach((task, index) => {
    const diffOpts = ["","easy","medium","hard"].map(v =>
      `<option value="${v}" ${task.difficulty===v?"selected":""}>${
        v ? {easy:"🟢 Easy (1pt)",medium:"🟡 Medium (2pt)",hard:"🔴 Hard (3pt)"}[v] : "── No Difficulty ──"
      }</option>`
    ).join("");

    const row = document.createElement("div");
    row.className = "task-editor-row";
    row.dataset.index = index;
    row.innerHTML = `
      <span class="task-editor-num">${index+1}</span>
      <div class="task-editor-icon-wrap">
        <div class="task-editor-icon-preview" id="preview-${index}">${renderIcon(task.icon||task.emoji||"⭐")}</div>
        <input class="task-editor-icon-input" type="text" value="${task.icon||task.emoji||""}"
               placeholder="🔥 or icons/img.png"
               oninput="updateIconPreview(${index},this.value)" data-field="icon"/>
      </div>
      <div class="task-editor-fields">
        <input class="task-editor-label-input" type="text" value="${escHtml(task.label)}"
               placeholder="Task description..." data-field="label"/>
        <input class="task-editor-tooltip-input" type="text" value="${escHtml(task.tooltip||"")}"
               placeholder="Tooltip / hover info (e.g. Save: 48 GB)" data-field="tooltip"/>
        <select class="task-editor-diff-select" data-field="difficulty">${diffOpts}</select>
      </div>
      <button class="task-editor-remove" onclick="removeTaskRow(${index})" title="Remove">✕</button>
    `;
    container.appendChild(row);
  });
}

function updateIconPreview(index, value) {
  const p = document.getElementById(`preview-${index}`);
  if (p) p.innerHTML = renderIcon(value||"⭐");
}

async function saveEditedTasks() {
  const rows   = document.querySelectorAll(".task-editor-row");
  const updated = [];
  rows.forEach((row, i) => {
    const get = f => {
      const el = row.querySelector(`[data-field='${f}']`);
      return el ? el.value.trim() : "";
    };
    // CRITICAL: preserve ALL existing runtime fields so nothing is lost on save
    const existing = currentTasks[i] || {};
    updated.push({
      id:             existing.id             || "task_"+(Date.now()+i),
      label:          get("label")            || "Task",
      icon:           get("icon")             || "⭐",
      tooltip:        get("tooltip")          || "",
      difficulty:     get("difficulty")       || "",   // ← preserved from select
      checked:        existing.checked        || false,
      timerMs:        existing.timerMs        || 0,
      timerRunning:   existing.timerRunning   || false,
      timerStartedAt: existing.timerStartedAt || null,
    });
  });
  try { await db.doc(TASKS_DOC).set({ tasks:updated }); showToast("💾 Tasks saved!"); }
  catch { showToast("❌ Failed to save tasks"); }
}

function addNewTask() {
  const container = document.getElementById("task-editor-list");
  if (!container) return;
  const index = container.querySelectorAll(".task-editor-row").length;
  const row   = document.createElement("div");
  row.className = "task-editor-row";
  row.dataset.index = index;
  row.innerHTML = `
    <span class="task-editor-num">${index+1}</span>
    <div class="task-editor-icon-wrap">
      <div class="task-editor-icon-preview" id="preview-${index}">${renderIcon("⭐")}</div>
      <input class="task-editor-icon-input" type="text" value=""
             placeholder="🔥 or icons/img.png"
             oninput="updateIconPreview(${index},this.value)" data-field="icon"/>
    </div>
    <div class="task-editor-fields">
      <input class="task-editor-label-input" type="text" value=""
             placeholder="Task description..." data-field="label"/>
      <input class="task-editor-tooltip-input" type="text" value=""
             placeholder="Tooltip / hover info" data-field="tooltip"/>
      <select class="task-editor-diff-select" data-field="difficulty">
        <option value="">── No Difficulty ──</option>
        <option value="easy">🟢 Easy (1pt)</option>
        <option value="medium">🟡 Medium (2pt)</option>
        <option value="hard">🔴 Hard (3pt)</option>
      </select>
    </div>
    <button class="task-editor-remove" onclick="removeTaskRow(${index})" title="Remove">✕</button>
  `;
  container.appendChild(row);
}

function removeTaskRow(index) {
  const container = document.getElementById("task-editor-list");
  if (!container) return;
  container.querySelectorAll(".task-editor-row")[index]?.remove();
  container.querySelectorAll(".task-editor-row").forEach((r,i)=>{
    r.dataset.index = i;
    const n = r.querySelector(".task-editor-num"); if (n) n.textContent = i+1;
  });
}

// ============================================================
// ██████████  CHALLENGE TIMER  —  countdown
// ============================================================
function listenToTimer() {
  db.doc(TIMER_DOC).onSnapshot(snap => {
    stopChallengeTimer();
    if (!snap.exists) {
      if (timerDisplay) timerDisplay.textContent = "--:--:--";
      if (timerSubline) timerSubline.textContent = "Admin has not started the timer yet";
      return;
    }
    const { startMs, durationMs, running } = snap.data();
    if (!running) {
      const rem = Math.max(0, durationMs-(startMs?Date.now()-startMs:0));
      updateChallengeDisplay(Math.floor(rem/1000), durationMs);
      if (timerSubline) timerSubline.textContent = "Timer paused";
      return;
    }
    startChallengeCountdown(startMs, durationMs);
  }, err => console.error("Timer error:",err));
}

function startChallengeCountdown(startMs, durationMs) {
  if (challengeStarted) return;
  challengeStarted = true;
  function tick() {
    const rem = Math.max(0, durationMs-(Date.now()-startMs));
    updateChallengeDisplay(Math.floor(rem/1000), durationMs);
    if (rem<=0) stopChallengeTimer();
  }
  tick();
  challengeInterval = setInterval(tick, 1000);
}

function stopChallengeTimer() {
  if (challengeInterval) clearInterval(challengeInterval);
  challengeInterval = null; challengeStarted = false;
}

function updateChallengeDisplay(totalSeconds, durationMs) {
  const h=Math.floor(totalSeconds/3600), m=Math.floor((totalSeconds%3600)/60), s=totalSeconds%60;
  const pad = n => String(n).padStart(2,"0");
  if (timerDisplay) timerDisplay.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
  if (timerSubline) {
    if (totalSeconds<=0) { timerSubline.textContent="🏁 Time's up!"; timerSubline.style.color="var(--accent2)"; }
    else { timerSubline.textContent=`${Math.round(durationMs/3600000)}h challenge · counting down`; timerSubline.style.color=""; }
  }
}

async function launchTimer() {
  const h = parseInt(document.getElementById("dur-h")?.value||0,10)||0;
  const m = parseInt(document.getElementById("dur-m")?.value||0,10)||0;
  const durationMs = (h*3600+m*60)*1000;
  if (durationMs<=0) { showToast("⚠️ Set a duration first!"); return; }
  const label = `${h>0?h+"h ":""}${m>0?m+"m":""}`.trim();
  if (!confirm(`Start a ${label} countdown for everyone?`)) return;
  stopChallengeTimer();
  await db.doc(TIMER_DOC).set({ startMs:Date.now(), durationMs, running:true });
  showToast(`⏱ ${label} countdown started!`);
}

async function stopTimer() {
  if (!confirm("Pause the timer for all viewers?")) return;
  stopChallengeTimer();
  const snap = await db.doc(TIMER_DOC).get(); if (!snap.exists) return;
  const { startMs, durationMs } = snap.data();
  const elapsed = Date.now()-startMs;
  await db.doc(TIMER_DOC).set({ startMs:Date.now()-elapsed, durationMs, running:false });
  showToast("⏸ Timer paused");
}

async function resumeTimer() {
  const snap = await db.doc(TIMER_DOC).get();
  if (!snap.exists) { showToast("Launch a timer first"); return; }
  const { startMs, durationMs } = snap.data();
  await db.doc(TIMER_DOC).set({ startMs, durationMs, running:true });
  showToast("▶️ Timer resumed");
}

async function resetTimer() {
  if (!confirm("Clear the timer completely?")) return;
  stopChallengeTimer();
  await db.doc(TIMER_DOC).delete();
  if (timerDisplay) timerDisplay.textContent = "--:--:--";
  if (timerSubline) timerSubline.textContent = "Set a new duration above";
  showToast("🗑 Timer cleared");
}

// ============================================================
// ██████████  UTILITIES
// ============================================================
function fmtMs(ms) {
  const t = Math.floor(Math.max(0,ms)/1000);
  const h=Math.floor(t/3600), m=Math.floor((t%3600)/60), s=t%60;
  const pad = n => String(n).padStart(2,"0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function openMiniMode() {
  const url = window.location.href.replace(/admin\.html.*/,"index.html");
  const p = window.open(url,"WinChallengeMini",
    "width=340,height=560,resizable=yes,scrollbars=no,toolbar=no,menubar=no,location=no,status=no");
  if (!p) showToast("Allow popups to use Mini Mode!");
}

let toastTimeout;
function showToast(msg) {
  const toast = document.getElementById("toast"); if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(()=>toast.classList.remove("show"), 2600);
}

// ============================================================
// ██████████  GO
// ============================================================
init();
