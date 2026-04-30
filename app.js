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
// Replace src values with your friends' face image paths.
// Upload the images to an /icons/ folder in your GitHub repo.
// e.g. "icons/alice.png"  — fallback emoji shown if image 404s
// ============================================================
const CURSOR_AVATARS = [
  { id:"c1", src:"icons/face1.png", fallback:"😀" },
  { id:"c2", src:"icons/face2.png", fallback:"😎" },
  { id:"c3", src:"icons/face3.png", fallback:"🤩" },
  { id:"c4", src:"icons/face4.png", fallback:"😤" },
];

// ============================================================
// 📋 DEFAULT TASKS
// icon: emoji or image path/URL
// ============================================================
const DEFAULT_TASKS = [
  { id:"task_01", label:"Lorem ipsum dolor sit amet consectetur",      icon:"🔥", tooltip:"", difficulty:"medium", checked:false, timerMs:0, timerRunning:false, timerStartedAt:null },
  { id:"task_12", label:"Nemo enim ipsam voluptatem quia voluptas",     icon:"📵", tooltip:"", difficulty:"medium", checked:false, timerMs:0, timerRunning:false, timerStartedAt:null },
];



// Difficulty config
const DIFF = {
  easy:   { label:"Easy",   color:"#48c774", bg:"rgba(72,199,116,0.13)"  },
// ============================================================
// DOM REFS
// ============================================================
const timerDisplay  = document.getElementById("timer-display");
const timerSubline  = document.getElementById("timer-subline");
const taskList      = document.getElementById("task-list");
const progressText  = document.getElementById("progress-text");
const progressFill  = document.getElementById("progress-fill");
const loadingEl     = document.getElementById("loading");
const tooltipEl     = document.getElementById("tooltip");

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
let pinnedTaskId      = null;          // currently pinned task ID (from Firestore)
let selectedAvatarId  = localStorage.getItem("wc_avatar") || null;
let cursorUpdateTimer = null;
let remoteCursorEls   = {};            // map deviceId → DOM element
let claimedAvatars    = {};            // map avatarId → deviceId (from Firestore)
let cursorSize        = parseInt(localStorage.getItem("wc_cursor_size") || "40", 10);
let cursorOpacity     = parseFloat(localStorage.getItem("wc_cursor_opacity") || "1");

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
}

function startApp() {
  if (IS_ADMIN) { listenToSettings(); injectCursorAppearanceControls(); }
  else          { listenToLaunchGate(); listenToCursorAppearanceSettings(); }



  listenToTasks();
  listenToTimer();
  startTaskTick();
  initViewerCount();

  injectViewerCountPill();
  injectDarkModeToggle();
  initSoundToggle();
  initCursorAvatars();
  listenToRemoteCursors();

  setTimeout(() => { if (loadingEl) loadingEl.classList.add("hidden"); }, 1000);
}

// Viewers: listen for admin cursor size/opacity changes
function listenToCursorAppearanceSettings() {
  db.doc(SETTINGS_DOC).onSnapshot(snap=>{
    if(!snap.exists) return;
    const {cursorSize:cs,cursorOpacity:co}=snap.data();
    if(cs!==undefined && cs!==cursorSize){ cursorSize=cs; updateCursorStyles(); }
    if(co!==undefined && co!==cursorOpacity){ cursorOpacity=co; updateCursorStyles(); }
  });
}

