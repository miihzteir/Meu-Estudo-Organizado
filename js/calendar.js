// ============================================================
// Meu Estudo Organizado — grade do calendário mensal
// ============================================================
window.MEO = window.MEO || {};

(function (MEO) {
  'use strict';

  MEO.calendar = {
    // Retorna um array de 42 dias (6 semanas) cobrindo o mês,
    // incluindo dias do mês anterior/seguinte para completar a grade.
    buildMonthGrid(year, month) {
      const firstOfMonth = new Date(year, month, 1);
      const startOffset = firstOfMonth.getDay(); // 0=domingo
      const gridStart = new Date(year, month, 1 - startOffset);
      const todayKey = MEO.toDateKey(new Date());
      const days = [];
      for (let i = 0; i < 42; i++) {
        const d = new Date(gridStart);
        d.setDate(gridStart.getDate() + i);
        const key = MEO.toDateKey(d);
        days.push({
          dateKey: key,
          day: d.getDate(),
          inMonth: d.getMonth() === month,
          isToday: key === todayKey,
          weekday: d.getDay()
        });
      }
      return days;
    },

    groupEventsByDate(events) {
      const map = {};
      events.forEach(ev => {
        if (!ev.data) return;
        (map[ev.data] = map[ev.data] || []).push(ev);
      });
      Object.values(map).forEach(list => {
        list.sort((a, b) => (a.hora || '99:99').localeCompare(b.hora || '99:99'));
      });
      return map;
    },

    TIPOS: {
      prova: { label: 'Prova', icon: 'file-warning', color: '#c65a5a' },
      trabalho: { label: 'Trabalho', icon: 'clipboard-list', color: '#c98b6c' },
      aula: { label: 'Aula', icon: 'presentation', color: '#7c8fbf' },
      lembrete: { label: 'Lembrete', icon: 'bell', color: '#a68b5b' },
      outro: { label: 'Outro', icon: 'calendar-days', color: '#8f6b8c' }
    },

    // Cor efetiva de um tipo de evento: usa a cor personalizada salva em
    // Configurações (settings.coresTipos), se houver, senão cai na cor padrão
    // do tipo. Usado tanto no calendário quanto na Visão geral, pra ficar tudo
    // consistente em um só lugar.
    corDoTipo(tipoKey) {
      const key = (tipoKey && this.TIPOS[tipoKey]) ? tipoKey : 'outro';
      const custom = MEO.db.state.settings.coresTipos;
      if (custom && custom[key]) return custom[key];
      return this.TIPOS[key].color;
    }
  };

})(window.MEO);
