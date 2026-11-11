/*
 * Tema ve hareket: tema değiştirme, menü göstergesi, telefon menüsü,
 * temaya özel sayfa geçişleri ve kutlama animasyonu.
 *
 * Bauhaus teması GSAP animasyon kitaplığını kullanır (ihtiyaç anında cdnjs,
 * olmazsa jsDelivr'den yüklenir). Kitaplık yüklenemezse tarayıcının kendi
 * Web Animations arayüzüyle daha sade sürüm çalışır. "Hareketi azalt"
 * tercihi açıksa geçişler animasyonsuz yapılır.
 */
(function (root) {
  'use strict';

  var SKINS = [
    { id: 'bauhaus', name: 'Bauhaus Satranç', note: 'Geometrik taşlar, üç renkli perde geçişi, biçim değiştiren menü', sw: ['#f3f2ee', '#d9241a', '#f6c018', '#1d4fa3', '#111111'] },
    { id: 'kitap', name: 'Satranç Kitabı', note: 'Siyah-beyaz, kobalt vurgu, dama dalgası geçişi', sw: ['#ffffff', '#111318', '#2f5bff', '#98a2b3'] },
    { id: 'gece', name: 'Gece Turnuvası', note: 'Koyu cam paneller, parlayan menü, odak geçişi', sw: ['#071518', '#3ee0b5', '#ffb547', '#3c7a70'] },
    { id: 'mermer', name: 'Mermer ve Pirinç', note: 'Mermer, zümrüt, pirinç çizgi, kademeli yükseliş', sw: ['#eceeec', '#0f3d33', '#b0812f', '#7c8e86'] },
    { id: 'saat', name: 'Satranç Saati', note: 'Basılan tuşlar, LCD göstergeler, kaydırma geçişi', sw: ['#1c1f25', '#e2442f', '#8fd12b', '#e2e5e9'] },
    { id: 'kulup', name: 'Kulüp Salonu', note: 'İlk tema: yeşil çuha, ceviz tahta, geçiş yok', sw: ['#1d4a36', '#e8ece5', '#9a6a1c', '#ae7f55'] }
  ];
  var DEFAULT = 'bauhaus';
  var STAGGER = { kitap: true, mermer: true };
  // Bauhaus menü göstergesi: sekme sırasına göre renk ve biçim
  var BH_IND = [
    { c: '--red', ink: '#fff', r: '999px' },
    { c: '--yellow', ink: '#111', r: '0px' },
    { c: '--blue', ink: '#fff', r: '999px 0px 999px 0px' },
    { c: '--stroke', ink: 'var(--bg)', r: '0px 999px 0px 999px' },
    { c: '--red', ink: '#fff', r: '999px' }
  ];
  // Hangi sayfaya giderken perdede hangi taş belirsin
  var ROUTE_PIECE = { ana: 'P', yol: 'N', ozel: 'K', gelisim: 'Q', oyna: 'R', sozluk: 'B' };

  function reduced() {
    try { return root.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }
  function skin() { return document.documentElement.getAttribute('data-skin') || DEFAULT; }
  function valid(id) { return SKINS.some(function (s) { return s.id === id; }); }
  function G() { return !reduced() && root.gsap ? root.gsap : null; }
  function cssVar(name) {
    try { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); } catch (e) { return ''; }
  }

  // ---- GSAP yükleyici ----
  var GSAP_URLS = [
    'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js',
    'https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js'
  ];
  var gsapLoading = null;
  function loadGsap() {
    if (root.gsap) return Promise.resolve(root.gsap);
    if (gsapLoading) return gsapLoading;
    gsapLoading = new Promise(function (resolve) {
      (function tryAt(i) {
        if (i >= GSAP_URLS.length) { resolve(null); return; }
        var s = document.createElement('script');
        s.src = GSAP_URLS[i]; s.async = true;
        s.onload = function () { if (root.gsap) resolve(root.gsap); else tryAt(i + 1); };
        s.onerror = function () { s.remove(); tryAt(i + 1); };
        document.head.appendChild(s);
      })(0);
    });
    return gsapLoading;
  }

  function setSkin(id) {
    if (!valid(id)) id = DEFAULT;
    document.documentElement.setAttribute('data-skin', id);
    var nav = document.querySelector('.nav');
    if (nav) { nav.style.removeProperty('--ind-ink'); }
    var ind = document.querySelector('.nav-ind');
    if (ind) { ind.style.backgroundColor = ''; ind.style.borderRadius = ''; }
    placeIndicator(false);
  }

  // ---- Menü göstergesi ----
  var lastLink = null;
  function activeLink() { return document.querySelector('.nav a[aria-current="page"]'); }
  function navIndex(a) { return Array.prototype.indexOf.call(document.querySelectorAll('.nav a'), a); }
  function placeIndicator(animate) {
    var ind = document.querySelector('.nav-ind');
    if (!ind) return;
    var a = activeLink();
    if (!a || a.offsetParent === null) { ind.classList.remove('on'); lastLink = null; return; }
    var left = a.offsetLeft, width = a.offsetWidth;
    var wasOn = ind.classList.contains('on');
    var g = G();
    if (skin() === 'bauhaus') {
      var spec = BH_IND[Math.max(0, navIndex(a)) % BH_IND.length];
      var col = cssVar(spec.c) || '#d9241a';
      a.parentNode.style.setProperty('--ind-ink', spec.ink);
      if (g && animate && wasOn) {
        g.to(ind, { left: left, width: width, backgroundColor: col, borderRadius: spec.r, duration: 0.8, ease: 'elastic.out(1, 0.55)', overwrite: true });
        g.fromTo(ind, { scaleY: 0.6 }, { scaleY: 1, duration: 0.6, ease: 'elastic.out(1.2, 0.4)' });
      } else {
        if (g) g.killTweensOf(ind);
        ind.style.left = left + 'px'; ind.style.width = width + 'px';
        ind.style.backgroundColor = col; ind.style.borderRadius = spec.r;
      }
      ind.classList.add('on');
      lastLink = a;
      return;
    }
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

  // Menü bağlantılarının harflerini ayır: Bauhaus'ta üzerine gelince harfler zıplar.
  function splitNav() {
    Array.prototype.forEach.call(document.querySelectorAll('.nav a'), function (a) {
      if (a.dataset.split) return;
      var t = a.textContent;
      a.dataset.split = '1';
      a.setAttribute('aria-label', t);
      a.textContent = '';
      t.split('').forEach(function (ch) {
        var s = document.createElement('span');
        s.className = 'ch'; s.setAttribute('aria-hidden', 'true');
        s.textContent = ch === ' ' ? ' ' : ch;
        a.appendChild(s);
      });
      a.addEventListener('mouseenter', function () {
        var g = G(); if (!g || skin() !== 'bauhaus') return;
        g.fromTo(a.querySelectorAll('.ch'), { y: 0 }, { y: -5, duration: 0.16, stagger: 0.022, ease: 'power2.out', yoyo: true, repeat: 1, overwrite: true });
      });
    });
  }

  // ---- Telefon menüsü ----
  function initMenu() {
    var btn = document.getElementById('menu-btn'), drawer = document.getElementById('drawer'), nav = document.querySelector('.nav');
    if (!btn || !drawer || !nav) return;
    drawer.innerHTML = '';
    Array.prototype.forEach.call(nav.querySelectorAll('a'), function (a) {
      var c = document.createElement('a');
      c.href = a.getAttribute('href');
      c.textContent = a.getAttribute('aria-label') || a.textContent;
      drawer.appendChild(c);
    });
    splitNav();
    function set(open) {
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
      var g = G();
      if (open) {
        syncDrawer();
        drawer.hidden = false;
        if (g && skin() === 'bauhaus') {
          g.fromTo(drawer, { clipPath: 'circle(0% at 100% 0%)' }, { clipPath: 'circle(150% at 100% 0%)', duration: 0.55, ease: 'power3.out' });
          g.fromTo(drawer.children, { x: -40, opacity: 0, rotate: -3 }, { x: 0, opacity: 1, rotate: 0, duration: 0.5, stagger: 0.06, ease: 'back.out(1.8)', delay: 0.08 });
          return;
        }
        anim(drawer, [{ opacity: 0, transform: 'translateY(-10px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.2, .8, .2, 1)' });
        Array.prototype.forEach.call(drawer.children, function (el, i) {
          anim(el, [{ opacity: 0, transform: 'translateX(-14px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: 60 + i * 45, easing: 'cubic-bezier(.2, .8, .2, 1)', fill: 'backwards' });
        });
      } else if (!drawer.hidden) {
        var hide = function () { if (btn.getAttribute('aria-expanded') === 'false') { drawer.hidden = true; drawer.style.clipPath = ''; } };
        if (g && skin() === 'bauhaus') { g.to(drawer, { clipPath: 'circle(0% at 100% 0%)', duration: 0.3, ease: 'power2.in', onComplete: hide }); return; }
        anim(drawer, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-8px)' }], { duration: 160, easing: 'ease-in' }).then(hide);
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

  // ---- Yardımcılar ----
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

  // Bauhaus: yeni ekranın parçaları sırayla, hafif dönerek yerine oturur; sayılar sayar.
  var live = [];
  function killLive() { var g = root.gsap; if (g) live.forEach(function (t) { t.kill(); }); live = []; }
  function bauhausEnter(el) {
    var g = G(); if (!g || !el) return;
    var kids = Array.prototype.slice.call(el.children, 0, 10);
    g.fromTo(kids, { y: 46, opacity: 0, rotate: function (i) { return i % 2 ? 1.6 : -1.6; } },
      { y: 0, opacity: 1, rotate: 0, duration: 0.7, stagger: 0.07, ease: 'power3.out', clearProps: 'transform,opacity' });
    // Sayaçlar
    Array.prototype.forEach.call(el.querySelectorAll('.kpi-value, .level-line b'), function (n) {
      var m = n.textContent.match(/^(\D*)(\d+)(.*)$/);
      if (!m) return;
      var target = +m[2], o = { v: 0 };
      g.to(o, { v: target, duration: 1.1, delay: 0.25, ease: 'power2.out', onUpdate: function () { n.textContent = m[1] + Math.round(o.v) + m[3]; } });
    });
    // İlerleme çubukları
    Array.prototype.forEach.call(el.querySelectorAll('.bar span'), function (b, i) {
      g.from(b, { width: 0, duration: 1, delay: 0.3 + Math.min(i, 8) * 0.04, ease: 'power3.out' });
    });
    // Tahtadaki taşlar zıplayarak iner
    var pcs = el.querySelectorAll('.hero-board .pc:not(:empty)');
    if (pcs.length) g.from(pcs, { y: -36, opacity: 0, duration: 0.6, stagger: 0.04, ease: 'bounce.out', delay: 0.2, clearProps: 'transform,opacity' });
    // Dekor şekilleri
    var deco = el.querySelectorAll('.bh-deco i');
    if (deco.length) {
      g.from(deco, { scale: 0, rotate: -120, duration: 0.9, stagger: 0.08, ease: 'elastic.out(1, 0.5)', delay: 0.15 });
      Array.prototype.forEach.call(deco, function (d, i) {
        live.push(g.to(d, { y: i % 2 ? 12 : -12, rotate: i % 2 ? 6 : -6, duration: 3 + i * 0.6, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1 }));
      });
    }
  }

  // Bauhaus: kartlar imleci izleyerek hafifçe eğilir
  function initTilt() {
    var cur = null;
    document.addEventListener('pointermove', function (ev) {
      var g = G();
      if (!g || skin() !== 'bauhaus' || ev.pointerType !== 'mouse') return;
      var t = ev.target.closest && ev.target.closest('.card-link, .ex-tile:not(:disabled), .lesson-item, .atab');
      if (cur && cur !== t) { g.to(cur, { rotationX: 0, rotationY: 0, duration: 0.5, ease: 'elastic.out(1, 0.6)' }); cur = null; }
      if (!t) return;
      cur = t;
      var r = t.getBoundingClientRect();
      var px = (ev.clientX - r.left) / r.width - 0.5, py = (ev.clientY - r.top) / r.height - 0.5;
      g.to(t, { rotationY: px * 10, rotationX: -py * 10, transformPerspective: 700, duration: 0.35, ease: 'power2.out', overwrite: 'auto' });
    }, { passive: true });
  }

  // Bauhaus perdesi
  function curtain() {
    var c = document.getElementById('bh-curtain');
    if (c) return c;
    c = document.createElement('div');
    c.id = 'bh-curtain'; c.className = 'bh-curtain'; c.setAttribute('aria-hidden', 'true');
    c.innerHTML = '<i class="p1"></i><i class="p2"></i><i class="p3"></i><i class="p4"></i><div class="mark"></div>';
    document.body.appendChild(c);
    return c;
  }

  var TRANS = {
    bauhaus: function (swap, dir, getEl, info) {
      var g = G();
      if (!g) return TRANS.mermer(swap, dir, getEl);
      killLive();
      if (info && info.kind === 'sub') {
        // Alt ekranlar (ders, alıştırma) için kısa geçiş: kayar, sonra parçalar yerine oturur
        var m = main();
        return new Promise(function (resolve) {
          g.to(m, { x: -dir * 60, opacity: 0, duration: 0.2, ease: 'power2.in', onComplete: function () {
            swap();
            g.set(m, { x: 0, opacity: 1 });
            bauhausEnter(getEl());
            resolve();
          } });
        });
      }
      var c = curtain(), panels = c.querySelectorAll('i'), mark = c.querySelector('.mark');
      var piece = ROUTE_PIECE[info && info.route] || 'N';
      mark.innerHTML = root.bauhausSVG ? root.bauhausSVG(piece) : '';
      return new Promise(function (resolve) {
        g.set(panels, { xPercent: -130, skewX: -14 });
        var tl = g.timeline({ onComplete: function () { c.style.visibility = 'hidden'; resolve(); } });
        tl.set(c, { visibility: 'visible' })
          .to(panels, { xPercent: 0, duration: 0.36, ease: 'power4.inOut', stagger: 0.05 })
          .fromTo(mark, { scale: 0, rotate: -120, opacity: 1 }, { scale: 1, rotate: 0, duration: 0.3, ease: 'back.out(2.2)' }, '-=0.12')
          .add(function () { swap(); })
          .to(mark, { scale: 0, rotate: 120, duration: 0.18, ease: 'back.in(2)' }, '+=0.06')
          .to(panels, { xPercent: 130, duration: 0.38, ease: 'power4.inOut', stagger: { each: 0.05, from: 'end' } }, '-=0.06')
          .add(function () { bauhausEnter(getEl()); }, '-=0.32');
      });
    },
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
  // info: { kind: 'main' | 'sub', route }
  function run(swap, dir, getEl, info) {
    if (busy) { pending = { swap: swap, getEl: getEl }; return; }
    if (first || reduced() || document.visibilityState === 'hidden') {
      first = false;
      swap();
      if (skin() === 'bauhaus') { killLive(); bauhausEnter(getEl()); }
      return;
    }
    busy = true;
    var t = TRANS[skin()] || TRANS.kulup;
    var finish = function () {
      busy = false;
      var m = main(); if (m) { m.style.opacity = ''; m.style.transform = ''; m.style.filter = ''; }
      if (pending) { var p = pending; pending = null; killLive(); p.swap(); if (skin() === 'bauhaus') bauhausEnter(p.getEl()); }
    };
    t(swap, dir || 1, getEl, info || {}).then(finish, finish);
  }

  // ---- Kutlama: geometrik konfeti ----
  function celebrate(from, big) {
    if (reduced()) return;
    var r = from && from.getBoundingClientRect ? from.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
    var ox = r.left + r.width / 2, oy = r.top + Math.min(r.height / 2, 80);
    var layer = document.createElement('div');
    layer.className = 'confetti'; layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
    var colors = ['#d9241a', '#f6c018', '#1d4fa3', '#111111'];
    var n = big ? 70 : 42, items = [];
    for (var i = 0; i < n; i++) {
      var el = document.createElement('i');
      var kind = i % 4;
      if (kind === 0) { el.className = 'c'; el.style.background = colors[0]; }
      else if (kind === 1) { el.style.background = colors[1]; }
      else if (kind === 2) { el.className = 't'; }
      else { el.style.background = colors[3]; el.style.width = '22px'; el.style.height = '6px'; }
      el.style.left = ox + 'px'; el.style.top = oy + 'px';
      layer.appendChild(el);
      items.push(el);
    }
    var g = root.gsap;
    var done = function () { layer.remove(); };
    if (g) {
      items.forEach(function (el, i) {
        var ang = Math.random() * Math.PI * 2, dist = 120 + Math.random() * (big ? 360 : 240);
        var dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist * 0.6 - (140 + Math.random() * 120);
        g.timeline({ onComplete: i === items.length - 1 ? done : null })
          .fromTo(el, { x: 0, y: 0, scale: 0, rotate: 0 }, { x: dx, y: dy, scale: 1, rotate: (Math.random() - 0.5) * 540, duration: 0.6 + Math.random() * 0.3, ease: 'power3.out' })
          .to(el, { y: dy + 420 + Math.random() * 200, rotate: '+=' + (Math.random() * 360), opacity: 0, duration: 1.1 + Math.random() * 0.6, ease: 'power1.in' });
      });
    } else {
      var last = null;
      items.forEach(function (el) {
        var ang = Math.random() * Math.PI * 2, dist = 120 + Math.random() * 240;
        var dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist * 0.6 - 160;
        last = anim(el, [
          { transform: 'translate(0,0) scale(0)', opacity: 1 },
          { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(1) rotate(200deg)', opacity: 1, offset: 0.35 },
          { transform: 'translate(' + dx + 'px,' + (dy + 480) + 'px) scale(1) rotate(420deg)', opacity: 0 }
        ], { duration: 1600 + Math.random() * 500, easing: 'cubic-bezier(.2,.6,.4,1)' });
      });
      (last || Promise.resolve()).then(done);
    }
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
    initTilt: initTilt,
    loadGsap: loadGsap,
    celebrate: celebrate,
    closeMenu: function () {}
  };
  root.Motion = Motion;
})(typeof window !== 'undefined' ? window : globalThis);