// ============================================================
// ██  CSS  (all feature styles injected once)
// ============================================================
function injectFeatureStyles() {
  if (document.getElementById("wc-feature-styles")) return;
  const el = document.createElement("style");
  el.id = "wc-feature-styles";
  el.textContent = `

    /* ── Viewer count pill ── */
    .vc-pill {
      display:inline-flex;align-items:center;gap:6px;
      background:var(--surface2);border:1px solid var(--border);
      border-radius:99px;padding:5px 14px;
      font-size:0.75rem;color:var(--text-muted);
      letter-spacing:0.06em;margin-top:6px;
    }
    .vc-num {
      font-family:'Bebas Neue',sans-serif;
      font-size:1rem;color:var(--accent);letter-spacing:0.08em;
    }

    /* ── Difficulty badge ── */
    .diff-badge {
      display:inline-flex;align-items:center;
      font-size:0.6rem;font-weight:700;letter-spacing:0.1em;
      text-transform:uppercase;padding:2px 7px;
      border-radius:99px;border:1px solid;flex-shrink:0;line-height:1.4;
    }

    /* ── Pin button on task rows ── */
    .pin-btn {
      background:none;border:none;cursor:pointer;
      font-size:0.85rem;padding:2px 4px;border-radius:5px;
      color:var(--text-muted);opacity:0.4;transition:opacity 0.15s,transform 0.15s;
      flex-shrink:0;line-height:1;
    }
    .pin-btn:hover        { opacity:1;transform:scale(1.2); }
    .pin-btn.pinned       { opacity:1;color:var(--accent);transform:rotate(-30deg); }

    /* ── Pinned task card ── */
    #pinned-task-card {
      width:100%;max-width:600px;
      background:var(--surface);
      border:2px solid var(--accent);
      border-radius:16px;
      padding:20px 22px;
      margin:10px 0;
      box-shadow:0 0 32px rgba(240,192,64,0.18), 0 4px 24px rgba(0,0,0,0.5);
      display:flex;flex-direction:column;gap:14px;
      position:relative;overflow:hidden;
      z-index:1;
      animation:pinnedPop 0.35s cubic-bezier(0.34,1.56,0.64,1);
    }
    @keyframes pinnedPop {
      from { transform:scale(0.9);opacity:0; }
      to   { transform:scale(1);opacity:1; }
    }
    #pinned-task-card::before {
      content:'';position:absolute;top:0;left:0;right:0;height:3px;
      background:linear-gradient(90deg,var(--accent),var(--accent2));
    }
    .pinned-label {
      font-size:0.65rem;letter-spacing:0.2em;text-transform:uppercase;
      color:var(--accent);display:flex;align-items:center;gap:6px;
    }
    .pinned-body {
      display:flex;align-items:center;gap:16px;
    }
    .pinned-icon {
      font-size:2.8rem;line-height:1;flex-shrink:0;
    }
    .pinned-icon img {
      width:52px;height:52px;object-fit:contain;border-radius:8px;
    }
    .pinned-info { flex:1;min-width:0; }
    .pinned-task-label {
      font-family:'Bebas Neue',sans-serif;
      font-size:clamp(1.1rem,3vw,1.6rem);
      letter-spacing:0.06em;line-height:1.2;
      margin-bottom:6px;
    }
    .pinned-task-label.checked-label {
      text-decoration:line-through;color:var(--text-muted);
    }
    .pinned-timer-row {
      display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:4px;
    }
    .pinned-timer-val {
      font-family:'Bebas Neue',sans-serif;
      font-size:1.6rem;letter-spacing:0.08em;color:var(--success);
    }
    .pinned-unpin-btn {
      position:absolute;top:14px;right:14px;
      background:var(--surface2);border:1px solid var(--border);
      color:var(--text-muted);border-radius:8px;padding:5px 10px;
      font-size:0.75rem;cursor:pointer;transition:all 0.15s;
    }
    .pinned-unpin-btn:hover { border-color:var(--accent);color:var(--accent); }

    /* ── Dark/light mode ── */
    body.light-mode {
      --bg:#f0f2f5;--surface:#ffffff;--surface2:#e8ecf2;
      --border:#d0d8e4;--text:#1a1f2e;--text-muted:#6070a0;
      background:var(--bg);
    }
    body.light-mode #bg-canvas { opacity:0.15; }
    body.light-mode .total-time-card,
    body.light-mode .admin-controls { box-shadow:0 2px 12px rgba(0,0,0,0.08); }
    #darkmode-toggle {
      background:var(--surface2);border:1px solid var(--border);
      color:var(--text-muted);font-family:'DM Sans',sans-serif;
      font-size:0.75rem;padding:6px 12px;border-radius:8px;
      cursor:pointer;transition:all 0.15s;display:flex;align-items:center;gap:6px;
    }
    #darkmode-toggle:hover { border-color:var(--accent);color:var(--accent); }

    /* ── Sound toggle ── */
    #sound-toggle {
      background:var(--surface2);border:1px solid var(--border);
      color:var(--text-muted);font-family:'DM Sans',sans-serif;
      font-size:0.75rem;padding:6px 12px;border-radius:8px;
      cursor:pointer;transition:all 0.15s;display:flex;align-items:center;gap:6px;
    }
    #sound-toggle:hover { border-color:var(--accent);color:var(--accent); }

    /* ── Cursor avatar picker (top-right) ── */
    #cursor-picker {
      position:fixed;top:16px;right:16px;
      z-index:750;
      display:flex;flex-direction:column;align-items:flex-end;gap:6px;
    }
    .cursor-picker-label {
      font-size:0.6rem;color:var(--text-muted);letter-spacing:0.12em;
      text-transform:uppercase;
    }
    .cursor-picker-row { display:flex;gap:6px; }
    .avatar-btn {
      width:44px;height:44px;border-radius:8px;
      border:2px solid var(--border);
      background:transparent;
      cursor:pointer;overflow:hidden;
      display:flex;align-items:center;justify-content:center;
      font-size:1.2rem;
      transition:border-color 0.2s, box-shadow 0.2s, transform 0.15s, opacity 0.2s;
      position:relative;
    }
    .avatar-btn img { width:100%;height:100%;object-fit:contain; }
    .avatar-btn:hover:not(.locked)  { border-color:var(--accent);transform:scale(1.1); }
    .avatar-btn.selected {
      border-color:var(--accent);
      box-shadow:0 0 10px rgba(240,192,64,0.7), 0 0 22px rgba(240,192,64,0.3);
      transform:scale(1.08);
    }
    .avatar-btn.locked {
      opacity:0.35;cursor:not-allowed;
      border-color:var(--border);
    }
    .avatar-btn.locked::after {
      content:'🔒';
      position:absolute;bottom:-2px;right:-2px;
      font-size:0.6rem;line-height:1;
      background:var(--surface);border-radius:4px;padding:1px 2px;
    }

    /* ── Local cursor follow ── */
    #local-cursor {
      position:fixed;pointer-events:none;z-index:740;
      transform:translate(10px,10px);
      font-size:1.6rem;line-height:1;
      display:none; /* shown once avatar is selected */
    }
    #local-cursor img {
      object-fit:contain;
      /* no border-radius — use natural PNG shape */
    }

    /* ── Remote cursors ── */
    .remote-cursor {
      position:fixed;pointer-events:none;z-index:730;
      display:flex;flex-direction:column;align-items:center;
      transform:translate(-50%,-50%);
      transition:left 0.12s linear, top 0.12s linear;
    }
    .remote-cursor-avatar {
      object-fit:contain;font-size:1.3rem;
      line-height:1;text-align:center;
      background:transparent;
      /* no border, no border-radius — use natural PNG shape */
    }
    .remote-cursor-dot {
      width:6px;height:6px;background:var(--accent);
      border-radius:50%;margin-top:2px;opacity:0.7;
    }


    /* ── Icon confetti particles ── */
    .icon-particle {
      position:fixed;pointer-events:none;z-index:500;
      will-change:transform;line-height:1;
    }

    /* ── Shatter tiles (epic launch reveal) ── */
    #shatter-container {
      position:fixed;inset:0;z-index:992;pointer-events:none;
    }
    .shatter-tile {
      position:absolute;
      background:var(--bg);
      will-change:transform,opacity;
    }
    #shatter-flash {
      position:fixed;inset:0;z-index:993;pointer-events:none;
      background:white;opacity:0;
    }

    /* ── Task editor difficulty select ── */
    .task-editor-diff-select {
      background:var(--surface2);border:1px solid var(--border);
      color:var(--text);font-family:'DM Sans',sans-serif;
      font-size:0.78rem;padding:5px 8px;border-radius:7px;
      outline:none;cursor:pointer;width:100%;
    }
    .task-editor-diff-select:focus { border-color:var(--accent); }

    /* ── Cinematic fade (fallback) ── */
    #launch-overlay { transition:opacity 0.6s; }
    #launch-overlay.fade-out { opacity:0;pointer-events:none; }
  `;
  document.head.appendChild(el);
}

// ============================================================
// ██  BACKGROUND STARS
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

// ============================================================
// ██  ICON CONFETTI
// Spawns the task's own icon(s) as confetti instead of shapes.
// icons = array of icon strings (emoji or image paths)
// big   = true for all-tasks celebration
// ============================================================
function isImageIcon(icon) {
  return icon && (
    icon.includes("/") ||
    /\.(png|jpg|gif|webp|svg)$/i.test(icon) ||
    icon.startsWith("http")
  );
}

function launchIconConfetti(icons, big=false) {
  if(!icons||!icons.length) return;
  const count    = big ? 110 : 48;
  const maxLife  = big ? 210 : 150;
  const particles= [];

  for(let i=0;i<count;i++){
    const icon = icons[Math.floor(Math.random()*icons.length)];
    const size  = big ? 1.1+Math.random()*1.0 : 0.9+Math.random()*0.7; // rem
    const px    = Math.random()*window.innerWidth;
    const el    = document.createElement("div");
    el.className = "icon-particle";
    el.style.cssText = `font-size:${size}rem;left:0;top:0;`;

    if(isImageIcon(icon)){
      const img = document.createElement("img");
      img.src = icon;
      img.style.cssText=`width:${Math.round(size*18)}px;height:${Math.round(size*18)}px;object-fit:contain;border-radius:3px;`;
      el.appendChild(img);
    } else {
      el.textContent = icon;
    }

    document.body.appendChild(el);

    particles.push({
      el,
      x:  px,
      y:  -30 - Math.random()*60,
      vx: (Math.random()-0.5)*5,
      vy: 1.8 + Math.random()*3.5,
      rot:  Math.random()*360,
      vrot: (Math.random()-0.5)*10,
      opacity: 1,
      life: Math.floor(Math.random()*30),   // stagger start
    });
  }

  function tick() {
    let alive = false;
    for(const p of particles){
      if(p.life<0){p.life++;continue;}
      p.x  +=p.vx;
      p.y  +=p.vy;
      p.vy *=1.008;
      p.rot+=p.vrot;
      p.life++;
      if(p.life>maxLife*0.65) p.opacity=Math.max(0,p.opacity-0.03);
      if(p.life<maxLife){
        p.el.style.transform=`translate(${p.x}px,${p.y}px) rotate(${p.rot}deg)`;
        p.el.style.opacity=p.opacity;
        alive=true;
      } else {
        p.el.remove();
      }
    }
    if(alive) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ============================================================
// ██  SOUND ENGINE




// ============================================================
function unlockAudioOnGesture() {
  const unlock = () => {
    if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==="suspended") audioCtx.resume();


  };
  document.addEventListener("click",   unlock, {once:true});
  document.addEventListener("touchend",unlock, {once:true});
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
function playTick()       { playTone(880,"sine",0.12,0.25); }
function playTimerStart() { playTone(660,"triangle",0.09,0.14); }
function playTimerStop()  { playTone(330,"triangle",0.09,0.14); }
function playFanfare()    { [523,659,784,1047].forEach((f,i)=>playTone(f,"triangle",0.35,0.26,i*0.13)); }

function playBoom() {
  // Deep bass boom + noise crack for the shatter reveal
  if(!soundEnabled) return;
  try{
    const ac = getAudioCtx();
    // Bass thud
    const osc=ac.createOscillator(),g=ac.createGain(),filt=ac.createBiquadFilter();
    osc.type="sawtooth";filt.type="lowpass";filt.frequency.value=180;
    osc.connect(filt);filt.connect(g);g.connect(ac.destination);
    osc.frequency.setValueAtTime(90,ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(22,ac.currentTime+0.55);
    g.gain.setValueAtTime(0.55,ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+0.6);
    osc.start(ac.currentTime);osc.stop(ac.currentTime+0.65);
    // Crack noise
    const sr=ac.sampleRate,buf=ac.createBuffer(1,Math.floor(sr*0.12),sr);
    const d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2);
    const ns=ac.createBufferSource(),ng=ac.createGain();
    ns.buffer=buf;ng.gain.setValueAtTime(0.35,ac.currentTime);
    ng.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+0.12);
    ns.connect(ng);ng.connect(ac.destination);ns.start(ac.currentTime);
    // Rising whistle before boom
    const w=ac.createOscillator(),wg=ac.createGain();
    w.type="sine";w.connect(wg);wg.connect(ac.destination);
    w.frequency.setValueAtTime(200,ac.currentTime-0.25);
    w.frequency.exponentialRampToValueAtTime(1200,ac.currentTime);
    wg.gain.setValueAtTime(0.12,ac.currentTime-0.25);
    wg.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+0.05);
    w.start(ac.currentTime-0.25);w.stop(ac.currentTime+0.1);
  }catch(e){}
}

