// App controller: UI, interactions, and state pipeline
// Exports: App

export const App = (() => {
  let Algorithms, Storage, Charts;
  let project = null;

  // ---------- Utilities ----------
  function toast(msg, ms = 2500) {
    const box = document.getElementById('toaster');
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(() => el.remove(), ms);
  }

  function clamp01(x) { return Math.max(0, Math.min(1, x)); }

  function parseProbInput(s) {
    if (typeof s !== 'string') return 0;
    s = s.trim();
    if (!s) return 0;
    // percent
    if (s.endsWith('%')) {
      const v = parseFloat(s.slice(0, -1));
      if (!Number.isFinite(v)) return 0;
      return clamp01(v / 100);
    }
    // fraction a/b
    if (s.includes('/')) {
      const [a, b] = s.split('/').map(x => parseFloat(x.trim()));
      if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return 0;
      return clamp01(a / b);
    }
    // decimal or scientific
    const v = parseFloat(s);
    if (!Number.isFinite(v)) return 0;
    if (v > 1) return clamp01(v); // allow >1 temporarily (user error) -> clamp
    if (v < 0) return 0;
    return v;
  }

  function fmt(p) {
    const fmtType = project?.settings?.numberFormat || 'percent';
    const digits = project?.settings?.round ?? 2;
    if (fmtType === 'percent') return `${(p * 100).toFixed(digits)}%`;
    return p.toFixed(digits);
  }

  function ensureRedo(project) { if (!Array.isArray(project.redo)) project.redo = []; }

  function currentPost() {
    const t = project.timeline;
    return t[t.length - 1];
  }

  function recomputeFromStart() {
    try {
      const priors = normalizeHypothesisPriors();
      // Set timeline[0]
      project.timeline = [priors];
      ensureRedo(project);
      // Replay history
      for (const step of project.history) {
        stepApplyNoRecord(step);
      }
      save();
      renderAll();
    } catch (e) {
      console.error(e);
      toast('Recompute failed: ' + e.message);
    }
  }

  function save() { Storage.saveProject(project).catch(err => console.error(err)); }

  // ---------- Setup (Hypotheses + Priors) ----------
  function renderSetup() {
    const tbody = document.getElementById('hypo-rows');
    tbody.innerHTML = '';
    for (const h of project.hypotheses) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="text" value="${h.label}" aria-label="Label"></td>
        <td><input type="text" value="${fmt(h.prior)}" aria-label="Prior"></td>
        <td style="text-align:right; display:flex; gap:.25rem; justify-content:flex-end;">
          <button class="secondary" data-act="up" title="Move up">↑</button>
          <button class="secondary" data-act="down" title="Move down">↓</button>
          <button class="secondary" data-act="del">Delete</button>
        </td>
      `;
      const [labelInput, priorInput] = tr.querySelectorAll('input');
      labelInput.addEventListener('change', () => { h.label = labelInput.value || h.label; save(); renderResults(); });
      priorInput.addEventListener('change', () => { h.prior = parseProbInput(priorInput.value); save(); updatePriorsSummary(); });
      tr.querySelector('button[data-act="del"]').addEventListener('click', () => {
        if (project.hypotheses.length <= 1) { toast('Need at least one hypothesis'); return; }
        project.hypotheses = project.hypotheses.filter(x => x !== h);
        recomputeFromStart();
      });
      tr.querySelector('button[data-act="up"]').addEventListener('click', () => {
        const idx = project.hypotheses.indexOf(h);
        if (idx > 0) {
          const tmp = project.hypotheses[idx-1];
          project.hypotheses[idx-1] = project.hypotheses[idx];
          project.hypotheses[idx] = tmp;
          recomputeFromStart();
        }
      });
      tr.querySelector('button[data-act="down"]').addEventListener('click', () => {
        const idx = project.hypotheses.indexOf(h);
        if (idx < project.hypotheses.length - 1) {
          const tmp = project.hypotheses[idx+1];
          project.hypotheses[idx+1] = project.hypotheses[idx];
          project.hypotheses[idx] = tmp;
          recomputeFromStart();
        }
      });
      tbody.appendChild(tr);
    }
    updatePriorsSummary();
  }

  function updatePriorsSummary() {
    const el = document.getElementById('priors-summary');
    const sum = project.hypotheses.reduce((a, h) => a + (isFinite(h.prior) ? h.prior : 0), 0);
    el.textContent = `Sum of priors: ${fmt(sum)} (will be normalized on update)`;
  }

  function normalizeHypothesisPriors() {
    const priors = project.hypotheses.map(h => clamp01(h.prior ?? 0));
    const sum = priors.reduce((a, b) => a + b, 0);
    const norm = sum > 0 ? priors.map(v => v / sum) : priors.map(() => 1 / priors.length);
    // write back
    for (let i = 0; i < project.hypotheses.length; i++) project.hypotheses[i].prior = norm[i];
    return norm;
  }

  function onAddHypothesis() {
    project.hypotheses.push({ id: rnd(), label: `H${project.hypotheses.length + 1}`, prior: 1 });
    recomputeFromStart();
  }

  function onNormalizePriors() {
    normalizeHypothesisPriors();
    recomputeFromStart();
  }

  // ---------- Evidence: Certain ----------
  function renderEvidenceCertain() {
    const tbody = document.getElementById('likelihood-rows');
    tbody.innerHTML = '';
    for (const h of project.hypotheses) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${h.label}</td><td><input type="text" value="" aria-label="P(E|${h.label})"></td>`;
      tbody.appendChild(tr);
    }
  }

  function onApplyEvidenceCertain() {
    const inputs = document.querySelectorAll('#likelihood-rows input');
    const L = Array.from(inputs).map(i => clamp01(parseProbInput(i.value)));
    if (L.length !== project.hypotheses.length) { toast('Mismatch in likelihood entries'); return; }
    try {
      const next = Algorithms.bayesUpdate(currentPost(), L);
      project.timeline.push(next);
      project.history.push({ type: 'certain', L, at: Date.now() });
      ensureRedo(project); project.redo = [];
      save();
      document.getElementById('evidence-message').textContent = 'Evidence applied.';
      renderResults(); renderHistory();
    } catch (e) {
      console.error(e); toast('Update failed: ' + e.message);
    }
  }

  // ---------- Evidence: Jeffrey ----------
  function renderEvidenceJeffrey() {
    const catsBody = document.getElementById('jeffrey-cats');
    const head = document.getElementById('jeffrey-like-head');
    const body = document.getElementById('jeffrey-like-body');
    catsBody.innerHTML = '';
    head.innerHTML = '';
    body.innerHTML = '';

    // Start with two categories by default if none exist in UI memory
    const cats = [{ label: 'Positive', w: '50%' }, { label: 'Negative', w: '50%' }];
    cats.forEach(c => addCatRow(c.label, c.w));
    buildLikeTable();

    function addCatRow(label = '', w = '') {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td><input type="text" value="${label}" aria-label="Category"></td>
                      <td><input type="text" value="${w}" aria-label="Target weight"></td>
                      <td style="text-align:right"><button class="secondary" data-act="del">Delete</button></td>`;
      catsBody.appendChild(tr);
    }

    function buildLikeTable() {
      const catLabels = Array.from(catsBody.querySelectorAll('tr')).map(tr => tr.querySelector('input').value || 'Cat');
      // header
      const cols = catLabels.map(l => `<th>${l}</th>`).join('');
      head.innerHTML = `<tr><th>Hypothesis</th>${cols}</tr>`;
      // rows
      body.innerHTML = '';
      for (const h of project.hypotheses) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${h.label}</td>` + catLabels.map(() => `<td><input type="text" value="" aria-label="P(Category|${h.label})"></td>`).join('');
        body.appendChild(tr);
      }
    }

    document.getElementById('btn-add-cat').onclick = () => { addCatRow('', ''); buildLikeTable(); };
    document.getElementById('btn-normalize-cats').onclick = () => {
      const rows = Array.from(catsBody.querySelectorAll('tr'));
      const wInputs = rows.map(r => r.querySelectorAll('input')[1]);
      const ws = wInputs.map(i => parseProbInput(i.value));
      const s = ws.reduce((a,b)=>a+b,0);
      const out = s>0? ws.map(v=>v/s): ws.map(()=> 1/ws.length);
      wInputs.forEach((i,idx)=> i.value = fmt(out[idx]));
    };
  }

  function onApplyEvidenceJeffrey() {
    const catsRows = document.querySelectorAll('#jeffrey-cats tr');
    if (catsRows.length < 2) { toast('Add at least two categories.'); return; }
    const catLabels = Array.from(catsRows).map(tr => tr.querySelector('input').value || 'Cat');
    const wInputs = Array.from(catsRows).map(tr => tr.querySelectorAll('input')[1]);
    const qRaw = wInputs.map(i => parseProbInput(i.value));
    const qSum = qRaw.reduce((a,b)=>a+b,0);
    const q = qSum>0? qRaw.map(v=>v/qSum): qRaw.map(()=>1/qRaw.length);

    const likeRows = document.querySelectorAll('#jeffrey-like-body tr');
    const likeMatrix = Array.from(likeRows).map(tr => {
      const inputs = tr.querySelectorAll('input');
      const vals = Array.from(inputs).map(i => clamp01(parseProbInput(i.value)));
      const s = vals.reduce((a,b)=>a+b,0);
      return s>0? vals.map(v=>v/s): vals.map(()=> 1/vals.length);
    });

    try {
      const next = Algorithms.jeffreyUpdate(currentPost(), likeMatrix, q);
      project.timeline.push(next);
      project.history.push({ type: 'jeffrey', cats: catLabels, q, likeMatrix, at: Date.now() });
      ensureRedo(project); project.redo = [];
      save();
      document.getElementById('evidence-message').textContent = 'Jeffrey evidence applied.';
      renderResults(); renderHistory();
    } catch (e) {
      console.error(e); toast('Jeffrey update failed: ' + e.message);
    }
  }

  // ---------- Results ----------
  function renderResults() {
    // Table
    const tbody = document.getElementById('results-rows');
    tbody.innerHTML = '';
    const post = currentPost();
    project.hypotheses.forEach((h, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${h.label}</td><td>${fmt(post[i])}</td>`;
      tbody.appendChild(tr);
    });
    // Charts
    const labels = project.hypotheses.map(h => h.label);
    const colors = project.hypotheses.map((h, i) => h.color || ['#2a6df4','#d97706','#16a34a','#dc2626','#7c3aed','#0891b2'][i%6]);
    Charts.drawBar('#chart-bar', labels, currentPost(), colors, fmt);
    Charts.drawLine('#chart-line', labels, project.timeline, colors, fmt);
  }

  // ---------- History ----------
  function renderHistory() {
    const list = document.getElementById('history-list');
    list.innerHTML = '';
    project.history.forEach((step, idx) => {
      const div = document.createElement('div');
      div.className = 'history-item';
      const title = step.type === 'certain' ? 'Evidence (Certain)' : 'Evidence (Jeffrey)';
      div.innerHTML = `<strong>#${idx+1}</strong> — ${title} — ${new Date(step.at).toLocaleString()}`;
      list.appendChild(div);
    });
    document.getElementById('btn-undo').disabled = project.history.length === 0;
    document.getElementById('btn-redo').disabled = !project.redo || project.redo.length === 0;
  }

  function stepApplyNoRecord(step) {
    const post = currentPost();
    if (step.type === 'certain') {
      const next = Algorithms.bayesUpdate(post, step.L);
      project.timeline.push(next);
    } else if (step.type === 'jeffrey') {
      const next = Algorithms.jeffreyUpdate(post, step.likeMatrix, step.q);
      project.timeline.push(next);
    }
  }

  function onUndo() {
    if (project.history.length === 0) return;
    ensureRedo(project);
    const last = project.history.pop();
    project.redo.push(last);
    project.timeline.pop(); // remove last posterior
    save(); renderResults(); renderHistory();
  }

  function onRedo() {
    if (!project.redo || project.redo.length === 0) return;
    const step = project.redo.pop();
    stepApplyNoRecord(step);
    project.history.push(step);
    save(); renderResults(); renderHistory();
  }

  function onClearLast() {
    if (project.history.length === 0) return;
    project.history.pop();
    project.timeline.pop();
    save(); renderResults(); renderHistory();
  }

  // ---------- Projects, Import/Export ----------
  async function openProjectsDialog() {
    const dlg = document.getElementById('projects-dialog');
    const list = document.getElementById('projects-list');
    list.innerHTML = 'Loading...';
    const projs = await Storage.listProjects();
    list.innerHTML = '';
    projs.forEach(p => {
      const row = document.createElement('div');
      row.className = 'history-item';
      row.innerHTML = `<div><strong>${p.name}</strong><div class="muted">Updated ${new Date(p.updatedAt).toLocaleString()}</div></div>`;
      const openBtn = document.createElement('button'); openBtn.textContent = 'Open'; openBtn.className = 'secondary';
      const delBtn = document.createElement('button'); delBtn.textContent = 'Delete'; delBtn.className = 'danger';
      const actions = document.createElement('div'); actions.style.display='flex'; actions.style.gap='0.5rem'; actions.append(openBtn, delBtn);
      const wrap = document.createElement('div'); wrap.style.display='flex'; wrap.style.justifyContent='space-between'; wrap.style.alignItems='center'; wrap.append(row.firstChild, actions);
      list.appendChild(wrap);
      openBtn.onclick = async () => { const loaded = await Storage.loadProject(p.id); if (loaded) { project = migrateProject(loaded); renderAll(); dlg.close(); } };
      delBtn.onclick = async () => { await Storage.deleteProject(p.id); openProjectsDialog(); };
    });
    dlg.showModal();
    const createBtn = document.getElementById('btn-create-project');
    const nameInput = document.getElementById('new-project-name');
    createBtn.onclick = async (e) => {
      e.preventDefault();
      const name = (nameInput.value || 'Untitled').trim();
      const p = await Storage.createProject(name);
      project = migrateProject(p);
      renderAll();
      dlg.close();
      toast('Project created.');
    };
  }

  function migrateProject(p) {
    p.settings = p.settings || { numberFormat: 'percent', round: 2, theme: 'light' };
    p.timeline = Array.isArray(p.timeline) && p.timeline.length ? p.timeline : [normalizeHypothesisPriors()];
    ensureRedo(p);
    return p;
  }

  async function initProject() {
    // Try load most recent, else create new
    const projs = await Storage.listProjects();
    if (projs.length === 0) {
      project = await Storage.createProject('My Project');
    } else {
      project = await Storage.loadProject(projs[0].id);
    }
    project = migrateProject(project);
  }

  async function onExport() {
    const data = await Storage.exportProjectJSON(project.id);
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${project.name.replace(/\s+/g,'_')}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function onImport(file) {
    const text = await file.text();
    const obj = JSON.parse(text);
    const newProj = await Storage.importProjectJSON(obj);
    project = migrateProject(newProj);
    renderAll();
    toast('Imported project created.');
  }

  // ---------- Tabs, Settings, Theme ----------
  function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(btn => btn.addEventListener('click', () => {
      tabs.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected','false'); });
      btn.classList.add('active'); btn.setAttribute('aria-selected','true');
      const tab = btn.getAttribute('data-tab');
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.getElementById(`view-${tab}`).classList.add('active');
      if (tab === 'evidence') { renderEvidenceCertain(); renderEvidenceJeffrey(); }
      if (tab === 'results') { renderResults(); }
      if (tab === 'history') { renderHistory(); }
    }));
  }

  function setupSettings() {
    const fmtSel = document.getElementById('setting-number-format');
    const roundInput = document.getElementById('setting-round');
    const themeSel = document.getElementById('setting-theme');
    fmtSel.value = project.settings.numberFormat;
    roundInput.value = project.settings.round;
    themeSel.value = project.settings.theme || 'light';
    fmtSel.onchange = () => { project.settings.numberFormat = fmtSel.value; save(); renderAll(); };
    roundInput.onchange = () => { project.settings.round = Math.max(0, Math.min(8, parseInt(roundInput.value||'2',10))); save(); renderAll(); };
    themeSel.onchange = () => { project.settings.theme = themeSel.value; applyTheme(themeSel.value); save(); };
    applyTheme(themeSel.value);
  }

  function applyTheme(mode) {
    const root = document.documentElement;
    root.classList.remove('dark','light');
    if (mode === 'dark') root.classList.add('dark');
    if (mode === 'light') root.classList.add('light');
    try { localStorage.setItem('bayes.theme', mode); } catch {}
  }

  function setupEvidenceSwitcher() {
    const chips = document.querySelectorAll('.chip');
    const certain = document.getElementById('evidence-certain');
    const jeffrey = document.getElementById('evidence-jeffrey');
    chips.forEach(ch => ch.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('chip-active'));
      ch.classList.add('chip-active');
      const et = ch.getAttribute('data-etype');
      if (et === 'certain') { certain.classList.remove('hidden'); jeffrey.classList.add('hidden'); }
      else { certain.classList.add('hidden'); jeffrey.classList.remove('hidden'); }
    }));
  }

  function rnd() { return Math.random().toString(36).slice(2,9); }

  function bindGlobalHandlers() {
    document.getElementById('btn-add-hypo').onclick = onAddHypothesis;
    document.getElementById('btn-normalize').onclick = onNormalizePriors;
    document.getElementById('btn-add-evidence-certain').onclick = onApplyEvidenceCertain;
    document.getElementById('btn-add-evidence-jeffrey').onclick = onApplyEvidenceJeffrey;
    document.getElementById('btn-undo').onclick = onUndo;
    document.getElementById('btn-redo').onclick = onRedo;
    document.getElementById('btn-clear-history').onclick = onClearLast;
    document.getElementById('btn-projects').onclick = openProjectsDialog;
    document.getElementById('btn-export').onclick = onExport;
    document.getElementById('input-import').addEventListener('change', (e) => {
      const file = e.target.files?.[0]; if (file) onImport(file);
      e.target.value = '';
    });
  }

  function renderAll() {
    renderSetup();
    renderEvidenceCertain();
    renderEvidenceJeffrey();
    renderResults();
    renderHistory();
    setupSettings();
  }

  return {
    async start(deps) {
      Algorithms = deps.Algorithms; Storage = deps.Storage; Charts = deps.Charts;
      await Storage.init();
      await initProject();
      setupTabs();
      setupEvidenceSwitcher();
      bindGlobalHandlers();
      renderAll();
      toast('Ready. Create or open a project to begin.');
    }
  };
})();
