// IndexedDB storage wrapper for Bayes app
// Stores projects as whole JSON blobs for simplicity and reliability.

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('bayesdb', 1);
    req.onupgradeneeded = (e) => {
      const db = req.result;
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, store, mode = 'readonly') {
  const t = db.transaction(store, mode);
  return [t, t.objectStore(store)];
}

function uuid() {
  return 'p-' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36);
}

const DEFAULT_COLORS = [
  '#2a6df4','#d97706','#16a34a','#dc2626','#7c3aed','#0891b2','#be185d','#059669','#9333ea','#ca8a04'
];

function defaultProject(name = 'My Project') {
  const id = uuid();
  const now = new Date().toISOString();
  const hypotheses = [
    { id: uuid(), label: 'H1', prior: 0.5, color: DEFAULT_COLORS[0] },
    { id: uuid(), label: 'H2', prior: 0.5, color: DEFAULT_COLORS[1] },
  ];
  const priors = normalize(hypotheses.map(h => h.prior));
  return {
    id, name, createdAt: now, updatedAt: now,
    settings: { numberFormat: 'percent', round: 2, theme: 'light' },
    hypotheses,
    history: [], // evidence steps
    timeline: [priors], // step 0 = priors
  };
}

function normalize(arr) {
  const sum = arr.reduce((a, b) => a + b, 0);
  if (sum <= 0) return arr.map(() => 1 / arr.length);
  return arr.map(v => v / sum);
}

export const Storage = {
  _db: null,

  async init() {
    if (!this._db) this._db = await openDB();
    return this;
  },

  async listProjects() {
    const db = await this.init().then(s => s._db);
    return new Promise((resolve, reject) => {
      const [t, store] = tx(db, 'projects');
      const req = store.openCursor();
      const out = [];
      req.onsuccess = (e) => {
        const cur = e.target.result;
        if (cur) {
          const { id, name, createdAt, updatedAt } = cur.value;
          out.push({ id, name, createdAt, updatedAt });
          cur.continue();
        } else resolve(out.sort((a,b) => (b.updatedAt||'').localeCompare(a.updatedAt||'')));
      };
      req.onerror = () => reject(req.error);
    });
  },

  async createProject(name) {
    const db = await this.init().then(s => s._db);
    const proj = defaultProject(name);
    return new Promise((resolve, reject) => {
      const [t, store] = tx(db, 'projects', 'readwrite');
      const req = store.add(proj);
      req.onsuccess = () => resolve(proj);
      req.onerror = () => reject(req.error);
    });
  },

  async loadProject(id) {
    const db = await this.init().then(s => s._db);
    return new Promise((resolve, reject) => {
      const [t, store] = tx(db, 'projects');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },

  async saveProject(project) {
    const db = await this.init().then(s => s._db);
    project.updatedAt = new Date().toISOString();
    return new Promise((resolve, reject) => {
      const [t, store] = tx(db, 'projects', 'readwrite');
      const req = store.put(project);
      req.onsuccess = () => resolve(project);
      req.onerror = () => reject(req.error);
    });
  },

  async deleteProject(id) {
    const db = await this.init().then(s => s._db);
    return new Promise((resolve, reject) => {
      const [t, store] = tx(db, 'projects', 'readwrite');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async exportProjectJSON(id) {
    const proj = await this.loadProject(id);
    if (!proj) throw new Error('Project not found');
    return JSON.stringify(proj, null, 2);
  },

  async importProjectJSON(obj) {
    const db = await this.init().then(s => s._db);
    const proj = { ...obj };
    // Ensure new id to avoid collisions
    proj.id = uuid();
    proj.name = (proj.name || 'Imported Project') + ' (imported)';
    proj.createdAt = new Date().toISOString();
    proj.updatedAt = proj.createdAt;
    return new Promise((resolve, reject) => {
      const [t, store] = tx(db, 'projects', 'readwrite');
      const req = store.add(proj);
      req.onsuccess = () => resolve(proj);
      req.onerror = () => reject(req.error);
    });
  },
};
