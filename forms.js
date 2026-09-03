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
        <div class="form-row">
          <div class="form-field">
            <label for="mat-dia">Dia da semana</label>
            <select id="mat-dia">
              <option value="">Não definido</option>
              ${MEO.diasDaSemana.map(d => `<option value="${d.v}" ${String(existing?.dia) === String(d.v) ? 'selected' : ''}>${d.l}</option>`).join('')}
            </select>
          </div>
          <div class="form-field"></div>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label for="mat-hi">Horário inicial</label>
            <input type="time" id="mat-hi" value="${existing?.horaInicio || ''}">
          </div>
          <div class="form-field">
            <label for="mat-hf">Horário final</label>
            <input type="time" id="mat-hf" value="${existing?.horaFim || ''}">
          </div>
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
            <label for="mat-total-aulas">Total de aulas previstas</label>
            <input type="number" min="0" id="mat-total-aulas" placeholder="Ex.: 60" value="${existing?.totalAulas ?? ''}">
          </div>
          <div class="form-field">
            <label for="mat-limite-faltas">Limite de faltas (%)</label>
            <input type="number" min="0" max="100" step="1" id="mat-limite-faltas" value="${existing?.limiteFaltasPercent ?? 25}">
          </div>
        </div>
        <div class="form-field" style="max-width:220px;">
          <label for="mat-media-aprovacao">Média para aprovação</label>
          <input type="number" min="0" max="10" step="0.1" id="mat-media-aprovacao" value="${existing?.mediaAprovacao ?? 6}">
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" data-act="cancel">Cancelar</button>
          <button type="submit" class="btn btn-primary" id="mat-submit"><i data-lucide="check" class="ic-sm"></i> Salvar</button>
        </div>
      </form>
    `);
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
      const data = {
        id: existing?.id,
        semesterId,
        nome,
        professor: overlay.querySelector('#mat-prof').value.trim(),
        dia: overlay.querySelector('#mat-dia').value,
        horaInicio: overlay.querySelector('#mat-hi').value,
        horaFim: overlay.querySelector('#mat-hf').value,
        totalAulas: overlay.querySelector('#mat-total-aulas').value ? Number(overlay.querySelector('#mat-total-aulas').value) : null,
        limiteFaltasPercent: overlay.querySelector('#mat-limite-faltas').value ? Number(overlay.querySelector('#mat-limite-faltas').value) : 25,
        mediaAprovacao: overlay.querySelector('#mat-media-aprovacao').value !== '' ? Number(overlay.querySelector('#mat-media-aprovacao').value) : 6,
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
            <input type="number" min="1" step="1" id="ft-qtd" value="${existing?.aulas || 1}">
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
    const overlay = MEO.modal.open(`
      <h2 class="modal-title">${isEdit ? 'Editar nota' : 'Nova nota'}</h2>
      <form id="f-grade">
        <div class="form-field">
          <label for="gr-titulo">Avaliação *</label>
          <input type="text" id="gr-titulo" placeholder="Ex.: Prova 1" value="${MEO.escapeHTML(existing?.titulo || '')}">
          <span class="field-error" id="gr-titulo-err" hidden>Digite o nome da avaliação.</span>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label for="gr-nota">Nota (0 a 10) *</label>
            <input type="number" min="0" max="10" step="0.1" id="gr-nota" value="${existing?.nota ?? ''}">
            <span class="field-error" id="gr-nota-err" hidden>Digite uma nota entre 0 e 10.</span>
          </div>
          <div class="form-field">
            <label for="gr-peso">Peso</label>
            <input type="number" min="0.1" step="0.1" id="gr-peso" value="${existing?.peso ?? 1}">
          </div>
        </div>
        <div class="form-field">
          <label for="gr-data">Data (opcional)</label>
          <input type="date" id="gr-data" value="${existing?.data || ''}">
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" data-act="cancel">Cancelar</button>
          <button type="submit" class="btn btn-primary" id="gr-submit"><i data-lucide="check" class="ic-sm"></i> Salvar</button>
        </div>
      </form>
    `);
    overlay.querySelector('[data-act="cancel"]').addEventListener('click', () => MEO.modal.close());
    overlay.querySelector('#f-grade').addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = overlay.querySelector('#gr-submit');
      if (!lockButton(btn)) return;
      const titulo = overlay.querySelector('#gr-titulo').value.trim();
      const notaVal = overlay.querySelector('#gr-nota').value;
      let ok = true;
      if (!titulo) { overlay.querySelector('#gr-titulo').classList.add('invalid'); overlay.querySelector('#gr-titulo-err').hidden = false; ok = false; }
      const nota = Number(notaVal);
      if (notaVal === '' || isNaN(nota) || nota < 0 || nota > 10) { overlay.querySelector('#gr-nota').classList.add('invalid'); overlay.querySelector('#gr-nota-err').hidden = false; ok = false; }
      if (!ok) { btn.disabled = false; btn.dataset.locked = '0'; return; }
      const data = {
        id: existing?.id,
        subjectId,
        titulo,
        nota,
        peso: Number(overlay.querySelector('#gr-peso').value) || 1,
        data: overlay.querySelector('#gr-data').value || null
      };
      MEO.db.upsert('grades', data);
      MEO.modal.close();
      MEO.toast(isEdit ? 'Nota atualizada.' : 'Nota adicionada.', 'success');
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
