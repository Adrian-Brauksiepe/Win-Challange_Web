// ============================================
// app.js  –  Win Challenge Tracker
// ============================================

// ============================================
// 🔐 ADMIN PASSWORD
// ============================================
const ADMIN_PASSWORD = "winmonk2026";

// ============================================
// 📋 DEFAULT TASKS
// icon    = emoji or image path/URL
// tooltip = text shown on hover (e.g. "Save: 48 GB")
// timerMs         = accumulated milliseconds
// timerRunning    = bool
// timerStartedAt  = timestamp (ms) when last started
// ============================================
const DEFAULT_TASKS = [
  { id:"task_01", label:"Lorem ipsum dolor sit amet consectetur",      icon:"🔥", tooltip:"",  checked:false, timerMs:0, timerRunning:false, timerStartedAt:null },
  { id:"task_02", label:"Adipiscing elit sed do eiusmod tempor",        icon:"⚡", tooltip:"",  checked:false, timerMs:0, timerRunning:false, timerStartedAt:null },
  { id:"task_03", label:"Incididunt ut labore et dolore magna aliqua",  icon:"💪", tooltip:"",  checked:false, timerMs:0, timerRunning:false, timerStartedAt:null },
  { id:"task_04", label:"Ut enim ad minim veniam quis nostrud",         icon:"🎯", tooltip:"",  checked:false, timerMs:0, timerRunning:false, timerStartedAt:null },
  { id:"task_05", label:"Exercitation ullamco laboris nisi aliquip",    icon:"🏋️", tooltip:"",  checked:false, timerMs:0, timerRunning:false, timerStartedAt:null },
  { id:"task_06", label:"Duis aute irure dolor in reprehenderit",       icon:"📚", tooltip:"",  checked:false, timerMs:0, timerRunning:false, timerStartedAt:null },
  { id:"task_07", label:"Voluptate velit esse cillum dolore eu fugiat", icon:"🧘", tooltip:"",  checked:false, timerMs:0, timerRunning:false, timerStartedAt:null },
  { id:"task_08", label:"Nulla pariatur excepteur sint occaecat",       icon:"💧", tooltip:"",  checked:false, timerMs:0, timerRunning:false, timerStartedAt:null },
  { id:"task_09", label:"Cupidatat non proident sunt in culpa",         icon:"🥗", tooltip:"",  checked:false, timerMs:0, timerRunning:false, timerStartedAt:null },
  { id:"task_10", label:"Qui officia deserunt mollit anim id est",      icon:"😴", tooltip:"",  checked:false, timerMs:0, timerRunning:false, timerStartedAt:null },
  { id:"task_11", label:"Laborum perspiciatis unde omnis iste natus",   icon:"🚶", tooltip:"",  checked:false, timerMs:0, timerRunning:false, timerStartedAt:null },
  { id:"task_12", label:"Nemo enim ipsam voluptatem quia voluptas",     icon:"📵", tooltip:"",  checked:false, timerMs:0, timerRunning:false, timerStartedAt:null },
];

// ---- Firestore paths ----
const TASKS_DOC    = "challenge/tasks";
const TIMER_DOC    = "challenge/timer";
const SETTINGS_DOC = "challenge/settings";

const IS_ADMIN = window.location.pathname.includes("admin");

// ---- DOM ----
const timerDisplay = document.getElementById("timer-display");
const timerSubline = document.getElementById("timer-subline");
const taskList     = document.getElementById("task-list");
const progressText = document.getElementById("progress-text");
const progressFill = document.getElementById("progress-fill");
const loadingEl    = document.getElementById("loading");
const tooltipEl    = document.getElementById("tooltip");

let challengeInterval = null;
let challengeStarted  = false;
let currentTasks      = [];
let taskTickInterval  = null; // local tick to refresh task timers every second
let prevCheckedCount  = -1;   // for detecting new completions

// ============================================
// INIT
// ============================================
async function init() {
  initBackground();

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
  if (IS_ADMIN) listenToSettings();
  else          listenToLaunchGate();
  listenToTasks();
  listenToTimer();
  startTaskTick();
  setTimeout(() => { if (loadingEl) loadingEl.classList.add("hidden"); }, 1000);
}

