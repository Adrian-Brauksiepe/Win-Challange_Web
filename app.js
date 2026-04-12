// ============================================
// app.js  –  Win Challenge Tracker Logic
// ============================================

// ============================================
// 🔐 ADMIN PASSWORD  –  change this!
// ============================================
const ADMIN_PASSWORD = "Monk";

// ============================================
// 📋 TASKS CONFIGURATION
// ============================================
// icon: can be an emoji string like "🔥"
//       OR a path to a PNG like "icons/mario.png"
//       OR a full URL like "https://..."
// ============================================ 
const DEFAULT_TASKS = [
  { id: "task_01", label: "MC Durchspielen Sub 1H",      icon: "icons/MC.png", checked: false },
  { id: "task_02", label: "MC Master builders Win b2b",        icon: "icons/MC.png", checked: false },
  { id: "task_03", label: "MC Masterbuilders Win b2b",  icon: "icons/MC.png", checked: false },
  { id: "task_04", label: "MC Bedwars Win b2b",         icon: "icons/MC.png", checked: false },
  { id: "task_05", label: "League of Legends Win b2b",    icon: "🎮", checked: false },
  { id: "task_06", label: "Overwatch Win b2b",       icon: "🎮", checked: false },
  { id: "task_07", label: "CSGO Win b2b", icon: "🎮", checked: false },
  { id: "task_08", label: "Rocket League Win b2b",       icon: "🎮", checked: false },
  { id: "task_09", label: "Fortnite Epic Win",         icon: "🎮", checked: false },
  { id: "task_10", label: "Higher Lower 35p",      icon: "🎮", checked: false },
  { id: "task_11", label: "Eraser 50%",   icon: "🎮", checked: false },
  { id: "task_12", label: "Fallguys Win",     icon: "🎮", checked: false },
  { id: "task_13", label: "Rainbow 6 Win",     icon: "🎮", checked: false },
  { id: "task_14", label: "Valorant Win b2b",     icon: "🎮", checked: false },
  { id: "task_15", label: "Unrailed 1000m",     icon: "🎮", checked: false },
];

// ---- Firestore paths ----
const TASKS_DOC = "challenge/tasks";
const TIMER_DOC = "challenge/timer";
const IS_ADMIN  = window.location.pathname.includes("admin");

// ---- DOM refs ----
const timerDisplay = document.getElementById("timer-display");
const timerSubline = document.getElementById("timer-subline");
const taskList     = document.getElementById("task-list");
const progressText = document.getElementById("progress-text");
const progressFill = document.getElementById("progress-fill");
const loadingEl    = document.getElementById("loading");

let timerInterval = null;
let timerStarted  = false;

// ============================================
// INIT
// ============================================
async function init() {
  if (IS_ADMIN) {
    document.body.classList.add("admin-mode");
    // Check if already unlocked in this session
    if (sessionStorage.getItem("adminUnlocked") === "yes") {
      showAdminContent();
    } else {
      // Hide loading, show password gate
      if (loadingEl) loadingEl.classList.add("hidden");
      return; // Don't start Firebase yet — wait for password
    }
  }
  startApp();
}

// ---- Called after password is confirmed ----
function startApp() {
  listenToTasks();
  listenToTimer();
  setTimeout(() => { if (loadingEl) loadingEl.classList.add("hidden"); }, 1000);
}

// ============================================ 
// PASSWORD GATE
// ============================================
function checkPassword() {
  const input = document.getElementById("pw-input");
  const error = document.getElementById("pw-error");
  if (!input) return;

  if (input.value === ADMIN_PASSWORD) {
    // Correct! Save to session so refresh doesn't re-ask
    sessionStorage.setItem("adminUnlocked", "yes");
    showAdminContent();
    startApp();
  } else {
    // Wrong password — shake the card and show error
    error.textContent = "❌ Wrong password, try again";
    input.value = "";
    input.focus();
    const card = document.querySelector(".pw-card");
    if (card) {
      card.classList.add("shake");
      setTimeout(() => card.classList.remove("shake"), 500);
    }
  }
}

function showAdminContent() {
  const gate    = document.getElementById("password-gate");
  const content = document.getElementById("admin-content");
  if (gate)    gate.style.display    = "none";
  if (content) content.style.display = "flex";
}

// ============================================
// TASKS
// ============================================
function listenToTasks() {
  db.doc(TASKS_DOC).onSnapshot(async (snap) => {
    let tasks;
    if (!snap.exists) {
      tasks = DEFAULT_TASKS;
      await db.doc(TASKS_DOC).set({ tasks: DEFAULT_TASKS });
    } else {
      tasks = snap.data().tasks;
    }
    renderTasks(tasks);
  }, (err) => {
    console.error("Tasks error:", err);
    showToast("⚠️ Database connection failed");
  });
}

// ---- Render a task icon — supports emoji OR image path/URL ----
function renderIcon(icon) {
  // If it looks like a file path or URL → use an <img> tag
  if (icon && (icon.includes("/") || icon.includes(".png") || icon.includes(".jpg") || icon.includes("http"))) {
    return `<img class="task-img" src="${icon}" alt="icon" />`;
  }
  // Otherwise treat as emoji
  return `<span class="task-emoji">${icon}</span>`;
}

