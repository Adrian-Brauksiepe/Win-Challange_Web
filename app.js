// ============================================
// app.js  –  Win Challenge Tracker Logic
// ============================================

// ---- TASKS CONFIGURATION ----
const DEFAULT_TASKS = [
  { id: "task_01", label: "Lorem ipsum dolor sit amet consectetur",      emoji: "🔥", checked: false },
  { id: "task_02", label: "Adipiscing elit sed do eiusmod tempor",        emoji: "⚡", checked: false },
  { id: "task_03", label: "Incididunt ut labore et dolore magna aliqua",  emoji: "💪", checked: false },
  { id: "task_04", label: "Ut enim ad minim veniam quis nostrud",         emoji: "🎯", checked: false },
  { id: "task_05", label: "Exercitation ullamco laboris nisi aliquip",    emoji: "🏋️", checked: false },
  { id: "task_06", label: "Duis aute irure dolor in reprehenderit",       emoji: "📚", checked: false },
  { id: "task_07", label: "Voluptate velit esse cillum dolore eu fugiat", emoji: "🧘", checked: false },
  { id: "task_08", label: "Nulla pariatur excepteur sint occaecat",       emoji: "💧", checked: false },
  { id: "task_09", label: "Cupidatat non proident sunt in culpa",         emoji: "🥗", checked: false },
  { id: "task_10", label: "Qui officia deserunt mollit anim id est",      emoji: "😴", checked: false },
  { id: "task_11", label: "Laborum perspiciatis unde omnis iste natus",   emoji: "🚶", checked: false },
  { id: "task_12", label: "Nemo enim ipsam voluptatem quia voluptas",     emoji: "📵", checked: false },
];

const TASKS_DOC = "challenge/tasks";
const TIMER_DOC = "challenge/timer";
const IS_ADMIN  = window.location.pathname.includes("admin");

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
  if (IS_ADMIN) document.body.classList.add("admin-mode");
  listenToTasks();
  listenToTimer();
  setTimeout(() => { if (loadingEl) loadingEl.classList.add("hidden"); }, 1000);
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
    li.innerHTML = `
      <div class="task-checkbox">
        <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
          <path d="M1.5 5L5 8.5L11.5 1.5" stroke="white" stroke-width="2.2"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <span class="task-emoji">${task.emoji}</span>
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
// Firestore stores: { startMs, durationMs, running }
//   startMs    = real clock time the timer was launched
//   durationMs = total length of the challenge in ms (e.g. 72h)
//   remaining  = durationMs - (now - startMs)
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
      const elapsed    = startMs ? Date.now() - startMs : 0;
      const remaining  = Math.max(0, durationMs - elapsed);
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
      timerSubline.textContent  = "🏁 Time's up!";
      timerSubline.style.color  = "var(--accent2)";
    } else {
      const totalH = Math.round(durationMs / 3600000);
      timerSubline.textContent  = `${totalH}h challenge · counting down`;
      timerSubline.style.color  = "";
    }
  }
}

// ---- Admin: launch countdown ----
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

// ---- Admin: stop timer ----
async function stopTimer() {
  if (!confirm("Pause the timer for all viewers?")) return;
  stopLocalTimer();
  const snap = await db.doc(TIMER_DOC).get();
  if (!snap.exists) return;
  const { startMs, durationMs } = snap.data();
  // Save elapsed so resume works correctly
  const elapsed    = Date.now() - startMs;
  // Store startMs offset so remaining = durationMs - elapsed is preserved
  await db.doc(TIMER_DOC).set({ startMs: Date.now() - elapsed, durationMs, running: false });
  showToast("⏸ Timer paused");
}

// ---- Admin: resume timer ----
async function resumeTimer() {
  const snap = await db.doc(TIMER_DOC).get();
  if (!snap.exists) { showToast("Launch a timer first"); return; }
  const { startMs, durationMs } = snap.data();
  await db.doc(TIMER_DOC).set({ startMs, durationMs, running: true });
  showToast("▶️ Timer resumed");
}

// ---- Admin: wipe timer ----
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
