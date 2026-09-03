// ============================================================
// Meu Estudo Organizado — camada de dados local
// (localStorage para dados estruturados, IndexedDB para PDFs)
// ============================================================
window.MEO = window.MEO || {};

(function (MEO) {
  'use strict';

  const STORAGE_KEY = 'meo_data_v1';
  const COLLECTIONS = [
    'semesters', 'subjects', 'events', 'summaries', 'flashcards',
    'links', 'subjectLinks', 'pdfs', 'studySessions', 'faltas', 'grades'
  ];

  function emptyState() {
    const s = { profile: { curso: '' }, settings: defaultSettings() };
    COLLECTIONS.forEach(c => { s[c] = []; });
    return s;
  }

  function defaultSettings() {
    return {
      pomodoro: { foco: 25, pausaCurta: 5, pausaLonga: 15, som: true },
      notificacoes: false
    };
  }

  const state = emptyState();
  let listeners = [];
  let saveScheduled = false;

  function loadLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        Object.assign(state, emptyState(), parsed);
        // garante que todas coleções existam
        COLLECTIONS.forEach(c => { if (!Array.isArray(state[c])) state[c] = []; });
        if (!state.settings) state.settings = defaultSettings();
        if (!state.profile) state.profile = { curso: '' };
      }
    } catch (e) {
      console.error('Falha ao carregar dados locais', e);
    }
  }

  function persistLocal() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Falha ao salvar dados locais', e);
      MEO.toast('Não foi possível salvar neste aparelho (armazenamento cheio?)', 'error');
    }
  }

  function notify(change) {
    MEO.setSyncStatus && MEO.setSyncStatus(MEO.auth && MEO.auth.isSignedIn() ? 'salvando' : 'local');
    persistLocal();
    if (window.MEO.sync && typeof window.MEO.sync.pushChange === 'function') {
      window.MEO.sync.pushChange(change);
    } else if (!(MEO.auth && MEO.auth.isSignedIn())) {
      MEO.setSyncStatus && MEO.setSyncStatus('local');
    }
    listeners.forEach(fn => { try { fn(change); } catch (e) { console.error(e); } });
  }

  const db = {
    state,

    init() {
      loadLocal();
    },

    onChange(fn) { listeners.push(fn); },

    list(collection) {
      return (state[collection] || []).slice();
    },

    get(collection, id) {
      return (state[collection] || []).find(x => x.id === id) || null;
    },

    upsert(collection, obj, opts) {
      opts = opts || {};
      if (!state[collection]) state[collection] = [];
      const arr = state[collection];
      const now = MEO.nowISO();
      // Remove chaves com valor undefined (ex.: "id: existing?.id" quando não há edição)
      // para que não sobrescrevam valores já existentes/gerados via Object.assign.
      const clean = {};
      Object.keys(obj).forEach(k => { if (obj[k] !== undefined) clean[k] = obj[k]; });
      let existingIdx = -1;
      if (clean.id) existingIdx = arr.findIndex(x => x.id === clean.id);
      if (existingIdx >= 0) {
        const merged = Object.assign({}, arr[existingIdx], clean, { updatedAt: now });
        arr[existingIdx] = merged;
        if (!opts.silent) notify({ type: 'upsert', collection, doc: merged });
        return merged;
      } else {
        const doc = Object.assign({ id: clean.id || MEO.uid(collection), createdAt: now }, clean, { updatedAt: now });
        arr.push(doc);
        if (!opts.silent) notify({ type: 'upsert', collection, doc });
        return doc;
      }
    },

    remove(collection, id, opts) {
      opts = opts || {};
      if (!state[collection]) return;
      const idx = state[collection].findIndex(x => x.id === id);
      if (idx === -1) return;
      state[collection].splice(idx, 1);
      if (!opts.silent) notify({ type: 'remove', collection, id });
    },

    setProfile(patch) {
      state.profile = Object.assign({}, state.profile, patch, { updatedAt: MEO.nowISO() });
      notify({ type: 'profile', doc: state.profile });
    },

    setSettings(patch) {
      state.settings = Object.assign({}, state.settings, patch, { updatedAt: MEO.nowISO() });
      notify({ type: 'settings', doc: state.settings });
    },

    // Usado pela sincronização: aplica dados remotos sem re-emitir para o servidor
    replaceCollection(collection, docs) {
      state[collection] = docs;
      persistLocal();
      listeners.forEach(fn => { try { fn({ type: 'replace', collection }); } catch (e) { console.error(e); } });
    },

    exportAll() {
      return JSON.parse(JSON.stringify(state));
    },

    importAll(data) {
      Object.assign(state, emptyState());
      Object.assign(state, data);
      COLLECTIONS.forEach(c => { if (!Array.isArray(state[c])) state[c] = []; });
      persistLocal();
      listeners.forEach(fn => { try { fn({ type: 'import' }); } catch (e) { console.error(e); } });
    },

    clearAllLocal() {
      Object.assign(state, emptyState());
      persistLocal();
      listeners.forEach(fn => { try { fn({ type: 'clear' }); } catch (e) { console.error(e); } });
    },

    COLLECTIONS
  };

  MEO.db = db;

  // ------------------------------------------------------------
  // IndexedDB — apenas para os blobs dos PDFs (cópia local/offline)
  // ------------------------------------------------------------
  const IDB_NAME = 'meo_pdfs_db';
  const IDB_STORE = 'pdfs';
  let idbPromise = null;

  function openIDB() {
    if (idbPromise) return idbPromise;
    idbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) { reject(new Error('IndexedDB indisponível')); return; }
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const dbi = req.result;
        if (!dbi.objectStoreNames.contains(IDB_STORE)) {
          dbi.createObjectStore(IDB_STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return idbPromise;
  }

  MEO.idb = {
    async putBlob(id, blob, meta) {
      const dbi = await openIDB();
      return new Promise((resolve, reject) => {
        const tx = dbi.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put({ id, blob, meta: meta || {} });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    },
    async getBlob(id) {
      const dbi = await openIDB();
      return new Promise((resolve, reject) => {
        const tx = dbi.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).get(id);
        req.onsuccess = () => resolve(req.result ? req.result.blob : null);
        req.onerror = () => reject(req.error);
      });
    },
    async deleteBlob(id) {
      const dbi = await openIDB();
      return new Promise((resolve, reject) => {
        const tx = dbi.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }
  };

})(window.MEO);