// ============================================================
// ██  DARK MODE
// ============================================================


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
  btn.id="darkmode-toggle";btn.className="btn-mini";
  btn.onclick=toggleDarkMode;
  bar.insertBefore(btn,bar.firstChild);
  applyTheme();
}

// ============================================================
// ██  SOUND TOGGLE
// ============================================================
function initSoundToggle() {
  const bar=document.querySelector(".status-bar");
  if(!bar||document.getElementById("sound-toggle")) return;
  const btn=document.createElement("button");
  btn.id="sound-toggle";btn.className="btn-mini";
  btn.textContent=soundEnabled?"🔊 Sound":"🔇 Sound";
  btn.onclick=()=>{
    soundEnabled=!soundEnabled;
    localStorage.setItem("wc_sound",soundEnabled?"on":"off");
    btn.textContent=soundEnabled?"🔊 Sound":"🔇 Sound";
    if(soundEnabled) playTick();
  };
  bar.appendChild(btn);
}

// ============================================================
// ██  LIVE VIEWER COUNT



// ============================================================
function initViewerCount() {
  let deviceId=localStorage.getItem("wc_device_id");
  if(!deviceId){ deviceId="d_"+Math.random().toString(36).slice(2)+Date.now(); localStorage.setItem("wc_device_id",deviceId); }
  const ref=db.collection("presence").doc(deviceId);
  async function hb(){ try{ await ref.set({lastSeen:Date.now()}); }catch(e){} }
  hb();
  const iv=setInterval(hb,25000);
  window.addEventListener("beforeunload",()=>{ clearInterval(iv); ref.delete().catch(()=>{}); });
  db.collection("presence").onSnapshot(snap=>{
    const now=Date.now();
    const count=snap.docs.filter(d=>(now-(d.data().lastSeen||0))<60000).length;
    const el=document.getElementById("vc-num");
    if(el) el.textContent=count;
  });
  setTimeout(async()=>{
    try{
      const s=await db.collection("presence").get();
      s.docs.forEach(d=>{ if((Date.now()-(d.data().lastSeen||0))>120000) d.ref.delete().catch(()=>{}); });
    }catch(e){}
  },10000);
}
function injectViewerCountPill() {
  const header=document.querySelector("header");
  if(!header||document.querySelector(".vc-pill")) return;
  const pill=document.createElement("div");
  pill.className="vc-pill";
  pill.innerHTML=`<span class="pulse-dot"></span><span id="vc-num" class="vc-num">--</span><span>watching</span>`;
  header.appendChild(pill);
}

// ============================================================
// ██  CURSOR AVATARS
// ============================================================
function initCursorAvatars() {
  const myDeviceId = localStorage.getItem("wc_device_id") || "";

  // Inject picker UI
  const picker = document.createElement("div");
  picker.id = "cursor-picker";
  picker.innerHTML = `
    <span class="cursor-picker-label">Your cursor</span>
    <div class="cursor-picker-row" id="avatar-btn-row">
      ${CURSOR_AVATARS.map(av=>`
        <button class="avatar-btn${selectedAvatarId===av.id?" selected":""}"
                data-id="${av.id}"
                onclick="selectAvatar('${av.id}')"
                title="${av.fallback}">
          <img src="${av.src}" alt="${av.fallback}"
               onerror="this.style.display='none';this.parentNode.textContent='${av.fallback}'"/>
        </button>
      `).join("")}
    </div>
  `;
  document.body.appendChild(picker);

  // Local cursor follow element
  const localEl = document.createElement("div");
  localEl.id = "local-cursor";
  document.body.appendChild(localEl);

  // Apply saved avatar
  if(selectedAvatarId) applyLocalAvatar(selectedAvatarId);

  // Listen to avatar claims from Firestore
  db.collection("avatarClaims").onSnapshot(snap=>{
    claimedAvatars = {};
    snap.docs.forEach(doc=>{ claimedAvatars[doc.id] = doc.data().deviceId; });
    refreshAvatarPickerLocks(myDeviceId);
  });

  // Mousemove → move local cursor + throttled Firestore update
  document.addEventListener("mousemove", e=>{
    const lc = document.getElementById("local-cursor");
    if(lc) { lc.style.left=e.clientX+"px"; lc.style.top=e.clientY+"px"; }
    if(!selectedAvatarId) return;
    clearTimeout(cursorUpdateTimer);
    cursorUpdateTimer = setTimeout(()=>uploadCursorPos(e.clientX,e.clientY), 80);
  });

  // Remove cursor doc on unload
  window.addEventListener("beforeunload",()=>removeCursorDoc());
}

function refreshAvatarPickerLocks(myDeviceId) {
  document.querySelectorAll(".avatar-btn").forEach(btn=>{
    const id = btn.dataset.id;
    const claimedBy = claimedAvatars[id];
    const isMine = claimedBy === myDeviceId;
    const isTaken = claimedBy && !isMine;
    btn.classList.toggle("locked", isTaken);
    btn.disabled = isTaken;
    if(isTaken) btn.title = "Already taken by another player";
    else {
      const av = CURSOR_AVATARS.find(a=>a.id===id);
      if(av) btn.title = av.fallback;
    }
  });
}

