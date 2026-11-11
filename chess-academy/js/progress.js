/*
 * İlerleme, puan (XP), seviye, tahmini bulmaca puanı ve rozetler.
 *
 * Kayıt yeri: tarayıcının localStorage'ı. claude.ai Artifact görüntüleyicisinde
 * açıldığında ve izin verildiğinde, ilerleme ayrıca kullanıcıya özel bulut
 * belgesine (db yeteneği, data/users/<id>/progress) yedeklenir.
 */
(function (root) {
  'use strict';

  var KEY = 'satranc-akademisi-v1';
  var C = root.CURRICULUM, SP = root.SPECIAL;

  // ---- Alıştırma kataloğu ----
  var catalog = {}; // id -> { ex, section, index, special, topic }
  C.sections.forEach(function (s) {
    s.exercises.forEach(function (ex, i) { catalog[ex.id] = { ex: ex, section: s, index: i, special: false }; });
  });
  SP.topics.forEach(function (t) {
    t.exercises.forEach(function (ex, i) { catalog[ex.id] = { ex: ex, topic: t, index: i, special: true }; });
  });

  function exRating(id) {
    var c = catalog[id]; if (!c) return 800;
    if (c.special) return 600 + c.index * 40;
    return c.section.rating + c.index * 25;
  }
  function exBaseXp(id) {
    var c = catalog[id]; if (!c) return 10;
    if (c.special) return 15;
    return 10 + 4 * (c.section.no - 1);
  }

  // ---- Seviye ve unvan ----
  function xpForLevel(n) { return 25 * n * (n - 1); } // 1:0, 2:50, 3:150, 4:300, 5:500 ...
  function levelForXp(xp) { var n = 1; while (xpForLevel(n + 1) <= xp) n++; return n; }
  var TITLES = [
    { from: 1, name: 'Piyon' }, { from: 3, name: 'At' }, { from: 5, name: 'Fil' },
    { from: 7, name: 'Kale' }, { from: 9, name: 'Vezir' }, { from: 11, name: 'Şah' }, { from: 14, name: 'Büyük Şah' }
  ];
  function titleFor(level) {
    var t = TITLES[0].name;
    TITLES.forEach(function (x) { if (level >= x.from) t = x.name; });
    return t;
  }

  // ---- Rozetler ----
  var BADGES = [
    { id: 'ilk-adim', name: 'İlk Adım', desc: 'İlk alıştırmanı çöz.', test: function (s) { return solvedCount(s) >= 1; } },
    { id: 'tahta', name: 'Tahta Bilgini', desc: '1. bölümü tamamla.', test: function (s) { return sectionDone(s, 's1'); } },
    { id: 'hareket', name: 'Taş Ustası', desc: '2. bölümü tamamla.', test: function (s) { return sectionDone(s, 's2'); } },
    { id: 'ilk-mat', name: 'İlk Mat', desc: 'Bir mat alıştırmasını çöz.', test: function (s) { return anySolved(s, function (ex) { return ex.type === 'mate'; }); } },
    { id: 'taktik', name: 'Taktik Avcısı', desc: 'Taktikler bölümündeki tüm bulmacaları çöz.', test: function (s) { return sectionAll(s, 's5'); } },
    { id: 'mat-kaliplari', name: 'Mat Ustası', desc: 'Mat kalıpları bölümünü tamamla.', test: function (s) { return sectionAll(s, 's6'); } },
    { id: 'oyunsonu', name: 'Oyunsonu Teknisyeni', desc: 'Şah+piyon oyunsonunda kusursuz savunmaya karşı terfi et.', test: function (s) { return anySolved(s, function (ex) { return ex.type === 'kpk'; }); } },
    { id: 'rok', name: 'Rok Ustası', desc: 'Tüm rok alıştırmalarını çöz.', test: function (s) { return topicAll(s, 'rok'); } },
    { id: 'gecerken', name: 'Geçerken Alan', desc: 'Geçerken almayı başar.', test: function (s) { return solved(s, 'og1') || solved(s, 'og2'); } },
    { id: 'az-terfi', name: 'Sürpriz Terfi', desc: 'Ata terfi ederek veziri kazan.', test: function (s) { return solved(s, 'ot3'); } },
    { id: 'atolye', name: 'Atölye Mezunu', desc: 'Özel Hamleler Atölyesi’nin tamamını bitir.', test: function (s) { return SP.topics.every(function (t) { return topicAll(s, t.id); }); } },
    { id: 'hatasiz', name: 'Hatasız Bölüm', desc: 'Bir bölümün tüm alıştırmalarından 3 yıldız al.', test: function (s) { return C.sections.some(function (sec) { return sec.exercises.every(function (ex) { var r = s.ex[ex.id]; return r && r.stars === 3; }); }); } },
    { id: 'seri-3', name: 'Üç Gün Üst Üste', desc: '3 gün art arda çalış.', test: function (s) { return streak(s) >= 3; } },
    { id: 'seri-7', name: 'Bir Hafta Seri', desc: '7 gün art arda çalış.', test: function (s) { return streak(s) >= 7; } },
    { id: 'galibiyet', name: 'Bilgisayarı Yendin', desc: 'Bilgisayara karşı bir oyun kazan.', test: function (s) { return s.games.won >= 1; } },
    { id: 'puan-1200', name: '1200 Kulübü', desc: 'Tahmini bulmaca puanını 1200’e çıkar.', test: function (s) { return s.rating >= 1200; } },
    { id: 'usta', name: 'Usta Adayı', desc: 'Sekiz bölümün hepsini tamamla.', test: function (s) { return C.sections.every(function (sec) { return sectionDone(s, sec.id); }); } }
  ];

  function solved(s, id) { var r = s.ex[id]; return !!(r && r.status === 'solved'); }
  function completed(s, id) { var r = s.ex[id]; return !!(r && (r.status === 'solved' || r.status === 'revealed')); }
  function solvedCount(s) { return Object.keys(s.ex).filter(function (id) { return s.ex[id].status === 'solved'; }).length; }
  function anySolved(s, pred) { return Object.keys(s.ex).some(function (id) { return s.ex[id].status === 'solved' && catalog[id] && pred(catalog[id].ex); }); }
  function sectionById(id) { return C.sections.filter(function (x) { return x.id === id; })[0]; }
  function sectionSolvedRatio(s, sid) {
    var sec = sectionById(sid); if (!sec) return 0;
    var n = sec.exercises.filter(function (ex) { return solved(s, ex.id); }).length;
    return n / sec.exercises.length;
  }
  var PASS = 0.75; // bir sonraki bölümün açılması için gereken oran
  function sectionDone(s, sid) { return sectionSolvedRatio(s, sid) >= PASS; }
  function sectionAll(s, sid) { return sectionSolvedRatio(s, sid) === 1; }
  function topicAll(s, tid) {
    var t = SP.topics.filter(function (x) { return x.id === tid; })[0];
    return !!t && t.exercises.every(function (ex) { return solved(s, ex.id); });
  }

  // ---- Tarih yardımcıları ----
  function dayKey(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function streak(s) {
    var n = 0, d = new Date();
    if (!s.daily[dayKey(d)]) d.setDate(d.getDate() - 1); // bugün henüz çalışılmadıysa dünden say
    while (s.daily[dayKey(d)] && (s.daily[dayKey(d)].xp > 0 || s.daily[dayKey(d)].solved > 0)) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  // ---- Durum ----
  function fresh() {
    return {
      v: 1, name: 'Oyuncu', createdAt: Date.now(), updatedAt: Date.now(),
      xp: 0, rating: 400, ratingHistory: [{ t: Date.now(), r: 400 }], rated: 0,
      lessons: {}, ex: {}, unlocked: { s1: true }, daily: {}, log: [], badges: {},
      games: { played: 0, won: 0, drawn: 0, lost: 0 }, timeSpent: 0,
      placement: null,
      settings: { mode: '2d', coords: true, legal: true, anim: true, skin: 'kitap' }
    };
  }
  function migrate(s) {
    var f = fresh();
    Object.keys(f).forEach(function (k) { if (s[k] === undefined) s[k] = f[k]; });
    Object.keys(f.settings).forEach(function (k) { if (s.settings[k] === undefined) s.settings[k] = f.settings[k]; });
    return s;
  }
  function readLocal() {
    try { var raw = root.localStorage && root.localStorage.getItem(KEY); if (raw) return migrate(JSON.parse(raw)); } catch (e) { /* depolama yok */ }
    return null;
  }

  var state = readLocal() || fresh();
  var listeners = [];
  function emit() { listeners.forEach(function (fn) { try { fn(state); } catch (e) { console.error(e); } }); }

  function save() {
    state.updatedAt = Date.now();
    try { root.localStorage && root.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* özel pencere vb. */ }
    Cloud.schedule();
    emit();
  }

  function day() {
    var k = dayKey();
    if (!state.daily[k]) state.daily[k] = { xp: 0, solved: 0, time: 0 };
    // 90 günden eski günlük kayıtları temizle
    var keys = Object.keys(state.daily).sort();
    while (keys.length > 90) delete state.daily[keys.shift()];
    return state.daily[k];
  }

  function log(type, text) {
    state.log.unshift({ t: Date.now(), type: type, text: text });
    if (state.log.length > 40) state.log.length = 40;
  }

  function addXp(n) {
    var before = levelForXp(state.xp);
    state.xp += n;
    day().xp += n;
    var after = levelForXp(state.xp);
    return after > before ? after : 0;
  }

  function checkBadges() {
    var got = [];
    BADGES.forEach(function (b) {
      if (!state.badges[b.id] && b.test(state)) { state.badges[b.id] = Date.now(); got.push(b); log('badge', 'Rozet kazanıldı: ' + b.name); }
    });
    return got;
  }

  function updateUnlocks() {
    C.sections.forEach(function (sec, i) {
      if (i === 0) { state.unlocked[sec.id] = true; return; }
      if (sectionDone(state, C.sections[i - 1].id)) state.unlocked[sec.id] = true;
    });
  }

  // result: { solved, mistakes, hints, revealed, moves, par, exam }
  function recordExercise(id, result) {
    var info = catalog[id]; if (!info) return null;
    var prev = state.ex[id];
    var stars = 0;
    if (result.solved && !result.revealed) {
      var penalty = (result.mistakes || 0) + (result.hints || 0);
      if (result.par && result.moves) penalty = Math.max(penalty, result.moves - result.par);
      stars = penalty === 0 ? 3 : penalty <= 2 ? 2 : 1;
    }
    var status = result.solved && !result.revealed ? 'solved' : result.revealed ? 'revealed' : 'failed';
    var rec = prev ? Object.assign({}, prev) : { attempts: 0, stars: 0, status: 'new', firstTry: null };
    rec.attempts++;
    if (rec.firstTry === null) rec.firstTry = stars === 3;
    var xp = 0;
    if (status === 'solved') {
      var base = exBaseXp(id);
      var prevStars = prev && prev.status === 'solved' ? prev.stars : 0;
      if (stars > prevStars) xp = Math.round(base * (stars - prevStars) / 3);
      else xp = 2; // tekrar pratiği
      rec.stars = Math.max(prevStars, stars);
      rec.status = 'solved';
      rec.solvedAt = rec.solvedAt || Date.now();
      day().solved++;
    } else if (status === 'revealed' && rec.status !== 'solved') {
      rec.status = 'revealed';
    } else if (rec.status === 'new') {
      rec.status = 'failed';
    }
    rec.lastAt = Date.now();
    rec.mistakes = (rec.mistakes || 0) + (result.mistakes || 0);
    rec.hints = (rec.hints || 0) + (result.hints || 0);
    state.ex[id] = rec;

    // Elo benzeri tahmini puan: her alıştırmanın ilk denemesi puanı etkiler.
    var ratingDelta = 0;
    if (!prev || prev.status === 'new') {
      var score = status !== 'solved' ? 0 : stars === 3 ? 1 : stars === 2 ? 0.75 : 0.5;
      var expected = 1 / (1 + Math.pow(10, (exRating(id) - state.rating) / 400));
      var K = state.rated < 20 ? 40 : 24;
      ratingDelta = Math.round(K * (score - expected));
      state.rating = Math.max(100, state.rating + ratingDelta);
      state.rated++;
      state.ratingHistory.push({ t: Date.now(), r: state.rating });
      if (state.ratingHistory.length > 200) state.ratingHistory.shift();
    }
    var levelUp = xp ? addXp(xp) : 0;
    if (status === 'solved') log('ex', info.ex.title + ' çözüldü (' + stars + ' yıldız)');
    else if (status === 'revealed') log('ex', info.ex.title + ': çözüm gösterildi');
    updateUnlocks();
    var badges = checkBadges();
    save();
    return { stars: stars, xp: xp, levelUp: levelUp, badges: badges, ratingDelta: ratingDelta, status: status };
  }

  function markLesson(id, title) {
    if (state.lessons[id]) return { xp: 0 };
    state.lessons[id] = Date.now();
    var lv = addXp(5);
    log('lesson', 'Ders okundu: ' + title);
    checkBadges();
    save();
    return { xp: 5, levelUp: lv };
  }

  var GAME_XP = { kolay: 15, orta: 30, zor: 50 };
  function recordGame(level, outcome) {
    state.games.played++;
    if (outcome === 'win') state.games.won++; else if (outcome === 'draw') state.games.drawn++; else state.games.lost++;
    var xp = outcome === 'win' ? GAME_XP[level] : outcome === 'draw' ? Math.round(GAME_XP[level] / 3) : 3;
    var lv = addXp(xp);
    log('game', 'Bilgisayara karşı (' + level + '): ' + (outcome === 'win' ? 'kazandın' : outcome === 'draw' ? 'berabere' : 'kaybettin'));
    var badges = checkBadges();
    save();
    return { xp: xp, levelUp: lv, badges: badges };
  }

  function addTime(sec) {
    state.timeSpent += sec;
    day().time += sec;
    try { root.localStorage && root.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* yok */ }
    Cloud.schedule();
  }

  function setPlacement(passedSections) {
    var n = Math.max(0, Math.min(C.sections.length, passedSections));
    for (var i = 0; i <= Math.min(n, C.sections.length - 1); i++) state.unlocked[C.sections[i].id] = true;
    state.placement = { at: Date.now(), passed: n };
    var target = 400 + 160 * n;
    if (state.rated < 5) { state.rating = Math.max(state.rating, target); state.ratingHistory.push({ t: Date.now(), r: state.rating }); }
    log('placement', 'Seviye belirleme: ' + n + ' bölüm geçildi');
    checkBadges();
    save();
  }

  function setSetting(k, v) { state.settings[k] = v; save(); }
  function setName(n) { state.name = String(n || '').trim().slice(0, 40) || 'Oyuncu'; save(); }
  function reset() { var keep = state.settings; state = fresh(); state.settings = keep; save(); }
  function exportJson() { return JSON.stringify(state); }
  function importJson(txt) {
    var s = JSON.parse(txt);
    if (!s || typeof s !== 'object' || typeof s.xp !== 'number' || !s.ex) throw new Error('Bu metin bir Satranç Akademisi yedeği değil.');
    state = migrate(s);
    updateUnlocks();
    save();
  }

  // ---- Türetilmiş göstergeler ----
  function isUnlocked(sid) { updateUnlocks(); return !!state.unlocked[sid]; }
  function lessonsRead(sec) { return sec.lessons.every(function (l) { return state.lessons[l.id]; }); }
  function exerciseAvailable(sec, i) {
    if (!isUnlocked(sec.id)) return false;
    if (i === 0) return lessonsRead(sec) || !!state.placement && state.placement.passed > sec.no - 1;
    return completed(state, sec.exercises[i - 1].id);
  }
  function sectionStats(sec) {
    var solvedN = 0, stars = 0;
    sec.exercises.forEach(function (ex) { var r = state.ex[ex.id]; if (r && r.status === 'solved') { solvedN++; stars += r.stars; } });
    var read = sec.lessons.filter(function (l) { return state.lessons[l.id]; }).length;
    return {
      solved: solvedN, total: sec.exercises.length, stars: stars, maxStars: sec.exercises.length * 3,
      read: read, lessons: sec.lessons.length, done: solvedN / sec.exercises.length >= PASS, unlocked: isUnlocked(sec.id),
      pct: Math.round(100 * (solvedN + read * 0.5) / (sec.exercises.length + sec.lessons.length * 0.5))
    };
  }
  function topicStats(t) {
    var s = 0, st = 0;
    t.exercises.forEach(function (ex) { var r = state.ex[ex.id]; if (r && r.status === 'solved') { s++; st += r.stars; } });
    return { solved: s, total: t.exercises.length, stars: st, maxStars: t.exercises.length * 3 };
  }
  function categoryMastery() {
    var out = {};
    Object.keys(C.categories).forEach(function (k) { out[k] = { stars: 0, max: 0, solved: 0, total: 0 }; });
    Object.keys(catalog).forEach(function (id) {
      var ex = catalog[id].ex, c = out[ex.category]; if (!c) return;
      c.max += 3; c.total++;
      var r = state.ex[id]; if (r && r.status === 'solved') { c.stars += r.stars; c.solved++; }
    });
    Object.keys(out).forEach(function (k) { out[k].pct = out[k].max ? Math.round(100 * out[k].stars / out[k].max) : 0; });
    return out;
  }
  function currentProfile() {
    var prof = C.sections[0].profile, idx = 0;
    C.sections.forEach(function (sec, i) { if (sectionDone(state, sec.id)) { idx = Math.min(i + 1, C.sections.length - 1); } });
    var lastDone = -1;
    C.sections.forEach(function (sec, i) { if (sectionDone(state, sec.id)) lastDone = i; });
    if (lastDone >= 0) prof = C.sections[lastDone].profile;
    return { name: prof, nextSection: C.sections[idx], completedSections: lastDone + 1 };
  }
  function totals() {
    var ids = Object.keys(state.ex);
    var solvedIds = ids.filter(function (id) { return state.ex[id].status === 'solved'; });
    var firstTry = solvedIds.filter(function (id) { return state.ex[id].firstTry; }).length;
    var mistakes = 0, hints = 0;
    ids.forEach(function (id) { mistakes += state.ex[id].mistakes || 0; hints += state.ex[id].hints || 0; });
    return {
      solved: solvedIds.length, total: Object.keys(catalog).length, firstTryPct: solvedIds.length ? Math.round(100 * firstTry / solvedIds.length) : 0,
      mistakes: mistakes, hints: hints, lessons: Object.keys(state.lessons).length,
      lessonTotal: C.sections.reduce(function (a, s) { return a + s.lessons.length; }, 0)
    };
  }
  // Sıradaki önerilen adım
  function nextStep() {
    for (var i = 0; i < C.sections.length; i++) {
      var sec = C.sections[i];
      if (!isUnlocked(sec.id)) break;
      for (var l = 0; l < sec.lessons.length; l++) if (!state.lessons[sec.lessons[l].id] && !(state.placement && state.placement.passed > i)) return { kind: 'lesson', section: sec, lesson: sec.lessons[l] };
      for (var e = 0; e < sec.exercises.length; e++) if (!completed(state, sec.exercises[e].id) && exerciseAvailable(sec, e)) return { kind: 'exercise', section: sec, index: e, ex: sec.exercises[e] };
    }
    return null;
  }

  // ---- Bulut yedeği (yalnızca claude.ai görüntüleyicisinde) ----
  var Cloud = {
    ref: null, enabled: false, timer: null, writing: false, pending: false, status: 'yerel',
    init: function () {
      var self = this;
      if (!root.claude || typeof root.claude.use !== 'function') return;
      Promise.all([root.claude.use('db'), root.claude.use('user')]).then(function (r) {
        var db = r[0], user = r[1];
        if (!db || !user) return null;
        return user.id().then(function (uid) {
          if (!uid) return null;
          self.ref = db.doc('data/users/' + uid + '/progress');
          var timeout = new Promise(function (res) { setTimeout(function () { res('timeout'); }, 10000); });
          return Promise.race([self.ref.get(), timeout]);
        });
      }).then(function (snap) {
        if (!snap || snap === 'timeout') return;
        self.enabled = true; self.status = 'bulut';
        if (snap.exists) {
          var d = snap.data();
          var remote = null;
          try { remote = migrate(JSON.parse(d.json)); } catch (e) { remote = null; }
          if (remote && (remote.updatedAt || 0) > (state.updatedAt || 0)) {
            var keepSettings = state.settings;
            state = remote; state.settings = Object.assign({}, remote.settings, { mode: keepSettings.mode });
            try { root.localStorage && root.localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* yok */ }
            emit();
            if (self.onRemote) self.onRemote();
            return;
          }
        }
        self.schedule();
      }).catch(function () { self.enabled = false; });
    },
    schedule: function () {
      var self = this;
      if (!this.enabled || !this.ref) return;
      clearTimeout(this.timer);
      this.timer = setTimeout(function () { self.flush(); }, 2500);
    },
    flush: function () {
      var self = this;
      if (this.writing) { this.pending = true; return; }
      this.writing = true;
      this.ref.set({ json: JSON.stringify(state), updatedAt: state.updatedAt }).catch(function (e) {
        if (e && (e.code === 'invalid_argument' || e.code === 'not_granted' || e.code === 'revoked')) { self.enabled = false; self.status = 'yerel'; }
      }).then(function () {
        self.writing = false;
        if (self.pending) { self.pending = false; self.flush(); }
      });
    }
  };

  root.Progress = {
    get state() { return state; },
    catalog: catalog,
    BADGES: BADGES,
    PASS: PASS,
    xpForLevel: xpForLevel,
    levelForXp: levelForXp,
    titleFor: titleFor,
    exRating: exRating,
    exBaseXp: exBaseXp,
    recordExercise: recordExercise,
    recordGame: recordGame,
    markLesson: markLesson,
    addTime: addTime,
    setPlacement: setPlacement,
    setSetting: setSetting,
    setName: setName,
    reset: reset,
    exportJson: exportJson,
    importJson: importJson,
    isUnlocked: isUnlocked,
    lessonsRead: lessonsRead,
    exerciseAvailable: exerciseAvailable,
    completed: function (id) { return completed(state, id); },
    solved: function (id) { return solved(state, id); },
    sectionStats: sectionStats,
    topicStats: topicStats,
    categoryMastery: categoryMastery,
    currentProfile: currentProfile,
    totals: totals,
    streak: function () { return streak(state); },
    nextStep: nextStep,
    dayKey: dayKey,
    onChange: function (fn) { listeners.push(fn); },
    cloud: Cloud
  };
})(typeof window !== 'undefined' ? window : globalThis);
