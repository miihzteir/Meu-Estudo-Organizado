// ============================================================
// Meu Estudo Organizado — repetição espaçada simples (sem IA)
// Regras explicáveis, inspiradas no método SM-2 simplificado.
// ============================================================
window.MEO = window.MEO || {};

(function (MEO) {
  'use strict';

  function todayKey() { return MEO.toDateKey(new Date()); }

  MEO.srs = {
    initial() {
      return { ease: 2.5, interval: 0, reps: 0, lapses: 0, due: todayKey(), lastReview: null };
    },

    isDue(card) {
      const srs = card.srs || MEO.srs.initial();
      return srs.due <= todayKey();
    },

    // rating: 'errei' | 'dificil' | 'acertei'
    review(card, rating) {
      const srs = Object.assign({}, MEO.srs.initial(), card.srs || {});
      let { ease, interval, reps, lapses } = srs;
      const today = new Date();

      if (rating === 'errei') {
        lapses += 1;
        reps = 0;
        interval = 0; // volta para a fila de revisão de hoje/amanhã
        ease = Math.max(1.3, ease - 0.2);
      } else if (rating === 'dificil') {
        reps += 1;
        interval = reps <= 1 ? 1 : Math.max(1, Math.round(interval * 1.2));
        ease = Math.max(1.3, ease - 0.05);
      } else { // acertei
        reps += 1;
        if (reps === 1) interval = 1;
        else if (reps === 2) interval = 6;
        else interval = Math.round(Math.max(interval, 1) * ease);
        ease = Math.min(2.8, ease + 0.1);
      }

      const due = new Date(today);
      due.setDate(due.getDate() + Math.max(0, interval));

      return {
        ease: Math.round(ease * 100) / 100,
        interval,
        reps,
        lapses,
        due: MEO.toDateKey(due),
        lastReview: MEO.nowISO()
      };
    }
  };

})(window.MEO);