async function selectAvatar(id) {
  const myDeviceId = localStorage.getItem("wc_device_id") || "";
  const claimedBy = claimedAvatars[id];

  // If taken by someone else, bail
  if(claimedBy && claimedBy !== myDeviceId) {
    showToast("🔒 That face is already taken!");
    return;
  }

  // If re-selecting the same avatar, unselect/unclaim it
  if(selectedAvatarId === id) {
    try { await db.collection("avatarClaims").doc(id).delete(); } catch(e){}
    selectedAvatarId = null;
    localStorage.removeItem("wc_avatar");
    document.querySelectorAll(".avatar-btn").forEach(btn=>btn.classList.remove("selected"));
    const lc = document.getElementById("local-cursor");
    if(lc) lc.style.display="none";
    return;
  }

  // Release old claim if switching
  if(selectedAvatarId) {
    try { await db.collection("avatarClaims").doc(selectedAvatarId).delete(); } catch(e){}
  }

  // Claim new avatar
  try {
    await db.collection("avatarClaims").doc(id).set({ deviceId: myDeviceId });
  } catch(e) {}

  selectedAvatarId = id;
  localStorage.setItem("wc_avatar", id);
  document.querySelectorAll(".avatar-btn").forEach(btn=>{
    btn.classList.toggle("selected", btn.dataset.id===id);
  });
  applyLocalAvatar(id);
}

function applyLocalAvatar(id) {
  const av  = CURSOR_AVATARS.find(a=>a.id===id);
  const lc  = document.getElementById("local-cursor");
  if(!av||!lc) return;
  lc.style.display="block";
  lc.innerHTML=`<img src="${av.src}" alt="${av.fallback}"
    onerror="this.style.display='none';this.parentNode.textContent='${av.fallback}'"
    style="width:${cursorSize}px;height:${cursorSize}px;object-fit:contain;opacity:${cursorOpacity};">`;
}

function updateCursorStyles() {
  // Update local cursor
  const lc = document.getElementById("local-cursor");
  if(lc) {
    const img = lc.querySelector("img");
    if(img) { img.style.width=cursorSize+"px"; img.style.height=cursorSize+"px"; img.style.opacity=cursorOpacity; }
  }
  // Update remote cursors
  document.querySelectorAll(".remote-cursor-avatar").forEach(el=>{
    if(el.tagName==="IMG") { el.style.width=cursorSize+"px"; el.style.height=cursorSize+"px"; el.style.opacity=cursorOpacity; }
  });
}

async function uploadCursorPos(cx,cy) {
  if(!selectedAvatarId) return;
  let deviceId=localStorage.getItem("wc_device_id");
  if(!deviceId) return;
  try{
    await db.collection("cursors").doc(deviceId).set({
      avatar: selectedAvatarId,
      x: cx/window.innerWidth,
      y: cy/window.innerHeight,
      lastSeen: Date.now()
    });
  }catch(e){}
}

async function removeCursorDoc() {
  const deviceId=localStorage.getItem("wc_device_id");
  if(!deviceId) return;
  try{ await db.collection("cursors").doc(deviceId).delete(); }catch(e){}
  // Also release avatar claim
  if(selectedAvatarId) {
    try{ await db.collection("avatarClaims").doc(selectedAvatarId).delete(); }catch(e){}
  }
}

function listenToRemoteCursors() {
  const myDeviceId=localStorage.getItem("wc_device_id")||"";
  db.collection("cursors").onSnapshot(snap=>{
    const now=Date.now();
    const active=new Set();

    snap.docs.forEach(doc=>{
      const id=doc.id;
      if(id===myDeviceId) return;          // skip own cursor
      const {avatar,x,y,lastSeen}=doc.data();
      if(!avatar||(now-lastSeen)>12000) return;  // stale — hide it
      active.add(id);

      let el=remoteCursorEls[id];
      if(!el){
        el=document.createElement("div");
        el.className="remote-cursor";
        const av=CURSOR_AVATARS.find(a=>a.id===avatar);
        const fb=av?av.fallback:"👤";
        const src=av?av.src:"";
        el.innerHTML=`
          <img class="remote-cursor-avatar" src="${src}" alt="${fb}"
               style="width:${cursorSize}px;height:${cursorSize}px;opacity:${cursorOpacity};"
               onerror="this.style.display='none';this.parentNode.insertBefore(
                 Object.assign(document.createElement('span'),{className:'remote-cursor-avatar',textContent:'${fb}'}),this)">
          <div class="remote-cursor-dot"></div>
        `;
        document.body.appendChild(el);
        remoteCursorEls[id]=el;
      }
      // Position (normalized → px)
      el.style.left=(x*window.innerWidth)+"px";
      el.style.top =(y*window.innerHeight)+"px";
    });

    // Remove elements for cursors that left
    Object.keys(remoteCursorEls).forEach(id=>{
      if(!active.has(id)){
        remoteCursorEls[id].remove();
        delete remoteCursorEls[id];
      }
    });
  });
}

// ============================================================
// ██  ADMIN PASSWORD GATE
// ============================================================
function checkAdminPassword() {
  const input=document.getElementById("pw-input");
  const error=document.getElementById("pw-error");
  if(!input) return;
  if(input.value===ADMIN_PASSWORD){
    sessionStorage.setItem("adminUnlocked","yes");
    showAdminContent();
    startApp();
  } else {
    error.textContent="❌ Wrong password, try again";
    input.value="";input.focus();
    const card=document.querySelector(".pw-card");
    if(card){card.classList.add("shake");setTimeout(()=>card.classList.remove("shake"),500);}
  }
}

function showAdminContent() {
  const gate=document.getElementById("password-gate");
  const content=document.getElementById("admin-content");
  if(gate)    gate.style.display="none";
  if(content) content.style.display="flex";
}

// ============================================================
// ██  LAUNCH GATE  (viewer)
// ============================================================
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
  if(launchCdInterval) clearInterval(launchCdInterval);
  function tick(){
    const rem=launchMs-Date.now();
    if(rem<=0){clearInterval(launchCdInterval);triggerShatterReveal();return;}
    const d=Math.floor(rem/86400000),h=Math.floor((rem%86400000)/3600000),
          m=Math.floor((rem%3600000)/60000),s=Math.floor((rem%60000)/1000);
    const pad=n=>String(n).padStart(2,"0");
    const q=id=>document.getElementById(id);
    if(q("cd-days"))  q("cd-days").textContent =pad(d);
    if(q("cd-hours")) q("cd-hours").textContent=pad(h);
    if(q("cd-mins"))  q("cd-mins").textContent =pad(m);
    if(q("cd-secs"))  q("cd-secs").textContent =pad(s);
  }
  tick();
  launchCdInterval=setInterval(tick,1000);
}

function checkViewerPassword() {
  const input=document.getElementById("viewer-pw-input");
  const error=document.getElementById("viewer-pw-error");
  if(!input) return;
  if(!window._viewerPassword){error.textContent="No early-access password set.";return;}
  if(input.value===window._viewerPassword){
    sessionStorage.setItem("viewerUnlocked","yes");
    triggerShatterReveal();



  } else {
    error.textContent="❌ Wrong password";
    input.value="";input.focus();
    const card=document.querySelector(".launch-card");
    if(card){card.classList.add("shake");setTimeout(()=>card.classList.remove("shake"),500);}
  }
}

