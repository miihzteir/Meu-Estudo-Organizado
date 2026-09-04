// ============================================================
// Meu Estudo Organizado — utilitários gerais
// ============================================================
window.MEO = window.MEO || {};

(function (MEO) {
  'use strict';

  const MESES = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  const DIAS_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const DIAS_SEMANA_ABREV = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const DIAS_SEMANA_MIN = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  MEO.MESES = MESES;
  MEO.DIAS_SEMANA = DIAS_SEMANA;
  MEO.DIAS_SEMANA_ABREV = DIAS_SEMANA_ABREV;
  MEO.DIAS_SEMANA_MIN = DIAS_SEMANA_MIN;

  MEO.uid = function (prefix) {
    const rnd = (Math.random().toString(36).slice(2, 10)) + (Math.random().toString(36).slice(2, 6));
    return (prefix ? prefix + '_' : '') + Date.now().toString(36) + '_' + rnd;
  };

  MEO.nowISO = function () { return new Date().toISOString(); };

  // yyyy-mm-dd local (sem fuso) para uso em inputs type=date e comparações
  MEO.toDateKey = function (d) {
    if (typeof d === 'string') {
      if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
      d = new Date(d);
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  MEO.parseDateKey = function (key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  MEO.formatDateBR = function (dateKey) {
    if (!dateKey) return '';
    const d = MEO.parseDateKey(dateKey);
    const diaSemana = DIAS_SEMANA[d.getDay()];
    const diaSemanaCap = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);
    return `${diaSemanaCap}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
  };

  MEO.formatDateShort = function (dateKey) {
    if (!dateKey) return '';
    const d = MEO.parseDateKey(dateKey);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  MEO.formatDateFull = function (dateKey) {
    if (!dateKey) return '';
    const d = MEO.parseDateKey(dateKey);
    return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
  };

  MEO.formatTime = function (mins) {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    if (h <= 0) return `${m} min`;
    if (m === 0) return `${h} h`;
    return `${h} h ${m} min`;
  };

  MEO.debounce = function (fn, wait) {
    let t = null;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  };

  MEO.escapeHTML = function (str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  MEO.normalizeUrl = function (url) {
    if (!url) return '';
    url = url.trim();
    if (!url) return '';
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    return url;
  };

  MEO.faviconFor = function (url) {
    try {
      const u = new URL(MEO.normalizeUrl(url));
      return `https://www.google.com/s2/favicons?sz=64&domain=${u.hostname}`;
    } catch (e) {
      return '';
    }
  };

  MEO.formatBytes = function (bytes) {
    if (bytes == null) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // MEO.refreshIcons é definido em js/icons-data.js (ícones SVG locais).

  MEO.icon = function (name, extraClass) {
    return `<i data-lucide="${name}" class="ic ${extraClass || ''}" aria-hidden="true"></i>`;
  };

  let toastTimer = null;
  MEO.toast = function (msg, type) {
    let el = document.getElementById('meo-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'meo-toast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.className = 'toast show ' + (type ? 'toast-' + type : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = 'toast'; }, 3200);
  };

  MEO.diasDaSemana = [
    { v: 0, l: 'Domingo' }, { v: 1, l: 'Segunda-feira' }, { v: 2, l: 'Terça-feira' },
    { v: 3, l: 'Quarta-feira' }, { v: 4, l: 'Quinta-feira' }, { v: 5, l: 'Sexta-feira' }, { v: 6, l: 'Sábado' }
  ];

  MEO.CORES_MATERIA = ['#8f6b8c', '#b98fae', '#c98b6c', '#7c9c8e', '#7c8fbf', '#c67c92', '#a68b5b', '#6e8f7f'];

  MEO.clamp = function (v, min, max) { return Math.max(min, Math.min(max, v)); };

})(window.MEO);
