/* Küçük arayüz yardımcıları: öğe oluşturma, bildirim, onay penceresi, simgeler. */
(function (root) {
  'use strict';

  function h(tag, props) {
    var parts = tag.split('.');
    var e = document.createElement(parts[0] || 'div');
    if (parts.length > 1) e.className = parts.slice(1).join(' ');
    var start = 2;
    // İkinci argüman bir öğe, dizi veya metinse özellik değil çocuktur.
    if (props && (props.nodeType || Array.isArray(props) || typeof props !== 'object')) { start = 1; props = {}; }
    props = props || {};
    Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v === undefined || v === null || v === false) return;
      if (k === 'text') e.textContent = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'class') e.className += (e.className ? ' ' : '') + v;
      else if (k === 'on') Object.keys(v).forEach(function (ev) { e.addEventListener(ev, v[ev]); });
      else if (k === 'style') e.setAttribute('style', v);
      else e.setAttribute(k, v === true ? '' : v);
    });
    for (var i = start; i < arguments.length; i++) append(e, arguments[i]);
    return e;
  }
  function append(e, c) {
    if (c === undefined || c === null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { append(e, x); }); return; }
    e.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
  }

  var ICONS = {
    back: '<path d="M15 5l-7 7 7 7" />',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z"/>',
    bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    reset: '<path d="M4 4v6h6"/><path d="M5.5 15a7 7 0 1 0 1.6-7.4L4 10"/>',
    eye: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    play: '<path d="M7 5l12 7-12 7z"/>',
    next: '<path d="M9 5l7 7-7 7"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h7"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>'
  };
  function icon(name, cls) {
    return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || '') + '</svg>';
  }
  function iconEl(name, cls) { var s = h('span.ic-wrap'); s.innerHTML = icon(name, cls); return s.firstChild; }

  function btn(label, opts) {
    opts = opts || {};
    var b = h('button.btn' + (opts.kind ? '.' + opts.kind : ''), { type: 'button', on: opts.onClick ? { click: opts.onClick } : null, title: opts.title, 'aria-label': opts.aria, id: opts.id, disabled: opts.disabled });
    if (opts.icon) b.innerHTML = icon(opts.icon);
    b.appendChild(h('span', { text: label }));
    return b;
  }

  function stars(n, max) {
    max = max || 3;
    var s = h('span.stars', { 'aria-label': n + ' / ' + max + ' yıldız', role: 'img' });
    for (var i = 0; i < max; i++) s.insertAdjacentHTML('beforeend', icon('star', i < n ? 'on' : 'off'));
    return s;
  }

  function toast(msg, kind) {
    var host = document.getElementById('toasts'); if (!host) return;
    var t = h('div.toast' + (kind ? '.' + kind : ''), { text: msg, role: 'status' });
    host.appendChild(t);
    setTimeout(function () { t.classList.add('out'); }, 3200);
    setTimeout(function () { t.remove(); }, 3700);
  }

  // Tarayıcının confirm() penceresi bazı görüntüleyicilerde çalışmadığı için sayfa içi onay.
  function confirmBox(o) {
    return new Promise(function (resolve) {
      var host = document.getElementById('modal-root');
      var prev = document.activeElement;
      function close(v) { wrap.remove(); if (prev && prev.focus) prev.focus(); resolve(v); }
      var okB = btn(o.ok || 'Tamam', { kind: o.danger ? 'danger' : 'primary', onClick: function () { close(true); } });
      var cancelB = btn(o.cancel || 'Vazgeç', { kind: 'ghost', onClick: function () { close(false); } });
      var wrap = h('div.modal', { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'modal-title' },
        h('div.modal-card',
          h('h2', { id: 'modal-title', text: o.title }),
          o.text ? h('p', { text: o.text }) : null,
          o.body || null,
          h('div.modal-actions', cancelB, okB)));
      wrap.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') close(false); });
      wrap.addEventListener('click', function (ev) { if (ev.target === wrap) close(false); });
      host.appendChild(wrap);
      okB.focus();
    });
  }

  function fmtTime(sec) {
    sec = Math.round(sec || 0);
    if (sec < 60) return sec + ' sn';
    var m = Math.floor(sec / 60);
    if (m < 60) return m + ' dk';
    return Math.floor(m / 60) + ' sa ' + (m % 60) + ' dk';
  }
  function fmtDate(t) {
    try { return new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) + ' ' + new Date(t).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }); }
    catch (e) { return ''; }
  }
  function bar(pct, cls) {
    var b = h('div.bar' + (cls ? '.' + cls : ''), { role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(pct) });
    b.appendChild(h('span', { style: 'width:' + Math.max(0, Math.min(100, pct)) + '%' }));
    return b;
  }

  root.UI = { h: h, icon: icon, iconEl: iconEl, btn: btn, stars: stars, toast: toast, confirm: confirmBox, fmtTime: fmtTime, fmtDate: fmtDate, bar: bar };
})(typeof window !== 'undefined' ? window : globalThis);