// ============================================================
// ██  EPIC SHATTER REVEAL
// The launch overlay explodes into tiles that fly apart,
// revealing the site underneath with a flash and boom.
// ============================================================
function triggerShatterReveal() {
  if(launchCdInterval) clearInterval(launchCdInterval);
  const overlay=document.getElementById("launch-overlay");
  if(!overlay) return;

  // Immediately hide the real overlay so site is visible underneath
  overlay.style.display="none";

  const W=window.innerWidth, H=window.innerHeight;
  const cols=7, rows=10;
  const tW=Math.ceil(W/cols), tH=Math.ceil(H/rows);
  const cx=W/2, cy=H/2;

  // Flash element
  const flash=document.createElement("div");
  flash.id="shatter-flash";
  document.body.appendChild(flash);

  // Tile container
  const container=document.createElement("div");
  container.id="shatter-container";
  document.body.appendChild(container);

  // Build tiles
  const tiles=[];
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      const tile=document.createElement("div");
      tile.className="shatter-tile";
      tile.style.cssText=`
        left:${c*tW}px;top:${r*tH}px;
        width:${tW+1}px;height:${tH+1}px;
        transform-origin:center center;
      `;
      // Direction vector from center
      const dx=(c+0.5)/cols-0.5;
      const dy=(r+0.5)/rows-0.5;
      const dist=500+Math.random()*600;
      const rot=(Math.random()-0.5)*160;
      const delay=Math.random()*0.12;
      tile._tx=dx*dist*2+(Math.random()-0.5)*80;
      tile._ty=dy*dist*2+(Math.random()-0.5)*80;
      tile._rot=rot;
      tile._delay=delay;
      container.appendChild(tile);
      tiles.push(tile);
    }
  }

  // Play boom sound
  playBoom();

  // Step 1: Flash white (100ms)
  flash.style.transition="opacity 0.08s";
  requestAnimationFrame(()=>{
    flash.style.opacity="0.85";
    setTimeout(()=>{
      flash.style.transition="opacity 0.35s";
      flash.style.opacity="0";
      setTimeout(()=>flash.remove(),400);
    },90);
  });

  // Step 2: Explode tiles outward with staggered delay
  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      tiles.forEach(tile=>{
        tile.style.transition=`
          transform ${0.55+Math.random()*0.3}s cubic-bezier(0.25,0.46,0.45,0.94) ${tile._delay}s,
          opacity   0.3s ease ${0.25+tile._delay}s
        `;
        tile.style.transform=`translate3d(${tile._tx}px,${tile._ty}px,0) rotate(${tile._rot}deg) scale(0.4)`;
        tile.style.opacity="0";
      });
    });
  });

  // Step 3: Clean up container after animation
  setTimeout(()=>container.remove(), 1100);
}

function hideLaunchOverlay() {
  const overlay=document.getElementById("launch-overlay");
  if(launchCdInterval) clearInterval(launchCdInterval);
  if(!overlay) return;
  overlay.classList.add("fade-out");
  setTimeout(()=>overlay.style.display="none",650);
}

// ============================================================
// ██  SETTINGS  (admin)
// ============================================================
function listenToSettings() {
  db.doc(SETTINGS_DOC).onSnapshot(snap=>{
    if(!snap.exists) return;
    const {launchMs,viewerPassword,pinnedTaskId:pid,cursorSize:cs,cursorOpacity:co}=snap.data();
    const li=document.getElementById("launch-date-input");
    if(li&&launchMs){
      const d=new Date(launchMs);
      li.value=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
    }
    const vp=document.getElementById("viewer-pw-set");
    if(vp&&viewerPassword!==undefined) vp.value=viewerPassword;
    const st=document.getElementById("launch-date-status");
    if(st){
      if(launchMs){
        const d=new Date(launchMs);
        if(Date.now()>=launchMs){st.textContent=`✅ Site is LIVE — launched ${d.toLocaleString()}`;st.style.color="var(--success)";}
        else{st.textContent=`⏳ Countdown active — opens ${d.toLocaleString()}`;st.style.color="var(--accent)";}
      }else{st.textContent="No launch date set — site is publicly visible.";st.style.color="var(--text-muted)";}
    }
    // Pinned task from settings
    if(pid!==undefined) pinnedTaskId=pid||null;
    if(currentTasks.length) renderPinnedTask();

    // Sync cursor appearance to admin sliders (don't override while dragging)
    if(cs!==undefined && cs!==cursorSize){
      cursorSize=cs;
      const sl=document.getElementById("cursor-size-slider");
      const lb=document.getElementById("cursor-size-val");
      if(sl) sl.value=cs;
      if(lb) lb.textContent=cs+"px";
      updateCursorStyles();
    }
    if(co!==undefined && co!==cursorOpacity){
      cursorOpacity=co;
      const sl=document.getElementById("cursor-opacity-slider");
      const lb=document.getElementById("cursor-opacity-val");
      if(sl) sl.value=Math.round(co*100);
      if(lb) lb.textContent=Math.round(co*100)+"%";
      updateCursorStyles();
    }
  });
}

async function saveLaunchDate(){
  const input=document.getElementById("launch-date-input");
  if(!input||!input.value){showToast("⚠️ Pick a date first");return;}
  await db.doc(SETTINGS_DOC).set({launchMs:new Date(input.value).getTime()},{merge:true});
  showToast("📅 Launch date saved!");
}
async function clearLaunchDate(){
  if(!confirm("Remove the countdown? The site will be visible to everyone immediately.")) return;
  await db.doc(SETTINGS_DOC).set({launchMs:null},{merge:true});
  document.getElementById("launch-date-input").value="";

  showToast("✅ Countdown removed");
}
async function saveViewerPassword(){
  const input=document.getElementById("viewer-pw-set");
  const pw=input?input.value.trim():"";
  await db.doc(SETTINGS_DOC).set({viewerPassword:pw},{merge:true});
  const st=document.getElementById("viewer-pw-status");
  if(st){st.textContent=pw?`✅ Password set to "${pw}"`:"✅ Password cleared";st.style.color="var(--success)";}

  showToast("🔓 Viewer password saved!");
}

// ============================================================
// ██  ADMIN — CURSOR APPEARANCE SLIDERS
// ============================================================
function injectCursorAppearanceControls() {
  // Only inject once, only on admin page
  if(!IS_ADMIN) return;
  if(document.getElementById("cursor-appearance-controls")) return;

  // Find a good insertion point: after the admin-controls section or append to admin-content
  const adminContent = document.getElementById("admin-content");
  if(!adminContent) return;

  const section = document.createElement("div");
  section.id = "cursor-appearance-controls";
  section.className = "admin-controls";
  section.style.cssText = "margin-top:16px;";
  section.innerHTML = `
    <div class="admin-section-title" style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
      🖱️ <span style="font-family:'Bebas Neue',sans-serif;font-size:1.1rem;letter-spacing:0.08em;">Cursor Icon Appearance</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:14px;">
      <div style="display:flex;align-items:center;gap:14px;">
        <label style="font-size:0.78rem;color:var(--text-muted);min-width:70px;">Size</label>
        <input id="cursor-size-slider" type="range" min="20" max="100" value="${cursorSize}"
               style="flex:1;accent-color:var(--accent);"
               oninput="onCursorSizeChange(this.value)">
        <span id="cursor-size-val" style="font-family:'Bebas Neue',sans-serif;font-size:1rem;color:var(--accent);min-width:36px;text-align:right;">${cursorSize}px</span>
      </div>
      <div style="display:flex;align-items:center;gap:14px;">
        <label style="font-size:0.78rem;color:var(--text-muted);min-width:70px;">Opacity</label>
        <input id="cursor-opacity-slider" type="range" min="10" max="100" value="${Math.round(cursorOpacity*100)}"
               style="flex:1;accent-color:var(--accent);"
               oninput="onCursorOpacityChange(this.value)">
        <span id="cursor-opacity-val" style="font-family:'Bebas Neue',sans-serif;font-size:1rem;color:var(--accent);min-width:36px;text-align:right;">${Math.round(cursorOpacity*100)}%</span>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;">
        ${CURSOR_AVATARS.map(av=>`
          <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
            <img src="${av.src}" style="width:${cursorSize}px;height:${cursorSize}px;object-fit:contain;opacity:${cursorOpacity};" id="cursor-preview-${av.id}"
                 onerror="this.textContent='${av.fallback}'">
            <span style="font-size:0.6rem;color:var(--text-muted);">${av.fallback}</span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
  adminContent.appendChild(section);
}

