/* AICore Mawʿid — shared UI helpers (icons, banner, header, modal, toast) */
(function (global) {
  'use strict';
  var P = {
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    calcheck: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="m9 16 2 2 4-4"/>',
    calswap: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M8 15h8m-2-2 2 2-2 2"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    chart: '<path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    msg: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    wa: '<path d="M3.5 20.5l1.3-4.2A8.5 8.5 0 1 1 8 19.3z"/><path d="M9 8.6c0-.3.3-.6.6-.6h.8c.2 0 .4.1.5.4l.6 1.4c.1.2 0 .5-.1.6l-.5.5c.5 1 1.3 1.8 2.3 2.3l.5-.5c.2-.2.4-.2.6-.1l1.4.6c.3.1.4.3.4.5v.8c0 .3-.3.6-.6.6A6 6 0 0 1 9 8.6z" fill="currentColor" stroke="none"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    userx: '<circle cx="10" cy="8" r="4"/><path d="M2 21a8 8 0 0 1 13-6.2"/><path d="m17 16 5 5m0-5-5 5"/>',
    usercheck: '<circle cx="10" cy="8" r="4"/><path d="M2 21a8 8 0 0 1 13-6.2"/><path d="m16 19 2 2 4-4"/>',
    wallet: '<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20M16 15h2"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>',
    external: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    tooth: '<path d="M7 3C4.5 3 3 5 3 7.5c0 2 1 3.5 1.5 5.5.5 2.5.8 8 2.5 8 1.5 0 1.5-5 3-5h4c1.5 0 1.5 5 3 5 1.7 0 2-5.5 2.5-8 .5-2 1.5-3.5 1.5-5.5C21 5 19.5 3 17 3c-2 0-3 1-5 1S9 3 7 3z"/>',
    stethoscope: '<path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6 6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/>',
    sparkle: '<path d="M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2z"/><path d="M19 16v5M16.5 18.5h5"/>',
    pliers: '<path d="M8 9c-1.5 0-2.5 1.2-2.5 2.6 0 1.1.6 2 .9 3.1.3 1.4.4 4.3 1.4 4.3.8 0 .8-2.7 1.7-2.7h1c.9 0 .9 2.7 1.7 2.7 1 0 1.1-2.9 1.4-4.3.3-1.1.9-2 .9-3.1C14.5 10.2 13.5 9 12 9c-1 0-1.5.5-2 .5S9 9 8 9z" transform="translate(1 0)"/><path d="M11 6V2M8.5 4 11 1.5 13.5 4"/>',
    braces: '<path d="M2 12h20"/><rect x="4" y="8.5" width="4.5" height="7" rx="1.2"/><rect x="15.5" y="8.5" width="4.5" height="7" rx="1.2"/><rect x="9.8" y="9.5" width="4.4" height="5" rx="1"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h16.9a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    print: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    note: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    trend: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
    coins: '<circle cx="8" cy="8" r="6"/><path d="M18.1 10.4A6 6 0 1 1 10.3 18M7 6h1v4M16.7 13.9l.7.7-2.8 2.8"/>'
  };
  function icon(name, cls) {
    return '<svg class="ico ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || '') + '</svg>';
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  // AICore-style hexagon mark (gradient purple → pink → cyan) with a calendar check
  var LOGO = '<svg class="logo" viewBox="0 0 64 64" aria-hidden="true"><defs>' +
    '<linearGradient id="mwS" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#a855f7"/><stop offset=".5" stop-color="#ec4899"/><stop offset="1" stop-color="#22d3ee"/></linearGradient>' +
    '<radialGradient id="mwC" cx="50%" cy="42%" r="62%"><stop offset="0" stop-color="#2b1850"/><stop offset="1" stop-color="#0c0a18"/></radialGradient></defs>' +
    '<polygon points="32,3.5 57,18 57,46 32,60.5 7,46 7,18" fill="url(#mwC)" stroke="url(#mwS)" stroke-width="3" stroke-linejoin="round"/>' +
    '<rect x="19" y="22" width="26" height="22" rx="4.5" fill="none" stroke="#ede4ff" stroke-width="2.6"/><path d="M19 29.5h26" stroke="#ede4ff" stroke-width="2.6"/>' +
    '<path d="M25 18v7M39 18v7" stroke="#ede4ff" stroke-width="2.6" stroke-linecap="round"/>' +
    '<path d="m26.2 36.4 3.8 3.6 7.6-7.4" fill="none" stroke="#22d3ee" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<circle cx="32" cy="3.5" r="2.8" fill="#22d3ee"/></svg>';

  function demoBanner() {
    var el = document.createElement('div');
    el.className = 'demo-banner';
    el.setAttribute('role', 'note');
    var live = !!(global.API && API.enabled && I18N.dict.ar.banner_live);
    var k = live ? 'banner_live' : 'demoBanner';
    if (live) el.className += ' live';
    el.innerHTML = '<span class="dot"></span><span>' + t(k) + '</span><span class="sep">·</span><span class="alt">' +
      I18N.t(k, null, I18N.lang === 'ar' ? 'fr' : 'ar') + '</span>';
    document.body.insertBefore(el, document.body.firstChild);
  }
  function refreshBanner() {
    var el = document.querySelector('.demo-banner');
    if (el) { el.remove(); }
    demoBanner();
  }

  var toastTimer;
  function toast(msg, type) {
    var el = document.getElementById('toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.className = 'toast show ' + (type || '');
    el.innerHTML = icon(type === 'err' ? 'alert' : 'check') + '<span>' + esc(msg) + '</span>';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.className = 'toast ' + (type || ''); }, 2600);
  }

  /** modal({title, sub, body, actions:[{label, cls, icon, href, onClick(close) }], wide}) */
  function modal(o) {
    var wrap = document.createElement('div');
    wrap.className = 'modal-wrap';
    wrap.innerHTML = '<div class="modal ' + (o.cls || '') + '" role="dialog" aria-modal="true">' +
      '<div class="modal-head"><div><h3>' + esc(o.title) + '</h3>' + (o.sub ? '<p class="muted small">' + esc(o.sub) + '</p>' : '') + '</div>' +
      '<button class="icon-btn modal-x" aria-label="close">' + icon('x') + '</button></div>' +
      '<div class="modal-body"></div><div class="modal-actions"></div></div>';
    var body = wrap.querySelector('.modal-body');
    if (typeof o.body === 'string') body.innerHTML = o.body; else if (o.body) body.appendChild(o.body);
    function close() { wrap.classList.remove('show'); setTimeout(function () { wrap.remove(); }, 180); if (o.onClose) o.onClose(); }
    var acts = wrap.querySelector('.modal-actions');
    (o.actions || []).forEach(function (a) {
      var b = document.createElement(a.href ? 'a' : 'button');
      b.className = 'btn ' + (a.cls || 'btn-ghost');
      if (a.href) { b.href = a.href; b.target = '_blank'; b.rel = 'noopener'; }
      if (a.id) b.id = a.id;
      b.innerHTML = (a.icon ? icon(a.icon) : '') + '<span>' + esc(a.label) + '</span>';
      b.addEventListener('click', function (ev) { if (a.onClick) a.onClick(close, ev, b); else if (!a.href) close(); });
      acts.appendChild(b);
    });
    if (!o.actions || !o.actions.length) acts.remove();
    wrap.querySelector('.modal-x').addEventListener('click', close);
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
    document.body.appendChild(wrap);
    requestAnimationFrame(function () { wrap.classList.add('show'); });
    if (o.onOpen) o.onOpen(wrap, close);
    return { el: wrap, close: close };
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function () { return fallback(); });
    }
    return Promise.resolve(fallback());
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      ta.remove();
    }
  }

  /** WhatsApp-style preview bubble */
  function waBubble(text, meta) {
    return '<div class="wa-screen"><div class="wa-top">' + icon('wa') + '<div><b>' + esc(meta && meta.to || '') + '</b><small>' + esc(meta && meta.phone || '') + '</small></div></div>' +
      '<div class="wa-chat"><div class="wa-bubble" dir="auto">' + esc(text).replace(/\n/g, '<br>') +
      '<span class="wa-time">' + (meta && meta.time || '') + ' ✓✓</span></div></div></div>';
  }

  global.UI = { icon: icon, esc: esc, LOGO: LOGO, demoBanner: demoBanner, refreshBanner: refreshBanner, toast: toast, modal: modal, copyText: copyText, waBubble: waBubble };
})(window);
