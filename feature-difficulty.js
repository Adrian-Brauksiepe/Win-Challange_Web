(function () {

  const DIFFICULTIES = ['easy', 'medium', 'hard'];

  const DIFF_STYLES = {
    easy:   { label: 'Easy',   color: '#48c774', bg: 'rgba(72,199,116,0.12)'  },
    medium: { label: 'Medium', color: '#f0c040', bg: 'rgba(240,192,64,0.12)'  },
    hard:   { label: 'Hard',   color: '#e07830', bg: 'rgba(224,120,48,0.12)'  },
  };

  const WEIGHTS = { easy: 1, medium: 2, hard: 3 };

  // ---- Inject CSS ----
  const css = `
    .diff-badge {
      display: inline-flex;
      align-items: center;
      font-size: 0.62rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      padding: 2px 7px;
      border-radius: 99px;
      border: 1px solid;
      flex-shrink: 0;
      line-height: 1.4;
    }

    /* Weighted progress bar override */
    #progress-fill.weighted {
      transition: width 0.5s ease;
    }

    /* Difficulty selector in admin task editor */
    .task-editor-diff-select {
      background: var(--surface2);
      border: 1px solid var(--border);
      color: var(--text);
      font-family: 'DM Sans', sans-serif;
      font-size: 0.78rem;
      padding: 5px 8px;
      border-radius: 7px;
      outline: none;
      cursor: pointer;
      width: 100%;
      margin-top: 4px;
    }
    .task-editor-diff-select:focus { border-color: var(--accent); }
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ---- Helper: render badge HTML ----
  function badgeHtml(difficulty) {
    const d = DIFF_STYLES[difficulty];
    if (!d) return '';
    return `<span class="diff-badge" style="color:${d.color};background:${d.bg};border-color:${d.color}40">${d.label}</span>`;
  }

  // ---- Patch renderTasks: inject badge into each task item ----
  // We use a MutationObserver to react whenever the task list re-renders.
  function observeTaskList() {
    const taskList = document.getElementById('task-list');
    if (!taskList) { setTimeout(observeTaskList, 400); return; }

    // Run once immediately, then on every re-render
    function patchBadges() {
      if (!window.currentTasks) return;
      taskList.querySelectorAll('.task-item').forEach(li => {
        const id   = li.dataset.id;
        const task = window.currentTasks.find(t => t.id === id);
        if (!task || !task.difficulty) return;
        // Don't add twice
        if (li.querySelector('.diff-badge')) return;
        const badge = document.createElement('span');
        badge.outerHTML; // dummy
        const labelEl = li.querySelector('.task-label');
        if (!labelEl) return;
        labelEl.insertAdjacentHTML('afterend', badgeHtml(task.difficulty));
      });
      updateWeightedProgress();
    }

    const mo = new MutationObserver(patchBadges);
    mo.observe(taskList, { childList: true, subtree: false });
    patchBadges();
  }

  // ---- Weighted progress bar ----
  function updateWeightedProgress() {
    const tasks = window.currentTasks;
    if (!tasks || !tasks.length) return;
    const fill = document.getElementById('progress-fill');
    const text = document.getElementById('progress-text');
    if (!fill || !text) return;

    // If no task has difficulty set, fall back to normal counting
    const hasDiff = tasks.some(t => t.difficulty);
    if (!hasDiff) return;

    const totalWeight = tasks.reduce((s, t) => s + (WEIGHTS[t.difficulty] || 1), 0);
    const doneWeight  = tasks.filter(t => t.checked).reduce((s, t) => s + (WEIGHTS[t.difficulty] || 1), 0);
    const pct         = totalWeight ? (doneWeight / totalWeight) * 100 : 0;

    fill.style.width = pct + '%';
    fill.classList.add('weighted');

    const done  = tasks.filter(t => t.checked).length;
    const total = tasks.length;
    text.textContent = `${done} / ${total}`;
  }

  // ---- Patch task editor: add difficulty dropdown to each row ----
  function patchTaskEditor() {
    const container = document.getElementById('task-editor-list');
    if (!container) return;

    const mo = new MutationObserver(() => {
      container.querySelectorAll('.task-editor-row').forEach((row) => {
        if (row.querySelector('.task-editor-diff-select')) return; // already patched
        const index    = parseInt(row.dataset.index, 10);
        const task     = window.currentTasks ? window.currentTasks[index] : null;
        const current  = task ? (task.difficulty || '') : '';
        const fieldsEl = row.querySelector('.task-editor-fields');
        if (!fieldsEl) return;

        const select = document.createElement('select');
        select.className   = 'task-editor-diff-select';
        select.dataset.field = 'difficulty';
        select.innerHTML   = `
          <option value="">── No Difficulty ──</option>
          <option value="easy"   ${current==='easy'   ? 'selected':''}>🟢 Easy   (1pt)</option>
          <option value="medium" ${current==='medium' ? 'selected':''}>🟡 Medium (2pt)</option>
          <option value="hard"   ${current==='hard'   ? 'selected':''}>🔴 Hard   (3pt)</option>
        `;
        fieldsEl.appendChild(select);
      });
    });

    mo.observe(container, { childList: true });
    // Run once in case rows already exist
    container.querySelectorAll('.task-editor-row').forEach(row => {
      if (row.querySelector('.task-editor-diff-select')) return;
      const index   = parseInt(row.dataset.index, 10);
      const task    = window.currentTasks ? window.currentTasks[index] : null;
      const current = task ? (task.difficulty || '') : '';
      const fieldsEl = row.querySelector('.task-editor-fields');
      if (!fieldsEl) return;
      const select = document.createElement('select');
      select.className     = 'task-editor-diff-select';
      select.dataset.field = 'difficulty';
      select.innerHTML     = `
        <option value="">── No Difficulty ──</option>
        <option value="easy"   ${current==='easy'   ? 'selected':''}>🟢 Easy   (1pt)</option>
        <option value="medium" ${current==='medium' ? 'selected':''}>🟡 Medium (2pt)</option>
        <option value="hard"   ${current==='hard'   ? 'selected':''}>🔴 Hard   (3pt)</option>
      `;
      fieldsEl.appendChild(select);
    });
  }

  // ---- Patch saveEditedTasks to include difficulty ----
  // We wrap the existing function to pick up the difficulty field.
  function patchSaveEditedTasks() {
    if (typeof window.saveEditedTasks !== 'function') { setTimeout(patchSaveEditedTasks, 400); return; }
    const original = window.saveEditedTasks;
    window.saveEditedTasks = async function () {
      // Before calling original, ensure difficulty is read from our selects
      // by temporarily mapping data-field selects (original reads data-field already)
      await original();
    };

    // Also patch the data collector inside saveEditedTasks by monkey-patching
    // db.doc().set — instead, we intercept at the Firestore write level:
    const origSet = db.doc(window.TASKS_DOC || 'challenge/tasks').set.bind(
      db.doc(window.TASKS_DOC || 'challenge/tasks')
    );
    // Cleaner approach: override saveEditedTasks fully
    window.saveEditedTasks = async function () {
      const rows    = document.querySelectorAll('.task-editor-row');
      const updated = [];
      rows.forEach((row, i) => {
        const get  = f => (row.querySelector(`[data-field='${f}']`)?.value || '').trim();
        const existing = window.currentTasks ? (window.currentTasks[i] || {}) : {};
        updated.push({
          id:             existing.id             || 'task_' + String(Date.now() + i),
          label:          get('label')            || 'Task',
          icon:           get('icon')             || '⭐',
          tooltip:        get('tooltip')          || '',
          difficulty:     get('difficulty')       || '',
          checked:        existing.checked        || false,
          timerMs:        existing.timerMs        || 0,
          timerRunning:   existing.timerRunning   || false,
          timerStartedAt: existing.timerStartedAt || null,
        });
      });
      try {
        await db.doc('challenge/tasks').set({ tasks: updated });
        // showToast is defined in app.js
        if (typeof showToast === 'function') showToast('💾 Tasks saved!');
      } catch (e) {
        if (typeof showToast === 'function') showToast('❌ Failed to save tasks');
      }
    };
  }

  // ---- Init ----
  function init() {
    observeTaskList();
    if (window.location.pathname.includes('admin')) {
      // Wait for task editor to be rendered
      const waitEditor = setInterval(() => {
        if (document.getElementById('task-editor-list')) {
          clearInterval(waitEditor);
          patchTaskEditor();
          patchSaveEditedTasks();
          // Re-patch when admin content becomes visible
          const mo = new MutationObserver(() => patchTaskEditor());
          mo.observe(document.getElementById('task-editor-list'), { childList: true });
        }
      }, 400);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();