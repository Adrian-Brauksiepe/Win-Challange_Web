
(function () {

  // All sounds generated via Web Audio API — no audio files needed
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  let ctx = null;
  let enabled = localStorage.getItem('wc_sound') !== 'off';

  function getCtx() {
    if (!ctx) ctx = new AudioContext();
    return ctx;
  }

  // ---- Sound: satisfying checkbox tick ----
  function playTick() {
    if (!enabled) return;
    try {
      const ac  = getCtx();
      const osc = ac.createOscillator();
      const env = ac.createGain();
      osc.connect(env); env.connect(ac.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ac.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ac.currentTime + 0.08);
      env.gain.setValueAtTime(0.3, ac.currentTime);
      env.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.12);
      osc.start(ac.currentTime);
      osc.stop(ac.currentTime + 0.12);
    } catch (e) {}
  }

  // ---- Sound: task timer start (soft blip) ----
  function playTimerStart() {
    if (!enabled) return;
    try {
      const ac  = getCtx();
      const osc = ac.createOscillator();
      const env = ac.createGain();
      osc.connect(env); env.connect(ac.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(660, ac.currentTime);
      env.gain.setValueAtTime(0.15, ac.currentTime);
      env.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.09);
      osc.start(ac.currentTime);
      osc.stop(ac.currentTime + 0.09);
    } catch (e) {}
  }

  // ---- Sound: task timer stop (lower blip) ----
  function playTimerStop() {
    if (!enabled) return;
    try {
      const ac  = getCtx();
      const osc = ac.createOscillator();
      const env = ac.createGain();
      osc.connect(env); env.connect(ac.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(330, ac.currentTime);
      env.gain.setValueAtTime(0.15, ac.currentTime);
      env.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.09);
      osc.start(ac.currentTime);
      osc.stop(ac.currentTime + 0.09);
    } catch (e) {}
  }

  // ---- Sound: all tasks complete — fanfare ----
  function playFanfare() {
    if (!enabled) return;
    try {
      const ac    = getCtx();
      const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
      notes.forEach((freq, i) => {
        const osc = ac.createOscillator();
        const env = ac.createGain();
        osc.connect(env); env.connect(ac.destination);
        osc.type = 'triangle';
        const t = ac.currentTime + i * 0.13;
        osc.frequency.setValueAtTime(freq, t);
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(0.28, t + 0.04);
        env.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.start(t);
        osc.stop(t + 0.36);
      });
    } catch (e) {}
  }

  // ---- Expose globally so app.js hooks can call them ----
  window.WCSounds = { playTick, playTimerStart, playTimerStop, playFanfare };

  // ---- Hook into existing app.js events via MutationObserver ----
  // Watches the task list for class changes (checked/unchecked) and
  // watches timer buttons for active class changes.
  function observe() {
    const taskList = document.getElementById('task-list');
    if (!taskList) { setTimeout(observe, 500); return; }

    let prevChecked = new Set();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach(m => {
        // Task item checked/unchecked
        if (m.target.classList && m.target.classList.contains('task-item')) {
          const id      = m.target.dataset.id;
          const checked = m.target.classList.contains('checked');
          if (checked && !prevChecked.has(id)) {
            prevChecked.add(id);
            playTick();
            // Check if ALL tasks are now checked
            const all   = taskList.querySelectorAll('.task-item');
            const done  = taskList.querySelectorAll('.task-item.checked');
            if (all.length > 0 && all.length === done.length) {
              setTimeout(playFanfare, 200); // slight delay after confetti triggers
            }
          } else if (!checked) {
            prevChecked.delete(id);
          }
        }
        // Timer button start/stop
        if (m.target.classList && m.target.classList.contains('ttbtn-start')) {
          if (m.target.classList.contains('active')) playTimerStart();
          else playTimerStop();
        }
      });
    });

    // Seed initial checked state
    taskList.querySelectorAll('.task-item.checked').forEach(el => prevChecked.add(el.dataset.id));

    observer.observe(taskList, {
      attributes:    true,
      attributeFilter: ['class'],
      subtree:       true
    });
  }

  // ---- Inject CSS + toggle button ----
  const css = `
    #sound-toggle {
      background: var(--surface2);
      border: 1px solid var(--border);
      color: var(--text-muted);
      font-family: 'DM Sans', sans-serif;
      font-size: 0.75rem;
      padding: 6px 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    #sound-toggle:hover { border-color: var(--accent); color: var(--accent); }
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  function injectToggle() {
    const statusBar = document.querySelector('.status-bar');
    if (!statusBar || document.getElementById('sound-toggle')) return;
    const btn = document.createElement('button');
    btn.id        = 'sound-toggle';
    btn.className = 'btn-mini';
    btn.textContent = enabled ? '🔊 Sound On' : '🔇 Sound Off';
    btn.onclick = () => {
      // Unlock AudioContext on first user gesture
      if (ctx && ctx.state === 'suspended') ctx.resume();
      enabled = !enabled;
      localStorage.setItem('wc_sound', enabled ? 'on' : 'off');
      btn.textContent = enabled ? '🔊 Sound On' : '🔇 Sound Off';
    };
    statusBar.appendChild(btn);
  }

  function init() {
    injectToggle();
    observe();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();