// ============================================================
// Meu Estudo Organizado — autenticação e sincronização com Firebase
// (Auth com Google, Firestore para dados, Storage para PDFs)
// Tudo isto é opcional: sem login, o app funciona 100% localmente.
// ============================================================
window.MEO = window.MEO || {};

(function (MEO) {
  'use strict';

  let app = null, auth = null, fs = null, storage = null;
  let firebaseReady = false;
  let currentUser = null;
  let unsubscribeSnapshot = null;
  let pushTimer = null;
  let suppressNextRemoteEcho = false;
  const authListeners = [];

  function setStatus(status) { MEO.setSyncStatus && MEO.setSyncStatus(status); }

  function tryInitFirebase() {
    if (firebaseReady) return true;
    if (!window.firebase || !window.MEO_FIREBASE_CONFIG) return false;
    try {
      app = firebase.initializeApp(window.MEO_FIREBASE_CONFIG);
      auth = firebase.auth();
      fs = firebase.firestore();
      storage = firebase.storage();
      try {
        fs.enablePersistence({ synchronizeTabs: true }).catch((e) => {
          console.warn('Persistência offline do Firestore não habilitada:', e && e.code);
        });
      } catch (e) { /* ok, alguns navegadores não suportam */ }
      firebaseReady = true;
      auth.onAuthStateChanged(onAuthStateChanged);
      // Resolve um possível retorno de signInWithRedirect (fallback quando o popup é bloqueado)
      // e reporta o erro ao usuário, caso haja (ex.: domínio não autorizado no Firebase Auth).
      auth.getRedirectResult().catch((e) => {
        console.error('Erro ao concluir login por redirecionamento', e);
        MEO.toast(friendlyAuthError(e), 'error');
      });
      return true;
    } catch (e) {
      console.error('Falha ao iniciar Firebase', e);
      return false;
    }
  }

  function friendlyAuthError(e) {
    const code = e && e.code;
    if (code === 'auth/unauthorized-domain') return 'Este domínio ainda não está autorizado no Firebase Authentication. Peça para adicionar o domínio do site em Authentication → Settings → Authorized domains.';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return null; // usuário cancelou, não é erro
    if (code === 'auth/network-request-failed') return 'Sem conexão com a internet no momento. Tente novamente quando estiver online.';
    return 'Não foi possível entrar com o Google agora. Tente novamente em instantes.';
  }

  function onAuthStateChanged(user) {
    const wasSignedIn = !!currentUser;
    currentUser = user;
    authListeners.forEach(fn => { try { fn(user); } catch (e) { console.error(e); } });
    if (user) {
      startSync(user);
    } else {
      stopSync();
      setStatus(navigator.onLine ? 'local' : 'offline');
      if (wasSignedIn) MEO.rerender && MEO.rerender();
    }
  }

  function mergeArrays(localArr, remoteArr) {
    const map = new Map();
    (remoteArr || []).forEach(d => { if (d && d.id) map.set(d.id, d); });
    (localArr || []).forEach(d => {
      if (!d || !d.id) return;
      const r = map.get(d.id);
      if (!r) { map.set(d.id, d); return; }
      const lt = new Date(d.updatedAt || d.createdAt || 0).getTime();
      const rt = new Date(r.updatedAt || r.createdAt || 0).getTime();
      if (lt >= rt) map.set(d.id, d);
    });
    return Array.from(map.values());
  }

  function mergeSingleton(local, remote) {
    // profile/settings são objetos únicos (não listas, sem timestamp por campo).
    // Usa updatedAt do objeto inteiro só pra decidir a "base" mais recente, mas
    // depois preenche de volta qualquer campo que a base mais recente tenha
    // vazio/ausente com o valor do lado mais antigo — assim um campo salvo antes
    // (ex.: o nome) não some só porque outro campo (ex.: a graduação) foi
    // alterado depois em outro aparelho e "venceu" a comparação de data.
    if (!remote) return local;
    if (!local) return remote;
    const lt = new Date(local.updatedAt || 0).getTime();
    const rt = new Date(remote.updatedAt || 0).getTime();
    const newer = rt > lt ? remote : local;
    const older = rt > lt ? local : remote;
    const merged = Object.assign({}, older, newer);
    Object.keys(older).forEach(k => {
      const v = newer[k];
      if (v === '' || v === null || v === undefined) {
        const ov = older[k];
        if (ov !== '' && ov !== null && ov !== undefined) merged[k] = ov;
      }
    });
    return merged;
  }

  async function startSync(user) {
    setStatus('salvando');
    const uid = user.uid;
    const docRef = fs.collection('users').doc(uid).collection('appData').doc('main');
    try {
      const snap = await docRef.get({ source: 'server' }).catch(() => docRef.get());
      const local = MEO.db.exportAll();
      if (snap.exists) {
        const remote = snap.data() || {};
        const merged = {};
        MEO.db.COLLECTIONS.forEach(c => { merged[c] = mergeArrays(local[c], remote[c]); });
        merged.profile = mergeSingleton(local.profile, remote.profile) || { curso: '', nome: '' };
        merged.settings = mergeSingleton(local.settings, remote.settings) || local.settings;
        suppressNextRemoteEcho = true;
        MEO.db.importAll(merged);
        await docRef.set(merged, { merge: false });
      } else {
        await docRef.set(local, { merge: false });
      }
      setStatus('nuvem');
      MEO.toast('Dados sincronizados com sua conta.', 'success');
    } catch (e) {
      console.error('Erro ao sincronizar', e);
      setStatus('erro');
      MEO.toast('Erro ao sincronizar com a nuvem. Seus dados continuam salvos neste aparelho.', 'error');
    }

    if (unsubscribeSnapshot) { unsubscribeSnapshot(); unsubscribeSnapshot = null; }
    unsubscribeSnapshot = docRef.onSnapshot(snap => {
      if (!snap.exists) return;
      if (snap.metadata.hasPendingWrites) return; // é a nossa própria escrita
      if (suppressNextRemoteEcho) { suppressNextRemoteEcho = false; return; }
      const remote = snap.data() || {};
      const local = MEO.db.exportAll();
      const merged = {
        profile: mergeSingleton(local.profile, remote.profile) || local.profile,
        settings: mergeSingleton(local.settings, remote.settings) || local.settings
      };
      MEO.db.COLLECTIONS.forEach(c => { merged[c] = mergeArrays(local[c], remote[c]); });
      MEO.db.importAll(merged);
      setStatus('nuvem');
      MEO.rerender && MEO.rerender();
    }, err => {
      console.error('onSnapshot erro', err);
      setStatus('erro');
    });
  }

  function stopSync() {
    if (unsubscribeSnapshot) { unsubscribeSnapshot(); unsubscribeSnapshot = null; }
  }

  function scheduleUpload() {
    if (!currentUser || !fs) { setStatus(navigator.onLine ? 'local' : 'offline'); return; }
    setStatus('salvando');
    clearTimeout(pushTimer);
    pushTimer = setTimeout(async () => {
      try {
        const uid = currentUser.uid;
        const docRef = fs.collection('users').doc(uid).collection('appData').doc('main');
        const data = MEO.db.exportAll();
        await docRef.set(data, { merge: false });
        setStatus('nuvem');
      } catch (e) {
        console.error('Erro ao salvar na nuvem', e);
        setStatus('erro');
        MEO.toast('Não foi possível salvar na nuvem agora. Vamos tentar novamente automaticamente.', 'error');
      }
    }, 900);
  }

  async function deleteFolderRecursive(ref) {
    const res = await ref.listAll();
    await Promise.all(res.items.map(item => item.delete().catch(() => {})));
    await Promise.all(res.prefixes.map(prefix => deleteFolderRecursive(prefix)));
  }

  MEO.sync = {
    pushChange() { scheduleUpload(); },

    async uploadPdf(pdfId, subjectId, file, onProgress) {
      if (!currentUser || !storage) throw new Error('Sem conexão com a nuvem');
      const path = `users/${currentUser.uid}/pdfs/${subjectId}/${pdfId}_${file.name}`;
      const ref = storage.ref().child(path);
      const task = ref.put(file, { contentType: file.type || 'application/pdf' });
      return new Promise((resolve, reject) => {
        task.on('state_changed', snap => {
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          onProgress && onProgress(pct);
        }, reject, async () => {
          try {
            const url = await task.snapshot.ref.getDownloadURL();
            resolve({ path, url });
          } catch (e) { reject(e); }
        });
      });
    },

    async deletePdfFile(path) {
      if (!currentUser || !storage || !path) return;
      try { await storage.ref().child(path).delete(); } catch (e) { /* pode já não existir */ }
    },

    isReady() { return firebaseReady; }
  };

  MEO.auth = {
    isSignedIn() { return !!currentUser; },
    getUser() { return currentUser; },
    onChange(fn) { authListeners.push(fn); if (firebaseReady) fn(currentUser); },

    async signIn() {
      if (!tryInitFirebase()) {
        MEO.toast('Não foi possível carregar o Firebase (verifique sua conexão).', 'error');
        return;
      }
      try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await auth.signInWithPopup(provider);
      } catch (e) {
        console.error(e);
        if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) {
          try { await auth.signInWithRedirect(new firebase.auth.GoogleAuthProvider()); } catch (e2) {
            console.error(e2);
            const msg = friendlyAuthError(e2);
            if (msg) MEO.toast(msg, 'error');
          }
        } else {
          const msg = friendlyAuthError(e);
          if (msg) MEO.toast(msg, 'error');
        }
      }
    },

    async signOut() {
      if (!auth) return;
      try {
        await auth.signOut();
        MEO.toast('Você saiu da sua conta. Os dados locais continuam neste aparelho.', 'success');
      } catch (e) { console.error(e); }
    },

    // Exclui permanentemente a conta do usuário: dados no Firestore, arquivos no
    // Storage, a própria conta de autenticação e, por fim, os dados locais.
    async deleteAccount() {
      if (!currentUser || !fs) throw new Error('not-signed-in');
      const uid = currentUser.uid;
      try {
        await fs.collection('users').doc(uid).collection('appData').doc('main').delete();
      } catch (e) { console.error('Erro ao apagar dados no Firestore', e); }
      if (storage) {
        try { await deleteFolderRecursive(storage.ref().child(`users/${uid}`)); }
        catch (e) { console.error('Erro ao apagar arquivos no Storage', e); }
      }
      await currentUser.delete(); // pode lançar auth/requires-recent-login
      MEO.db.clearAllLocal();
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    tryInitFirebase();
  });

})(window.MEO);
