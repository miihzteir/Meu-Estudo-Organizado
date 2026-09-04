// ============================================================
// Meu Estudo Organizado — sistema de tarefas
// Regras/helpers de dados. A renderização fica em views.js e os
// formulários em forms.js, seguindo o mesmo padrão dos outros módulos.
// ============================================================
window.MEO = window.MEO || {};

(function (MEO) {
  'use strict';

  const PRIORIDADES = {
    baixa: { label: 'Baixa', ordem: 0, cor: '#7c9c8e' },
    media: { label: 'Média', ordem: 1, cor: '#a68b5b' },
    alta: { label: 'Alta', ordem: 2, cor: '#c67c92' }
  };

  const STATUS = {
    nao_iniciado: { label: 'Não iniciado', icon: 'circle' },
    em_andamento: { label: 'Em andamento', icon: 'clock' },
    concluido: { label: 'Concluído', icon: 'circle-check' }
  };

  MEO.tasks = {
    PRIORIDADES,
    STATUS,

    // % de subtarefas concluídas (0-100). null se a tarefa não tem subtarefas.
    subtaskProgress(task) {
      const subs = task.subtarefas || [];
      if (!subs.length) return null;
      const done = subs.filter(s => s.feita).length;
      return Math.round((done / subs.length) * 100);
    },

    isOverdue(task) {
      if (task.status === 'concluido') return false;
      if (!task.data) return false;
      return task.data < MEO.toDateKey(new Date());
    },

    isToday(task) {
      if (!task.data) return false;
      return task.data === MEO.toDateKey(new Date());
    },

    // Cria uma cópia independente de uma tarefa (duplicar), zerando conclusão.
    duplicate(task) {
      const copy = Object.assign({}, task, {
        id: undefined,
        titulo: task.titulo + ' (cópia)',
        status: 'nao_iniciado',
        concluidoEm: null,
        subtarefas: (task.subtarefas || []).map(s => Object.assign({}, s, { feita: false }))
      });
      return MEO.db.upsert('tasks', copy);
    },

    setStatus(id, status) {
      const patch = { id, status };
      if (status === 'concluido') patch.concluidoEm = MEO.nowISO();
      else patch.concluidoEm = null;
      return MEO.db.upsert('tasks', patch);
    },

    toggleSubtask(task, subId) {
      const subtarefas = (task.subtarefas || []).map(s => s.id === subId ? Object.assign({}, s, { feita: !s.feita }) : s);
      return MEO.db.upsert('tasks', { id: task.id, subtarefas });
    },

    // Converte uma tarefa em compromisso da agenda (mantém a tarefa, só cria o evento).
    toEvent(task) {
      const tipoMap = { alta: 'prova', media: 'trabalho', baixa: 'lembrete' };
      return MEO.db.upsert('events', {
        titulo: task.titulo,
        tipo: 'lembrete',
        prioridade: task.prioridade === 'alta' ? 'alta' : 'normal',
        data: task.data || MEO.toDateKey(new Date()),
        hora: task.hora || '',
        semesterId: task.semesterId || null,
        subjectId: task.subjectId || null,
        descricao: task.descricao || '',
        lembrete: !!task.lembrete
      });
    }
  };

})(window.MEO);
