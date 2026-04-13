// ============================================
// app.js  –  Win Challenge Tracker
// ============================================

// ============================================
// 🔐 PASSWORDS  –  change these!
// ============================================
const ADMIN_PASSWORD = "win2024";       // Admin panel password
// Viewer early-access password is stored in Firestore (set via admin panel)

// ============================================
// 📋 DEFAULT TASKS
// icon = emoji string OR image path/URL
// ============================================
const DEFAULT_TASKS = [
  { id: "task_01", label: "Lorem ipsum dolor sit amet consectetur",      icon: "🔥", checked: false },
  { id: "task_02", label: "Adipiscing elit sed do eiusmod tempor",        icon: "⚡", checked: false },
  { id: "task_03", label: "Incididunt ut labore et dolore magna aliqua",  icon: "💪", checked: false },
  { id: "task_04", label: "Ut enim ad minim veniam quis nostrud",         icon: "🎯", checked: false },
  { id: "task_05", label: "Exercitation ullamco laboris nisi aliquip",    icon: "🏋️", checked: false },
  { id: "task_06", label: "Duis aute irure dolor in reprehenderit",       icon: "📚", checked: false },
  { id: "task_07", label: "Voluptate velit esse cillum dolore eu fugiat", icon: "🧘", checked: false },
  { id: "task_08", label: "Nulla pariatur excepteur sint occaecat",       icon: "💧", checked: false },
  { id: "task_09", label: "Cupidatat non proident sunt in culpa",         icon: "🥗", checked: false },
  { id: "task_10", label: "Qui officia deserunt mollit anim id est",      icon: "😴", checked: false },
  { id: "task_11", label: "Laborum perspiciatis unde omnis iste natus",   icon: "🚶", checked: false },
  { id: "task_12", label: "Nemo enim ipsam voluptatem quia voluptas",     icon: "📵", checked: false },
];

// ---- Firestore paths ----
const TASKS_DOC    = "challenge/tasks";
const TIMER_DOC    = "challenge/timer";
const SETTINGS_DOC = "challenge/settings"; // launchMs, viewerPassword

// ---- Page detection ----
const IS_ADMIN = window.location.pathname.includes("admin");

// ---- DOM refs ----
const timerDisplay = document.getElementById("timer-display");
const timerSubline = document.getElementById("timer-subline");
const taskList     = document.getElementById("task-list");
const progressText = document.getElementById("progress-text");
const progressFill = document.getElementById("progress-fill");
const loadingEl    = document.getElementById("loading");

let timerInterval  = null;
let timerStarted   = false;

// Holds the current tasks array (used by the editor)
let currentTasks   = [];

// ============================================
// INIT
// ============================================
async function init() {
  if (IS_ADMIN) {
    document.body.classList.add("admin-mode");
    if (sessionStorage.getItem("adminUnlocked") === "yes") {
      showAdminContent();
      startApp();
    } else {
      if (loadingEl) loadingEl.classList.add("hidden");
    }
  } else {
    // Viewer: check launch gate first
    startApp();
  }
}

function startApp() {
  if (IS_ADMIN) {
    listenToSettings(); // load existing settings into admin inputs
  } else {
    listenToLaunchGate(); // check if site is locked
  }
  listenToTasks();
  listenToTimer();
  setTimeout(() => { if (loadingEl) loadingEl.classList.add("hidden"); }, 1000);
}

// ============================================
// ADMIN PASSWORD GATE
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
  if (content) { content.style.display = "flex"; }
}

// ============================================
// LAUNCH GATE  (viewer side)
// ============================================
// Listens to settings in real-time.
// If launchMs is in the future → show overlay countdown.
// If launchMs is in the past or not set → open site normally.
// ============================================

let launchInterval = null; // countdown tick

function listenToLaunchGate() {
  db.doc(SETTINGS_DOC).onSnapshot((snap) => {
    const data = snap.exists ? snap.data() : {};
    const launchMs       = data.launchMs       || null;
    const viewerPassword = data.viewerPassword || "";

    // If viewer already unlocked this session → skip gate
    if (sessionStorage.getItem("viewerUnlocked") === "yes") {
      hideLaunchOverlay();
      return;
    }

    const now = Date.now();

    if (!launchMs || now >= launchMs) {
      // No countdown set, or time has passed → open site
      hideLaunchOverlay();
    } else {
      // Show countdown overlay
      showLaunchOverlay(launchMs, viewerPassword);
    }
  });
}

