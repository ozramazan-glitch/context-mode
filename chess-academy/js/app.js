/* Uygulama kabuğu: üst menü, yönlendirme, 2B/3B seçimi, ayarlar, süre sayacı. */
(function (root) {
  'use strict';
  var UI = root.UI, h = UI.h, P = root.Progress, C = root.CURRICULUM, SP = root.SPECIAL, T = root.Trainer, V = root.Views;
  var main = document.getElementById('main');
  var current = null;

  var ROUTES = { ana: 'home', yol: 'path', ozel: 'special', gelisim: 'progress', oyna: 'play', sozluk: 'glossary' };

  var App = {
    pathOpen: null, specialTab: null, playLevel: null, playColor: null,
    showScreen: function (scr) {
      if (current && current.destroy) { try { current.destroy(); } catch (e) { console.error(e); } }
      current = scr;
      App.inMain = false;
      main.innerHTML = '';
      main.appendChild(scr.el);
      window.scrollTo(0, 0);
      var head = scr.el.querySelector('h1, h2');
      if (head) { head.setAttribute('tabindex', '-1'); head.focus({ preventScroll: true }); }
      updateHeader();
    },
    route: function () {
      var name = (location.hash || '#ana').slice(1);
      var view = ROUTES[name] || 'home';
      App.showScreen(V[view]());
      App.inMain = true;
      Array.prototype.forEach.call(document.querySelectorAll('.nav a'), function (a) {
        if (a.getAttribute('href') === '#' + name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      });
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
    settingsPanel.appendChild(toggle('coords', 'Tahtada koordinatları göster', function (v) { root.BoardView.coords = v; root.BoardView.refreshAll(); }));
    settingsPanel.appendChild(toggle('legal', 'Seçili taşın gidebileceği kareleri göster', function (v) { root.BoardView.showLegal = v; root.BoardView.refreshAll(); }));
    settingsPanel.appendChild(h('p.small.muted', { text: '2B / 3B görünüm üst menüden değiştirilir. 3B görünüm ilk açılışta internetten bir grafik kitaplığı indirir.' }));
  }
  settingsBtn.addEventListener('click', function () {
    var open = settingsPanel.hidden;
    if (open) renderSettings();
    settingsPanel.hidden = !open;
    settingsBtn.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', function (ev) {
    if (!settingsPanel.hidden && !settingsPanel.contains(ev.target) && ev.target !== settingsBtn && !settingsBtn.contains(ev.target)) {
      settingsPanel.hidden = true; settingsBtn.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !settingsPanel.hidden) { settingsPanel.hidden = true; settingsBtn.focus(); } });

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
