/*
 * Tema ve hareket: tema değiştirme, menü göstergesi, telefon menüsü,
 * temaya özel sayfa geçişleri ve kutlama animasyonu.
 *
 * Bauhaus ve Kuantum Arena temaları GSAP animasyon kitaplığını kullanır
 * (ihtiyaç anında cdnjs, olmazsa jsDelivr'den yüklenir); yüklenemezse tarayıcının
 * kendi Web Animations arayüzüyle daha sade sürüm çalışır. Sakin temalar ve
 * ortak canlandırmalar (sayaçlar, çubuklar, kaydırınca belirme, sonuç kartı,
 * tema dalgası) yalnızca tarayıcının kendi arayüzlerini kullanır. "Hareketi
 * azalt" tercihi açıksa geçişler animasyonsuz yapılır.
 */
(function (root) {
  'use strict';

  // group: Ayarlar'daki başlık. Sakin temalar göz yormaması için düşük kontrastlı
  // zemin, soluk vurgu ve çok yavaş ortam hareketi kullanır.
  var SKINS = [
    { id: 'sakin', group: 'Sakin fütüristik', name: 'Kuantum Sakin', note: 'Koyu lacivert cam, soluk turkuaz; yavaş yıldızlar, yumuşak derinlik geçişi', sw: ['#0b1020', '#7fd3e0', '#b9a3f0', '#3a4a74'] },
    { id: 'ay', group: 'Sakin fütüristik', name: 'Ay Üssü', note: 'Açık gri cam paneller, süzülen ışık küreleri, beyaz kayan kapsül', sw: ['#e9ecf1', '#3f6fd8', '#c27a2c', '#aab7cb'] },
    { id: 'aurora', group: 'Sakin fütüristik', name: 'Aurora', note: 'Koyu arduvaz, ağır kuzey ışığı, ince çizgi menü', sw: ['#141b26', '#6cc4b8', '#b4a7e6', '#71849a'] },
    { id: 'bulut', group: 'Sakin fütüristik', name: 'Bulut Şehri', note: 'Pastel gökyüzü, süzülen bulutlar, yana kayan geçiş', sw: ['#f1f5f9', '#2f9a91', '#d9705a', '#9cc4c0'] },
    { id: 'kuantum', group: 'Canlı', name: 'Kuantum Arena', note: 'Parlak fütüristik: uzay sahnesi, ışık hızı geçişi, neon taşlar', sw: ['#05070f', '#3df2ff', '#b46bff', '#ff4fd8', '#ffc46b'] },
    { id: 'bauhaus', group: 'Canlı', name: 'Bauhaus Satranç', note: 'Geometrik taşlar, üç renkli perde geçişi, biçim değiştiren menü', sw: ['#f3f2ee', '#d9241a', '#f6c018', '#1d4fa3', '#111111'] },
    { id: 'kitap', group: 'Klasik', name: 'Satranç Kitabı', note: 'Siyah-beyaz, kobalt vurgu, dama dalgası geçişi', sw: ['#ffffff', '#111318', '#2f5bff', '#98a2b3'] },
    { id: 'gece', group: 'Klasik', name: 'Gece Turnuvası', note: 'Koyu cam paneller, parlayan menü, odak geçişi', sw: ['#071518', '#3ee0b5', '#ffb547', '#3c7a70'] },
    { id: 'mermer', group: 'Klasik', name: 'Mermer ve Pirinç', note: 'Mermer, zümrüt, pirinç çizgi, kademeli yükseliş', sw: ['#eceeec', '#0f3d33', '#b0812f', '#7c8e86'] },
    { id: 'saat', group: 'Klasik', name: 'Satranç Saati', note: 'Basılan tuşlar, LCD göstergeler, kaydırma geçişi', sw: ['#1c1f25', '#e2442f', '#8fd12b', '#e2e5e9'] },
    { id: 'kulup', group: 'Klasik', name: 'Kulüp Salonu', note: 'İlk tema: yeşil çuha, ceviz tahta, geçiş yok', sw: ['#1d4a36', '#e8ece5', '#9a6a1c', '#ae7f55'] }
  ];
  var DEFAULT = 'sakin';
  var STAGGER = { kitap: true, mermer: true };
  // Sayaçları ve çubukları kendi GSAP girişinde yürüten temalar
  var OWN_ENTER = { bauhaus: true, kuantum: true };
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
    if (root.Scene) {
      if (id === 'kuantum' || id === 'sakin') { if (root.Scene.setMode) root.Scene.setMode(id === 'sakin' ? 'calm' : 'arena'); root.Scene.start(); }
      else root.Scene.stop();
    }
    ambient();
    var nav = document.querySelector('.nav');
    if (nav) { nav.style.removeProperty('--ind-ink'); }
    var ind = document.querySelector('.nav-ind');
    if (ind) { ind.style.backgroundColor = ''; ind.style.borderRadius = ''; }
    placeIndicator(false);
  }

  // Sakin temaların ortam katmanı (ışık küreleri, kuzey ışığı, bulutlar). Hangisinin
  // görüneceğine CSS karar verir; görünmeyen öğelerin animasyonu çalışmaz.
  function ambient() {
    if (document.getElementById('amb-layer') || !document.body) return;
    var a = document.createElement('div');
    a.id = 'amb-layer'; a.className = 'amb-layer'; a.setAttribute('aria-hidden', 'true');
    a.innerHTML = '<i class="orb o1"></i><i class="orb o2"></i><i class="dots"></i><i class="aur"></i><i class="cloud c1"></i><i class="cloud c2"></i><i class="cloud c3"></i>';
    document.body.insertBefore(a, document.body.firstChild);
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
    if (skin() === 'kuantum' && g && animate && wasOn) {
      g.to(ind, { left: left, width: width, duration: 0.7, ease: 'expo.out', overwrite: true });
      g.fromTo(ind, { scaleX: 1.15, opacity: 0.4 }, { scaleX: 1, opacity: 1, duration: 0.5, ease: 'power3.out' });
      ind.classList.add('on');
      lastLink = a;
      return;
    }
    if (g) g.killTweensOf(ind);
    ind.style.opacity = ''; ind.style.transform = '';
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
        var g = G(); if (!g) return;
        if (skin() === 'kuantum') { scrambleSpans(a.querySelectorAll('.ch')); return; }
        if (skin() !== 'bauhaus') return;
        g.fromTo(a.querySelectorAll('.ch'), { y: 0 }, { y: -5, duration: 0.16, stagger: 0.022, ease: 'power2.out', yoyo: true, repeat: 1, overwrite: true });
      });
    });
  }

  // ---- Şifre çözme efekti ----
  var GLYPHS = '<>/\\|_-=+*#01ΣΔΩ░▒▓';
  function rnd() { return GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length)); }
  function scrambleSpans(spans) {
    Array.prototype.forEach.call(spans, function (sp, i) {
      if (sp.dataset.busy) return;
      var orig = sp.textContent;
      if (orig === '\u00A0') return;
      sp.dataset.busy = '1';
      var n = 0;
      var t = setInterval(function () {
        n++;
        if (n > 3 + i) { clearInterval(t); sp.textContent = orig; delete sp.dataset.busy; return; }
        sp.textContent = rnd();
      }, 38);
    });
  }
  function scrambleText(el, dur) {
    var g = G(); if (!g || !el || el.children.length) return;
    var final = el.textContent;
    if (!final || final.length > 80) return;
    var o = { p: 0 };
    g.to(o, { p: 1, duration: dur || 0.8, ease: 'power1.out', onUpdate: function () {
      var k = Math.floor(o.p * final.length), out = final.slice(0, k);
      for (var i = k; i < final.length; i++) out += final.charAt(i) === ' ' ? ' ' : rnd();
      el.textContent = out;
    }, onComplete: function () { el.textContent = final; } });
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
    // Ana kap hiçbir zaman son karede (ör. görünmez) bırakılmaz.
    if (opt && opt.fill === 'forwards' && el === main()) opt = Object.assign({}, opt, { fill: 'none' });
    try { return el.animate(kf, opt).finished.catch(function () {}); } catch (e) { return Promise.resolve(); }
  }
  function stagger(el) {
    if (!el || reduced() || !STAGGER[skin()]) return;
    Array.prototype.forEach.call(el.children, function (c, i) { c.style.setProperty('--i', Math.min(i, 8)); });
    el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter');
    setTimeout(function () { el.classList.remove('enter'); }, 1200);
  }
  function main() { return document.getElementById('main'); }
  // Taşınan/ölçeklenen öğe: ana kabın içindeki ekran. Ana kap (overflow-x: clip)
  // taşanı kırptığı için geçiş sırasında yatay kaydırma çubuğu açılmaz.
  function screenEl() { var m = main(); return (m && m.firstElementChild) || m; }

  // Ekranın üst düzey parçaları sırayla, hafifçe yükselerek gelir (GSAP gerekmez).
  function rise(el, o) {
    if (!el || reduced()) return;
    o = o || {};
    var kids = Array.prototype.slice.call(el.children, 0, 10);
    kids.forEach(function (c, i) {
      var from = { opacity: 0, transform: 'translateY(' + (o.y || 16) + 'px)' + (o.scale ? ' scale(' + o.scale + ')' : '') };
      if (o.blur) from.filter = 'blur(' + o.blur + 'px)';
      var to = { opacity: 1, transform: 'none' };
      if (o.blur) to.filter = 'blur(0px)';
      anim(c, [from, to], { duration: o.dur || 480, delay: (o.delay || 0) + i * (o.step || 55), easing: 'cubic-bezier(.2, .8, .2, 1)', fill: 'backwards' });
    });
  }

  // Sayılar sıfırdan sayar, ilerleme çubukları dolar (GSAP gerekmez).
  function countUp(el) {
    if (!el || reduced()) return;
    Array.prototype.forEach.call(el.querySelectorAll('.kpi-value, .level-line b'), function (n) {
      var m = n.textContent.match(/^(\D*)(\d+)(.*)$/);
      if (!m || +m[2] < 2) return;
      var target = +m[2], t0 = 0, dur = 900, final = n.textContent;
      (function tick(t) {
        if (!t0) t0 = t;
        var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        n.textContent = m[1] + Math.round(target * e) + m[3];
        if (k < 1 && n.isConnected) requestAnimationFrame(tick); else n.textContent = final;
      })(performance.now());
    });
  }
  function growBars(el) {
    if (!el || reduced()) return;
    Array.prototype.forEach.call(el.querySelectorAll('.bar span'), function (b, i) {
      var w = b.style.width; if (!w || w === '0%') return;
      anim(b, [{ width: '0%' }, { width: w }], { duration: 900, delay: 150 + Math.min(i, 8) * 40, easing: 'cubic-bezier(.2, .8, .2, 1)', fill: 'backwards' });
    });
  }

  // Kaydırınca beliren kartlar: ilk ekranın dışında kalan bloklar görünür alana
  // girince yükselerek belirir. Aynı anda girenler sırayla gelir.
  var REVEAL_SEL = '.panel, .level-block, .kpi, .card-link, .station, .grid-2 > *, .ex-grid > *, .chart-wrap, .gl-item, dl > div';
  var io = null;
  function reveal(el) {
    if (!el || reduced() || skin() === 'kulup' || !('IntersectionObserver' in root)) return;
    if (!io) {
      io = new IntersectionObserver(function (entries) {
        var n = 0;
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var t = en.target;
          io.unobserve(t);
          t.style.transitionDelay = Math.min(n++, 6) * 70 + 'ms';
          t.classList.add('rv-in');
          setTimeout(function () { t.classList.remove('rv', 'rv-in'); t.style.transitionDelay = ''; }, 1400);
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    }
    var H = root.innerHeight, seen = [];
    Array.prototype.forEach.call(el.querySelectorAll(REVEAL_SEL), function (b) {
      // İç içe bloklardan yalnızca en dıştaki canlandırılır
      for (var i = 0; i < seen.length; i++) if (seen[i].contains(b)) return;
      if (b.getBoundingClientRect().top < H) return;
      seen.push(b);
      b.classList.add('rv');
      io.observe(b);
    });
  }

  // Yeni ekran yerleşince her temada çalışan ortak canlandırmalar
  function afterSwap(el) {
    if (!el || skin() === 'kulup') return;
    if (!OWN_ENTER[skin()]) { countUp(el); growBars(el); }
    reveal(el);
  }

  // Tema değiştirme: yeni tema tıklanan noktadan dairesel bir dalgayla yayılır
  // (View Transitions arayüzü olan tarayıcılarda; diğerlerinde hemen uygulanır).
  function themeSwap(fn, x, y) {
    if (reduced() || !document.startViewTransition) { fn(); return; }
    var de = document.documentElement;
    if (x == null) { x = root.innerWidth - 40; y = 30; }
    var r = Math.hypot(Math.max(x, root.innerWidth - x), Math.max(y, root.innerHeight - y));
    de.classList.add('theme-vt');
    var t;
    try { t = document.startViewTransition(fn); } catch (e) { de.classList.remove('theme-vt'); fn(); return; }
    t.ready.then(function () {
      de.animate({ clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + r + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration: 700, easing: 'cubic-bezier(.4, 0, .2, 1)', pseudoElement: '::view-transition-new(root)' });
    }).catch(function () {});
    t.finished.then(function () { de.classList.remove('theme-vt'); }, function () { de.classList.remove('theme-vt'); });
  }

  // Ders kartı değişimi: metin, gidilen yönden kayarak gelir.
  function slideIn(el, dir) {
    anim(el, [{ opacity: 0, transform: 'translateX(' + (dir * 28) + 'px)', filter: 'blur(2px)' }, { opacity: 1, transform: 'none', filter: 'blur(0px)' }],
      { duration: 380, easing: 'cubic-bezier(.2, .8, .2, 1)' });
  }

  // Sonuç kartı: yaylanarak açılır, yıldızlar tek tek yanar, XP rozeti seviye
  // göstergesine uçar.
  function resultIn(el, xp) {
    if (!el || reduced()) return;
    anim(el, [{ opacity: 0, transform: 'translateY(14px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.34, 1.4, .64, 1)' });
    Array.prototype.forEach.call(el.querySelectorAll('.stars .ic'), function (st, i) {
      anim(st, [{ transform: 'scale(0) rotate(-90deg)', opacity: 0 }, { transform: 'scale(1.35) rotate(10deg)', opacity: 1, offset: 0.6 }, { transform: 'none', opacity: 1 }],
        { duration: 520, delay: 220 + i * 150, easing: 'cubic-bezier(.2, .8, .2, 1)', fill: 'backwards' });
    });
    if (xp) flyXp(el, '+' + xp + ' XP');
  }
  function flyXp(from, text) {
    var chip = document.getElementById('level-chip');
    if (!from || !chip || chip.offsetParent === null || !document.body.animate) return;
    var a = from.getBoundingClientRect(), b = chip.getBoundingClientRect();
    var f = document.createElement('div');
    f.className = 'xp-fly'; f.setAttribute('aria-hidden', 'true'); f.textContent = text;
    f.style.left = (a.left + a.width / 2) + 'px'; f.style.top = (a.top + 24) + 'px';
    document.body.appendChild(f);
    var dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + 24);
    var p = f.animate([
      { transform: 'translate(-50%, -50%) scale(.6)', opacity: 0 },
      { transform: 'translate(-50%, -50%) translateY(-28px) scale(1.1)', opacity: 1, offset: 0.25 },
      { transform: 'translate(-50%, -50%) translate(' + dx + 'px,' + dy + 'px) scale(.5)', opacity: 0.2 }
    ], { duration: 1150, delay: 450, easing: 'cubic-bezier(.5, 0, .3, 1)', fill: 'both' });
    p.finished.then(function () {
      f.remove();
      anim(chip, [{ transform: 'scale(1)' }, { transform: 'scale(1.18)', offset: 0.35 }, { transform: 'scale(1)' }], { duration: 480, easing: 'cubic-bezier(.34, 1.5, .64, 1)' });
    }, function () { f.remove(); });
  }

  // Hızlanan ortam: Bulut Şehri'nde bulutlar geçiş sırasında hızlanıp yavaşlar,
  // Aurora'da kuzey ışığı bir an parlar.
  function gust(sel, rate, ms) {
    var els = document.querySelectorAll(sel);
    if (!els.length || reduced()) return;
    var anims = [];
    Array.prototype.forEach.call(els, function (e) { if (e.getAnimations) anims = anims.concat(e.getAnimations()); });
    if (!anims.length) return;
    var t0 = performance.now();
    (function tick(t) {
      var k = Math.min(1, (t - t0) / ms), r = 1 + (rate - 1) * Math.pow(1 - k, 2);
      anims.forEach(function (a) { try { a.playbackRate = r; } catch (e) {} });
      if (k < 1) requestAnimationFrame(tick);
    })(t0);
  }

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

  // Kuantum: parçalar bulanıktan netleşerek gelir, başlıklar şifre çözer gibi belirir
  function kuantumEnter(el) {
    var g = G(); if (!g || !el) return;
    var kids = Array.prototype.slice.call(el.children, 0, 10);
    g.fromTo(kids, { y: 26, opacity: 0, filter: 'blur(8px)' }, { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.7, stagger: 0.08, ease: 'power3.out', clearProps: 'transform,opacity,filter' });
    Array.prototype.forEach.call(el.querySelectorAll('h1, .panel-title, .page-head h2, .station-title'), function (h, i) { if (i < 8) setTimeout(function () { scrambleText(h, 0.7); }, i * 60); });
    Array.prototype.forEach.call(el.querySelectorAll('.kpi-value, .level-line b'), function (n) {
      var m = n.textContent.match(/^(\D*)(\d+)(.*)$/);
      if (!m) return;
      var target = +m[2], o = { v: 0 };
      g.to(o, { v: target, duration: 1.2, delay: 0.2, ease: 'power2.out', onUpdate: function () { n.textContent = m[1] + Math.round(o.v) + m[3]; } });
    });
    Array.prototype.forEach.call(el.querySelectorAll('.bar span'), function (b, i) {
      g.from(b, { width: 0, duration: 1.1, delay: 0.25 + Math.min(i, 8) * 0.04, ease: 'expo.out' });
    });
    var pcs = el.querySelectorAll('.hero-board .pc:not(:empty)');
    if (pcs.length) g.from(pcs, { opacity: 0, scale: 1.8, filter: 'blur(6px)', duration: 0.5, stagger: { each: 0.03, from: 'random' }, ease: 'power2.out', delay: 0.2, clearProps: 'transform,opacity,filter' });
  }

  // Kuantum: imleci izleyen ışık hâlesi
  function initGlow() {
    var glow = document.createElement('div');
    glow.className = 'cursor-glow'; glow.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(glow, document.body.firstChild ? document.body.firstChild.nextSibling : null);
    var qx = null, qy = null;
    document.addEventListener('pointermove', function (ev) {
      if (ev.pointerType !== 'mouse' || skin() !== 'kuantum' || reduced()) return;
      glow.classList.add('on');
      var g = root.gsap;
      if (g && !qx) { qx = g.quickTo(glow, 'x', { duration: 0.6, ease: 'power3' }); qy = g.quickTo(glow, 'y', { duration: 0.6, ease: 'power3' }); }
      if (qx) { qx(ev.clientX); qy(ev.clientY); } else glow.style.transform = 'translate(' + ev.clientX + 'px,' + ev.clientY + 'px)';
    }, { passive: true });
  }

  // Bauhaus: kartlar imleci izleyerek hafifçe eğilir
  function initTilt() {
    var cur = null;
    document.addEventListener('pointermove', function (ev) {
      var sk = skin();
      if (sk === 'kuantum' && ev.target.closest) {
        var sp = ev.target.closest('.panel, .kpi, .card-link, .trainer-panel, .station, .ex-tile, .lesson-item, .atab, .level-block');
        if (sp) { var rr = sp.getBoundingClientRect(); sp.style.setProperty('--mx', (ev.clientX - rr.left) + 'px'); sp.style.setProperty('--my', (ev.clientY - rr.top) + 'px'); }
      }
      var g = G();
      if (!g || (sk !== 'bauhaus' && sk !== 'kuantum') || ev.pointerType !== 'mouse') return;
      var t = ev.target.closest && ev.target.closest('.card-link, .ex-tile:not(:disabled), .lesson-item, .atab');
      if (cur && cur !== t) { g.to(cur, { rotationX: 0, rotationY: 0, duration: 0.5, ease: 'elastic.out(1, 0.6)' }); cur = null; }
      if (!t) return;
      cur = t;
      var r = t.getBoundingClientRect();
      var px = (ev.clientX - r.left) / r.width - 0.5, py = (ev.clientY - r.top) / r.height - 0.5;
      var amp = sk === 'kuantum' ? 7 : 10;
      g.to(t, { rotationY: px * amp, rotationX: -py * amp, transformPerspective: 700, duration: 0.35, ease: 'power2.out', overwrite: 'auto' });
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

  function scanEl() {
    var s = document.getElementById('scanline');
    if (s) return s;
    s = document.createElement('div');
    s.id = 'scanline'; s.className = 'scanline'; s.setAttribute('aria-hidden', 'true');
    document.body.appendChild(s);
    return s;
  }

  var TRANS = {
    kuantum: function (swap, dir, getEl, info) {
      var g = G();
      if (!g) return TRANS.gece(swap, dir, getEl);
      if (root.Scene) root.Scene.warp();
      var m = main(), scan = scanEl();
      var sub = info && info.kind === 'sub';
      return new Promise(function (resolve) {
        var o = { p: 0 }, top = 0, H = 1, mh = 0;
        var tl = g.timeline({ onComplete: resolve });
        tl.set(scan, { visibility: 'visible', y: 0 })
          .to(m, { opacity: 0, y: -14, scale: 0.985, filter: 'blur(8px)', duration: sub ? 0.18 : 0.28, ease: 'power2.in' }, 0)
          .to(scan, { y: root.innerHeight, duration: sub ? 0.25 : 0.4, ease: 'power2.inOut' }, 0)
          .add(function () {
            swap();
            g.set(m, { opacity: 1, y: 0, scale: 1, filter: 'none' });
            top = m.getBoundingClientRect().top; H = Math.max(root.innerHeight - top, 120); mh = m.offsetHeight;
            m.style.clipPath = 'inset(0 0 ' + mh + 'px 0)';
            g.set(scan, { y: Math.max(0, top) });
            kuantumEnter(getEl());
          })
          .to(o, { p: 1, duration: sub ? 0.35 : 0.55, ease: 'power2.out', onUpdate: function () {
            m.style.clipPath = 'inset(0 0 ' + Math.max(0, mh - o.p * H) + 'px 0)';
            g.set(scan, { y: Math.max(0, top) + o.p * H });
          }, onComplete: function () { m.style.clipPath = ''; g.set(scan, { visibility: 'hidden' }); } });
      });
    },
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
    // Kuantum Sakin: hafif derinlik bulanıklığı, yıldızlar kısa süre hızlanır
    sakin: function (swap, dir, getEl, info) {
      var sub = info && info.kind === 'sub';
      if (root.Scene) root.Scene.warp();
      return anim(screenEl(), [{ opacity: 1, transform: 'scale(1)', filter: 'blur(0px)' }, { opacity: 0, transform: 'scale(.97)', filter: 'blur(4px)' }], { duration: sub ? 160 : 220, easing: 'cubic-bezier(.4, 0, 1, 1)', fill: 'forwards' })
        .then(function () {
          swap();
          rise(getEl(), { y: 12, step: 50, dur: 520, delay: 60 });
          return anim(getEl(), [{ opacity: 0, transform: 'scale(1.02)', filter: 'blur(4px)' }, { opacity: 1, transform: 'scale(1)', filter: 'blur(0px)' }], { duration: sub ? 320 : 440, easing: 'cubic-bezier(.2, .8, .2, 1)' });
        });
    },
    // Ay Üssü: eski sayfa geri çekilip bulanıklaşır, yenisi katman katman yükselir
    ay: function (swap, dir, getEl, info) {
      var sub = info && info.kind === 'sub';
      return anim(screenEl(), [{ opacity: 1, transform: 'none', filter: 'blur(0px)' }, { opacity: 0, transform: 'translateY(-8px) scale(.985)', filter: 'blur(6px)' }], { duration: sub ? 150 : 200, easing: 'ease-in', fill: 'forwards' })
        .then(function () {
          swap();
          rise(getEl(), { y: 22, scale: 0.985, blur: 4, step: 70, dur: 560 });
        });
    },
    // Aurora: yumuşak solma, kuzey ışığı bir an parlar, parçalar sırayla gelir
    aurora: function (swap, dir, getEl, info) {
      var m = main(), sub = info && info.kind === 'sub';
      var aur = document.querySelector('.amb-layer .aur');
      if (aur && !sub) anim(aur, [{ opacity: 0.45 }, { opacity: 0.8, offset: 0.4 }, { opacity: 0.45 }], { duration: 1600, easing: 'ease-in-out', composite: 'replace' });
      return anim(m, [{ opacity: 1 }, { opacity: 0 }], { duration: sub ? 140 : 190, easing: 'ease-in' })
        .then(function () {
          swap();
          rise(getEl(), { y: 14, step: 60, dur: 500 });
        });
    },
    // Bulut Şehri: sayfa gidiş yönüne doğru süzülür, bulutlar bir an hızlanır
    bulut: function (swap, dir, getEl, info) {
      var sub = info && info.kind === 'sub';
      if (!sub) gust('.amb-layer .cloud', 14, 1400);
      return anim(screenEl(), [{ opacity: 1, transform: 'none', filter: 'blur(0px)' }, { opacity: 0, transform: 'translateX(' + (-dir * 26) + 'px)', filter: 'blur(3px)' }], { duration: sub ? 170 : 230, easing: 'cubic-bezier(.5, 0, .9, .5)', fill: 'forwards' })
        .then(function () {
          swap();
          rise(getEl(), { y: 8, step: 45, dur: 520, delay: 80 });
          return anim(getEl(), [{ opacity: 0, transform: 'translateX(' + (dir * 26) + 'px)', filter: 'blur(3px)' }, { opacity: 1, transform: 'none', filter: 'blur(0px)' }], { duration: sub ? 320 : 480, easing: 'cubic-bezier(.2, .8, .2, 1)' });
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
    gece: function (swap, dir, getEl) {
      return anim(screenEl(), [{ opacity: 1, filter: 'blur(0px)', transform: 'scale(1)' }, { opacity: 0, filter: 'blur(8px)', transform: 'scale(.985)' }], { duration: 170, easing: 'ease-in', fill: 'forwards' })
        .then(function () {
          swap();
          return anim(getEl ? getEl() : screenEl(), [{ opacity: 0, filter: 'blur(10px)', transform: 'scale(1.015)' }, { opacity: 1, filter: 'blur(0px)', transform: 'scale(1)' }], { duration: 340, easing: 'cubic-bezier(.2, .8, .2, 1)' });
        });
    },
    mermer: function (swap, dir, getEl) {
      return anim(main(), [{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: 'ease-in' }).then(function () { swap(); stagger(getEl()); });
    },
    saat: function (swap, dir, getEl) {
      return anim(screenEl(), [{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: 'translateX(' + (-dir * 48) + 'px)' }], { duration: 180, easing: 'cubic-bezier(.5, 0, .9, .4)', fill: 'forwards' })
        .then(function () {
          swap();
          return anim(getEl(), [{ opacity: 0, transform: 'translateX(' + (dir * 48) + 'px)' }, { opacity: 1, transform: 'translateX(0)' }], { duration: 320, easing: 'cubic-bezier(.2, .9, .3, 1.12)' });
        });
    },
    kulup: function (swap) { swap(); return Promise.resolve(); }
  };

  var busy = false, pending = null, first = true;
  // swap(): eski ekranı kaldırıp yenisini koyar. getEl(): yeni ekranın kök öğesi.
  // info: { kind: 'main' | 'sub', route }
  // Geçiş olmadan (ilk açılış, bekleyen ekran) yeni ekranın giriş canlandırması
  function enterOnly(el) {
    var sk = skin();
    if (sk === 'bauhaus') { killLive(); bauhausEnter(el); }
    else if (sk === 'kuantum') kuantumEnter(el);
    else if (sk === 'sakin' || sk === 'ay' || sk === 'aurora' || sk === 'bulut') rise(el, { y: 14, step: 55, dur: 500 });
    else stagger(el);
  }
  function run(swap, dir, getEl, info) {
    var swap2 = function () { swap(); afterSwap(getEl()); };
    if (busy) { pending = { swap: swap2, getEl: getEl }; return; }
    if (first || reduced() || document.visibilityState === 'hidden') {
      first = false;
      swap2();
      if (!reduced()) enterOnly(getEl());
      return;
    }
    busy = true;
    var t = TRANS[skin()] || TRANS.kulup;
    var finish = function () {
      busy = false;
      var m = main(); if (m) { m.style.opacity = ''; m.style.transform = ''; m.style.filter = ''; }
      if (m) m.style.clipPath = '';
      var sc = document.getElementById('scanline'); if (sc) sc.style.visibility = 'hidden';
      if (pending) { var p = pending; pending = null; killLive(); p.swap(); enterOnly(p.getEl()); }
    };
    t(swap2, dir || 1, getEl, info || {}).then(finish, finish);
  }

  // ---- Kutlama: geometrik konfeti ----
  function celebrate(from, big) {
    if (reduced()) return;
    var r = from && from.getBoundingClientRect ? from.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
    var ox = r.left + r.width / 2, oy = r.top + Math.min(r.height / 2, 80);
    var layer = document.createElement('div');
    layer.className = 'confetti'; layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
    var sk = skin();
    var neon = sk === 'kuantum';
    // Her tema kendi renkleriyle kutlar; sakin temalarda parçalar daha az ve yumuşak.
    var calm = sk === 'sakin' || sk === 'ay' || sk === 'aurora' || sk === 'bulut';
    var colors = neon ? ['#3df2ff', '#b46bff', '#ff4fd8', '#ffffff']
      : sk === 'bauhaus' ? ['#d9241a', '#f6c018', '#1d4fa3', '#111111']
      : [cssVar('--felt') || '#2f9a91', cssVar('--brass') || '#c27a2c', cssVar('--felt-2') || '#58b3ab', cssVar('--good') || '#2e8a5c'];
    var n = calm ? (big ? 44 : 26) : (big ? 70 : 42), items = [];
    for (var i = 0; i < n; i++) {
      var el = document.createElement('i');
      var kind = i % 4;
      if (kind === 0) { el.className = 'c'; el.style.background = colors[0]; }
      else if (kind === 1) { el.style.background = colors[1]; }
      else if (kind === 2) { if (sk === 'bauhaus') el.className = 't'; else { el.className = 'c'; el.style.background = colors[2]; } }
      else { el.style.background = colors[3]; el.style.width = '22px'; el.style.height = '6px'; }
      if (neon) {
        var col = colors[i % 4];
        el.className = i % 3 ? 'c' : '';
        el.style.border = '0'; el.style.width = el.style.height = (4 + Math.random() * 7) + 'px';
        el.style.background = col; el.style.boxShadow = '0 0 10px ' + col + ', 0 0 20px ' + col;
      }
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
    themeSwap: themeSwap,
    slideIn: slideIn,
    resultIn: resultIn,
    anim: anim,
    reduced: reduced,
    valid: valid,
    run: run,
    placeIndicator: placeIndicator,
    syncDrawer: syncDrawer,
    initMenu: initMenu,
    initTilt: initTilt,
    initGlow: initGlow,
    scrambleText: scrambleText,
    loadGsap: loadGsap,
    celebrate: celebrate,
    closeMenu: function () {}
  };
  root.Motion = Motion;
})(typeof window !== 'undefined' ? window : globalThis);