function onCursorSizeChange(val) {
  cursorSize = parseInt(val, 10);
  localStorage.setItem("wc_cursor_size", cursorSize);
  const lbl = document.getElementById("cursor-size-val");
  if(lbl) lbl.textContent = cursorSize+"px";
  updateCursorStyles();
  // Update previews in admin panel
  CURSOR_AVATARS.forEach(av=>{
    const el = document.getElementById("cursor-preview-"+av.id);
    if(el) { el.style.width=cursorSize+"px"; el.style.height=cursorSize+"px"; }
  });
  // Sync to Firestore so all viewers pick it up
  db.doc(SETTINGS_DOC).set({cursorSize, cursorOpacity},{merge:true}).catch(()=>{});
}

function onCursorOpacityChange(val) {
  cursorOpacity = parseInt(val, 10) / 100;
  localStorage.setItem("wc_cursor_opacity", cursorOpacity);
  const lbl = document.getElementById("cursor-opacity-val");
  if(lbl) lbl.textContent = Math.round(cursorOpacity*100)+"%";
  updateCursorStyles();
  // Update previews in admin panel
  CURSOR_AVATARS.forEach(av=>{
    const el = document.getElementById("cursor-preview-"+av.id);
    if(el) el.style.opacity = cursorOpacity;
  });
  db.doc(SETTINGS_DOC).set({cursorSize, cursorOpacity},{merge:true}).catch(()=>{});
}

// ============================================================
// ██  TASKS  —  real-time listener
// ============================================================
function listenToTasks(){
  db.doc(TASKS_DOC).onSnapshot(async snap=>{
    let tasks;
    if(!snap.exists){
      tasks=DEFAULT_TASKS;
      await db.doc(TASKS_DOC).set({tasks:DEFAULT_TASKS});
    } else {
      tasks=snap.data().tasks.map(t=>({
        timerMs:0,timerRunning:false,timerStartedAt:null,tooltip:"",difficulty:"",...t


      }));
    }
    currentTasks=tasks;
    renderTasks(tasks);
    renderPinnedTask();
    updateTotalTime(tasks);
    checkCompletionEffects(tasks);
    if(IS_ADMIN) renderTaskEditor(tasks);

    // Also sync pinnedTaskId from Firestore settings (read alongside tasks)
    const snap2=await db.doc(SETTINGS_DOC).get();
    if(snap2.exists){
      pinnedTaskId=snap2.data().pinnedTaskId||null;
      renderPinnedTask();
    }
  },err=>{console.error("Tasks error:",err);showToast("⚠️ Database connection failed");});
}

