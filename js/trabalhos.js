// ============================================================
// Meu Estudo Organizado — trabalhos acadêmicos (projetos em grupo)
// Regras/helpers de dados. A renderização fica em views.js e os
// formulários em forms.js, seguindo o mesmo padrão dos outros módulos.
// ============================================================
window.MEO = window.MEO || {};

(function (MEO) {
  'use strict';

  const STATUS = {
    nao_iniciado: { label: 'Não iniciado', icon: 'circle' },
    em_andamento: { label: 'Em andamento', icon: 'clock' },
    concluido: { label: 'Concluído', icon: 'circle-check' }
  };

  MEO.trabalhos = {
    STATUS,

    // % de etapas concluídas (0-100). null se o trabalho não tem etapas.
    etapaProgress(trabalho) {
      const etapas = trabalho.etapas || [];
      if (!etapas.length) return null;
      const done = etapas.filter(e => e.feita).length;
      return Math.round((done / etapas.length) * 100);
    },

    isOverdue(trabalho) {
      if (trabalho.status === 'concluido') return false;
      if (!trabalho.dataEntrega) return false;
      return trabalho.dataEntrega < MEO.toDateKey(new Date());
    },

    diasRestantes(trabalho) {
      if (!trabalho.dataEntrega) return null;
      const hoje = MEO.parseDateKey(MEO.toDateKey(new Date()));
      const alvo = MEO.parseDateKey(trabalho.dataEntrega);
      return Math.round((alvo - hoje) / 86400000);
    },

    duplicate(trabalho) {
      const copy = Object.assign({}, trabalho, {
        id: undefined,
        titulo: trabalho.titulo + ' (cópia)',
        status: 'nao_iniciado',
        etapas: (trabalho.etapas || []).map(e => Object.assign({}, e, { feita: false }))
      });
      return MEO.db.upsert('trabalhos', copy);
    },

    setStatus(id, status) {
      return MEO.db.upsert('trabalhos', { id, status });
    },

    toggleEtapa(trabalho, etapaId) {
      const etapas = (trabalho.etapas || []).map(e => e.id === etapaId ? Object.assign({}, e, { feita: !e.feita }) : e);
      const patch = { id: trabalho.id, etapas };
      // se todas as etapas foram concluídas, sugere marcar o trabalho como concluído automaticamente
      if (etapas.length && etapas.every(e => e.feita) && trabalho.status !== 'concluido') {
        patch.status = 'concluido';
      } else if (trabalho.status === 'concluido' && !etapas.every(e => e.feita)) {
        patch.status = 'em_andamento';
      }
      return MEO.db.upsert('trabalhos', patch);
    }
  };

})(window.MEO);
