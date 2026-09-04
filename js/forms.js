// ============================================================
// Meu Estudo Organizado — formulários (modais de criar/editar)
// ============================================================
window.MEO = window.MEO || {};

(function (MEO) {
  'use strict';

  MEO.forms = MEO.forms || {};

  function lockButton(btn) {
    if (btn.dataset.locked === '1') return false;
    btn.dataset.locked = '1';
    btn.disabled = true;
    return true;
  }

  // ---------------- Semestre ----------------
  MEO.forms.semester = function (existing) {
    const isEdit = !!existing;
    const overlay = MEO.modal.open(`
      <h2 class="modal-title">${isEdit ? 'Editar semestre' : 'Novo semestre'}</h2>
      <p class="modal-desc">Organize suas matérias por período letivo.</p>
      <form id="f-semester">
        <div class="form-field">
          <label for="sem-nome">Nome do semestre *</label>
          <input type="text" id="sem-nome" placeholder="Ex.: 2026.1" value="${MEO.escapeHTML(existing?.nome || '')}">
          <span class="field-error" id="sem-nome-err" hidden>Digite um nome para o semestre.</span>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label for="sem-inicio">Data inicial</label>
            <input type="date" id="sem-inicio" value="${existing?.dataInicio || ''}">
          </div>
          <div class="form-field">
            <label for="sem-fim">Data final</label>
            <input type="date" id="sem-fim" value="${existing?.dataFim || ''}">
          </div>
        </div>
        <div class="checkbox-row form-field">
          <input type="checkbox" id="sem-atual" ${existing?.atual ? 'checked' : ''}>
          <label for="sem-atual" style="font-weight:600;">Marcar como semestre atual</label>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" data-act="cancel">Cancelar</button>
          <button type="submit" class="btn btn-primary" id="sem-submit"><i data-lucide="check" class="ic-sm"></i> Salvar</button>
        </div>
      </form>
    `);
    overlay.querySelector('[data-act="cancel"]').addEventListener('click', () => MEO.modal.close());
    const form = overlay.querySelector('#f-semester');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = overlay.querySelector('#sem-submit');
      if (!lockButton(btn)) return;
      const nome = overlay.querySelector('#sem-nome').value.trim();
      if (!nome) {
        overlay.querySelector('#sem-nome').classList.add('invalid');
        overlay.querySelector('#sem-nome-err').hidden = false;
        btn.disabled = false; btn.dataset.locked = '0';
        return;
      }
      const atual = overlay.querySelector('#sem-atual').checked;
      const data = {
        id: existing?.id,
        nome,
        dataInicio: overlay.querySelector('#sem-inicio').value || '',
        dataFim: overlay.querySelector('#sem-fim').value || '',
        atual
      };
      if (atual) {
        MEO.db.list('semesters').forEach(s => { if (s.atual && s.id !== existing?.id) MEO.db.upsert('semesters', { id: s.id, atual: false }, { silent: true }); });
      }
      const saved = MEO.db.upsert('semesters', data);
      if (!isEdit) MEO.state.selectedSemesterId = saved.id;
      MEO.modal.close();
      MEO.toast(isEdit ? 'Semestre atualizado.' : 'Semestre criado.', 'success');
    });
  };

  // ---------------- Matéria ----------------
  MEO.forms.subject = function (semesterId, existing) {
    const isEdit = !!existing;
    const cores = MEO.CORES_MATERIA;
    const corSelecionada = existing?.cor || cores[0];
    const overlay = MEO.modal.open(`
      <h2 class="modal-title">${isEdit ? 'Editar matéria' : 'Nova matéria'}</h2>
      <form id="f-subject">
        <div class="form-field">
          <label for="mat-nome">Nome da matéria *</label>
          <input type="text" id="mat-nome" placeholder="Ex.: Cálculo I" value="${MEO.escapeHTML(existing?.nome || '')}">
          <span class="field-error" id="mat-nome-err" hidden>Digite o nome da matéria.</span>
        </div>
        <div class="form-field">
          <label for="mat-prof">Professor</label>
          <input type="text" id="mat-prof" value="${MEO.escapeHTML(existing?.professor || '')}">
        </div>
        <div class="form-field">
          <label>Dias e horários de aula</label>
          <p style="color:var(--texto-suave);font-size:12.5px;margin:-2px 0 8px;">Tem aula da mesma matéria em mais de um dia? Adicione uma linha pra cada.</p>
          <div id="mat-horarios-list"></div>
          <button type="button" class="btn btn-ghost btn-sm" id="btn-add-horario" style="margin-top:4px;"><i data-lucide="plus" class="ic-sm"></i> Adicionar dia/horário</button>
        </div>
        <div class="form-field">
          <label>Cor</label>
          <div class="color-swatches" id="mat-cores">
            ${cores.map(c => `<span class="color-swatch ${c === corSelecionada ? 'selected' : ''}" data-cor="${c}" style="background:${c}"></span>`).join('')}
          </div>
        </div>
        <div class="form-field">
          <label for="mat-obs">Observações</label>
          <textarea id="mat-obs">${MEO.escapeHTML(existing?.observacoes || '')}</textarea>
        </div>
        <p style="font-size:12.5px;color:var(--texto-fraco);font-weight:700;text-transform:uppercase;letter-spacing:.03em;margin:6px 0 -4px;">Faltas e notas (opcional)</p>
        <div class="form-row">
          <div class="form-field">
            <label for="mat-limite-faltas">Limite de faltas</label>
            <input type="number" min="0" step="1" id="mat-limite-faltas" placeholder="Ex.: 15" value="${existing?.limiteFaltas ?? ''}">
          </div>
          <div class="form-field">
            <label for="mat-media-aprovacao">Média para aprovação</label>
            <input type="number" min="0" max="10" step="0.1" id="mat-media-aprovacao" value="${existing?.mediaAprovacao ?? 6}">
          </div>
        </div>
        <div class="form-field">
          <label for="mat-meta-semanal">Meta de estudo por semana (opcional)</label>
          <select id="mat-meta-semanal">
            <option value="0" ${!existing?.metaSemanalMinutos ? 'selected' : ''}>Sem meta definida</option>
            <option value="60" ${existing?.metaSemanalMinutos === 60 ? 'selected' : ''}>1 hora</option>
            <option value="120" ${existing?.metaSemanalMinutos === 120 ? 'selected' : ''}>2 horas</option>
            <option value="180" ${existing?.metaSemanalMinutos === 180 ? 'selected' : ''}>3 horas</option>
            <option value="300" ${existing?.metaSemanalMinutos === 300 ? 'selected' : ''}>5 horas</option>
            <option value="420" ${existing?.metaSemanalMinutos === 420 ? 'selected' : ''}>7 horas</option>
          </select>
          <span class="field-hint">Usada no Planejador de estudos pra sugerir o que estudar.</span>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" data-act="cancel">Cancelar</button>
          <button type="submit" class="btn btn-primary" id="mat-submit"><i data-lucide="check" class="ic-sm"></i> Salvar</button>
        </div>
      </form>
    `);

    // ---- Dias e horários (linhas dinâmicas) ----
    const horariosList = overlay.querySelector('#mat-horarios-list');
    function horarioRowHtml(h) {
      h = h || {};
      return `<div class="horario-row">
        <div class="form-field">
          <label>Dia da semana</label>
          <select class="ha-dia">
            <option value="">Não definido</option>
            ${MEO.diasDaSemana.map(d => `<option value="${d.v}" ${String(h.dia) === String(d.v) ? 'selected' : ''}>${d.l}</option>`).join('')}
          </select>
        </div>
        <div class="form-field">
          <label>Início</label>
          <input type="time" class="ha-inicio" value="${h.horaInicio || ''}">
        </div>
        <div class="form-field">
          <label>Fim</label>
          <input type="time" class="ha-fim" value="${h.horaFim || ''}">
        </div>
        <div class="form-field" style="max-width:110px;">
          <label title="Uma noite pode valer mais de uma aula/falta">Aulas no encontro</label>
          <input type="number" class="ha-aulas" min="1" step="1" value="${h.aulasPorEncontro || 1}">
        </div>
        <button type="button" class="btn-icon btn-danger" data-act="remover-horario" title="Remover" style="flex-shrink:0;margin-bottom:2px;"><i data-lucide="trash-2" class="ic-sm"></i></button>
      </div>`;
    }
    function addHorarioRow(h) {
      horariosList.insertAdjacentHTML('beforeend', horarioRowHtml(h));
      MEO.refreshIcons(horariosList);
    }
    const existingHorarios = (existing?.horarios && existing.horarios.length)
      ? existing.horarios
      : (existing?.dia !== undefined && existing?.dia !== '' && existing?.dia != null)
        ? [{ dia: existing.dia, horaInicio: existing.horaInicio, horaFim: existing.horaFim }]
        : [];
    if (existingHorarios.length) {
      existingHorarios.forEach(h => addHorarioRow(h));
    } else {
      addHorarioRow();
    }
    horariosList.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act="remover-horario"]');
      if (!btn) return;
      const rows = horariosList.querySelectorAll('.horario-row');
      if (rows.length <= 1) {
        btn.closest('.horario-row').querySelectorAll('select, input').forEach(el => { el.value = ''; });
        return;
      }
      btn.closest('.horario-row').remove();
    });
    overlay.querySelector('#btn-add-horario').addEventListener('click', () => addHorarioRow());

    let corAtual = corSelecionada;
    overlay.querySelectorAll('.color-swatch').forEach(sw => {
      sw.addEventListener('click', () => {
        overlay.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
        sw.classList.add('selected');
        corAtual = sw.dataset.cor;
      });
    });
    overlay.querySelector('[data-act="cancel"]').addEventListener('click', () => MEO.modal.close());
    overlay.querySelector('#f-subject').addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = overlay.querySelector('#mat-submit');
      if (!lockButton(btn)) return;
      const nome = overlay.querySelector('#mat-nome').value.trim();
      if (!nome) {
        overlay.querySelector('#mat-nome').classList.add('invalid');
        overlay.querySelector('#mat-nome-err').hidden = false;
        btn.disabled = false; btn.dataset.locked = '0';
        return;
      }
      const horarios = Array.from(overlay.querySelectorAll('.horario-row')).map(row => ({
        dia: row.querySelector('.ha-dia').value,
        horaInicio: row.querySelector('.ha-inicio').value,
        horaFim: row.querySelector('.ha-fim').value,
        aulasPorEncontro: Math.max(1, Number(row.querySelector('.ha-aulas').value) || 1)
      })).filter(h => h.dia !== '' || h.horaInicio || h.horaFim);
      const data = {
        id: existing?.id,
        semesterId,
        nome,
        professor: overlay.querySelector('#mat-prof').value.trim(),
        horarios,
        // mantidos por compatibilidade com dados antigos (não usados na exibição)
        dia: '', horaInicio: '', horaFim: '',
        limiteFaltas: overlay.querySelector('#mat-limite-faltas').value ? Number(overlay.querySelector('#mat-limite-faltas').value) : null,
        mediaAprovacao: overlay.querySelector('#mat-media-aprovacao').value !== '' ? Number(overlay.querySelector('#mat-media-aprovacao').value) : 6,
        metaSemanalMinutos: Number(overlay.querySelector('#mat-meta-semanal').value) || 0,
        cor: corAtual,
        observacoes: overlay.querySelector('#mat-obs').value.trim()
      };
      MEO.db.upsert('subjects', data);
      MEO.modal.close();
      MEO.toast(isEdit ? 'Matéria atualizada.' : 'Matéria criada.', 'success');
    });
  };

  // ---------------- Compromisso (evento da agenda) ----------------
  MEO.forms.event = function (existing, defaults) {
    defaults = defaults || {};
    const isEdit = !!existing;
    const tipos = MEO.calendar.TIPOS;
    const semesters = MEO.db.list('semesters');
    const subjects = MEO.db.list('subjects');
    const overlay = MEO.modal.open(`
      <h2 class="modal-title">${isEdit ? 'Editar compromisso' : 'Novo compromisso'}</h2>
      <form id="f-event">
        <div class="form-field">
          <label for="ev-titulo">Título *</label>
          <input type="text" id="ev-titulo" value="${MEO.escapeHTML(existing?.titulo || '')}">
          <span class="field-error" id="ev-titulo-err" hidden>Digite um título.</span>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label for="ev-tipo">Tipo</label>
            <select id="ev-tipo">
              ${Object.keys(tipos).map(t => `<option value="${t}" ${(existing?.tipo || 'outro') === t ? 'selected' : ''}>${tipos[t].label}</option>`).join('')}
            </select>
          </div>
          <div class="form-field">
            <label for="ev-prioridade">Prioridade</label>
            <select id="ev-prioridade">
              <option value="normal" ${(!existing || existing.prioridade === 'normal') ? 'selected' : ''}>Normal</option>
              <option value="alta" ${existing?.prioridade === 'alta' ? 'selected' : ''}>Alta</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label for="ev-data">Data *</label>
            <input type="date" id="ev-data" value="${existing?.data || defaults.data || MEO.toDateKey(new Date())}" required>
          </div>
          <div class="form-field">
            <label for="ev-hora">Horário</label>
            <input type="time" id="ev-hora" value="${existing?.hora || ''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label for="ev-semestre">Semestre (opcional)</label>
            <select id="ev-semestre">
              <option value="">Nenhum</option>
              ${semesters.map(s => `<option value="${s.id}" ${existing?.semesterId === s.id ? 'selected' : ''}>${MEO.escapeHTML(s.nome)}</option>`).join('')}
            </select>
          </div>
          <div class="form-field">
            <label for="ev-materia">Matéria (opcional)</label>
            <select id="ev-materia">
              <option value="">Nenhuma</option>
              ${subjects.map(s => `<option value="${s.id}" ${existing?.subjectId === s.id ? 'selected' : ''}>${MEO.escapeHTML(s.nome)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-field">
          <label for="ev-desc">Descrição</label>
          <textarea id="ev-desc">${MEO.escapeHTML(existing?.descricao || '')}</textarea>
        </div>
        <div class="checkbox-row form-field">
          <input type="checkbox" id="ev-lembrete" ${existing?.lembrete ? 'checked' : ''}>
          <label for="ev-lembrete" style="font-weight:600;">Quero um lembrete</label>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" data-act="cancel">Cancelar</button>
          <button type="submit" class="btn btn-primary" id="ev-submit"><i data-lucide="check" class="ic-sm"></i> Salvar</button>
        </div>
      </form>
    `);
    overlay.querySelector('[data-act="cancel"]').addEventListener('click', () => MEO.modal.close());
    overlay.querySelector('#f-event').addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = overlay.querySelector('#ev-submit');
      if (!lockButton(btn)) return;
      const titulo = overlay.querySelector('#ev-titulo').value.trim();
      if (!titulo) {
        overlay.querySelector('#ev-titulo').classList.add('invalid');
        overlay.querySelector('#ev-titulo-err').hidden = false;
        btn.disabled = false; btn.dataset.locked = '0';
        return;
      }
      const data = {
        id: existing?.id,
        titulo,
        tipo: overlay.querySelector('#ev-tipo').value,
        prioridade: overlay.querySelector('#ev-prioridade').value,
        data: overlay.querySelector('#ev-data').value,
        hora: overlay.querySelector('#ev-hora').value,
        semesterId: overlay.querySelector('#ev-semestre').value || null,
        subjectId: overlay.querySelector('#ev-materia').value || null,
        descricao: overlay.querySelector('#ev-desc').value.trim(),
        lembrete: overlay.querySelector('#ev-lembrete').checked,
        concluido: existing?.concluido || false
      };
      MEO.db.upsert('events', data);
      MEO.modal.close();
      MEO.toast(isEdit ? 'Compromisso atualizado.' : 'Compromisso criado.', 'success');
    });
  };

  // ---------------- Tarefa ----------------
  MEO.forms.task = function (existing, defaults) {
    defaults = defaults || {};
    const isEdit = !!existing;
    const semesters = MEO.db.list('semesters');
    const subjects = MEO.db.list('subjects');
    const prioridades = MEO.tasks.PRIORIDADES;
    const statusList = MEO.tasks.STATUS;
    const etiquetasStr = (existing?.etiquetas || []).join(', ');
    const overlay = MEO.modal.open(`
      <h2 class="modal-title">${isEdit ? 'Editar tarefa' : 'Nova tarefa'}</h2>
      <form id="f-task">
        <div class="form-field">
          <label for="tk-titulo">Título *</label>
          <input type="text" id="tk-titulo" value="${MEO.escapeHTML(existing?.titulo || '')}">
          <span class="field-error" id="tk-titulo-err" hidden>Digite um título.</span>
        </div>
        <div class="form-field">
          <label for="tk-desc">Descrição</label>
          <textarea id="tk-desc">${MEO.escapeHTML(existing?.descricao || '')}</textarea>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label for="tk-semestre">Semestre (opcional)</label>
            <select id="tk-semestre">
              <option value="">Nenhum</option>
              ${semesters.map(s => `<option value="${s.id}" ${(existing?.semesterId || defaults.semesterId) === s.id ? 'selected' : ''}>${MEO.escapeHTML(s.nome)}</option>`).join('')}
            </select>
          </div>
          <div class="form-field">
            <label for="tk-materia">Matéria (opcional)</label>
            <select id="tk-materia">
              <option value="">Nenhuma</option>
              ${subjects.map(s => `<option value="${s.id}" ${(existing?.subjectId || defaults.subjectId) === s.id ? 'selected' : ''}>${MEO.escapeHTML(s.nome)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label for="tk-data">Data / prazo</label>
            <input type="date" id="tk-data" value="${existing?.data || defaults.data || ''}">
          </div>
          <div class="form-field">
            <label for="tk-hora">Horário (opcional)</label>
            <input type="time" id="tk-hora" value="${existing?.hora || ''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label for="tk-prioridade">Prioridade</label>
            <select id="tk-prioridade">
              ${Object.keys(prioridades).map(p => `<option value="${p}" ${(existing?.prioridade || 'media') === p ? 'selected' : ''}>${prioridades[p].label}</option>`).join('')}
            </select>
          </div>
          <div class="form-field">
            <label for="tk-status">Status</label>
            <select id="tk-status">
              ${Object.keys(statusList).map(s => `<option value="${s}" ${(existing?.status || 'nao_iniciado') === s ? 'selected' : ''}>${statusList[s].label}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label for="tk-recorrencia">Repetir</label>
            <select id="tk-recorrencia">
              <option value="" ${!existing?.recorrencia ? 'selected' : ''}>Não repetir</option>
              <option value="diaria" ${existing?.recorrencia === 'diaria' ? 'selected' : ''}>Todo dia</option>
              <option value="semanal" ${existing?.recorrencia === 'semanal' ? 'selected' : ''}>Toda semana</option>
              <option value="mensal" ${existing?.recorrencia === 'mensal' ? 'selected' : ''}>Todo mês</option>
            </select>
          </div>
          <div class="form-field">
            <label for="tk-etiquetas">Etiquetas (separadas por vírgula)</label>
            <input type="text" id="tk-etiquetas" placeholder="Ex.: leitura, urgente" value="${MEO.escapeHTML(etiquetasStr)}">
          </div>
        </div>
        <div class="form-field">
          <label>Subtarefas</label>
          <div id="tk-subtarefas-list"></div>
          <button type="button" class="btn btn-ghost btn-sm" id="btn-add-subtarefa" style="margin-top:4px;"><i data-lucide="plus" class="ic-sm"></i> Adicionar subtarefa</button>
        </div>
        <div class="form-field">
          <label for="tk-obs">Observações</label>
          <textarea id="tk-obs">${MEO.escapeHTML(existing?.observacoes || '')}</textarea>
        </div>
        <div class="checkbox-row form-field">
          <input type="checkbox" id="tk-lembrete" ${existing?.lembrete ? 'checked' : ''}>
          <label for="tk-lembrete" style="font-weight:600;">Quero um lembrete</label>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" data-act="cancel">Cancelar</button>
          <button type="submit" class="btn btn-primary" id="tk-submit"><i data-lucide="check" class="ic-sm"></i> Salvar</button>
        </div>
      </form>
    `);

    // ---- Subtarefas (linhas dinâmicas) ----
    const subList = overlay.querySelector('#tk-subtarefas-list');
    function subRowHtml(s) {
      s = s || {};
      return `<div class="subtask-row" data-subid="${s.id || MEO.uid('sub')}">
        <input type="checkbox" class="sk-feita" ${s.feita ? 'checked' : ''}>
        <input type="text" class="sk-texto" placeholder="Ex.: Buscar referências" value="${MEO.escapeHTML(s.texto || '')}">
        <button type="button" class="btn-icon btn-danger" data-act="remover-subtarefa" title="Remover"><i data-lucide="trash-2" class="ic-sm"></i></button>
      </div>`;
    }
    function addSubRow(s) {
      subList.insertAdjacentHTML('beforeend', subRowHtml(s));
      MEO.refreshIcons(subList);
    }
    (existing?.subtarefas || []).forEach(s => addSubRow(s));
    subList.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act="remover-subtarefa"]');
      if (!btn) return;
      btn.closest('.subtask-row').remove();
    });
    overlay.querySelector('#btn-add-subtarefa').addEventListener('click', () => addSubRow());

    overlay.querySelector('[data-act="cancel"]').addEventListener('click', () => MEO.modal.close());
    overlay.querySelector('#f-task').addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = overlay.querySelector('#tk-submit');
      if (!lockButton(btn)) return;
      const titulo = overlay.querySelector('#tk-titulo').value.trim();
      if (!titulo) {
        overlay.querySelector('#tk-titulo').classList.add('invalid');
        overlay.querySelector('#tk-titulo-err').hidden = false;
        btn.disabled = false; btn.dataset.locked = '0';
        return;
      }
      const subtarefas = Array.from(overlay.querySelectorAll('.subtask-row')).map(row => ({
        id: row.dataset.subid,
        texto: row.querySelector('.sk-texto').value.trim(),
        feita: row.querySelector('.sk-feita').checked
      })).filter(s => s.texto);
      const etiquetas = overlay.querySelector('#tk-etiquetas').value.split(',').map(t => t.trim()).filter(Boolean);
      const status = overlay.querySelector('#tk-status').value;
      const data = {
        id: existing?.id,
        titulo,
        descricao: overlay.querySelector('#tk-desc').value.trim(),
        semesterId: overlay.querySelector('#tk-semestre').value || null,
        subjectId: overlay.querySelector('#tk-materia').value || null,
        data: overlay.querySelector('#tk-data').value || '',
        hora: overlay.querySelector('#tk-hora').value || '',
        prioridade: overlay.querySelector('#tk-prioridade').value,
        status,
        recorrencia: overlay.querySelector('#tk-recorrencia').value || '',
        etiquetas,
        subtarefas,
        observacoes: overlay.querySelector('#tk-obs').value.trim(),
        lembrete: overlay.querySelector('#tk-lembrete').checked,
        concluidoEm: status === 'concluido' ? (existing?.concluidoEm || MEO.nowISO()) : null
      };
      MEO.db.upsert('tasks', data);
      MEO.modal.close();
      MEO.toast(isEdit ? 'Tarefa atualizada.' : 'Tarefa criada.', 'success');
    });
  };

  // ---------------- Trabalho acadêmico ----------------
  MEO.forms.trabalho = function (existing, defaults) {
    defaults = defaults || {};
    const isEdit = !!existing;
    const semesters = MEO.db.list('semesters');
    const subjects = MEO.db.list('subjects');
    const statusList = MEO.trabalhos.STATUS;
    const overlay = MEO.modal.open(`
      <h2 class="modal-title">${isEdit ? 'Editar trabalho' : 'Novo trabalho acadêmico'}</h2>
      <form id="f-trabalho">
        <div class="form-field">
          <label for="tb-titulo">Título *</label>
          <input type="text" id="tb-titulo" value="${MEO.escapeHTML(existing?.titulo || '')}">
          <span class="field-error" id="tb-titulo-err" hidden>Digite um título.</span>
        </div>
        <div class="form-field">
          <label for="tb-desc">Descrição</label>
          <textarea id="tb-desc">${MEO.escapeHTML(existing?.descricao || '')}</textarea>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label for="tb-semestre">Semestre (opcional)</label>
            <select id="tb-semestre">
              <option value="">Nenhum</option>
              ${semesters.map(s => `<option value="${s.id}" ${(existing?.semesterId || defaults.semesterId) === s.id ? 'selected' : ''}>${MEO.escapeHTML(s.nome)}</option>`).join('')}
            </select>
          </div>
          <div class="form-field">
            <label for="tb-materia">Matéria (opcional)</label>
            <select id="tb-materia">
              <option value="">Nenhuma</option>
              ${subjects.map(s => `<option value="${s.id}" ${(existing?.subjectId || defaults.subjectId) === s.id ? 'selected' : ''}>${MEO.escapeHTML(s.nome)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label for="tb-entrega">Data de entrega</label>
            <input type="date" id="tb-entrega" value="${existing?.dataEntrega || defaults.dataEntrega || ''}">
          </div>
          <div class="form-field">
            <label for="tb-status">Status</label>
            <select id="tb-status">
              ${Object.keys(statusList).map(s => `<option value="${s}" ${(existing?.status || 'nao_iniciado') === s ? 'selected' : ''}>${statusList[s].label}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-field">
          <label>Integrantes do grupo</label>
          <div id="tb-membros-list"></div>
          <button type="button" class="btn btn-ghost btn-sm" id="btn-add-membro" style="margin-top:4px;"><i data-lucide="plus" class="ic-sm"></i> Adicionar integrante</button>
        </div>
        <div class="form-field">
          <label>Etapas do trabalho</label>
          <div id="tb-etapas-list"></div>
          <button type="button" class="btn btn-ghost btn-sm" id="btn-add-etapa" style="margin-top:4px;"><i data-lucide="plus" class="ic-sm"></i> Adicionar etapa</button>
        </div>
        <div class="form-field">
          <label for="tb-link">Link do trabalho (opcional)</label>
          <input type="text" id="tb-link" placeholder="Ex.: link do Google Docs / Drive" value="${MEO.escapeHTML(existing?.link || '')}">
        </div>
        <div class="form-field">
          <label for="tb-obs">Observações</label>
          <textarea id="tb-obs">${MEO.escapeHTML(existing?.observacoes || '')}</textarea>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" data-act="cancel">Cancelar</button>
          <button type="submit" class="btn btn-primary" id="tb-submit"><i data-lucide="check" class="ic-sm"></i> Salvar</button>
        </div>
      </form>
    `);

    // ---- Integrantes (linhas dinâmicas) ----
    const membrosList = overlay.querySelector('#tb-membros-list');
    function membroRowHtml(m) {
      m = m || {};
      return `<div class="subtask-row member-row" data-memberid="${m.id || MEO.uid('mb')}">
        <input type="text" class="mb-nome" placeholder="Nome" value="${MEO.escapeHTML(m.nome || '')}">
        <input type="text" class="mb-funcao" placeholder="Função (opcional)" value="${MEO.escapeHTML(m.funcao || '')}">
        <button type="button" class="btn-icon btn-danger" data-act="remover-membro" title="Remover"><i data-lucide="trash-2" class="ic-sm"></i></button>
      </div>`;
    }
    function addMembroRow(m) {
      membrosList.insertAdjacentHTML('beforeend', membroRowHtml(m));
      MEO.refreshIcons(membrosList);
    }
    (existing?.integrantes || []).forEach(m => addMembroRow(m));
    membrosList.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act="remover-membro"]');
      if (!btn) return;
      btn.closest('.member-row').remove();
    });
    overlay.querySelector('#btn-add-membro').addEventListener('click', () => addMembroRow());

    // ---- Etapas (linhas dinâmicas, mesmo padrão de subtarefas) ----
    const etapasList = overlay.querySelector('#tb-etapas-list');
    function etapaRowHtml(et) {
      et = et || {};
      return `<div class="subtask-row" data-etapaid="${et.id || MEO.uid('et')}">
        <input type="checkbox" class="et-feita" ${et.feita ? 'checked' : ''}>
        <input type="text" class="et-texto" placeholder="Ex.: Definir tema e dividir partes" value="${MEO.escapeHTML(et.texto || '')}">
        <button type="button" class="btn-icon btn-danger" data-act="remover-etapa" title="Remover"><i data-lucide="trash-2" class="ic-sm"></i></button>
      </div>`;
    }
    function addEtapaRow(et) {
      etapasList.insertAdjacentHTML('beforeend', etapaRowHtml(et));
      MEO.refreshIcons(etapasList);
    }
    (existing?.etapas || []).forEach(et => addEtapaRow(et));
    etapasList.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act="remover-etapa"]');
      if (!btn) return;
      btn.closest('.subtask-row').remove();
    });
    overlay.querySelector('#btn-add-etapa').addEventListener('click', () => addEtapaRow());

    overlay.querySelector('[data-act="cancel"]').addEventListener('click', () => MEO.modal.close());
    overlay.querySelector('#f-trabalho').addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = overlay.querySelector('#tb-submit');
      if (!lockButton(btn)) return;
      const titulo = overlay.querySelector('#tb-titulo').value.trim();
      if (!titulo) {
        overlay.querySelector('#tb-titulo').classList.add('invalid');
        overlay.querySelector('#tb-titulo-err').hidden = false;
        btn.disabled = false; btn.dataset.locked = '0';
        return;
      }
      const integrantes = Array.from(overlay.querySelectorAll('.member-row')).map(row => ({
        id: row.dataset.memberid,
        nome: row.querySelector('.mb-nome').value.trim(),
        funcao: row.querySelector('.mb-funcao').value.trim()
      })).filter(m => m.nome);
      const etapas = Array.from(overlay.querySelectorAll('#tb-etapas-list .subtask-row')).map(row => ({
        id: row.dataset.etapaid,
        texto: row.querySelector('.et-texto').value.trim(),
        feita: row.querySelector('.et-feita').checked
      })).filter(et => et.texto);
      const status = overlay.querySelector('#tb-status').value;
      const data = {
        id: existing?.id,
        titulo,
        descricao: overlay.querySelector('#tb-desc').value.trim(),
        semesterId: overlay.querySelector('#tb-semestre').value || null,
        subjectId: overlay.querySelector('#tb-materia').value || null,
        dataEntrega: overlay.querySelector('#tb-entrega').value || '',
        status,
        integrantes,
        etapas,
        link: overlay.querySelector('#tb-link').value.trim(),
        observacoes: overlay.querySelector('#tb-obs').value.trim()
      };
      MEO.db.upsert('trabalhos', data);
      MEO.modal.close();
      MEO.toast(isEdit ? 'Trabalho atualizado.' : 'Trabalho criado.', 'success');
    });
  };

  // ---------------- Meta ----------------
  MEO.forms.meta = function (existing, defaults) {
    defaults = defaults || {};
    const isEdit = !!existing;
    const subjects = MEO.db.list('subjects');
    const overlay = MEO.modal.open(`
      <h2 class="modal-title">${isEdit ? 'Editar meta' : 'Nova meta'}</h2>
      <form id="f-meta">
        <div class="form-field">
          <label for="mt-titulo">Título *</label>
          <input type="text" id="mt-titulo" placeholder="Ex.: Tirar média 8 em Fisiologia" value="${MEO.escapeHTML(existing?.titulo || '')}">
          <span class="field-error" id="mt-titulo-err" hidden>Digite um título.</span>
        </div>
        <div class="form-field">
          <label for="mt-desc">Descrição</label>
          <textarea id="mt-desc">${MEO.escapeHTML(existing?.descricao || '')}</textarea>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label for="mt-materia">Matéria (opcional)</label>
            <select id="mt-materia">
              <option value="">Nenhuma / meta geral</option>
              ${subjects.map(s => `<option value="${s.id}" ${(existing?.subjectId || defaults.subjectId) === s.id ? 'selected' : ''}>${MEO.escapeHTML(s.nome)}</option>`).join('')}
            </select>
          </div>
          <div class="form-field">
            <label for="mt-prazo">Prazo (opcional)</label>
            <input type="date" id="mt-prazo" value="${existing?.prazo || ''}">
          </div>
        </div>
        <div class="form-field">
          <label for="mt-progresso">Progresso: <span id="mt-progresso-val">${existing?.progresso ?? 0}%</span></label>
          <input type="range" id="mt-progresso" min="0" max="100" step="5" value="${existing?.progresso ?? 0}">
        </div>
        <div class="checkbox-row form-field">
          <input type="checkbox" id="mt-concluida" ${existing?.concluida ? 'checked' : ''}>
          <label for="mt-concluida" style="font-weight:600;">Meta concluída</label>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" data-act="cancel">Cancelar</button>
          <button type="submit" class="btn btn-primary" id="mt-submit"><i data-lucide="check" class="ic-sm"></i> Salvar</button>
        </div>
      </form>
    `);
    const progInput = overlay.querySelector('#mt-progresso');
    const progVal = overlay.querySelector('#mt-progresso-val');
    const concluidaChk = overlay.querySelector('#mt-concluida');
    progInput.addEventListener('input', () => {
      progVal.textContent = progInput.value + '%';
      if (Number(progInput.value) >= 100) concluidaChk.checked = true;
    });
    concluidaChk.addEventListener('change', () => {
      if (concluidaChk.checked) { progInput.value = 100; progVal.textContent = '100%'; }
    });
    overlay.querySelector('[data-act="cancel"]').addEventListener('click', () => MEO.modal.close());
    overlay.querySelector('#f-meta').addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = overlay.querySelector('#mt-submit');
      if (!lockButton(btn)) return;
      const titulo = overlay.querySelector('#mt-titulo').value.trim();
      if (!titulo) {
        overlay.querySelector('#mt-titulo').classList.add('invalid');
        overlay.querySelector('#mt-titulo-err').hidden = false;
        btn.disabled = false; btn.dataset.locked = '0';
        return;
      }
      const concluida = concluidaChk.checked;
      const data = {
        id: existing?.id,
        titulo,
        descricao: overlay.querySelector('#mt-desc').value.trim(),
        subjectId: overlay.querySelector('#mt-materia').value || null,
        prazo: overlay.querySelector('#mt-prazo').value || '',
        progresso: Number(progInput.value),
        concluida,
        concluidoEm: concluida ? (existing?.concluidoEm || MEO.nowISO()) : null
      };
      MEO.db.upsert('metas', data);
      MEO.modal.close();
      MEO.toast(isEdit ? 'Meta atualizada.' : 'Meta criada.', 'success');
    });
  };

  // ---------------- Nota rápida ----------------
  MEO.forms.notaRapida = function (existing) {
    const overlay = MEO.modal.open(`
      <h2 class="modal-title">Editar nota</h2>
      <form id="f-nota-rapida">
        <div class="form-field">
          <textarea id="nr-texto" style="min-height:140px;">${MEO.escapeHTML(existing?.texto || '')}</textarea>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" data-act="cancel">Cancelar</button>
          <button type="submit" class="btn btn-primary" id="nr-submit"><i data-lucide="check" class="ic-sm"></i> Salvar</button>
        </div>
      </form>
    `);
    overlay.querySelector('[data-act="cancel"]').addEventListener('click', () => MEO.modal.close());
    overlay.querySelector('#f-nota-rapida').addEventListener('submit', (e) => {
      e.preventDefault();
      const texto = overlay.querySelector('#nr-texto').value.trim();
      if (!texto) { MEO.modal.close(); return; }
      MEO.db.upsert('notas', { id: existing?.id, texto });
      MEO.modal.close();
      MEO.toast('Nota atualizada.', 'success');
    });
  };

  // ---------------- Resumo ----------------
  MEO.forms.summary = function (subjectId, existing) {
    const isEdit = !!existing;
    const pdfs = MEO.db.list('pdfs').filter(p => p.subjectId === subjectId);
    const overlay = MEO.modal.open(`
      <h2 class="modal-title">${isEdit ? 'Editar resumo' : 'Novo resumo'}</h2>
      <form id="f-summary" class="summary-editor">
        <div class="form-field">
          <label for="sm-titulo">Título *</label>
          <input type="text" id="sm-titulo" value="${MEO.escapeHTML(existing?.titulo || '')}">
          <span class="field-error" id="sm-titulo-err" hidden>Digite um título para o resumo.</span>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label for="sm-pdf">PDF de referência (opcional)</label>
            <select id="sm-pdf">
              <option value="">Nenhum</option>
              ${pdfs.map(p => `<option value="${p.id}" ${existing?.pdfId === p.id ? 'selected' : ''}>${MEO.escapeHTML(p.nome)}</option>`).join('')}
            </select>
          </div>
          <div class="form-field"></div>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label for="sm-pi">Página inicial</label>
            <input type="number" min="1" id="sm-pi" value="${existing?.paginaInicio || ''}">
          </div>
          <div class="form-field">
            <label for="sm-pf">Página final</label>
            <input type="number" min="1" id="sm-pf" value="${existing?.paginaFim || ''}">
          </div>
        </div>
        <div class="form-field">
          <label for="sm-conteudo">Conteúdo</label>
          <textarea id="sm-conteudo" style="min-height:220px;">${MEO.escapeHTML(existing?.conteudo || '')}</textarea>
        </div>
        <div class="modal-actions" style="justify-content:space-between;align-items:center;">
          <span class="saved-indicator" id="sm-saved" style="visibility:hidden;"><i data-lucide="check" class="ic-sm"></i> Salvo</span>
          <div style="display:flex;gap:10px;">
            <button type="button" class="btn btn-secondary" data-act="cancel">Fechar</button>
            <button type="submit" class="btn btn-primary" id="sm-submit"><i data-lucide="check" class="ic-sm"></i> Salvar</button>
          </div>
        </div>
      </form>
    `);
    overlay.querySelector('[data-act="cancel"]').addEventListener('click', () => MEO.modal.close());
    const form = overlay.querySelector('#f-summary');
    let savedId = existing?.id || null;
    function doSave(silent) {
      const titulo = overlay.querySelector('#sm-titulo').value.trim();
      if (!titulo) {
        overlay.querySelector('#sm-titulo').classList.add('invalid');
        overlay.querySelector('#sm-titulo-err').hidden = false;
        return false;
      }
      const data = {
        id: savedId,
        subjectId,
        titulo,
        conteudo: overlay.querySelector('#sm-conteudo').value,
        pdfId: overlay.querySelector('#sm-pdf').value || null,
        paginaInicio: overlay.querySelector('#sm-pi').value || null,
        paginaFim: overlay.querySelector('#sm-pf').value || null
      };
      const saved = MEO.db.upsert('summaries', data);
      savedId = saved.id;
      if (silent) {
        const ind = overlay.querySelector('#sm-saved');
        if (ind) { ind.style.visibility = 'visible'; setTimeout(() => { if (ind) ind.style.visibility = 'hidden'; }, 1800); }
      }
      return true;
    }
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (doSave(false)) { MEO.modal.close(); MEO.toast('Resumo salvo.', 'success'); }
    });
    const autosave = MEO.debounce(() => doSave(true), 1200);
    ['sm-titulo', 'sm-conteudo', 'sm-pi', 'sm-pf', 'sm-pdf'].forEach(id => {
      overlay.querySelector('#' + id).addEventListener('input', () => { if (overlay.querySelector('#sm-titulo').value.trim()) autosave(); });
    });
  };

  // ---------------- Flashcard ----------------
  MEO.forms.flashcard = function (subjectId, existing) {
    const isEdit = !!existing;
    const overlay = MEO.modal.open(`
      <h2 class="modal-title">${isEdit ? 'Editar flashcard' : 'Novo flashcard'}</h2>
      <form id="f-flash">
        <div class="form-field">
          <label for="fc-frente">Pergunta / frente *</label>
          <textarea id="fc-frente">${MEO.escapeHTML(existing?.frente || '')}</textarea>
          <span class="field-error" id="fc-frente-err" hidden>Digite a pergunta.</span>
        </div>
        <div class="form-field">
          <label for="fc-verso">Resposta / verso *</label>
          <textarea id="fc-verso">${MEO.escapeHTML(existing?.verso || '')}</textarea>
          <span class="field-error" id="fc-verso-err" hidden>Digite a resposta.</span>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" data-act="cancel">Cancelar</button>
          <button type="submit" class="btn btn-primary" id="fc-submit"><i data-lucide="check" class="ic-sm"></i> Salvar</button>
        </div>
      </form>
    `);
    overlay.querySelector('[data-act="cancel"]').addEventListener('click', () => MEO.modal.close());
    overlay.querySelector('#f-flash').addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = overlay.querySelector('#fc-submit');
      if (!lockButton(btn)) return;
      const frente = overlay.querySelector('#fc-frente').value.trim();
      const verso = overlay.querySelector('#fc-verso').value.trim();
      let ok = true;
      if (!frente) { overlay.querySelector('#fc-frente').classList.add('invalid'); overlay.querySelector('#fc-frente-err').hidden = false; ok = false; }
      if (!verso) { overlay.querySelector('#fc-verso').classList.add('invalid'); overlay.querySelector('#fc-verso-err').hidden = false; ok = false; }
      if (!ok) { btn.disabled = false; btn.dataset.locked = '0'; return; }
      const data = { id: existing?.id, subjectId, frente, verso, srs: existing?.srs || MEO.srs.initial() };
      MEO.db.upsert('flashcards', data);
      MEO.modal.close();
      MEO.toast(isEdit ? 'Flashcard atualizado.' : 'Flashcard criado.', 'success');
    });
  };

  // ---------------- Falta ----------------
  MEO.forms.falta = function (subjectId, existing) {
    const isEdit = !!existing;
    const subj = MEO.db.get('subjects', subjectId);
    const horariosSubj = (subj && subj.horarios) || [];
    function aulasSugeridas(dateKey) {
      if (!dateKey || !horariosSubj.length) return 1;
      const dow = String(MEO.parseDateKey(dateKey).getDay());
      const h = horariosSubj.find(x => String(x.dia) === dow);
      return h ? (h.aulasPorEncontro || 1) : 1;
    }
    const overlay = MEO.modal.open(`
      <h2 class="modal-title">${isEdit ? 'Editar falta' : 'Registrar falta'}</h2>
      <form id="f-falta">
        <div class="form-row">
          <div class="form-field">
            <label for="ft-data">Data *</label>
            <input type="date" id="ft-data" value="${existing?.data || MEO.toDateKey(new Date())}">
          </div>
          <div class="form-field">
            <label for="ft-qtd">Quantidade de aulas</label>
            <input type="number" min="1" step="1" id="ft-qtd" value="${existing?.aulas || aulasSugeridas(existing?.data || MEO.toDateKey(new Date()))}">
            <span class="field-hint">Sugerido a partir do horário cadastrado da matéria — ajuste se precisar.</span>
          </div>
        </div>
        <div class="form-field">
          <label for="ft-obs">Observação (opcional)</label>
          <input type="text" id="ft-obs" placeholder="Ex.: atestado médico" value="${MEO.escapeHTML(existing?.observacao || '')}">
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" data-act="cancel">Cancelar</button>
          <button type="submit" class="btn btn-primary" id="ft-submit"><i data-lucide="check" class="ic-sm"></i> Salvar</button>
        </div>
      </form>
    `);
    // Enquanto o usuário não mexer manualmente na quantidade, reajusta o
    // sugerido conforme a data escolhida (ex.: aquele dia costuma ter 4 aulas).
    const qtdInput = overlay.querySelector('#ft-qtd');
    let qtdTocada = false;
    qtdInput.addEventListener('input', () => { qtdTocada = true; });
    overlay.querySelector('#ft-data').addEventListener('change', (e) => {
      if (qtdTocada) return;
      qtdInput.value = aulasSugeridas(e.target.value);
    });
    overlay.querySelector('[data-act="cancel"]').addEventListener('click', () => MEO.modal.close());
    overlay.querySelector('#f-falta').addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = overlay.querySelector('#ft-submit');
      if (!lockButton(btn)) return;
      const data = {
        id: existing?.id,
        subjectId,
        data: overlay.querySelector('#ft-data').value || MEO.toDateKey(new Date()),
        aulas: Math.max(1, Number(overlay.querySelector('#ft-qtd').value) || 1),
        observacao: overlay.querySelector('#ft-obs').value.trim()
      };
      MEO.db.upsert('faltas', data);
      MEO.modal.close();
      MEO.toast(isEdit ? 'Falta atualizada.' : 'Falta registrada.', 'success');
    });
  };

  // ---------------- Nota ----------------
  MEO.forms.grade = function (subjectId, existing) {
    const isEdit = !!existing;
    const TIPOS_AVALIACAO = { prova: 'Prova', trabalho: 'Trabalho', seminario: 'Seminário/Apresentação', atividade: 'Atividade', outro: 'Outro' };
    const notaMaximaExisting = existing?.notaMaxima ?? 10;
    const overlay = MEO.modal.open(`
      <h2 class="modal-title">${isEdit ? 'Editar avaliação' : 'Nova avaliação'}</h2>
      <p class="modal-desc">Cadastre a prova ou trabalho assim que souber dele — a nota você preenche depois, quando sair.</p>
      <form id="f-grade">
        <div class="form-field">
          <label for="gr-titulo">Nome da avaliação *</label>
          <input type="text" id="gr-titulo" placeholder="Ex.: Prova 1" value="${MEO.escapeHTML(existing?.titulo || '')}">
          <span class="field-error" id="gr-titulo-err" hidden>Digite o nome da avaliação.</span>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label for="gr-tipo">Tipo</label>
            <select id="gr-tipo">
              ${Object.keys(TIPOS_AVALIACAO).map(t => `<option value="${t}" ${(existing?.tipo || 'prova') === t ? 'selected' : ''}>${TIPOS_AVALIACAO[t]}</option>`).join('')}
            </select>
          </div>
          <div class="form-field">
            <label for="gr-data">Data (opcional)</label>
            <input type="date" id="gr-data" value="${existing?.data || ''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label for="gr-nota">Nota obtida (deixe em branco se ainda não foi)</label>
            <input type="number" min="0" step="0.1" id="gr-nota" value="${existing?.nota ?? ''}">
            <span class="field-error" id="gr-nota-err" hidden>Digite uma nota válida (entre 0 e a nota máxima).</span>
          </div>
          <div class="form-field">
            <label for="gr-nota-maxima">Nota máxima</label>
            <input type="number" min="0.1" step="0.1" id="gr-nota-maxima" value="${notaMaximaExisting}">
          </div>
        </div>
        <div class="form-field">
          <label for="gr-peso">Peso</label>
          <input type="number" min="0.1" step="0.1" id="gr-peso" value="${existing?.peso ?? 1}">
        </div>
        <div class="form-field">
          <label>Conteúdo a estudar (checklist de preparação)</label>
          <div id="gr-conteudo-list"></div>
          <button type="button" class="btn btn-ghost btn-sm" id="btn-add-conteudo" style="margin-top:4px;"><i data-lucide="plus" class="ic-sm"></i> Adicionar conteúdo</button>
        </div>
        <div class="form-field">
          <label for="gr-obs">Observações</label>
          <textarea id="gr-obs">${MEO.escapeHTML(existing?.observacoes || '')}</textarea>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" data-act="cancel">Cancelar</button>
          <button type="submit" class="btn btn-primary" id="gr-submit"><i data-lucide="check" class="ic-sm"></i> Salvar</button>
        </div>
      </form>
    `);

    const conteudoList = overlay.querySelector('#gr-conteudo-list');
    function conteudoRowHtml(c) {
      c = c || {};
      return `<div class="subtask-row" data-cid="${c.id || MEO.uid('cont')}">
        <input type="checkbox" class="ct-feito" ${c.feito ? 'checked' : ''}>
        <input type="text" class="ct-texto" placeholder="Ex.: Alterações da consciência" value="${MEO.escapeHTML(c.texto || '')}">
        <button type="button" class="btn-icon btn-danger" data-act="remover-conteudo" title="Remover"><i data-lucide="trash-2" class="ic-sm"></i></button>
      </div>`;
    }
    function addConteudoRow(c) {
      conteudoList.insertAdjacentHTML('beforeend', conteudoRowHtml(c));
      MEO.refreshIcons(conteudoList);
    }
    (existing?.conteudo || []).forEach(c => addConteudoRow(c));
    conteudoList.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act="remover-conteudo"]');
      if (!btn) return;
      btn.closest('.subtask-row').remove();
    });
    overlay.querySelector('#btn-add-conteudo').addEventListener('click', () => addConteudoRow());

    overlay.querySelector('[data-act="cancel"]').addEventListener('click', () => MEO.modal.close());
    overlay.querySelector('#f-grade').addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = overlay.querySelector('#gr-submit');
      if (!lockButton(btn)) return;
      const titulo = overlay.querySelector('#gr-titulo').value.trim();
      const notaMaxima = Number(overlay.querySelector('#gr-nota-maxima').value) || 10;
      const notaVal = overlay.querySelector('#gr-nota').value;
      let ok = true;
      if (!titulo) { overlay.querySelector('#gr-titulo').classList.add('invalid'); overlay.querySelector('#gr-titulo-err').hidden = false; ok = false; }
      let nota = null;
      if (notaVal !== '') {
        nota = Number(notaVal);
        if (isNaN(nota) || nota < 0 || nota > notaMaxima) { overlay.querySelector('#gr-nota').classList.add('invalid'); overlay.querySelector('#gr-nota-err').hidden = false; ok = false; }
      }
      if (!ok) { btn.disabled = false; btn.dataset.locked = '0'; return; }
      const conteudo = Array.from(overlay.querySelectorAll('#gr-conteudo-list .subtask-row')).map(row => ({
        id: row.dataset.cid,
        texto: row.querySelector('.ct-texto').value.trim(),
        feito: row.querySelector('.ct-feito').checked
      })).filter(c => c.texto);
      const data = {
        id: existing?.id,
        subjectId,
        titulo,
        tipo: overlay.querySelector('#gr-tipo').value,
        nota,
        notaMaxima,
        peso: Number(overlay.querySelector('#gr-peso').value) || 1,
        data: overlay.querySelector('#gr-data').value || null,
        conteudo,
        observacoes: overlay.querySelector('#gr-obs').value.trim()
      };
      MEO.db.upsert('grades', data);
      MEO.modal.close();
      MEO.toast(isEdit ? 'Avaliação atualizada.' : 'Avaliação criada.', 'success');
    });
  };

  // ---------------- Link (geral ou de matéria) ----------------
  MEO.forms.link = function (existing, opts) {
    opts = opts || {};
    const isSubjectLink = !!opts.subjectId;
    const collection = isSubjectLink ? 'subjectLinks' : 'links';
    const isEdit = !!existing;
    const categorias = ['Estudo', 'Vídeo', 'Artigo', 'Ferramenta', 'Outro'];
    const overlay = MEO.modal.open(`
      <h2 class="modal-title">${isEdit ? 'Editar link' : 'Novo link'}</h2>
      <form id="f-link">
        <div class="form-field">
          <label for="lk-titulo">Título *</label>
          <input type="text" id="lk-titulo" value="${MEO.escapeHTML(existing?.titulo || '')}">
          <span class="field-error" id="lk-titulo-err" hidden>Digite um título.</span>
        </div>
        <div class="form-field">
          <label for="lk-url">Endereço (URL) *</label>
          <input type="text" id="lk-url" placeholder="exemplo.com/pagina" value="${MEO.escapeHTML(existing?.url || '')}">
          <span class="field-error" id="lk-url-err" hidden>Digite um endereço válido.</span>
        </div>
        ${!isSubjectLink ? `
        <div class="form-field">
          <label for="lk-cat">Categoria</label>
          <select id="lk-cat">${categorias.map(c => `<option ${existing?.categoria === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
        </div>
        <div class="form-field">
          <label for="lk-obs">Observação (opcional)</label>
          <textarea id="lk-obs">${MEO.escapeHTML(existing?.observacao || '')}</textarea>
        </div>` : ''}
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" data-act="cancel">Cancelar</button>
          <button type="submit" class="btn btn-primary" id="lk-submit"><i data-lucide="check" class="ic-sm"></i> Salvar</button>
        </div>
      </form>
    `);
    overlay.querySelector('[data-act="cancel"]').addEventListener('click', () => MEO.modal.close());
    overlay.querySelector('#f-link').addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = overlay.querySelector('#lk-submit');
      if (!lockButton(btn)) return;
      const titulo = overlay.querySelector('#lk-titulo').value.trim();
      const urlRaw = overlay.querySelector('#lk-url').value.trim();
      let ok = true;
      if (!titulo) { overlay.querySelector('#lk-titulo').classList.add('invalid'); overlay.querySelector('#lk-titulo-err').hidden = false; ok = false; }
      if (!urlRaw) { overlay.querySelector('#lk-url').classList.add('invalid'); overlay.querySelector('#lk-url-err').hidden = false; ok = false; }
      if (!ok) { btn.disabled = false; btn.dataset.locked = '0'; return; }
      const url = MEO.normalizeUrl(urlRaw);
      const data = { id: existing?.id, titulo, url };
      if (isSubjectLink) data.subjectId = opts.subjectId;
      else {
        data.categoria = overlay.querySelector('#lk-cat').value;
        data.observacao = overlay.querySelector('#lk-obs').value.trim();
      }
      MEO.db.upsert(collection, data);
      MEO.modal.close();
      MEO.toast(isEdit ? 'Link atualizado.' : 'Link adicionado.', 'success');
    });
  };

  // ---------------- Renomear PDF ----------------
  MEO.forms.renamePdf = function (pdf) {
    const overlay = MEO.modal.open(`
      <h2 class="modal-title">Renomear PDF</h2>
      <form id="f-rename">
        <div class="form-field">
          <label for="rn-nome">Nome do arquivo *</label>
          <input type="text" id="rn-nome" value="${MEO.escapeHTML(pdf.nome)}" required>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" data-act="cancel">Cancelar</button>
          <button type="submit" class="btn btn-primary">Salvar</button>
        </div>
      </form>
    `);
    overlay.querySelector('[data-act="cancel"]').addEventListener('click', () => MEO.modal.close());
    overlay.querySelector('#f-rename').addEventListener('submit', (e) => {
      e.preventDefault();
      const nome = overlay.querySelector('#rn-nome').value.trim();
      if (!nome) return;
      MEO.db.upsert('pdfs', { id: pdf.id, nome });
      MEO.modal.close();
      MEO.toast('PDF renomeado.', 'success');
    });
  };

})(window.MEO);
