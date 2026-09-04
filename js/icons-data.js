// ============================================================
// Meu Estudo Organizado — ícones SVG (estilo linear, hospedados
// localmente para nunca depender de uma CDN externa).
// Cada entrada é o conteúdo interno de um <svg viewBox="0 0 24 24">.
// ============================================================
window.MEO = window.MEO || {};

(function (MEO) {
  'use strict';

  const I = {
    'layout-dashboard': '<rect x="3" y="3" width="8" height="10" rx="1.5"/><rect x="13" y="3" width="8" height="6" rx="1.5"/><rect x="13" y="11" width="8" height="10" rx="1.5"/><rect x="3" y="15" width="8" height="6" rx="1.5"/>',
    'calendar-days': '<rect x="3" y="4.5" width="18" height="16" rx="2"/><line x1="3" y1="9.5" x2="21" y2="9.5"/><line x1="8" y1="2.5" x2="8" y2="6.5"/><line x1="16" y1="2.5" x2="16" y2="6.5"/><circle cx="8" cy="14" r="1"/><circle cx="12" cy="14" r="1"/><circle cx="16" cy="14" r="1"/>',
    'calendar': '<rect x="3" y="4.5" width="18" height="16" rx="2"/><line x1="3" y1="9.5" x2="21" y2="9.5"/><line x1="8" y1="2.5" x2="8" y2="6.5"/><line x1="16" y1="2.5" x2="16" y2="6.5"/>',
    'calendar-clock': '<path d="M17 3v4M8 3v4M4 9h9"/><rect x="3" y="4.5" width="18" height="16" rx="2"/><circle cx="16" cy="16" r="4.2"/><path d="M16 14.2V16l1.2 1"/>',
    'calendar-x': '<rect x="3" y="4.5" width="18" height="16" rx="2"/><line x1="3" y1="9.5" x2="21" y2="9.5"/><line x1="8" y1="2.5" x2="8" y2="6.5"/><line x1="16" y1="2.5" x2="16" y2="6.5"/><line x1="9.5" y1="13.5" x2="14.5" y2="18.5"/><line x1="14.5" y1="13.5" x2="9.5" y2="18.5"/>',
    'timer': '<line x1="9" y1="2" x2="15" y2="2"/><line x1="12" y1="6" x2="12" y2="2.4"/><circle cx="12" cy="14" r="8"/><line x1="12" y1="14" x2="15.2" y2="11"/>',
    'trending-up': '<polyline points="3,17 9,11 13,15 21,6"/><polyline points="15,6 21,6 21,12"/>',
    'link-2': '<path d="M9 12h6"/><path d="M10.5 7H8a5 5 0 0 0 0 10h2.5"/><path d="M13.5 17H16a5 5 0 0 0 0-10h-2.5"/>',
    'settings': '<circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V20a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H4a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.3H10a1.7 1.7 0 0 0 1-1.6V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9V10a1.7 1.7 0 0 0 1.6 1H20a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1Z"/>',
    'search': '<circle cx="10.5" cy="10.5" r="6.5"/><line x1="20" y1="20" x2="15.3" y2="15.3"/>',
    'download': '<path d="M12 3v12"/><polyline points="7,11 12,16 17,11"/><path d="M4 18v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
    'upload': '<path d="M12 21V9"/><polyline points="7,13 12,8 17,13"/><path d="M4 18v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
    'x': '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
    'menu': '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
    'plus': '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    'check': '<polyline points="4,12.5 9.5,18 20,6"/>',
    'pencil': '<path d="M14.5 4.5 19.5 9.5 8 21H3v-5Z"/><line x1="12.5" y1="6.5" x2="17.5" y2="11.5"/>',
    'trash-2': '<path d="M4 7h16"/><path d="M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7"/><path d="M6 7l1 13a2 2 0 0 0 2 1.8h6a2 2 0 0 0 2-1.8l1-13"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
    'eye': '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    'external-link': '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/>',
    'file': '<path d="M13.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5Z"/><polyline points="13.5,3 13.5,8.5 19,8.5"/>',
    'file-text': '<path d="M13.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5Z"/><polyline points="13.5,3 13.5,8.5 19,8.5"/><line x1="8.5" y1="13" x2="15.5" y2="13"/><line x1="8.5" y1="16.5" x2="15.5" y2="16.5"/>',
    'file-up': '<path d="M13.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5Z"/><polyline points="13.5,3 13.5,8.5 19,8.5"/><path d="M12 17.5v-6"/><polyline points="9.3,13.7 12,11 14.7,13.7"/>',
    'file-warning': '<path d="M13.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5Z"/><polyline points="13.5,3 13.5,8.5 19,8.5"/><line x1="12" y1="11.5" x2="12" y2="15"/><circle cx="12" cy="17.3" r="0.15" fill="currentColor" stroke="currentColor"/>',
    'flame': '<path d="M12 22a6.5 6.5 0 0 0 6.5-6.5c0-3.2-2-4.6-3.3-6.7-.9 1.4-1.4 1.9-1.4 1.9S14 8 12 5c-2.3 2.4-6.5 6.7-6.5 10.5A6.5 6.5 0 0 0 12 22Z"/><path d="M12 18.5a3 3 0 0 0 1.6-5.5c-.6.8-1.6 1.3-1.6 1.3s-.4-1.3-1.4-2.3c-1.1 1.2-1.6 2.3-1.6 3A3 3 0 0 0 12 18.5Z"/>',
    'layers': '<path d="M12 3 2.5 8 12 13l9.5-5Z"/><path d="M2.5 13 12 18l9.5-5"/><path d="M2.5 17.5 12 22.5l9.5-5"/>',
    'layers-3': '<path d="M12 3 3 7.5 12 12l9-4.5Z"/><path d="M3 12l9 4.5 9-4.5"/><path d="M3 16.5 12 21l9-4.5"/>',
    'log-in': '<path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5"/><polyline points="15,8 19,12 15,16"/><line x1="19" y1="12" x2="8.5" y2="12"/>',
    'log-out': '<path d="M13 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5"/><polyline points="9,8 5,12 9,16"/><line x1="5" y1="12" x2="15.5" y2="12"/>',
    'party-popper': '<path d="M4.5 19.5 8 8l7.5 7.5Z"/><path d="M14.5 3.5s1 1.5 0 3M18 6s1.5 1 3 0M17.5 10.5s1.5.5 1.5 2"/><circle cx="19" cy="4" r="0.3" fill="currentColor"/><circle cx="10" cy="4.5" r="0.5" fill="currentColor"/>',
    'play': '<path d="M6.5 4.5v15l13-7.5Z"/>',
    'pause': '<rect x="6.5" y="4.5" width="4" height="15" rx="1"/><rect x="13.5" y="4.5" width="4" height="15" rx="1"/>',
    'printer': '<path d="M6 8.5V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v4.5"/><rect x="3.5" y="8.5" width="17" height="8" rx="1.5"/><path d="M6 15.5V21a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-5.5"/><line x1="7" y1="12" x2="10" y2="12"/>',
    'rotate-ccw': '<path d="M3 3v6h6"/><path d="M3.5 13a8.5 8.5 0 1 0 2.5-6.5L3 9"/>',
    'skip-forward': '<path d="M5.5 4.5v15L15 12Z"/><line x1="18.5" y1="4.5" x2="18.5" y2="19.5"/>',
    'sparkles': '<path d="M12 3v4M12 17v4M4 12h4M16 12h4"/><path d="M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2"/><circle cx="12" cy="12" r="2.2"/>',
    'user': '<circle cx="12" cy="8" r="4"/><path d="M4 20.5c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/>',
    'user-circle': '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="10" r="3"/><path d="M6.2 18.5c1-2.6 3.2-4 5.8-4s4.8 1.4 5.8 4"/>',
    'graduation-cap': '<path d="M2 9.5 12 5l10 4.5-10 4.5Z"/><path d="M6.5 11.7v4.3c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-4.3"/><path d="M21 9.5v5.5"/>',
    'database-backup': '<ellipse cx="12" cy="5.5" rx="8" ry="2.8"/><path d="M4 5.5v6c0 1.5 3.6 2.8 8 2.8M4 11.5v6c0 1.5 3.6 2.8 8 2.8"/><path d="M20 11.5v-6"/><path d="M15.5 18a3.5 3.5 0 1 0 3.5-3.5"/><polyline points="19,12.5 19,14.8 21,14.8"/>',
    'life-buoy': '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.6"/><line x1="6.3" y1="6.3" x2="9.4" y2="9.4"/><line x1="14.6" y1="14.6" x2="17.7" y2="17.7"/><line x1="17.7" y1="6.3" x2="14.6" y2="9.4"/><line x1="9.4" y1="14.6" x2="6.3" y2="17.7"/>',
    'bell': '<path d="M6 10.5a6 6 0 0 1 12 0c0 4 1.5 5.2 1.5 5.2H4.5S6 14.5 6 10.5Z"/><path d="M10 19a2.2 2.2 0 0 0 4 0"/>',
    'notebook-pen': '<path d="M5 3.5h11a2 2 0 0 1 2 2V19a2 2 0 0 1-2 2H5Z"/><line x1="5" y1="3.5" x2="5" y2="21"/><line x1="2" y1="7" x2="5" y2="7"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="2" y1="17" x2="5" y2="17"/><path d="M14.5 8.5 17 6l2 2-2.5 2.5L14 11Z"/>',
    'clock': '<circle cx="12" cy="12" r="9"/><polyline points="12,7 12,12 15.5,14"/>',
    'circle-check': '<circle cx="12" cy="12" r="9"/><polyline points="8,12.3 11,15.3 16,9.5"/>',
    'book-open': '<path d="M12 6.5C10.5 5 8 4.2 4.5 4.5v13.8c3.5-.3 6 .5 7.5 2 1.5-1.5 4-2.3 7.5-2V4.5c-3.5-.3-6 .5-7.5 2Z"/><line x1="12" y1="6.5" x2="12" y2="20.3"/>',
    'file-edit': '<path d="M13.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9"/><polyline points="13.5,3 13.5,8.5 19,8.5"/><path d="M13.5 15.5 17 12l2 2-3.5 3.5L13 18Z"/>',
    'clipboard-list': '<rect x="5" y="4.5" width="14" height="16.5" rx="2"/><rect x="9" y="2.5" width="6" height="3.5" rx="1"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="14.5" x2="16" y2="14.5"/><line x1="8" y1="18" x2="13" y2="18"/>',
    'presentation': '<line x1="3" y1="4" x2="21" y2="4"/><path d="M4 4v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V4"/><line x1="12" y1="16" x2="12" y2="21"/><line x1="8" y1="21" x2="16" y2="21"/><polyline points="8,12 11,9 13,11 16,7.5"/>',
    'loader-circle': '<circle cx="12" cy="12" r="9" opacity="0.25"/><path d="M21 12a9 9 0 0 0-9-9"/>',
    'cloud-check': '<path d="M7 18.5A4.5 4.5 0 0 1 7.5 9.6 6 6 0 0 1 19 11a3.8 3.8 0 0 1-1 7.5H7.5Z"/><polyline points="9.5,14.5 11.5,16.5 15,12.5"/>',
    'cloud-off': '<path d="M6.5 6.5A6 6 0 0 1 19 11a3.8 3.8 0 0 1-.6 7.5H8"/><path d="M4.2 4.2 19.8 19.8"/><path d="M6.2 9.9A4.5 4.5 0 0 0 6.5 18.5H8"/>',
    'hard-drive': '<line x1="2.5" y1="13.5" x2="21.5" y2="13.5"/><path d="M4.5 5.5h15l2.5 8v3.5a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 2 17v-3.5Z"/><line x1="6.5" y1="17" x2="6.51" y2="17"/><line x1="10.5" y1="17" x2="10.51" y2="17"/>',
    'triangle-alert': '<path d="M12 4 22 20H2Z"/><line x1="12" y1="10" x2="12" y2="14.5"/><line x1="12" y1="17.2" x2="12" y2="17.2"/>',
    'help-circle': '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.3 1.9-2.3 3.5"/><line x1="12" y1="17" x2="12" y2="17"/>',
    'chevron-left': '<polyline points="15,4 8,12 15,20"/>',
    'chevron-right': '<polyline points="9,4 16,12 9,20"/>',
    'arrow-left': '<line x1="20" y1="12" x2="4" y2="12"/><polyline points="10,6 4,12 10,18"/>',
    'arrow-right': '<line x1="4" y1="12" x2="20" y2="12"/><polyline points="14,6 20,12 14,18"/>',
    'user-x': '<circle cx="9.5" cy="7.5" r="3.7"/><path d="M3 20.2c0-3.7 2.9-6 6.5-6s6.5 2.3 6.5 6"/><line x1="16.5" y1="4.5" x2="21" y2="9"/><line x1="21" y1="4.5" x2="16.5" y2="9"/>',
    'percent': '<circle cx="7" cy="7" r="2.3"/><circle cx="17" cy="17" r="2.3"/><line x1="19" y1="5" x2="5" y2="19"/>',
    'calculator': '<rect x="4.5" y="2.5" width="15" height="19" rx="2"/><rect x="7.5" y="5.5" width="9" height="4" rx="0.8"/><circle cx="8.2" cy="13.3" r="0.9" fill="currentColor" stroke="none"/><circle cx="12" cy="13.3" r="0.9" fill="currentColor" stroke="none"/><circle cx="15.8" cy="13.3" r="0.9" fill="currentColor" stroke="none"/><circle cx="8.2" cy="17" r="0.9" fill="currentColor" stroke="none"/><circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none"/><circle cx="15.8" cy="17" r="0.9" fill="currentColor" stroke="none"/>'
  };

  MEO._iconDefs = I;

  // Retorna a marcação <svg>...</svg> já pronta (sem precisar de refreshIcons),
  // útil para casos como o fallback de favicon (onerror) inserido depois do render.
  MEO.iconSvgString = function (name, extraClass) {
    const def = I[name] || I['link-2'];
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${extraClass || ''}" aria-hidden="true">${def}</svg>`;
  };

  MEO.refreshIcons = function (root) {
    const scope = root || document;
    scope.querySelectorAll('i[data-lucide]').forEach(el => {
      const name = el.getAttribute('data-lucide');
      const def = I[name];
      const svgNS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '2');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      svg.setAttribute('aria-hidden', 'true');
      svg.innerHTML = def || I['sparkles'];
      svg.setAttribute('class', el.getAttribute('class') || '');
      el.replaceWith(svg);
    });
  };

})(window.MEO);