function renderTasks(tasks) {
  if (!taskList) return;
  taskList.innerHTML = "";
  const done  = tasks.filter(t => t.checked).length;
  const total = tasks.length;
  if (progressText) progressText.textContent = `${done} / ${total}`;
  if (progressFill)  progressFill.style.width = `${total ? (done / total) * 100 : 0}%`;

  tasks.forEach((task) => {
    const li = document.createElement("li");
    li.className = "task-item" + (task.checked ? " checked" : "");
    li.dataset.id = task.id;

    // Support both old "emoji" field and new "icon" field
    const iconHtml = renderIcon(task.icon || task.emoji || "⭐");

    li.innerHTML = `
      <div class="task-checkbox">
        <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
          <path d="M1.5 5L5 8.5L11.5 1.5" stroke="white" stroke-width="2.2"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      ${iconHtml}
      <span class="task-label">${task.label}</span>
    `;
    if (IS_ADMIN) li.addEventListener("click", () => toggleTask(tasks, task.id));
    taskList.appendChild(li);
  });
}

async function toggleTask(tasks, taskId) {
  const updated = tasks.map(t => t.id === taskId ? { ...t, checked: !t.checked } : t);
  try {
    await db.doc(TASKS_DOC).set({ tasks: updated });
    showToast("✅ Saved!");
  } catch (e) {
    showToast("❌ Failed to save");
  }
}

async function resetTasks() {
  if (!confirm("Reset ALL tasks to unchecked? This affects every viewer.")) return;
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
// TIMER  –  COUNTDOWN
// ============================================
function listenToTimer() {
  db.doc(TIMER_DOC).onSnapshot((snap) => {
    stopLocalTimer();
    if (!snap.exists) {
      if (timerDisplay) timerDisplay.textContent = "--:--:--";
      if (timerSubline) timerSubline.textContent = "Admin has not started the timer yet";
      return;
    }
    const { startMs, durationMs, running } = snap.data();
    if (!running) {
      const elapsed   = startMs ? Date.now() - startMs : 0;
      const remaining = Math.max(0, durationMs - elapsed);
      updateTimerDisplay(Math.floor(remaining / 1000), durationMs);
      if (timerSubline) timerSubline.textContent = "Timer paused";
      return;
    }
    startLocalCountdown(startMs, durationMs);
  }, (err) => console.error("Timer snapshot error:", err));
}

function startLocalCountdown(startMs, durationMs) {
  if (timerStarted) return;
  timerStarted = true;
  function tick() {
    const elapsed   = Date.now() - startMs;
    const remaining = Math.max(0, durationMs - elapsed);
    updateTimerDisplay(Math.floor(remaining / 1000), durationMs);
    if (remaining <= 0) stopLocalTimer();
  }
  tick();
  timerInterval = setInterval(tick, 1000);
}

function stopLocalTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  timerStarted  = false;
}

function updateTimerDisplay(totalSeconds, durationMs) {
  const h   = Math.floor(totalSeconds / 3600);
  const m   = Math.floor((totalSeconds % 3600) / 60);
  const s   = totalSeconds % 60;
  const pad = n => String(n).padStart(2, "0");
  if (timerDisplay) timerDisplay.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
  if (timerSubline) {
    if (totalSeconds <= 0) {
      timerSubline.textContent = "🏁 Time's up!";
      timerSubline.style.color = "var(--accent2)";
    } else {
      const totalH = Math.round(durationMs / 3600000);
      timerSubline.textContent = `${totalH}h challenge · counting down`;
      timerSubline.style.color = "";
    }
  }
}

async function launchTimer() {
  const h = parseInt(document.getElementById("dur-h")?.value || 0, 10) || 0;
  const m = parseInt(document.getElementById("dur-m")?.value || 0, 10) || 0;
  const durationMs = (h * 3600 + m * 60) * 1000;
  if (durationMs <= 0) { showToast("⚠️ Set a duration first!"); return; }
  const label = `${h > 0 ? h + "h " : ""}${m > 0 ? m + "m" : ""}`.trim();
  if (!confirm(`Start a ${label} countdown for everyone?`)) return;
  stopLocalTimer();
  await db.doc(TIMER_DOC).set({ startMs: Date.now(), durationMs, running: true });
  showToast(`⏱ ${label} countdown started!`);
}

async function stopTimer() {
  if (!confirm("Pause the timer for all viewers?")) return;
  stopLocalTimer();
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
  if (!confirm("Clear the timer completely? This cannot be undone.")) return;
  stopLocalTimer();
  await db.doc(TIMER_DOC).delete();
  if (timerDisplay) timerDisplay.textContent = "--:--:--";
  if (timerSubline) timerSubline.textContent = "Set a new duration above";
  showToast("🗑 Timer cleared");
}

// ============================================
// MINI MODE
// ============================================
function openMiniMode() {
  const url = window.location.href.replace(/admin\.html.*/, "index.html");
  const popup = window.open(url, "WinChallengeMini",
    "width=340,height=520,resizable=yes,scrollbars=no,toolbar=no,menubar=no,location=no,status=no");
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
  toastTimeout = setTimeout(() => toast.classList.remove("show"), 2400);
}

// ============================================
// GO
// ============================================
init();