function showLaunchOverlay(launchMs, viewerPassword) {
  const overlay = document.getElementById("launch-overlay");
  if (overlay) overlay.classList.add("active");

  // Clear any existing interval
  if (launchInterval) clearInterval(launchInterval);

  function tick() {
    const remaining = launchMs - Date.now();
    if (remaining <= 0) {
      clearInterval(launchInterval);
      hideLaunchOverlay();
      return;
    }
    const d = Math.floor(remaining / 86400000);
    const h = Math.floor((remaining % 86400000) / 3600000);
    const m = Math.floor((remaining % 3600000)  / 60000);
    const s = Math.floor((remaining % 60000)    / 1000);
    const pad = n => String(n).padStart(2, "0");
    const el = id => document.getElementById(id);
    if (el("cd-days"))  el("cd-days").textContent  = pad(d);
    if (el("cd-hours")) el("cd-hours").textContent = pad(h);
    if (el("cd-mins"))  el("cd-mins").textContent  = pad(m);
    if (el("cd-secs"))  el("cd-secs").textContent  = pad(s);
  }

  tick();
  launchInterval = setInterval(tick, 1000);

  // Store viewer password in closure for the unlock button
  window._viewerPassword = viewerPassword;
}

function hideLaunchOverlay() {
  const overlay = document.getElementById("launch-overlay");
  if (overlay) {
    overlay.classList.add("fade-out");
    setTimeout(() => { overlay.style.display = "none"; }, 600);
  }
  if (launchInterval) clearInterval(launchInterval);
}

function checkViewerPassword() {
  const input = document.getElementById("viewer-pw-input");
  const error = document.getElementById("viewer-pw-error");
  if (!input) return;

  const storedPw = window._viewerPassword || "";

  // If no password is set, unlock button does nothing useful
  if (!storedPw) { error.textContent = "No early-access password set."; return; }

  if (input.value === storedPw) {
    sessionStorage.setItem("viewerUnlocked", "yes");
    hideLaunchOverlay();
  } else {
    error.textContent = "❌ Wrong password";
    input.value = "";
    input.focus();
    const card = document.querySelector(".launch-card");
    if (card) { card.classList.add("shake"); setTimeout(() => card.classList.remove("shake"), 500); }
  }
}

// ============================================
// SETTINGS  (admin side)
// ============================================
function listenToSettings() {
  db.doc(SETTINGS_DOC).onSnapshot((snap) => {
    if (!snap.exists) return;
    const { launchMs, viewerPassword } = snap.data();

    // Fill the launch date input
    const launchInput = document.getElementById("launch-date-input");
    if (launchInput && launchMs) {
      // Convert ms timestamp to "YYYY-MM-DDTHH:MM" format for datetime-local input
      const d = new Date(launchMs);
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
                      .toISOString().slice(0, 16);
      launchInput.value = local;
    }

    // Fill the viewer password input
    const vpInput = document.getElementById("viewer-pw-set");
    if (vpInput && viewerPassword !== undefined) {
      vpInput.value = viewerPassword;
    }

    // Update status text
    const status = document.getElementById("launch-date-status");
    if (status && launchMs) {
      const d = new Date(launchMs);
      if (Date.now() >= launchMs) {
        status.textContent = `✅ Site is LIVE — launch was ${d.toLocaleString()}`;
        status.style.color = "var(--success)";
      } else {
        status.textContent = `⏳ Countdown active — opens ${d.toLocaleString()}`;
        status.style.color = "var(--accent)";
      }
    } else if (status) {
      status.textContent = "No launch date set — site is publicly visible.";
      status.style.color = "var(--text-muted)";
    }
  });
}

async function saveLaunchDate() {
  const input = document.getElementById("launch-date-input");
  if (!input || !input.value) { showToast("⚠️ Pick a date first"); return; }
  const launchMs = new Date(input.value).getTime();
  await db.doc(SETTINGS_DOC).set({ launchMs }, { merge: true });
  showToast("📅 Launch date saved!");
}

async function clearLaunchDate() {
  if (!confirm("Remove the countdown? The site will be visible to everyone immediately.")) return;
  await db.doc(SETTINGS_DOC).set({ launchMs: null }, { merge: true });
  const status = document.getElementById("launch-date-status");
  if (status) { status.textContent = "No launch date set — site is publicly visible."; status.style.color = "var(--text-muted)"; }
  document.getElementById("launch-date-input").value = "";
  showToast("✅ Countdown removed");
}

async function saveViewerPassword() {
  const input = document.getElementById("viewer-pw-set");
  const pw = input ? input.value.trim() : "";
  await db.doc(SETTINGS_DOC).set({ viewerPassword: pw }, { merge: true });
  const status = document.getElementById("viewer-pw-status");
  if (status) {
    status.textContent = pw ? `✅ Early-access password set to "${pw}"` : "✅ Early-access password cleared";
    status.style.color = "var(--success)";
  }
  showToast("🔓 Viewer password saved!");
}

// ============================================
// TASKS  –  real-time listener
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
    currentTasks = tasks;
    renderTasks(tasks);
    if (IS_ADMIN) renderTaskEditor(tasks);
  }, (err) => {
    console.error("Tasks error:", err);
    showToast("⚠️ Database connection failed");
  });
}

