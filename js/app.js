// App controller: UI, interactions, and state pipeline
// Exports: App

export const App = (() => {
  // Escapes HTML special characters in a string
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/`/g, '&#96;');
  }

  let Algorithms, Storage, Charts;
  let project = null;
  
  // Expose project globally for debugging
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'project', {
      get: () => project,
      set: (value) => { project = value; },
      configurable: true
    });
  }

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
    if (typeof s !== 'string') return { value: 0, error: 'Input must be text' };
    s = s.trim();
    if (!s) return { value: 0, error: null };
    
    try {
      // percent
      if (s.endsWith('%')) {
        const v = parseFloat(s.slice(0, -1));
        if (!Number.isFinite(v)) return { value: 0, error: 'Invalid percentage format' };
        if (v < 0) return { value: 0, error: 'Percentages cannot be negative' };
        if (v > 100) return { value: 1, error: 'Percentage over 100% will be clamped to 100%' };
        return { value: clamp01(v / 100), error: null };
      }
      
      // fraction a/b
      if (s.includes('/')) {
        const parts = s.split('/');
        if (parts.length !== 2) return { value: 0, error: 'Invalid fraction format (use a/b)' };
        const [a, b] = parts.map(x => parseFloat(x.trim()));
        if (!Number.isFinite(a) || !Number.isFinite(b)) return { value: 0, error: 'Invalid numbers in fraction' };
        if (b === 0) return { value: 0, error: 'Division by zero in fraction' };
        if (a < 0 || b < 0) return { value: 0, error: 'Negative numbers not allowed in probability fraction' };
        const result = a / b;
        if (result > 1) return { value: 1, error: 'Fraction greater than 1 will be clamped to 1' };
        return { value: clamp01(result), error: null };
      }
      
      // decimal or scientific
      const v = parseFloat(s);
      if (!Number.isFinite(v)) return { value: 0, error: 'Invalid number format' };
      if (v < 0) return { value: 0, error: 'Probabilities cannot be negative' };
      if (v > 1) return { value: 1, error: 'Probability greater than 1 will be clamped to 1' };
      return { value: v, error: null };
    } catch (e) {
      return { value: 0, error: 'Failed to parse input: ' + e.message };
    }
  }

  // Legacy wrapper for backward compatibility
  function parseProbInputValue(s) {
    return parseProbInput(s).value;
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
    normalizeHypothesisPriors();
    project.timeline = [project.hypotheses.map(h => h.prior)];
    project.history.forEach(stepApplyNoRecord);
    save(); renderAll();
  }

  function save() { Storage.saveProject(project).catch(err => console.error(err)); }

  // ---------- Setup (Hypotheses + Priors) ----------
  // Performance optimization: debounce input changes
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  const debouncedSave = debounce(() => save(), 300);
  const debouncedUpdateSummary = debounce(() => updatePriorsSummary(), 100);
  const debouncedRenderResults = debounce(() => renderResults(), 200);

  function renderSetup() {
    console.log('[RENDER] Starting renderSetup');
    const tbody = document.getElementById('hypo-rows');
    if (!tbody) {
      console.error('[RENDER] hypo-rows element not found');
      return;
    }
    
    if (!project || !Array.isArray(project.hypotheses)) {
      console.error('[RENDER] No project or hypotheses to render');
      tbody.innerHTML = '<tr><td colspan="3">No hypotheses available</td></tr>';
      return;
    }
    
    console.log('[RENDER] Rendering hypotheses:', project.hypotheses.map(h => ({ id: h.id, label: h.label, prior: h.prior })));
    
    // Clear existing content
    tbody.innerHTML = '';
    
    // Render each hypothesis row
    project.hypotheses.forEach((h, index) => {
      console.log(`[RENDER] Creating row ${index} for hypothesis:`, { id: h.id, label: h.label, prior: h.prior });
      
      const tr = document.createElement('tr');
      tr.setAttribute('data-hypothesis-id', h.id || `h${index + 1}`);
      tr.style.display = 'table-row'; // Ensure visibility
      
      // Label cell
      const labelCell = document.createElement('td');
      const labelInput = document.createElement('input');
      labelInput.type = 'text';
      labelInput.value = h.label || `H${index + 1}`;
      labelInput.setAttribute('aria-label', 'Label');
      labelInput.style.width = '100%';
      labelCell.appendChild(labelInput);
      
      // Prior cell
      const priorCell = document.createElement('td');
      const priorInput = document.createElement('input');
      priorInput.type = 'text';
      priorInput.value = fmt(h.prior || 0.5);
      priorInput.setAttribute('aria-label', 'Prior');
      priorInput.style.width = '100%';
      priorCell.appendChild(priorInput);
      
      // Action cell
      const actionCell = document.createElement('td');
      actionCell.style.textAlign = 'right';
      actionCell.style.display = 'flex';
      actionCell.style.gap = '.25rem';
      actionCell.style.justifyContent = 'flex-end';
      
      const upBtn = document.createElement('button');
      upBtn.className = 'secondary';
      upBtn.setAttribute('data-act', 'up');
      upBtn.title = 'Move up';
      upBtn.textContent = '↑';
      
      const downBtn = document.createElement('button');
      downBtn.className = 'secondary';
      downBtn.setAttribute('data-act', 'down');
      downBtn.title = 'Move down';
      downBtn.textContent = '↓';
      
      const delBtn = document.createElement('button');
      delBtn.className = 'secondary';
      delBtn.setAttribute('data-act', 'del');
      delBtn.textContent = 'Delete';
      
      actionCell.appendChild(upBtn);
      actionCell.appendChild(downBtn);
      actionCell.appendChild(delBtn);
      
      // Assemble row
      tr.appendChild(labelCell);
      tr.appendChild(priorCell);
      tr.appendChild(actionCell);
      
      // Event handlers
      labelInput.addEventListener('input', debounce(() => { 
        h.label = labelInput.value || h.label; 
        debouncedSave(); 
        debouncedRenderResults(); 
      }, 300));
      
      priorInput.addEventListener('input', debounce(() => { 
        const result = parseProbInput(priorInput.value);
        if (result.error) {
          priorInput.style.borderColor = 'var(--danger)';
          priorInput.title = result.error;
        } else {
          priorInput.style.borderColor = '';
          priorInput.title = '';
        }
        h.prior = result.value; 
        debouncedSave(); 
        debouncedUpdateSummary(); 
      }, 300));
      
      delBtn.addEventListener('click', () => {
        if (project.hypotheses.length <= 1) { toast('Need at least one hypothesis'); return; }
        project.hypotheses = project.hypotheses.filter(x => x !== h);
        recomputeFromStart();
      });
      
      upBtn.addEventListener('click', () => {
        const idx = project.hypotheses.indexOf(h);
        if (idx > 0) {
          [project.hypotheses[idx-1], project.hypotheses[idx]] = [project.hypotheses[idx], project.hypotheses[idx-1]];
          recomputeFromStart();
        }
      });
      
      downBtn.addEventListener('click', () => {
        const idx = project.hypotheses.indexOf(h);
        if (idx < project.hypotheses.length - 1) {
          [project.hypotheses[idx], project.hypotheses[idx+1]] = [project.hypotheses[idx+1], project.hypotheses[idx]];
          recomputeFromStart();
        }
      });
      
      // Append row to table
      tbody.appendChild(tr);
      console.log(`[RENDER] Row ${index} appended successfully for ${h.label}`);
    });
    
    // Force DOM update
    tbody.style.display = 'table-row-group';
    
    console.log(`[RENDER] Completed rendering ${project.hypotheses.length} hypothesis rows`);
    console.log(`[RENDER] Table now contains ${tbody.children.length} rows`);
    
    updatePriorsSummary();
    
    // Also update evidence rendering
    renderEvidenceCertain();
    renderEvidenceJeffrey();
  }

  function updatePriorsSummary() {
    const el = document.getElementById('priors-summary');
    const sum = project.hypotheses.reduce((a, h) => a + (isFinite(h.prior) ? h.prior : 0), 0);
    el.textContent = `Sum of priors: ${fmt(sum)} (will be normalized on update)`;
  }

  function normalizeHypothesisPriors() {
    if (!project || !Array.isArray(project.hypotheses) || project.hypotheses.length === 0) {
      console.warn('No hypotheses to normalize');
      return [];
    }
    
    const priors = project.hypotheses.map(h => clamp01(h.prior ?? 0));
    const sum = priors.reduce((a, b) => a + b, 0);
    const norm = sum > 0 ? priors.map(v => v / sum) : priors.map(() => 1 / priors.length);
    
    // write back normalized values
    for (let i = 0; i < project.hypotheses.length; i++) {
      project.hypotheses[i].prior = norm[i];
    }
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
    if (!tbody) return;
    
    tbody.innerHTML = '';
    if (!project || !Array.isArray(project.hypotheses)) return;
    
    project.hypotheses.forEach(h => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${h.label}</td><td><input type="text" value="0.5" aria-label="P(E|${h.label})"></td>`;
      tbody.appendChild(tr);
    });
  }

  function onApplyEvidenceCertain() {
    const labelInput = document.getElementById('evidence-certain-label');
    const evidenceLabel = labelInput ? labelInput.value.trim() || `Evidence ${project.history.length + 1}` : `Evidence ${project.history.length + 1}`;
    
    const inputs = document.querySelectorAll('#likelihood-rows input');
    const L = Array.from(inputs).map(i => {
      const result = parseProbInput(i.value);
      if (result.error) {
        i.style.borderColor = 'var(--danger)';
        i.title = result.error;
      } else {
        i.style.borderColor = '';
        i.title = '';
      }
      return clamp01(result.value);
    });
    if (L.length !== project.hypotheses.length) { toast('Mismatch in likelihood entries'); return; }
    try {
      const next = Algorithms.bayesUpdate(currentPost(), L);
      project.timeline.push(next);
      project.history.push({ type: 'certain', L, label: evidenceLabel, at: Date.now() });
      ensureRedo(project); project.redo = [];
      save();
      document.getElementById('evidence-message').textContent = 'Evidence applied.';
      if (labelInput) labelInput.value = ''; // Clear the label input
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
      
      // Add event listeners
      const [labelInput, weightInput] = tr.querySelectorAll('input');
      const delBtn = tr.querySelector('button[data-act="del"]');
      
      labelInput.addEventListener('input', buildLikeTable);
      weightInput.addEventListener('input', () => {
        // Validate weight input
        const result = parseProbInput(weightInput.value);
        if (result.error) {
          weightInput.style.borderColor = 'var(--danger)';
          weightInput.title = result.error;
        } else {
          weightInput.style.borderColor = '';
          weightInput.title = '';
        }
      });
      
      delBtn.addEventListener('click', () => {
        if (catsBody.children.length <= 2) {
          toast('Need at least two categories');
          return;
        }
        tr.remove();
        buildLikeTable();
      });
      
      catsBody.appendChild(tr);
    }

    function buildLikeTable() {
      const catLabels = Array.from(catsBody.querySelectorAll('tr')).map(tr => {
        const input = tr.querySelector('input');
        return input ? (input.value || 'Cat') : 'Cat';
      });
      
      // header
      const cols = catLabels.map(l => `<th>${escapeHtml(l)}</th>`).join('');
      head.innerHTML = `<tr><th>Hypothesis</th>${cols}</tr>`;
      
      // rows - preserve existing values when rebuilding
      const existingValues = {};
      Array.from(body.querySelectorAll('tr')).forEach((tr, hIdx) => {
        const inputs = tr.querySelectorAll('input');
        existingValues[hIdx] = Array.from(inputs).map(inp => inp.value);
      });
      
      body.innerHTML = '';
      for (let hIdx = 0; hIdx < project.hypotheses.length; hIdx++) {
        const h = project.hypotheses[hIdx];
        const tr = document.createElement('tr');
        const cells = catLabels.map((catLabel, cIdx) => {
          const existingVal = existingValues[hIdx] && existingValues[hIdx][cIdx] ? existingValues[hIdx][cIdx] : '';
          return `<td><input type="text" value="${escapeHtml(existingVal)}" aria-label="P(${escapeHtml(catLabel)}|${escapeHtml(h.label)})" placeholder="0.5"></td>`;
        }).join('');
        tr.innerHTML = `<td>${escapeHtml(h.label)}</td>${cells}`;
        body.appendChild(tr);
      }
    }

    document.getElementById('btn-add-cat').onclick = () => { 
      addCatRow(`Cat${catsBody.children.length + 1}`, ''); 
      buildLikeTable(); 
    };
    
    document.getElementById('btn-normalize-cats').onclick = () => {
      const rows = Array.from(catsBody.querySelectorAll('tr'));
      const wInputs = rows.map(r => r.querySelectorAll('input')[1]);
      const ws = wInputs.map(i => parseProbInputValue(i.value));
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
    const qRaw = wInputs.map(i => parseProbInputValue(i.value));
    const qSum = qRaw.reduce((a,b)=>a+b,0);
    const q = qSum>0? qRaw.map(v=>v/qSum): qRaw.map(()=>1/qRaw.length);

    const likeRows = document.querySelectorAll('#jeffrey-like-body tr');
    const likeMatrix = Array.from(likeRows).map(tr => {
      const inputs = tr.querySelectorAll('input');
      const vals = Array.from(inputs).map(i => {
        const result = parseProbInput(i.value);
        if (result.error) {
          i.style.borderColor = 'var(--danger)';
          i.title = result.error;
        } else {
          i.style.borderColor = '';
          i.title = '';
        }
        return clamp01(result.value);
      });
      const s = vals.reduce((a,b)=>a+b,0);
      return s>0? vals.map(v=>v/s): vals.map(()=> 1/vals.length);
    });

    const labelInput = document.getElementById('evidence-jeffrey-label');
    const evidenceLabel = labelInput ? labelInput.value.trim() || `Jeffrey Evidence ${project.history.length + 1}` : `Jeffrey Evidence ${project.history.length + 1}`;
    
    try {
      const next = Algorithms.jeffreyUpdate(currentPost(), likeMatrix, q);
      project.timeline.push(next);
      project.history.push({ type: 'jeffrey', cats: catLabels, q, likeMatrix, label: evidenceLabel, at: Date.now() });
      ensureRedo(project); project.redo = [];
      save();
      document.getElementById('evidence-message').textContent = 'Jeffrey evidence applied.';
      if (labelInput) labelInput.value = ''; // Clear the label input
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
      const label = step.label ? ` — ${step.label}` : '';
      div.innerHTML = `<strong>#${idx+1}</strong> — ${title}${label} — ${new Date(step.at).toLocaleString()}`;
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
    // Ensure project has required structure
    if (!p) return null;
    
    // Ensure hypotheses array exists and has at least 2 items
    if (!Array.isArray(p.hypotheses)) {
      p.hypotheses = [
        { id: 'h1', label: 'H1', prior: 0.5 },
        { id: 'h2', label: 'H2', prior: 0.5 }
      ];
    } else if (p.hypotheses.length < 2) {
      // Add missing hypotheses
      while (p.hypotheses.length < 2) {
        const index = p.hypotheses.length + 1;
        p.hypotheses.push({
          id: `h${index}`,
          label: `H${index}`,
          prior: 0.5
        });
      }
    }
    
    // Ensure each hypothesis has required fields
    p.hypotheses.forEach((h, i) => {
      if (!h.id) h.id = `h${i + 1}`;
      if (!h.label) h.label = `H${i + 1}`;
      if (typeof h.prior !== 'number' || !isFinite(h.prior)) h.prior = 0.5;
    });
    
    // Ensure other required fields
    if (!Array.isArray(p.history)) p.history = [];
    if (!Array.isArray(p.redo)) p.redo = [];
    if (!p.settings) p.settings = { numberFormat: 'percent', round: 2 };
    if (!p.settings.numberFormat) p.settings.numberFormat = 'percent';
    if (typeof p.settings.round !== 'number') p.settings.round = 2;
    
    // Normalize priors and set timeline
    const normalizedPriors = p.hypotheses.map(h => clamp01(h.prior ?? 0));
    const sum = normalizedPriors.reduce((a, b) => a + b, 0);
    const norm = sum > 0 ? normalizedPriors.map(v => v / sum) : normalizedPriors.map(() => 1 / normalizedPriors.length);
    
    // Update hypothesis priors with normalized values
    for (let i = 0; i < p.hypotheses.length; i++) {
      p.hypotheses[i].prior = norm[i];
    }
    
    p.timeline = Array.isArray(p.timeline) && p.timeline.length ? p.timeline : [norm];
    
    return p;
  }

  async function initProject() {
    console.log('[INIT] Starting project initialization');
    
    try {
      // Try to load existing projects first
      const existingProjs = await Storage.listProjects();
      console.log('[INIT] Found existing projects:', existingProjs.length);
      
      if (existingProjs.length > 0) {
        // Load the most recent project
        const mostRecent = existingProjs.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];
        console.log('[INIT] Loading most recent project:', mostRecent.id);
        const loaded = await Storage.loadProject(mostRecent.id);
        if (loaded && loaded.hypotheses && loaded.hypotheses.length >= 2) {
          project = migrateProject(loaded);
          console.log('[INIT] Successfully loaded existing project with', project.hypotheses.length, 'hypotheses');
          return;
        }
      }
      
      // If no valid project exists, create a fresh one
      console.log('[INIT] Creating fresh project...');
      project = {
        id: 'project_' + Date.now(),
        name: 'My Project',
        hypotheses: [
          { id: 'h1', label: 'H1', prior: 0.5 },
          { id: 'h2', label: 'H2', prior: 0.5 }
        ],
        timeline: [[0.5, 0.5]],
        history: [],
        redo: [],
        settings: { numberFormat: 'percent', round: 2 }
      };
      
      // Save the fresh project
      await Storage.saveProject(project);
      console.log('[INIT] Fresh project created and saved');
      
    } catch (e) {
      console.error('[INIT] Error during initialization:', e);
      // Fallback: create minimal project
      project = {
        id: 'fallback_' + Date.now(),
        name: 'My Project',
        hypotheses: [
          { id: 'h1', label: 'H1', prior: 0.5 },
          { id: 'h2', label: 'H2', prior: 0.5 }
        ],
        timeline: [[0.5, 0.5]],
        history: [],
        redo: [],
        settings: { numberFormat: 'percent', round: 2 }
      };
    }
    
    // Final verification
    if (!project || !Array.isArray(project.hypotheses) || project.hypotheses.length < 2) {
      throw new Error('Project initialization failed - invalid hypothesis structure');
    }
    
    console.log('[INIT] Project ready:', {
      id: project.id,
      hypothesesCount: project.hypotheses.length,
      hypotheses: project.hypotheses.map(h => ({ id: h.id, label: h.label, prior: h.prior }))
    });
  }

  // ---------- Export Functions ----------
  async function onExportJSON() {
    const data = await Storage.exportProjectJSON(project.id);
    const blob = new Blob([data], { type: 'application/json' });
    downloadBlob(blob, `${project.name.replace(/\s+/g,'_')}.json`);
  }

  function onExportCSV() {
    const post = currentPost();
    const rows = [['Hypothesis', 'Posterior Probability']];
    project.hypotheses.forEach((h, i) => {
      rows.push([h.label, post[i].toString()]);
    });
    const csv = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    downloadBlob(blob, `${project.name.replace(/\s+/g,'_')}_results.csv`);
  }

  function onExportChartBar() {
    exportChartAsPNG('#chart-bar', `${project.name.replace(/\s+/g,'_')}_posterior_chart.png`);
  }

  function onExportChartLine() {
    exportChartAsPNG('#chart-line', `${project.name.replace(/\s+/g,'_')}_timeline_chart.png`);
  }

  function downloadBlob(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function exportChartAsPNG(selector, filename) {
    const chartEl = document.querySelector(selector);
    if (!chartEl) {
      toast('Chart not found');
      return;
    }
    
    const svg = chartEl.querySelector('svg');
    if (!svg) {
      toast('No chart to export');
      return;
    }

    // Create a canvas and draw the SVG
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    const img = new Image();
    img.onload = () => {
      canvas.width = 800;
      canvas.height = 400;
      
      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw SVG
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Convert to PNG and download
      canvas.toBlob(blob => {
        downloadBlob(blob, filename);
        URL.revokeObjectURL(url);
      }, 'image/png');
    };
    img.src = url;
  }

  function setupExportDropdown() {
    const dropdown = document.querySelector('.export-dropdown');
    const btn = document.getElementById('btn-export-menu');
    
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      dropdown.classList.remove('open');
    });
    
    // Export handlers
    document.getElementById('btn-export-json').onclick = onExportJSON;
    document.getElementById('btn-export-csv').onclick = onExportCSV;
    document.getElementById('btn-export-chart-bar').onclick = onExportChartBar;
    document.getElementById('btn-export-chart-line').onclick = onExportChartLine;
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
    
    chips.forEach(ch => {
      ch.addEventListener('click', () => switchEvidenceTab(ch));
      ch.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          switchEvidenceTab(ch);
        }
        // Arrow key navigation
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          const current = Array.from(chips).indexOf(ch);
          const next = e.key === 'ArrowRight' ? (current + 1) % chips.length : (current - 1 + chips.length) % chips.length;
          chips[next].focus();
        }
      });
    });
    
    function switchEvidenceTab(activeChip) {
      chips.forEach(c => {
        c.classList.remove('chip-active');
        c.setAttribute('aria-selected', 'false');
      });
      activeChip.classList.add('chip-active');
      activeChip.setAttribute('aria-selected', 'true');
      
      const et = activeChip.getAttribute('data-etype');
      if (et === 'certain') { 
        certain.classList.remove('hidden'); 
        jeffrey.classList.add('hidden');
        certain.setAttribute('aria-hidden', 'false');
        jeffrey.setAttribute('aria-hidden', 'true');
      } else { 
        certain.classList.add('hidden'); 
        jeffrey.classList.remove('hidden');
        certain.setAttribute('aria-hidden', 'true');
        jeffrey.setAttribute('aria-hidden', 'false');
      }
    }
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
    
    // Import
    document.getElementById('input-import').onchange = (e) => {
      const file = e.target.files[0];
      if (file) onImport(file);
    };
    
    // Export dropdown
    setupExportDropdown();
    
    // Help system
    document.querySelectorAll('.help-btn').forEach(btn => {
      btn.addEventListener('click', () => showHelp(btn.getAttribute('data-help')));
    });
    const tutorialBtn = document.getElementById('btn-tutorial');
    if (tutorialBtn) {
      tutorialBtn.addEventListener('click', startTutorial);
    }
    
    // Tutorial system
    const btnNext = document.getElementById('btn-tutorial-next');
    const btnPrev = document.getElementById('btn-tutorial-prev');
    const btnSkip = document.getElementById('btn-tutorial-skip');
    
    if (btnNext) {
      btnNext.addEventListener('click', nextTutorialStep);
    }
    
    if (btnPrev) {
      btnPrev.addEventListener('click', prevTutorialStep);
    }
    
    if (btnSkip) {
      btnSkip.addEventListener('click', skipTutorial);
    }
    
    // Guard against accidental form submissions
    [btnNext, btnPrev, btnSkip].forEach(b => {
      if (b) {
        b.setAttribute('type','button');
      }
    });
    
    // Escape key kills overlay
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { 
        tutorialActive = false; 
        document.body.dataset.tutorialActive = 'false'; 
        hideOverlay(); 
      }
    });
    
  }


  // ---------- Help System ----------
  const helpContent = {
    setup: {
      title: 'Hypotheses & Priors',
      body: `
        <h4>What are hypotheses?</h4>
        <p>Hypotheses are the possible explanations or outcomes you're considering. For example: "It will rain today" vs "It will not rain today".</p>
        
        <h4>What are priors?</h4>
        <p>Priors represent your initial belief in each hypothesis before seeing any evidence. They should sum to 100%.</p>
        
        <h4>Input formats supported:</h4>
        <ul>
          <li><code>0.4</code> - Decimal (40%)</li>
          <li><code>40%</code> - Percentage</li>
          <li><code>2/5</code> - Fraction</li>
          <li><code>1e-6</code> - Scientific notation</li>
        </ul>
        
        <h4>Tips:</h4>
        <ul>
          <li>Use "Normalize Priors" to automatically make them sum to 100%</li>
          <li>You can reorder hypotheses using the ↑↓ buttons</li>
          <li>Give your hypotheses descriptive names</li>
        </ul>
      `
    },
    evidence: {
      title: 'Adding Evidence',
      body: `
        <h4>Certain Evidence</h4>
        <p>Use this when you know exactly what evidence you observed. Enter P(E|H) - the probability of seeing this evidence if each hypothesis were true.</p>
        
        <h4>Uncertain Evidence (Jeffrey Conditionalization)</h4>
        <p>Use this when you're uncertain about what the evidence means. You define categories and your confidence in each category.</p>
        
        <h4>Example:</h4>
        <p>If testing for a disease:</p>
        <ul>
          <li><strong>Certain:</strong> "Test result is positive" - enter P(positive test | has disease) and P(positive test | no disease)</li>
          <li><strong>Uncertain:</strong> "I'm 70% sure the test is positive" - create categories "Positive/Negative" with weights 70%/30%</li>
        </ul>
      `
    },
    results: {
      title: 'Understanding Results',
      body: `
        <h4>Posterior Probabilities</h4>
        <p>These show your updated beliefs after considering the evidence. They represent P(H|E) - how likely each hypothesis is given the evidence.</p>
        
        <h4>Charts</h4>
        <ul>
          <li><strong>Bar Chart:</strong> Current posterior probabilities</li>
          <li><strong>Line Chart:</strong> How your beliefs changed over time with each piece of evidence</li>
        </ul>
        
        <h4>Interpreting Results</h4>
        <p>Higher probabilities mean stronger belief in that hypothesis. The probabilities always sum to 100%.</p>
      `
    },
    history: {
      title: 'History & Undo',
      body: `
        <h4>Evidence History</h4>
        <p>This shows all the evidence you've added in chronological order.</p>
        
        <h4>Undo/Redo</h4>
        <ul>
          <li><strong>Undo:</strong> Remove the last piece of evidence</li>
          <li><strong>Redo:</strong> Restore evidence you just undid</li>
          <li><strong>Clear Last:</strong> Permanently remove the most recent evidence</li>
        </ul>
        
        <h4>Use Cases</h4>
        <ul>
          <li>Experiment with different evidence scenarios</li>
          <li>Correct mistakes in evidence entry</li>
          <li>See how each piece of evidence affected your beliefs</li>
        </ul>
      `
    }
  };

  function showHelp(section) {
    const dialog = document.getElementById('help-dialog');
    const title = document.getElementById('help-title');
    const body = document.getElementById('help-body');
    
    const content = helpContent[section];
    if (content) {
      title.textContent = content.title;
      body.innerHTML = content.body;
      dialog.showModal();
    }
  }

  // ---------- Tutorial System ----------
  let tutorialStep = 0;
  let tutorialActive = false;
  const tutorialSteps = [
    {
      title: 'Welcome to Bayes!',
      text: 'This app helps you apply Bayesian reasoning to any question. Let\'s walk through the basics.'
    },
    {
      title: 'Step 1: Set Up Hypotheses',
      text: 'Start by adding your hypotheses (possible explanations) and setting your initial beliefs (priors). Click on the "Setup" tab to begin.'
    },
    {
      title: 'Step 2: Add Evidence',
      text: 'Use the "Evidence" tab to add new information. Choose "Certain" if you know exactly what happened, or "Uncertain (Jeffrey)" if you\'re not completely sure.'
    },
    {
      title: 'Step 3: View Results',
      text: 'The "Results" tab shows your updated beliefs (posteriors) after considering the evidence. The charts help visualize how your beliefs changed.'
    },
    {
      title: 'Step 4: Track History',
      text: 'Use the "History" tab to see all evidence you\'ve added and undo changes if needed. You can experiment with different scenarios.'
    },
    {
      title: 'You\'re Ready!',
      text: 'That\'s the basic workflow. Click the ? buttons in each section for detailed help. Happy reasoning!'
    }
  ];

  // ========= Debug Utilities =========
  const DBG_KEY = 'debugTutorial';
  function isDebug() {
    if (typeof location === 'undefined' || typeof localStorage === 'undefined') return false;
    return location.hash.includes('debug') || localStorage.getItem(DBG_KEY) === '1';
  }
  function ensureDebugPanel() {
    if (!isDebug()) return;
    if (document.getElementById('tutorial-debug-panel')) return;
    const wrap = document.createElement('div');
    wrap.id = 'tutorial-debug-panel';
    wrap.style.cssText = 'position:fixed;right:8px;bottom:8px;width:360px;max-height:45vh;background:#111;color:#eee;z-index:99999;border:1px solid #444;border-radius:6px;box-shadow:0 2px 10px rgba(0,0,0,.4);display:flex;flex-direction:column;';
    const header = document.createElement('div');
    header.textContent = 'Tutorial Debug Logs';
    header.style.cssText = 'font:12px/1.4 system-ui;padding:6px 8px;border-bottom:1px solid #333;background:#1a1a1a;display:flex;gap:6px;align-items:center;';
    const btnCopy = document.createElement('button');
    btnCopy.textContent = 'Copy';
    btnCopy.style.cssText = 'margin-left:auto;font:12px system-ui;padding:2px 6px;';
    const btnClear = document.createElement('button');
    btnClear.textContent = 'Clear';
    btnClear.style.cssText = 'font:12px system-ui;padding:2px 6px;';
    header.appendChild(btnClear);
    header.appendChild(btnCopy);
    const ta = document.createElement('textarea');
    ta.id = 'tutorial-debug-textarea';
    ta.readOnly = true;
    ta.style.cssText = 'flex:1;padding:6px 8px;background:#000;color:#0f0;font:11px/1.3 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;border:0;resize:none;';
    wrap.appendChild(header);
    wrap.appendChild(ta);
    document.body.appendChild(wrap);
    btnCopy.onclick = async () => {
      try { await navigator.clipboard.writeText(ta.value); } catch {}
    };
    btnClear.onclick = () => { window.__tutorialLogs = []; updateDebugPanel(); };
    updateDebugPanel();
  }
  function updateDebugPanel() {
    if (typeof document === 'undefined') return;
    const ta = document.getElementById('tutorial-debug-textarea');
    if (!ta) return;
    const logs = (typeof window !== 'undefined' && window.__tutorialLogs) || [];
    ta.value = JSON.stringify(logs, null, 2);
    ta.scrollTop = ta.scrollHeight;
  }
  function dbg(tag, data) {
    const entry = { t: new Date().toISOString(), tag, data };
    if (typeof window !== 'undefined') {
      window.__tutorialLogs = window.__tutorialLogs || [];
      window.__tutorialLogs.push(entry);
    }
    // ALWAYS log to console for debugging
    try { console.log('[TUTORIAL]', tag, data); } catch {}
    if (isDebug()) {
      updateDebugPanel();
    }
  }
  if (typeof window !== 'undefined') {
    window.enableTutorialDebug = () => { localStorage.setItem(DBG_KEY,'1'); location.reload(); };
    window.disableTutorialDebug = () => { localStorage.removeItem(DBG_KEY); location.reload(); };
  }

  // Debug: overlay state helper and observer
  function overlayState() {
    const el = document.getElementById('tutorial-overlay');
    if (!el) return { error: 'overlay not found' };
    return {
      exists: !!el,
      classList: Array.from(el.classList),
      hiddenAttr: el.hasAttribute('hidden'),
      ariaHidden: el.getAttribute('aria-hidden'),
      styleDisplay: el.style.display || '(empty)',
      styleVisibility: el.style.visibility || '(empty)',
      stylePointer: el.style.pointerEvents || '(empty)',
      computedDisplay: getComputedStyle(el).display,
      computedVisibility: getComputedStyle(el).visibility,
      bodyDataset: document.body && document.body.dataset ? { tutorialActive: document.body.dataset.tutorialActive } : {}
    };
  }

  function logOverlay(tag) {
    const state = overlayState();
    dbg(tag, state);
  }


  function showOverlay() {
    const overlay = document.getElementById('tutorial-overlay');
    overlay.removeAttribute('aria-hidden');
    overlay.removeAttribute('hidden');
    overlay.classList.remove('hidden');
    overlay.style.removeProperty('display');
    overlay.style.display = 'flex';
    overlay.style.visibility = 'visible';
    overlay.style.pointerEvents = 'auto';
    return overlay;
  }

  function hideOverlay() {
    const overlay = document.getElementById('tutorial-overlay');
    overlay.classList.add('hidden');
    overlay.setAttribute('hidden', 'true');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.style.display = 'none';
    overlay.style.visibility = 'hidden';
    return overlay;
  }

  function startTutorial() {
    tutorialStep = 0;
    tutorialActive = true;
    document.body.dataset.tutorialActive = 'true';
    const overlay = showOverlay();
    document.getElementById('help-dialog').close();
    showTutorialStep();
  }

  function showTutorialStep() {
    if (!tutorialActive) return;
    const overlay = document.getElementById('tutorial-overlay');
    const title = document.getElementById('tutorial-title');
    const text = document.getElementById('tutorial-text');
    const prevBtn = document.getElementById('btn-tutorial-prev');
    const nextBtn = document.getElementById('btn-tutorial-next');
    
    const step = tutorialSteps[tutorialStep];
    title.textContent = step.title;
    text.textContent = step.text;
    
    prevBtn.disabled = tutorialStep === 0;
    nextBtn.textContent = tutorialStep === tutorialSteps.length - 1 ? 'Finish' : 'Next';
    
    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';
    overlay.style.visibility = 'visible';
    overlay.style.pointerEvents = 'auto';
    logOverlay(`showTutorialStep:${tutorialStep}`);
  }

  function nextTutorialStep(e) {
    console.log('[TUTORIAL] nextTutorialStep() called', { event: e, step: tutorialStep, active: tutorialActive });
    if (e) { 
      console.log('[TUTORIAL] Preventing default and stopping propagation');
      e.preventDefault(); 
      e.stopPropagation(); 
    }
    dbg('nextTutorialStep:click', { step: tutorialStep, active: tutorialActive });
    if (!tutorialActive) {
      console.log('[TUTORIAL] Tutorial not active, returning early');
      return;
    }
    if (tutorialStep < tutorialSteps.length - 1) {
      console.log('[TUTORIAL] Moving to next step');
      tutorialStep++;
      showTutorialStep();
    } else {
      console.log('[TUTORIAL] Last step reached, calling finishTutorial');
      logOverlay('next->finish');
      finishTutorial();
    }
  }

  function prevTutorialStep(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    dbg('prevTutorialStep:click', { step: tutorialStep });
    if (!tutorialActive) return;
    if (tutorialStep > 0) {
      tutorialStep--;
      showTutorialStep();
    }
    logOverlay('prevTutorialStep');
  }

  function skipTutorial(e) {
    if (e) { 
      e.preventDefault(); 
      e.stopPropagation(); 
    }
    tutorialActive = false;
    document.body.dataset.tutorialActive = 'false';
    hideOverlay();
  }

  function finishTutorial(e) {
    if (e) { 
      e.preventDefault(); 
      e.stopPropagation(); 
    }
    tutorialActive = false;
    document.body.dataset.tutorialActive = 'false';
    hideOverlay();
  }

  // ---------- Main Render Function ----------
  function renderAll() {
    renderSetup();
    renderResults();
    renderHistory();
    setupSettings();
    if (isDebug()) {
      ensureDebugPanel();
    }
  }

  return {
    async start(deps) {
      Algorithms = deps.Algorithms; Storage = deps.Storage; Charts = deps.Charts;
      await Storage.init();
      await initProject();
      setupTabs();
      setupEvidenceSwitcher();
      bindGlobalHandlers();
      
      // Ensure DOM is ready before rendering
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', resolve, { once: true });
        });
      }
      
      renderAll();
      
      // Force a second render after a short delay to ensure everything is visible
      setTimeout(() => {
        console.log('[APP] Performing secondary render to ensure visibility');
        renderSetup();
      }, 100);
      
      toast('Ready. Create or open a project to begin.');
    },
    renderAll: renderAll,
    getProject: () => project,
    renderSetup: renderSetup
  };
})();