function startTaskTick(){
  if(taskTickInterval) clearInterval(taskTickInterval);
  taskTickInterval=setInterval(()=>{
    currentTasks.forEach(t=>{
      // Update task row timer
      const el=document.getElementById(`task-timer-${t.id}`);
      if(el) el.textContent=fmtMs(liveMs(t));
      // Update pinned card timer if this is the pinned task
      if(t.id===pinnedTaskId){
        const pel=document.getElementById("pinned-timer-val");
        if(pel) pel.textContent=fmtMs(liveMs(t));
      }
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

function checkCompletionEffects(tasks){
  const checkedIds=new Set(tasks.filter(t=>t.checked).map(t=>t.id));
  const done=checkedIds.size;
  if(prevCheckedCount===-1){prevCheckedCount=done;prevCheckedIds=new Set(checkedIds);return;}
  if(done>prevCheckedCount){
    const newId=[...checkedIds].find(id=>!prevCheckedIds.has(id));
    const newTask=tasks.find(t=>t.id===newId);
    const icon=newTask?(newTask.icon||newTask.emoji||"⭐"):"⭐";
    if(done===tasks.length){
      const allIcons=tasks.map(t=>t.icon||t.emoji||"⭐");
      launchIconConfetti(allIcons,true);
      playFanfare();
      showToast("🏆 ALL TASKS COMPLETE! CHAMPION!");
    } else {
      launchIconConfetti([icon],false);
      playTick();
    }
  }
  prevCheckedCount=done;
  prevCheckedIds=new Set(checkedIds);
}

// ============================================================
// ██  PINNED TASK
// ============================================================
function renderPinnedTask(){
  // Remove existing card
  const existing=document.getElementById("pinned-task-card");
  if(existing) existing.remove();

  if(!pinnedTaskId) return;
  const task=currentTasks.find(t=>t.id===pinnedTaskId);
  if(!task) return;

  const card=document.createElement("div");
  card.id="pinned-task-card";

  const iconHtml=isImageIcon(task.icon||task.emoji)
    ?`<img src="${task.icon||task.emoji}" style="width:52px;height:52px;object-fit:contain;border-radius:8px;">`
    :`<span style="font-size:2.8rem;line-height:1">${task.icon||task.emoji||"⭐"}</span>`;

  const diffD=DIFF[task.difficulty];
  const diffHtml=diffD
    ?`<span class="diff-badge" style="color:${diffD.color};background:${diffD.bg};border-color:${diffD.color}55">${diffD.label}</span>`
    :"";

  card.innerHTML=`
    <button class="pinned-unpin-btn" onclick="unpinTask()">📌 Unpin</button>
    <div class="pinned-label"><span class="pulse-dot"></span> Now Focused</div>
    <div class="pinned-body">
      <div class="pinned-icon">${iconHtml}</div>
      <div class="pinned-info">
        <div class="pinned-task-label${task.checked?" checked-label":""}">${task.label}</div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">${diffHtml}
          ${task.tooltip?`<span style="font-size:0.72rem;color:var(--text-muted)">ℹ️ ${escHtml(task.tooltip)}</span>`:""}
        </div>
        <div class="pinned-timer-row">
          <span class="pinned-timer-val" id="pinned-timer-val">${fmtMs(liveMs(task))}</span>
          <button class="ttbtn ttbtn-start${task.timerRunning?" active":""}"
                  onclick="taskTimerStart(event,'${task.id}')"
                  title="${task.timerRunning?"Stop":"Start"} timer">
            ${task.timerRunning?"⏸":"▶"}
          </button>
          ${IS_ADMIN?`<button class="ttbtn ttbtn-reset" onclick="taskTimerReset(event,'${task.id}')" title="Reset">↺</button>`:""}
          ${IS_ADMIN?`
            <button class="ttbtn" onclick="toggleTask(event,'${task.id}')"
                    style="margin-left:4px;width:auto;padding:0 8px;font-size:0.75rem;">
              ${task.checked?"✓ Done":"○ Mark Done"}
            </button>`:""}
        </div>
      </div>
    </div>
  `;

  // Insert between total-time-card and checklist-card
  const checklist=document.querySelector(".checklist-card");
  if(checklist) checklist.parentNode.insertBefore(card,checklist);
  else {
    const mc=document.getElementById("main-content")||document.getElementById("admin-content");
    if(mc) mc.appendChild(card);
  }
}

async function pinTask(taskId){
  pinnedTaskId=taskId;
  renderPinnedTask();
  try{ await db.doc(SETTINGS_DOC).set({pinnedTaskId:taskId},{merge:true}); }catch(e){}
}













async function unpinTask(){
  pinnedTaskId=null;
  const existing=document.getElementById("pinned-task-card");
  if(existing) existing.remove();
  try{ await db.doc(SETTINGS_DOC).set({pinnedTaskId:null},{merge:true}); }catch(e){}
}

// ============================================================
// ██  RENDER TASK LIST
// ============================================================
function renderIcon(icon){
  if(isImageIcon(icon)) return `<img class="task-img" src="${icon}" alt="icon"/>`;
  return `<span class="task-emoji">${icon||"⭐"}</span>`;
}
function diffBadgeHtml(d){
  const cfg=DIFF[d];if(!cfg)return"";
  return `<span class="diff-badge" style="color:${cfg.color};background:${cfg.bg};border-color:${cfg.color}55">${cfg.label}</span>`;
}
function escHtml(s){return String(s).replace(/"/g,"&quot;").replace(/</g,"&lt;");}

function renderTasks(tasks){
  if(!taskList) return;
  const scrollY=window.scrollY;
  taskList.innerHTML="";

  const hasDiff=tasks.some(t=>t.difficulty);
  const totalW=tasks.reduce((s,t)=>s+(DIFF_WEIGHT[t.difficulty]||1),0);
  const doneW=tasks.filter(t=>t.checked).reduce((s,t)=>s+(DIFF_WEIGHT[t.difficulty]||1),0);
  const doneCount=tasks.filter(t=>t.checked).length;
  if(progressText) progressText.textContent=`${doneCount} / ${tasks.length}`;
  if(progressFill)  progressFill.style.width=`${hasDiff&&totalW?(doneW/totalW)*100:(tasks.length?(doneCount/tasks.length)*100:0)}%`;

  tasks.forEach(task=>{
    const isPinned=task.id===pinnedTaskId;
    const li=document.createElement("li");
    li.className="task-item"+(task.checked?" checked":"");
    li.dataset.id=task.id;
    li.innerHTML=`
      <div class="task-checkbox"
           ${IS_ADMIN?`onclick="toggleTask(event,'${task.id}')" style="cursor:pointer"`:""}> 
        <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
          <path d="M1.5 5L5 8.5L11.5 1.5" stroke="white" stroke-width="2.2"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      ${renderIcon(task.icon||task.emoji)}
      <span class="task-label">${task.label}</span>
      ${task.tooltip?`<span class="tooltip-anchor" data-tip="${escHtml(task.tooltip)}">ℹ️</span>`:""}
      ${diffBadgeHtml(task.difficulty)}
      <button class="pin-btn${isPinned?" pinned":""}"
              onclick="${isPinned?"unpinTask":"pinTask"}(event${isPinned?"":`,'${task.id}'`})"
              title="${isPinned?"Unpin task":"Pin task to focus"}">📌</button>
      <div class="task-timer-group">
        <span class="task-timer-display" id="task-timer-${task.id}">${fmtMs(liveMs(task))}</span>
        <div class="task-timer-btns">
          <button class="ttbtn ttbtn-start${task.timerRunning?" active":""}"
                  onclick="taskTimerStart(event,'${task.id}')"
                  title="${task.timerRunning?"Stop":"Start"} timer">
            ${task.timerRunning?"⏸":"▶"}
          </button>
          ${IS_ADMIN?`<button class="ttbtn ttbtn-reset" onclick="taskTimerReset(event,'${task.id}')" title="Reset">↺</button>`:""}
        </div>
      </div>
    `;
    taskList.appendChild(li);
  });

  attachTooltips();
  window.scrollTo(0,scrollY);
}

// ---- Tooltips ----
function attachTooltips(){
  document.querySelectorAll(".tooltip-anchor").forEach(el=>{
    el.addEventListener("mouseenter",e=>{
      const tip=e.currentTarget.dataset.tip;
      if(!tip||!tooltipEl) return;
      tooltipEl.textContent=tip;tooltipEl.classList.add("visible");

    });
    el.addEventListener("mousemove",e=>{
      if(!tooltipEl) return;
      tooltipEl.style.left=(e.clientX+12)+"px";tooltipEl.style.top=(e.clientY-8)+"px";

    });
    el.addEventListener("mouseleave",()=>{ if(tooltipEl) tooltipEl.classList.remove("visible"); });
  });
}

// ---- Task interactions ----
async function toggleTask(e,taskId){
  e.stopPropagation();
  const updated=currentTasks.map(t=>t.id===taskId?{...t,checked:!t.checked}:t);
  try{await db.doc(TASKS_DOC).set({tasks:updated});}catch{showToast("❌ Failed to save");}
}
async function taskTimerStart(e,taskId){

  e.stopPropagation();
  const task=currentTasks.find(t=>t.id===taskId);if(!task) return;
  const now=Date.now();let updated;
  if(task.timerRunning){

    playTimerStop();
    const elapsed=task.timerStartedAt?now-task.timerStartedAt:0;
    updated=currentTasks.map(t=>t.id===taskId
      ?{...t,timerRunning:false,timerMs:(t.timerMs||0)+elapsed,timerStartedAt:null}:t);
  } else {
    playTimerStart();
    updated=currentTasks.map(t=>t.id===taskId?{...t,timerRunning:true,timerStartedAt:now}:t);

  }
  await db.doc(TASKS_DOC).set({tasks:updated});
}
async function taskTimerReset(e,taskId){

  e.stopPropagation();
  if(!confirm("Reset this task timer to 0?")) return;
  const updated=currentTasks.map(t=>t.id===taskId
    ?{...t,timerMs:0,timerRunning:false,timerStartedAt:null}:t);
  await db.doc(TASKS_DOC).set({tasks:updated});
  showToast("↺ Timer reset");
}

// Override pinTask to accept event object from inline onclick
const _pinTask=pinTask;
pinTask=function(eOrId,taskId){
  if(typeof eOrId==="string") return _pinTask(eOrId);  // called as pinTask('task_01')
  if(eOrId&&eOrId.stopPropagation) eOrId.stopPropagation();
  return _pinTask(taskId);
};

async function resetTasks(){
  if(!confirm("Reset ALL tasks to unchecked?")) return;
  const snap=await db.doc(TASKS_DOC).get();if(!snap.exists)return;
  await db.doc(TASKS_DOC).set({tasks:snap.data().tasks.map(t=>({...t,checked:false}))});
  showToast("🔄 All tasks reset");
}
async function checkAll(){
  const snap=await db.doc(TASKS_DOC).get();if(!snap.exists)return;
  await db.doc(TASKS_DOC).set({tasks:snap.data().tasks.map(t=>({...t,checked:true}))});

  showToast("🎉 All tasks checked!");
}

// ============================================================
// ██  TASK EDITOR  (admin)
// ============================================================
function renderTaskEditor(tasks){
  const container=document.getElementById("task-editor-list");
  if(!container) return;
  container.innerHTML="";
  tasks.forEach((task,index)=>{
    const diffOpts=["","easy","medium","hard"].map(v=>
      `<option value="${v}" ${task.difficulty===v?"selected":""}>${
        v?{easy:"🟢 Easy (1pt)",medium:"🟡 Medium (2pt)",hard:"🔴 Hard (3pt)"}[v]:"── No Difficulty ──"
      }</option>`
    ).join("");
    const row=document.createElement("div");
    row.className="task-editor-row";row.dataset.index=index;
    row.innerHTML=`


      <span class="task-editor-num">${index+1}</span>
      <div class="task-editor-icon-wrap">
        <div class="task-editor-icon-preview" id="preview-${index}">${renderIcon(task.icon||task.emoji||"⭐")}</div>
    container.appendChild(row);
  });
}
function updateIconPreview(index,value){
  const p=document.getElementById(`preview-${index}`);
  if(p) p.innerHTML=renderIcon(value||"⭐");

}
async function saveEditedTasks(){
  const rows=document.querySelectorAll(".task-editor-row");
  const updated=[];
  rows.forEach((row,i)=>{
    const get=f=>(row.querySelector(`[data-field='${f}']`)?.value||"").trim();
    const ex=currentTasks[i]||{};





    updated.push({
      id:             ex.id||(  "task_"+(Date.now()+i)),
      label:          get("label")      ||"Task",
      icon:           get("icon")       ||"⭐",
      tooltip:        get("tooltip")    ||"",
      difficulty:     get("difficulty") ||"",
      checked:        ex.checked        ||false,
      timerMs:        ex.timerMs        ||0,
      timerRunning:   ex.timerRunning   ||false,
      timerStartedAt: ex.timerStartedAt ||null,
    });
  });
  try{await db.doc(TASKS_DOC).set({tasks:updated});showToast("💾 Tasks saved!");}
  catch{showToast("❌ Failed to save tasks");}
}
function addNewTask(){
  const container=document.getElementById("task-editor-list");if(!container)return;
  const index=container.querySelectorAll(".task-editor-row").length;
  const row=document.createElement("div");
  row.className="task-editor-row";row.dataset.index=index;
  row.innerHTML=`



    <span class="task-editor-num">${index+1}</span>
    <div class="task-editor-icon-wrap">
      <div class="task-editor-icon-preview" id="preview-${index}">${renderIcon("⭐")}</div>
             oninput="updateIconPreview(${index},this.value)" data-field="icon"/>
    </div>
    <div class="task-editor-fields">
      <input class="task-editor-label-input" type="text" value="" placeholder="Task description..." data-field="label"/>
      <input class="task-editor-tooltip-input" type="text" value="" placeholder="Tooltip / hover info" data-field="tooltip"/>


      <select class="task-editor-diff-select" data-field="difficulty">
        <option value="">── No Difficulty ──</option>
        <option value="easy">🟢 Easy (1pt)</option>
  `;
  container.appendChild(row);
}
function removeTaskRow(index){
  const container=document.getElementById("task-editor-list");if(!container)return;


  container.querySelectorAll(".task-editor-row")[index]?.remove();
  container.querySelectorAll(".task-editor-row").forEach((r,i)=>{
    r.dataset.index=i;
    const n=r.querySelector(".task-editor-num");if(n)n.textContent=i+1;
  });
}

// ============================================================
// ██  CHALLENGE TIMER
// ============================================================
function listenToTimer(){
  db.doc(TIMER_DOC).onSnapshot(snap=>{
    stopChallengeTimer();
    if(!snap.exists){
      if(timerDisplay) timerDisplay.textContent="--:--:--";
      if(timerSubline) timerSubline.textContent="Admin has not started the timer yet";
      return;
    }
    const{startMs,durationMs,running}=snap.data();
    if(!running){
      const rem=Math.max(0,durationMs-(startMs?Date.now()-startMs:0));
      updateChallengeDisplay(Math.floor(rem/1000),durationMs);
      if(timerSubline) timerSubline.textContent="Timer paused";
      return;
    }
    startChallengeCountdown(startMs,durationMs);
  },err=>console.error("Timer error:",err));
}
function startChallengeCountdown(startMs,durationMs){
  if(challengeStarted) return;
  challengeStarted=true;
  function tick(){
    const rem=Math.max(0,durationMs-(Date.now()-startMs));
    updateChallengeDisplay(Math.floor(rem/1000),durationMs);
    if(rem<=0) stopChallengeTimer();

  }
  tick();challengeInterval=setInterval(tick,1000);

}
function stopChallengeTimer(){
  if(challengeInterval) clearInterval(challengeInterval);
  challengeInterval=null;challengeStarted=false;

}
function updateChallengeDisplay(totalSeconds,durationMs){
  const h=Math.floor(totalSeconds/3600),m=Math.floor((totalSeconds%3600)/60),s=totalSeconds%60;
  const pad=n=>String(n).padStart(2,"0");
  if(timerDisplay) timerDisplay.textContent=`${pad(h)}:${pad(m)}:${pad(s)}`;
  if(timerSubline){
    if(totalSeconds<=0){timerSubline.textContent="🏁 Time's up!";timerSubline.style.color="var(--accent2)";}
    else{timerSubline.textContent=`${Math.round(durationMs/3600000)}h challenge · counting down`;timerSubline.style.color="";}

  }
}
async function launchTimer(){
  const h=parseInt(document.getElementById("dur-h")?.value||0,10)||0;
  const m=parseInt(document.getElementById("dur-m")?.value||0,10)||0;
  const durationMs=(h*3600+m*60)*1000;
  if(durationMs<=0){showToast("⚠️ Set a duration first!");return;}
  const label=`${h>0?h+"h ":""}${m>0?m+"m":""}`.trim();
  if(!confirm(`Start a ${label} countdown for everyone?`)) return;

  stopChallengeTimer();
  await db.doc(TIMER_DOC).set({startMs:Date.now(),durationMs,running:true});
  showToast(`⏱ ${label} countdown started!`);
}
async function stopTimer(){
  if(!confirm("Pause the timer for all viewers?")) return;

  stopChallengeTimer();
  const snap=await db.doc(TIMER_DOC).get();if(!snap.exists)return;
  const{startMs,durationMs}=snap.data();
  const elapsed=Date.now()-startMs;
  await db.doc(TIMER_DOC).set({startMs:Date.now()-elapsed,durationMs,running:false});
  showToast("⏸ Timer paused");
}
async function resumeTimer(){
  const snap=await db.doc(TIMER_DOC).get();
  if(!snap.exists){showToast("Launch a timer first");return;}
  const{startMs,durationMs}=snap.data();
  await db.doc(TIMER_DOC).set({startMs,durationMs,running:true});

  showToast("▶️ Timer resumed");
}
async function resetTimer(){
  if(!confirm("Clear the timer completely?")) return;

  stopChallengeTimer();
  await db.doc(TIMER_DOC).delete();
  if(timerDisplay) timerDisplay.textContent="--:--:--";
  if(timerSubline) timerSubline.textContent="Set a new duration above";
  showToast("🗑 Timer cleared");
}

// ============================================================
// ██  UTILITIES
// ============================================================
function fmtMs(ms){
  const t=Math.floor(Math.max(0,ms)/1000);
  const h=Math.floor(t/3600),m=Math.floor((t%3600)/60),s=t%60;
  const pad=n=>String(n).padStart(2,"0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
function openMiniMode(){
  const url=window.location.href.replace(/admin\.html.*/,"index.html");
  const p=window.open(url,"WinChallengeMini",

    "width=340,height=560,resizable=yes,scrollbars=no,toolbar=no,menubar=no,location=no,status=no");
  if(!p) showToast("Allow popups to use Mini Mode!");
}

let toastTimeout;
function showToast(msg){
  const toast=document.getElementById("toast");if(!toast)return;
  toast.textContent=msg;toast.classList.add("show");

  clearTimeout(toastTimeout);
  toastTimeout=setTimeout(()=>toast.classList.remove("show"),2600);
}

// ============================================================
// ██  GO
// ============================================================
init();