// ============================================
// BACKGROUND ANIMATION  (subtle drifting stars)
// ============================================
function initBackground() {
  const canvas = document.getElementById("bg-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let W, H, stars = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function makeStars() {
    stars = [];
    const count = Math.floor((W * H) / 9000); // density scales with screen
    for (let i = 0; i < count; i++) {
      stars.push({
        x:    Math.random() * W,
        y:    Math.random() * H,
        r:    Math.random() * 1.2 + 0.3,
        a:    Math.random() * 0.5 + 0.1,   // opacity
        dx:   (Math.random() - 0.5) * 0.12, // drift x
        dy:   (Math.random() - 0.5) * 0.08, // drift y
        da:   (Math.random() - 0.5) * 0.003 // twinkle
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (const s of stars) {
      s.x  += s.dx;
      s.y  += s.dy;
      s.a  += s.da;
      // Clamp opacity and reverse direction
      if (s.a > 0.65 || s.a < 0.05) s.da *= -1;
      // Wrap around edges
      if (s.x < 0)  s.x = W;
      if (s.x > W)  s.x = 0;
      if (s.y < 0)  s.y = H;
      if (s.y > H)  s.y = 0;

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 220, 100, ${s.a})`;
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }

  resize();
  makeStars();
  draw();
  window.addEventListener("resize", () => { resize(); makeStars(); });
}

// ============================================
// CONFETTI ENGINE
// ============================================
function launchConfetti(big = false) {
  const canvas = document.getElementById("confetti-canvas");
  if (!canvas) return;
  const ctx    = canvas.getContext("2d");
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const count   = big ? 260 : 80;
  const colors  = ["#f0c040","#e07830","#48c774","#60a0ff","#e060e0","#ffffff"];
  const pieces  = [];

  for (let i = 0; i < count; i++) {
    pieces.push({
      x:    Math.random() * canvas.width,
      y:    big ? Math.random() * canvas.height * 0.4 : (Math.random() - 0.3) * canvas.height * 0.5,
      w:    Math.random() * 10 + 5,
      h:    Math.random() * 5  + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot:  Math.random() * 360,
      drot: (Math.random() - 0.5) * 8,
      dy:   Math.random() * 3 + 1.5,
      dx:   (Math.random() - 0.5) * 2,
      opacity: 1
    });
  }

  let frame = 0;
  const maxFrames = big ? 280 : 160;

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    frame++;
    for (const p of pieces) {
      p.y   += p.dy;
      p.x   += p.dx;
      p.rot += p.drot;
      p.dy  *= 0.995; // slight gravity ease
      if (frame > maxFrames * 0.6) p.opacity = Math.max(0, p.opacity - 0.025);

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot * Math.PI / 180);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (frame < maxFrames) requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  tick();
}

// ============================================
// ADMIN PASSWORD
// ============================================
function checkAdminPassword() {
  const input = document.getElementById("pw-input");
  const error = document.getElementById("pw-error");
  if (!input) return;
  if (input.value === ADMIN_PASSWORD) {
    sessionStorage.setItem("adminUnlocked", "yes");
    showAdminContent();
    startApp();
  } else {
    error.textContent = "❌ Wrong password, try again";
    input.value = "";
    input.focus();
    const card = document.querySelector(".pw-card");
    if (card) { card.classList.add("shake"); setTimeout(() => card.classList.remove("shake"), 500); }
  }
}

function showAdminContent() {
  const gate    = document.getElementById("password-gate");
  const content = document.getElementById("admin-content");
  if (gate)    gate.style.display    = "none";
  if (content) content.style.display = "flex";
}

// ============================================
// LAUNCH GATE  (viewer)
// ============================================
let launchCountdownInterval = null;

function listenToLaunchGate() {
  db.doc(SETTINGS_DOC).onSnapshot((snap) => {
    const data = snap.exists ? snap.data() : {};
    if (sessionStorage.getItem("viewerUnlocked") === "yes") { hideLaunchOverlay(); return; }
    const launchMs = data.launchMs || null;
    window._viewerPassword = data.viewerPassword || "";
    if (!launchMs || Date.now() >= launchMs) hideLaunchOverlay();
    else showLaunchOverlay(launchMs);
  });
}

function showLaunchOverlay(launchMs) {
  const overlay = document.getElementById("launch-overlay");
  if (overlay) overlay.classList.add("active");
  if (launchCountdownInterval) clearInterval(launchCountdownInterval);
  function tick() {
    const rem = launchMs - Date.now();
    if (rem <= 0) { clearInterval(launchCountdownInterval); hideLaunchOverlay(); return; }
    const d = Math.floor(rem / 86400000);
    const h = Math.floor((rem % 86400000) / 3600000);
    const m = Math.floor((rem % 3600000)  / 60000);
    const s = Math.floor((rem % 60000)    / 1000);
    const pad = n => String(n).padStart(2,"0");
    const el = id => document.getElementById(id);
    if (el("cd-days"))  el("cd-days").textContent  = pad(d);
    if (el("cd-hours")) el("cd-hours").textContent = pad(h);
    if (el("cd-mins"))  el("cd-mins").textContent  = pad(m);
    if (el("cd-secs"))  el("cd-secs").textContent  = pad(s);
  }
  tick();
  launchCountdownInterval = setInterval(tick, 1000);
}

function hideLaunchOverlay() {
  const overlay = document.getElementById("launch-overlay");
  if (overlay) { overlay.classList.add("fade-out"); setTimeout(() => overlay.style.display = "none", 600); }
  if (launchCountdownInterval) clearInterval(launchCountdownInterval);
}

function checkViewerPassword() {
  const input = document.getElementById("viewer-pw-input");
  const error = document.getElementById("viewer-pw-error");
  if (!input) return;
  if (!window._viewerPassword) { error.textContent = "No early-access password set."; return; }
  if (input.value === window._viewerPassword) {
    sessionStorage.setItem("viewerUnlocked","yes");
    hideLaunchOverlay();
  } else {
    error.textContent = "❌ Wrong password";
    input.value = ""; input.focus();
    const card = document.querySelector(".launch-card");
    if (card) { card.classList.add("shake"); setTimeout(() => card.classList.remove("shake"), 500); }
  }
}

// ============================================
// SETTINGS  (admin)
// ============================================
function listenToSettings() {
  db.doc(SETTINGS_DOC).onSnapshot((snap) => {
    if (!snap.exists) return;
    const { launchMs, viewerPassword } = snap.data();
    const launchInput = document.getElementById("launch-date-input");
    if (launchInput && launchMs) {
      const d = new Date(launchMs);
      launchInput.value = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16);
    }
    const vpInput = document.getElementById("viewer-pw-set");
    if (vpInput && viewerPassword !== undefined) vpInput.value = viewerPassword;
    const status = document.getElementById("launch-date-status");
    if (status) {
      if (launchMs) {
        const d = new Date(launchMs);
        if (Date.now() >= launchMs) { status.textContent = `✅ Site is LIVE — launched ${d.toLocaleString()}`; status.style.color = "var(--success)"; }
        else { status.textContent = `⏳ Countdown active — opens ${d.toLocaleString()}`; status.style.color = "var(--accent)"; }
      } else { status.textContent = "No launch date set — site is publicly visible."; status.style.color = "var(--text-muted)"; }
    }
  });
}

async function saveLaunchDate() {
  const input = document.getElementById("launch-date-input");
  if (!input || !input.value) { showToast("⚠️ Pick a date first"); return; }
  await db.doc(SETTINGS_DOC).set({ launchMs: new Date(input.value).getTime() }, { merge: true });
  showToast("📅 Launch date saved!");
}

async function clearLaunchDate() {
  if (!confirm("Remove the countdown? The site will be visible to everyone immediately.")) return;
  await db.doc(SETTINGS_DOC).set({ launchMs: null }, { merge: true });
  document.getElementById("launch-date-input").value = "";
  showToast("✅ Countdown removed");
}

async function saveViewerPassword() {
  const input = document.getElementById("viewer-pw-set");
  const pw = input ? input.value.trim() : "";
  await db.doc(SETTINGS_DOC).set({ viewerPassword: pw }, { merge: true });
  const status = document.getElementById("viewer-pw-status");
  if (status) { status.textContent = pw ? `✅ Password set to "${pw}"` : "✅ Password cleared"; status.style.color = "var(--success)"; }
  showToast("🔓 Viewer password saved!");
}

// ============================================
// TASKS  –  Real-time listener
// ============================================
function listenToTasks() {
  db.doc(TASKS_DOC).onSnapshot(async (snap) => {
    let tasks;
    if (!snap.exists) {
      tasks = DEFAULT_TASKS;
      await db.doc(TASKS_DOC).set({ tasks: DEFAULT_TASKS });
    } else {
      tasks = snap.data().tasks.map(t => ({
        timerMs: 0, timerRunning: false, timerStartedAt: null, tooltip: "", ...t
      }));
    }
    currentTasks = tasks;
    renderTasks(tasks);
    updateTotalTime(tasks);
    checkCompletionEffects(tasks);
    if (IS_ADMIN) renderTaskEditor(tasks);
  }, (err) => { console.error("Tasks error:", err); showToast("⚠️ Database connection failed"); });
}

// Local tick: refreshes task timer displays and total every second without hitting Firestore
function startTaskTick() {
  if (taskTickInterval) clearInterval(taskTickInterval);
  taskTickInterval = setInterval(() => {
    if (currentTasks.length === 0) return;
    // Only re-render timer cells and total (not the whole list)
    currentTasks.forEach(task => {
      const el = document.getElementById(`task-timer-${task.id}`);
      if (el) el.textContent = fmtMs(liveMs(task));
    });
    updateTotalTime(currentTasks);
  }, 1000);
}

// Compute live milliseconds including running offset
function liveMs(task) {
  let ms = task.timerMs || 0;
  if (task.timerRunning && task.timerStartedAt) ms += Date.now() - task.timerStartedAt;
  return ms;
}

function updateTotalTime(tasks) {
  const total = tasks.reduce((sum, t) => sum + liveMs(t), 0);
  const el = document.getElementById("total-time-display");
  if (el) el.textContent = fmtMs(total);
}

// ---- Check for completion effects ----
function checkCompletionEffects(tasks) {
  const done = tasks.filter(t => t.checked).length;
  if (prevCheckedCount === -1) { prevCheckedCount = done; return; } // first load
  if (done > prevCheckedCount) {
    // A new task was just checked
    if (done === tasks.length) {
      // ALL done — big effect!
      launchConfetti(true);
      showToast("🏆 ALL TASKS COMPLETE! CHAMPION!");
    } else {
      launchConfetti(false);
    }
  }
  prevCheckedCount = done;
}

// ---- Render icon ----
function renderIcon(icon) {
  if (icon && (icon.includes("/") || /\.(png|jpg|gif|webp|svg)$/i.test(icon) || icon.startsWith("http"))) {
    return `<img class="task-img" src="${icon}" alt="icon" />`;
  }
  return `<span class="task-emoji">${icon || "⭐"}</span>`;
}

// ---- Render the live task list ----
function renderTasks(tasks) {
  if (!taskList) return;

  // Preserve scroll position
  const scrollY = window.scrollY;

  taskList.innerHTML = "";
  const done  = tasks.filter(t => t.checked).length;
  const total = tasks.length;
  if (progressText) progressText.textContent = `${done} / ${total}`;
  if (progressFill)  progressFill.style.width = `${total ? (done/total)*100 : 0}%`;

  tasks.forEach((task) => {
    const li = document.createElement("li");
    li.className = "task-item" + (task.checked ? " checked" : "");
    li.dataset.id = task.id;

    const timerRunning = task.timerRunning;
    const timerValue   = fmtMs(liveMs(task));

    li.innerHTML = `
      <div class="task-checkbox" ${IS_ADMIN ? `onclick="toggleTask(event,'${task.id}')"` : ""} style="${IS_ADMIN?'cursor:pointer':''}">
        <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
          <path d="M1.5 5L5 8.5L11.5 1.5" stroke="white" stroke-width="2.2"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      ${renderIcon(task.icon || task.emoji)}
      <span class="task-label">${task.label}</span>
      ${task.tooltip ? `<span class="tooltip-anchor" data-tip="${escHtml(task.tooltip)}">ℹ️</span>` : ""}
      <div class="task-timer-group">
        <span class="task-timer-display" id="task-timer-${task.id}">${timerValue}</span>
        <div class="task-timer-btns">
          <button class="ttbtn ttbtn-start${timerRunning ? ' active':''}"
                  onclick="taskTimerStart(event,'${task.id}')"
                  title="${timerRunning ? 'Running…' : 'Start timer'}">
            ${timerRunning ? '⏸' : '▶'}
          </button>
          ${IS_ADMIN ? `<button class="ttbtn ttbtn-reset" onclick="taskTimerReset(event,'${task.id}')" title="Reset timer">↺</button>` : ""}
        </div>
      </div>
    `;

    taskList.appendChild(li);
  });

  // Attach tooltip listeners
  attachTooltips();

  window.scrollTo(0, scrollY);
}

// ---- Tooltip logic ----
function attachTooltips() {
  document.querySelectorAll(".tooltip-anchor").forEach(el => {
    el.addEventListener("mouseenter", (e) => {
      const tip = e.currentTarget.dataset.tip;
      if (!tip || !tooltipEl) return;
      tooltipEl.textContent = tip;
      tooltipEl.classList.add("visible");
    });
    el.addEventListener("mousemove", (e) => {
      if (!tooltipEl) return;
      tooltipEl.style.left = (e.clientX + 12) + "px";
      tooltipEl.style.top  = (e.clientY - 8)  + "px";
    });
    el.addEventListener("mouseleave", () => {
      if (tooltipEl) tooltipEl.classList.remove("visible");
    });
  });
}

// ---- Escape html for attributes ----
function escHtml(s) { return s.replace(/"/g,"&quot;").replace(/</g,"&lt;"); }

// ---- Task timer: start / pause (any user) ----
async function taskTimerStart(e, taskId) {
  e.stopPropagation();
  const task = currentTasks.find(t => t.id === taskId);
  if (!task) return;
  const now  = Date.now();
  let updated;
  if (task.timerRunning) {
    // STOP — accumulate elapsed into timerMs
    const elapsed = task.timerStartedAt ? now - task.timerStartedAt : 0;
    updated = currentTasks.map(t => t.id === taskId
      ? { ...t, timerRunning: false, timerMs: (t.timerMs||0) + elapsed, timerStartedAt: null }
      : t);
  } else {
    // START
    updated = currentTasks.map(t => t.id === taskId
      ? { ...t, timerRunning: true, timerStartedAt: now }
      : t);
  }
  await db.doc(TASKS_DOC).set({ tasks: updated });
}

// ---- Task timer: reset (admin only) ----
async function taskTimerReset(e, taskId) {
  e.stopPropagation();
  if (!confirm("Reset this task timer to 0?")) return;
  const updated = currentTasks.map(t => t.id === taskId
    ? { ...t, timerMs: 0, timerRunning: false, timerStartedAt: null }
    : t);
  await db.doc(TASKS_DOC).set({ tasks: updated });
  showToast("↺ Timer reset");
}

// ---- Toggle task checked (admin only) ----
async function toggleTask(e, taskId) {
  e.stopPropagation();
  const updated = currentTasks.map(t => t.id === taskId ? { ...t, checked: !t.checked } : t);
  try { await db.doc(TASKS_DOC).set({ tasks: updated }); } catch { showToast("❌ Failed to save"); }
}

async function resetTasks() {
  if (!confirm("Reset ALL tasks to unchecked?")) return;
  const snap = await db.doc(TASKS_DOC).get();
  if (!snap.exists) return;
  await db.doc(TASKS_DOC).set({ tasks: snap.data().tasks.map(t => ({ ...t, checked: false })) });
  showToast("🔄 All tasks reset");
}

async function checkAll() {
  const snap = await db.doc(TASKS_DOC).get();
  if (!snap.exists) return;
  await db.doc(TASKS_DOC).set({ tasks: snap.data().tasks.map(t => ({ ...t, checked: true })) });
  showToast("🎉 All tasks checked!");
}

// ============================================
// TASK EDITOR  (admin)
// ============================================
function renderTaskEditor(tasks) {
  const container = document.getElementById("task-editor-list");
  if (!container) return;
  container.innerHTML = "";
  tasks.forEach((task, index) => {
    const row = document.createElement("div");
    row.className = "task-editor-row";
    row.dataset.index = index;
    row.innerHTML = `
      <span class="task-editor-num">${index + 1}</span>
      <div class="task-editor-icon-wrap">
        <div class="task-editor-icon-preview" id="preview-${index}">${renderIcon(task.icon||task.emoji||"⭐")}</div>
        <input class="task-editor-icon-input" type="text" value="${task.icon||task.emoji||""}"
               placeholder="🔥 or icons/img.png"
               oninput="updateIconPreview(${index},this.value)" data-field="icon" />
      </div>
      <div class="task-editor-fields">
        <input class="task-editor-label-input" type="text" value="${task.label}"
               placeholder="Task description..." data-field="label" />
        <input class="task-editor-tooltip-input" type="text" value="${task.tooltip||""}"
               placeholder="Tooltip / hover info (e.g. Save: 48 GB)" data-field="tooltip" />
      </div>
      <button class="task-editor-remove" onclick="removeTaskRow(${index})" title="Remove">✕</button>
    `;
    container.appendChild(row);
  });
}

function updateIconPreview(index, value) {
  const preview = document.getElementById(`preview-${index}`);
  if (preview) preview.innerHTML = renderIcon(value || "⭐");
}

async function saveEditedTasks() {
  const rows   = document.querySelectorAll(".task-editor-row");
  const updated = [];
  rows.forEach((row, i) => {
    const get   = f => (row.querySelector(`[data-field='${f}']`)?.value || "").trim();
    const existing = currentTasks[i] || {};
    updated.push({
      id:             existing.id || "task_" + String(Date.now() + i),
      label:          get("label")   || "Task",
      icon:           get("icon")    || "⭐",
      tooltip:        get("tooltip") || "",
      checked:        existing.checked        || false,
      timerMs:        existing.timerMs        || 0,
      timerRunning:   existing.timerRunning   || false,
      timerStartedAt: existing.timerStartedAt || null,
    });
  });
  try { await db.doc(TASKS_DOC).set({ tasks: updated }); showToast("💾 Tasks saved!"); }
  catch { showToast("❌ Failed to save tasks"); }
}

function addNewTask() {
  const container = document.getElementById("task-editor-list");
  if (!container) return;
  const index = container.querySelectorAll(".task-editor-row").length;
  const row = document.createElement("div");
  row.className = "task-editor-row";
  row.dataset.index = index;
  row.innerHTML = `
    <span class="task-editor-num">${index + 1}</span>
    <div class="task-editor-icon-wrap">
      <div class="task-editor-icon-preview" id="preview-${index}">${renderIcon("⭐")}</div>
      <input class="task-editor-icon-input" type="text" value=""
             placeholder="🔥 or icons/img.png"
             oninput="updateIconPreview(${index},this.value)" data-field="icon" />
    </div>
    <div class="task-editor-fields">
      <input class="task-editor-label-input" type="text" value=""
             placeholder="Task description..." data-field="label" />
      <input class="task-editor-tooltip-input" type="text" value=""
             placeholder="Tooltip / hover info (e.g. Save: 48 GB)" data-field="tooltip" />
    </div>
    <button class="task-editor-remove" onclick="removeTaskRow(${index})" title="Remove">✕</button>
  `;
  container.appendChild(row);
}

function removeTaskRow(index) {
  const container = document.getElementById("task-editor-list");
  if (!container) return;
  container.querySelectorAll(".task-editor-row")[index]?.remove();
  container.querySelectorAll(".task-editor-row").forEach((r, i) => {
    r.dataset.index = i;
    const num = r.querySelector(".task-editor-num");
    if (num) num.textContent = i + 1;
  });
}

// ============================================
// CHALLENGE TIMER  –  countdown
// ============================================
function listenToTimer() {
  db.doc(TIMER_DOC).onSnapshot((snap) => {
    stopChallengeTimer();
    if (!snap.exists) {
      if (timerDisplay) timerDisplay.textContent = "--:--:--";
      if (timerSubline) timerSubline.textContent = "Admin has not started the timer yet";
      return;
    }
    const { startMs, durationMs, running } = snap.data();
    if (!running) {
      const rem = Math.max(0, durationMs - (startMs ? Date.now() - startMs : 0));
      updateChallengeDisplay(Math.floor(rem/1000), durationMs);
      if (timerSubline) timerSubline.textContent = "Timer paused";
      return;
    }
    startChallengeCountdown(startMs, durationMs);
  }, err => console.error("Timer error:", err));
}

function startChallengeCountdown(startMs, durationMs) {
  if (challengeStarted) return;
  challengeStarted = true;
  function tick() {
    const rem = Math.max(0, durationMs - (Date.now() - startMs));
    updateChallengeDisplay(Math.floor(rem/1000), durationMs);
    if (rem <= 0) stopChallengeTimer();
  }
  tick();
  challengeInterval = setInterval(tick, 1000);
}

function stopChallengeTimer() {
  if (challengeInterval) clearInterval(challengeInterval);
  challengeInterval = null;
  challengeStarted  = false;
}

function updateChallengeDisplay(totalSeconds, durationMs) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = n => String(n).padStart(2,"0");
  if (timerDisplay) timerDisplay.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
  if (timerSubline) {
    if (totalSeconds <= 0) { timerSubline.textContent = "🏁 Time's up!"; timerSubline.style.color = "var(--accent2)"; }
    else { timerSubline.textContent = `${Math.round(durationMs/3600000)}h challenge · counting down`; timerSubline.style.color = ""; }
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
  await db.doc(TIMER_DOC).set({ startMs: Date.now(), durationMs, running: true });
  showToast(`⏱ ${label} countdown started!`);
}

async function stopTimer() {
  if (!confirm("Pause the timer for all viewers?")) return;
  stopChallengeTimer();
  const snap = await db.doc(TIMER_DOC).get();
  if (!snap.exists) return;
  const { startMs, durationMs } = snap.data();
  const elapsed = Date.now() - startMs;
  await db.doc(TIMER_DOC).set({ startMs: Date.now() - elapsed, durationMs, running: false });
  showToast("⏸ Timer paused");
}

async function resumeTimer() {
  const snap = await db.doc(TIMER_DOC).get();
  if (!snap.exists) { showToast("Launch a timer first"); return; }
  const { startMs, durationMs } = snap.data();
  await db.doc(TIMER_DOC).set({ startMs, durationMs, running: true });
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

// ============================================
// UTILITIES
// ============================================

// Format milliseconds → HH:MM:SS
function fmtMs(ms) {
  const total = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = n => String(n).padStart(2,"0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

// ============================================
// MINI MODE
// ============================================
function openMiniMode() {
  const url = window.location.href.replace(/admin\.html.*/, "index.html");
  const popup = window.open(url, "WinChallengeMini",
    "width=340,height=560,resizable=yes,scrollbars=no,toolbar=no,menubar=no,location=no,status=no");
  if (!popup) showToast("Allow popups to use Mini Mode!");
}

// ============================================
// TOAST
// ============================================
let toastTimeout;
function showToast(msg) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("show"), 2600);
}

// ============================================
// GO
// ============================================
init();
