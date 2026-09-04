// ============================================================
// Meu Estudo Organizado — renderização das páginas
// ============================================================
window.MEO = window.MEO || {};

(function (MEO) {
  'use strict';

  const V = {};
  MEO.views = V;
  const db = () => MEO.db;
  const esc = MEO.escapeHTML;

  // ------------------------------------------------------------
  // Feedback "Salvo" nos botões de salvar (troca o texto por um
  // tempinho depois de salvar, sem precisar de outro elemento).
  // ------------------------------------------------------------
  const savedFlashes = {};
  function saveLabel(id, normal) {
    return (savedFlashes[id] && savedFlashes[id] > Date.now()) ? 'Salvo' : normal;
  }
  function flashSaved(id) {
    savedFlashes[id] = Date.now() + 1600;
    setTimeout(() => { delete savedFlashes[id]; MEO.rerender && MEO.rerender(); }, 1600);
  }

  // ------------------------------------------------------------
  // Dias/horários de aula de uma matéria (suporta mais de um dia,
  // ex.: professor que dá aula da mesma matéria em dois dias diferentes)
  // ------------------------------------------------------------
  function subjectHorarios(subj) {
    if (subj.horarios && subj.horarios.length) return subj.horarios;
    if (subj.dia !== '' && subj.dia != null) return [{ dia: subj.dia, horaInicio: subj.horaInicio, horaFim: subj.horaFim }];
    return [];
  }
  function formatHorarios(subj, short) {
    const list = subjectHorarios(subj);
    if (!list.length) return short ? '' : 'Dia não definido';
    return list.map(h => {
      const diaLabel = h.dia !== '' && h.dia != null ? MEO.diasDaSemana[Number(h.dia)].l : '';
      const horaLabel = h.horaInicio ? `${h.horaInicio}${h.horaFim ? '–' + h.horaFim : ''}` : '';
      return [diaLabel, horaLabel].filter(Boolean).join(' · ');
    }).filter(Boolean).join(short ? ' · ' : ', ');
  }

  // ------------------------------------------------------------
  // Operações em cascata
  // ------------------------------------------------------------
  MEO.dataOps = {
    deleteSubjectCascade(subjectId) {
      db().list('summaries').filter(s => s.subjectId === subjectId).forEach(s => db().remove('summaries', s.id, { silent: true }));
      db().list('flashcards').filter(s => s.subjectId === subjectId).forEach(s => db().remove('flashcards', s.id, { silent: true }));
      db().list('subjectLinks').filter(s => s.subjectId === subjectId).forEach(s => db().remove('subjectLinks', s.id, { silent: true }));
      db().list('faltas').filter(s => s.subjectId === subjectId).forEach(s => db().remove('faltas', s.id, { silent: true }));
      db().list('grades').filter(s => s.subjectId === subjectId).forEach(s => db().remove('grades', s.id, { silent: true }));
      db().list('pdfs').filter(p => p.subjectId === subjectId).forEach(p => {
        MEO.idb.deleteBlob(p.id).catch(() => {});
        if (p.storagePath && MEO.sync) MEO.sync.deletePdfFile(p.storagePath).catch(() => {});
        db().remove('pdfs', p.id, { silent: true });
      });
      db().list('events').filter(e => e.subjectId === subjectId).forEach(e => db().upsert('events', { id: e.id, subjectId: null }, { silent: true }));
      db().list('studySessions').filter(s => s.subjectId === subjectId).forEach(s => db().upsert('studySessions', { id: s.id, subjectId: null }, { silent: true }));
      db().list('tasks').filter(t => t.subjectId === subjectId).forEach(t => db().upsert('tasks', { id: t.id, subjectId: null }, { silent: true }));
      db().list('trabalhos').filter(t => t.subjectId === subjectId).forEach(t => db().upsert('trabalhos', { id: t.id, subjectId: null }, { silent: true }));
      db().list('metas').filter(m => m.subjectId === subjectId).forEach(m => db().upsert('metas', { id: m.id, subjectId: null }, { silent: true }));
      db().remove('subjects', subjectId);
    },
    deleteSemesterCascade(semesterId) {
      db().list('subjects').filter(s => s.semesterId === semesterId).forEach(s => MEO.dataOps.deleteSubjectCascade(s.id));
      db().list('events').filter(e => e.semesterId === semesterId).forEach(e => db().upsert('events', { id: e.id, semesterId: null }, { silent: true }));
      db().list('tasks').filter(t => t.semesterId === semesterId).forEach(t => db().upsert('tasks', { id: t.id, semesterId: null }, { silent: true }));
      db().list('trabalhos').filter(t => t.semesterId === semesterId).forEach(t => db().upsert('trabalhos', { id: t.id, semesterId: null }, { silent: true }));
      db().remove('semesters', semesterId);
    }
  };

  function currentSemester() {
    const list = db().list('semesters');
    if (!list.length) return null;
    if (MEO.state.selectedSemesterId) {
      const found = list.find(s => s.id === MEO.state.selectedSemesterId);
      if (found) return found;
    }
    const atual = list.find(s => s.atual);
    return atual || list[0];
  }

  function subjectById(id) { return db().get('subjects', id); }

  // ============================================================
  // VISÃO GERAL
  // ============================================================
  V.visaoGeral = function () {
    const semesters = db().list('semesters').sort((a, b) => (b.dataInicio || '').localeCompare(a.dataInicio || ''));
    const sel = currentSemester();
    if (sel && !MEO.state.selectedSemesterId) MEO.state.selectedSemesterId = sel.id;

    const hoje = MEO.toDateKey(new Date());
    const em7 = new Date(); em7.setDate(em7.getDate() + 7);
    const em7Key = MEO.toDateKey(em7);
    const eventosAbertos = db().list('events').filter(e => !e.concluido);
    const pendentesHoje = eventosAbertos.filter(e => e.data === hoje).sort((a, b) => (a.hora || '99').localeCompare(b.hora || '99'));
    const proximos7 = eventosAbertos.filter(e => e.data > hoje && e.data <= em7Key).sort((a, b) => a.data.localeCompare(b.data));

    const tarefasAbertas = db().list('tasks').filter(t => t.status !== 'concluido');
    const tarefasHoje = tarefasAbertas.filter(t => t.data === hoje);
    const tarefasAtrasadas = tarefasAbertas.filter(t => MEO.tasks.isOverdue(t));
    const tarefasParaHome = tarefasAtrasadas.concat(tarefasHoje.filter(t => !MEO.tasks.isOverdue(t)));

    function taskItem(t) {
      const prio = MEO.tasks.PRIORIDADES[t.prioridade || 'media'];
      const subj = t.subjectId ? subjectById(t.subjectId) : null;
      return `<div class="item task-home-item" data-taskid="${t.id}">
        <button class="task-check-mini" data-act="concluir-tarefa-home" data-id="${t.id}" title="Concluir">
          <i data-lucide="circle" class="ic-sm"></i>
        </button>
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(t.titulo)}${subj ? ` <span style="color:var(--texto-fraco);font-weight:400;">· ${esc(subj.nome)}</span>` : ''}</span>
        <span class="priority-pill" style="background:${prio.cor}">${prio.label}</span>
      </div>`;
    }

    function eventItem(e) {
      const tipo = MEO.calendar.TIPOS[e.tipo] || MEO.calendar.TIPOS.outro;
      const corTipo = MEO.calendar.corDoTipo(e.tipo);
      return `<div class="item">
        <i data-lucide="${tipo.icon}" class="ic-sm" style="color:${corTipo}"></i>
        <span class="time">${e.hora || '—'}</span>
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(e.titulo)}</span>
      </div>`;
    }

    const nomeUsuario = (db().state.profile.nome || '').trim();
    let html = `
      <div class="page-head home-hero">
        <div>
          <h1>Olá, ${nomeUsuario ? esc(nomeUsuario) : 'estudante'}!</h1>
          <p class="sub">Organize seus semestres, matérias e compromissos em um só lugar.</p>
        </div>
        <button class="btn btn-primary" id="btn-novo-semestre"><i data-lucide="plus" class="ic-sm"></i> Novo semestre</button>
      </div>

      <div class="dash-grid">
        <div class="card dash-block">
          <h3><span class="chip-icon tarefas"><i data-lucide="list-checks" class="ic-sm"></i></span> O que preciso fazer hoje</h3>
          ${tarefasParaHome.length ? `<div class="dash-list">${tarefasParaHome.slice(0, 6).map(taskItem).join('')}</div>` : `<p style="color:var(--texto-fraco);font-size:13px;">Nenhuma tarefa para hoje. Aproveite!</p>`}
          ${tarefasAtrasadas.length ? `<p style="font-size:12.5px;color:#a1573f;font-weight:700;margin-top:8px;">${tarefasAtrasadas.length} tarefa${tarefasAtrasadas.length === 1 ? '' : 's'} atrasada${tarefasAtrasadas.length === 1 ? '' : 's'}</p>` : ''}
          <span class="ver-link" data-go="tarefas">Ver tarefas <i data-lucide="arrow-right" class="ic-sm"></i></span>
        </div>
        <div class="card dash-block">
          <h3><span class="chip-icon pendentes"><i data-lucide="circle-check" class="ic-sm"></i></span> Pendentes para hoje</h3>
          ${pendentesHoje.length ? `<div class="dash-list">${pendentesHoje.map(eventItem).join('')}</div>` : `<p style="color:var(--texto-fraco);font-size:13px;">Nada pendente para hoje. Aproveite!</p>`}
          <span class="ver-link" data-go="agenda">Ver agenda <i data-lucide="arrow-right" class="ic-sm"></i></span>
        </div>
        <div class="card dash-block">
          <h3><span class="chip-icon proximos"><i data-lucide="calendar-clock" class="ic-sm"></i></span> Próximos 7 dias</h3>
          ${proximos7.length ? `<div class="dash-list">${proximos7.slice(0, 6).map(eventItem).join('')}</div>` : `<p style="color:var(--texto-fraco);font-size:13px;">Nenhum compromisso nos próximos dias.</p>`}
          <span class="ver-link" data-go="agenda">Ver agenda <i data-lucide="arrow-right" class="ic-sm"></i></span>
        </div>
      </div>
    `;

    if (!semesters.length) {
      html += `<div class="empty-state card">
        <i data-lucide="layers" class="ic-xl"></i>
        <h3>Comece criando seu primeiro semestre</h3>
        <p>Cada semestre organiza suas matérias, horários e compromissos separadamente.</p>
        <button class="btn btn-primary" style="margin-top:14px;" id="btn-novo-semestre-2"><i data-lucide="plus" class="ic-sm"></i> Novo semestre</button>
      </div>`;
      return html;
    }

    html += `<h2 style="font-size:18px;margin:8px 0 14px;">Semestres</h2><div class="grid-cards">`;
    semesters.forEach(s => {
      const qtdMaterias = db().list('subjects').filter(x => x.semesterId === s.id).length;
      const periodo = (s.dataInicio || s.dataFim) ? `${s.dataInicio ? MEO.formatDateShort(s.dataInicio) : '?'} – ${s.dataFim ? MEO.formatDateShort(s.dataFim) : '?'}` : 'Período não definido';
      const isSel = MEO.state.selectedSemesterId === s.id;
      html += `<div class="card semester-card ${s.atual ? 'atual' : ''}" data-semid="${s.id}" style="${isSel ? 'outline:2px solid var(--cor-principal);outline-offset:2px;' : ''}">
        ${s.atual ? '<span class="tag-atual">Atual</span>' : ''}
        <h3>${esc(s.nome)}</h3>
        <span class="periodo"><i data-lucide="calendar" class="ic-sm"></i> ${periodo}</span>
        <span class="contagem">${qtdMaterias} matéria${qtdMaterias === 1 ? '' : 's'}</span>
        <div class="acoes">
          <button class="btn btn-sm btn-secondary" data-act="ver" data-id="${s.id}"><i data-lucide="eye" class="ic-sm"></i> Ver matérias</button>
          <button class="btn btn-sm btn-ghost" data-act="editar" data-id="${s.id}"><i data-lucide="pencil" class="ic-sm"></i></button>
          <button class="btn btn-sm btn-danger" data-act="excluir" data-id="${s.id}"><i data-lucide="trash-2" class="ic-sm"></i></button>
        </div>
      </div>`;
    });
    html += `</div>`;

    if (sel) {
      const subjects = db().list('subjects').filter(s => s.semesterId === sel.id).sort((a, b) => a.nome.localeCompare(b.nome));
      html += `<div style="display:flex;align-items:center;justify-content:space-between;margin:30px 0 14px;flex-wrap:wrap;gap:10px;">
        <h2 style="font-size:18px;">Matérias de “${esc(sel.nome)}”</h2>
        <button class="btn btn-primary btn-sm" id="btn-nova-materia"><i data-lucide="plus" class="ic-sm"></i> Nova matéria</button>
      </div>`;
      if (!subjects.length) {
        html += `<div class="empty-state card">
          <i data-lucide="book-open" class="ic-xl"></i>
          <h3>Nenhuma matéria neste semestre</h3>
          <p>Adicione as matérias deste período para organizar PDFs, resumos, flashcards e links.</p>
          <button class="btn btn-primary" style="margin-top:14px;" id="btn-nova-materia-2"><i data-lucide="plus" class="ic-sm"></i> Nova matéria</button>
        </div>`;
      } else {
        html += `<div class="grid-cards">`;
        subjects.forEach(s => {
          const horariosLabel = formatHorarios(s, true);
          const faltasSubj = db().list('faltas').filter(f => f.subjectId === s.id).reduce((sum, f) => sum + (f.aulas || 1), 0);
          const limiteFaltasSubj = s.limiteFaltas != null ? s.limiteFaltas : null;
          const notasSubj = db().list('grades').filter(g => g.subjectId === s.id);
          const mediaSubj = computeWeightedAverage(notasSubj);
          html += `<div class="card subject-card" style="border-left-color:${s.cor || 'var(--cor-principal-clara)'}" data-subid="${s.id}">
            <h3>${esc(s.nome)}</h3>
            ${s.professor ? `<span class="meta-row"><i data-lucide="user" class="ic-sm"></i> ${esc(s.professor)}</span>` : ''}
            ${horariosLabel ? `<span class="meta-row"><i data-lucide="calendar" class="ic-sm"></i> ${esc(horariosLabel)}</span>` : ''}
            ${(limiteFaltasSubj != null || mediaSubj != null) ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:2px;">
              ${limiteFaltasSubj != null ? `<span class="pill" style="${faltasSubj >= limiteFaltasSubj ? 'background:var(--erro);color:#fff;' : (faltasSubj / limiteFaltasSubj >= 0.7 ? 'background:var(--alerta);color:#fff;' : '')}"><i data-lucide="user-x" class="ic-sm"></i> ${faltasSubj}/${limiteFaltasSubj} faltas</span>` : ''}
              ${mediaSubj != null ? `<span class="pill" style="${mediaSubj < (s.mediaAprovacao != null ? s.mediaAprovacao : 6) ? 'background:var(--alerta);color:#fff;' : ''}"><i data-lucide="percent" class="ic-sm"></i> média ${mediaSubj.toFixed(1)}</span>` : ''}
            </div>` : ''}
            <div class="acoes">
              <button class="btn btn-sm btn-secondary fav-toggle ${s.favorito ? 'active' : ''}" data-act="favoritar-materia" data-id="${s.id}" title="${s.favorito ? 'Remover dos favoritos' : 'Favoritar'}"><i data-lucide="star" class="ic-sm"></i></button>
              <button class="btn btn-sm btn-secondary" data-act="editar-materia" data-id="${s.id}"><i data-lucide="pencil" class="ic-sm"></i></button>
              <button class="btn btn-sm btn-danger" data-act="excluir-materia" data-id="${s.id}"><i data-lucide="trash-2" class="ic-sm"></i></button>
            </div>
          </div>`;
        });
        html += `</div>`;
      }
    }

    return html;
  };

  function wireVisaoGeral(root) {
    const openSemForm = () => MEO.forms.semester();
    const b1 = root.querySelector('#btn-novo-semestre'); if (b1) b1.addEventListener('click', () => { if (b1.dataset.busy) return; b1.dataset.busy = '1'; openSemForm(); setTimeout(() => delete b1.dataset.busy, 500); });
    const b2 = root.querySelector('#btn-novo-semestre-2'); if (b2) b2.addEventListener('click', openSemForm);
    root.querySelectorAll('[data-go="agenda"]').forEach(el => el.addEventListener('click', () => MEO.navigate('agenda')));
    root.querySelectorAll('[data-go="tarefas"]').forEach(el => el.addEventListener('click', () => MEO.navigate('tarefas')));
    root.querySelectorAll('[data-act="concluir-tarefa-home"]').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      MEO.tasks.setStatus(btn.dataset.id, 'concluido');
      MEO.toast('Tarefa concluída!', 'success');
    }));

    root.querySelectorAll('.semester-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        MEO.state.selectedSemesterId = card.dataset.semid;
        MEO.rerender();
      });
    });
    root.querySelectorAll('[data-act="ver"]').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation(); MEO.state.selectedSemesterId = btn.dataset.id; MEO.rerender();
    }));
    root.querySelectorAll('[data-act="editar"]').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation(); MEO.forms.semester(db().get('semesters', btn.dataset.id));
    }));
    root.querySelectorAll('[data-act="excluir"]').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const s = db().get('semesters', btn.dataset.id);
      MEO.confirmModal({
        title: 'Excluir semestre?',
        desc: `Isso vai excluir “${s.nome}” e todas as matérias, PDFs, resumos, flashcards e links associados a ele. Esta ação não pode ser desfeita.`,
        confirmLabel: 'Excluir', danger: true,
        onConfirm: () => {
          MEO.dataOps.deleteSemesterCascade(s.id);
          if (MEO.state.selectedSemesterId === s.id) MEO.state.selectedSemesterId = null;
          MEO.toast('Semestre excluído.', 'success');
        }
      });
    }));

    const bm1 = root.querySelector('#btn-nova-materia'); if (bm1) bm1.addEventListener('click', () => MEO.forms.subject(currentSemester().id));
    const bm2 = root.querySelector('#btn-nova-materia-2'); if (bm2) bm2.addEventListener('click', () => MEO.forms.subject(currentSemester().id));

    root.querySelectorAll('.subject-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        MEO.navigate('materia', { id: card.dataset.subid });
      });
    });
    root.querySelectorAll('[data-act="editar-materia"]').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation(); MEO.forms.subject(currentSemester().id, subjectById(btn.dataset.id));
    }));
    root.querySelectorAll('[data-act="favoritar-materia"]').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const s = subjectById(btn.dataset.id);
      db().upsert('subjects', { id: s.id, favorito: !s.favorito });
    }));
    root.querySelectorAll('[data-act="excluir-materia"]').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const s = subjectById(btn.dataset.id);
      MEO.confirmModal({
        title: 'Excluir matéria?',
        desc: `Isso vai excluir “${s.nome}” e todo o conteúdo associado (PDFs, resumos, flashcards e links). Esta ação não pode ser desfeita.`,
        confirmLabel: 'Excluir', danger: true,
        onConfirm: () => { MEO.dataOps.deleteSubjectCascade(s.id); MEO.toast('Matéria excluída.', 'success'); }
      });
    }));
  }

  // ============================================================
  // MATÉRIA — detalhe
  // ============================================================
  V.materiaDetalhe = function (id) {
    const subj = subjectById(id);
    if (!subj) return `<div class="empty-state card"><h3>Matéria não encontrada</h3><p>Ela pode ter sido excluída.</p></div>`;
    const horariosSubj = subjectHorarios(subj);

    const tabs = [
      { id: 'visao', label: 'Visão geral', icon: 'layout-dashboard' },
      { id: 'tarefas', label: 'Tarefas', icon: 'list-checks' },
      { id: 'trabalhos', label: 'Trabalhos', icon: 'users' },
      { id: 'pdfs', label: 'PDFs', icon: 'file' },
      { id: 'resumos', label: 'Resumos', icon: 'file-text' },
      { id: 'flashcards', label: 'Flashcards', icon: 'layers-3' },
      { id: 'notas', label: 'Avaliações', icon: 'clipboard-list' },
      { id: 'faltas', label: 'Faltas', icon: 'user-x' },
      { id: 'links', label: 'Links para estudar', icon: 'link-2' },
      { id: 'observacoes', label: 'Observações', icon: 'notebook-pen' }
    ];
    if (!tabs.find(t => t.id === MEO.state.subjectTab)) MEO.state.subjectTab = 'visao';

    let html = `
      <span class="back-link" id="back-to-overview"><i data-lucide="arrow-left" class="ic-sm"></i> Voltar à visão geral</span>
      <div class="subject-header">
        <div class="color-badge" style="background:${subj.cor || 'var(--cor-principal-clara)'}">${esc((subj.nome || '?').trim().charAt(0))}</div>
        <div class="info">
          <h1>${esc(subj.nome)}</h1>
          <div class="meta">
            ${subj.professor ? `<span><i data-lucide="user" class="ic-sm"></i> ${esc(subj.professor)}</span>` : ''}
            ${horariosSubj.length ? horariosSubj.map(h => {
              const diaLabel = h.dia !== '' && h.dia != null ? MEO.diasDaSemana[Number(h.dia)].l : '';
              const horaLabel = h.horaInicio ? `${h.horaInicio}${h.horaFim ? '–' + h.horaFim : ''}` : '';
              return `<span><i data-lucide="calendar" class="ic-sm"></i> ${esc([diaLabel, horaLabel].filter(Boolean).join(' · ') || 'Dia não definido')}</span>`;
            }).join('') : `<span><i data-lucide="calendar" class="ic-sm"></i> Dia não definido</span>`}
          </div>
        </div>
        <button class="btn btn-secondary btn-sm" id="btn-editar-materia-topo" style="margin-left:auto;"><i data-lucide="pencil" class="ic-sm"></i> Editar</button>
      </div>

      <div class="tabs">
        ${tabs.map(t => `<button class="tab-btn ${MEO.state.subjectTab === t.id ? 'active' : ''}" data-tab="${t.id}"><i data-lucide="${t.icon}" class="ic-sm"></i> ${t.label}</button>`).join('')}
      </div>

      <div id="subject-tab-content">${renderSubjectTab(subj)}</div>
    `;
    return html;
  };

  function renderSubjectTab(subj) {
    switch (MEO.state.subjectTab) {
      case 'visao': return renderSubjectOverviewTab(subj);
      case 'tarefas': return renderSubjectTasksTab(subj);
      case 'trabalhos': return renderSubjectTrabalhosTab(subj);
      case 'pdfs': return renderPdfsTab(subj);
      case 'resumos': return renderSummariesTab(subj);
      case 'flashcards': return renderFlashcardsTab(subj);
      case 'notas': return renderNotasTab(subj);
      case 'faltas': return renderFaltasTab(subj);
      case 'links': return renderSubjectLinksTab(subj);
      case 'observacoes': return renderObservacoesTab(subj);
      default: return '';
    }
  }

  function diasAte(dateKey) {
    const hoje = MEO.parseDateKey(MEO.toDateKey(new Date()));
    const alvo = MEO.parseDateKey(dateKey);
    return Math.round((alvo - hoje) / 86400000);
  }

  function proximaAulaLabel(subj) {
    const horarios = subjectHorarios(subj).filter(h => h.dia !== '' && h.dia != null);
    if (!horarios.length) return null;
    const agora = new Date();
    const dowHoje = agora.getDay();
    const horaAgora = agora.getHours() * 60 + agora.getMinutes();
    let melhor = null;
    horarios.forEach(h => {
      const dia = Number(h.dia);
      let diff = (dia - dowHoje + 7) % 7;
      if (diff === 0 && h.horaInicio) {
        const [hh, mm] = h.horaInicio.split(':').map(Number);
        if (hh * 60 + mm < horaAgora) diff = 7;
      }
      if (melhor === null || diff < melhor.diff) melhor = { diff, h };
    });
    if (!melhor) return null;
    const { diff, h } = melhor;
    const horaLabel = h.horaInicio ? `${h.horaInicio}${h.horaFim ? '–' + h.horaFim : ''}` : '';
    const quando = diff === 0 ? 'Hoje' : diff === 1 ? 'Amanhã' : MEO.diasDaSemana[Number(h.dia)].l;
    return [quando, horaLabel].filter(Boolean).join(' · ');
  }

  function renderSubjectOverviewTab(subj) {
    const hoje = MEO.toDateKey(new Date());
    const proxAula = proximaAulaLabel(subj);
    const proxProva = db().list('events')
      .filter(e => e.subjectId === subj.id && e.tipo === 'prova' && !e.concluido && e.data >= hoje)
      .sort((a, b) => a.data.localeCompare(b.data))[0];
    const tarefasSubj = db().list('tasks').filter(t => t.subjectId === subj.id);
    const tarefasPendentes = tarefasSubj.filter(t => t.status !== 'concluido').length;
    const trabalhosSubj = db().list('trabalhos').filter(t => t.subjectId === subj.id);
    const trabalhosAtivos = trabalhosSubj.filter(t => t.status !== 'concluido').length;
    const notasSubj = db().list('grades').filter(g => g.subjectId === subj.id);
    const media = computeWeightedAverage(notasSubj);
    const faltasSubj = db().list('faltas').filter(f => f.subjectId === subj.id).reduce((sum, f) => sum + (f.aulas || 1), 0);
    const minutosEstudados = db().list('studySessions').filter(s => s.subjectId === subj.id).reduce((sum, s) => sum + (s.minutos || 0), 0);
    const ultimoPdf = db().list('pdfs').filter(p => p.subjectId === subj.id).sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''))[0];
    const ultimoResumo = db().list('summaries').filter(s => s.subjectId === subj.id).sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''))[0];

    function stat(icon, label, value, extra) {
      return `<div class="overview-stat">
        <div class="overview-stat-icon"><i data-lucide="${icon}" class="ic-sm"></i></div>
        <div class="overview-stat-body">
          <div class="overview-stat-label">${label}</div>
          <div class="overview-stat-value">${value}</div>
          ${extra ? `<div class="overview-stat-extra">${extra}</div>` : ''}
        </div>
      </div>`;
    }

    let html = `<div class="overview-grid">`;
    html += stat('calendar-clock', 'Próxima aula', proxAula || 'Nenhuma programada');
    html += stat('calendar-x', 'Próxima prova', proxProva ? esc(proxProva.titulo) : 'Nenhuma agendada', proxProva ? `em ${diasAte(proxProva.data)} dia${diasAte(proxProva.data) === 1 ? '' : 's'}` : '');
    html += stat('list-checks', 'Tarefas pendentes', tarefasPendentes);
    html += stat('users', 'Trabalhos ativos', trabalhosAtivos);
    html += stat('percent', 'Média atual', media != null ? media.toFixed(1) : '—');
    html += stat('user-x', 'Faltas', subj.limiteFaltas != null ? `${faltasSubj}/${subj.limiteFaltas}` : faltasSubj);
    html += stat('timer', 'Horas estudadas', minutosEstudados ? MEO.formatTime(minutosEstudados) : '0 min');
    html += `</div>`;

    html += `<div class="overview-grid" style="margin-top:14px;">`;
    html += stat('file', 'Último material', ultimoPdf ? esc(ultimoPdf.nome) : 'Nenhum enviado ainda');
    html += stat('file-text', 'Último resumo', ultimoResumo ? esc(ultimoResumo.titulo) : 'Nenhum criado ainda');
    html += `</div>`;

    return html;
  }

  function renderSubjectTasksTab(subj) {
    const tasks = db().list('tasks').filter(t => t.subjectId === subj.id).sort((a, b) => {
      const overdueA = MEO.tasks.isOverdue(a) ? 0 : 1, overdueB = MEO.tasks.isOverdue(b) ? 0 : 1;
      if (overdueA !== overdueB) return overdueA - overdueB;
      const da = a.data || '9999-99-99', db_ = b.data || '9999-99-99';
      return da.localeCompare(db_);
    });
    let html = `<div style="display:flex;justify-content:flex-end;margin-bottom:14px;">
      <button class="btn btn-primary btn-sm" id="btn-nova-tarefa-materia"><i data-lucide="plus" class="ic-sm"></i> Nova tarefa</button>
    </div>`;
    html += `<div class="task-list-view">`;
    html += tasks.length ? tasks.map(taskRowHtml).join('') : `<div class="empty-state card"><i data-lucide="list-checks" class="ic-xl"></i><h3>Nenhuma tarefa nesta matéria</h3><p>Crie tarefas para leituras, trabalhos e pendências desta matéria.</p></div>`;
    html += `</div>`;
    return html;
  }

  function renderSubjectTrabalhosTab(subj) {
    const trabalhos = db().list('trabalhos').filter(t => t.subjectId === subj.id).sort((a, b) => {
      const overdueA = MEO.trabalhos.isOverdue(a) ? 0 : 1, overdueB = MEO.trabalhos.isOverdue(b) ? 0 : 1;
      if (overdueA !== overdueB) return overdueA - overdueB;
      const da = a.dataEntrega || '9999-99-99', db_ = b.dataEntrega || '9999-99-99';
      return da.localeCompare(db_);
    });
    let html = `<div style="display:flex;justify-content:flex-end;margin-bottom:14px;">
      <button class="btn btn-primary btn-sm" id="btn-novo-trabalho-materia"><i data-lucide="plus" class="ic-sm"></i> Novo trabalho</button>
    </div>`;
    html += `<div class="task-list-view">`;
    html += trabalhos.length ? trabalhos.map(trabalhoRowHtml).join('') : `<div class="empty-state card"><i data-lucide="users" class="ic-xl"></i><h3>Nenhum trabalho nesta matéria</h3><p>Cadastre trabalhos em grupo com integrantes, etapas e prazo de entrega.</p></div>`;
    html += `</div>`;
    return html;
  }

  const STATUS_LABELS = { nao_iniciado: 'Não iniciado', lendo: 'Lendo', concluido: 'Concluído' };

  function renderPdfsTab(subj) {
    const pdfs = db().list('pdfs').filter(p => p.subjectId === subj.id).sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''));
    let html = `<div style="display:flex;justify-content:flex-end;margin-bottom:14px;">
      <label class="btn btn-primary btn-sm" style="cursor:pointer;">
        <i data-lucide="upload" class="ic-sm"></i> Enviar PDF
        <input type="file" id="pdf-upload-input" accept="application/pdf" multiple hidden>
      </label>
    </div>
    <div id="pdf-upload-progress-area"></div>`;
    if (!pdfs.length) {
      html += `<div class="empty-state card"><i data-lucide="file" class="ic-xl"></i><h3>Nenhum PDF ainda</h3><p>Envie os PDFs desta matéria para acessá-los rapidamente, mesmo offline.</p></div>`;
    } else {
      pdfs.forEach(p => {
        html += `<div class="item-row" data-pdfid="${p.id}">
          <div class="item-icon v4"><i data-lucide="file-text" class="ic"></i></div>
          <div class="item-main">
            <div class="item-title">${esc(p.nome)}</div>
            <div class="item-sub">${MEO.formatBytes(p.tamanho)} · adicionado em ${p.addedAt ? MEO.formatDateShort(p.addedAt) : '—'} ${p.localOnly ? ' · apenas neste aparelho' : ''}</div>
          </div>
          <select class="status-select" data-act="status-pdf" data-id="${p.id}">
            ${Object.keys(STATUS_LABELS).map(k => `<option value="${k}" ${p.status === k ? 'selected' : ''}>${STATUS_LABELS[k]}</option>`).join('')}
          </select>
          <div class="item-actions">
            <button class="btn-icon btn-secondary fav-toggle ${p.favorito ? 'active' : ''}" data-act="favoritar-pdf" data-id="${p.id}" title="${p.favorito ? 'Remover dos favoritos' : 'Favoritar'}"><i data-lucide="star" class="ic-sm"></i></button>
            <button class="btn-icon btn-secondary" data-act="abrir-pdf" data-id="${p.id}" title="Abrir"><i data-lucide="eye" class="ic-sm"></i></button>
            <button class="btn-icon btn-secondary" data-act="baixar-pdf" data-id="${p.id}" title="Baixar"><i data-lucide="download" class="ic-sm"></i></button>
            <button class="btn-icon btn-secondary" data-act="renomear-pdf" data-id="${p.id}" title="Renomear"><i data-lucide="pencil" class="ic-sm"></i></button>
            <button class="btn-icon btn-danger" data-act="excluir-pdf" data-id="${p.id}" title="Excluir"><i data-lucide="trash-2" class="ic-sm"></i></button>
          </div>
        </div>`;
      });
    }
    return html;
  }

  function renderSummariesTab(subj) {
    const items = db().list('summaries').filter(s => s.subjectId === subj.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    let html = `<div style="display:flex;justify-content:flex-end;margin-bottom:14px;">
      <button class="btn btn-primary btn-sm" id="btn-novo-resumo"><i data-lucide="plus" class="ic-sm"></i> Novo resumo</button>
    </div>`;
    if (!items.length) {
      html += `<div class="empty-state card"><i data-lucide="file-text" class="ic-xl"></i><h3>Nenhum resumo ainda</h3><p>Crie resumos manuais para revisar o conteúdo desta matéria.</p></div>`;
    } else {
      items.forEach(s => {
        html += `<div class="item-row summary-list-item" data-id="${s.id}">
          <div class="item-icon v2"><i data-lucide="file-text" class="ic"></i></div>
          <div class="item-main">
            <div class="item-title">${esc(s.titulo)}</div>
            <div class="item-sub">Atualizado em ${MEO.formatDateShort(s.updatedAt)} ${s.paginaInicio ? `· páginas ${s.paginaInicio}–${s.paginaFim || s.paginaInicio}` : ''}</div>
          </div>
          <div class="item-actions">
            <button class="btn-icon btn-secondary fav-toggle ${s.favorito ? 'active' : ''}" data-act="favoritar-resumo" data-id="${s.id}" title="${s.favorito ? 'Remover dos favoritos' : 'Favoritar'}"><i data-lucide="star" class="ic-sm"></i></button>
            <button class="btn-icon btn-secondary" data-act="imprimir-resumo" data-id="${s.id}" title="Imprimir / exportar PDF"><i data-lucide="printer" class="ic-sm"></i></button>
            <button class="btn-icon btn-danger" data-act="excluir-resumo" data-id="${s.id}" title="Excluir"><i data-lucide="trash-2" class="ic-sm"></i></button>
          </div>
        </div>`;
      });
    }
    return html;
  }

  function renderFlashcardsTab(subj) {
    const items = db().list('flashcards').filter(f => f.subjectId === subj.id);
    const dueItems = items.filter(MEO.srs.isDue);
    let html = `<div style="display:flex;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
      <div class="pill"><i data-lucide="clock" class="ic-sm"></i> ${dueItems.length} para revisar hoje</div>
      <div style="display:flex;gap:8px;">
        ${dueItems.length ? `<button class="btn btn-secondary btn-sm" id="btn-revisar-flash"><i data-lucide="play" class="ic-sm"></i> Revisar agora</button>` : ''}
        <button class="btn btn-primary btn-sm" id="btn-novo-flash"><i data-lucide="plus" class="ic-sm"></i> Novo flashcard</button>
      </div>
    </div>`;
    if (!items.length) {
      html += `<div class="empty-state card"><i data-lucide="layers-3" class="ic-xl"></i><h3>Nenhum flashcard ainda</h3><p>Crie perguntas e respostas para revisar com repetição espaçada.</p></div>`;
    } else {
      html += `<div class="flash-grid">`;
      items.forEach(f => {
        html += `<div class="flashcard" data-id="${f.id}">
          <div class="flashcard-inner">
            <div class="flashcard-face front"><span class="tag">Pergunta</span>${esc(f.frente)}</div>
            <div class="flashcard-face back"><span class="tag">Resposta</span>${esc(f.verso)}</div>
          </div>
        </div>`;
      });
      html += `</div>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
        <button class="btn btn-ghost btn-sm" id="btn-editar-flash-hint" style="pointer-events:none;color:var(--texto-fraco);">Toque no cartão para virar</button>
      </div>
      <h3 style="font-size:14px;margin:22px 0 10px;color:var(--texto-suave);">Gerenciar</h3>`;
      items.forEach(f => {
        html += `<div class="item-row">
          <div class="item-icon v3"><i data-lucide="layers-3" class="ic"></i></div>
          <div class="item-main"><div class="item-title">${esc(f.frente.slice(0, 60))}</div></div>
          <div class="item-actions">
            <button class="btn-icon btn-secondary" data-act="editar-flash" data-id="${f.id}"><i data-lucide="pencil" class="ic-sm"></i></button>
            <button class="btn-icon btn-danger" data-act="excluir-flash" data-id="${f.id}"><i data-lucide="trash-2" class="ic-sm"></i></button>
          </div>
        </div>`;
      });
    }
    return html;
  }

  function renderFaltasTab(subj) {
    const items = db().list('faltas').filter(f => f.subjectId === subj.id).sort((a, b) => b.data.localeCompare(a.data));
    const totalFaltas = items.reduce((sum, f) => sum + (f.aulas || 1), 0);
    const limiteFaltas = subj.limiteFaltas != null ? subj.limiteFaltas : null;
    const pct = limiteFaltas ? MEO.clamp(Math.round((totalFaltas / limiteFaltas) * 100), 0, 999) : null;
    const restantes = limiteFaltas != null ? Math.max(0, limiteFaltas - totalFaltas) : null;
    let corBarra = 'var(--sucesso)', statusTxt = '';
    if (limiteFaltas != null) {
      if (totalFaltas >= limiteFaltas) { corBarra = 'var(--erro)'; statusTxt = 'Limite de faltas atingido ou ultrapassado.'; }
      else if (pct >= 90) { corBarra = 'var(--erro)'; statusTxt = `Cuidado: poucas faltas restantes. Você ainda pode faltar ${restantes} aula${restantes === 1 ? '' : 's'}.`; }
      else if (pct >= 70) { corBarra = 'var(--alerta)'; statusTxt = `Atenção: você está se aproximando do limite. Ainda pode faltar ${restantes} aula${restantes === 1 ? '' : 's'}.`; }
      else { statusTxt = `Você ainda pode faltar ${restantes} aula${restantes === 1 ? '' : 's'}.`; }
    }

    let html = `<div style="display:flex;justify-content:flex-end;margin-bottom:14px;">
      <button class="btn btn-primary btn-sm" id="btn-nova-falta"><i data-lucide="plus" class="ic-sm"></i> Registrar falta</button>
    </div>`;

    html += `<div class="card" style="margin-bottom:18px;">`;
    if (limiteFaltas != null) {
      html += `<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
        <span style="font-size:14.5px;font-weight:700;">${totalFaltas} de ${limiteFaltas} falta${limiteFaltas === 1 ? '' : 's'} utilizada${limiteFaltas === 1 ? '' : 's'}</span>
        <span class="pill" style="background:${corBarra};color:#fff;">${pct}% do limite</span>
      </div>
      <div class="progress-bar-mini" style="height:10px;"><div class="fill" style="width:${MEO.clamp(pct, 0, 100)}%;background:${corBarra};"></div></div>
      <p style="font-size:12.8px;color:var(--texto-suave);margin-top:8px;">${statusTxt}</p>`;
    } else {
      html += `<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
        <p style="font-size:13.5px;color:var(--texto-suave);">Você tem <strong style="color:var(--texto);">${totalFaltas}</strong> falta${totalFaltas === 1 ? '' : 's'} registrada${totalFaltas === 1 ? '' : 's'}. Defina o limite de faltas em "Editar matéria" para acompanhar automaticamente.</p>
      </div>`;
    }
    html += `</div>`;

    if (!items.length) {
      html += `<div class="empty-state card"><i data-lucide="user-x" class="ic-xl"></i><h3>Nenhuma falta registrada</h3><p>Ótimo! Registre aqui se precisar faltar a alguma aula.</p></div>`;
    } else {
      items.forEach(f => {
        html += `<div class="item-row">
          <div class="item-icon v6"><i data-lucide="user-x" class="ic"></i></div>
          <div class="item-main">
            <div class="item-title">${MEO.formatDateShort(f.data)} · ${f.aulas} aula${f.aulas === 1 ? '' : 's'}</div>
            ${f.observacao ? `<div class="item-sub">${esc(f.observacao)}</div>` : ''}
          </div>
          <div class="item-actions">
            <button class="btn-icon btn-secondary" data-act="editar-falta" data-id="${f.id}"><i data-lucide="pencil" class="ic-sm"></i></button>
            <button class="btn-icon btn-danger" data-act="excluir-falta" data-id="${f.id}"><i data-lucide="trash-2" class="ic-sm"></i></button>
          </div>
        </div>`;
      });
    }
    return html;
  }

  // Escala a nota pra base 10 quando a avaliação usa outra nota máxima
  // (ex.: nota 17 de máximo 20 vira 8.5), pra poder somar tudo junto.
  function notaEmBase10(g) {
    const max = g.notaMaxima || 10;
    return max === 10 ? g.nota : (g.nota / max) * 10;
  }

  function computeWeightedAverage(items) {
    const realizadas = items.filter(g => typeof g.nota === 'number' && !isNaN(g.nota));
    const pesoTotal = realizadas.reduce((s, g) => s + (g.peso || 1), 0);
    if (!pesoTotal) return null;
    const soma = realizadas.reduce((s, g) => s + notaEmBase10(g) * (g.peso || 1), 0);
    return soma / pesoTotal;
  }

  const TIPOS_AVALIACAO_ICON = { prova: 'file-warning', trabalho: 'file-edit', seminario: 'presentation', atividade: 'clipboard-list', outro: 'percent' };
  const TIPOS_AVALIACAO_LABEL = { prova: 'Prova', trabalho: 'Trabalho', seminario: 'Seminário/Apresentação', atividade: 'Atividade', outro: 'Avaliação' };

  function renderNotasTab(subj) {
    const items = db().list('grades').filter(g => g.subjectId === subj.id).sort((a, b) => {
      const realizadaA = typeof a.nota === 'number' ? 1 : 0, realizadaB = typeof b.nota === 'number' ? 1 : 0;
      if (realizadaA !== realizadaB) return realizadaA - realizadaB; // "a realizar" primeiro
      return (a.data || '9999') .localeCompare(b.data || '9999') || (b.createdAt || '').localeCompare(a.createdAt || '');
    });
    const media = computeWeightedAverage(items);
    const mediaAprovacao = subj.mediaAprovacao != null ? subj.mediaAprovacao : 6;

    let html = `<div style="display:flex;justify-content:flex-end;margin-bottom:14px;">
      <button class="btn btn-primary btn-sm" id="btn-nova-nota"><i data-lucide="plus" class="ic-sm"></i> Nova avaliação</button>
    </div>`;

    html += `<div class="card" style="margin-bottom:18px;">`;
    if (media != null) {
      let status = { txt: 'Aprovado(a) até aqui', color: 'var(--sucesso)' };
      if (media < mediaAprovacao - 1) status = { txt: 'Abaixo da média', color: 'var(--erro)' };
      else if (media < mediaAprovacao) status = { txt: 'Atenção: perto da média', color: 'var(--alerta)' };
      html += `<div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap;">
        <div><span style="font-family:var(--fonte-serif);font-size:32px;font-weight:700;color:var(--cor-principal-escura);">${media.toFixed(1)}</span><span style="color:var(--texto-fraco);font-size:13px;"> / 10</span></div>
        <span class="pill" style="background:${status.color};color:#fff;">${status.txt}</span>
        <span style="color:var(--texto-suave);font-size:12.8px;">Média para aprovação: ${mediaAprovacao}</span>
      </div>`;
    } else {
      html += `<p style="font-size:13.5px;color:var(--texto-suave);">Nenhuma nota lançada ainda. Cadastre suas avaliações para acompanhar a média (para aprovação: ${mediaAprovacao}).</p>`;
    }
    html += `
      <details style="margin-top:16px;">
        <summary style="cursor:pointer;font-size:13px;font-weight:700;color:var(--cor-principal);display:flex;align-items:center;gap:6px;list-style:none;"><i data-lucide="calculator" class="ic-sm"></i> Simular nota necessária</summary>
        <div class="form-row" style="margin-top:12px;">
          <div class="form-field">
            <label for="sim-peso-restante">Peso das avaliações restantes</label>
            <input type="number" min="0.1" step="0.1" id="sim-peso-restante" value="1">
          </div>
          <div class="form-field">
            <label for="sim-media-desejada">Média desejada</label>
            <input type="number" min="0" max="10" step="0.1" id="sim-media-desejada" value="${mediaAprovacao}">
          </div>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-simular-nota"><i data-lucide="calculator" class="ic-sm"></i> Calcular</button>
        <p id="sim-resultado" style="margin-top:10px;font-size:13.5px;font-weight:700;color:var(--cor-principal-escura);"></p>
      </details>
    `;
    html += `</div>`;

    if (!items.length) {
      html += `<div class="empty-state card"><i data-lucide="percent" class="ic-xl"></i><h3>Nenhuma avaliação ainda</h3><p>Cadastre provas e trabalhos assim que souber deles, para já ir organizando o conteúdo e acompanhar sua média.</p></div>`;
    } else {
      html += `<div class="task-list-view">`;
      items.forEach(g => {
        const realizada = typeof g.nota === 'number';
        const prep = (g.conteudo && g.conteudo.length) ? Math.round((g.conteudo.filter(c => c.feito).length / g.conteudo.length) * 100) : null;
        const notaLabel = realizada ? `${g.nota}${(g.notaMaxima && g.notaMaxima !== 10) ? ' / ' + g.notaMaxima : ''}` : null;
        html += `<div class="task-row">
          <div class="grade-type-icon" style="color:${realizada ? 'var(--sucesso)' : 'var(--texto-fraco)'};border-color:${realizada ? 'var(--sucesso)' : 'var(--borda)'};">
            <i data-lucide="${TIPOS_AVALIACAO_ICON[g.tipo] || 'percent'}" class="ic-sm"></i>
          </div>
          <div style="flex:1;min-width:0;">
            <div class="task-title">${esc(g.titulo)}
              ${realizada ? `<span class="priority-pill" style="background:var(--sucesso);">${esc(notaLabel)}</span>` : `<span class="priority-pill" style="background:var(--alerta);">A realizar</span>`}
            </div>
            <div class="task-meta">
              <span>${TIPOS_AVALIACAO_LABEL[g.tipo] || 'Avaliação'}</span>
              ${g.data ? `<span><i data-lucide="calendar" class="ic-sm"></i> ${MEO.formatDateShort(g.data)}</span>` : ''}
              <span>Peso ${g.peso}</span>
            </div>
            ${prep != null ? `<div class="task-progress"><div class="task-progress-bar"><div class="task-progress-fill" style="width:${prep}%"></div></div><span>Preparação: ${prep}%</span></div>` : ''}
          </div>
          <div class="item-actions">
            <button class="btn-icon btn-secondary" data-act="editar-nota" data-id="${g.id}"><i data-lucide="pencil" class="ic-sm"></i></button>
            <button class="btn-icon btn-danger" data-act="excluir-nota" data-id="${g.id}"><i data-lucide="trash-2" class="ic-sm"></i></button>
          </div>
        </div>`;
      });
      html += `</div>`;
    }
    return html;
  }

  function renderSubjectLinksTab(subj) {
    const items = db().list('subjectLinks').filter(l => l.subjectId === subj.id);
    let html = `<div style="display:flex;justify-content:flex-end;margin-bottom:14px;">
      <button class="btn btn-primary btn-sm" id="btn-novo-link-materia"><i data-lucide="plus" class="ic-sm"></i> Novo link</button>
    </div>`;
    if (!items.length) {
      html += `<div class="empty-state card"><i data-lucide="link-2" class="ic-xl"></i><h3>Nenhum link ainda</h3><p>Guarde aqui os links úteis para estudar esta matéria.</p></div>`;
    } else {
      items.forEach(l => {
        html += `<div class="item-row">
          <div class="item-icon v1"><i data-lucide="link-2" class="ic"></i></div>
          <div class="item-main"><div class="item-title">${esc(l.titulo)}</div><div class="item-sub">${esc(l.url)}</div></div>
          <div class="item-actions">
            <button class="btn-icon btn-secondary fav-toggle ${l.favorito ? 'active' : ''}" data-act="favoritar-link-materia" data-id="${l.id}" title="${l.favorito ? 'Remover dos favoritos' : 'Favoritar'}"><i data-lucide="star" class="ic-sm"></i></button>
            <button class="btn-icon btn-secondary" data-act="abrir-link" data-url="${esc(l.url)}"><i data-lucide="external-link" class="ic-sm"></i></button>
            <button class="btn-icon btn-secondary" data-act="editar-link-materia" data-id="${l.id}"><i data-lucide="pencil" class="ic-sm"></i></button>
            <button class="btn-icon btn-danger" data-act="excluir-link-materia" data-id="${l.id}"><i data-lucide="trash-2" class="ic-sm"></i></button>
          </div>
        </div>`;
      });
    }
    return html;
  }

  function renderObservacoesTab(subj) {
    return `<div class="card">
      <div class="form-field">
        <label for="obs-textarea">Observações gerais sobre a matéria</label>
        <textarea id="obs-textarea" style="min-height:220px;">${esc(subj.observacoes || '')}</textarea>
      </div>
      <div style="display:flex;justify-content:flex-end;align-items:center;gap:10px;">
        <button class="btn btn-primary btn-sm" id="btn-salvar-obs"><i data-lucide="check" class="ic-sm"></i> ${saveLabel('btn-salvar-obs', 'Salvar')}</button>
      </div>
    </div>`;
  }

  function wireMateriaDetalhe(root) {
    const back = root.querySelector('#back-to-overview'); if (back) back.addEventListener('click', () => MEO.navigate('visao-geral'));
    const subjId = MEO.state.params.id;
    const subj = subjectById(subjId);
    if (!subj) return;
    const editTop = root.querySelector('#btn-editar-materia-topo');
    if (editTop) editTop.addEventListener('click', () => MEO.forms.subject(subj.semesterId, subj));

    root.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => {
      MEO.state.subjectTab = btn.dataset.tab;
      MEO.rerender();
    }));

    wireSubjectTab(root, subj);
  }

  function wireSubjectTab(root, subj) {
    // ---- Tarefas da matéria ----
    const btnNovaTarefaMateria = root.querySelector('#btn-nova-tarefa-materia');
    if (btnNovaTarefaMateria) btnNovaTarefaMateria.addEventListener('click', () => MEO.forms.task(null, { subjectId: subj.id }));
    wireTaskRowActions(root);

    // ---- Trabalhos da matéria ----
    const btnNovoTrabalhoMateria = root.querySelector('#btn-novo-trabalho-materia');
    if (btnNovoTrabalhoMateria) btnNovoTrabalhoMateria.addEventListener('click', () => MEO.forms.trabalho(null, { subjectId: subj.id }));
    wireTrabalhoRowActions(root);

    // ---- PDFs ----
    const uploadInput = root.querySelector('#pdf-upload-input');
    if (uploadInput) uploadInput.addEventListener('change', (e) => handlePdfUpload(subj, e.target.files, root));
    root.querySelectorAll('[data-act="status-pdf"]').forEach(sel => sel.addEventListener('change', () => {
      db().upsert('pdfs', { id: sel.dataset.id, status: sel.value });
    }));
    root.querySelectorAll('[data-act="favoritar-pdf"]').forEach(btn => btn.addEventListener('click', () => {
      const p = db().get('pdfs', btn.dataset.id);
      db().upsert('pdfs', { id: p.id, favorito: !p.favorito });
    }));
    root.querySelectorAll('[data-act="abrir-pdf"]').forEach(btn => btn.addEventListener('click', () => abrirPdf(btn.dataset.id)));
    root.querySelectorAll('[data-act="baixar-pdf"]').forEach(btn => btn.addEventListener('click', () => baixarPdf(btn.dataset.id)));
    root.querySelectorAll('[data-act="renomear-pdf"]').forEach(btn => btn.addEventListener('click', () => MEO.forms.renamePdf(db().get('pdfs', btn.dataset.id))));
    root.querySelectorAll('[data-act="excluir-pdf"]').forEach(btn => btn.addEventListener('click', () => {
      const p = db().get('pdfs', btn.dataset.id);
      MEO.confirmModal({
        title: 'Excluir PDF?', desc: `“${p.nome}” será removido permanentemente.`, confirmLabel: 'Excluir', danger: true,
        onConfirm: async () => {
          await MEO.idb.deleteBlob(p.id).catch(() => {});
          if (p.storagePath) MEO.sync.deletePdfFile(p.storagePath).catch(() => {});
          db().remove('pdfs', p.id);
          MEO.toast('PDF excluído.', 'success');
        }
      });
    }));

    // ---- Resumos ----
    const btnNovoResumo = root.querySelector('#btn-novo-resumo'); if (btnNovoResumo) btnNovoResumo.addEventListener('click', () => MEO.forms.summary(subj.id));
    root.querySelectorAll('.summary-list-item').forEach(el => el.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      MEO.forms.summary(subj.id, db().get('summaries', el.dataset.id));
    }));
    root.querySelectorAll('[data-act="favoritar-resumo"]').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const s = db().get('summaries', btn.dataset.id);
      db().upsert('summaries', { id: s.id, favorito: !s.favorito });
    }));
    root.querySelectorAll('[data-act="excluir-resumo"]').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      MEO.confirmModal({
        title: 'Excluir resumo?', desc: 'Esta ação não pode ser desfeita.', confirmLabel: 'Excluir', danger: true,
        onConfirm: () => { db().remove('summaries', btn.dataset.id); MEO.toast('Resumo excluído.', 'success'); }
      });
    }));
    root.querySelectorAll('[data-act="imprimir-resumo"]').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      imprimirResumo(db().get('summaries', btn.dataset.id), subj);
    }));

    // ---- Flashcards ----
    const btnNovoFlash = root.querySelector('#btn-novo-flash'); if (btnNovoFlash) btnNovoFlash.addEventListener('click', () => MEO.forms.flashcard(subj.id));
    const btnRevisar = root.querySelector('#btn-revisar-flash'); if (btnRevisar) btnRevisar.addEventListener('click', () => abrirRevisao(subj.id));
    root.querySelectorAll('.flashcard').forEach(card => card.addEventListener('click', () => card.classList.toggle('flipped')));
    root.querySelectorAll('[data-act="editar-flash"]').forEach(btn => btn.addEventListener('click', () => MEO.forms.flashcard(subj.id, db().get('flashcards', btn.dataset.id))));
    root.querySelectorAll('[data-act="excluir-flash"]').forEach(btn => btn.addEventListener('click', () => {
      MEO.confirmModal({
        title: 'Excluir flashcard?', desc: 'Esta ação não pode ser desfeita.', confirmLabel: 'Excluir', danger: true,
        onConfirm: () => { db().remove('flashcards', btn.dataset.id); MEO.toast('Flashcard excluído.', 'success'); }
      });
    }));

    // ---- Faltas ----
    const btnNovaFalta = root.querySelector('#btn-nova-falta'); if (btnNovaFalta) btnNovaFalta.addEventListener('click', () => MEO.forms.falta(subj.id));
    root.querySelectorAll('[data-act="editar-falta"]').forEach(btn => btn.addEventListener('click', () => MEO.forms.falta(subj.id, db().get('faltas', btn.dataset.id))));
    root.querySelectorAll('[data-act="excluir-falta"]').forEach(btn => btn.addEventListener('click', () => {
      MEO.confirmModal({
        title: 'Excluir falta?', desc: 'Esta ação não pode ser desfeita.', confirmLabel: 'Excluir', danger: true,
        onConfirm: () => { db().remove('faltas', btn.dataset.id); MEO.toast('Falta excluída.', 'success'); }
      });
    }));

    // ---- Notas ----
    const btnNovaNota = root.querySelector('#btn-nova-nota'); if (btnNovaNota) btnNovaNota.addEventListener('click', () => MEO.forms.grade(subj.id));
    root.querySelectorAll('[data-act="editar-nota"]').forEach(btn => btn.addEventListener('click', () => MEO.forms.grade(subj.id, db().get('grades', btn.dataset.id))));
    root.querySelectorAll('[data-act="excluir-nota"]').forEach(btn => btn.addEventListener('click', () => {
      MEO.confirmModal({
        title: 'Excluir nota?', desc: 'Esta ação não pode ser desfeita.', confirmLabel: 'Excluir', danger: true,
        onConfirm: () => { db().remove('grades', btn.dataset.id); MEO.toast('Nota excluída.', 'success'); }
      });
    }));
    const btnSimular = root.querySelector('#btn-simular-nota');
    if (btnSimular) btnSimular.addEventListener('click', () => {
      const items = db().list('grades').filter(g => g.subjectId === subj.id && typeof g.nota === 'number');
      const pesoAtual = items.reduce((s, g) => s + (g.peso || 1), 0);
      const somaAtual = items.reduce((s, g) => s + notaEmBase10(g) * (g.peso || 1), 0);
      const pesoRestante = Math.max(0.1, Number(root.querySelector('#sim-peso-restante').value) || 1);
      const mediaDesejada = Number(root.querySelector('#sim-media-desejada').value);
      const necessaria = ((mediaDesejada * (pesoAtual + pesoRestante)) - somaAtual) / pesoRestante;
      const out = root.querySelector('#sim-resultado');
      if (necessaria > 10) {
        out.textContent = `Não é matematicamente possível alcançar a média ${mediaDesejada} apenas com o peso restante informado (precisaria de ${necessaria.toFixed(1)}).`;
        out.style.color = 'var(--erro)';
      } else if (necessaria <= 0) {
        out.textContent = `Você já garantiu a média ${mediaDesejada} — qualquer nota nas avaliações restantes é suficiente.`;
        out.style.color = 'var(--sucesso)';
      } else {
        out.textContent = `Você precisa tirar, em média, ${necessaria.toFixed(1)} nas avaliações restantes (peso ${pesoRestante}) para atingir a média ${mediaDesejada}.`;
        out.style.color = 'var(--cor-principal-escura)';
      }
    });

    // ---- Links da matéria ----
    const btnNovoLink = root.querySelector('#btn-novo-link-materia'); if (btnNovoLink) btnNovoLink.addEventListener('click', () => MEO.forms.link(null, { subjectId: subj.id }));
    root.querySelectorAll('[data-act="abrir-link"]').forEach(btn => btn.addEventListener('click', () => window.open(btn.dataset.url, '_blank', 'noopener')));
    root.querySelectorAll('[data-act="editar-link-materia"]').forEach(btn => btn.addEventListener('click', () => MEO.forms.link(db().get('subjectLinks', btn.dataset.id), { subjectId: subj.id })));
    root.querySelectorAll('[data-act="favoritar-link-materia"]').forEach(btn => btn.addEventListener('click', () => {
      const l = db().get('subjectLinks', btn.dataset.id);
      db().upsert('subjectLinks', { id: l.id, favorito: !l.favorito });
    }));
    root.querySelectorAll('[data-act="excluir-link-materia"]').forEach(btn => btn.addEventListener('click', () => {
      MEO.confirmModal({
        title: 'Excluir link?', desc: 'Esta ação não pode ser desfeita.', confirmLabel: 'Excluir', danger: true,
        onConfirm: () => { db().remove('subjectLinks', btn.dataset.id); MEO.toast('Link excluído.', 'success'); }
      });
    }));

    // ---- Observações ----
    const obsArea = root.querySelector('#obs-textarea');
    const btnSalvarObs = root.querySelector('#btn-salvar-obs');
    if (btnSalvarObs) btnSalvarObs.addEventListener('click', () => {
      flashSaved('btn-salvar-obs');
      db().upsert('subjects', { id: subj.id, observacoes: obsArea.value });
      MEO.toast('Observações salvas.', 'success');
    });
    if (obsArea) obsArea.addEventListener('input', MEO.debounce(() => {
      flashSaved('btn-salvar-obs');
      db().upsert('subjects', { id: subj.id, observacoes: obsArea.value });
    }, 1200));
  }

  async function handlePdfUpload(subj, files, root) {
    const area = root.querySelector('#pdf-upload-progress-area');
    for (const file of Array.from(files)) {
      if (file.type !== 'application/pdf') { MEO.toast(`"${file.name}" não é um PDF válido.`, 'error'); continue; }
      const id = MEO.uid('pdf');
      const rowId = 'up-' + id;
      if (area) area.insertAdjacentHTML('beforeend', `<div class="item-row" id="${rowId}">
        <div class="item-icon v4"><i data-lucide="file-up" class="ic"></i></div>
        <div class="item-main"><div class="item-title">${esc(file.name)}</div>
        <div class="upload-progress"><div class="fill" style="width:0%"></div></div></div>
      </div>`);
      MEO.refreshIcons();
      const progFill = document.querySelector(`#${rowId} .fill`);
      try {
        await MEO.idb.putBlob(id, file, { nome: file.name });
        let storagePath = null, url = null, localOnly = true;
        if (MEO.auth.isSignedIn() && navigator.onLine) {
          try {
            const res = await MEO.sync.uploadPdf(id, subj.id, file, (pct) => { if (progFill) progFill.style.width = pct + '%'; });
            storagePath = res.path; url = res.url; localOnly = false;
          } catch (err) {
            console.error(err);
            MEO.toast(`Não foi possível enviar "${file.name}" para a nuvem. Uma cópia foi mantida neste aparelho.`, 'error');
          }
        } else {
          if (progFill) progFill.style.width = '100%';
        }
        db().upsert('pdfs', {
          id, subjectId: subj.id, nome: file.name, tamanho: file.size,
          addedAt: MEO.toDateKey(new Date()), status: 'nao_iniciado', storagePath, url, localOnly
        });
      } catch (err) {
        console.error(err);
        MEO.toast(`Erro ao salvar "${file.name}".`, 'error');
      }
      const rowEl = document.getElementById(rowId); if (rowEl) rowEl.remove();
    }
  }

  async function abrirPdf(id) {
    const p = db().get('pdfs', id);
    let blob = await MEO.idb.getBlob(id).catch(() => null);
    if (!blob && p.url) { window.open(p.url, '_blank', 'noopener'); return; }
    if (!blob) { MEO.toast('PDF indisponível offline. Conecte-se para baixá-lo.', 'error'); return; }
    const objUrl = URL.createObjectURL(blob);
    window.open(objUrl, '_blank', 'noopener');
  }
  async function baixarPdf(id) {
    const p = db().get('pdfs', id);
    let blob = await MEO.idb.getBlob(id).catch(() => null);
    if (!blob && p.url) { const a = document.createElement('a'); a.href = p.url; a.download = p.nome; a.target = '_blank'; a.click(); return; }
    if (!blob) { MEO.toast('PDF indisponível offline.', 'error'); return; }
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = objUrl; a.download = p.nome; a.click();
    setTimeout(() => URL.revokeObjectURL(objUrl), 4000);
  }

  function imprimirResumo(summary, subj) {
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>${esc(summary.titulo)}</title>
      <meta charset="utf-8">
      <style>body{font-family:Georgia,serif;max-width:700px;margin:40px auto;padding:0 20px;color:#3a2c3b;line-height:1.6;}
      h1{font-size:22px;color:#513a54;} .meta{color:#6f5f70;font-size:13px;margin-bottom:24px;} p{white-space:pre-wrap;}</style>
      </head><body><h1>${esc(summary.titulo)}</h1>
      <div class="meta">${esc(subj.nome)} ${summary.paginaInicio ? `· páginas ${summary.paginaInicio}–${summary.paginaFim || summary.paginaInicio}` : ''}</div>
      <p>${esc(summary.conteudo).replace(/\n/g, '<br>')}</p>
      </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  }

  // ---- Revisão de flashcards (modal de estudo) ----
  function abrirRevisao(subjectId) {
    let queue = db().list('flashcards').filter(f => f.subjectId === subjectId).filter(MEO.srs.isDue);
    if (!queue.length) { MEO.toast('Nenhum flashcard para revisar agora.', 'success'); return; }
    let idx = 0, flipped = false;
    const overlay = MEO.modal.open('', { size: 'lg' });
    function paint() {
      if (idx >= queue.length) {
        overlay.querySelector('.modal').innerHTML = `<button class="modal-close" aria-label="Fechar"><i data-lucide="x" class="ic"></i></button>
          <div class="empty-state"><i data-lucide="party-popper" class="ic-xl"></i><h3>Revisão concluída!</h3><p>Você revisou todos os cartões de hoje para esta matéria.</p>
          <button class="btn btn-primary" style="margin-top:14px;" id="fechar-revisao">Fechar</button></div>`;
        MEO.refreshIcons();
        overlay.querySelector('.modal-close').addEventListener('click', () => MEO.modal.close());
        overlay.querySelector('#fechar-revisao').addEventListener('click', () => MEO.modal.close());
        return;
      }
      const card = queue[idx];
      flipped = false;
      overlay.querySelector('.modal').innerHTML = `<button class="modal-close" aria-label="Fechar"><i data-lucide="x" class="ic"></i></button>
        <p class="modal-desc">Cartão ${idx + 1} de ${queue.length}</p>
        <div class="flashcard" id="rev-card" style="height:220px;"><div class="flashcard-inner">
          <div class="flashcard-face front">${esc(card.frente)}</div>
          <div class="flashcard-face back">${esc(card.verso)}</div>
        </div></div>
        <p style="text-align:center;color:var(--texto-fraco);font-size:12.5px;margin-top:10px;">Toque no cartão para ver a resposta</p>
        <div class="flashcard-review-actions">
          <button class="btn btn-danger" data-r="errei">Errei</button>
          <button class="btn btn-secondary" data-r="dificil">Difícil</button>
          <button class="btn btn-primary" data-r="acertei">Acertei</button>
        </div>`;
      MEO.refreshIcons();
      overlay.querySelector('.modal-close').addEventListener('click', () => MEO.modal.close());
      overlay.querySelector('#rev-card').addEventListener('click', () => overlay.querySelector('#rev-card').classList.toggle('flipped'));
      overlay.querySelectorAll('[data-r]').forEach(btn => btn.addEventListener('click', () => {
        const srs = MEO.srs.review(card, btn.dataset.r);
        db().upsert('flashcards', { id: card.id, srs });
        idx++; paint();
      }));
    }
    paint();
  }

  // ============================================================
  // TAREFAS
  // ============================================================
  V.tarefas = function () {
    if (!MEO.state.tarefas) MEO.state.tarefas = { status: 'pendentes', semesterId: '', subjectId: '', prioridade: '' };
    const st = MEO.state.tarefas;
    const semesters = db().list('semesters');
    const subjects = db().list('subjects').filter(s => !st.semesterId || s.semesterId === st.semesterId);

    let tasks = db().list('tasks');
    if (st.semesterId) tasks = tasks.filter(t => t.semesterId === st.semesterId);
    if (st.subjectId) tasks = tasks.filter(t => t.subjectId === st.subjectId);
    if (st.prioridade) tasks = tasks.filter(t => t.prioridade === st.prioridade);
    if (st.status === 'pendentes') tasks = tasks.filter(t => t.status !== 'concluido');
    else if (st.status === 'concluidas') tasks = tasks.filter(t => t.status === 'concluido');
    else if (st.status === 'atrasadas') tasks = tasks.filter(t => MEO.tasks.isOverdue(t));
    else if (st.status === 'hoje') tasks = tasks.filter(t => MEO.tasks.isToday(t));

    const total = db().list('tasks');
    const atrasadasCount = total.filter(t => MEO.tasks.isOverdue(t)).length;

    // ordena: atrasadas primeiro, depois por data (vazias no fim), depois por prioridade
    tasks.sort((a, b) => {
      const overdueA = MEO.tasks.isOverdue(a) ? 0 : 1;
      const overdueB = MEO.tasks.isOverdue(b) ? 0 : 1;
      if (overdueA !== overdueB) return overdueA - overdueB;
      const da = a.data || '9999-99-99', db_ = b.data || '9999-99-99';
      if (da !== db_) return da.localeCompare(db_);
      return MEO.tasks.PRIORIDADES[b.prioridade || 'media'].ordem - MEO.tasks.PRIORIDADES[a.prioridade || 'media'].ordem;
    });

    let html = `
      <div class="page-head">
        <div><h1>Minhas tarefas</h1><p class="sub">Tudo que você precisa fazer, com subtarefas, prazos e prioridades.</p></div>
        <button class="btn btn-primary" id="btn-nova-tarefa"><i data-lucide="plus" class="ic-sm"></i> Nova tarefa</button>
      </div>

      <div class="agenda-filters">
        ${['pendentes', 'hoje', 'atrasadas', 'concluidas', 'todos'].map(f => `<button class="filter-chip ${st.status === f ? 'active' : ''}" data-status="${f}">${{ pendentes: 'Pendentes', hoje: 'Hoje', atrasadas: `Atrasadas${atrasadasCount ? ' (' + atrasadasCount + ')' : ''}`, concluidas: 'Concluídas', todos: 'Todas' }[f]}</button>`).join('')}
        <select id="tk-filtro-prioridade" class="filter-chip" style="min-height:36px;">
          <option value="">Qualquer prioridade</option>
          ${Object.keys(MEO.tasks.PRIORIDADES).map(p => `<option value="${p}" ${st.prioridade === p ? 'selected' : ''}>${MEO.tasks.PRIORIDADES[p].label}</option>`).join('')}
        </select>
        <select id="tk-filtro-semestre" class="filter-chip" style="min-height:36px;">
          <option value="">Todos os semestres</option>
          ${semesters.map(s => `<option value="${s.id}" ${st.semesterId === s.id ? 'selected' : ''}>${esc(s.nome)}</option>`).join('')}
        </select>
        <select id="tk-filtro-materia" class="filter-chip" style="min-height:36px;">
          <option value="">Todas as matérias</option>
          ${subjects.map(s => `<option value="${s.id}" ${st.subjectId === s.id ? 'selected' : ''}>${esc(s.nome)}</option>`).join('')}
        </select>
      </div>

      <div class="task-list-view">
        ${tasks.length ? tasks.map(taskRowHtml).join('') : `<div class="empty-state card"><i data-lucide="list-checks" class="ic-xl"></i><h3>Nenhuma tarefa por aqui</h3><p>Crie sua primeira tarefa para organizar leituras, trabalhos e pendências.</p></div>`}
      </div>
    `;
    return html;
  };

  function taskRowHtml(t) {
    const subj = t.subjectId ? subjectById(t.subjectId) : null;
    const prio = MEO.tasks.PRIORIDADES[t.prioridade || 'media'];
    const statusInfo = MEO.tasks.STATUS[t.status || 'nao_iniciado'];
    const overdue = MEO.tasks.isOverdue(t);
    const progresso = MEO.tasks.subtaskProgress(t);
    const done = t.status === 'concluido';
    return `<div class="task-row ${done ? 'concluido' : ''} ${overdue ? 'atrasada' : ''}" data-id="${t.id}">
      <button class="task-check" data-act="concluir-tarefa" data-id="${t.id}" title="${done ? 'Reabrir' : 'Concluir'}">
        <i data-lucide="${done ? 'circle-check' : 'circle'}" class="ic"></i>
      </button>
      <div style="flex:1;min-width:0;">
        <div class="task-title">${esc(t.titulo)} <span class="priority-pill" style="background:${prio.cor}">${prio.label}</span></div>
        <div class="task-meta">
          ${t.data ? `<span class="${overdue ? 'meta-atrasada' : ''}"><i data-lucide="calendar" class="ic-sm"></i> ${MEO.formatDateShort(t.data)}${t.hora ? ' · ' + t.hora : ''}</span>` : ''}
          ${subj ? `<span><i data-lucide="book-open" class="ic-sm"></i> ${esc(subj.nome)}</span>` : ''}
          <span><i data-lucide="${statusInfo.icon}" class="ic-sm"></i> ${statusInfo.label}</span>
          ${(t.etiquetas || []).map(e => `<span class="task-tag"><i data-lucide="tag" class="ic-sm"></i> ${esc(e)}</span>`).join('')}
        </div>
        ${progresso != null ? `<div class="task-progress"><div class="task-progress-bar"><div class="task-progress-fill" style="width:${progresso}%"></div></div><span>${progresso}%</span></div>` : ''}
      </div>
      <div class="item-actions">
        <button class="btn-icon btn-secondary" data-act="editar-tarefa" data-id="${t.id}" title="Editar"><i data-lucide="pencil" class="ic-sm"></i></button>
        <button class="btn-icon btn-secondary" data-act="duplicar-tarefa" data-id="${t.id}" title="Duplicar"><i data-lucide="copy" class="ic-sm"></i></button>
        <button class="btn-icon btn-danger" data-act="excluir-tarefa" data-id="${t.id}" title="Excluir"><i data-lucide="trash-2" class="ic-sm"></i></button>
      </div>
    </div>`;
  }

  // Wiring compartilhado das ações de uma linha de tarefa (usado tanto na
  // página "Tarefas" quanto na aba "Tarefas" dentro de uma matéria).
  function wireTaskRowActions(root) {
    root.querySelectorAll('[data-act="concluir-tarefa"]').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const t = db().get('tasks', btn.dataset.id);
      MEO.tasks.setStatus(t.id, t.status === 'concluido' ? 'nao_iniciado' : 'concluido');
      MEO.toast(t.status === 'concluido' ? 'Tarefa reaberta.' : 'Tarefa concluída!', 'success');
    }));
    root.querySelectorAll('[data-act="editar-tarefa"]').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation(); MEO.forms.task(db().get('tasks', btn.dataset.id));
    }));
    root.querySelectorAll('[data-act="duplicar-tarefa"]').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation(); MEO.tasks.duplicate(db().get('tasks', btn.dataset.id)); MEO.toast('Tarefa duplicada.', 'success');
    }));
    root.querySelectorAll('[data-act="excluir-tarefa"]').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const t = db().get('tasks', btn.dataset.id);
      MEO.confirmModal({
        title: 'Excluir tarefa?',
        desc: `Isso vai excluir “${t.titulo}” definitivamente.`,
        confirmLabel: 'Excluir', danger: true,
        onConfirm: () => { db().remove('tasks', t.id); MEO.toast('Tarefa excluída.', 'success'); }
      });
    }));
  }

  function wireTarefas(root) {
    const st = MEO.state.tarefas;
    root.querySelector('#btn-nova-tarefa').addEventListener('click', () => MEO.forms.task());
    root.querySelectorAll('[data-status]').forEach(btn => btn.addEventListener('click', () => { st.status = btn.dataset.status; MEO.rerender(); }));
    const selPrio = root.querySelector('#tk-filtro-prioridade'); if (selPrio) selPrio.addEventListener('change', () => { st.prioridade = selPrio.value; MEO.rerender(); });
    const selSem = root.querySelector('#tk-filtro-semestre'); if (selSem) selSem.addEventListener('change', () => { st.semesterId = selSem.value; st.subjectId = ''; MEO.rerender(); });
    const selMat = root.querySelector('#tk-filtro-materia'); if (selMat) selMat.addEventListener('change', () => { st.subjectId = selMat.value; MEO.rerender(); });
    wireTaskRowActions(root);
  }

  // ============================================================
  // TRABALHOS ACADÊMICOS
  // ============================================================
  V.trabalhos = function () {
    if (!MEO.state.trabalhos) MEO.state.trabalhos = { status: 'ativos', semesterId: '', subjectId: '' };
    const st = MEO.state.trabalhos;
    const semesters = db().list('semesters');
    const subjects = db().list('subjects').filter(s => !st.semesterId || s.semesterId === st.semesterId);

    let trabalhos = db().list('trabalhos');
    if (st.semesterId) trabalhos = trabalhos.filter(t => t.semesterId === st.semesterId);
    if (st.subjectId) trabalhos = trabalhos.filter(t => t.subjectId === st.subjectId);
    if (st.status === 'ativos') trabalhos = trabalhos.filter(t => t.status !== 'concluido');
    else if (st.status === 'concluidos') trabalhos = trabalhos.filter(t => t.status === 'concluido');
    else if (st.status === 'atrasados') trabalhos = trabalhos.filter(t => MEO.trabalhos.isOverdue(t));

    const total = db().list('trabalhos');
    const atrasadosCount = total.filter(t => MEO.trabalhos.isOverdue(t)).length;

    trabalhos.sort((a, b) => {
      const overdueA = MEO.trabalhos.isOverdue(a) ? 0 : 1;
      const overdueB = MEO.trabalhos.isOverdue(b) ? 0 : 1;
      if (overdueA !== overdueB) return overdueA - overdueB;
      const da = a.dataEntrega || '9999-99-99', db_ = b.dataEntrega || '9999-99-99';
      return da.localeCompare(db_);
    });

    let html = `
      <div class="page-head">
        <div><h1>Trabalhos acadêmicos</h1><p class="sub">Trabalhos em grupo com integrantes, etapas e prazo de entrega.</p></div>
        <button class="btn btn-primary" id="btn-novo-trabalho"><i data-lucide="plus" class="ic-sm"></i> Novo trabalho</button>
      </div>

      <div class="agenda-filters">
        ${['ativos', 'atrasados', 'concluidos', 'todos'].map(f => `<button class="filter-chip ${st.status === f ? 'active' : ''}" data-status="${f}">${{ ativos: 'Ativos', atrasados: `Atrasados${atrasadosCount ? ' (' + atrasadosCount + ')' : ''}`, concluidos: 'Concluídos', todos: 'Todos' }[f]}</button>`).join('')}
        <select id="tb-filtro-semestre" class="filter-chip" style="min-height:36px;">
          <option value="">Todos os semestres</option>
          ${semesters.map(s => `<option value="${s.id}" ${st.semesterId === s.id ? 'selected' : ''}>${esc(s.nome)}</option>`).join('')}
        </select>
        <select id="tb-filtro-materia" class="filter-chip" style="min-height:36px;">
          <option value="">Todas as matérias</option>
          ${subjects.map(s => `<option value="${s.id}" ${st.subjectId === s.id ? 'selected' : ''}>${esc(s.nome)}</option>`).join('')}
        </select>
      </div>

      <div class="task-list-view">
        ${trabalhos.length ? trabalhos.map(trabalhoRowHtml).join('') : `<div class="empty-state card"><i data-lucide="users" class="ic-xl"></i><h3>Nenhum trabalho por aqui</h3><p>Cadastre um trabalho em grupo para organizar integrantes, etapas e prazo de entrega.</p></div>`}
      </div>
    `;
    return html;
  };

  function trabalhoRowHtml(t) {
    const subj = t.subjectId ? subjectById(t.subjectId) : null;
    const statusInfo = MEO.trabalhos.STATUS[t.status || 'nao_iniciado'];
    const overdue = MEO.trabalhos.isOverdue(t);
    const progresso = MEO.trabalhos.etapaProgress(t);
    const done = t.status === 'concluido';
    const dias = MEO.trabalhos.diasRestantes(t);
    let prazoLabel = '';
    if (t.dataEntrega) {
      if (overdue) prazoLabel = `Atrasado desde ${MEO.formatDateShort(t.dataEntrega)}`;
      else if (dias === 0) prazoLabel = 'Entrega hoje';
      else if (dias === 1) prazoLabel = 'Entrega amanhã';
      else if (dias != null && dias > 1) prazoLabel = `Entrega em ${dias} dias`;
      else prazoLabel = MEO.formatDateShort(t.dataEntrega);
    }
    return `<div class="task-row ${done ? 'concluido' : ''} ${overdue ? 'atrasada' : ''}" data-id="${t.id}">
      <button class="task-check" data-act="concluir-trabalho" data-id="${t.id}" title="${done ? 'Reabrir' : 'Concluir'}">
        <i data-lucide="${done ? 'circle-check' : 'circle'}" class="ic"></i>
      </button>
      <div style="flex:1;min-width:0;">
        <div class="task-title">${esc(t.titulo)}</div>
        <div class="task-meta">
          ${prazoLabel ? `<span class="${overdue ? 'meta-atrasada' : ''}"><i data-lucide="calendar" class="ic-sm"></i> ${esc(prazoLabel)}</span>` : ''}
          ${subj ? `<span><i data-lucide="book-open" class="ic-sm"></i> ${esc(subj.nome)}</span>` : ''}
          <span><i data-lucide="${statusInfo.icon}" class="ic-sm"></i> ${statusInfo.label}</span>
          ${(t.integrantes || []).length ? `<span><i data-lucide="users" class="ic-sm"></i> ${(t.integrantes || []).length} integrante${(t.integrantes || []).length === 1 ? '' : 's'}</span>` : ''}
        </div>
        ${progresso != null ? `<div class="task-progress"><div class="task-progress-bar"><div class="task-progress-fill" style="width:${progresso}%"></div></div><span>${progresso}%</span></div>` : ''}
      </div>
      <div class="item-actions">
        <button class="btn-icon btn-secondary" data-act="editar-trabalho" data-id="${t.id}" title="Editar"><i data-lucide="pencil" class="ic-sm"></i></button>
        <button class="btn-icon btn-secondary" data-act="duplicar-trabalho" data-id="${t.id}" title="Duplicar"><i data-lucide="copy" class="ic-sm"></i></button>
        <button class="btn-icon btn-danger" data-act="excluir-trabalho" data-id="${t.id}" title="Excluir"><i data-lucide="trash-2" class="ic-sm"></i></button>
      </div>
    </div>`;
  }

  // Wiring compartilhado das ações de uma linha de trabalho (usado tanto na
  // página "Trabalhos" quanto na aba "Trabalhos" dentro de uma matéria).
  function wireTrabalhoRowActions(root) {
    root.querySelectorAll('[data-act="concluir-trabalho"]').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const t = db().get('trabalhos', btn.dataset.id);
      MEO.trabalhos.setStatus(t.id, t.status === 'concluido' ? 'nao_iniciado' : 'concluido');
      MEO.toast(t.status === 'concluido' ? 'Trabalho reaberto.' : 'Trabalho concluído!', 'success');
    }));
    root.querySelectorAll('[data-act="editar-trabalho"]').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation(); MEO.forms.trabalho(db().get('trabalhos', btn.dataset.id));
    }));
    root.querySelectorAll('[data-act="duplicar-trabalho"]').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation(); MEO.trabalhos.duplicate(db().get('trabalhos', btn.dataset.id)); MEO.toast('Trabalho duplicado.', 'success');
    }));
    root.querySelectorAll('[data-act="excluir-trabalho"]').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const t = db().get('trabalhos', btn.dataset.id);
      MEO.confirmModal({
        title: 'Excluir trabalho?',
        desc: `Isso vai excluir “${t.titulo}” definitivamente.`,
        confirmLabel: 'Excluir', danger: true,
        onConfirm: () => { db().remove('trabalhos', t.id); MEO.toast('Trabalho excluído.', 'success'); }
      });
    }));
  }

  function wireTrabalhos(root) {
    const st = MEO.state.trabalhos;
    root.querySelector('#btn-novo-trabalho').addEventListener('click', () => MEO.forms.trabalho());
    root.querySelectorAll('[data-status]').forEach(btn => btn.addEventListener('click', () => { st.status = btn.dataset.status; MEO.rerender(); }));
    const selSem = root.querySelector('#tb-filtro-semestre'); if (selSem) selSem.addEventListener('change', () => { st.semesterId = selSem.value; st.subjectId = ''; MEO.rerender(); });
    const selMat = root.querySelector('#tb-filtro-materia'); if (selMat) selMat.addEventListener('change', () => { st.subjectId = selMat.value; MEO.rerender(); });
    wireTrabalhoRowActions(root);
  }

  // ============================================================
  // METAS
  // ============================================================
  V.metas = function () {
    if (!MEO.state.metas) MEO.state.metas = { status: 'ativas' };
    const st = MEO.state.metas;
    let metas = db().list('metas');
    if (st.status === 'ativas') metas = metas.filter(m => !m.concluida);
    else if (st.status === 'concluidas') metas = metas.filter(m => m.concluida);

    metas.sort((a, b) => {
      const overdueA = MEO.metas.isOverdue(a) ? 0 : 1, overdueB = MEO.metas.isOverdue(b) ? 0 : 1;
      if (overdueA !== overdueB) return overdueA - overdueB;
      const pa = a.prazo || '9999-99-99', pb = b.prazo || '9999-99-99';
      return pa.localeCompare(pb);
    });

    let html = `
      <div class="page-head">
        <div><h1>Minhas metas</h1><p class="sub">Metas pessoais e acadêmicas, com prazo e progresso.</p></div>
        <button class="btn btn-primary" id="btn-nova-meta"><i data-lucide="plus" class="ic-sm"></i> Nova meta</button>
      </div>
      <div class="agenda-filters">
        ${['ativas', 'concluidas', 'todas'].map(f => `<button class="filter-chip ${st.status === f ? 'active' : ''}" data-status="${f}">${{ ativas: 'Ativas', concluidas: 'Concluídas', todas: 'Todas' }[f]}</button>`).join('')}
      </div>
      <div class="task-list-view">
        ${metas.length ? metas.map(metaRowHtml).join('') : `<div class="empty-state card"><i data-lucide="target" class="ic-xl"></i><h3>Nenhuma meta ainda</h3><p>Crie metas como "tirar média 8" ou "ler 3 artigos por semana" e acompanhe seu progresso.</p></div>`}
      </div>
    `;
    return html;
  };

  function metaRowHtml(m) {
    const subj = m.subjectId ? subjectById(m.subjectId) : null;
    const overdue = MEO.metas.isOverdue(m);
    const progresso = m.progresso || 0;
    return `<div class="task-row ${m.concluida ? 'concluido' : ''} ${overdue ? 'atrasada' : ''}" data-id="${m.id}">
      <button class="task-check" data-act="concluir-meta" data-id="${m.id}" title="${m.concluida ? 'Reabrir' : 'Concluir'}">
        <i data-lucide="${m.concluida ? 'circle-check' : 'circle'}" class="ic"></i>
      </button>
      <div style="flex:1;min-width:0;">
        <div class="task-title">${esc(m.titulo)}</div>
        <div class="task-meta">
          ${m.prazo ? `<span class="${overdue ? 'meta-atrasada' : ''}"><i data-lucide="calendar" class="ic-sm"></i> ${MEO.formatDateShort(m.prazo)}</span>` : ''}
          ${subj ? `<span><i data-lucide="book-open" class="ic-sm"></i> ${esc(subj.nome)}</span>` : ''}
        </div>
        <div class="task-progress"><div class="task-progress-bar"><div class="task-progress-fill" style="width:${progresso}%"></div></div><span>${progresso}%</span></div>
      </div>
      <div class="item-actions">
        <button class="btn-icon btn-secondary" data-act="editar-meta" data-id="${m.id}" title="Editar"><i data-lucide="pencil" class="ic-sm"></i></button>
        <button class="btn-icon btn-danger" data-act="excluir-meta" data-id="${m.id}" title="Excluir"><i data-lucide="trash-2" class="ic-sm"></i></button>
      </div>
    </div>`;
  }

  function wireMetas(root) {
    const st = MEO.state.metas;
    root.querySelector('#btn-nova-meta').addEventListener('click', () => MEO.forms.meta());
    root.querySelectorAll('[data-status]').forEach(btn => btn.addEventListener('click', () => { st.status = btn.dataset.status; MEO.rerender(); }));
    root.querySelectorAll('[data-act="concluir-meta"]').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      MEO.metas.toggleConcluida(db().get('metas', btn.dataset.id));
    }));
    root.querySelectorAll('[data-act="editar-meta"]').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation(); MEO.forms.meta(db().get('metas', btn.dataset.id));
    }));
    root.querySelectorAll('[data-act="excluir-meta"]').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const m = db().get('metas', btn.dataset.id);
      MEO.confirmModal({
        title: 'Excluir meta?', desc: `Isso vai excluir "${m.titulo}" definitivamente.`, confirmLabel: 'Excluir', danger: true,
        onConfirm: () => { db().remove('metas', m.id); MEO.toast('Meta excluída.', 'success'); }
      });
    }));
  }

  // ============================================================
  // AGENDA
  // ============================================================
  V.agenda = function () {
    const st = MEO.state.agenda;
    const hoje = MEO.toDateKey(new Date());
    if (!st.weekStart) st.weekStart = MEO.calendar.mondayOf(hoje);
    const semesters = db().list('semesters');
    const subjects = db().list('subjects').filter(s => !st.semesterId || s.semesterId === st.semesterId);

    let label;
    if (st.view === 'semana') {
      const weekDaysForLabel = MEO.calendar.buildWeekGrid(st.weekStart);
      const first = MEO.parseDateKey(weekDaysForLabel[0].dateKey), last = MEO.parseDateKey(weekDaysForLabel[6].dateKey);
      label = `${first.getDate()} de ${MEO.MESES[first.getMonth()].slice(0, 3)} – ${last.getDate()} de ${MEO.MESES[last.getMonth()].slice(0, 3)}`;
    } else {
      label = `${MEO.MESES[st.month].charAt(0).toUpperCase() + MEO.MESES[st.month].slice(1)} de ${st.year}`;
    }

    let events = db().list('events');
    if (st.semesterId) events = events.filter(e => e.semesterId === st.semesterId);
    if (st.subjectId) events = events.filter(e => e.subjectId === st.subjectId);
    if (st.status === 'hoje') events = events.filter(e => e.data === hoje);
    else if (st.status === 'pendentes') events = events.filter(e => !e.concluido);
    else if (st.status === 'concluidos') events = events.filter(e => e.concluido);

    let html = `
      <div class="page-head">
        <div><h1>Minha agenda</h1><p class="sub">Todos os seus compromissos, provas e lembretes.</p></div>
        <button class="btn btn-primary" id="btn-novo-evento"><i data-lucide="plus" class="ic-sm"></i> Novo compromisso</button>
      </div>

      <div class="agenda-toolbar">
        <div class="agenda-nav">
          <button class="btn btn-secondary btn-icon" id="ag-prev"><i data-lucide="chevron-left" class="ic-sm"></i></button>
          <button class="btn btn-secondary btn-sm" id="ag-hoje">Hoje</button>
          <button class="btn btn-secondary btn-icon" id="ag-next"><i data-lucide="chevron-right" class="ic-sm"></i></button>
          <span class="mes-label">${label}</span>
        </div>
        <div class="view-toggle">
          <button class="btn btn-sm ${st.view === 'grade' ? 'btn-primary' : 'btn-secondary'}" data-view="grade">Grade</button>
          <button class="btn btn-sm ${st.view === 'semana' ? 'btn-primary' : 'btn-secondary'}" data-view="semana">Semana</button>
          <button class="btn btn-sm ${st.view === 'lista' ? 'btn-primary' : 'btn-secondary'}" data-view="lista">Lista</button>
        </div>
      </div>

      <div class="agenda-filters">
        ${['todos', 'hoje', 'pendentes', 'concluidos'].map(f => `<button class="filter-chip ${st.status === f ? 'active' : ''}" data-status="${f}">${{ todos: 'Todos', hoje: 'Hoje', pendentes: 'Pendentes', concluidos: 'Concluídos' }[f]}</button>`).join('')}
        <select id="ag-filtro-semestre" class="filter-chip" style="min-height:36px;">
          <option value="">Todos os semestres</option>
          ${semesters.map(s => `<option value="${s.id}" ${st.semesterId === s.id ? 'selected' : ''}>${esc(s.nome)}</option>`).join('')}
        </select>
        <select id="ag-filtro-materia" class="filter-chip" style="min-height:36px;">
          <option value="">Todas as matérias</option>
          ${subjects.map(s => `<option value="${s.id}" ${st.subjectId === s.id ? 'selected' : ''}>${esc(s.nome)}</option>`).join('')}
        </select>
      </div>
    `;

    if (st.view === 'semana') {
      let weekTasks = db().list('tasks').filter(t => t.data);
      if (st.semesterId) weekTasks = weekTasks.filter(t => t.semesterId === st.semesterId);
      if (st.subjectId) weekTasks = weekTasks.filter(t => t.subjectId === st.subjectId);
      if (st.status === 'hoje') weekTasks = weekTasks.filter(t => t.data === hoje);
      else if (st.status === 'pendentes') weekTasks = weekTasks.filter(t => t.status !== 'concluido');
      else if (st.status === 'concluidos') weekTasks = weekTasks.filter(t => t.status === 'concluido');

      const byDateEv = MEO.calendar.groupEventsByDate(events);
      const byDateTasks = {};
      weekTasks.forEach(t => { (byDateTasks[t.data] = byDateTasks[t.data] || []).push(t); });

      const weekDays = MEO.calendar.buildWeekGrid(st.weekStart);
      html += `<div class="week-grid">`;
      weekDays.forEach(day => {
        const evs = byDateEv[day.dateKey] || [];
        const tks = byDateTasks[day.dateKey] || [];
        html += `<div class="week-day-col ${day.isToday ? 'today' : ''}" data-day="${day.dateKey}">
          <div class="week-day-head">
            <span class="wd-name">${MEO.DIAS_SEMANA_ABREV[day.weekday].toUpperCase()}</span>
            <span class="wd-num">${day.day}</span>
          </div>
          <div class="week-day-body">
            ${(!evs.length && !tks.length) ? `<p class="week-empty">Nada por aqui</p>` : ''}
            ${evs.map(weekEventChip).join('')}
            ${tks.map(weekTaskChip).join('')}
            <button class="week-add-btn" data-act="add-semana" data-day="${day.dateKey}" title="Novo compromisso"><i data-lucide="plus" class="ic-sm"></i></button>
          </div>
        </div>`;
      });
      html += `</div>`;
    } else if (st.view === 'grade') {
      const grid = MEO.calendar.buildMonthGrid(st.year, st.month);
      const byDate = MEO.calendar.groupEventsByDate(events);
      html += `<div class="calendar-grid">`;
      MEO.DIAS_SEMANA_ABREV.forEach(d => { html += `<div class="calendar-weekday">${d}</div>`; });
      grid.forEach(day => {
        const evs = byDate[day.dateKey] || [];
        html += `<div class="calendar-day ${day.inMonth ? '' : 'out'} ${day.isToday ? 'today' : ''}" data-day="${day.dateKey}">
          <span class="day-num">${day.day}</span>
          ${evs.slice(0, 3).map(e => {
            const tipo = MEO.calendar.TIPOS[e.tipo] || MEO.calendar.TIPOS.outro;
            const corTipo = MEO.calendar.corDoTipo(e.tipo);
            return `<span class="ev-tag" style="background:${corTipo};${e.concluido ? 'opacity:.55;' : ''}"><i data-lucide="${tipo.icon}" class="ic"></i><span class="txt">${e.hora ? e.hora + ' ' : ''}${esc(e.titulo)}</span></span>`;
          }).join('')}
          ${evs.length > 3 ? `<span class="ev-more">+${evs.length - 3} mais</span>` : ''}
        </div>`;
      });
      html += `</div>`;
    } else {
      const byDate = MEO.calendar.groupEventsByDate(events);
      const dateKeys = Object.keys(byDate).sort();
      html += `<div class="agenda-list-view">`;
      if (!dateKeys.length) {
        html += `<div class="empty-state card"><i data-lucide="calendar-x" class="ic-xl"></i><h3>Nenhum compromisso encontrado</h3><p>Ajuste os filtros ou crie um novo compromisso.</p></div>`;
      }
      dateKeys.forEach(key => {
        html += `<div class="agenda-list-day"><div class="day-heading">${MEO.formatDateBR(key)}</div>`;
        byDate[key].forEach(e => { html += eventRowHtml(e); });
        html += `</div>`;
      });
      html += `</div>`;
    }

    return html;
  };

  function weekEventChip(e) {
    const tipo = MEO.calendar.TIPOS[e.tipo] || MEO.calendar.TIPOS.outro;
    const corTipo = MEO.calendar.corDoTipo(e.tipo);
    return `<div class="week-item" data-kind="evento" data-id="${e.id}" style="background:${corTipo};${e.concluido ? 'opacity:.55;' : ''}">
      <i data-lucide="${tipo.icon}" class="ic-sm"></i>
      <span class="txt">${e.hora ? e.hora + ' ' : ''}${esc(e.titulo)}</span>
    </div>`;
  }

  function weekTaskChip(t) {
    const prio = MEO.tasks.PRIORIDADES[t.prioridade || 'media'];
    return `<div class="week-item week-item-task ${t.status === 'concluido' ? 'concluido' : ''}" data-kind="tarefa" data-id="${t.id}" style="border-color:${prio.cor};">
      <i data-lucide="list-checks" class="ic-sm" style="color:${prio.cor};"></i>
      <span class="txt">${esc(t.titulo)}</span>
    </div>`;
  }

  function eventRowHtml(e) {
    const tipo = MEO.calendar.TIPOS[e.tipo] || MEO.calendar.TIPOS.outro;
    const corTipo = MEO.calendar.corDoTipo(e.tipo);
    const subj = e.subjectId ? subjectById(e.subjectId) : null;
    return `<div class="event-row ${e.concluido ? 'concluido' : ''}" data-id="${e.id}">
      <div class="ev-icon" style="background:${corTipo}"><i data-lucide="${tipo.icon}" class="ic-sm"></i></div>
      <div style="flex:1;min-width:0;">
        <div class="event-title">${e.hora ? `<span style="color:var(--cor-principal);">${e.hora}</span> · ` : ''}${esc(e.titulo)} ${e.prioridade === 'alta' ? '<span class="priority-alta">· prioridade alta</span>' : ''}</div>
        <div class="event-meta">${tipo.label}${subj ? ' · ' + esc(subj.nome) : ''}</div>
      </div>
      <div class="item-actions">
        <button class="btn-icon btn-secondary" data-act="concluir-evento" data-id="${e.id}" title="${e.concluido ? 'Reabrir' : 'Concluir'}"><i data-lucide="${e.concluido ? 'rotate-ccw' : 'check'}" class="ic-sm"></i></button>
        <button class="btn-icon btn-secondary" data-act="editar-evento" data-id="${e.id}" title="Editar"><i data-lucide="pencil" class="ic-sm"></i></button>
        <button class="btn-icon btn-danger" data-act="excluir-evento" data-id="${e.id}" title="Excluir"><i data-lucide="trash-2" class="ic-sm"></i></button>
      </div>
    </div>`;
  }

  function shiftWeek(mondayKey, days) {
    const d = MEO.parseDateKey(mondayKey);
    d.setDate(d.getDate() + days);
    return MEO.toDateKey(d);
  }

  function wireAgenda(root) {
    const st = MEO.state.agenda;
    root.querySelector('#btn-novo-evento').addEventListener('click', () => MEO.forms.event(null, { data: st.selectedDay || MEO.toDateKey(new Date()) }));
    root.querySelector('#ag-prev').addEventListener('click', () => {
      if (st.view === 'semana') { st.weekStart = shiftWeek(st.weekStart, -7); }
      else { st.month--; if (st.month < 0) { st.month = 11; st.year--; } }
      MEO.rerender();
    });
    root.querySelector('#ag-next').addEventListener('click', () => {
      if (st.view === 'semana') { st.weekStart = shiftWeek(st.weekStart, 7); }
      else { st.month++; if (st.month > 11) { st.month = 0; st.year++; } }
      MEO.rerender();
    });
    root.querySelector('#ag-hoje').addEventListener('click', () => {
      const d = new Date();
      st.month = d.getMonth(); st.year = d.getFullYear();
      st.weekStart = MEO.calendar.mondayOf(MEO.toDateKey(d));
      MEO.rerender();
    });
    root.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => { st.view = btn.dataset.view; MEO.rerender(); }));
    root.querySelectorAll('[data-status]').forEach(btn => btn.addEventListener('click', () => { st.status = btn.dataset.status; MEO.rerender(); }));
    root.querySelector('#ag-filtro-semestre').addEventListener('change', (e) => { st.semesterId = e.target.value; st.subjectId = ''; MEO.rerender(); });
    root.querySelector('#ag-filtro-materia').addEventListener('change', (e) => { st.subjectId = e.target.value; MEO.rerender(); });

    root.querySelectorAll('.calendar-day').forEach(day => day.addEventListener('click', () => {
      st.selectedDay = day.dataset.day;
      abrirDiaModal(day.dataset.day);
    }));

    // ---- Modo semana ----
    root.querySelectorAll('.week-item[data-kind="evento"]').forEach(el => el.addEventListener('click', () => MEO.forms.event(db().get('events', el.dataset.id))));
    root.querySelectorAll('.week-item[data-kind="tarefa"]').forEach(el => el.addEventListener('click', () => MEO.forms.task(db().get('tasks', el.dataset.id))));
    root.querySelectorAll('[data-act="add-semana"]').forEach(btn => btn.addEventListener('click', () => MEO.forms.event(null, { data: btn.dataset.day })));

    wireEventRows(root);
  }

  function wireEventRows(root) {
    root.querySelectorAll('[data-act="concluir-evento"]').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const ev = db().get('events', btn.dataset.id);
      db().upsert('events', { id: ev.id, concluido: !ev.concluido });
    }));
    root.querySelectorAll('[data-act="editar-evento"]').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation(); MEO.forms.event(db().get('events', btn.dataset.id));
    }));
    root.querySelectorAll('[data-act="excluir-evento"]').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      MEO.confirmModal({
        title: 'Excluir compromisso?', desc: 'Esta ação não pode ser desfeita.', confirmLabel: 'Excluir', danger: true,
        onConfirm: () => { db().remove('events', btn.dataset.id); MEO.toast('Compromisso excluído.', 'success'); }
      });
    }));
  }

  function abrirDiaModal(dateKey) {
    const events = db().list('events').filter(e => e.data === dateKey).sort((a, b) => (a.hora || '99').localeCompare(b.hora || '99'));
    const overlay = MEO.modal.open(`
      <h2 class="modal-title">${MEO.formatDateBR(dateKey)}</h2>
      <div id="dia-modal-list">${events.length ? events.map(eventRowHtml).join('') : `<p class="modal-desc">Nenhum compromisso neste dia.</p>`}</div>
      <div class="modal-actions"><button class="btn btn-primary btn-block" id="dia-modal-novo"><i data-lucide="plus" class="ic-sm"></i> Novo compromisso neste dia</button></div>
    `);
    MEO.refreshIcons();
    overlay.querySelector('#dia-modal-novo').addEventListener('click', () => { MEO.modal.close(); MEO.forms.event(null, { data: dateKey }); });
    wireEventRows(overlay);
  }

  // ============================================================
  // POMODORO
  // ============================================================
  V.pomodoro = function () {
    const subjects = db().list('subjects');
    const s = MEO.pomodoro.getState();
    const modeLabels = { foco: 'Foco', pausaCurta: 'Pausa curta', pausaLonga: 'Pausa longa' };
    const tarefasDaMateria = s.subjectId ? db().list('tasks').filter(t => t.subjectId === s.subjectId && t.status !== 'concluido') : [];
    return `
      <div class="page-head"><div><h1>Pomodoro</h1><p class="sub">Estude com foco, em ciclos, e acompanhe seu progresso.</p></div></div>
      <div class="pomo-wrap">
        <div class="pomo-modes">
          ${Object.keys(modeLabels).map(m => `<button class="pomo-mode-btn ${s.mode === m ? 'active' : ''}" data-mode="${m}">${modeLabels[m]}</button>`).join('')}
        </div>

        <div class="pomo-setup">
          <select class="pomo-subject-select" id="pomo-materia">
            <option value="">Sem matéria específica</option>
            ${subjects.map(sub => `<option value="${sub.id}" ${s.subjectId === sub.id ? 'selected' : ''}>${esc(sub.nome)}</option>`).join('')}
          </select>
          ${tarefasDaMateria.length ? `<select class="pomo-subject-select" id="pomo-tarefa">
            <option value="">Escolher uma tarefa pendente…</option>
            ${tarefasDaMateria.map(t => `<option value="${t.id}" ${s.taskId === t.id ? 'selected' : ''}>${esc(t.titulo)}</option>`).join('')}
          </select>` : ''}
          <input type="text" class="pomo-subject-select" id="pomo-atividade" placeholder="Atividade (opcional) — ex.: Estudar alterações da consciência" value="${esc(s.activity || '')}">
        </div>

        <div class="pomo-circle-wrap">
          <svg viewBox="0 0 200 200">
            <circle class="pomo-circle-bg" cx="100" cy="100" r="88"></circle>
            <circle class="pomo-circle-fg" id="pomo-circle-fg" cx="100" cy="100" r="88" stroke-dasharray="553"></circle>
          </svg>
          <div class="pomo-circle-center">
            <span class="pomo-time" id="pomo-time">00:00</span>
            <span class="pomo-mode-label">${modeLabels[s.mode]}</span>
          </div>
        </div>

        <div class="pomo-controls">
          <button class="btn btn-secondary btn-circle" id="pomo-reset" title="Reiniciar"><i data-lucide="rotate-ccw" class="ic"></i></button>
          <button class="btn btn-primary btn-circle" id="pomo-toggle" title="${s.running ? 'Pausar' : 'Iniciar'}"><i data-lucide="${s.running ? 'pause' : 'play'}" class="ic-lg"></i></button>
          <button class="btn btn-secondary btn-circle" id="pomo-skip" title="Pular"><i data-lucide="skip-forward" class="ic"></i></button>
        </div>

        <div class="pomo-cycles"><i data-lucide="flame" class="ic-sm"></i> ${s.cyclesToday} ciclo${s.cyclesToday === 1 ? '' : 's'} de foco concluído${s.cyclesToday === 1 ? '' : 's'} hoje</div>
      </div>
    `;
  };

  function paintPomodoro() {
    const root = document.getElementById('view-root');
    if (!root || MEO.state.route !== 'pomodoro') return;
    const s = MEO.pomodoro.getState();
    const timeEl = document.getElementById('pomo-time');
    if (!timeEl) return;
    const totalSec = Math.ceil(s.remainingMs / 1000);
    const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const ss = String(totalSec % 60).padStart(2, '0');
    timeEl.textContent = `${mm}:${ss}`;
    const circle = document.getElementById('pomo-circle-fg');
    if (circle) {
      const circumference = 553;
      const pct = s.totalMs > 0 ? s.remainingMs / s.totalMs : 0;
      circle.style.strokeDashoffset = String(circumference * (1 - pct));
      circle.style.stroke = s.mode === 'foco' ? 'var(--cor-principal)' : 'var(--sucesso)';
    }
    const toggleBtn = document.getElementById('pomo-toggle');
    if (toggleBtn) toggleBtn.innerHTML = `<i data-lucide="${s.running ? 'pause' : 'play'}" class="ic-lg"></i>`;
    MEO.refreshIcons();
  }
  V.updatePomodoroDisplay = paintPomodoro;

  function wirePomodoro(root) {
    root.querySelectorAll('[data-mode]').forEach(btn => btn.addEventListener('click', () => { MEO.pomodoro.setMode(btn.dataset.mode); MEO.rerender(); }));
    root.querySelector('#pomo-materia').addEventListener('change', (e) => { MEO.pomodoro.setSubject(e.target.value || null); MEO.rerender(); });
    const tarefaSel = root.querySelector('#pomo-tarefa');
    if (tarefaSel) tarefaSel.addEventListener('change', (e) => {
      if (!e.target.value) { MEO.pomodoro.setTask(null, ''); MEO.rerender(); return; }
      const t = MEO.db.get('tasks', e.target.value);
      MEO.pomodoro.setTask(e.target.value, t ? t.titulo : '');
      MEO.rerender();
    });
    const atividadeInput = root.querySelector('#pomo-atividade');
    if (atividadeInput) atividadeInput.addEventListener('input', (e) => MEO.pomodoro.setActivity(e.target.value));
    root.querySelector('#pomo-toggle').addEventListener('click', () => { MEO.pomodoro.toggle(); paintPomodoro(); });
    root.querySelector('#pomo-reset').addEventListener('click', () => { MEO.pomodoro.reset(); paintPomodoro(); });
    root.querySelector('#pomo-skip').addEventListener('click', () => { MEO.pomodoro.skip(); });
    const circle = document.getElementById('pomo-circle-fg');
    if (circle) circle.style.strokeDasharray = '553';
    paintPomodoro();
  }

  // ============================================================
  // PLANEJADOR DE ESTUDOS
  // ============================================================
  function computeStudySuggestion(subj) {
    const hoje = MEO.toDateKey(new Date());
    const semanaInicio = MEO.calendar.mondayOf(hoje);
    const eventos = db().list('events');
    const proxProva = eventos.filter(e => e.subjectId === subj.id && e.tipo === 'prova' && !e.concluido && e.data >= hoje)
      .sort((a, b) => a.data.localeCompare(b.data))[0];
    const proxTrabalho = db().list('trabalhos').filter(t => t.subjectId === subj.id && t.status !== 'concluido' && t.dataEntrega && t.dataEntrega >= hoje)
      .sort((a, b) => a.dataEntrega.localeCompare(b.dataEntrega))[0];
    const minutosSemana = db().list('studySessions')
      .filter(s => s.subjectId === subj.id && s.data >= semanaInicio && s.data <= hoje)
      .reduce((sum, s) => sum + (s.minutos || 0), 0);
    const meta = subj.metaSemanalMinutos || 0;
    const faltasSubj = db().list('faltas').filter(f => f.subjectId === subj.id).reduce((sum, f) => sum + (f.aulas || 1), 0);
    const riscoFaltas = subj.limiteFaltas != null && subj.limiteFaltas > 0 ? (faltasSubj / subj.limiteFaltas) : 0;

    let score = 0;
    const motivos = [];
    if (proxProva) {
      const dias = diasAte(proxProva.data);
      score += Math.max(0, 25 - dias * 2);
      motivos.push(dias <= 0 ? `Prova hoje` : `Prova em ${dias} dia${dias === 1 ? '' : 's'}`);
    }
    if (proxTrabalho) {
      const dias = diasAte(proxTrabalho.dataEntrega);
      score += Math.max(0, 18 - dias * 1.5);
      motivos.push(dias <= 0 ? `Trabalho entrega hoje` : `Trabalho entrega em ${dias} dia${dias === 1 ? '' : 's'}`);
    }
    if (meta > 0 && minutosSemana < meta) {
      score += 10;
      motivos.push(`Faltam ${MEO.formatTime(meta - minutosSemana)} pra bater a meta da semana`);
    }
    if (riscoFaltas >= 0.7) {
      score += riscoFaltas >= 0.9 ? 16 : 8;
      motivos.push('Poucas faltas restantes — não deixe de acompanhar');
    }
    return { subj, score, motivos, minutosSemana, meta };
  }

  V.planejador = function () {
    const subjects = db().list('subjects');
    const sugestoes = subjects.map(computeStudySuggestion).filter(s => s.score > 0).sort((a, b) => b.score - a.score);
    const comMeta = subjects.filter(s => s.metaSemanalMinutos > 0);

    let html = `
      <div class="page-head">
        <div><h1>Planejador de estudos</h1><p class="sub">Sugestões de prioridade com base em provas, trabalhos, metas e faltas.</p></div>
      </div>
    `;

    html += `<div class="card" style="margin-bottom:18px;">
      <h3 style="font-size:15.5px;margin-bottom:12px;"><i data-lucide="flag" class="ic-sm"></i> O que estudar agora</h3>
      ${sugestoes.length ? sugestoes.map(s => `
        <div class="plan-suggestion-row">
          <span class="shr-dot" style="background:${s.subj.cor || 'var(--cor-principal)'}"></span>
          <div class="shr-body">
            <span class="shr-title">${esc(s.subj.nome)}</span>
            <span class="shr-meta">${s.motivos.map(esc).join(' · ')}</span>
          </div>
          <div class="plan-suggestion-actions">
            <button class="btn btn-secondary btn-sm" data-act="plan-tarefa" data-id="${s.subj.id}" title="Criar tarefa de estudo"><i data-lucide="list-checks" class="ic-sm"></i></button>
            <button class="btn btn-primary btn-sm" data-act="plan-pomodoro" data-id="${s.subj.id}"><i data-lucide="timer" class="ic-sm"></i> Estudar agora</button>
          </div>
        </div>
      `).join('') : `<p style="color:var(--texto-fraco);font-size:13px;">Nenhuma matéria com estudo urgente agora. Defina metas semanais nas suas matérias para receber sugestões mesmo sem provas próximas.</p>`}
    </div>`;

    if (comMeta.length) {
      html += `<div class="card">
        <h3 style="font-size:15.5px;margin-bottom:14px;"><i data-lucide="trending-up" class="ic-sm"></i> Metas semanais de estudo</h3>
        ${comMeta.map(s => {
          const info = computeStudySuggestion(s);
          const pct = Math.min(100, Math.round((info.minutosSemana / info.meta) * 100));
          return `<div class="subject-dist-row">
            <span class="lbl">${esc(s.nome)}</span>
            <div class="track"><div class="fill" style="width:${pct}%;background:${s.cor || 'var(--cor-principal)'}"></div></div>
            <span class="val">${MEO.formatTime(info.minutosSemana)} / ${MEO.formatTime(info.meta)}</span>
          </div>`;
        }).join('')}
      </div>`;
    } else {
      html += `<div class="empty-state card"><i data-lucide="target" class="ic-xl"></i><h3>Defina metas de estudo</h3><p>Edite uma matéria e escolha uma meta semanal de estudo pra acompanhar seu progresso aqui.</p></div>`;
    }

    return html;
  };

  function wirePlanejador(root) {
    root.querySelectorAll('[data-act="plan-pomodoro"]').forEach(btn => btn.addEventListener('click', () => {
      const subj = db().get('subjects', btn.dataset.id);
      MEO.pomodoro.setSubject(subj.id);
      MEO.pomodoro.setActivity('');
      MEO.navigate('pomodoro');
    }));
    root.querySelectorAll('[data-act="plan-tarefa"]').forEach(btn => btn.addEventListener('click', () => {
      MEO.forms.task(null, { subjectId: btn.dataset.id, data: MEO.toDateKey(new Date()) });
    }));
  }

  // ============================================================
  // PROGRESSO
  // ============================================================
  V.progresso = function () {
    const subjects = db().list('subjects');
    const summaries = db().list('summaries');
    const flashcards = db().list('flashcards');
    const pdfs = db().list('pdfs');
    const eventosConcluidos = db().list('events').filter(e => e.concluido);
    const sessions = db().list('studySessions');
    const totalMin = sessions.reduce((a, s) => a + (s.minutos || 0), 0);

    const hasAnyData = subjects.length || summaries.length || flashcards.length || pdfs.length || sessions.length;

    let html = `<div class="page-head"><div><h1>Meu progresso</h1><p class="sub">Acompanhe sua evolução ao longo do tempo.</p></div></div>`;

    if (!hasAnyData) {
      html += `<div class="empty-state card"><i data-lucide="sparkles" class="ic-xl"></i><h3>Seu progresso vai aparecer aqui</h3>
        <p>Cadastre matérias, use o Pomodoro, crie resumos e flashcards para ver suas estatísticas.</p></div>`;
      return html;
    }

    html += `<div class="stat-grid">
      ${statCard('book-open', subjects.length, 'Matérias', 1)}
      ${statCard('file-text', summaries.length, 'Resumos', 2)}
      ${statCard('layers-3', flashcards.length, 'Flashcards', 3)}
      ${statCard('file', pdfs.length, 'PDFs', 4)}
      ${statCard('circle-check', eventosConcluidos.length, 'Tarefas concluídas', 5)}
      ${statCard('clock', MEO.formatTime(totalMin), 'Minutos estudados', 6)}
    </div>`;

    // últimos 7 dias
    const days = [];
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(MEO.toDateKey(d)); }
    const minsByDay = {};
    days.forEach(d => minsByDay[d] = 0);
    sessions.forEach(s => { if (minsByDay[s.data] != null) minsByDay[s.data] += s.minutos; });
    const maxMin = Math.max(1, ...Object.values(minsByDay));
    const semanaTotal = Object.values(minsByDay).reduce((a, b) => a + b, 0);

    const mesAtualKey = MEO.toDateKey(new Date()).slice(0, 7);
    const mesTotal = sessions.filter(s => s.data.startsWith(mesAtualKey)).reduce((a, s) => a + s.minutos, 0);

    html += `<div class="card" style="margin-bottom:18px;">
      <h3 style="font-size:15.5px;margin-bottom:6px;">Minutos estudados nos últimos 7 dias</h3>
      <p style="color:var(--texto-suave);font-size:13px;margin-bottom:10px;">Esta semana: ${MEO.formatTime(semanaTotal)} · Este mês: ${MEO.formatTime(mesTotal)}</p>
      <div class="bar-chart">
        ${days.map(d => {
          const val = minsByDay[d];
          const h = Math.max(3, Math.round((val / maxMin) * 100));
          const dt = MEO.parseDateKey(d);
          return `<div class="bar-col"><div class="bar" style="height:${h}%" title="${val} min"></div><span class="bar-lbl">${MEO.DIAS_SEMANA_MIN[dt.getDay()]}</span></div>`;
        }).join('')}
      </div>
    </div>`;

    // distribuição por matéria
    const distBySubject = {};
    sessions.forEach(s => { if (s.subjectId) distBySubject[s.subjectId] = (distBySubject[s.subjectId] || 0) + s.minutos; });
    const distEntries = Object.entries(distBySubject).sort((a, b) => b[1] - a[1]);
    const distMax = Math.max(1, ...distEntries.map(e => e[1]));

    html += `<div class="card" style="margin-bottom:18px;">
      <h3 style="font-size:15.5px;margin-bottom:14px;">Distribuição do tempo por matéria</h3>
      ${distEntries.length ? distEntries.map(([subId, mins]) => {
        const subj = subjectById(subId);
        if (!subj) return '';
        return `<div class="subject-dist-row">
          <span class="lbl">${esc(subj.nome)}</span>
          <div class="track"><div class="fill" style="width:${Math.round((mins / distMax) * 100)}%;background:${subj.cor || 'var(--cor-principal)'}"></div></div>
          <span class="val">${MEO.formatTime(mins)}</span>
        </div>`;
      }).join('') : `<p style="color:var(--texto-fraco);font-size:13px;">Estude com o Pomodoro escolhendo uma matéria para ver a distribuição aqui.</p>`}
    </div>`;

    // histórico de sessões recentes
    const sessoesRecentes = [...sessions].sort((a, b) => (b.data || '').localeCompare(a.data || '') || (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 8);
    if (sessoesRecentes.length) {
      html += `<div class="card" style="margin-bottom:18px;">
        <h3 style="font-size:15.5px;margin-bottom:12px;"><i data-lucide="clock" class="ic-sm"></i> Histórico de sessões</h3>
        ${sessoesRecentes.map(s => {
          const subj = s.subjectId ? subjectById(s.subjectId) : null;
          const dt = MEO.parseDateKey(s.data);
          const dataFmt = dt ? dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '';
          return `<div class="session-hist-row">
            <span class="shr-dot" style="background:${subj ? (subj.cor || 'var(--cor-principal)') : 'var(--texto-fraco)'}"></span>
            <div class="shr-body">
              <span class="shr-title">${esc(s.atividade || (subj ? subj.nome : 'Sessão de estudo'))}</span>
              <span class="shr-meta">${subj ? esc(subj.nome) + ' · ' : ''}${dataFmt}</span>
            </div>
            <span class="shr-mins">${MEO.formatTime(s.minutos || 0)}</span>
          </div>`;
        }).join('')}
      </div>`;
    }

    // sequência de dias estudados
    let streak = 0;
    let cursor = new Date();
    const studiedDays = new Set(sessions.map(s => s.data));
    while (studiedDays.has(MEO.toDateKey(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1); }

    html += `<div class="card">
      <h3 style="font-size:15.5px;margin-bottom:6px;"><i data-lucide="flame" class="ic-sm"></i> Sequência de dias estudados</h3>
      <p style="font-size:26px;font-family:var(--fonte-serif);color:var(--cor-principal-escura);font-weight:700;">${streak} dia${streak === 1 ? '' : 's'}</p>
      <p style="color:var(--texto-suave);font-size:13px;">Continue estudando todos os dias para aumentar sua sequência.</p>
    </div>`;

    const subjectsComFaltasOuNotas = subjects.filter(s => s.limiteFaltas != null || db().list('grades').some(g => g.subjectId === s.id));
    if (subjectsComFaltasOuNotas.length) {
      html += `<div class="card" style="margin-top:18px;">
        <h3 style="font-size:15.5px;margin-bottom:14px;"><i data-lucide="user-x" class="ic-sm"></i> Faltas e notas por matéria</h3>
        ${subjectsComFaltasOuNotas.map(s => {
          const faltasS = db().list('faltas').filter(f => f.subjectId === s.id).reduce((sum, f) => sum + (f.aulas || 1), 0);
          const limiteS = s.limiteFaltas != null ? s.limiteFaltas : null;
          const mediaS = computeWeightedAverage(db().list('grades').filter(g => g.subjectId === s.id));
          return `<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--borda);gap:10px;flex-wrap:wrap;">
            <span style="font-weight:700;font-size:13.5px;">${esc(s.nome)}</span>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              ${limiteS != null ? `<span class="pill" style="${faltasS >= limiteS ? 'background:var(--erro);color:#fff;' : (faltasS / limiteS >= 0.7 ? 'background:var(--alerta);color:#fff;' : '')}"><i data-lucide="user-x" class="ic-sm"></i> ${faltasS}/${limiteS}</span>` : ''}
              ${mediaS != null ? `<span class="pill" style="${mediaS < (s.mediaAprovacao != null ? s.mediaAprovacao : 6) ? 'background:var(--alerta);color:#fff;' : ''}"><i data-lucide="percent" class="ic-sm"></i> ${mediaS.toFixed(1)}</span>` : ''}
            </div>
          </div>`;
        }).join('')}
      </div>`;
    }

    return html;
  };

  function statCard(icon, num, label, variant) {
    return `<div class="card stat-card"><div class="stat-icon v${variant || 1}"><i data-lucide="${icon}" class="ic"></i></div><span class="stat-num">${num}</span><span class="stat-label">${label}</span></div>`;
  }

  // ============================================================
  // LINKS GERAIS
  // ============================================================
  V.links = function () {
    MEO.state.linksBusca = MEO.state.linksBusca || '';
    const all = db().list('links');
    const q = MEO.state.linksBusca.trim().toLowerCase();
    const items = q ? all.filter(l => l.titulo.toLowerCase().includes(q) || l.url.toLowerCase().includes(q)) : all;

    let html = `
      <div class="page-head">
        <div><h1>Links</h1><p class="sub">Links úteis que não pertencem a uma matéria específica.</p></div>
        <button class="btn btn-primary" id="btn-novo-link-geral"><i data-lucide="plus" class="ic-sm"></i> Novo link</button>
      </div>
      <div class="search-box" style="max-width:340px;margin-bottom:18px;">
        <i data-lucide="search" class="ic"></i>
        <input type="search" id="links-busca-input" placeholder="Pesquisar links" value="${esc(MEO.state.linksBusca)}">
      </div>
    `;

    if (!items.length) {
      html += `<div class="empty-state card"><i data-lucide="link-2" class="ic-xl"></i><h3>${all.length ? 'Nenhum link encontrado' : 'Nenhum link ainda'}</h3><p>${all.length ? 'Tente outra pesquisa.' : 'Adicione links úteis para acessar rapidamente depois.'}</p></div>`;
    } else {
      html += `<div class="grid-cards">`;
      items.forEach(l => {
        const favicon = MEO.faviconFor(l.url);
        html += `<div class="card link-card">
          ${favicon ? `<img class="favicon" src="${favicon}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">` : ''}
          <div class="link-icon-fallback" style="${favicon ? 'display:none;' : ''}">${MEO.iconSvgString('link-2', 'ic-sm')}</div>
          <div class="info">
            <div class="titulo">${esc(l.titulo)}</div>
            <div class="url">${esc(l.url)}</div>
            ${l.categoria ? `<span class="pill" style="margin-top:6px;">${esc(l.categoria)}</span>` : ''}
          </div>
          <div class="item-actions" style="flex-direction:column;">
            <button class="btn-icon btn-secondary fav-toggle ${l.favorito ? 'active' : ''}" data-act="favoritar" data-id="${l.id}" title="${l.favorito ? 'Remover dos favoritos' : 'Favoritar'}"><i data-lucide="star" class="ic-sm"></i></button>
            <button class="btn-icon btn-secondary" data-act="abrir" data-url="${esc(l.url)}" title="Abrir"><i data-lucide="external-link" class="ic-sm"></i></button>
            <button class="btn-icon btn-secondary" data-act="editar" data-id="${l.id}" title="Editar"><i data-lucide="pencil" class="ic-sm"></i></button>
            <button class="btn-icon btn-danger" data-act="excluir" data-id="${l.id}" title="Excluir"><i data-lucide="trash-2" class="ic-sm"></i></button>
          </div>
        </div>`;
      });
      html += `</div>`;
    }
    return html;
  };

  function wireLinks(root) {
    root.querySelector('#btn-novo-link-geral').addEventListener('click', () => MEO.forms.link());
    const input = root.querySelector('#links-busca-input');
    input.addEventListener('input', MEO.debounce(() => { MEO.state.linksBusca = input.value; MEO.rerender(); setTimeout(() => { const i2 = document.getElementById('links-busca-input'); if (i2) { i2.focus(); i2.setSelectionRange(i2.value.length, i2.value.length); } }, 0); }, 220));
    root.querySelectorAll('[data-act="abrir"]').forEach(btn => btn.addEventListener('click', () => window.open(btn.dataset.url, '_blank', 'noopener')));
    root.querySelectorAll('[data-act="editar"]').forEach(btn => btn.addEventListener('click', () => MEO.forms.link(db().get('links', btn.dataset.id))));
    root.querySelectorAll('[data-act="favoritar"]').forEach(btn => btn.addEventListener('click', () => {
      const l = db().get('links', btn.dataset.id);
      db().upsert('links', { id: l.id, favorito: !l.favorito });
    }));
    root.querySelectorAll('[data-act="excluir"]').forEach(btn => btn.addEventListener('click', () => {
      MEO.confirmModal({
        title: 'Excluir link?', desc: 'Esta ação não pode ser desfeita.', confirmLabel: 'Excluir', danger: true,
        onConfirm: () => { db().remove('links', btn.dataset.id); MEO.toast('Link excluído.', 'success'); }
      });
    }));
  }

  // ============================================================
  // NOTAS RÁPIDAS
  // ============================================================
  V.notasRapidas = function () {
    const notas = db().list('notas').sort((a, b) => (b.fixada ? 1 : 0) - (a.fixada ? 1 : 0) || (b.createdAt || '').localeCompare(a.createdAt || ''));
    let html = `<div class="page-head"><div><h1>Notas rápidas</h1><p class="sub">Anote pensamentos e lembretes rápidos, sem precisar vincular a uma matéria.</p></div></div>`;
    html += `<div class="card" style="margin-bottom:18px;">
      <div class="form-field" style="margin-bottom:10px;">
        <textarea id="nota-rapida-input" placeholder="Escreva uma nota rápida..." style="min-height:70px;"></textarea>
      </div>
      <button class="btn btn-primary btn-sm" id="btn-add-nota"><i data-lucide="plus" class="ic-sm"></i> Adicionar nota</button>
    </div>`;
    if (!notas.length) {
      html += `<div class="empty-state card"><i data-lucide="notebook-text" class="ic-xl"></i><h3>Nenhuma nota ainda</h3><p>Use este espaço pra ideias e lembretes rápidos do dia a dia.</p></div>`;
    } else {
      html += `<div class="notes-grid">`;
      notas.forEach(n => {
        html += `<div class="note-card ${n.fixada ? 'pinned' : ''}" data-id="${n.id}">
          <div class="note-text">${esc(n.texto)}</div>
          <div class="note-footer">
            <span class="note-date">${n.createdAt ? MEO.formatDateShort(n.createdAt) : ''}</span>
            <div class="item-actions">
              <button class="btn-icon btn-secondary ${n.fixada ? 'fav-toggle active' : ''}" data-act="fixar-nota" data-id="${n.id}" title="${n.fixada ? 'Desafixar' : 'Fixar'}"><i data-lucide="pin" class="ic-sm"></i></button>
              <button class="btn-icon btn-secondary" data-act="editar-nota-rapida" data-id="${n.id}" title="Editar"><i data-lucide="pencil" class="ic-sm"></i></button>
              <button class="btn-icon btn-danger" data-act="excluir-nota-rapida" data-id="${n.id}" title="Excluir"><i data-lucide="trash-2" class="ic-sm"></i></button>
            </div>
          </div>
        </div>`;
      });
      html += `</div>`;
    }
    return html;
  };

  function wireNotasRapidas(root) {
    const addBtn = root.querySelector('#btn-add-nota');
    const input = root.querySelector('#nota-rapida-input');
    addBtn.addEventListener('click', () => {
      const texto = input.value.trim();
      if (!texto) { input.focus(); return; }
      db().upsert('notas', { texto, fixada: false });
      MEO.toast('Nota adicionada.', 'success');
    });
    root.querySelectorAll('[data-act="fixar-nota"]').forEach(btn => btn.addEventListener('click', () => {
      const n = db().get('notas', btn.dataset.id);
      db().upsert('notas', { id: n.id, fixada: !n.fixada });
    }));
    root.querySelectorAll('[data-act="editar-nota-rapida"]').forEach(btn => btn.addEventListener('click', () => {
      MEO.forms.notaRapida(db().get('notas', btn.dataset.id));
    }));
    root.querySelectorAll('[data-act="excluir-nota-rapida"]').forEach(btn => btn.addEventListener('click', () => {
      const n = db().get('notas', btn.dataset.id);
      MEO.confirmModal({
        title: 'Excluir nota?', desc: 'Esta ação não pode ser desfeita.', confirmLabel: 'Excluir', danger: true,
        onConfirm: () => { db().remove('notas', n.id); MEO.toast('Nota excluída.', 'success'); }
      });
    }));
  }

  // ============================================================
  // FAVORITOS
  // ============================================================
  V.favoritos = function () {
    const materias = db().list('subjects').filter(s => s.favorito);
    const resumos = db().list('summaries').filter(s => s.favorito);
    const linksMateria = db().list('subjectLinks').filter(l => l.favorito);
    const linksGerais = db().list('links').filter(l => l.favorito);
    const pdfs = db().list('pdfs').filter(p => p.favorito);
    const total = materias.length + resumos.length + linksMateria.length + linksGerais.length + pdfs.length;

    function row(icon, titulo, sub, tipo, id, collection) {
      return `<div class="item-row">
        <div class="item-icon v1"><i data-lucide="${icon}" class="ic"></i></div>
        <div class="item-main"><div class="item-title">${esc(titulo)}</div><div class="item-sub">${esc(sub)}</div></div>
        <div class="item-actions">
          <button class="btn-icon btn-secondary" data-act="ir-favorito" data-tipo="${tipo}" data-id="${id}" title="Abrir"><i data-lucide="external-link" class="ic-sm"></i></button>
          <button class="btn-icon btn-secondary fav-toggle active" data-act="remover-favorito" data-collection="${collection}" data-id="${id}" title="Remover dos favoritos"><i data-lucide="star" class="ic-sm"></i></button>
        </div>
      </div>`;
    }

    let html = `<div class="page-head"><div><h1>Favoritos</h1><p class="sub">Acesso rápido ao que você marcou com estrela.</p></div></div>`;

    if (!total) {
      html += `<div class="empty-state card"><i data-lucide="star" class="ic-xl"></i><h3>Nenhum favorito ainda</h3><p>Toque na estrela de uma matéria, resumo, PDF ou link para vê-lo aqui.</p></div>`;
      return html;
    }

    if (materias.length) {
      html += `<h3 style="font-size:14px;margin:6px 0 10px;color:var(--texto-suave);">Matérias</h3>`;
      html += materias.map(s => row('book-open', s.nome, s.professor || '', 'materia', s.id, 'subjects')).join('');
    }
    if (resumos.length) {
      html += `<h3 style="font-size:14px;margin:18px 0 10px;color:var(--texto-suave);">Resumos</h3>`;
      html += resumos.map(s => { const subj = subjectById(s.subjectId); return row('file-text', s.titulo, subj ? subj.nome : '', 'resumo', s.id, 'summaries'); }).join('');
    }
    if (pdfs.length) {
      html += `<h3 style="font-size:14px;margin:18px 0 10px;color:var(--texto-suave);">PDFs</h3>`;
      html += pdfs.map(p => { const subj = subjectById(p.subjectId); return row('file', p.nome, subj ? subj.nome : '', 'pdf', p.id, 'pdfs'); }).join('');
    }
    if (linksMateria.length || linksGerais.length) {
      html += `<h3 style="font-size:14px;margin:18px 0 10px;color:var(--texto-suave);">Links</h3>`;
      html += linksMateria.map(l => { const subj = subjectById(l.subjectId); return row('link-2', l.titulo, subj ? subj.nome : l.url, 'link-materia', l.id, 'subjectLinks'); }).join('');
      html += linksGerais.map(l => row('link-2', l.titulo, l.url, 'link-geral', l.id, 'links')).join('');
    }

    return html;
  };

  function wireFavoritos(root) {
    root.querySelectorAll('[data-act="ir-favorito"]').forEach(btn => btn.addEventListener('click', () => {
      const { tipo, id } = btn.dataset;
      if (tipo === 'materia') MEO.navigate('materia', { id });
      else if (tipo === 'resumo') { const s = db().get('summaries', id); MEO.state.subjectTab = 'resumos'; MEO.navigate('materia', { id: s.subjectId, openId: s.id }); }
      else if (tipo === 'pdf') { const p = db().get('pdfs', id); MEO.state.subjectTab = 'pdfs'; MEO.navigate('materia', { id: p.subjectId }); }
      else if (tipo === 'link-materia') { const l = db().get('subjectLinks', id); MEO.state.subjectTab = 'links'; MEO.navigate('materia', { id: l.subjectId }); }
      else if (tipo === 'link-geral') { const l = db().get('links', id); window.open(l.url, '_blank', 'noopener'); }
    }));
    root.querySelectorAll('[data-act="remover-favorito"]').forEach(btn => btn.addEventListener('click', () => {
      db().upsert(btn.dataset.collection, { id: btn.dataset.id, favorito: false });
    }));
  }

  // ============================================================
  // CONFIGURAÇÕES
  // ============================================================
  const SETTINGS_SECTIONS = [
    { id: 'perfil', label: 'Perfil e sincronização', icon: 'user-circle' },
    { id: 'graduacao', label: 'Minha graduação', icon: 'graduation-cap' },
    { id: 'cores', label: 'Cores da agenda', icon: 'palette' },
    { id: 'pomodoro', label: 'Pomodoro', icon: 'timer' },
    { id: 'revisao', label: 'Revisão diária', icon: 'layers-3' },
    { id: 'backup', label: 'Backup e restauração', icon: 'database-backup' },
    { id: 'ajuda', label: 'Como usar', icon: 'life-buoy' },
    { id: 'dados', label: 'Dados', icon: 'trash-2' }
  ];

  V.configuracoes = function () {
    const user = MEO.auth.isSignedIn() ? MEO.auth.getUser() : null;
    const settings = db().state.settings;
    const profile = db().state.profile;
    const dueToday = db().list('flashcards').filter(MEO.srs.isDue).length;

    return `
      <div class="page-head"><div><h1>Configurações</h1><p class="sub">Ajuste o app do seu jeito.</p></div></div>
      <div class="settings-grid">
        <div class="settings-nav">
          ${SETTINGS_SECTIONS.map(s => `<button class="${MEO.state.settingsTab === s.id ? 'active' : ''}" data-sec="${s.id}"><i data-lucide="${s.icon}" class="ic-sm"></i> ${s.label}</button>`).join('')}
        </div>
        <div class="settings-panel">

          <div class="settings-section ${MEO.state.settingsTab === 'perfil' ? 'active' : ''}" data-section="perfil">
            <div class="card settings-install-card" id="settings-install-card" hidden style="margin-bottom:16px;">
              <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:space-between;">
                <div>
                  <h3 style="font-size:15px;margin-bottom:3px;">Instalar aplicativo</h3>
                  <p style="color:var(--texto-suave);font-size:12.5px;">Adicione o app à sua tela inicial para abrir mais rápido.</p>
                </div>
                <button class="btn btn-secondary btn-sm" id="install-btn"><i data-lucide="download" class="ic-sm"></i> Instalar</button>
              </div>
            </div>
            <div class="card" style="margin-bottom:16px;">
              <h3 style="font-size:16px;margin-bottom:6px;">Como você quer ser chamado(a)?</h3>
              <p style="color:var(--texto-suave);font-size:13px;margin-bottom:14px;">Esse nome aparece no cumprimento da Visão geral. Deixe em branco para usar "estudante".</p>
              <div class="form-field">
                <label for="nome-input">Seu nome</label>
                <input type="text" id="nome-input" placeholder="Ex.: Milena" value="${esc(profile.nome || '')}">
              </div>
              <div style="display:flex;gap:10px;flex-wrap:wrap;">
                <button class="btn btn-primary" id="btn-salvar-nome"><i data-lucide="check" class="ic-sm"></i> ${saveLabel('btn-salvar-nome', 'Salvar')}</button>
                <button class="btn btn-ghost" id="btn-remover-nome" ${profile.nome ? '' : 'disabled'}><i data-lucide="x" class="ic-sm"></i> Remover nome</button>
              </div>
            </div>
            <div class="card sync-card">
              <h3 style="font-size:16px;margin-bottom:14px;">Perfil e sincronização</h3>
              ${user ? `
                <div class="profile-box">
                  ${user.photoURL ? `<img class="avatar" src="${user.photoURL}" alt="">` : `<div class="avatar-fallback"><i data-lucide="user" class="ic"></i></div>`}
                  <div>
                    <div style="font-weight:700;">${esc(user.displayName || 'Sem nome')}</div>
                    <div style="font-size:12.5px;color:var(--texto-fraco);">${esc(user.email || '')}</div>
                  </div>
                </div>
                <div style="margin:16px 0;"><span class="sync-badge ${MEO._syncStatus || 'nuvem'}" data-sync-badge></span></div>
                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                  <button class="btn btn-secondary" id="btn-sign-out"><i data-lucide="log-out" class="ic-sm"></i> Sair</button>
                  <button class="btn btn-danger" id="btn-excluir-conta"><i data-lucide="trash-2" class="ic-sm"></i> Excluir conta</button>
                </div>
              ` : `
                <p style="color:var(--texto-suave);font-size:13.5px;margin-bottom:14px;">Entre com sua conta Google para salvar e sincronizar seus dados entre aparelhos.</p>
                <div style="margin-bottom:14px;"><span class="sync-badge ${MEO._syncStatus || 'local'}" data-sync-badge></span></div>
                <button class="btn btn-primary" id="btn-sign-in"><i data-lucide="log-in" class="ic-sm"></i> Entrar com Google</button>
              `}
            </div>
          </div>

          <div class="settings-section ${MEO.state.settingsTab === 'graduacao' ? 'active' : ''}" data-section="graduacao">
            <div class="card">
              <h3 style="font-size:16px;margin-bottom:14px;">Minha graduação</h3>
              <div class="form-field">
                <label for="grad-input">Nome da graduação</label>
                <input type="text" id="grad-input" placeholder="Ex.: Engenharia de Software" value="${esc(profile.curso || '')}">
              </div>
              <button class="btn btn-primary" id="btn-salvar-grad"><i data-lucide="check" class="ic-sm"></i> ${saveLabel('btn-salvar-grad', 'Salvar')}</button>
            </div>
          </div>

          <div class="settings-section ${MEO.state.settingsTab === 'cores' ? 'active' : ''}" data-section="cores">
            <div class="card">
              <h3 style="font-size:16px;margin-bottom:6px;">Cores dos tipos de compromisso</h3>
              <p style="color:var(--texto-suave);font-size:13px;margin-bottom:16px;">Escolha uma cor pra cada tipo. Ela aparece tanto na Agenda/calendário quanto nos cards da Visão geral.</p>
              <div class="tipo-cores-list">
                ${Object.keys(MEO.calendar.TIPOS).map(t => {
                  const tipoInfo = MEO.calendar.TIPOS[t];
                  const corAtual = MEO.calendar.corDoTipo(t);
                  return `<div class="tipo-cor-row" data-tipo="${t}">
                    <span class="tipo-cor-icon" style="background:${corAtual}"><i data-lucide="${tipoInfo.icon}" class="ic-sm"></i></span>
                    <span class="tipo-cor-label">${tipoInfo.label}</span>
                    <input type="color" class="tipo-cor-input" data-tipo="${t}" value="${corAtual}">
                  </div>`;
                }).join('')}
              </div>
              <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;">
                <button class="btn btn-primary" id="btn-salvar-cores"><i data-lucide="check" class="ic-sm"></i> ${saveLabel('btn-salvar-cores', 'Salvar cores')}</button>
                <button type="button" class="btn btn-ghost" id="btn-restaurar-cores"><i data-lucide="rotate-ccw" class="ic-sm"></i> Restaurar padrão</button>
              </div>
            </div>
          </div>

          <div class="settings-section ${MEO.state.settingsTab === 'pomodoro' ? 'active' : ''}" data-section="pomodoro">
            <div class="card">
              <h3 style="font-size:16px;margin-bottom:14px;">Pomodoro</h3>
              <div class="form-row">
                <div class="form-field"><label for="cfg-foco">Foco (minutos)</label><input type="number" min="1" max="180" id="cfg-foco" value="${settings.pomodoro.foco}"></div>
                <div class="form-field"><label for="cfg-pc">Pausa curta (minutos)</label><input type="number" min="1" max="60" id="cfg-pc" value="${settings.pomodoro.pausaCurta}"></div>
              </div>
              <div class="form-field" style="max-width:200px;"><label for="cfg-pl">Pausa longa (minutos)</label><input type="number" min="1" max="90" id="cfg-pl" value="${settings.pomodoro.pausaLonga}"></div>
              <div class="checkbox-row form-field"><input type="checkbox" id="cfg-som" ${settings.pomodoro.som !== false ? 'checked' : ''}><label for="cfg-som" style="font-weight:600;">Som ao concluir o ciclo</label></div>
              <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
                <button class="btn btn-primary" id="btn-salvar-pomo"><i data-lucide="check" class="ic-sm"></i> ${saveLabel('btn-salvar-pomo', 'Salvar')}</button>
                <button type="button" class="btn btn-ghost btn-sm" id="btn-testar-som"><i data-lucide="volume-2" class="ic-sm"></i> Testar som</button>
              </div>
            </div>
          </div>

          <div class="settings-section ${MEO.state.settingsTab === 'revisao' ? 'active' : ''}" data-section="revisao">
            <div class="card">
              <h3 style="font-size:16px;margin-bottom:10px;">Revisão diária</h3>
              <p style="font-size:14.5px;margin-bottom:14px;">Você tem <strong>${dueToday}</strong> flashcard${dueToday === 1 ? '' : 's'} previsto${dueToday === 1 ? '' : 's'} para hoje, em todas as matérias.</p>
              <button class="btn btn-primary" id="btn-revisar-tudo" ${dueToday === 0 ? 'disabled' : ''}><i data-lucide="play" class="ic-sm"></i> Iniciar revisão</button>
            </div>
          </div>

          <div class="settings-section ${MEO.state.settingsTab === 'backup' ? 'active' : ''}" data-section="backup">
            <div class="card">
              <h3 style="font-size:16px;margin-bottom:10px;">Backup e restauração</h3>
              <p style="color:var(--texto-suave);font-size:13.5px;margin-bottom:16px;">Exporte todos os seus dados em um arquivo JSON, ou restaure a partir de um backup anterior.</p>
              <div style="display:flex;gap:10px;flex-wrap:wrap;">
                <button class="btn btn-secondary" id="btn-exportar"><i data-lucide="download" class="ic-sm"></i> Exportar dados (JSON)</button>
                <label class="btn btn-secondary" style="cursor:pointer;"><i data-lucide="upload" class="ic-sm"></i> Importar backup<input type="file" accept="application/json" id="input-importar" hidden></label>
              </div>
            </div>
          </div>

          <div class="settings-section ${MEO.state.settingsTab === 'ajuda' ? 'active' : ''}" data-section="ajuda">
            <div class="card">
              <h3 style="font-size:16px;margin-bottom:16px;">Como usar</h3>
              ${[
                ['Crie um semestre', 'Comece pela Visão geral, criando o semestre atual.'],
                ['Adicione matérias', 'Dentro do semestre, cadastre suas matérias com professor, dia e horário.'],
                ['Organize o conteúdo', 'Em cada matéria, envie PDFs e crie resumos, flashcards e links.'],
                ['Acompanhe faltas e notas', 'Em cada matéria, defina o total de aulas e a média de aprovação para receber alertas automáticos.'],
                ['Use a agenda', 'Cadastre provas, trabalhos e lembretes no calendário.'],
                ['Estude com o Pomodoro', 'Escolha uma matéria e use os ciclos de foco e pausa.'],
                ['Acompanhe seu progresso', 'Veja estatísticas de estudo na página Meu progresso.']
              ].map((item, i) => `<div class="how-to-item"><span class="num">${i + 1}</span><div><strong>${item[0]}</strong><br><span style="color:var(--texto-suave);font-size:13.5px;">${item[1]}</span></div></div>`).join('')}
            </div>
          </div>

          <div class="settings-section ${MEO.state.settingsTab === 'dados' ? 'active' : ''}" data-section="dados">
            <div class="card">
              <h3 style="font-size:16px;margin-bottom:10px;">Dados</h3>
              <p style="color:var(--texto-suave);font-size:13.5px;margin-bottom:16px;">Apagar os dados deste aparelho remove permanentemente todos os semestres, matérias, PDFs, resumos, flashcards, links e configurações salvos localmente.</p>
              <button class="btn btn-danger" id="btn-limpar-dados"><i data-lucide="trash-2" class="ic-sm"></i> Limpar dados locais</button>
            </div>
          </div>

        </div>
      </div>
    `;
  };

  function wireConfiguracoes(root) {
    root.querySelectorAll('.settings-nav button').forEach(btn => btn.addEventListener('click', () => { MEO.state.settingsTab = btn.dataset.sec; MEO.rerender(); }));

    const signIn = root.querySelector('#btn-sign-in'); if (signIn) signIn.addEventListener('click', () => MEO.auth.signIn());
    const signOut = root.querySelector('#btn-sign-out'); if (signOut) signOut.addEventListener('click', () => MEO.auth.signOut());

    const excluirContaBtn = root.querySelector('#btn-excluir-conta');
    if (excluirContaBtn) excluirContaBtn.addEventListener('click', () => {
      MEO.confirmModal({
        title: 'Excluir sua conta?',
        desc: 'Isso apaga permanentemente sua conta de login, todos os seus dados salvos na nuvem (semestres, matérias, PDFs, resumos, flashcards, notas, faltas e links) e os arquivos enviados. Esta ação não pode ser desfeita.',
        confirmLabel: 'Excluir conta e dados', danger: true,
        onConfirm: async () => {
          MEO.toast('Excluindo sua conta…', 'success');
          try {
            await MEO.auth.deleteAccount();
            MEO.toast('Conta excluída. Seus dados neste aparelho também foram apagados.', 'success');
            MEO.navigate('visao-geral');
          } catch (err) {
            console.error(err);
            if (err && err.code === 'auth/requires-recent-login') {
              MEO.toast('Por segurança, saia e entre novamente com o Google antes de excluir sua conta.', 'error');
            } else {
              MEO.toast('Não foi possível excluir a conta agora. Tente novamente.', 'error');
            }
          }
        }
      });
    });

    const nomeBtn = root.querySelector('#btn-salvar-nome');
    if (nomeBtn) nomeBtn.addEventListener('click', () => {
      flashSaved('btn-salvar-nome');
      db().setProfile({ nome: root.querySelector('#nome-input').value.trim() });
      MEO.toast('Nome salvo.', 'success');
    });
    const installBtn = root.querySelector('#install-btn');
    if (installBtn) installBtn.addEventListener('click', () => MEO.install && MEO.install.trigger());
    MEO.refreshInstallBtn && MEO.refreshInstallBtn();
    const removerNomeBtn = root.querySelector('#btn-remover-nome');
    if (removerNomeBtn) removerNomeBtn.addEventListener('click', () => {
      db().setProfile({ nome: '' });
      MEO.toast('Nome removido.', 'success');
    });

    const gradBtn = root.querySelector('#btn-salvar-grad');
    if (gradBtn) gradBtn.addEventListener('click', () => {
      flashSaved('btn-salvar-grad');
      db().setProfile({ curso: root.querySelector('#grad-input').value.trim() });
      MEO.toast('Graduação salva.', 'success');
    });

    root.querySelectorAll('.tipo-cor-input').forEach(input => {
      input.addEventListener('input', () => {
        const row = input.closest('.tipo-cor-row');
        const icon = row.querySelector('.tipo-cor-icon');
        if (icon) icon.style.background = input.value;
      });
    });
    const coresBtn = root.querySelector('#btn-salvar-cores');
    if (coresBtn) coresBtn.addEventListener('click', () => {
      const coresTipos = {};
      root.querySelectorAll('.tipo-cor-input').forEach(input => { coresTipos[input.dataset.tipo] = input.value; });
      flashSaved('btn-salvar-cores');
      db().setSettings({ coresTipos });
      MEO.toast('Cores salvas.', 'success');
    });
    const restaurarCoresBtn = root.querySelector('#btn-restaurar-cores');
    if (restaurarCoresBtn) restaurarCoresBtn.addEventListener('click', () => {
      db().setSettings({ coresTipos: {} });
      MEO.toast('Cores restauradas para o padrão.', 'success');
    });

    const pomoBtn = root.querySelector('#btn-salvar-pomo');
    if (pomoBtn) pomoBtn.addEventListener('click', () => {
      const foco = MEO.clamp(Number(root.querySelector('#cfg-foco').value) || 25, 1, 180);
      const pc = MEO.clamp(Number(root.querySelector('#cfg-pc').value) || 5, 1, 60);
      const pl = MEO.clamp(Number(root.querySelector('#cfg-pl').value) || 15, 1, 90);
      const som = root.querySelector('#cfg-som').checked;
      flashSaved('btn-salvar-pomo');
      db().setSettings({ pomodoro: { foco, pausaCurta: pc, pausaLonga: pl, som } });
      MEO.pomodoro.reset();
      MEO.toast('Preferências do Pomodoro salvas.', 'success');
    });

    const testarSomBtn = root.querySelector('#btn-testar-som');
    if (testarSomBtn) testarSomBtn.addEventListener('click', () => {
      if (MEO.playBeep) MEO.playBeep(true);
      MEO.toast('Tocando som de teste...', 'info');
    });

    const revBtn = root.querySelector('#btn-revisar-tudo');
    if (revBtn) revBtn.addEventListener('click', () => abrirRevisaoGeral());

    const expBtn = root.querySelector('#btn-exportar');
    if (expBtn) expBtn.addEventListener('click', () => {
      const data = db().exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `meu-estudo-organizado-backup-${MEO.toDateKey(new Date())}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      MEO.toast('Backup exportado.', 'success');
    });
    const impInput = root.querySelector('#input-importar');
    if (impInput) impInput.addEventListener('change', (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          MEO.confirmModal({
            title: 'Substituir dados atuais?',
            desc: 'Importar este backup vai substituir todos os dados salvos atualmente neste aparelho. Deseja continuar?',
            confirmLabel: 'Importar e substituir', danger: true,
            onConfirm: () => { db().importAll(data); MEO.toast('Backup importado com sucesso.', 'success'); }
          });
        } catch (err) { MEO.toast('Arquivo de backup inválido.', 'error'); }
      };
      reader.readAsText(file);
      e.target.value = '';
    });

    const clearBtn = root.querySelector('#btn-limpar-dados');
    if (clearBtn) clearBtn.addEventListener('click', () => {
      MEO.confirmModal({
        title: 'Apagar todos os dados locais?',
        desc: 'Esta ação é irreversível e vai apagar tudo o que está salvo neste aparelho (semestres, matérias, PDFs, resumos, flashcards, links e configurações). Se você estiver conectado à nuvem, seus dados sincronizados podem ser afetados na próxima sincronização.',
        confirmLabel: 'Apagar tudo', danger: true,
        onConfirm: () => { db().clearAllLocal(); MEO.state.selectedSemesterId = null; MEO.toast('Dados locais apagados.', 'success'); MEO.navigate('visao-geral'); }
      });
    });

    const badge = root.querySelector('[data-sync-badge]');
    if (badge) MEO.setSyncStatus(MEO._syncStatus || (MEO.auth.isSignedIn() ? 'nuvem' : 'local'));
  }

  function abrirRevisaoGeral() {
    const queue = db().list('flashcards').filter(MEO.srs.isDue);
    if (!queue.length) { MEO.toast('Nenhum flashcard para revisar agora.', 'success'); return; }
    let idx = 0;
    const overlay = MEO.modal.open('', { size: 'lg' });
    function paint() {
      if (idx >= queue.length) {
        overlay.querySelector('.modal').innerHTML = `<button class="modal-close" aria-label="Fechar"><i data-lucide="x" class="ic"></i></button>
          <div class="empty-state"><i data-lucide="party-popper" class="ic-xl"></i><h3>Revisão concluída!</h3><p>Você revisou todos os cartões previstos para hoje.</p>
          <button class="btn btn-primary" style="margin-top:14px;" id="fechar-revisao">Fechar</button></div>`;
        MEO.refreshIcons();
        overlay.querySelector('.modal-close').addEventListener('click', () => MEO.modal.close());
        overlay.querySelector('#fechar-revisao').addEventListener('click', () => MEO.modal.close());
        return;
      }
      const card = queue[idx];
      const subj = subjectById(card.subjectId);
      overlay.querySelector('.modal').innerHTML = `<button class="modal-close" aria-label="Fechar"><i data-lucide="x" class="ic"></i></button>
        <p class="modal-desc">Cartão ${idx + 1} de ${queue.length} ${subj ? '· ' + esc(subj.nome) : ''}</p>
        <div class="flashcard" id="rev-card" style="height:220px;"><div class="flashcard-inner">
          <div class="flashcard-face front">${esc(card.frente)}</div>
          <div class="flashcard-face back">${esc(card.verso)}</div>
        </div></div>
        <p style="text-align:center;color:var(--texto-fraco);font-size:12.5px;margin-top:10px;">Toque no cartão para ver a resposta</p>
        <div class="flashcard-review-actions">
          <button class="btn btn-danger" data-r="errei">Errei</button>
          <button class="btn btn-secondary" data-r="dificil">Difícil</button>
          <button class="btn btn-primary" data-r="acertei">Acertei</button>
        </div>`;
      MEO.refreshIcons();
      overlay.querySelector('.modal-close').addEventListener('click', () => MEO.modal.close());
      overlay.querySelector('#rev-card').addEventListener('click', () => overlay.querySelector('#rev-card').classList.toggle('flipped'));
      overlay.querySelectorAll('[data-r]').forEach(btn => btn.addEventListener('click', () => {
        const srs = MEO.srs.review(card, btn.dataset.r);
        db().upsert('flashcards', { id: card.id, srs });
        idx++; paint();
      }));
    }
    paint();
  }

  // ============================================================
  V.afterRender = function (route) {
    const root = document.getElementById('view-root');
    if (!root) return;
    switch (route) {
      case 'visao-geral': wireVisaoGeral(root); break;
      case 'tarefas': wireTarefas(root); break;
      case 'trabalhos': wireTrabalhos(root); break;
      case 'materia': wireMateriaDetalhe(root); break;
      case 'agenda': wireAgenda(root); break;
      case 'pomodoro': wirePomodoro(root); break;
      case 'planejador': wirePlanejador(root); break;
      case 'metas': wireMetas(root); break;
      case 'notas-rapidas': wireNotasRapidas(root); break;
      case 'favoritos': wireFavoritos(root); break;
      case 'links': wireLinks(root); break;
      case 'configuracoes': wireConfiguracoes(root); break;
      default: break;
    }
  };

})(window.MEO);
