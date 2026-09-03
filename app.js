// ============================================================
// Meu Estudo Organizado — aplicação principal
// Roteamento, modais, barra lateral, PWA, sincronização, busca.
// ============================================================
window.MEO = window.MEO || {};

(function (MEO) {
  'use strict';

  const todayD = new Date();

  MEO.state = {
    route: 'visao-geral',
    params: {},
    selectedSemesterId: null,
    agenda: {
      year: todayD.getFullYear(),
      month: todayD.getMonth(),
      status: 'todos',
      semesterId: '',
      subjectId: '',
      view: (window.innerWidth <= 640 ? 'lista' : 'grade'),
      selectedDay: null
    },
    settingsTab: 'perfil',
    subjectTab: 'pdfs'
  };

  // ------------------------------------------------------------
  // Navegação
  // ------------------------------------------------------------
  MEO.navigate = function (route, params) {
    MEO.state.route = route;
    MEO.state.params = params || {};
    closeSidebarMobile();
    window.scrollTo(0, 0);
    render();
    updateActiveNav();
  };

  MEO.rerender = function () { render(); };

  function render() {
    const root = document.getElementById('view-root');
    if (!root) return;
    let html = '';
    try {
      switch (MEO.state.route) {
        case 'visao-geral': html = MEO.views.visaoGeral(); break;
        case 'agenda': html = MEO.views.agenda(); break;
        case 'pomodoro': html = MEO.views.pomodoro(); break;
        case 'progresso': html = MEO.views.progresso(); break;
        case 'links': html = MEO.views.links(); break;
        case 'configuracoes': html = MEO.views.configuracoes(); break;
        case 'materia': html = MEO.views.materiaDetalhe(MEO.state.params.id); break;
        default: html = MEO.views.visaoGeral();
      }
    } catch (e) {
      console.error('Erro ao renderizar view', e);
      html = '<div class="empty-state"><h3>Ops, algo deu errado ao mostrar esta página.</h3><p>Tente novamente ou volte para a Visão geral.</p></div>';
    }
    root.innerHTML = `<div class="fade-in">${html}</div>`;
    MEO.refreshIcons();
    if (MEO.views.afterRender) MEO.views.afterRender(MEO.state.route);
  }

  function updateActiveNav() {
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.route === MEO.state.route);
    });
  }

  // ------------------------------------------------------------
  // Modais
  // ------------------------------------------------------------
  let modalStack = [];

  MEO.modal = {
    open(innerHtml, opts) {
      opts = opts || {};
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `<div class="modal ${opts.size === 'lg' ? 'modal-lg' : ''}" role="dialog" aria-modal="true">
        <button class="modal-close" aria-label="Fechar"><i data-lucide="x" class="ic"></i></button>
        ${innerHtml}
      </div>`;
      overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) MEO.modal.close(); });
      overlay.querySelector('.modal-close').addEventListener('click', () => MEO.modal.close());
      document.getElementById('modal-root').appendChild(overlay);
      modalStack.push(overlay);
      MEO.refreshIcons();
      const firstInput = overlay.querySelector('input, textarea, select, button.btn-primary');
      if (firstInput) setTimeout(() => firstInput.focus(), 40);
      document.addEventListener('keydown', escHandler);
      return overlay;
    },
    close() {
      const overlay = modalStack.pop();
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (modalStack.length === 0) document.removeEventListener('keydown', escHandler);
    },
    closeAll() {
      while (modalStack.length) MEO.modal.close();
    }
  };

  function escHandler(e) { if (e.key === 'Escape') MEO.modal.close(); }

  MEO.confirmModal = function ({ title, desc, confirmLabel, danger, onConfirm }) {
    const overlay = MEO.modal.open(`
      <div class="modal-confirm-icon"><i data-lucide="${danger ? 'trash-2' : 'help-circle'}" class="ic-lg"></i></div>
      <h2 class="modal-title">${MEO.escapeHTML(title)}</h2>
      <p class="modal-desc">${MEO.escapeHTML(desc || '')}</p>
      <div class="modal-actions">
        <button class="btn btn-secondary" data-act="cancelar">Cancelar</button>
        <button class="btn ${danger ? 'btn-danger-solid' : 'btn-primary'}" data-act="confirmar">${MEO.escapeHTML(confirmLabel || 'Confirmar')}</button>
      </div>
    `);
    let done = false;
    overlay.querySelector('[data-act="cancelar"]').addEventListener('click', () => MEO.modal.close());
    overlay.querySelector('[data-act="confirmar"]').addEventListener('click', (e) => {
      if (done) return;
      done = true;
      e.target.disabled = true;
      MEO.modal.close();
      onConfirm && onConfirm();
    });
  };

  // ------------------------------------------------------------
  // Barra lateral / menu mobile
  // ------------------------------------------------------------
  function openSidebarMobile() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebar-overlay').classList.add('open');
  }
  function closeSidebarMobile() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('open');
  }

  function wireSidebar() {
    document.getElementById('menu-open-btn').addEventListener('click', openSidebarMobile);
    document.getElementById('sidebar-close-btn').addEventListener('click', closeSidebarMobile);
    document.getElementById('sidebar-overlay').addEventListener('click', closeSidebarMobile);
    document.querySelectorAll('.nav-item[data-route]').forEach(btn => {
      btn.addEventListener('click', () => {
        MEO.state.selectedSemesterId = MEO.state.selectedSemesterId; // mantém filtro
        MEO.navigate(btn.dataset.route);
      });
    });
  }

  // ------------------------------------------------------------
  // Status de sincronização
  // ------------------------------------------------------------
  MEO.setSyncStatus = function (status) {
    MEO._syncStatus = status;
    const nodes = document.querySelectorAll('[data-sync-badge]');
    nodes.forEach(n => updateSyncBadge(n, status));
  };

  function updateSyncBadge(node, status) {
    const map = {
      salvando: { label: 'Salvando…', icon: 'loader-circle' },
      nuvem: { label: 'Salvo na nuvem', icon: 'cloud-check' },
      local: { label: 'Salvo neste aparelho', icon: 'hard-drive' },
      offline: { label: 'Offline', icon: 'cloud-off' },
      erro: { label: 'Erro ao sincronizar', icon: 'triangle-alert' }
    };
    const s = map[status] || map.local;
    node.className = 'sync-badge ' + status;
    node.innerHTML = `<i data-lucide="${s.icon}" class="ic-sm"></i> ${s.label}`;
    MEO.refreshIcons();
  }

  window.addEventListener('online', () => MEO.setSyncStatus(MEO.auth && MEO.auth.isSignedIn() ? 'nuvem' : 'local'));
  window.addEventListener('offline', () => MEO.setSyncStatus('offline'));

  // ------------------------------------------------------------
  // Busca universal
  // ------------------------------------------------------------
  function buildSearchIndex(query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const db = MEO.db;
    const results = [];
    const subjById = {}; db.list('subjects').forEach(s => subjById[s.id] = s);
    const semById = {}; db.list('semesters').forEach(s => semById[s.id] = s);

    db.list('semesters').forEach(s => {
      if (s.nome.toLowerCase().includes(q)) results.push({ tipo: 'Semestre', icon: 'layers', titulo: s.nome, go: () => { MEO.state.selectedSemesterId = s.id; MEO.navigate('visao-geral'); } });
    });
    db.list('subjects').forEach(s => {
      if (s.nome.toLowerCase().includes(q) || (s.professor || '').toLowerCase().includes(q)) {
        results.push({ tipo: 'Matéria', icon: 'book-open', titulo: s.nome, sub: s.professor || '', go: () => MEO.navigate('materia', { id: s.id }) });
      }
    });
    db.list('events').forEach(ev => {
      if (ev.titulo.toLowerCase().includes(q)) {
        results.push({ tipo: 'Agenda', icon: 'calendar-days', titulo: ev.titulo, sub: MEO.formatDateShort(ev.data), go: () => { MEO.state.agenda.selectedDay = ev.data; MEO.navigate('agenda'); } });
      }
    });
    db.list('summaries').forEach(sm => {
      if (sm.titulo.toLowerCase().includes(q) || (sm.conteudo || '').toLowerCase().includes(q)) {
        const subj = subjById[sm.subjectId];
        results.push({ tipo: 'Resumo', icon: 'file-text', titulo: sm.titulo, sub: subj ? subj.nome : '', go: () => { MEO.state.subjectTab = 'resumos'; MEO.navigate('materia', { id: sm.subjectId, openId: sm.id }); } });
      }
    });
    db.list('flashcards').forEach(fc => {
      if (fc.frente.toLowerCase().includes(q) || fc.verso.toLowerCase().includes(q)) {
        const subj = subjById[fc.subjectId];
        results.push({ tipo: 'Flashcard', icon: 'layers-3', titulo: fc.frente, sub: subj ? subj.nome : '', go: () => { MEO.state.subjectTab = 'flashcards'; MEO.navigate('materia', { id: fc.subjectId }); } });
      }
    });
    db.list('pdfs').forEach(p => {
      if (p.nome.toLowerCase().includes(q)) {
        const subj = subjById[p.subjectId];
        results.push({ tipo: 'PDF', icon: 'file', titulo: p.nome, sub: subj ? subj.nome : '', go: () => { MEO.state.subjectTab = 'pdfs'; MEO.navigate('materia', { id: p.subjectId }); } });
      }
    });
    db.list('links').forEach(l => {
      if (l.titulo.toLowerCase().includes(q)) results.push({ tipo: 'Link', icon: 'link-2', titulo: l.titulo, sub: l.url, go: () => MEO.navigate('links') });
    });
    db.list('subjectLinks').forEach(l => {
      if (l.titulo.toLowerCase().includes(q)) {
        const subj = subjById[l.subjectId];
        results.push({ tipo: 'Link da matéria', icon: 'link-2', titulo: l.titulo, sub: subj ? subj.nome : '', go: () => { MEO.state.subjectTab = 'links'; MEO.navigate('materia', { id: l.subjectId }); } });
      }
    });
    db.list('grades').forEach(g => {
      if (g.titulo.toLowerCase().includes(q)) {
        const subj = subjById[g.subjectId];
        results.push({ tipo: 'Nota', icon: 'percent', titulo: `${g.titulo} — ${g.nota}`, sub: subj ? subj.nome : '', go: () => { MEO.state.subjectTab = 'notas'; MEO.navigate('materia', { id: g.subjectId }); } });
      }
    });
    return results;
  }

  function renderSearchResults(query) {
    const panel = document.getElementById('search-results');
    if (!panel) return;
    if (!query.trim()) {
      panel.innerHTML = `<div class="search-empty">Digite para pesquisar em semestres, matérias, agenda, resumos, flashcards, PDFs e links.</div>`;
      return;
    }
    const results = buildSearchIndex(query);
    if (!results.length) {
      panel.innerHTML = `<div class="search-empty">Nenhum resultado para “${MEO.escapeHTML(query)}”.</div>`;
      return;
    }
    const groups = {};
    results.forEach(r => { (groups[r.tipo] = groups[r.tipo] || []).push(r); });
    let html = '';
    Object.keys(groups).forEach(tipo => {
      html += `<div class="search-group-title">${tipo}</div>`;
      groups[tipo].forEach((r, idx) => {
        html += `<div class="search-result-item" data-tipo="${tipo}" data-idx="${idx}">
          <i data-lucide="${r.icon}" class="ic"></i>
          <div style="min-width:0;flex:1;">
            <div style="font-weight:700;font-size:13.8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${MEO.escapeHTML(r.titulo)}</div>
            ${r.sub ? `<div style="font-size:11.8px;color:var(--texto-fraco);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${MEO.escapeHTML(r.sub)}</div>` : ''}
          </div>
        </div>`;
      });
    });
    panel.innerHTML = html;
    MEO.refreshIcons();
    panel.querySelectorAll('.search-result-item').forEach(el => {
      el.addEventListener('click', () => {
        const tipo = el.dataset.tipo, idx = Number(el.dataset.idx);
        const item = groups[tipo][idx];
        closeSearch();
        item.go();
      });
    });
  }

  function openSearch(initial) {
    const root = document.getElementById('search-root');
    root.innerHTML = `<div class="search-overlay" id="search-overlay">
      <div class="search-panel">
        <div class="search-panel-head">
          <i data-lucide="search" class="ic"></i>
          <input type="search" id="search-modal-input" placeholder="Pesquisar" value="${MEO.escapeHTML(initial || '')}">
          <button class="btn-icon btn-ghost" id="search-close-btn"><i data-lucide="x" class="ic"></i></button>
        </div>
        <div id="search-results"></div>
      </div>
    </div>`;
    MEO.refreshIcons();
    const input = document.getElementById('search-modal-input');
    renderSearchResults(input.value);
    input.addEventListener('input', MEO.debounce(() => renderSearchResults(input.value), 120));
    document.getElementById('search-close-btn').addEventListener('click', closeSearch);
    document.getElementById('search-overlay').addEventListener('mousedown', (e) => { if (e.target.id === 'search-overlay') closeSearch(); });
    setTimeout(() => input.focus(), 30);
    document.addEventListener('keydown', searchEscHandler);
  }
  function searchEscHandler(e) { if (e.key === 'Escape') closeSearch(); }
  function closeSearch() {
    document.getElementById('search-root').innerHTML = '';
    document.removeEventListener('keydown', searchEscHandler);
  }

  function wireSearch() {
    const input = document.getElementById('global-search-input');
    input.addEventListener('focus', () => openSearch(input.value));
    input.addEventListener('click', () => openSearch(input.value));
  }

  // ------------------------------------------------------------
  // PWA — instalação
  // ------------------------------------------------------------
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('install-btn').hidden = false;
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    document.getElementById('install-btn').hidden = true;
    MEO.toast('Aplicativo instalado com sucesso!', 'success');
  });
  function wireInstall() {
    document.getElementById('install-btn').addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      document.getElementById('install-btn').hidden = true;
    });
  }

  // ------------------------------------------------------------
  // Pomodoro: som + notificação ao concluir um ciclo de foco
  // ------------------------------------------------------------
  function playBeep() {
    try {
      const settings = MEO.db.state.settings.pomodoro || {};
      if (settings.som === false) return;
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const now = ctx.currentTime;
      [0, 0.22, 0.44].forEach((offset, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 660 + i * 120;
        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.22, now + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.2);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.24);
      });
      setTimeout(() => ctx.close().catch(() => {}), 1200);
    } catch (e) { /* som indisponível */ }
  }

  function notify(title, body) {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      try { new Notification(title, { body, icon: './icone-192.png' }); } catch (e) {}
    }
  }

  MEO.pomodoro.onCycleEnd((mode) => {
    playBeep();
    const labels = { foco: 'Foco concluído! Hora de uma pausa.', pausaCurta: 'Pausa curta concluída. Vamos voltar ao foco?', pausaLonga: 'Pausa longa concluída. Vamos voltar ao foco?' };
    MEO.toast(labels[mode] || 'Ciclo concluído!', 'success');
    notify('Meu Estudo Organizado', labels[mode] || 'Ciclo concluído!');
    if (MEO.state.route === 'pomodoro') MEO.rerender();
  });

  MEO.pomodoro.onSessionComplete = function (mins, subjectId) {
    MEO.db.upsert('studySessions', {
      subjectId: subjectId || null,
      minutos: mins,
      data: MEO.toDateKey(new Date())
    });
  };

  // ------------------------------------------------------------
  // Inicialização
  // ------------------------------------------------------------
  function updateGradFooter() {
    const curso = MEO.db.state.profile.curso;
    document.getElementById('grad-nome-footer').textContent = curso && curso.trim() ? curso : 'Não definida';
  }

  document.addEventListener('DOMContentLoaded', () => {
    MEO.db.init();
    wireSidebar();
    wireSearch();
    wireInstall();
    updateGradFooter();
    MEO.setSyncStatus(navigator.onLine ? 'local' : 'offline');

    MEO.db.onChange(() => { updateGradFooter(); render(); });
    MEO.auth.onChange(() => { render(); });

    MEO.pomodoro.onTick(() => { if (MEO.state.route === 'pomodoro') MEO.views.updatePomodoroDisplay && MEO.views.updatePomodoroDisplay(); });

    render();
    updateActiveNav();
    MEO.refreshIcons();
  });

})(window.MEO);
