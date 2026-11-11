/*
 * Tema ve hareket: tema değiştirme, menü göstergesi, telefon menüsü ve
 * temaya özel sayfa geçişleri. "Hareketi azalt" tercihi açıksa geçişler
 * animasyonsuz yapılır.
 */
(function (root) {
  'use strict';

  var SKINS = [
    { id: 'kitap', name: 'Satranç Kitabı', note: 'Siyah-beyaz, kobalt vurgu, dama dalgası geçişi', sw: ['#ffffff', '#111318', '#2f5bff', '#98a2b3'] },
    { id: 'gece', name: 'Gece Turnuvası', note: 'Koyu cam paneller, parlayan menü, odak geçişi', sw: ['#071518', '#3ee0b5', '#ffb547', '#3c7a70'] },
    { id: 'mermer', name: 'Mermer ve Pirinç', note: 'Mermer, zümrüt, pirinç çizgi, kademeli yükseliş', sw: ['#eceeec', '#0f3d33', '#b0812f', '#7c8e86'] },
    { id: 'saat', name: 'Satranç Saati', note: 'Basılan tuşlar, LCD göstergeler, kaydırma geçişi', sw: ['#1c1f25', '#e2442f', '#8fd12b', '#e2e5e9'] },
    { id: 'kulup', name: 'Kulüp Salonu', note: 'İlk tema: yeşil çuha, ceviz tahta, geçiş yok', sw: ['#1d4a36', '#e8ece5', '#9a6a1c', '#ae7f55'] }
  ];
  var DEFAULT = 'kitap';
  var STAGGER = { kitap: true, mermer: true };

  function reduced() {
    try { return root.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }
  function skin() { return document.documentElement.getAttribute('data-skin') || DEFAULT; }
  function valid(id) { return SKINS.some(function (s) { return s.id === id; }); }
  function setSkin(id) {
    if (!valid(id)) id = DEFAULT;
    document.documentElement.setAttribute('data-skin', id);
    placeIndicator(false);
  }

  // ---- Menü göstergesi ----
  var lastLink = null;
  function activeLink() { return document.querySelector('.nav a[aria-current="page"]'); }
  function placeIndicator(animate) {
    var ind = document.querySelector('.nav-ind');
    if (!ind) return;
    var a = activeLink();
    if (!a || a.offsetParent === null) { ind.classList.remove('on'); lastLink = null; return; }
    var left = a.offsetLeft, width = a.offsetWidth;
    var wasOn = ind.classList.contains('on');
    if (!animate || !wasOn || reduced()) {
      ind.style.transition = 'none';
      ind.style.left = left + 'px'; ind.style.width = width + 'px';
      void ind.offsetWidth;
      ind.style.transition = '';
    } else if (skin() === 'mermer' && lastLink && lastLink !== a && ind.animate) {
      // Pirinç çizgi: önce iki sekmeyi kapsayacak kadar uzar, sonra yeni sekmeye toplanır.
      var l0 = lastLink.offsetLeft, w0 = lastLink.offsetWidth;
      var minL = Math.min(l0, left), maxR = Math.max(l0 + w0, left + width);
      ind.animate([
        { left: l0 + 'px', width: w0 + 'px' },
        { left: minL + 'px', width: (maxR - minL) + 'px', offset: 0.45 },
        { left: left + 'px', width: width + 'px' }
      ], { duration: 520, easing: 'cubic-bezier(.65, 0, .35, 1)' });
      ind.style.left = left + 'px'; ind.style.width = width + 'px';
    } else {
      ind.style.left = left + 'px'; ind.style.width = width + 'px';
    }
    ind.classList.add('on');
    lastLink = a;
  }

  // ---- Telefon menüsü ----
  function initMenu() {
    var btn = document.getElementById('menu-btn'), drawer = document.getElementById('drawer'), nav = document.querySelector('.nav');
    if (!btn || !drawer || !nav) return;
    drawer.innerHTML = '';
    Array.prototype.forEach.call(nav.querySelectorAll('a'), function (a) {
      var c = a.cloneNode(true);
      drawer.appendChild(c);
    });
    function set(open) {
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
      if (open) {
        syncDrawer();
        drawer.hidden = false;
        anim(drawer, [{ opacity: 0, transform: 'translateY(-10px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.2, .8, .2, 1)' });
        Array.prototype.forEach.call(drawer.children, function (el, i) {
          anim(el, [{ opacity: 0, transform: 'translateX(-14px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: 60 + i * 45, easing: 'cubic-bezier(.2, .8, .2, 1)', fill: 'backwards' });
        });
      } else if (!drawer.hidden) {
        anim(drawer, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-8px)' }], { duration: 160, easing: 'ease-in' }).then(function () {
          if (btn.getAttribute('aria-expanded') === 'false') drawer.hidden = true;
        });
      }
    }
    btn.addEventListener('click', function () { set(btn.getAttribute('aria-expanded') !== 'true'); });
    drawer.addEventListener('click', function (ev) { if (ev.target.closest('a')) set(false); });
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { set(false); btn.focus(); } });
    document.addEventListener('click', function (ev) {
      if (btn.getAttribute('aria-expanded') === 'true' && !drawer.contains(ev.target) && !btn.contains(ev.target)) set(false);
    });
    Motion.closeMenu = function () { set(false); };
  }
  function syncDrawer() {
    var drawer = document.getElementById('drawer'); if (!drawer) return;
    var cur = activeLink();
    Array.prototype.forEach.call(drawer.querySelectorAll('a'), function (a) {
      if (cur && a.getAttribute('href') === cur.getAttribute('href')) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  // ---- Geçişler ----
  function anim(el, kf, opt) {
    if (!el || !el.animate || reduced()) return Promise.resolve();
    try { return el.animate(kf, opt).finished.catch(function () {}); } catch (e) { return Promise.resolve(); }
  }
  function stagger(el) {
    if (!el || reduced() || !STAGGER[skin()]) return;
    Array.prototype.forEach.call(el.children, function (c, i) { c.style.setProperty('--i', Math.min(i, 8)); });
    el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter');
    setTimeout(function () { el.classList.remove('enter'); }, 1200);
  }
  function main() { return document.getElementById('main'); }

  var TRANS = {
    kitap: function (swap, dir, getEl) {
      var wipe = document.getElementById('wipe');
      var bar = document.querySelector('.topbar');
      if (!wipe || !wipe.animate) { swap(); stagger(getEl()); return Promise.resolve(); }
      wipe.style.top = (bar ? Math.max(0, bar.getBoundingClientRect().bottom) : 0) + 'px';
      wipe.innerHTML = '';
      var cells = [];
      for (var r = 0; r < 8; r++) for (var f = 0; f < 8; f++) {
        var i = document.createElement('i');
        i.className = (r + f) % 2 ? 'b' : 'a';
        wipe.appendChild(i);
        cells.push({ el: i, d: (r + f) * 15 });
      }
      wipe.hidden = false;
      return Promise.all(cells.map(function (c) {
        return anim(c.el, [{ transform: 'scale(0)', borderRadius: '50%' }, { transform: 'scale(1.04)', borderRadius: '0%' }], { duration: 160, delay: c.d, easing: 'cubic-bezier(.2, .7, .2, 1)', fill: 'forwards' });
      })).then(function () {
        swap(); stagger(getEl());
        return Promise.all(cells.map(function (c) {
          return anim(c.el, [{ transform: 'scale(1.04)', borderRadius: '0%' }, { transform: 'scale(0)', borderRadius: '50%' }], { duration: 160, delay: c.d, easing: 'cubic-bezier(.6, 0, .8, .3)', fill: 'forwards' });
        }));
      }).then(function () { wipe.hidden = true; wipe.innerHTML = ''; });
    },
    gece: function (swap) {
      var m = main();
      return anim(m, [{ opacity: 1, filter: 'blur(0px)', transform: 'scale(1)' }, { opacity: 0, filter: 'blur(8px)', transform: 'scale(.985)' }], { duration: 170, easing: 'ease-in' })
        .then(function () {
          swap();
          return anim(m, [{ opacity: 0, filter: 'blur(10px)', transform: 'scale(1.015)' }, { opacity: 1, filter: 'blur(0px)', transform: 'scale(1)' }], { duration: 340, easing: 'cubic-bezier(.2, .8, .2, 1)' });
        });
    },
    mermer: function (swap, dir, getEl) {
      return anim(main(), [{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: 'ease-in' }).then(function () { swap(); stagger(getEl()); });
    },
    saat: function (swap, dir) {
      var m = main();
      return anim(m, [{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: 'translateX(' + (-dir * 48) + 'px)' }], { duration: 180, easing: 'cubic-bezier(.5, 0, .9, .4)' })
        .then(function () {
          swap();
          return anim(m, [{ opacity: 0, transform: 'translateX(' + (dir * 48) + 'px)' }, { opacity: 1, transform: 'translateX(0)' }], { duration: 320, easing: 'cubic-bezier(.2, .9, .3, 1.12)' });
        });
    },
    kulup: function (swap) { swap(); return Promise.resolve(); }
  };

  var busy = false, pending = null, first = true;
  // swap(): eski ekranı kaldırıp yenisini koyar. getEl(): yeni ekranın kök öğesi.
  function run(swap, dir, getEl) {
    if (busy) { pending = { swap: swap, getEl: getEl }; return; }
    if (first || reduced() || document.visibilityState === 'hidden') { first = false; swap(); return; }
    busy = true;
    var t = TRANS[skin()] || TRANS.kulup;
    var finish = function () {
      busy = false;
      var m = main(); if (m) { m.style.opacity = ''; m.style.transform = ''; m.style.filter = ''; }
      if (pending) { var p = pending; pending = null; p.swap(); }
    };
    t(swap, dir || 1, getEl).then(finish, finish);
  }

  var Motion = {
    SKINS: SKINS,
    DEFAULT: DEFAULT,
    skin: skin,
    setSkin: setSkin,
    valid: valid,
    run: run,
    placeIndicator: placeIndicator,
    syncDrawer: syncDrawer,
    initMenu: initMenu,
    closeMenu: function () {}
  };
  root.Motion = Motion;
})(typeof window !== 'undefined' ? window : globalThis);
