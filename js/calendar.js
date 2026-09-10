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

    // Segunda-feira da semana que contém a data informada (dateKey "yyyy-mm-dd").
    mondayOf(dateKey) {
      const d = MEO.parseDateKey(dateKey);
      const diff = (d.getDay() + 6) % 7; // 0 = segunda
      d.setDate(d.getDate() - diff);
      return MEO.toDateKey(d);
    },

    // 7 dias (segunda a domingo) a partir de um dateKey de segunda-feira.
    buildWeekGrid(mondayKey) {
      const start = MEO.parseDateKey(mondayKey);
      const todayKey = MEO.toDateKey(new Date());
      const days = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const key = MEO.toDateKey(d);
        days.push({ dateKey: key, day: d.getDate(), isToday: key === todayKey, weekday: d.getDay() });
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

    // Tipos padrão de compromisso (usados quando a pessoa nunca personalizou
    // nada em Configurações > Tipos de compromisso).
    TIPOS_PADRAO: {
      prova: { label: 'Prova', icon: 'file-warning', color: '#c65a5a' },
      trabalho: { label: 'Trabalho', icon: 'clipboard-list', color: '#c98b6c' },
      aula: { label: 'Aula', icon: 'presentation', color: '#7c8fbf' },
      lembrete: { label: 'Lembrete', icon: 'bell', color: '#a68b5b' },
      outro: { label: 'Outro', icon: 'calendar-days', color: '#8f6b8c' }
    },

    // Retorna os tipos de compromisso em uso: os personalizados salvos em
    // Configurações (settings.tiposCompromisso), se a pessoa já editou/criou
    // algum, senão os tipos padrão. É um método (não uma lista fixa) pra
    // sempre refletir edições, novos tipos e exclusões em tempo real.
    tipos() {
      const custom = MEO.db.state.settings.tiposCompromisso;
      return (custom && Object.keys(custom).length) ? custom : this.TIPOS_PADRAO;
    },

    // Cor efetiva de um tipo de evento. "outro" é o tipo de reserva: se o
    // tipo salvo no evento não existir mais (foi excluído), cai nele.
    corDoTipo(tipoKey) {
      const tipos = this.tipos();
      const key = (tipoKey && tipos[tipoKey]) ? tipoKey : 'outro';
      const tipo = tipos[key] || this.TIPOS_PADRAO.outro;
      return tipo.color;
    }
  };

})(window.MEO);