// ---- Render icon: emoji or image ----
function renderIcon(icon) {
  if (icon && (icon.includes("/") || icon.endsWith(".png") || icon.endsWith(".jpg") || icon.endsWith(".gif") || icon.startsWith("http"))) {
    return `<img class="task-img" src="${icon}" alt="icon" />`;
  }
  return `<span class="task-emoji">${icon || "⭐"}</span>`;
}

// ---- Render the live task list ----
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
      ${renderIcon(task.icon || task.emoji)}
      <span class="task-label">${task.label}</span>
    `;
    if (IS_ADMIN) li.addEventListener("click", () => toggleTask(currentTasks, task.id));
    taskList.appendChild(li);
  });
}

// ---- Render the task EDITOR (admin only) ----
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

      <!-- Icon preview + input -->
      <div class="task-editor-icon-wrap">
        <div class="task-editor-icon-preview" id="preview-${index}">
          ${renderIcon(task.icon || task.emoji || "⭐")}
        </div>
        <input
          class="task-editor-icon-input"
          type="text"
          value="${task.icon || task.emoji || ""}"
          placeholder="🔥 or icons/img.png"
          oninput="updateIconPreview(${index}, this.value)"
          data-field="icon"
        />
      </div>

      <!-- Label input -->
      <input
        class="task-editor-label-input"
        type="text"
        value="${task.label}"
        placeholder="Task description..."
        data-field="label"
      />

      <!-- Remove button -->
      <button class="task-editor-remove" onclick="removeTaskRow(${index})" title="Remove task">✕</button>
    `;
    container.appendChild(row);
  });
}

// Live-preview the icon as the admin types
function updateIconPreview(index, value) {
  const preview = document.getElementById(`preview-${index}`);
  if (preview) preview.innerHTML = renderIcon(value || "⭐");
}

// Collect all editor rows and save to Firestore
async function saveEditedTasks() {
  const rows = document.querySelectorAll(".task-editor-row");
  const updated = [];

  rows.forEach((row, i) => {
    const iconInput  = row.querySelector("[data-field='icon']");
    const labelInput = row.querySelector("[data-field='label']");
    const icon  = iconInput  ? iconInput.value.trim()  : "⭐";
    const label = labelInput ? labelInput.value.trim() : "Task";
    // Preserve checked state from currentTasks if index matches
    const existing = currentTasks[i] || {};
    updated.push({
      id:      existing.id || "task_" + String(Date.now() + i),
      label:   label || "Task",
      icon:    icon  || "⭐",
      checked: existing.checked || false,
    });
  });

  try {
    await db.doc(TASKS_DOC).set({ tasks: updated });
    showToast("💾 Tasks saved!");
  } catch (e) {
    showToast("❌ Failed to save tasks");
  }
}

// Add a blank row to the editor (doesn't save until "Save All" is pressed)
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
      <div class="task-editor-icon-preview" id="preview-${index}">
        ${renderIcon("⭐")}
      </div>
      <input
        class="task-editor-icon-input"
        type="text"
        value=""
        placeholder="🔥 or icons/img.png"
        oninput="updateIconPreview(${index}, this.value)"
        data-field="icon"
      />
    </div>
    <input
      class="task-editor-label-input"
      type="text"
      value=""
      placeholder="Task description..."
      data-field="label"
    />
    <button class="task-editor-remove" onclick="removeTaskRow(${index})" title="Remove task">✕</button>
  `;
  container.appendChild(row);
}

// Remove a row visually (re-numbers remaining rows)
function removeTaskRow(index) {
  const container = document.getElementById("task-editor-list");
  if (!container) return;
  const rows = container.querySelectorAll(".task-editor-row");
  if (rows[index]) rows[index].remove();
  // Re-number remaining rows
  container.querySelectorAll(".task-editor-row").forEach((r, i) => {
    const num = r.querySelector(".task-editor-num");
    if (num) num.textContent = i + 1;
    r.dataset.index = i;
  });
}

async function toggleTask(tasks, taskId) {
  const updated = tasks.map(t => t.id === taskId ? { ...t, checked: !t.checked } : t);
  try {
    await db.doc(TASKS_DOC).set({ tasks: updated });
    showToast("✅ Saved!");
  } catch (e) { showToast("❌ Failed to save"); }
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
// CHALLENGE TIMER  –  countdown
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
  }, (err) => console.error("Timer error:", err));
}

function startLocalCountdown(startMs, durationMs) {
  if (timerStarted) return;
  timerStarted = true;
  function tick() {
    const remaining = Math.max(0, durationMs - (Date.now() - startMs));
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
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = n => String(n).padStart(2, "0");
  if (timerDisplay) timerDisplay.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
  if (timerSubline) {
    if (totalSeconds <= 0) {
      timerSubline.textContent = "🏁 Time's up!";
      timerSubline.style.color = "var(--accent2)";
    } else {
      timerSubline.textContent = `${Math.round(durationMs / 3600000)}h challenge · counting down`;
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
  if (!confirm("Clear the timer completely?")) return;
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
