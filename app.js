/* ============================================================================
   PerfCore Tracker — Application (Fixed Initialization)
   ========================================================================== */
(function () {
  'use strict';

  var STORAGE_KEY = 'perfcore:v1';
  var APP_VERSION = '1.0.0';
  var SAVE_DEBOUNCE_MS = 350;
  var MAX_ACTIVITY = 300;

  var VIEW_META = {
    home:      { title: 'Home',             subtitle: 'PerfCore — root-only Android performance module' },
    vision:    { title: 'Vision & Purpose', subtitle: 'Why PerfCore exists, who it\'s for, what success means' },
    how:       { title: 'How It Works',     subtitle: 'Android internals, sysfs, governors, LMK, ZRAM — explained' },
    roadmap:   { title: 'Roadmap',          subtitle: '16-week plan across 5 phases' },
    tasks:     { title: 'Tasks',            subtitle: 'Every task, filterable and assignable' },
    team:      { title: 'Team & Roles',     subtitle: 'Two members, clear ownership' },
    future:    { title: 'Future Plans',     subtitle: 'What comes after v1.0' },
    reference: { title: 'Sysfs Bible',      subtitle: 'Every tunable: path, value, verify, rollback' },
    testing:   { title: 'Testing',          subtitle: 'Benchmark methodology + phase checklists' },
    risks:     { title: 'Risks & Safety',   subtitle: 'What can go wrong, how we mitigate it' },
    activity:  { title: 'Activity Log',     subtitle: 'Every change, timestamped' },
    settings:  { title: 'Settings',         subtitle: 'Theme, project metadata, data management' }
  };

  var PHASE_META = {
    0: { name: 'Backlog',                    short: 'Backlog',  weeks: '',        dates: 'Unscheduled',   pillClass: 'pill' },
    1: { name: 'Phase 1 · Magisk skeleton',  short: 'Phase 1',  weeks: 'W1–W3',   dates: 'Weeks 1–3',     pillClass: 'pill-blue' },
    2: { name: 'Phase 2 · Core tuning',      short: 'Phase 2',  weeks: 'W4–W6',   dates: 'Weeks 4–6',     pillClass: 'pill-green' },
    3: { name: 'Phase 3 · GPU + thermal',    short: 'Phase 3',  weeks: 'W7–W9',   dates: 'Weeks 7–9',     pillClass: 'pill-yellow' },
    4: { name: 'Phase 4 · AI daemon',        short: 'Phase 4',  weeks: 'W10–W12', dates: 'Weeks 10–12',   pillClass: 'pill-purple' },
    5: { name: 'Phase 5 · UI + stress',      short: 'Phase 5',  weeks: 'W13–W16', dates: 'Weeks 13–16',   pillClass: 'pill-pink' }
  };

  var PRIORITY_META = {
    critical: { label: 'CRITICAL', class: 'pill-red' },
    high:     { label: 'HIGH',     class: 'pill-yellow' },
    medium:   { label: 'MEDIUM',   class: 'pill-blue' },
    low:      { label: 'LOW',      class: 'pill' }
  };

  var STATUS_ORDER = { in_progress: 0, blocked: 1, todo: 2, done: 3 };
  var PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

  var state = null;
  var saveTimer = null;
  var currentView = 'home';
  var currentDetailTaskId = null;
  var confirmCallback = null;
  var nextupFilterValue = 'all';

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function uid(prefix) { return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }
  function nowISO() { return new Date().toISOString(); }

  function formatTime(iso) {
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return iso || '';
      var mons = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
      return mons[d.getMonth()] + ' ' + pad(d.getDate()) + ', ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    } catch (e) { return String(iso || ''); }
  }

  function formatRelative(iso) {
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      var diff = Date.now() - d.getTime();
      var s = Math.floor(diff / 1000);
      if (s < 60) return 'just now';
      var m = Math.floor(s / 60);
      if (m < 60) return m + ' min ago';
      var h = Math.floor(m / 60);
      if (h < 24) return h + ' hour' + (h === 1 ? '' : 's') + ' ago';
      var days = Math.floor(h / 24);
      if (days < 7) return days + ' day' + (days === 1 ? '' : 's') + ' ago';
      return formatTime(iso);
    } catch (e) { return ''; }
  }

  function seedTasks() {
    var tasks = [];
    var counter = 1;
    function add(phase, week, title, opts) {
      opts = opts || {};
      var prefix = phase === 0 ? 'bl' : 'p' + phase;
      var numStr = '00' + (counter++);
      numStr = numStr.slice(-3);
      tasks.push({
        id: prefix + '-' + numStr,
        title: title, description: opts.desc || '', phase: phase, week: week,
        owner: opts.owner || '', status: opts.status || 'todo', priority: opts.priority || 'medium',
        estimate: (typeof opts.estimate === 'number') ? opts.estimate : null,
        tags: opts.tags || [], notes: '', createdAt: nowISO(), updatedAt: nowISO()
      });
    }
    add(1, 1, 'Create repo and folder structure', { owner: 'A', priority: 'high', estimate: 1, tags: ['setup'] });
    add(1, 1, 'Write module.prop', { owner: 'A', priority: 'high', estimate: 0.5, tags: ['magisk'] });
    add(1, 1, 'Write post-fs-data.sh (safe VM only)', { owner: 'A', priority: 'high', estimate: 2, tags: ['script', 'boot'] });
    add(1, 2, 'Write service.sh (schedutil rate_limit)', { owner: 'A', priority: 'high', estimate: 2, tags: ['script', 'cpu'] });
    add(1, 2, 'Write uninstall.sh (full revert)', { owner: 'A', priority: 'critical', estimate: 2, tags: ['script', 'safety'] });
    add(1, 2, 'Write bin/watchdog.sh (3-boot rollback)', { owner: 'A', priority: 'critical', estimate: 3, tags: ['safety', 'watchdog'] });
    add(1, 2, 'Write bin/snapshot-stock.sh', { owner: 'B', priority: 'high', estimate: 2, tags: ['safety', 'snapshot'] });
    add(1, 3, 'Flash test on A11 — confirm no bootloop', { owner: 'B', priority: 'critical', estimate: 1, tags: ['test', 'flash'] });
    add(1, 3, 'Reboot 10× stress test', { owner: 'B', priority: 'high', estimate: 1, tags: ['test', 'boot'] });
    add(1, 3, 'Verify watchdog: deliberate corrupt + 3 reboots', { owner: 'B', priority: 'critical', estimate: 1, tags: ['test', 'watchdog'] });
    add(1, 3, 'Verify uninstall restores stock', { owner: 'B', priority: 'critical', estimate: 1, tags: ['test', 'revert'] });
    add(1, 3, '24-hour soak test', { owner: 'B', priority: 'medium', estimate: 24, tags: ['test', 'soak'] });
    add(2, 4, 'Write bin/detect.sh → capabilities.json', { owner: 'A', priority: 'critical', estimate: 3, tags: ['script', 'detect'] });
    add(2, 4, 'Write bin/tune-cpu.sh', { owner: 'A', priority: 'high', estimate: 3, tags: ['script', 'cpu'] });
    add(2, 4, 'Write bin/tune-sched.sh', { owner: 'A', priority: 'high', estimate: 2, tags: ['script', 'sched'] });
    add(2, 5, 'Write bin/tune-mem.sh (LMK branch)', { owner: 'A', priority: 'critical', estimate: 4, tags: ['script', 'mem'] });
    add(2, 5, 'Write bin/tune-zram.sh', { owner: 'A', priority: 'high', estimate: 3, tags: ['script', 'zram'] });
    add(2, 5, 'Write bin/tune-io.sh', { owner: 'A', priority: 'high', estimate: 2, tags: ['script', 'io'] });
    add(2, 5, 'Write bin/revert-all.sh', { owner: 'A', priority: 'critical', estimate: 3, tags: ['script', 'safety'] });
    add(2, 5, 'Create config.json with per-section toggles',{ owner: 'A', priority: 'high', estimate: 1, tags: ['config'] });
    add(2, 6, 'Test each tune script individually on A11', { owner: 'B', priority: 'high', estimate: 4, tags: ['test'] });
    add(2, 6, 'Idempotency test (run twice, same state)', { owner: 'B', priority: 'high', estimate: 2, tags: ['test'] });
    add(2, 6, 'Verify LMK detection matches reality', { owner: 'B', priority: 'critical', estimate: 2, tags: ['test', 'mem'] });
    add(2, 6, 'Cold-start benchmark (Chrome, WhatsApp, Gallery)', { owner: 'B', priority: 'high', estimate: 2, tags: ['benchmark'] });
    add(2, 6, 'FPS benchmark — Subway Surfers', { owner: 'B', priority: 'medium', estimate: 1, tags: ['benchmark'] });
    add(2, 6, 'Verify uninstall restores all 6 categories', { owner: 'B', priority: 'critical', estimate: 1, tags: ['test', 'revert'] });
    add(3, 7, 'Write bin/tune-gpu.sh', { owner: 'A', priority: 'high', estimate: 3, tags: ['script', 'gpu'] });
    add(3, 7, 'Write bin/tune-thermal.sh', { owner: 'A', priority: 'critical', estimate: 3, tags: ['script', 'thermal'] });
    add(3, 8, 'Write bin/thermal-guard.sh', { owner: 'A', priority: 'critical', estimate: 3, tags: ['script', 'safety'] });
    add(3, 8, 'Write bin/sf-toggle.sh (SurfaceFlinger)', { owner: 'A', priority: 'medium', estimate: 1, tags: ['script', 'render'] });
    add(3, 8, 'Create gaming profile in profiles/sdm450_a11.json', { owner: 'A', priority: 'high', estimate: 2, tags: ['profile'] });
    add(3, 9, 'Test GPU governor default (msm-adreno-tz)', { owner: 'B', priority: 'high', estimate: 1, tags: ['test', 'gpu'] });
    add(3, 9, 'Test gaming detection triggers performance', { owner: 'B', priority: 'high', estimate: 1, tags: ['test', 'gpu'] });
    add(3, 9, 'Test auto-revert on gaming exit', { owner: 'B', priority: 'high', estimate: 1, tags: ['test', 'gpu'] });
    add(3, 9, '10-min Subway Surfers — no thermal emergency',{ owner: 'B', priority: 'critical', estimate: 1, tags: ['test', 'thermal'] });
    add(3, 9, 'Manual thermal override → auto-revert test', { owner: 'B', priority: 'critical', estimate: 1, tags: ['test', 'thermal'] });
    add(3, 9, 'Verify trip points raised by exactly +5 °C', { owner: 'B', priority: 'high', estimate: 1, tags: ['test', 'thermal'] });
    add(4, 10, 'Design TFLite model architecture', { owner: 'B', priority: 'high', estimate: 3, tags: ['ai', 'design'] });
    add(4, 10, 'Write ai-engine/train.py', { owner: 'B', priority: 'high', estimate: 4, tags: ['ai', 'python'] });
    add(4, 10, 'Collect 2 weeks of features on A11', { owner: 'B', priority: 'high', estimate: 8, tags: ['ai', 'dataset'] });
    add(4, 10, 'Train + export model.tflite (< 2 MB)', { owner: 'B', priority: 'high', estimate: 3, tags: ['ai', 'model'] });
    add(4, 11, 'Write bin/perfcore-daemon (Kotlin/Go)', { owner: 'A', priority: 'critical', estimate: 8, tags: ['ai', 'daemon'] });
    add(4, 11, 'Write TFLite inference wrapper', { owner: 'A', priority: 'high', estimate: 4, tags: ['ai', 'tflite'] });
    add(4, 11, 'Implement rule-based fallback (conf < 0.7)', { owner: 'A', priority: 'high', estimate: 2, tags: ['ai', 'fallback'] });
    add(4, 11, 'Design Room DB schema for per-app memory', { owner: 'A', priority: 'medium', estimate: 2, tags: ['ai', 'db'] });
    add(4, 12, 'Test daemon launches at boot', { owner: 'B', priority: 'high', estimate: 1, tags: ['test', 'ai'] });
    add(4, 12, 'Test inference time < 15 ms', { owner: 'B', priority: 'high', estimate: 1, tags: ['test', 'ai'] });
    add(4, 12, 'Test GAMING profile switch', { owner: 'B', priority: 'high', estimate: 1, tags: ['test', 'ai'] });
    add(4, 12, 'Test THERMAL_EMERGENCY trigger', { owner: 'B', priority: 'critical', estimate: 1, tags: ['test', 'ai'] });
    add(4, 12, 'Verify per-app memory persists across reboot',{ owner: 'B', priority: 'medium', estimate: 1, tags: ['test', 'ai'] });
    add(5, 13, 'Set up Kotlin + Compose app skeleton', { owner: 'A', priority: 'high', estimate: 4, tags: ['ui', 'kotlin'] });
    add(5, 13, 'Write libsu root shell wrapper', { owner: 'A', priority: 'high', estimate: 3, tags: ['ui', 'libsu'] });
    add(5, 13, 'Build live stats screen (CPU/GPU/RAM/temp)',{ owner: 'A', priority: 'high', estimate: 6, tags: ['ui', 'compose'] });
    add(5, 14, 'Build profile selector UI', { owner: 'A', priority: 'high', estimate: 4, tags: ['ui', 'compose'] });
    add(5, 14, 'Build per-app memory browser', { owner: 'A', priority: 'medium', estimate: 4, tags: ['ui', 'db'] });
    add(5, 14, 'Build log viewer (applied.log formatted)', { owner: 'A', priority: 'medium', estimate: 3, tags: ['ui', 'log'] });
    add(5, 14, 'Design UI mockups in Figma', { owner: 'B', priority: 'high', estimate: 4, tags: ['design'] });
    add(5, 15, 'Write benchmark methodology doc', { owner: 'B', priority: 'medium', estimate: 3, tags: ['docs'] });
    add(5, 15, 'Sign release APK', { owner: 'A', priority: 'high', estimate: 1, tags: ['release'] });
    add(5, 15, 'Run full stress test suite', { owner: 'B', priority: 'critical', estimate: 4, tags: ['test', 'stress'] });
    add(5, 16, 'Final integration test — all 5 phases', { owner: 'B', priority: 'critical', estimate: 3, tags: ['test', 'integration'] });
    add(5, 16, 'Ship v1.0', { owner: 'A', priority: 'critical', estimate: 1, tags: ['release'] });
    return tasks;
  }

  function createDefaultState() {
    return {
      version: 1,
      project: { name: 'PerfCore', github: '', start: '', week: 1 },
      members: { A: { name: 'Member A' }, B: { name: 'Member B' } },
      tasks: seedTasks(),
      activity: [{ id: uid('act'), text: 'Project workspace initialized — PerfCore tracker ready.', time: nowISO(), kind: 'success' }],
      features: { cpu: true, sched: true, mem: true, zram: true, io: true, gpu: true, thermal: true, render: true, ai: true, ui: true },
      settings: { theme: 'dark', reduceMotion: false },
      lastSaved: null
    };
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createDefaultState();
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return createDefaultState();
      var def = createDefaultState();
      var merged = Object.assign({}, def, parsed);
      merged.project  = Object.assign({}, def.project,  parsed.project  || {});
      merged.members  = Object.assign({}, def.members,  parsed.members  || {});
      merged.settings = Object.assign({}, def.settings, parsed.settings || {});
      merged.features = Object.assign({}, def.features, parsed.features || {});
      if (!Array.isArray(merged.tasks))    merged.tasks = def.tasks;
      if (!Array.isArray(merged.activity)) merged.activity = def.activity;
      return merged;
    } catch (e) {
      console.warn('Failed to load state, using defaults:', e);
      return createDefaultState();
    }
  }

  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    setSaveIndicator('saving');
    saveTimer = setTimeout(function () { saveTimer = null; writeState(); }, SAVE_DEBOUNCE_MS);
  }

  function saveNow() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    writeState();
  }

  function writeState() {
    try {
      state.lastSaved = nowISO();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setSaveIndicator('saved');
    } catch (e) {
      setSaveIndicator('error');
    }
  }

  function setSaveIndicator(mode) {
    var el = $('#save-indicator'), txt = $('#save-text');
    if (!el || !txt) return;
    el.classList.remove('is-saving', 'is-error');
    if (mode === 'saving') { el.classList.add('is-saving'); txt.textContent = 'Saving…'; }
    else if (mode === 'error') { el.classList.add('is-error'); txt.textContent = 'Error'; }
    else { txt.textContent = 'Saved'; }
  }

  function toast(msg, kind) {
    kind = kind || 'info';
    var container = $('#toast-container');
    if (!container) return;
    var t = document.createElement('div');
    t.className = 'toast' + (kind === 'warn' ? ' is-warn' : kind === 'danger' ? ' is-danger' : '');
    t.innerHTML = '<span class="toast-icon">' + (kind === 'warn' ? '!' : kind === 'danger' ? '×' : '✓') + '</span><span class="toast-msg">' + esc(msg) + '</span>';
    container.appendChild(t);
    setTimeout(function () {
      t.classList.add('is-leaving');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 240);
    }, 2600);
  }

  function hideBootOverlay() {
    var boot = $('#boot-overlay');
    if (!boot) return;
    setTimeout(function () {
      boot.classList.add('is-hidden');
      setTimeout(function () { if (boot.parentNode) boot.parentNode.removeChild(boot); }, 500);
    }, 260);
  }

  function getViewIdFromHash() {
    var hash = (location.hash || '').replace(/^#/, '').trim();
    return (hash && VIEW_META[hash]) ? hash : 'home';
  }

  function navigate(viewId, opts) {
    opts = opts || {};
    if (!VIEW_META[viewId]) viewId = 'home';
    currentView = viewId;
    $$('.view').forEach(function (v) { v.hidden = v.getAttribute('data-view') !== viewId; });
    $$('.nav-item').forEach(function (n) { n.classList.toggle('active', n.getAttribute('data-nav') === viewId); });
    
    var meta = VIEW_META[viewId];
    var titleEl = $('#view-title'), subEl = $('#view-subtitle');
    if (titleEl) titleEl.textContent = meta.title;
    if (subEl) subEl.textContent = meta.subtitle;
    
    if (opts.scrollToTop !== false) {
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, 0); }
    }
    
    if (viewId === 'tasks')    renderTasksView();
    if (viewId === 'home')     { renderStats(); renderNextUp(); renderDashActivity(); }
    if (viewId === 'activity') renderFullActivity();
    if (viewId === 'team')     renderTeamStats();
    if (viewId === 'roadmap')  renderRoadmapStatuses();
  }

  function handleHashChange() { navigate(getViewIdFromHash()); }

  function applyTheme(theme) {
    var resolved = theme;
    if (theme === 'auto') resolved = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', resolved === 'light' ? 'light' : 'dark');
  }

  function applyReduceMotion(enabled) { document.documentElement.classList.toggle('reduce-motion', !!enabled); }

  function openSidebar() { if ($('#sidebar')) $('#sidebar').classList.add('is-open'); if ($('#sidebar-backdrop')) $('#sidebar-backdrop').classList.add('is-open'); }
  function closeSidebar() { if ($('#sidebar')) $('#sidebar').classList.remove('is-open'); if ($('#sidebar-backdrop')) $('#sidebar-backdrop').classList.remove('is-open'); }

  function computeStats() {
    var total = state.tasks.length, done = 0, blocked = 0, inProgress = 0;
    state.tasks.forEach(function (t) {
      if (t.status === 'done') done++;
      else if (t.status === 'blocked') blocked++;
      else if (t.status === 'in_progress') inProgress++;
    });
    return { total: total, done: done, blocked: blocked, inProgress: inProgress, pct: total > 0 ? Math.round((done / total) * 100) : 0, week: state.project.week || 1 };
  }

  function renderStats() {
    var s = computeStats();
    var set = function (id, v) { var el = $(id); if (el) el.textContent = v; };
    set('#stat-progress', s.pct); set('#stat-done', s.done); set('#stat-total', s.total);
    set('#stat-week', s.week); set('#stat-blocked', s.blocked); set('#stat-progress-tasks', s.inProgress);
    var bar = $('#bar-progress');
    if (bar) {
      bar.style.width = s.pct + '%';
      bar.classList.toggle('is-warn', s.pct >= 60 && s.pct < 90);
      bar.classList.toggle('is-danger', s.pct >= 90 && s.pct < 100);
    }
    var navCount = $('#nav-task-count');
    if (navCount) navCount.textContent = String(s.total - s.done);
  }

  function phaseStats(phaseId) {
    var inPhase = state.tasks.filter(function (t) { return t.phase === phaseId; });
    var total = inPhase.length, done = 0, blocked = 0, inProgress = 0;
    inPhase.forEach(function (t) {
      if (t.status === 'done') done++;
      else if (t.status === 'blocked') blocked++;
      else if (t.status === 'in_progress') inProgress++;
    });
    var status = total === 0 ? 'pending' : (done === total ? 'done' : (blocked > 0 ? 'blocked' : (inProgress > 0 || done > 0 ? 'in_progress' : 'pending')));
    return { total: total, done: done, pct: total > 0 ? Math.round((done / total) * 100) : 0, status: status };
  }

  function renderRoadmapStatuses() {
    [1, 2, 3, 4, 5].forEach(function (p) {
      var el = $('#rm-status-' + p);
      if (!el) return;
      var s = phaseStats(p);
      el.textContent = s.status === 'pending' ? 'pending' : s.status === 'in_progress' ? 'in progress' : s.status === 'done' ? 'done' : 'blocked';
      el.classList.remove('is-in_progress', 'is-done', 'is-blocked');
      if (s.status === 'in_progress') el.classList.add('is-in_progress');
      if (s.status === 'done')        el.classList.add('is-done');
      if (s.status === 'blocked')     el.classList.add('is-blocked');
    });
  }

  function getTaskById(id) {
    for (var i = 0; i < state.tasks.length; i++) { if (state.tasks[i].id === id) return state.tasks[i]; }
    return null;
  }

  function createTask(data) {
    var t = { id: 'p' + (data.phase || 0) + '-' + uid('t'), title: data.title, description: data.description || '', phase: data.phase || 1, week: data.week || 1, owner: data.owner || '', status: data.status || 'todo', priority: data.priority || 'medium', estimate: data.estimate, tags: data.tags || [], notes: data.notes || '', createdAt: nowISO(), updatedAt: nowISO() };
    state.tasks.push(t);
    addActivity('Created task "' + t.title + '".', 'info');
    scheduleSave();
    return t;
  }

  function updateTask(id, patch) {
    var t = getTaskById(id);
    if (!t) return null;
    var statusChanged = patch.status && patch.status !== t.status;
    Object.keys(patch).forEach(function (k) { t[k] = patch[k]; });
    t.updatedAt = nowISO();
    if (statusChanged && patch.status === 'done') addActivity('Completed "' + t.title + '".', 'success');
    else if (statusChanged && patch.status === 'blocked') addActivity('Blocked "' + t.title + '".', 'warn');
    else addActivity('Updated "' + t.title + '".', 'info');
    scheduleSave();
    return t;
  }

  function deleteTask(id) {
    var t = getTaskById(id);
    if (!t) return;
    state.tasks = state.tasks.filter(function (x) { return x.id !== id; });
    addActivity('Deleted task "' + t.title + '".', 'danger');
    scheduleSave();
  }

  function toggleTaskDone(id) {
    var t = getTaskById(id);
    if (t) updateTask(id, { status: t.status === 'done' ? 'todo' : 'done' });
  }

  function getFilters() {
    return {
      status:  ($('#filter-status')  || {}).value || 'all',
      owner:   ($('#filter-owner')   || {}).value || 'all',
      phase:   ($('#filter-phase')   || {}).value || 'all',
      search:  (($('#filter-search') || {}).value || '').trim().toLowerCase()
    };
  }

  function matchesFilters(task, f) {
    if (f.status !== 'all' && task.status !== f.status) return false;
    if (f.owner !== 'all') {
      if (f.owner === 'unassigned') { if (task.owner) return false; }
      else if (task.owner !== f.owner) return false;
    }
    if (f.phase !== 'all' && String(task.phase) !== String(f.phase)) return false;
    if (f.search) {
      var hay = [task.title || '', task.description || '', task.notes || '', (task.tags || []).join(' ')].join(' ').toLowerCase();
      if (hay.indexOf(f.search) === -1) return false;
    }
    return true;
  }

  function taskRowHTML(t) {
    var phase = PHASE_META[t.phase] || PHASE_META[0];
    var pri = PRIORITY_META[t.priority] || PRIORITY_META.medium;
    var ownerClass = t.owner === 'A' ? 'is-a' : t.owner === 'B' ? 'is-b' : 'is-unassigned';
    var ownerLabel = t.owner ? t.owner : '·';
    var hoursText = t.estimate ? 'Est ' + t.estimate + 'h' : '';
    var tagsHTML = (t.tags && t.tags.length) ? '<div class="task-tags">' + t.tags.map(function (tag) { return '<span>' + esc(tag) + '</span>'; }).join('') + '</div>' : '';
    var checked = t.status === 'done' ? ' checked' : '';
    return '<li class="task-card" data-task-id="' + esc(t.id) + '" data-status="' + esc(t.status) + '">' +
      '<div class="task-main">' +
        '<label class="check"><input type="checkbox" data-action="toggle-done"' + checked + ' /><span class="check-box"></span></label>' +
        '<div class="task-body" data-action="open-detail">' +
          '<div class="task-title">' + esc(t.title) + '</div>' +
          '<div class="task-meta">' +
            '<span class="pill pill-sm ' + phase.pillClass + '">' + esc(phase.short) + '</span>' +
            '<span class="pill pill-sm ' + pri.class + '">' + pri.label + '</span>' +
            '<span class="owner-badge ' + ownerClass + '">' + esc(ownerLabel) + '</span>' +
            (hoursText ? '<span class="muted small">' + esc(hoursText) + '</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="task-actions"><button class="icon-btn" data-action="edit" title="Edit task"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M4 20 h4 L20 8 l-4-4 L4 16 z" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/></svg></button></div>' +
      '</div>' + tagsHTML + '</li>';
  }

  function sortTasksWithinPhase(tasks) {
    return tasks.slice().sort(function (a, b) {
      var so = (STATUS_ORDER[a.status] || 9) - (STATUS_ORDER[b.status] || 9);
      if (so !== 0) return so;
      var po = (PRIORITY_ORDER[a.priority] || 9) - (PRIORITY_ORDER[b.priority] || 9);
      if (po !== 0) return po;
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    });
  }

  function renderTasksView() {
    var container = $('#tasks-container');
    if (!container) return;
    var f = getFilters();
    var filtered = state.tasks.filter(function (t) { return matchesFilters(t, f); });
    var html = '', phaseOrder = [1, 2, 3, 4, 5, 0];

    phaseOrder.forEach(function (p) {
      var phaseMeta = PHASE_META[p];
      var inPhase = filtered.filter(function (t) { return t.phase === p; });
      var stats = phaseStats(p);
      if (inPhase.length === 0 && f.phase !== 'all' && String(p) !== f.phase) return;
      if (inPhase.length === 0 && f.status !== 'all') return;
      if (inPhase.length === 0 && f.search) return;
      if (inPhase.length === 0 && p === 0) return;
      var sorted = sortTasksWithinPhase(inPhase);
      var tasksHTML = sorted.map(taskRowHTML).join('');
      html += '<section class="phase-block" data-phase="' + p + '">' +
        '<header class="phase-block-head"><div class="phase-title-wrap"><span class="phase-marker"></span>' +
        '<div><h3 class="phase-title">' + esc(phaseMeta.name) + '</h3>' +
        '<p class="muted small phase-dates">' + esc(phaseMeta.dates) + ' · ' + stats.done + ' / ' + stats.total + ' done</p></div></div>' +
        '<div class="phase-progress-wrap"><div class="progress progress-md"><div class="progress-fill" style="width:' + stats.pct + '%"></div></div>' +
        '<span class="muted small phase-progress-label">' + stats.pct + '%</span></div></header>' +
        '<ul class="task-list phase-task-list">' + tasksHTML + '</ul></section>';
    });

    if (!html) html = '<div class="empty-state"><p class="muted">No tasks match the current filters. <a href="#" class="link" id="clear-filters-inline">Clear filters</a></p></div>';
    container.innerHTML = html;
    var inlineClear = $('#clear-filters-inline');
    if (inlineClear) inlineClear.addEventListener('click', function (e) { e.preventDefault(); clearFilters(); });
    renderRoadmapStatuses();
  }

  function clearFilters() {
    if ($('#filter-status')) $('#filter-status').value = 'all';
    if ($('#filter-owner')) $('#filter-owner').value = 'all';
    if ($('#filter-phase')) $('#filter-phase').value = 'all';
    if ($('#filter-search')) $('#filter-search').value = '';
    renderTasksView();
  }

  function renderNextUp() {
    var list = $('#nextup-list');
    if (!list) return;
    var filter = nextupFilterValue || 'all';
    var pool = state.tasks.filter(function (t) {
      if (t.status === 'done') return false;
      if (filter === 'all') return true;
      if (filter === 'unassigned') return !t.owner;
      return t.owner === filter;
    });
    pool = pool.slice().sort(function (a, b) {
      var so = (STATUS_ORDER[a.status] || 9) - (STATUS_ORDER[b.status] || 9);
      if (so !== 0) return so;
      if (a.phase !== b.phase) return a.phase - b.phase;
      var po = (PRIORITY_ORDER[a.priority] || 9) - (PRIORITY_ORDER[b.priority] || 9);
      if (po !== 0) return po;
      return (a.week || 99) - (b.week || 99);
    });
    var top = pool.slice(0, 6);
    list.innerHTML = top.length === 0 ? '<li class="empty">Nothing queued for this filter.</li>' : top.map(taskRowHTML).join('');
  }

  function renderDashActivity() {
    var list = $('#dash-activity');
    if (!list) return;
    var items = (state.activity || []).slice(-5).reverse();
    list.innerHTML = items.length === 0 ? '<li class="empty">No activity yet.</li>' : items.map(activityHTML).join('');
  }

  function renderFullActivity() {
    var list = $('#activity-full');
    if (!list) return;
    var items = (state.activity || []).slice().reverse();
    list.innerHTML = items.length === 0 ? '<li class="empty">No activity yet. Mark a task done to see entries here.</li>' : items.map(activityHTML).join('');
  }

  function activityHTML(a) {
    var dotClass = a.kind === 'warn' ? 'is-warn' : a.kind === 'danger' ? 'is-danger' : '';
    return '<li class="activity-item"><span class="activity-dot ' + dotClass + '"></span>' +
      '<div class="activity-body"><div class="activity-text">' + esc(a.text) + '</div>' +
      '<div class="muted small activity-time" title="' + esc(formatTime(a.time)) + '">' + esc(formatRelative(a.time)) + '</div></div></li>';
  }

  function addActivity(text, kind) {
    if (!text) return;
    state.activity.push({ id: uid('act'), text: text, time: nowISO(), kind: kind || 'info' });
    if (state.activity.length > MAX_ACTIVITY) state.activity = state.activity.slice(-MAX_ACTIVITY);
    renderDashActivity();
    if (currentView === 'activity') renderFullActivity();
  }

  function renderTeamStats() {
    ['A', 'B'].forEach(function (member) {
      var assigned = 0, inProg = 0, done = 0, hours = 0;
      state.tasks.forEach(function (t) {
        if (t.owner !== member) return;
        if (t.status === 'done') { done++; return; }
        assigned++;
        if (t.status === 'in_progress') inProg++;
        if (typeof t.estimate === 'number') hours += t.estimate;
      });
      var set = function (id, v) { var el = $(id); if (el) el.textContent = v; };
      set('#member-' + member.toLowerCase() + '-assigned', assigned);
      set('#member-' + member.toLowerCase() + '-progress', inProg);
      set('#member-' + member.toLowerCase() + '-done', done);
      set('#member-' + member.toLowerCase() + '-hours', hours + 'h');
      set('#member-' + member.toLowerCase() + '-display', state.members[member].name || ('Member ' + member));
    });
  }

  function applyFeatureToggles() {
    $$('[data-feature-toggle]').forEach(function (input) {
      var key = input.getAttribute('data-feature-toggle');
      if (key in state.features) input.checked = !!state.features[key];
    });
  }

  function filterReference() {
    var q = (($('#ref-search') || {}).value || '').trim().toLowerCase();
    var cat = (($('#ref-category') || {}).value || 'all');
    $$('#reference-container .ref-card').forEach(function (card) {
      var catMatch = (cat === 'all') || (card.getAttribute('data-cat') === cat);
      var textMatch = !q || card.textContent.toLowerCase().indexOf(q) !== -1;
      card.hidden = !(catMatch && textMatch);
    });
  }

  function openModal(modal) {
    if (!modal) return;
    modal.hidden = false;
    requestAnimationFrame(function () { modal.classList.add('is-open'); });
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('is-open');
    setTimeout(function () { modal.hidden = true; }, 220);
  }

  function openTaskModal(task) {
    var modal = $('#modal-task');
    if (!modal) return;
    if (task) {
      if ($('#task-modal-title')) $('#task-modal-title').textContent = 'Edit task';
      $('#task-id').value = task.id; $('#task-title').value = task.title || ''; $('#task-desc').value = task.description || '';
      $('#task-phase').value = String(task.phase == null ? 1 : task.phase); $('#task-week').value = task.week || 1;
      $('#task-owner').value = task.owner || ''; $('#task-status').value = task.status || 'todo'; $('#task-priority').value = task.priority || 'medium';
      $('#task-est').value = (task.estimate == null ? '' : task.estimate); $('#task-tags').value = (task.tags || []).join(', '); $('#task-notes').value = task.notes || '';
    } else {
      if ($('#task-modal-title')) $('#task-modal-title').textContent = 'New task';
      $('#task-id').value = ''; $('#task-form').reset();
      $('#task-phase').value = String(1); $('#task-week').value = state.project.week || 1;
      $('#task-status').value = 'todo'; $('#task-priority').value = 'medium';
    }
    openModal(modal);
    setTimeout(function () { $('#task-title').focus(); }, 100);
  }

  function readTaskForm() {
    var tagsRaw = ($('#task-tags') || {}).value || '';
    var estRaw = ($('#task-est') || {}).value;
    var estimate = (estRaw === '' || estRaw == null) ? null : Number(estRaw);
    if (estimate !== null && (isNaN(estimate) || estimate < 0)) estimate = null;
    return {
      title: (($('#task-title') || {}).value || '').trim(), description: (($('#task-desc') || {}).value || '').trim(),
      phase: Number(($('#task-phase') || {}).value || 1), week: Number(($('#task-week') || {}).value || 1),
      owner: (($('#task-owner') || {}).value || ''), status: (($('#task-status') || {}).value || 'todo'),
      priority: (($('#task-priority') || {}).value || 'medium'), estimate: estimate,
      tags: tagsRaw.split(',').map(function (s) { return s.trim(); }).filter(Boolean), notes: (($('#task-notes') || {}).value || '').trim()
    };
  }

  function handleTaskFormSubmit(e) {
    e.preventDefault();
    var data = readTaskForm();
    if (!data.title) { toast('Title is required.', 'warn'); $('#task-title').focus(); return; }
    var id = ($('#task-id') || {}).value;
    if (id) { updateTask(id, data); toast('Task updated.', 'info'); }
    else { createTask(data); toast('Task created.', 'info'); }
    closeModal($('#modal-task'));
    renderTasksView(); renderStats(); renderNextUp(); renderTeamStats(); renderRoadmapStatuses();
  }

  function openDetailModal(taskId) {
    var t = getTaskById(taskId);
    if (!t) return;
    currentDetailTaskId = t.id;
    var phase = PHASE_META[t.phase] || PHASE_META[0], pri = PRIORITY_META[t.priority] || PRIORITY_META.medium;
    if ($('#detail-pill')) { $('#detail-pill').className = 'pill ' + phase.pillClass; $('#detail-pill').textContent = phase.short; }
    if ($('#detail-title')) $('#detail-title').textContent = t.title;
    if ($('#detail-desc')) $('#detail-desc').textContent = t.description || 'No description.';
    if ($('#detail-meta')) {
      $('#detail-meta').innerHTML = [
        ['Status', t.status], ['Priority', pri.label], ['Owner', t.owner ? ('Member ' + t.owner) : 'Unassigned'],
        ['Week', 'W' + (t.week || '—')], ['Estimate', t.estimate != null ? (t.estimate + ' h') : '—'], ['Updated', formatTime(t.updatedAt)]
      ].map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('');
    }
    if ($('#detail-tags')) $('#detail-tags').innerHTML = (t.tags || []).map(function (tag) { return '<span>' + esc(tag) + '</span>'; }).join('');
    if ($('#detail-notes')) $('#detail-notes').value = t.notes || '';
    openModal($('#modal-detail'));
  }

  function openConfirm(title, message, onOk) {
    var modal = $('#modal-confirm');
    if (!modal) return;
    if ($('#confirm-title')) $('#confirm-title').textContent = title || 'Are you sure?';
    if ($('#confirm-message')) $('#confirm-message').textContent = message || '';
    confirmCallback = typeof onOk === 'function' ? onOk : null;
    openModal(modal);
  }

  function exportJSON() {
    saveNow();
    try {
      var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = 'perfcore-backup-' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + '.json';
      document.body.appendChild(a); a.click();
      setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
      addActivity('Exported JSON backup.', 'info'); scheduleSave(); toast('Backup downloaded.', 'info');
    } catch (e) { toast('Export failed.', 'danger'); }
  }

  function importJSON(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var parsed = JSON.parse(reader.result);
        if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.tasks)) throw new Error('Invalid format');
        openConfirm('Import this backup?', 'This will replace all current tasks, activity, and settings with the imported file. Continue?', function () {
          var def = createDefaultState();
          var merged = Object.assign({}, def, parsed);
          merged.project  = Object.assign({}, def.project,  parsed.project  || {});
          merged.members  = Object.assign({}, def.members,  parsed.members  || {});
          merged.settings = Object.assign({}, def.settings, parsed.settings || {});
          merged.features = Object.assign({}, def.features, parsed.features || {});
          if (!Array.isArray(merged.activity)) merged.activity = [];
          state = merged;
          saveNow(); applyTheme(state.settings.theme || 'dark'); applyReduceMotion(state.settings.reduceMotion); applyFeatureToggles(); hydrateSettingsUI();
          renderStats(); renderNextUp(); renderDashActivity(); renderFullActivity(); renderTeamStats(); renderTasksView(); renderRoadmapStatuses();
          addActivity('Imported JSON backup (' + state.tasks.length + ' tasks).', 'success'); scheduleSave(); toast('Backup imported.', 'info');
        });
      } catch (err) { toast('Invalid backup file.', 'danger'); }
    };
    reader.readAsText(file);
  }

  function hydrateSettingsUI() {
    if ($('#theme-select')) $('#theme-select').value = state.settings.theme || 'dark';
    if ($('#reduce-motion')) $('#reduce-motion').checked = !!state.settings.reduceMotion;
    if ($('#project-name')) $('#project-name').value = state.project.name || 'PerfCore';
    if ($('#project-github')) $('#project-github').value = state.project.github || '';
    if ($('#project-start')) $('#project-start').value = state.project.start || '';
    if ($('#project-week')) $('#project-week').value = state.project.week || 1;
    if ($('#member-a-name')) $('#member-a-name').value = state.members.A.name || 'Member A';
    if ($('#member-b-name')) $('#member-b-name').value = state.members.B.name || 'Member B';
    if ($('#app-version')) $('#app-version').textContent = APP_VERSION;
    if ($('#app-version-footer')) $('#app-version-footer').textContent = APP_VERSION;
  }

  function bindEvents() {
    document.addEventListener('click', function (e) {
      var target = e.target;
      var navEl = target.closest('[data-nav]');
      if (navEl) { e.preventDefault(); var viewId = navEl.getAttribute('data-nav'); if (VIEW_META[viewId]) { location.hash = '#' + viewId; closeSidebar(); } return; }
      var closeBtn = target.closest('[data-close-modal]');
      if (closeBtn) { e.preventDefault(); var modal = closeBtn.closest('.modal'); if (modal) closeModal(modal); return; }
      var actionEl = target.closest('[data-action]');
      if (actionEl) {
        var action = actionEl.getAttribute('data-action'), card = actionEl.closest('.task-card'), taskId = card ? card.getAttribute('data-task-id') : null;
        if (taskId) {
          if (action === 'open-detail') openDetailModal(taskId);
          else if (action === 'edit') { var t = getTaskById(taskId); if (t) openTaskModal(t); }
        }
        return;
      }
      if (target.closest('#sidebar-open'))  { openSidebar();  return; }
      if (target.closest('#sidebar-close')) { closeSidebar(); return; }
      if (target.closest('#sidebar-backdrop')) { closeSidebar(); return; }
      if (target.closest('#btn-add-task'))  { openTaskModal(null); return; }
      if (target.closest('#btn-export') || target.closest('#btn-export-2')) { exportJSON(); return; }
      if (target.closest('#btn-import')) { if ($('#import-file')) $('#import-file').click(); return; }
      if (target.closest('#btn-reset-tasks')) {
        openConfirm('Reset all task states?', 'Every task will be reset to its seeded starting state. Custom tasks will be removed. This cannot be undone.', function () {
          state.tasks = seedTasks(); addActivity('Reset tasks to seeded starting state.', 'warn'); saveNow();
          renderTasksView(); renderStats(); renderNextUp(); renderTeamStats(); renderRoadmapStatuses(); toast('Tasks reset.', 'info');
        });
        return;
      }
      if (target.closest('#btn-clear-all')) {
        openConfirm('Wipe all data?', 'Every task, activity entry, setting, and custom name will be wiped. This cannot be undone.', function () {
          state = createDefaultState(); saveNow(); applyTheme(state.settings.theme); applyReduceMotion(state.settings.reduceMotion); applyFeatureToggles(); hydrateSettingsUI();
          renderStats(); renderNextUp(); renderDashActivity(); renderFullActivity(); renderTeamStats(); renderTasksView(); renderRoadmapStatuses(); toast('Workspace reset.', 'info');
        });
        return;
      }
      if (target.closest('#btn-clear-activity')) {
        openConfirm('Clear activity log?', 'All activity entries will be permanently removed.', function () {
          state.activity = []; saveNow(); renderDashActivity(); renderFullActivity(); toast('Activity cleared.', 'info');
        });
        return;
      }
      if (target.closest('#btn-clear-filters')) { clearFilters(); return; }
      if (target.closest('#confirm-ok')) { var cb = confirmCallback; confirmCallback = null; closeModal($('#modal-confirm')); if (cb) setTimeout(cb, 180); return; }
      if (target.closest('#detail-edit')) { var dt = getTaskById(currentDetailTaskId); if (dt) { closeModal($('#modal-detail')); setTimeout(function () { openTaskModal(dt); }, 220); } return; }
      if (target.closest('#detail-delete')) {
        var del = getTaskById(currentDetailTaskId);
        if (del) openConfirm('Delete this task?', 'Delete "' + del.title + '"? This cannot be undone.', function () {
          deleteTask(currentDetailTaskId); closeModal($('#modal-detail')); renderTasksView(); renderStats(); renderNextUp(); renderTeamStats(); renderRoadmapStatuses(); toast('Task deleted.', 'info');
        });
        return;
      }
    });

    document.addEventListener('change', function (e) {
      var target = e.target;
      if (target.matches('input[data-action="toggle-done"]')) {
        var card = target.closest('.task-card'), id = card && card.getAttribute('data-task-id');
        if (id) { toggleTaskDone(id); renderTasksView(); renderStats(); renderNextUp(); renderTeamStats(); renderRoadmapStatuses(); }
        return;
      }
      if (target.matches('[data-feature-toggle]')) {
        var key = target.getAttribute('data-feature-toggle');
        if (key in state.features) { state.features[key] = !!target.checked; addActivity('Feature "' + key + '" ' + (target.checked ? 'enabled' : 'disabled') + '.', target.checked ? 'success' : 'warn'); scheduleSave(); toast('Feature toggled.', 'info'); }
        return;
      }
      if (target.id === 'theme-select') { state.settings.theme = target.value; applyTheme(state.settings.theme); scheduleSave(); return; }
      if (target.id === 'reduce-motion') { state.settings.reduceMotion = !!target.checked; applyReduceMotion(state.settings.reduceMotion); scheduleSave(); return; }
      if (target.id === 'project-name') { state.project.name = target.value; scheduleSave(); return; }
      if (target.id === 'project-github') { state.project.github = target.value; scheduleSave(); return; }
      if (target.id === 'project-start') { state.project.start = target.value; scheduleSave(); return; }
      if (target.id === 'project-week') {
        var w = Number(target.value);
        if (!isNaN(w) && w >= 1 && w <= 16) { state.project.week = w; renderStats(); scheduleSave(); }
        return;
      }
      if (target.id === 'member-a-name') { state.members.A.name = target.value || 'Member A'; renderTeamStats(); scheduleSave(); return; }
      if (target.id === 'member-b-name') { state.members.B.name = target.value || 'Member B'; renderTeamStats(); scheduleSave(); return; }
      if (target.id === 'detail-notes') {
        if (currentDetailTaskId) { var t = getTaskById(currentDetailTaskId); if (t) { t.notes = target.value; t.updatedAt = nowISO(); scheduleSave(); } }
        return;
      }
      if (target.id === 'import-file') {
        var f = target.files && target.files[0]; if (f) importJSON(f); target.value = ''; return;
      }
    });

    document.addEventListener('input', function (e) {
      if (e.target.id === 'filter-search') renderTasksView();
      if (e.target.id === 'ref-search') filterReference();
    });

    ['filter-status', 'filter-owner', 'filter-phase'].forEach(function (id) { if ($('#' + id)) $('#' + id).addEventListener('change', renderTasksView); });
    if ($('#nextup-filter')) $('#nextup-filter').addEventListener('change', function (e) { nextupFilterValue = e.target.value || 'all'; renderNextUp(); });
    if ($('#ref-category')) $('#ref-category').addEventListener('change', filterReference);
    if ($('#task-form')) $('#task-form').addEventListener('submit', handleTaskFormSubmit);

    window.addEventListener('hashchange', handleHashChange);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var open = $$('.modal.is-open');
        if (open.length > 0) closeModal(open[open.length - 1]);
      }
    });
    window.addEventListener('resize', function () { if (window.innerWidth > 1000) closeSidebar(); });
    window.addEventListener('beforeunload', function () { try { saveNow(); } catch (e) {} });
    window.addEventListener('storage', function (e) {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          var incoming = JSON.parse(e.newValue);
          if (incoming && incoming.tasks) {
            state = incoming; applyTheme(state.settings.theme || 'dark'); applyReduceMotion(state.settings.reduceMotion);
            applyFeatureToggles(); hydrateSettingsUI(); renderStats(); renderNextUp(); renderDashActivity();
            renderFullActivity(); renderTeamStats(); renderTasksView(); renderRoadmapStatuses();
          }
        } catch (err) {}
      }
    });
  }

  function init() {
    try {
      state = loadState();
      applyTheme(state.settings.theme || 'dark');
      applyReduceMotion(state.settings.reduceMotion);
      hydrateSettingsUI();
      bindEvents();
      applyFeatureToggles();
      renderStats();
      renderNextUp();
      renderDashActivity();
      renderFullActivity();
      renderTeamStats();
      renderTasksView();
      renderRoadmapStatuses();
      navigate(getViewIdFromHash(), { scrollToTop: false });
      window.addEventListener('pagehide', function () { try { saveNow(); } catch (e) {} });
    } catch (e) {
      console.error('Initialization error:', e);
    } finally {
      // Ensure the boot screen always goes away
      hideBootOverlay();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
