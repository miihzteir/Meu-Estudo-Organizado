// ============================================================
// Meu Estudo Organizado — metas pessoais/acadêmicas
// Regras/helpers de dados. A renderização fica em views.js e os
// formulários em forms.js, seguindo o mesmo padrão dos outros módulos.
// ============================================================
window.MEO = window.MEO || {};

(function (MEO) {
  'use strict';

  MEO.metas = {
    isOverdue(meta) {
      if (meta.concluida) return false;
      if (!meta.prazo) return false;
      return meta.prazo < MEO.toDateKey(new Date());
    },

    setProgresso(id, progresso) {
      const p = MEO.clamp(Math.round(progresso), 0, 100);
      const patch = { id, progresso: p };
      if (p >= 100) { patch.concluida = true; patch.concluidoEm = MEO.nowISO(); }
      return MEO.db.upsert('metas', patch);
    },

    toggleConcluida(meta) {
      const concluida = !meta.concluida;
      return MEO.db.upsert('metas', {
        id: meta.id,
        concluida,
        progresso: concluida ? 100 : meta.progresso,
        concluidoEm: concluida ? MEO.nowISO() : null
      });
    }
  };

})(window.MEO);
