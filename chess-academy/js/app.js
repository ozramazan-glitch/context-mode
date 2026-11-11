/* Uygulama kabuğu: üst menü, yönlendirme, 2B/3B seçimi, ayarlar, süre sayacı. */
(function (root) {
  'use strict';
  var UI = root.UI, h = UI.h, P = root.Progress, C = root.CURRICULUM, SP = root.SPECIAL, T = root.Trainer, V = root.Views;
  var main = document.getElementById('main');
  var current = null;

  var ROUTES = { ana: 'home', yol: 'path', ozel: 'special', gelisim: 'progress', oyna: 'play', sozluk: 'glossary' };
  var ORDER = ['ana', 'yol', 'ozel', 'gelisim', 'oyna', 'sozluk'];
  var lastRoute = null;
  var M = root.Motion;

  var App = {
    pathOpen: null, specialTab: null, playLevel: null, playColor: null,
    // Ekranı temanın geçiş animasyonuyla değiştirir. opts: { dir: 1 | -1, isMain }
    showScreen: function (scr, opts) {
      opts = opts || {};
      M.closeMenu();
      M.run(function () {
        if (current && current.destroy) { try { current.destroy(); } catch (e) { console.error(e); } }
        current = scr;
        App.inMain = !!opts.isMain;
        main.innerHTML = '';
        main.appendChild(scr.el);
        window.scrollTo(0, 0);
        var head = scr.el.querySelector('h1, h2');
        if (head) { head.setAttribute('tabindex', '-1'); head.focus({ preventScroll: true }); }
        updateHeader();
      }, opts.dir || 1, function () { return scr.el; }, { kind: opts.isMain ? 'main' : 'sub', route: opts.route });
    },
    route: function () {
      var name = (location.hash || '#ana').slice(1);
      if (!ROUTES[name]) name = 'ana';
      var dir = App.inMain === false && lastRoute ? -1 : (ORDER.indexOf(name) >= ORDER.indexOf(lastRoute || 'ana') ? 1 : -1);
      lastRoute = name;
      Array.prototype.forEach.call(document.querySelectorAll('.nav a'), function (a) {
        if (a.getAttribute('href') === '#' + name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      });
      M.placeIndicator(true);
      M.syncDrawer();
      App.showScreen(V[ROUTES[name]](), { dir: dir, isMain: true, route: name });
    },
    openLesson: function (sec, lesson) {
      App.pathOpen = sec.id;
      App.showScreen(T.openLesson(lesson, {
        crumb: sec.no + '. bölüm · ' + sec.title + ' · Ders',
        onExit: function () { App.goPath(sec.id); }
      }));
    },
    openExercise: function (sec, i) {
      App.pathOpen = sec.id;
      var ex = sec.exercises[i];
      App.showScreen(T.openExercise(ex, {
        crumb: sec.no + '. bölüm · ' + sec.title + ' · Alıştırma ' + (i + 1) + ' / ' + sec.exercises.length,
        onExit: function () { App.goPath(sec.id); },
        onRetry: function () { App.openExercise(sec, i); },
        hasNext: function () { return i + 1 < sec.exercises.length && P.exerciseAvailable(sec, i + 1); },
        onNext: function () { App.openExercise(sec, i + 1); }
      }));
    },
    openSpecialExercise: function (topic, i) {
      App.specialTab = topic.id;
      var ex = topic.exercises[i];
      App.showScreen(T.openExercise(ex, {
        crumb: 'Özel Hamleler Atölyesi · ' + topic.title + ' · Alıştırma ' + (i + 1) + ' / ' + topic.exercises.length,
        backLabel: 'Atölyeye dön',
        onExit: function () { App.goSpecial(); },
        onRetry: function () { App.openSpecialExercise(topic, i); },
        hasNext: function () { return i + 1 < topic.exercises.length; },
        onNext: function () { App.openSpecialExercise(topic, i + 1); }
      }));
    },
    openStep: function (step) {
      if (step.kind === 'lesson') App.openLesson(step.section, step.lesson);
      else App.openExercise(step.section, step.index);
    },
    goPath: function (sid) {
      App.pathOpen = sid;
      if (location.hash !== '#yol') location.hash = '#yol'; else App.route();
    },
    goSpecial: function () {
      if (location.hash !== '#ozel') location.hash = '#ozel'; else App.route();
    }
  };
  root.App = App;

  // ---- Üst menü ----
  var chip = document.getElementById('level-chip');
  function updateHeader() {
    var s = P.state, lv = P.levelForXp(s.xp);
    if (chip) chip.textContent = 'Sv ' + lv + ' · ' + P.titleFor(lv);
  }
  P.onChange(updateHeader);

  var segBtns = document.querySelectorAll('#mode-seg button');
  function setModeButtons(mode) {
    Array.prototype.forEach.call(segBtns, function (b) { b.setAttribute('aria-pressed', String(b.dataset.mode === mode)); });
  }
  Array.prototype.forEach.call(segBtns, function (b) {
    b.addEventListener('click', function () {
      var mode = b.dataset.mode;
      setModeButtons(mode);
      P.setSetting('mode', mode);
      root.BoardView.setGlobalMode(mode);
      if (mode === '3d') UI.toast('3B görünüm: tahtayı döndürmek için sürükle.');
    });
  });
  root.BoardView.onModeError = function (err) {
    UI.toast((err && err.message ? err.message : '3B görünüm açılamadı') + ' 2B görünüme dönüldü.', 'bad');
    setModeButtons('2d');
    P.setSetting('mode', '2d');
    root.BoardView.mode = '2d';
  };

  // ---- Ayarlar ----
  var settingsBtn = document.getElementById('settings-btn');
  var settingsPanel = document.getElementById('settings-panel');
  function renderSettings() {
    var s = P.state.settings;
    settingsPanel.innerHTML = '';
    function toggle(key, label, apply) {
      var id = 'set-' + key;
      var cb = h('input', { type: 'checkbox', id: id });
      cb.checked = !!s[key];
      cb.addEventListener('change', function () { P.setSetting(key, cb.checked); apply(cb.checked); });
      return h('label.check', { for: id }, cb, h('span', { text: label }));
    }
    settingsPanel.appendChild(h('h2', { text: 'Ayarlar' }));
    // Tema seçimi
    var list = h('div.skin-list', { role: 'radiogroup', 'aria-label': 'Tema' });
    M.SKINS.forEach(function (sk) {
      var id = 'skin-' + sk.id;
      var rb = h('input', { type: 'radio', name: 'skin', id: id, value: sk.id });
      rb.checked = M.skin() === sk.id;
      rb.addEventListener('change', function () { if (rb.checked) applySkin(sk.id, true); });
      var sw = h('span.sw');
      sk.sw.forEach(function (c) { sw.appendChild(h('span', { style: 'background:' + c })); });
      list.appendChild(h('label.skin-opt', { for: id }, rb, h('b', { text: sk.name }), h('span.small.muted', { text: sk.note }), sw));
    });
    settingsPanel.appendChild(h('p.field-label', { text: 'Tema' }));
    settingsPanel.appendChild(list);
    settingsPanel.appendChild(toggle('coords', 'Tahtada koordinatları göster', function (v) { root.BoardView.coords = v; root.BoardView.refreshAll(); }));
    settingsPanel.appendChild(toggle('legal', 'Seçili taşın gidebileceği kareleri göster', function (v) { root.BoardView.showLegal = v; root.BoardView.refreshAll(); }));
    settingsPanel.appendChild(h('p.small.muted', { text: '2B / 3B görünüm üst menüden değiştirilir. 3B görünüm ilk açılışta internetten bir grafik kitaplığı indirir.' }));
  }
  settingsBtn.addEventListener('click', function () {
    var open = settingsPanel.hidden;
    if (open) renderSettings();
    settingsPanel.hidden = !open;
    settingsPanel.classList.toggle('pop', open);
    settingsBtn.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', function (ev) {
    if (!settingsPanel.hidden && !settingsPanel.contains(ev.target) && ev.target !== settingsBtn && !settingsBtn.contains(ev.target)) {
      settingsPanel.hidden = true; settingsBtn.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !settingsPanel.hidden) { settingsPanel.hidden = true; settingsBtn.focus(); } });

  // ---- Tema ----
  function applySkin(id, announce) {
    M.setSkin(id);
    P.state.settings.skinPicked = true;
    P.setSetting('skin', M.skin());
    // 3B tahta renklerini CSS belirteçlerinden okur: yeni temayla yeniden kur.
    root.BoardView.instances.forEach(function (b) {
      if (!b.destroyed && b.modeName === '3d') { b.modeName = null; b.setMode('3d'); }
    });
    root.BoardView.refreshAll();
    if (announce) {
      var sk = M.SKINS.filter(function (x) { return x.id === M.skin(); })[0];
      UI.toast('Tema: ' + (sk ? sk.name : M.skin()));
    }
  }

  // ---- Üst çubuk gölgesi ve menü göstergesi ----
  var topbar = document.querySelector('.topbar');
  window.addEventListener('scroll', function () { if (topbar) topbar.classList.toggle('scrolled', window.scrollY > 4); }, { passive: true });
  window.addEventListener('resize', function () { M.placeIndicator(false); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { M.placeIndicator(false); });

  // ---- Süre sayacı: sekme görünür ve son 60 sn içinde etkileşim varsa ----
  var lastAct = Date.now();
  ['pointerdown', 'keydown'].forEach(function (ev) { document.addEventListener(ev, function () { lastAct = Date.now(); }, true); });
  setInterval(function () {
    if (document.visibilityState === 'visible' && Date.now() - lastAct < 60000) P.addTime(15);
  }, 15000);

  // ---- Başlangıç ----
  var st = P.state.settings;
  root.BoardView.coords = st.coords !== false;
  root.BoardView.showLegal = st.legal !== false;
  root.BoardView.mode = st.mode === '3d' ? '3d' : '2d';
  setModeButtons(root.BoardView.mode);
  // Kullanıcı Ayarlar'dan bir tema seçmediyse güncel varsayılan tema kullanılır.
  M.setSkin(st.skinPicked && M.valid(st.skin) ? st.skin : M.DEFAULT);
  M.initMenu();
  M.initTilt();
  M.initGlow();
  M.loadGsap().then(function () { M.placeIndicator(false); });
  window.addEventListener('hashchange', App.route);
  App.route();
  // Buluttan daha yeni bir ilerleme gelirse ana ekranları tazele (alıştırma ortasında bölme).
  P.cloud.onRemote = function () {
    UI.toast('İlerlemen buluttan yüklendi.', 'good');
    if (App.inMain) App.route();
  };
  // Bulut yedeği (yalnızca claude.ai görüntüleyicisinde vardır) ilk etkileşimde başlar;
  // böylece olası izin sorusu sayfa açılır açılmaz değil, kullanıcı bir şey yapınca gelir.
  var cloudStarted = false;
  function startCloud() {
    if (cloudStarted) return;
    cloudStarted = true;
    document.removeEventListener('pointerdown', startCloud, true);
    document.removeEventListener('keydown', startCloud, true);
    P.cloud.init();
  }
  document.addEventListener('pointerdown', startCloud, true);
  document.addEventListener('keydown', startCloud, true);
})(typeof window !== 'undefined' ? window : globalThis);
