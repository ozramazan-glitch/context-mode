/*
 * Ders oynatıcı ve alıştırma çalıştırıcı. Her alıştırma türünün kuralları
 * burada; sonuçlar Progress.recordExercise ile kaydedilir.
 */
(function (root) {
  'use strict';
  var E = root.ChessEngine, UI = root.UI, h = UI.h, P = root.Progress;

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function sqs(list) { return (list || []).map(function (x) { return typeof x === 'number' ? x : E.sqIndex(x); }); }
  var TYPE_LABEL = { coord: 'Koordinat', pick: 'Kare seç', squares: 'Kareleri işaretle', stars: 'Yıldız topla', quiz: 'Soru', puzzle: 'Bulmaca', mate: 'Mat', endgame: 'Oyunsonu', kpk: 'Oyunsonu', game: 'Oyun' };
  var LEVELS = {
    kolay: { name: 'Kolay', depth: 1, noise: 140, timeMs: 400 },
    orta: { name: 'Orta', depth: 2, noise: 30, timeMs: 800 },
    zor: { name: 'Zor', depth: 4, noise: 0, timeMs: 1600 }
  };

  // Yıldız alıştırması için en kısa yol (genişlik öncelikli arama).
  function starsPlan(st0, pieceSq, stars) {
    var start = { st: st0, sq: pieceSq, left: stars.slice(), path: [] };
    var key = function (n) { return n.sq + ':' + n.left.join(',') + ':' + E.toFEN(n.st).split(' ')[0]; };
    var seen = {}; seen[key(start)] = true;
    var q = [start];
    while (q.length) {
      var n = q.shift();
      if (!n.left.length) return n.path;
      if (n.path.length > 12) continue;
      var s = E.cloneState(n.st); s.turn = 'w'; s.ep = -1;
      var ms = E.legalMoves(s, n.sq);
      for (var i = 0; i < ms.length; i++) {
        var m = ms[i], st = E.makeMove(s, m); st.turn = 'w'; st.ep = -1;
        var nn = { st: st, sq: m.to, left: n.left.filter(function (x) { return x !== m.to; }), path: n.path.concat([m]) };
        var k = key(nn); if (seen[k]) continue; seen[k] = true; q.push(nn);
      }
    }
    return null;
  }

  // ------------------------------------------------------------------
  // Ders oynatıcı
  // ------------------------------------------------------------------
  function openLesson(lesson, ctx) {
    var idx = 0, playing = false, board;
    var boardHost = h('div.trainer-board');
    var text = h('div.lesson-text');
    var counter = h('p.eyebrow');
    var demoRow = h('div.demo-row');
    var navPrev = UI.btn('Önceki', { kind: 'ghost', icon: 'back', onClick: function () { go(idx - 1); } });
    var navNext = UI.btn('Sonraki', { kind: 'primary', onClick: function () { if (idx < lesson.cards.length - 1) go(idx + 1); else finish(); } });
    var dots = h('div.dots', { 'aria-hidden': 'true' });
    lesson.cards.forEach(function () { dots.appendChild(h('span')); });
    var panel = h('aside.trainer-panel',
      counter,
      h('h2.panel-title', { text: lesson.title }),
      text, demoRow,
      h('div.lesson-nav', navPrev, dots, navNext));
    var el = h('section.screen.trainer',
      topbar(ctx.crumb, ctx.onExit),
      h('div.trainer-grid', boardHost, panel));
    board = new root.BoardView(boardHost, { interactive: false });

    function show() {
      var c = lesson.cards[idx];
      counter.textContent = 'Kart ' + (idx + 1) + ' / ' + lesson.cards.length;
      text.innerHTML = '<p>' + c.text + '</p>';
      Array.prototype.forEach.call(dots.children, function (d, i) { d.className = i === idx ? 'on' : i < idx ? 'done' : ''; });
      navPrev.disabled = idx === 0;
      navNext.querySelector('span').textContent = idx < lesson.cards.length - 1 ? 'Sonraki' : (P.state.lessons[lesson.id] ? 'Derse dön' : 'Dersi bitir');
      var st = E.parseFEN(c.fen || root.CURRICULUM.EMPTY);
      board.setPosition(st, null);
      var d = { marks: c.marks || [], arrows: c.arrows || [], check: false };
      if (c.showMoves) {
        var from = E.sqIndex(c.showMoves);
        d.focus = [from];
        var ms = E.destinations(st, from);
        d.targets = ms;
        d.captures = ms.filter(function (t) { return st.board[t]; });
      }
      board.setDeco(d);
      demoRow.innerHTML = '';
      if (c.demo && c.demo.length) {
        demoRow.appendChild(UI.btn('Hamleleri göster', { kind: 'secondary', icon: 'play', onClick: function () { playDemo(c); } }));
        demoRow.appendChild(UI.btn('Baştan', { kind: 'ghost', icon: 'reset', onClick: function () { playing = false; show(); } }));
        demoRow.appendChild(h('p.demo-moves', { text: demoSan(c) }));
      }
    }
    function demoSan(c) {
      var st = E.parseFEN(c.fen), out = [];
      c.demo.forEach(function (u, i) {
        var m = E.moveFromUci(st, u); if (!m) return;
        var pre = st.turn === 'w' ? st.full + '. ' : (i === 0 ? st.full + '... ' : '');
        out.push(pre + E.san(st, m));
        st = E.makeMove(st, m);
      });
      return out.join(' ');
    }
    function playDemo(c) {
      if (playing) return;
      playing = true;
      var st = E.parseFEN(c.fen), i = 0, token = {};
      board._demoToken = token;
      board.setPosition(st, null);
      board.setDeco({ check: true });
      (function step() {
        if (!playing || board.destroyed || board._demoToken !== token) return;
        if (i >= c.demo.length) { playing = false; return; }
        var m = E.moveFromUci(st, c.demo[i++]);
        st = E.makeMove(st, m);
        board.setPosition(st, m);
        setTimeout(step, 900);
      })();
    }
    function go(i) { playing = false; idx = Math.max(0, Math.min(lesson.cards.length - 1, i)); show(); }
    function finish() {
      var r = P.markLesson(lesson.id, lesson.title);
      if (r.xp) UI.toast('Ders tamamlandı: +' + r.xp + ' XP', 'good');
      if (r.levelUp) UI.toast('Seviye atladın: ' + r.levelUp + '. seviye!', 'good');
      ctx.onExit();
    }
    show();
    return { el: el, destroy: function () { playing = false; board.destroy(); } };
  }

  function topbar(crumb, onExit, extra) {
    return h('div.trainer-top',
      UI.btn('Geri', { kind: 'ghost', icon: 'back', onClick: onExit }),
      h('p.crumb', { text: crumb || '' }),
      extra || null);
  }

  // ------------------------------------------------------------------
  // Alıştırma çalıştırıcı
  // ------------------------------------------------------------------
  function openExercise(ex, ctx) {
    var needsBoard = ex.type !== 'quiz' || !!ex.fen;
    var S = { mistakes: 0, hints: 0, done: false, startedAt: Date.now() };
    var boardHost = needsBoard ? h('div.trainer-board') : null;
    var statusEl = h('div.task-status');
    var fb = h('div.feedback', { role: 'status', 'aria-live': 'polite' });
    var controls = h('div.controls');
    var extra = h('div.extra');
    var resultEl = h('div.result', { hidden: true });
    var chip = h('span.chip', { text: TYPE_LABEL[ex.type] || ex.type });
    var panel = h('aside.trainer-panel',
      h('div.panel-head', chip, ctx.exam ? h('span.chip.exam', { text: 'Sınav: tek hata hakkı' }) : null),
      h('h2.panel-title', { text: ex.title }),
      h('p.prompt', { html: ex.prompt }),
      statusEl, fb, extra, controls, resultEl);
    var el = h('section.screen.trainer' + (needsBoard ? '' : '.no-board'),
      topbar(ctx.crumb, function () { cleanup(); ctx.onExit(); }),
      h('div.trainer-grid', boardHost, panel));
    var board = needsBoard ? new root.BoardView(boardHost, { interactive: false }) : null;
    var timers = [];
    function later(fn, ms) { var t = setTimeout(function () { if (!S.closed) fn(); }, ms); timers.push(t); return t; }
    function cleanup() { S.closed = true; timers.forEach(clearTimeout); }

    var api = {
      board: board,
      feedback: function (msg, kind) { fb.className = 'feedback ' + (kind || 'info'); fb.innerHTML = msg || ''; },
      status: function (html) { statusEl.innerHTML = html || ''; },
      mistake: function (msg) {
        S.mistakes++;
        api.feedback(msg, 'bad');
        if (ctx.exam) { later(function () { api.finish({ solved: false }); }, 900); return true; }
        return false;
      },
      hint: function () { S.hints++; },
      countMistake: function () { S.mistakes++; },
      later: later,
      finish: function (r) {
        if (S.done) return;
        S.done = true;
        if (board) board.update({ interactive: false });
        controls.innerHTML = '';
        if (ctx.exam) { ctx.onExamResult(!!r.solved && !r.revealed); return; }
        var res = P.recordExercise(ex.id, { solved: r.solved, revealed: r.revealed, mistakes: S.mistakes, hints: S.hints, moves: r.moves, par: r.par });
        showResult(res, r);
      }
    };

    function showResult(res, r) {
      resultEl.hidden = false;
      resultEl.innerHTML = '';
      var title = res.status === 'solved' ? (res.stars === 3 ? 'Kusursuz!' : 'Çözdün!') : res.status === 'revealed' ? 'Çözüm gösterildi' : 'Bu sefer olmadı';
      resultEl.appendChild(h('h3', { text: title }));
      if (res.status === 'solved') resultEl.appendChild(UI.stars(res.stars));
      var lines = [];
      if (res.xp) lines.push('+' + res.xp + ' XP');
      if (res.ratingDelta) lines.push('Tahmini puan ' + P.state.rating + ' (' + (res.ratingDelta > 0 ? '+' : '') + res.ratingDelta + ')');
      if (r.moves && r.par) lines.push(r.moves + ' hamle (' + (r.parLabel || 'en az') + ' ' + r.par + ')');
      if (S.mistakes || S.hints) lines.push(S.mistakes + ' hata, ' + S.hints + ' ipucu');
      if (lines.length) resultEl.appendChild(h('p.result-meta', { text: lines.join(' · ') }));
      if (res.status === 'revealed') resultEl.appendChild(h('p.small', { text: 'Bir sonraki alıştırma açıldı ama bu alıştırmadan yıldız ve XP almadın. İstediğin zaman tekrar deneyebilirsin.' }));
      if (ex.explain) resultEl.appendChild(h('p.explain', { html: ex.explain }));
      if (res.levelUp) resultEl.appendChild(h('p.levelup', { text: 'Seviye atladın: ' + res.levelUp + '. seviye, unvanın ' + P.titleFor(res.levelUp) + '.' }));
      (res.badges || []).forEach(function (b) { resultEl.appendChild(h('p.badge-won', { text: 'Yeni rozet: ' + b.name + ' (' + b.desc + ')' })); });
      var row = h('div.controls');
      if (ctx.onNext && ctx.hasNext && ctx.hasNext()) row.appendChild(UI.btn('Sonraki alıştırma', { kind: 'primary', icon: 'next', onClick: function () { cleanup(); ctx.onNext(); } }));
      row.appendChild(UI.btn('Tekrar dene', { kind: 'secondary', icon: 'reset', onClick: function () { cleanup(); ctx.onRetry(); } }));
      row.appendChild(UI.btn(ctx.backLabel || 'Bölüme dön', { kind: 'ghost', onClick: function () { cleanup(); ctx.onExit(); } }));
      resultEl.appendChild(row);
      var first = row.querySelector('button'); if (first) first.focus();
    }

    function setControls(list) {
      controls.innerHTML = '';
      list.forEach(function (c) {
        if (!c) return;
        if (ctx.exam && c.noExam) return;
        controls.appendChild(UI.btn(c.label, { kind: c.kind || 'ghost', icon: c.icon, onClick: c.onClick, id: c.id }));
      });
    }
    api.setControls = setControls;

    var handler = TYPES[ex.type](ex, api, extra, ctx);
    var base = [];
    if (handler.check) base.push({ label: 'Kontrol et', kind: 'primary', icon: 'check', onClick: handler.check });
    if (handler.undo) base.push({ label: 'Geri al', kind: 'ghost', icon: 'undo', onClick: handler.undo, noExam: true });
    if (handler.hint) base.push({ label: 'İpucu', kind: 'ghost', icon: 'bulb', onClick: handler.hint, noExam: true });
    if (handler.reset) base.push({ label: 'Baştan başla', kind: 'ghost', icon: 'reset', onClick: handler.reset, noExam: true });
    if (handler.reveal) base.push({ label: handler.revealLabel || 'Çözümü göster', kind: 'ghost', icon: 'eye', onClick: function () {
      UI.confirm({ title: handler.revealLabel || 'Çözüm gösterilsin mi?', text: 'Bu alıştırmadan yıldız ve XP alamazsın; tahmini puanın düşebilir. Bir sonraki alıştırma yine de açılır.', ok: 'Göster' }).then(function (ok) { if (ok && !S.done) handler.reveal(); });
    }, noExam: true });
    if (handler.extraControls) base = handler.extraControls.concat(base);
    setControls(base);
    if (handler.start) handler.start();
    return { el: el, destroy: function () { cleanup(); if (handler.destroy) handler.destroy(); if (board) board.destroy(); } };
  }

  // ------------------------------------------------------------------
  // Alıştırma türleri
  // ------------------------------------------------------------------
  var TYPES = {};

  TYPES.coord = function (ex, api) {
    var i = 0, B = api.board;
    var targets = sqs(ex.targets);
    B.setPosition(E.parseFEN(root.CURRICULUM.EMPTY), null);
    function show() {
      api.status('<p class="big-target" aria-live="polite"><span>Bul:</span> <b>' + E.sqName(targets[i]) + '</b></p><p class="small">' + (i + 1) + ' / ' + targets.length + '</p>');
      B.setDeco({});
    }
    B.update({
      interactive: true, mode: 'select', onSquare: function (sq) {
        if (sq === targets[i]) {
          B.flash(sq, 'good', 500);
          api.feedback('Doğru: ' + E.sqName(sq), 'good');
          i++;
          if (i >= targets.length) api.finish({ solved: true }); else show();
        } else {
          B.flash(sq, 'bad', 600);
          api.mistake('Bu kare <b>' + E.sqName(sq) + '</b>. Aradığın kare <b>' + E.sqName(targets[i]) + '</b>.');
        }
      }
    });
    show();
    return {
      hint: function () {
        api.hint();
        var f = targets[i] & 7, col = [];
        for (var r = 0; r < 8; r++) col.push(r * 8 + f);
        B.setDeco({ marks: col });
        api.feedback('Aradığın kare işaretli sütunda: <b>' + E.FILES.charAt(f) + '</b> sütunu.', 'info');
      }
    };
  };

  TYPES.pick = function (ex, api) {
    var B = api.board, ans = sqs(ex.answer);
    B.setPosition(E.parseFEN(ex.fen), null);
    B.update({
      interactive: true, mode: 'select', onSquare: function (sq) {
        if (ans.indexOf(sq) >= 0) { B.flash(sq, 'good'); api.feedback('Doğru!', 'good'); api.finish({ solved: true }); }
        else {
          B.flash(sq, 'bad');
          var p = B.state.board[sq];
          api.mistake('Bu <b>' + E.sqName(sq) + '</b>' + (p ? ' (' + (E.colorOf(p) === 'w' ? 'beyaz ' : 'siyah ') + E.TR_NAME[p.toLowerCase()].toLowerCase() + ')' : '') + '. Tekrar dene.');
        }
      }
    });
    return {
      hint: function () { api.hint(); api.feedback('Aradığın kare <b>' + E.FILES.charAt(ans[0] & 7) + '</b> sütununda.', 'info'); },
      reveal: function () { B.setDeco({ good: ans }); api.finish({ solved: true, revealed: true }); }
    };
  };

  TYPES.squares = function (ex, api) {
    var B = api.board, st = E.parseFEN(ex.fen);
    var from = ex.from ? E.sqIndex(ex.from) : -1;
    var ans = ex.answer ? sqs(ex.answer) : E.destinations(st, from);
    var marked = {};
    B.setPosition(st, null);
    function draw(extra) { B.setDeco(Object.assign({ marks: Object.keys(marked).map(Number), focus: from >= 0 ? [from] : [], check: false }, extra || {})); }
    function status() { api.status('<p class="small">İşaretli: <b>' + Object.keys(marked).length + '</b> kare. Bir kareye tekrar tıklarsan işaret kalkar.</p>'); }
    B.update({
      interactive: true, mode: 'select', onSquare: function (sq) {
        if (sq === from) return;
        if (marked[sq]) delete marked[sq]; else marked[sq] = true;
        draw(); status();
      }
    });
    draw(); status();
    return {
      check: function () {
        var m = Object.keys(marked).map(Number);
        var missing = ans.filter(function (x) { return !marked[x]; });
        var extra = m.filter(function (x) { return ans.indexOf(x) < 0; });
        if (!missing.length && !extra.length) { draw({ good: ans }); api.feedback('Hepsi doğru!', 'good'); api.finish({ solved: true }); return; }
        if (extra.length) B.flash(extra, 'bad', 900);
        var parts = [];
        if (missing.length) parts.push(missing.length + ' kare eksik');
        if (extra.length) parts.push(extra.length + ' kare yanlış (kırmızı)');
        api.mistake('Henüz değil: ' + parts.join(', ') + '.');
      },
      hint: function () {
        var missing = ans.filter(function (x) { return !marked[x]; });
        if (!missing.length) { api.feedback('Eksik kare yok; kırmızı yanıp sönen kareleri kaldır.', 'info'); return; }
        api.hint();
        marked[missing[0]] = true; draw(); status();
        B.flash(missing[0], 'good', 900);
        api.feedback('Bir kareyi senin için işaretledim: <b>' + E.sqName(missing[0]) + '</b>.', 'info');
      },
      reset: function () { marked = {}; draw(); status(); api.feedback(''); },
      reveal: function () { marked = {}; ans.forEach(function (x) { marked[x] = true; }); draw({ good: ans }); api.finish({ solved: true, revealed: true }); }
    };
  };

  TYPES.stars = function (ex, api) {
    var B = api.board, st0 = E.parseFEN(ex.fen), stars0 = sqs(ex.stars), piece0 = E.sqIndex(ex.piece);
    var st, cur, left, moves, plan = starsPlan(st0, piece0, stars0), par = plan ? plan.length : 0;
    function status() {
      api.status('<div class="stat-row"><span><b>' + (stars0.length - left.length) + '</b> / ' + stars0.length + ' yıldız</span><span><b>' + moves + '</b> hamle</span><span>En az: <b>' + par + '</b></span></div>');
    }
    function reset() {
      st = E.cloneState(st0); cur = piece0; left = stars0.slice(); moves = 0;
      B.setPosition(st, null); B.setDeco({ stars: left, check: false }); status(); api.feedback('');
    }
    B.update({
      interactive: true, mode: 'move', movable: function (sq) { return sq === cur; },
      onForeign: function () { api.feedback('Bu alıştırmada yalnızca parlayan taşı oynatabilirsin.', 'info'); },
      onMove: function (m) {
        st = E.makeMove(st, m); st.turn = 'w'; st.ep = -1; cur = m.to; moves++;
        var hit = left.indexOf(m.to) >= 0;
        left = left.filter(function (x) { return x !== m.to; });
        B.setPosition(st, m);
        B.setDeco({ stars: left, focus: [cur], check: false });
        if (hit) B.flash(m.to, 'good', 450);
        status();
        if (!left.length) {
          api.feedback(moves <= par ? 'En kısa yolu buldun!' : 'Tüm yıldızlar toplandı. En kısa yol ' + par + ' hamleydi.', 'good');
          api.finish({ solved: true, moves: moves, par: par });
        }
      }
    });
    reset();
    B.setDeco({ stars: left, focus: [cur], check: false });
    return {
      reset: reset,
      hint: function () {
        var p = starsPlan(st, cur, left);
        if (!p || !p.length) return;
        api.hint();
        B.setDeco({ stars: left, focus: [cur], arrows: [[p[0].from, p[0].to]], check: false });
        api.feedback('Önerilen hamle okla gösterildi. Buradan sonra en az ' + p.length + ' hamle kaldı.', 'info');
      },
      reveal: function () {
        reset();
        var p = plan.slice();
        B.update({ interactive: false });
        (function step() {
          if (!p.length) { api.finish({ solved: true, revealed: true }); return; }
          var m = p.shift();
          st = E.makeMove(st, m); st.turn = 'w'; st.ep = -1; cur = m.to; moves++;
          left = left.filter(function (x) { return x !== m.to; });
          B.setPosition(st, m); B.setDeco({ stars: left, check: false }); status();
          api.later(step, 650);
        })();
      }
    };
  };

  TYPES.quiz = function (ex, api, extra) {
    var B = api.board;
    if (B) { B.setPosition(E.parseFEN(ex.fen), null); B.setDeco({ marks: ex.marks || [] }); }
    var list = h('div.options', { role: 'group', 'aria-label': 'Seçenekler' });
    var buttons = ex.options.map(function (o, i) {
      var b = h('button.option', { type: 'button', on: { click: function () { choose(i); } } }, h('span.opt-key', { text: String.fromCharCode(65 + i) }), h('span', { text: o }));
      list.appendChild(b);
      return b;
    });
    extra.appendChild(list);
    function choose(i) {
      if (buttons[i].disabled) return;
      if (i === ex.answer) {
        buttons[i].classList.add('right');
        buttons.forEach(function (b) { b.disabled = true; });
        api.feedback('Doğru!', 'good');
        api.finish({ solved: true });
      } else {
        buttons[i].classList.add('wrong');
        buttons[i].disabled = true;
        api.mistake('Bu doğru değil. Tekrar dene.');
      }
    }
    return {
      hint: function () {
        var wrong = buttons.filter(function (b, i) { return i !== ex.answer && !b.disabled; });
        if (wrong.length <= 1) { api.feedback('Daha fazla seçenek eleyemem.', 'info'); return; }
        api.hint();
        wrong[0].disabled = true; wrong[0].classList.add('elim');
        api.feedback('Yanlış bir seçeneği eledim.', 'info');
      },
      reveal: function () {
        buttons[ex.answer].classList.add('right');
        buttons.forEach(function (b) { b.disabled = true; });
        api.finish({ solved: true, revealed: true });
      }
    };
  };

  TYPES.puzzle = function (ex, api) {
    var B = api.board, st, step, hintLevel;
    function expected() { return (ex.accept && ex.accept[step]) || [ex.line[step]]; }
    function start() {
      st = E.parseFEN(ex.fen); step = 0; hintLevel = 0;
      B.setPosition(st, null); B.setDeco({});
      B.update({ interactive: false });
      var pre = (ex.pre || []).slice();
      if (pre.length) api.status('<p class="small">Siyah oynuyor…</p>');
      (function runPre() {
        if (!pre.length) {
          api.status('<p class="small">Sıra sende (beyaz).</p>');
          B.update({ interactive: true, mode: 'move', color: 'w', onMove: onMove });
          return;
        }
        var m = E.moveFromUci(st, pre.shift());
        api.later(function () { st = E.makeMove(st, m); B.setPosition(st, m); runPre(); }, 700);
      })();
    }
    function onMove(m) {
      var uci = E.toUci(m);
      var after = E.makeMove(st, m);
      var good = (ex.alsoGood && ex.alsoGood[step]) || [];
      if (expected().indexOf(uci) >= 0 || E.status(after) === 'checkmate') {
        st = after; step++;
        B.setPosition(st, m);
        B.flash(m.to, 'good', 500);
        B.setDeco({});
        hintLevel = 0;
        if (step >= ex.line.length || E.status(st) === 'checkmate') { api.feedback('Doğru!', 'good'); api.finish({ solved: true }); return; }
        api.feedback('Doğru! Siyahın cevabını bekle…', 'good');
        B.update({ interactive: false });
        api.later(function () {
          var r = E.moveFromUci(st, ex.line[step]);
          var txt = E.san(st, r);
          st = E.makeMove(st, r); step++;
          B.setPosition(st, r);
          api.feedback('Siyah <b>' + txt + '</b> oynadı. Devam et.', 'info');
          B.update({ interactive: true });
        }, 650);
        return;
      }
      if (good.indexOf(uci) >= 0) {
        api.feedback('İyi bir hamle, ama daha doğrudan bir yol var. Tekrar dene.', 'info');
        B.setPosition(st); return;
      }
      var msg = (ex.wrong && ex.wrong[uci]) || ex.wrongDefault || 'Bu hamle çözüm değil. Tekrar dene.';
      B.setPosition(st);
      B.flash([m.from, m.to], 'bad', 700);
      api.mistake(msg);
    }
    start();
    return {
      reset: function () { start(); api.feedback(''); },
      hint: function () {
        var u = expected()[0], m = E.moveFromUci(st, u);
        if (!m) return;
        api.hint();
        hintLevel++;
        if (hintLevel === 1) { B.setDeco({ focus: [m.from] }); api.feedback((ex.hint ? ex.hint + ' ' : '') + 'Oynaman gereken taş çerçeveyle işaretlendi.', 'info'); }
        else { B.setDeco({ arrows: [[m.from, m.to]] }); api.feedback('Hamle okla gösterildi.', 'info'); }
      },
      reveal: function () {
        B.update({ interactive: false });
        (function stepFn() {
          if (step >= ex.line.length) { api.finish({ solved: true, revealed: true }); return; }
          var m = E.moveFromUci(st, ex.line[step]);
          st = E.makeMove(st, m); step++;
          B.setPosition(st, m);
          api.later(stepFn, 750);
        })();
      }
    };
  };

  TYPES.mate = function (ex, api) {
    var B = api.board, st, left, hintLevel, busy = false;
    function start() {
      st = E.parseFEN(ex.fen); left = ex.n; hintLevel = 0;
      B.setPosition(st, null); B.setDeco({});
      B.update({ interactive: true, mode: 'move', color: 'w', onMove: onMove });
      status();
    }
    function status() { api.status('<p class="small">' + (left === 1 ? 'Şimdi mat et.' : left + ' hamlede mat: beyaz oynar.') + '</p>'); }
    function onMove(m) {
      if (busy) return;
      var after = E.makeMove(st, m);
      var s = E.status(after);
      if (s === 'checkmate') { st = after; B.setPosition(st, m); api.feedback('Mat!', 'good'); api.finish({ solved: true }); return; }
      if (s === 'stalemate') { B.setPosition(st); B.flash(m.to, 'bad'); api.mistake('Bu hamle <b>pat</b> yapar: siyah şah altında değil ve hiç hamlesi yok. Oyun berabere biterdi.'); return; }
      if (left === 1) {
        B.setPosition(st); B.flash([m.from, m.to], 'bad');
        api.mistake(E.inCheck(after) ? 'Şah çektin ama siyahın bir kurtuluş yolu var. Mat değil.' : 'Bu hamle şah bile çekmiyor; mat için şah çekmen gerekir.');
        return;
      }
      busy = true;
      api.feedback('Hesaplanıyor…', 'info');
      api.later(function () {
        var forced = E.forcedAfter(after, left);
        if (!forced) {
          busy = false;
          var esc = E.bestDefense(after, left);
          B.setPosition(st); B.flash([m.from, m.to], 'bad');
          api.mistake(esc ? 'Bundan sonra siyah <b>' + E.san(after, esc) + '</b> oynayarak mattan kurtulur.' : 'Bu hamle zorlayıcı değil.');
          return;
        }
        st = after; left--; hintLevel = 0;
        B.setPosition(st, m);
        B.update({ interactive: false });
        api.feedback('Güçlü hamle! Siyah cevap veriyor…', 'good');
        api.later(function () {
          var r = E.search(st, { depth: 2, timeMs: 600 });
          var mv = r.move;
          var txt = E.san(st, mv);
          st = E.makeMove(st, mv);
          B.setPosition(st, mv);
          busy = false;
          B.update({ interactive: true });
          api.feedback('Siyah <b>' + txt + '</b> oynadı.', 'info');
          status();
        }, 500);
      }, 30);
    }
    start();
    return {
      reset: function () { start(); api.feedback(''); },
      hint: function () {
        api.feedback('Hesaplanıyor…', 'info');
        api.later(function () {
          var m = E.findForcedMate(st, left);
          if (!m) return;
          api.hint();
          hintLevel++;
          if (hintLevel === 1) { B.setDeco({ focus: [m.from] }); api.feedback((ex.hint ? ex.hint + ' ' : '') + 'Kullanman gereken taş çerçeveyle işaretlendi.', 'info'); }
          else { B.setDeco({ arrows: [[m.from, m.to]] }); api.feedback('Hamle okla gösterildi.', 'info'); }
        }, 30);
      },
      reveal: function () {
        B.update({ interactive: false });
        (function stepFn() {
          var m = E.findForcedMate(st, left);
          if (!m) { api.finish({ solved: true, revealed: true }); return; }
          st = E.makeMove(st, m); B.setPosition(st, m); left--;
          if (E.status(st) === 'checkmate') { api.later(function () { api.finish({ solved: true, revealed: true }); }, 400); return; }
          api.later(function () {
            var r = E.search(st, { depth: 2, timeMs: 500 });
            st = E.makeMove(st, r.move); B.setPosition(st, r.move);
            api.later(stepFn, 700);
          }, 700);
        })();
      }
    };
  };

  // Bilgisayara karşı oyunsonu (vezir/kale ile mat). Konum Şah+Vezir/Kale–Şah ise
  // savunma ve ipuçları KXK çözücüsünden (kesin sonuç), değilse arama motorundan gelir.
  TYPES.endgame = function (ex, api) {
    var B = api.board, st, moves, hist, over, optimal = 0, slack = 0;
    var X = root.KXK;
    function status() {
      api.status('<div class="stat-row"><span>Hamle: <b>' + moves + '</b> / ' + ex.maxMoves + '</span>' + (optimal ? '<span>En kısa mat: <b>' + optimal + '</b> hamle</span>' : '') + '</div>');
    }
    function start() {
      st = E.parseFEN(ex.fen); moves = 0; hist = []; over = false;
      B.setPosition(st, null); B.setDeco({});
      if (X && X.applies(st)) {
        api.status('<p class="small">Oyunsonu tablosu hazırlanıyor…</p>');
        api.later(function () {
          var p = X.probe(st);
          optimal = p && p.win ? Math.ceil(p.dtm / 2) : 0;
          slack = /R/.test(ex.fen.split(' ')[0]) ? 4 : 2;
          B.update({ interactive: true, mode: 'move', color: 'w', onMove: onMove });
          status();
        }, 40);
      } else {
        B.update({ interactive: true, mode: 'move', color: 'w', onMove: onMove });
        status();
      }
    }
    function failAttempt(msg) {
      over = true;
      B.update({ interactive: false });
      api.mistake(msg + ' “Baştan başla” ile yeniden dene.');
    }
    function blackReply() {
      if (X && X.applies(st)) return X.bestBlack(st, E);
      return E.search(st, { depth: 4, timeMs: 900 }).move;
    }
    function onMove(m) {
      if (over) return;
      hist.push(st);
      st = E.makeMove(st, m); moves++;
      B.setPosition(st, m); status();
      var s = E.status(st);
      if (s === 'checkmate') {
        api.feedback('Mat! ' + moves + ' hamlede bitirdin' + (optimal ? ' (en kısa yol ' + optimal + ' hamleydi).' : '.'), 'good');
        api.finish({ solved: true, moves: moves, par: optimal ? optimal + slack : Math.round(ex.maxMoves * 0.5), parLabel: 'hedef' });
        return;
      }
      if (s === 'stalemate') { failAttempt('<b>Pat!</b> Siyahın hiç hamlesi yok ama şah altında değil: oyun berabere.'); return; }
      if (moves >= ex.maxMoves) { failAttempt('Hamle sınırı doldu.'); return; }
      B.update({ interactive: false });
      api.feedback('Bilgisayar düşünüyor…', 'info');
      api.later(function () {
        var r = blackReply();
        st = E.makeMove(st, r);
        B.setPosition(st, r);
        if (E.status(st) === 'insufficient') { failAttempt('Siyah şah taşını aldı; artık mat mümkün değil.'); return; }
        api.feedback('Siyah şah <b>' + E.sqName(r.to) + '</b> karesine gitti.', 'info');
        B.update({ interactive: true });
      }, 200);
    }
    start();
    return {
      reset: function () { start(); api.feedback(''); },
      undo: function () {
        if (hist.length === 0) return;
        api.hint();
        st = hist.pop(); moves--; over = false;
        B.setPosition(st, null); status();
        B.update({ interactive: true });
        api.feedback('Son hamlen geri alındı (ipucu olarak sayılır).', 'info');
      },
      hint: function () {
        if (over) return;
        api.hint();
        var m = X && X.applies(st) ? X.bestWhite(st, E) : E.search(st, { depth: 4, timeMs: 900 }).move;
        if (!m) return;
        B.setDeco({ arrows: [[m.from, m.to]] });
        var p = X && X.applies(E.makeMove(st, m)) ? X.probe(E.makeMove(st, m)) : null;
        api.feedback((ex.hint ? ex.hint + ' ' : '') + 'En kısa mata götüren hamle okla gösterildi' + (p && p.win ? ' (bundan sonra en fazla ' + Math.ceil(p.dtm / 2) + ' hamlede mat).' : '.'), 'info');
      },
      reveal: function () { api.finish({ solved: true, revealed: true }); },
      revealLabel: 'Alıştırmayı geç'
    };
  };

  // Şah+Piyon–Şah: kusursuz savunmaya karşı terfi
  TYPES.kpk = function (ex, api) {
    var B = api.board, st, hist, busy = false;
    function start() {
      st = E.parseFEN(ex.fen); hist = [];
      B.setPosition(st, null); B.setDeco({});
      api.status('<p class="small">Oyunsonu tablosu hazırlanıyor…</p>');
      api.later(function () {
        root.KPK.probe(st); // tabloyu hazırla
        api.status('<p class="small">Sıra sende. Hedef: piyonu güvenle terfi ettirmek.</p>');
        B.update({ interactive: true, mode: 'move', color: 'w', onMove: onMove });
      }, 40);
    }
    function onMove(m) {
      if (busy) return;
      if (!root.KPK.moveKeepsWin(st, m, E)) {
        var bad = E.makeMove(st, m);
        B.setPosition(bad, m);
        B.flash([m.to], 'bad', 900);
        busy = true;
        api.mistake('Bu hamleyle kazanç kaçar: siyah artık beraberliği zorlayabilir. Hamle geri alınıyor.');
        api.later(function () { busy = false; B.setPosition(st, null); }, 1100);
        return;
      }
      hist.push(st);
      st = E.makeMove(st, m);
      B.setPosition(st, m);
      if (m.promotion) { api.feedback('Piyon terfi etti ve yeni taşın güvende. Kazandın!', 'good'); api.finish({ solved: true }); return; }
      busy = true;
      B.update({ interactive: false });
      api.later(function () {
        var r = root.KPK.bestBlackMove(st, E);
        st = E.makeMove(st, r);
        B.setPosition(st, r);
        busy = false;
        B.update({ interactive: true });
        api.feedback('Siyah şah <b>' + E.sqName(r.to) + '</b> karesine gitti.', 'info');
      }, 450);
    }
    start();
    return {
      reset: function () { start(); api.feedback(''); },
      hint: function () {
        var ms = root.KPK.winningMoves(st, E);
        if (!ms.length) return;
        api.hint();
        var best = ms.map(function (m) {
          var n = E.makeMove(st, m), pr = root.KPK.probe(n);
          return { m: m, d: m.promotion ? -1 : (pr ? pr.dtw : 99) };
        }).sort(function (a, b) { return a.d - b.d; })[0].m;
        B.setDeco({ arrows: [[best.from, best.to]] });
        api.feedback((ex.hint ? ex.hint + ' ' : '') + 'Kazancı koruyan bir hamle okla gösterildi.', 'info');
      },
      reveal: function () { api.finish({ solved: true, revealed: true }); },
      revealLabel: 'Alıştırmayı geç'
    };
  };

  // ------------------------------------------------------------------
  // Bilgisayara karşı oyun (alıştırma ve serbest oyun ortak bileşeni)
  // ------------------------------------------------------------------
  function GameController(B, opts) {
    // opts: { level, color, onEnd(outcome, reason), onUpdate(info) }
    var self = this;
    this.B = B; this.opts = opts;
    this.level = LEVELS[opts.level] || LEVELS.orta;
    this.color = opts.color || 'w';
    this.reset();
  }
  GameController.prototype.reset = function () {
    this.st = E.parseFEN(E.START_FEN);
    this.hist = [];
    this.keys = [E.positionKey(this.st)];
    this.sans = [];
    this.over = null;
    this.thinking = false;
    this.B.update({ interactive: true, mode: 'move', color: this.color, orientation: this.color, onMove: this.userMove.bind(this) });
    this.B.setPosition(this.st, null);
    this.B.setDeco({});
    this.emit();
    if (this.color === 'b') this.engineMove();
  };
  GameController.prototype.emit = function () { if (this.opts.onUpdate) this.opts.onUpdate(this); };
  GameController.prototype.apply = function (m) {
    this.hist.push({ st: this.st, keys: this.keys.slice(), sans: this.sans.slice() });
    this.sans.push(E.san(this.st, m));
    this.st = E.makeMove(this.st, m);
    this.keys.push(E.positionKey(this.st));
    this.B.setPosition(this.st, m);
    this.checkEnd();
    this.emit();
  };
  GameController.prototype.checkEnd = function () {
    var s = E.status(this.st), me = this.color;
    var k = this.keys[this.keys.length - 1];
    var reps = this.keys.filter(function (x) { return x === k; }).length;
    var res = null;
    if (s === 'checkmate') res = { outcome: this.st.turn === me ? 'loss' : 'win', reason: 'Mat' };
    else if (s === 'stalemate') res = { outcome: 'draw', reason: 'Pat' };
    else if (s === 'insufficient') res = { outcome: 'draw', reason: 'Mat için yetersiz taş' };
    else if (s === 'fifty') res = { outcome: 'draw', reason: '50 hamle kuralı' };
    else if (reps >= 3) res = { outcome: 'draw', reason: 'Üç kez aynı konum' };
    if (res) this.end(res.outcome, res.reason);
  };
  GameController.prototype.end = function (outcome, reason) {
    if (this.over) return;
    this.over = { outcome: outcome, reason: reason };
    this.B.update({ interactive: false });
    if (this.opts.onEnd) this.opts.onEnd(outcome, reason);
  };
  GameController.prototype.userMove = function (m) {
    if (this.over || this.thinking) return;
    this.apply(m);
    if (!this.over) this.engineMove();
  };
  GameController.prototype.engineMove = function () {
    var self = this;
    this.thinking = true;
    this.B.update({ interactive: false });
    this.emit();
    setTimeout(function () {
      if (self.B.destroyed || self.over) return;
      var avoid = self.keys.slice();
      var r = E.search(self.st, { depth: self.level.depth, timeMs: self.level.timeMs, noise: self.level.noise, avoid: avoid });
      self.thinking = false;
      if (!r || !r.move) return;
      self.apply(r.move);
      if (!self.over) self.B.update({ interactive: true });
      self.emit();
    }, 60);
  };
  GameController.prototype.undo = function () {
    if (this.thinking || this.hist.length < 1) return false;
    // Kullanıcının son hamlesine kadar geri al
    var steps = this.st.turn === this.color ? 2 : 1;
    if (this.over && this.st.turn !== this.color) steps = 1;
    var h0 = null;
    for (var i = 0; i < steps && this.hist.length; i++) h0 = this.hist.pop();
    if (!h0) return false;
    this.st = h0.st; this.keys = h0.keys; this.sans = h0.sans; this.over = null;
    this.B.setPosition(this.st, null);
    this.B.update({ interactive: true });
    this.emit();
    if (this.st.turn !== this.color) this.engineMove();
    return true;
  };
  GameController.prototype.moveListText = function () {
    var out = [];
    for (var i = 0; i < this.sans.length; i += 2) out.push((i / 2 + 1) + '. ' + this.sans[i] + (this.sans[i + 1] ? ' ' + this.sans[i + 1] : ''));
    return out;
  };

  function renderMoveList(host, gc) {
    host.innerHTML = '';
    var list = gc.moveListText();
    if (!list.length) { host.appendChild(h('p.small', { text: 'Henüz hamle yok.' })); return; }
    var ol = h('ol.movelist');
    list.forEach(function (t) { ol.appendChild(h('li', { text: t.replace(/^\d+\.\s/, '') })); });
    host.appendChild(ol);
    host.scrollTop = host.scrollHeight;
  }

  TYPES.game = function (ex, api, extra) {
    var B = api.board, ml = h('div.movelist-wrap');
    extra.appendChild(ml);
    var gc = new GameController(B, {
      level: ex.level, color: 'w',
      onUpdate: function (g) {
        renderMoveList(ml, g);
        api.status('<p class="small">Seviye: <b>' + g.level.name + '</b> · ' + (g.over ? 'Oyun bitti' : g.thinking ? 'Bilgisayar düşünüyor…' : (E.inCheck(g.st) ? 'Şah altındasın!' : 'Sıra sende')) + '</p>');
      },
      onEnd: function (outcome, reason) {
        var r = P.recordGame(ex.level, outcome);
        if (r.xp) UI.toast('Oyun: +' + r.xp + ' XP', 'good');
        if (outcome === 'win') { api.feedback('Kazandın (' + reason + ')!', 'good'); api.finish({ solved: true }); }
        else {
          api.countMistake();
          api.feedback((outcome === 'draw' ? 'Berabere: ' : 'Kaybettin: ') + reason + '. Bu alıştırma için kazanman gerekiyor; “Yeni oyun” ile tekrar dene.', outcome === 'draw' ? 'info' : 'bad');
        }
      }
    });
    return {
      extraControls: [{ label: 'Yeni oyun', kind: 'secondary', icon: 'reset', onClick: function () { gc.reset(); api.feedback(''); } }],
      undo: function () { if (gc.undo()) { api.hint(); api.feedback('Hamle geri alındı (ipucu olarak sayılır).', 'info'); } },
      reveal: function () { api.finish({ solved: true, revealed: true }); },
      revealLabel: 'Alıştırmayı geç'
    };
  };

  root.Trainer = { openLesson: openLesson, openExercise: openExercise, GameController: GameController, LEVELS: LEVELS, renderMoveList: renderMoveList, topbar: topbar, starsPlan: starsPlan, TYPE_LABEL: TYPE_LABEL };
})(typeof window !== 'undefined' ? window : globalThis);
