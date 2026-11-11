/*
 * Ekranlar: ana sayfa, öğrenme yolu, özel hamleler atölyesi (ikinci arayüz),
 * gelişim paneli, serbest oyun, sözlük ve seviye belirleme sınavı.
 */
(function (root) {
  'use strict';
  var E = root.ChessEngine, UI = root.UI, h = UI.h, P = root.Progress, C = root.CURRICULUM, SP = root.SPECIAL, T = root.Trainer;
  var Views = {};
  var app = function () { return root.App; };

  function screen(cls) { return h('section.screen.' + cls); }
  function sectionOf(id) { return C.sections.filter(function (s) { return s.id === id; })[0]; }

  // ------------------------------------------------------------------
  // Ana sayfa
  // ------------------------------------------------------------------
  Views.home = function () {
    var s = P.state, lv = P.levelForXp(s.xp), prof = P.currentProfile(), next = P.nextStep();
    var cur = P.xpForLevel(lv), nxt = P.xpForLevel(lv + 1);
    var el = screen('home');
    var boardHost = h('div.hero-board');
    var deco = h('div.bh-deco.only-bauhaus', { 'aria-hidden': 'true' });
    ['c1', 's1', 't1', 'b1', 'h1'].forEach(function (c) { deco.appendChild(h('i.' + c)); });
    boardHost.appendChild(deco);
    var nextLabel = next ? (next.kind === 'lesson' ? 'Ders: ' + next.lesson.title : 'Alıştırma: ' + next.ex.title) : 'Tüm bölümleri bitirdin';
    var hero = h('div.hero',
      h('div.hero-text',
        h('p.eyebrow', { text: 'Oyuncu profili: ' + prof.name }),
        h('h1', { text: s.xp ? 'Tekrar hoş geldin, ' + s.name + '.' : 'Satrancı sıfırdan ustalığa, adım adım öğren.' }),
        h('p.lead', { text: 'Sekiz bölüm, en basit kurallardan usta seviyesine doğru sırayla ilerler. Her bölümde ders kartları ve alıştırmalar var; özel hamleler kendi atölyesinde, gelişimin ayrıntılı panelde.' }),
        h('div.level-block',
          h('div.level-line', h('b', { text: 'Seviye ' + lv }), h('span', { text: P.titleFor(lv) + ' unvanı' }), h('span.muted', { text: (s.xp - cur) + ' / ' + (nxt - cur) + ' XP' })),
          UI.bar(100 * (s.xp - cur) / (nxt - cur))),
        h('div.hero-actions',
          UI.btn(next ? 'Devam et' : 'Gelişimi gör', { kind: 'primary', icon: 'next', onClick: function () { if (next) app().openStep(next); else location.hash = '#gelisim'; } }),
          !s.placement ? UI.btn('Deneyimliyim: seviye belirleme sınavı', { kind: 'secondary', icon: 'target', onClick: function () { Views.placement(); } }) : null),
        h('p.next-label', { text: 'Sıradaki: ' + nextLabel })),
      boardHost);
    el.appendChild(hero);

    // Bauhaus teması: taşların biçimi hareketini anlatır
    var legend = h('div.bh-legend');
    [['P', 'Piyon', 'Küçük küp: tek adım ileri'], ['R', 'Kale', 'Küp: düz hatlar'], ['B', 'Fil', 'X: çaprazlar'],
     ['N', 'At', 'L: L biçiminde sıçrar'], ['Q', 'Vezir', 'Küp üstünde küre: her yön'], ['K', 'Şah', 'Döndürülmüş küp: her yöne bir kare']].forEach(function (x) {
      var d = h('div');
      d.innerHTML = root.bauhausSVG ? root.bauhausSVG(x[0]) : '';
      d.appendChild(h('b', { text: x[1] }));
      d.appendChild(h('span', { text: x[2] }));
      legend.appendChild(d);
    });
    el.appendChild(h('div.block.only-bauhaus',
      h('h2', { text: 'Biçim, hareketi anlatır' }),
      h('p.muted', { text: 'Bu temadaki taşlar, Bauhaus okulunda Josef Hartwig\u2019in 1920\u2019lerde tasarladığı satranç takımından esinlenir: her taşın biçimi nasıl hareket ettiğini gösterir.' }),
      legend));

    // Oyuncu profili merdiveni: en basitten en deneyimliye
    var ladder = h('ol.ladder', { 'aria-label': 'Oyuncu profili merdiveni' });
    C.sections.forEach(function (sec) {
      var st = P.sectionStats(sec);
      ladder.appendChild(h('li.' + (st.done ? 'done' : st.unlocked ? 'open' : 'locked'),
        h('span.ladder-no', { text: sec.no }),
        h('span.ladder-name', { text: sec.profile }),
        h('span.ladder-state', { text: st.done ? 'Tamam' : st.unlocked ? '%' + st.pct : 'Kilitli' })));
    });
    el.appendChild(h('div.block', h('h2', { text: 'Oyuncu profilleri' }), h('p.muted', { text: 'Her bölüm bir oyuncu profili için hazırlandı. Bir bölümün alıştırmalarının en az %75’ini çözünce bir sonraki profile geçersin.' }), ladder));

    var t = P.totals(), tp = SP.topics.reduce(function (a, x) { var q = P.topicStats(x); return a + q.solved; }, 0);
    var tpTotal = SP.topics.reduce(function (a, x) { return a + x.exercises.length; }, 0);
    var cards = h('div.cards',
      card('Öğrenme Yolu', '8 bölüm, ' + C.sections.reduce(function (a, x) { return a + x.lessons.length; }, 0) + ' ders, ' + C.sections.reduce(function (a, x) { return a + x.exercises.length; }, 0) + ' alıştırma.', prof.completedSections + ' / 8 bölüm tamam', '#yol', 'book'),
      card('Özel Hamleler Atölyesi', 'Rok, geçerken alma, terfi ve çift adım; rok laboratuvarı ile birlikte.', tp + ' / ' + tpTotal + ' alıştırma', '#ozel', 'gear'),
      card('Gelişim Paneli', 'Seviye, tahmini puan, beceri alanları, seri, rozetler ve geçmiş.', t.solved + ' alıştırma çözüldü', '#gelisim', 'star'),
      card('Bilgisayara Karşı Oyna', 'Üç zorluk seviyesi; beyaz veya siyahla tam oyun.', s.games.played + ' oyun oynandı', '#oyna', 'play'));
    el.appendChild(cards);

    var b = new root.BoardView(boardHost, { interactive: false });
    var demoFen = next && next.kind === 'exercise' && next.ex.fen ? next.ex.fen : '6rk/6pp/8/6N1/8/8/5PPP/6K1 w - - 0 1';
    b.setPosition(E.parseFEN(demoFen), null);
    b.setDeco({ check: true });
    boardHost.appendChild(h('p.board-caption', { text: 'Tahta görünümünü üst menüdeki 2B / 3B düğmesiyle değiştirebilirsin.' }));
    return { el: el, destroy: function () { b.destroy(); } };
  };

  function card(title, text, meta, href, ic) {
    var a = h('a.card-link', { href: href });
    a.innerHTML = UI.icon(ic);
    a.appendChild(h('h3', { text: title }));
    a.appendChild(h('p', { text: text }));
    a.appendChild(h('p.card-meta', { text: meta }));
    return a;
  }

  // ------------------------------------------------------------------
  // Öğrenme yolu
  // ------------------------------------------------------------------
  Views.path = function (openId) {
    var el = screen('path');
    el.appendChild(h('div.page-head',
      h('p.eyebrow', { text: 'Birinci arayüz' }),
      h('h1', { text: 'Öğrenme Yolu' }),
      h('p.lead', { text: 'Bölümler en basitten en deneyimli oyuncu profiline doğru sıralanır. Önce dersleri oku, sonra alıştırmaları sırayla çöz. Bir bölümün alıştırmalarının en az %75’ini çözünce sıradaki bölüm açılır.' })));
    var ol = h('ol.stations');
    var open = openId || app().pathOpen || (P.nextStep() && P.nextStep().section.id);
    C.sections.forEach(function (sec) {
      var st = P.sectionStats(sec);
      var li = h('li.station.' + (st.done ? 'done' : st.unlocked ? 'open' : 'locked'));
      var head = h('button.station-head', { type: 'button', 'aria-expanded': String(open === sec.id) },
        h('span.station-no', { text: String(sec.no) }),
        h('span.station-main',
          h('span.station-title', { text: sec.title }),
          h('span.station-profile', { text: 'Hedef profil: ' + sec.profile }),
          h('span.station-summary', { text: sec.summary })),
        h('span.station-side',
          st.unlocked ? UI.stars(Math.round(3 * st.stars / st.maxStars)) : h('span.lock', { html: UI.icon('lock') }),
          h('span.station-pct', { text: st.unlocked ? '%' + st.pct : 'Kilitli' })));
      li.appendChild(head);
      li.appendChild(UI.bar(st.pct, 'thin'));
      var detail = h('div.station-detail', { hidden: open !== sec.id });
      head.addEventListener('click', function () {
        var isOpen = !detail.hidden;
        detail.hidden = isOpen;
        head.setAttribute('aria-expanded', String(!isOpen));
        if (!isOpen) { app().pathOpen = sec.id; fill(); }
      });
      function fill() {
        detail.innerHTML = '';
        if (!st.unlocked) {
          detail.appendChild(h('p.locked-note', { text: 'Bu bölüm kilitli. Açmak için ' + (sec.no - 1) + '. bölümün alıştırmalarının en az %75’ini çöz ya da seviye belirleme sınavına gir.' }));
          detail.appendChild(UI.btn('Seviye belirleme sınavı', { kind: 'secondary', icon: 'target', onClick: function () { Views.placement(); } }));
          return;
        }
        detail.appendChild(h('h3', { text: 'Dersler (' + st.read + ' / ' + st.lessons + ')' }));
        var ll = h('div.lesson-list');
        sec.lessons.forEach(function (l, i) {
          var read = !!P.state.lessons[l.id];
          var b = h('button.lesson-item' + (read ? '.read' : ''), { type: 'button', on: { click: function () { app().openLesson(sec, l); } } },
            h('span.li-no', { text: sec.no + '.' + (i + 1) }), h('span', { text: l.title }), h('span.li-state', { html: read ? UI.icon('check') : '' }));
          ll.appendChild(b);
        });
        detail.appendChild(ll);
        detail.appendChild(h('h3', { text: 'Alıştırmalar (' + st.solved + ' / ' + st.total + ')' }));
        if (!P.lessonsRead(sec) && !(P.state.placement && P.state.placement.passed > sec.no - 1)) detail.appendChild(h('p.small', { text: 'İlk alıştırma, bu bölümün dersleri okununca açılır.' }));
        var grid = h('div.ex-grid');
        sec.exercises.forEach(function (ex, i) { grid.appendChild(exTile(sec, ex, i)); });
        detail.appendChild(grid);
      }
      if (open === sec.id) fill();
      li.appendChild(detail);
      ol.appendChild(li);
    });
    el.appendChild(ol);
    return { el: el };
  };

  function exTile(sec, ex, i) {
    var rec = P.state.ex[ex.id];
    var avail = P.exerciseAvailable(sec, i);
    var cls = 'ex-tile' + (rec && rec.status === 'solved' ? ' solved' : rec && rec.status === 'revealed' ? ' revealed' : '') + (avail ? '' : ' locked');
    var b = h('button.' + cls.split(' ').join('.'), { type: 'button', disabled: !avail, on: { click: function () { app().openExercise(sec, i); } } },
      h('span.ex-no', { text: String(i + 1) }),
      h('span.ex-title', { text: ex.title }),
      h('span.chip', { text: T.TYPE_LABEL[ex.type] }),
      avail ? UI.stars(rec && rec.status === 'solved' ? rec.stars : 0) : h('span.lock', { html: UI.icon('lock') }));
    if (!avail) b.title = 'Önceki alıştırmayı bitirince açılır';
    return b;
  }

  // ------------------------------------------------------------------
  // Özel Hamleler Atölyesi (ikinci arayüz)
  // ------------------------------------------------------------------
  Views.special = function (topicId) {
    var el = screen('atelier');
    var tabs = SP.topics.map(function (t) { return { id: t.id, title: t.title, glyph: t.glyph, topic: t }; });
    tabs.push({ id: 'lab', title: 'Rok Laboratuvarı', glyph: 'r' });
    var cur = topicId || app().specialTab || 'rok';
    el.appendChild(h('div.atelier-head',
      h('div',
        h('p.eyebrow', { text: 'İkinci arayüz' }),
        h('h1', { text: 'Özel Hamleler Atölyesi' }),
        h('p.lead', { text: 'Normal hareket kurallarının dışında kalan dört özel durum: piyonun çift adımı, rok, geçerken alma ve terfi. Her konuda kuralların tam listesi, adım adım gösterim ve alıştırmalar var.' }))));
    var tablist = h('div.atelier-tabs', { role: 'tablist', 'aria-label': 'Özel hamle konuları' });
    var body = h('div.atelier-body');
    el.appendChild(tablist);
    el.appendChild(body);
    var current = null;
    function render() {
      tablist.innerHTML = '';
      tabs.forEach(function (t) {
        var stats = t.topic ? P.topicStats(t.topic) : null;
        var gl = h('span.atab-glyph.pc.w');
        root.drawPiece(gl, t.glyph.toUpperCase());
        var b = h('button.atab' + (t.id === cur ? '.on' : ''), { type: 'button', role: 'tab', 'aria-selected': String(t.id === cur), on: { click: function () { cur = t.id; app().specialTab = cur; render(); } } },
          gl,
          h('span.atab-title', { text: t.title }),
          h('span.atab-meta', { text: stats ? stats.solved + ' / ' + stats.total : 'Deney alanı' }));
        tablist.appendChild(b);
      });
      if (current && current.destroy) current.destroy();
      body.innerHTML = '';
      current = cur === 'lab' ? castleLab(body) : topicView(body, SP.topics.filter(function (t) { return t.id === cur; })[0]);
    }
    render();
    return { el: el, destroy: function () { if (current && current.destroy) current.destroy(); } };
  };

  function topicView(host, t) {
    var idx = 0, playing = false;
    var boardHost = h('div.atelier-board');
    var text = h('div.lesson-text');
    var counter = h('p.eyebrow');
    var demoRow = h('div.demo-row');
    var prev = UI.btn('Önceki', { kind: 'ghost', icon: 'back', onClick: function () { go(idx - 1); } });
    var nextB = UI.btn('Sonraki', { kind: 'secondary', onClick: function () { go(idx + 1); } });
    var rules = h('ol.rules');
    t.rules.forEach(function (r) { rules.appendChild(h('li', { html: r })); });
    var exList = h('div.ex-grid');
    t.exercises.forEach(function (ex, i) {
      var rec = P.state.ex[ex.id];
      exList.appendChild(h('button.ex-tile' + (rec && rec.status === 'solved' ? '.solved' : ''), { type: 'button', on: { click: function () { app().openSpecialExercise(t, i); } } },
        h('span.ex-no', { text: String(i + 1) }), h('span.ex-title', { text: ex.title }), h('span.chip', { text: T.TYPE_LABEL[ex.type] }), UI.stars(rec && rec.status === 'solved' ? rec.stars : 0)));
    });
    host.appendChild(h('div.atelier-grid',
      boardHost,
      h('div.atelier-panel',
        h('h2', { text: t.title }),
        counter, text, demoRow,
        h('div.lesson-nav', prev, nextB),
        h('details.rules-box', { open: true }, h('summary', { text: 'Kurallar (tam liste)' }), rules))));
    host.appendChild(h('div.block', h('h2', { text: 'Alıştırmalar' }), exList));
    var board = new root.BoardView(boardHost, { interactive: false });
    function show() {
      var c = t.cards[idx];
      counter.textContent = 'Kart ' + (idx + 1) + ' / ' + t.cards.length;
      text.innerHTML = '<p>' + c.text + '</p>';
      prev.disabled = idx === 0; nextB.disabled = idx === t.cards.length - 1;
      var st = E.parseFEN(c.fen);
      board.setPosition(st, null);
      var d = { marks: c.marks || [], arrows: c.arrows || [] };
      if (c.showMoves) {
        var from = E.sqIndex(c.showMoves), s2 = E.cloneState(st);
        s2.turn = E.colorOf(st.board[from]);
        var ms = E.legalMoves(s2, from);
        d.focus = [from]; d.targets = ms.map(function (m) { return m.to; }); d.captures = ms.filter(function (m) { return m.captured; }).map(function (m) { return m.to; });
      }
      board.setDeco(d);
      demoRow.innerHTML = '';
      if (c.demo) {
        demoRow.appendChild(UI.btn('Göster', { kind: 'primary', icon: 'play', onClick: function () { demo(c); } }));
        demoRow.appendChild(UI.btn('Baştan', { kind: 'ghost', icon: 'reset', onClick: function () { playing = false; show(); } }));
      }
    }
    function demo(c) {
      if (playing) return; playing = true;
      var st = E.parseFEN(c.fen), i = 0;
      board.setPosition(st, null); board.setDeco({});
      (function step() {
        if (!playing || board.destroyed) return;
        if (i >= c.demo.length) { playing = false; return; }
        var m = E.moveFromUci(st, c.demo[i++]);
        var txt = E.san(st, m);
        st = E.makeMove(st, m);
        board.setPosition(st, m);
        demoRow.lastChild && demoRow.lastChild.classList && demoRow.lastChild.classList.contains('demo-moves') ? demoRow.lastChild.textContent = txt : demoRow.appendChild(h('p.demo-moves', { text: txt }));
        setTimeout(step, 1000);
      })();
    }
    function go(i) { playing = false; idx = Math.max(0, Math.min(t.cards.length - 1, i)); show(); }
    show();
    return { destroy: function () { playing = false; board.destroy(); } };
  }

  // Rok laboratuvarı: taşları serbestçe yerleştir, rok koşullarını canlı gör.
  function castleLab(host) {
    var PRESETS = [
      { name: 'Başlangıç', fen: '4k3/8/8/8/8/8/PPPPPPPP/R3K2R w KQ - 0 1' },
      { name: 'f1 tehdit altında', fen: '4k3/8/8/8/2b5/8/PPPP1PPP/R3K2R w KQ - 0 1' },
      { name: 'b1 tehdit altında', fen: '4k3/8/8/8/4b3/8/PP1PPPPP/R3K2R w KQ - 0 1' },
      { name: 'Şah altında', fen: 'k3r3/8/8/8/8/8/PPPP1PPP/R3K2R w KQ - 0 1' },
      { name: 'Arada taş var', fen: '4k3/8/8/8/8/8/PPPPPPPP/R2QK1NR w KQ - 0 1' }
    ];
    var st = E.parseFEN(PRESETS[0].fen), picked = -1, tool = 'move';
    var flags = { kingMoved: false, hMoved: false, aMoved: false };
    var boardHost = h('div.atelier-board');
    var resultK = h('div.cond-box'), resultQ = h('div.cond-box');
    var toolRow = h('div.tool-row', { role: 'group', 'aria-label': 'Araç' });
    var TOOLS = [['move', 'Taşı taşı'], ['r', 'Siyah kale ekle'], ['b', 'Siyah fil ekle'], ['n', 'Siyah at ekle'], ['q', 'Siyah vezir ekle'], ['del', 'Taş sil']];
    TOOLS.forEach(function (tt) {
      var b = h('button.tool' + (tt[0] === tool ? '.on' : ''), { type: 'button', 'aria-pressed': String(tt[0] === tool), on: { click: function () { tool = tt[0]; picked = -1; Array.prototype.forEach.call(toolRow.children, function (c) { c.classList.toggle('on', c === b); c.setAttribute('aria-pressed', String(c === b)); }); draw(); } } }, h('span', { text: tt[1] }));
      toolRow.appendChild(b);
    });
    var presetRow = h('div.preset-row');
    PRESETS.forEach(function (p) {
      presetRow.appendChild(UI.btn(p.name, { kind: 'ghost', onClick: function () { st = E.parseFEN(p.fen); picked = -1; flags = { kingMoved: false, hMoved: false, aMoved: false }; syncChecks(); draw(); } }));
    });
    var checks = h('div.flag-row');
    var cbs = {};
    [['kingMoved', 'Şah daha önce oynadı'], ['hMoved', 'h1 kalesi daha önce oynadı'], ['aMoved', 'a1 kalesi daha önce oynadı']].forEach(function (f) {
      var id = 'lab-' + f[0];
      var cb = h('input', { type: 'checkbox', id: id, on: { change: function () { flags[f[0]] = cb.checked; draw(); } } });
      cbs[f[0]] = cb;
      checks.appendChild(h('label.check', { for: id }, cb, h('span', { text: f[1] })));
    });
    function syncChecks() { Object.keys(cbs).forEach(function (k) { cbs[k].checked = flags[k]; }); }
    host.appendChild(h('div.atelier-grid',
      boardHost,
      h('div.atelier-panel',
        h('h2', { text: 'Rok Laboratuvarı' }),
        h('p', { text: 'Taşları istediğin gibi yerleştir: “Taşı taşı” aracıyla bir taşa, sonra gideceği kareye tıkla. Siyah taş ekleyerek karelere saldır ve rok koşullarının nasıl değiştiğini canlı izle. Kırmızı kareler siyahın tehdit ettiği 1. sıra kareleridir.' }),
        toolRow, checks, presetRow,
        h('div.cond-grid', resultK, resultQ))));
    var board = new root.BoardView(boardHost, { interactive: true, mode: 'select', onSquare: onSquare });
    function onSquare(sq) {
      if (tool === 'move') {
        if (picked < 0) { if (st.board[sq]) { picked = sq; draw(); } return; }
        if (sq === picked) { picked = -1; draw(); return; }
        var p = st.board[picked];
        if (st.board[sq] && st.board[sq].toLowerCase() === 'k') { UI.toast('Şahın üzerine taş koyamazsın.'); return; }
        st.board[sq] = p; st.board[picked] = null; picked = -1;
      } else if (tool === 'del') {
        if (st.board[sq] && st.board[sq].toLowerCase() === 'k') { UI.toast('Şahlar silinemez.'); return; }
        st.board[sq] = null;
      } else {
        if (st.board[sq] && st.board[sq].toLowerCase() === 'k') { UI.toast('Şahın karesine taş koyamazsın.'); return; }
        st.board[sq] = tool;
      }
      draw();
    }
    function cond(side) {
      var B = st.board, k = 4, rookSq = side === 'K' ? 7 : 0;
      var pass = side === 'K' ? 5 : 3, land = side === 'K' ? 6 : 2;
      var between = side === 'K' ? [5, 6] : [1, 2, 3];
      var rows = [
        ['Şah e1’de ve hiç oynamadı', B[k] === 'K' && !flags.kingMoved],
        ['Kale ' + E.sqName(rookSq) + '’de ve hiç oynamadı', B[rookSq] === 'R' && !(side === 'K' ? flags.hMoved : flags.aMoved)],
        ['Aradaki kareler boş (' + between.map(E.sqName).join(', ') + ')', between.every(function (s) { return !B[s]; })],
        ['Şah şu anda şah altında değil', B[k] === 'K' && !E.isAttacked(B, k, 'b')],
        ['Şahın geçtiği ' + E.sqName(pass) + ' tehdit altında değil', !E.isAttacked(B, pass, 'b')],
        ['Şahın varacağı ' + E.sqName(land) + ' tehdit altında değil', !E.isAttacked(B, land, 'b')]
      ];
      var ok = rows.every(function (r) { return r[1]; });
      // Motorla çapraz kontrol: koşullar ile kural motorunun sonucu aynı olmalı.
      var s2 = E.cloneState(st);
      s2.castling = { K: !flags.kingMoved && !flags.hMoved, Q: !flags.kingMoved && !flags.aMoved, k: false, q: false };
      s2.turn = 'w';
      var engineOk = E.legalMoves(s2, 4).some(function (m) { return m.flags.indexOf(side === 'K' ? 'k' : 'q') >= 0; });
      return { rows: rows, ok: ok && engineOk };
    }
    function renderCond(box, title, c) {
      box.innerHTML = '';
      box.className = 'cond-box ' + (c.ok ? 'ok' : 'no');
      box.appendChild(h('h3', { text: title }));
      var ul = h('ul.cond-list');
      c.rows.forEach(function (r) { ul.appendChild(h('li.' + (r[1] ? 'yes' : 'no'), { html: UI.icon(r[1] ? 'check' : 'lock') }, h('span', { text: r[0] }))); });
      box.appendChild(ul);
      box.appendChild(h('p.verdict', { text: c.ok ? 'Yapılabilir' : 'Yapılamaz' }));
    }
    function draw() {
      var attacked = [];
      for (var s = 0; s < 8; s++) if (E.isAttacked(st.board, s, 'b')) attacked.push(s);
      board.setPosition(st, null);
      board.setDeco({ bad: attacked, focus: picked >= 0 ? [picked] : [], check: true });
      renderCond(resultK, 'Kısa rok (O-O)', cond('K'));
      renderCond(resultQ, 'Uzun rok (O-O-O)', cond('Q'));
    }
    draw();
    return { destroy: function () { board.destroy(); } };
  }

  // ------------------------------------------------------------------
  // Gelişim paneli
  // ------------------------------------------------------------------
  Views.progress = function () {
    var s = P.state, lv = P.levelForXp(s.xp), prof = P.currentProfile(), t = P.totals();
    var cur = P.xpForLevel(lv), nxt = P.xpForLevel(lv + 1);
    var el = screen('dash');
    var nameInput = h('input', { id: 'player-name', type: 'text', value: s.name, maxlength: 40, 'aria-label': 'Oyuncu adı' });
    nameInput.addEventListener('change', function () { P.setName(nameInput.value); UI.toast('Ad kaydedildi.'); });
    el.appendChild(h('div.page-head',
      h('p.eyebrow', { text: 'Kullanıcı seviye gelişimi' }),
      h('h1', { text: 'Gelişim Paneli' }),
      h('div.name-row', h('label', { for: 'player-name', text: 'Oyuncu adı' }), nameInput),
      h('p.lead', { text: prof.completedSections === 0
        ? 'Henüz bir bölümü tamamlamadın. İlk hedefin: 1. bölüm, ' + C.sections[0].title + '. Bir bölüm, alıştırmalarının %75’i çözülünce tamamlanır.'
        : 'Şu anki oyuncu profilin: ' + prof.name + ' (' + prof.completedSections + ' / 8 bölüm tamam). ' + (prof.completedSections < 8 ? 'Sıradaki hedef: ' + prof.nextSection.no + '. bölüm, ' + prof.nextSection.title + ' (' + prof.nextSection.profile + ').' : 'Tüm bölümleri tamamladın.') })));

    // Özet göstergeler
    var streak = P.streak();
    var kpis = h('div.kpis',
      kpi('Seviye', String(lv), P.titleFor(lv) + ' unvanı · ' + (s.xp - cur) + ' / ' + (nxt - cur) + ' XP', UI.bar(100 * (s.xp - cur) / (nxt - cur))),
      kpi('Tahmini bulmaca puanı', String(s.rating), 'Resmî FIDE Elo değildir', sparkline(s.ratingHistory.map(function (x) { return x.r; }))),
      kpi('Çözülen alıştırma', t.solved + ' / ' + t.total, 'İlk denemede kusursuz: %' + t.firstTryPct, UI.bar(100 * t.solved / t.total)),
      kpi('Günlük seri', streak + ' gün', 'Toplam çalışma: ' + UI.fmtTime(s.timeSpent), null));
    el.appendChild(kpis);

    // Profil yolculuğu + beceri radarı
    var journey = h('ol.journey');
    C.sections.forEach(function (sec) {
      var st = P.sectionStats(sec);
      var state = st.done ? 'done' : st.unlocked ? 'open' : 'locked';
      journey.appendChild(h('li.' + state,
        h('div.j-head', h('span.j-no', { text: String(sec.no) }), h('span.j-prof', { text: sec.profile }), h('span.j-state', { text: st.done ? 'Tamamlandı' : st.unlocked ? 'Devam ediyor' : 'Kilitli' })),
        h('div.j-meta', h('span', { text: sec.title }), h('span', { text: 'Ders ' + st.read + '/' + st.lessons + ' · Alıştırma ' + st.solved + '/' + st.total + ' · Yıldız ' + st.stars + '/' + st.maxStars })),
        UI.bar(st.pct, 'thin')));
    });
    var mastery = P.categoryMastery();
    var legend = h('table.mastery');
    legend.appendChild(h('thead', h('tr', h('th', { text: 'Alan' }), h('th', { text: 'Çözülen' }), h('th', { text: 'Ustalık' }))));
    var tb = h('tbody');
    Object.keys(C.categories).forEach(function (k) {
      tb.appendChild(h('tr', h('td', { text: C.categories[k] }), h('td.num', { text: mastery[k].solved + '/' + mastery[k].total }), h('td.num', { text: '%' + mastery[k].pct })));
    });
    legend.appendChild(tb);
    el.appendChild(h('div.grid-2',
      h('div.panel', h('h2', { text: 'Oyuncu profili yolculuğu' }), h('p.muted', { text: 'En basitten en deneyimli profile. Bölüm %75 çözülünce tamamlanmış sayılır.' }), journey),
      h('div.panel', h('h2', { text: 'Beceri alanları' }), h('p.muted', { text: 'Ustalık = o alandaki alıştırmalardan aldığın yıldızların, alınabilecek en fazla yıldıza oranı.' }), radar(mastery), legend)));

    // Grafikler
    el.appendChild(h('div.grid-2',
      h('div.panel', h('h2', { text: 'Son 14 gün' }), h('p.muted', { text: 'Günlük kazanılan XP.' }), dailyChart()),
      h('div.panel', h('h2', { text: 'Puan geçmişi' }), h('p.muted', { text: 'Tahmini bulmaca puanının değişimi (son 60 kayıt).' }), ratingChart(s.ratingHistory.slice(-60)))));

    // Öneriler + istatistik
    var weakest = Object.keys(mastery).filter(function (k) { return mastery[k].total; }).sort(function (a, b) { return mastery[a].pct - mastery[b].pct; })[0];
    var next = P.nextStep();
    var rec = h('ul.recs');
    if (next) rec.appendChild(h('li', h('span', { text: 'Sıradaki adım: ' + (next.kind === 'lesson' ? next.lesson.title + ' dersi' : next.ex.title + ' alıştırması') + ' (' + next.section.no + '. bölüm).' }), UI.btn('Başla', { kind: 'primary', onClick: function () { app().openStep(next); } })));
    if (weakest) rec.appendChild(h('li', h('span', { text: 'En zayıf alanın: ' + C.categories[weakest] + ' (%' + mastery[weakest].pct + '). Bu alandaki alıştırmaları tekrar çözerek yıldızlarını artırabilirsin.' })));
    if (!s.placement) rec.appendChild(h('li', h('span', { text: 'Satranç biliyorsan seviye belirleme sınavıyla bölümleri hızlıca açabilirsin.' }), UI.btn('Sınava gir', { kind: 'secondary', onClick: function () { Views.placement(); } })));
    var stats = h('dl.stats',
      dt('Okunan ders', t.lessons + ' / ' + t.lessonTotal), dt('Toplam hata', String(t.mistakes)), dt('Kullanılan ipucu', String(t.hints)),
      dt('Bilgisayara karşı', s.games.won + ' G · ' + s.games.drawn + ' B · ' + s.games.lost + ' M'), dt('Toplam XP', String(s.xp)), dt('Toplam süre', UI.fmtTime(s.timeSpent)),
      dt('Kayıt yeri', P.cloud.enabled ? 'Tarayıcı + bulut yedeği' : 'Bu tarayıcı'));
    el.appendChild(h('div.grid-2',
      h('div.panel', h('h2', { text: 'Öneriler' }), rec),
      h('div.panel', h('h2', { text: 'İstatistikler' }), stats)));

    // Rozetler
    var badges = h('div.badges');
    P.BADGES.forEach(function (b) {
      var got = s.badges[b.id];
      badges.appendChild(h('div.badge' + (got ? '.got' : ''), h('span.badge-mark', { html: UI.icon(got ? 'star' : 'lock') }), h('b', { text: b.name }), h('span', { text: b.desc }), h('span.badge-date', { text: got ? UI.fmtDate(got) : 'Henüz yok' })));
    });
    el.appendChild(h('div.panel', h('h2', { text: 'Rozetler (' + Object.keys(s.badges).length + ' / ' + P.BADGES.length + ')' }), badges));

    // Etkinlik geçmişi
    var logl = h('ol.log');
    if (!s.log.length) logl.appendChild(h('li.muted', { text: 'Henüz etkinlik yok. İlk dersini okuyarak başla.' }));
    s.log.slice(0, 15).forEach(function (e) { logl.appendChild(h('li', h('time', { text: UI.fmtDate(e.t) }), h('span', { text: e.text }))); });
    el.appendChild(h('div.panel', h('h2', { text: 'Son etkinlikler' }), logl));

    // Terimler
    el.appendChild(h('div.panel.terms', h('h2', { text: 'Bu paneldeki terimler' }), h('dl',
      dt('XP (deneyim puanı)', 'Ders okuyarak (5), alıştırma çözerek ve oyun oynayarak kazanılır. Bir alıştırmadan alınan XP, yıldız sayısıyla orantılıdır.'),
      dt('Seviye ve unvan', 'Toplam XP’ne göre artar (2. seviye 50 XP, 3. seviye 150 XP, 4. seviye 300 XP…). Unvan, seviye aralığına verilen addır: Piyon, At, Fil, Kale, Vezir, Şah, Büyük Şah. Resmî bir satranç unvanı değildir.'),
      dt('Yıldız', 'Hatasız ve ipuçsuz çözüm 3, en fazla 2 hata/ipucu 2, daha fazlası 1 yıldız. Yıldız alıştırmalarında en kısa yoldan fazla yapılan her hamle bir hata sayılır.'),
      dt('Tahmini bulmaca puanı', 'Elo yöntemine benzer bir hesap: her alıştırmanın bir zorluk puanı vardır; ilk denemendeki sonucuna göre puanın artar ya da azalır. Yalnızca bu uygulamadaki performansını gösterir; resmî FIDE Elo puanı değildir.'),
      dt('Oyuncu profili', 'Tamamladığın en yüksek bölümün hedef profili. 8 profil en basitten en deneyimliye sıralanır.'),
      dt('Günlük seri', 'Art arda kaç gün en az bir alıştırma çözdüğün veya XP kazandığın.'))));

    // Yedekleme
    var area = h('textarea', { id: 'backup-area', rows: 4, 'aria-label': 'Yedek metni', placeholder: 'Yedek metnini buraya yapıştır…' });
    el.appendChild(h('div.panel', h('h2', { text: 'Yedekle, geri yükle, sıfırla' }),
      h('p.muted', { text: 'İlerlemen bu tarayıcıda saklanır. Başka bir cihaza taşımak için yedek metnini kopyala, orada yapıştırıp “Geri yükle”ye bas.' }),
      area,
      h('div.controls',
        UI.btn('Yedeği kopyala', { kind: 'secondary', icon: 'copy', onClick: function () {
          area.value = P.exportJson();
          var done = function () { UI.toast('Yedek panoya kopyalandı.', 'good'); };
          try { navigator.clipboard.writeText(area.value).then(done, function () { area.select(); UI.toast('Kopyalanamadı; metin seçildi, elle kopyalayabilirsin.'); }); }
          catch (e) { area.select(); UI.toast('Metin seçildi, elle kopyalayabilirsin.'); }
        } }),
        UI.btn('Geri yükle', { kind: 'ghost', onClick: function () {
          try { P.importJson(area.value); UI.toast('İlerleme geri yüklendi.', 'good'); app().route(); }
          catch (e) { UI.toast(e.message || 'Yedek okunamadı.', 'bad'); }
        } }),
        UI.btn('İlerlemeyi sıfırla', { kind: 'danger', onClick: function () {
          UI.confirm({ title: 'Tüm ilerleme silinsin mi?', text: 'XP, yıldızlar, rozetler ve geçmiş kalıcı olarak silinir. Önce yedek almak isteyebilirsin.', ok: 'Sıfırla', danger: true }).then(function (ok) { if (ok) { P.reset(); UI.toast('İlerleme sıfırlandı.'); app().route(); } });
        } }))));
    return { el: el };
  };

  function kpi(label, value, sub, extra) {
    return h('div.kpi', h('p.kpi-label', { text: label }), h('p.kpi-value', { text: value }), h('p.kpi-sub', { text: sub }), extra || null);
  }
  function dt(a, b) { return h('div.dl-row', h('dt', { text: a }), h('dd', { text: b })); }

  var NS = 'http://www.w3.org/2000/svg';
  function svg(w, hgt, cls) {
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 ' + w + ' ' + hgt);
    s.setAttribute('class', 'chart ' + (cls || ''));
    s.setAttribute('role', 'img');
    return s;
  }
  function sv(parent, tag, attrs, text) {
    var e = document.createElementNS(NS, tag);
    Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (text !== undefined) e.textContent = text;
    parent.appendChild(e);
    return e;
  }

  function sparkline(vals) {
    var w = 160, hh = 36, s = svg(w, hh, 'spark');
    s.setAttribute('aria-label', 'Puan eğilimi');
    if (vals.length < 2) vals = [vals[0] || 400, vals[0] || 400];
    vals = vals.slice(-30);
    var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
    if (mx - mn < 40) { mx += 20; mn -= 20; }
    var pts = vals.map(function (v, i) { return [i * (w - 8) / (vals.length - 1) + 4, hh - 4 - (v - mn) / (mx - mn) * (hh - 8)]; });
    sv(s, 'polygon', { points: '4,' + (hh - 2) + ' ' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + ' ' + (w - 4) + ',' + (hh - 2), class: 'area' });
    sv(s, 'polyline', { points: pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '), class: 'line' });
    var last = pts[pts.length - 1];
    sv(s, 'circle', { cx: last[0], cy: last[1], r: 3, class: 'dot' });
    return s;
  }

  function radar(m) {
    var keys = Object.keys(C.categories), n = keys.length;
    var W = 340, H = 300, cx = W / 2, cy = 150, R = 100;
    var s = svg(W, H, 'radar');
    s.setAttribute('aria-label', 'Beceri alanları radar grafiği');
    function pt(i, r) { var a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; }
    [25, 50, 75, 100].forEach(function (p) {
      sv(s, 'polygon', { points: keys.map(function (k, i) { return pt(i, R * p / 100).join(','); }).join(' '), class: 'grid' });
    });
    keys.forEach(function (k, i) {
      var e = pt(i, R);
      sv(s, 'line', { x1: cx, y1: cy, x2: e[0], y2: e[1], class: 'grid' });
      var l = pt(i, R + 18);
      var anchor = Math.abs(l[0] - cx) < 10 ? 'middle' : l[0] > cx ? 'start' : 'end';
      sv(s, 'text', { x: l[0], y: l[1] + 4, 'text-anchor': anchor, class: 'lbl' }, C.categories[k]);
    });
    sv(s, 'text', { x: cx + 4, y: cy - R * 0.5 + 11, class: 'tick' }, '%50');
    sv(s, 'text', { x: cx + 4, y: cy - R + 11, class: 'tick' }, '%100');
    var poly = keys.map(function (k, i) { return pt(i, R * Math.max(2, m[k].pct) / 100).join(','); }).join(' ');
    sv(s, 'polygon', { points: poly, class: 'val' });
    keys.forEach(function (k, i) { var p = pt(i, R * Math.max(2, m[k].pct) / 100); sv(s, 'circle', { cx: p[0], cy: p[1], r: 3.5, class: 'dot' }); });
    return h('div.chart-wrap', s);
  }

  function dailyChart() {
    var days = [], d = new Date();
    for (var i = 13; i >= 0; i--) { var x = new Date(d); x.setDate(d.getDate() - i); days.push(x); }
    var vals = days.map(function (x) { var r = P.state.daily[P.dayKey(x)]; return r ? r.xp : 0; });
    var W = 420, H = 170, L = 34, B = 24, top = 12;
    var mx = Math.max(10, Math.max.apply(null, vals));
    mx = Math.ceil(mx / 10) * 10;
    var s = svg(W, H, 'bars');
    s.setAttribute('aria-label', 'Son 14 günün XP grafiği');
    [0, mx / 2, mx].forEach(function (v) {
      var y = H - B - (v / mx) * (H - B - top);
      sv(s, 'line', { x1: L, x2: W - 6, y1: y, y2: y, class: 'grid' });
      sv(s, 'text', { x: L - 6, y: y + 4, 'text-anchor': 'end', class: 'tick' }, String(v));
    });
    var bw = (W - L - 10) / 14;
    vals.forEach(function (v, i) {
      var bh = (v / mx) * (H - B - top);
      var x = L + i * bw + bw * 0.18;
      if (v) sv(s, 'rect', { x: x, y: H - B - Math.max(bh, 1.5), width: bw * 0.64, height: Math.max(bh, 1.5), rx: 2, class: i === 13 ? 'col today' : 'col' });
      if (i % 2 === 1 || i === 13) sv(s, 'text', { x: x + bw * 0.32, y: H - 8, 'text-anchor': 'middle', class: 'tick' }, String(days[i].getDate()));
      if (v) { var tt = sv(s, 'title', {}); tt.textContent = days[i].toLocaleDateString('tr-TR') + ': ' + v + ' XP'; }
    });
    return h('div.chart-wrap', s);
  }

  function ratingChart(hist) {
    var W = 420, H = 170, L = 40, B = 18, top = 12;
    var s = svg(W, H, 'line-chart');
    s.setAttribute('aria-label', 'Tahmini puan geçmişi');
    var vals = hist.map(function (x) { return x.r; });
    if (vals.length < 2) vals = [vals[0] || 400, vals[0] || 400];
    var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
    mn = Math.floor((mn - 20) / 50) * 50; mx = Math.ceil((mx + 20) / 50) * 50;
    [mn, (mn + mx) / 2, mx].forEach(function (v) {
      var y = H - B - (v - mn) / (mx - mn) * (H - B - top);
      sv(s, 'line', { x1: L, x2: W - 6, y1: y, y2: y, class: 'grid' });
      sv(s, 'text', { x: L - 6, y: y + 4, 'text-anchor': 'end', class: 'tick' }, String(Math.round(v)));
    });
    var pts = vals.map(function (v, i) { return [L + i * (W - L - 12) / (vals.length - 1), H - B - (v - mn) / (mx - mn) * (H - B - top)]; });
    sv(s, 'polygon', { points: L + ',' + (H - B) + ' ' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + ' ' + pts[pts.length - 1][0].toFixed(1) + ',' + (H - B), class: 'area' });
    sv(s, 'polyline', { points: pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '), class: 'line' });
    var last = pts[pts.length - 1];
    sv(s, 'circle', { cx: last[0], cy: last[1], r: 4, class: 'dot' });
    sv(s, 'text', { x: Math.min(last[0], W - 30), y: Math.max(last[1] - 8, 10), 'text-anchor': 'middle', class: 'val-lbl' }, String(vals[vals.length - 1]));
    return h('div.chart-wrap', s);
  }

  // ------------------------------------------------------------------
  // Serbest oyun
  // ------------------------------------------------------------------
  Views.play = function () {
    var el = screen('play');
    var level = app().playLevel || 'orta', color = app().playColor || 'w';
    var boardHost = h('div.trainer-board');
    var status = h('p.task-status');
    var ml = h('div.movelist-wrap');
    var resultEl = h('div.feedback', { role: 'status', 'aria-live': 'polite' });
    function seg(name, opts, curVal, onPick) {
      var g = h('div.seg', { role: 'group', 'aria-label': name });
      opts.forEach(function (o) {
        var b = h('button', { type: 'button', 'aria-pressed': String(o[0] === curVal), text: o[1], on: { click: function () { Array.prototype.forEach.call(g.children, function (c) { c.setAttribute('aria-pressed', String(c === b)); }); onPick(o[0]); } } });
        g.appendChild(b);
      });
      return g;
    }
    var panel = h('aside.trainer-panel',
      h('h2.panel-title', { text: 'Bilgisayara karşı oyna' }),
      h('div.field', h('span.field-label', { text: 'Zorluk' }), seg('Zorluk', [['kolay', 'Kolay'], ['orta', 'Orta'], ['zor', 'Zor']], level, function (v) { level = v; app().playLevel = v; newGame(); })),
      h('div.field', h('span.field-label', { text: 'Rengin' }), seg('Renk', [['w', 'Beyaz'], ['b', 'Siyah']], color, function (v) { color = v; app().playColor = v; newGame(); })),
      status, resultEl,
      h('div.controls',
        UI.btn('Yeni oyun', { kind: 'primary', icon: 'reset', onClick: function () { newGame(); } }),
        UI.btn('Geri al', { kind: 'ghost', icon: 'undo', onClick: function () { gc.undo(); resultEl.innerHTML = ''; } }),
        UI.btn('Teslim ol', { kind: 'ghost', icon: 'flag', onClick: function () { if (!gc.over) gc.end('loss', 'Teslim oldun'); } })),
      h('h3', { text: 'Hamleler' }), ml,
      h('p.small.muted', { text: 'Kolay seviye bilerek hata yapar; zor seviye birkaç hamle ileriyi hesaplar. Bilgisayarın gücü bir kulüp oyuncusuyla kıyaslanamaz; amaç pratiktir.' }));
    el.appendChild(h('div.page-head', h('p.eyebrow', { text: 'Pratik' }), h('h1', { text: 'Serbest Oyun' })));
    el.appendChild(h('div.trainer-grid', boardHost, panel));
    var B = new root.BoardView(boardHost, { interactive: true });
    var gc;
    function newGame() {
      resultEl.innerHTML = ''; resultEl.className = 'feedback';
      gc = new T.GameController(B, {
        level: level, color: color,
        onUpdate: function (g) {
          T.renderMoveList(ml, g);
          status.innerHTML = 'Seviye: <b>' + g.level.name + '</b> · ' + (g.over ? 'Oyun bitti' : g.thinking ? 'Bilgisayar düşünüyor…' : (g.st.turn === g.color ? (E.inCheck(g.st) ? 'Şah altındasın!' : 'Sıra sende') : 'Sıra bilgisayarda'));
        },
        onEnd: function (outcome, reason) {
          var r = P.recordGame(level, outcome);
          resultEl.className = 'feedback ' + (outcome === 'win' ? 'good' : outcome === 'draw' ? 'info' : 'bad');
          resultEl.innerHTML = '<b>' + (outcome === 'win' ? 'Kazandın' : outcome === 'draw' ? 'Berabere' : 'Kaybettin') + '</b> (' + reason + '). +' + r.xp + ' XP';
          (r.badges || []).forEach(function (b) { UI.toast('Yeni rozet: ' + b.name, 'good'); });
          if (r.levelUp) UI.toast('Seviye atladın: ' + r.levelUp + '. seviye!', 'good');
        }
      });
    }
    newGame();
    return { el: el, destroy: function () { B.destroy(); } };
  };

  // ------------------------------------------------------------------
  // Sözlük
  // ------------------------------------------------------------------
  var GLOSSARY = [
    ['Sütun', 'Tahtadaki dikey hat; a’dan h’ye harflerle adlandırılır.'],
    ['Sıra', 'Tahtadaki yatay hat; 1’den 8’e numaralanır.'],
    ['Çapraz', 'Aynı renkteki karelerin köşe köşe birleştiği eğik hat.'],
    ['Koordinat', 'Bir karenin adı: sütun harfi + sıra rakamı (ör. e4).'],
    ['Notasyon', 'Hamlelerin yazılış biçimi. Türkçe harfler: Ş şah, V vezir, K kale, F fil, A at; piyon için harf yok. x alma, + şah, # mat.'],
    ['Tehdit (saldırı)', 'Bir taşın bir sonraki hamlede bir kareye gidip orada taş alabilmesi.'],
    ['Şah çekmek', 'Rakip şaha saldırmak. Şahı şah altındaki oyuncu hemen kurtulmak zorundadır.'],
    ['Mat', 'Şah altındaki şahın kurtuluş yolu olmaması; oyunu bitirir.'],
    ['Pat', 'Sırası gelen oyuncunun şahı şah altında değilken hiç yasal hamlesinin olmaması; beraberliktir.'],
    ['Rok', 'Şahın kaleye doğru iki kare gidip kalenin şahın üzerinden atlayarak yanına geçtiği özel hamle (O-O, O-O-O).'],
    ['Geçerken alma (en passant)', 'İki kare ilerleyip piyonunun yanına gelen rakip piyonu, bir kare ilerlemiş gibi hemen sonraki hamlede alma.'],
    ['Terfi', 'Son sıraya ulaşan piyonun vezir, kale, fil veya ata dönüşmesi.'],
    ['Az terfi', 'Terfide vezir yerine başka bir taş seçmek.'],
    ['Değişim', 'Taş alıp karşılığında kendi taşını kaybetmek.'],
    ['Asılı taş', 'Korunmayan, karşılıksız alınabilecek taş.'],
    ['Gelişim', 'Açılışta at ve filleri başlangıç karelerinden çıkarıp oyuna sokmak.'],
    ['Merkez', 'd4, e4, d5 ve e5 kareleri.'],
    ['Taktik', 'Birkaç hamlelik zorlayıcı bir diziyle taş ya da mat kazanmak.'],
    ['Zorlayıcı hamle', 'Rakibin seçeneklerini daraltan hamle: şah çekmek, taş almak, tehdit yaratmak.'],
    ['Çatal', 'Bir taşın aynı anda iki veya daha fazla taşa saldırması.'],
    ['Açmaz', 'Kaçarsa arkasındaki daha değerli taşı açığa çıkaracağı için hareket edemeyen taş. Arkada şah varsa mutlak açmaz.'],
    ['Şiş', 'Değerli taşa saldırıp onu kaçmaya zorlayarak arkasındaki taşı kazanmak.'],
    ['Açarak saldırı', 'Bir taşın çekilmesiyle arkasındaki taşın saldırı hattının açılması. Şahsa açarak şah.'],
    ['Çifte şah', 'İki taşın aynı anda şah çekmesi; yalnızca şahı oynatarak kurtulunur.'],
    ['Feda', 'Daha büyük bir kazanç için bilerek taş vermek.'],
    ['Kombinasyon', 'Birden fazla taktiğin birleştiği, çoğu zaman fedayla başlayan zorlayıcı dizi.'],
    ['Koridor matı', 'Önü kendi piyonlarıyla kapalı şaha son sıradan verilen mat.'],
    ['Boğmaca matı', 'Kendi taşlarıyla çevrili şaha atla verilen mat.'],
    ['Oyunsonu', 'Taşların çoğu değiştirildikten sonraki aşama.'],
    ['Opozisyon (karşı karşıya durma)', 'Şahlar aralarında tek kareyle karşı karşıya dururken hamle sırası kendisinde olmayan tarafın üstünlüğü.'],
    ['Kilit kareler', 'Şahın ulaştığında piyonun terfisini garanti ettiği kareler (kale piyonu hariç, piyonun iki sıra önündeki üç kare).'],
    ['Kare kuralı', 'Rakip şahın, piyondan terfi karesine çizilen karenin içine girip giremeyeceğine bakarak piyonu yakalayıp yakalayamayacağını anlama yöntemi.'],
    ['Aday hamle', 'Ciddi biçimde düşünmeye değer görülen hamle.'],
    ['Açık hat', 'Üzerinde piyon olmayan sütun; kaleler için değerlidir.'],
    ['Çift, izole, geri kalmış piyon', 'Aynı sütunda iki piyon; komşu sütunlarında kendi piyonu olmayan piyon; komşularının gerisinde kalıp korunamayan piyon.'],
    ['XP', 'Uygulamadaki deneyim puanı; seviyeni belirler.'],
    ['Tahmini bulmaca puanı', 'Alıştırma sonuçlarından Elo yöntemine benzer biçimde hesaplanan puan; resmî FIDE Elo değildir.'],
    ['Oyuncu profili', 'Öğrenme yolundaki bölümlerin hedeflediği oyuncu düzeyi (Sıfırdan Başlayan’dan Usta Adayı’na).']
  ];
  Views.glossary = function () {
    var el = screen('glossary');
    el.appendChild(h('div.page-head', h('p.eyebrow', { text: 'Başvuru' }), h('h1', { text: 'Terimler Sözlüğü' }), h('p.lead', { text: 'Uygulamada geçen her satranç ve uygulama terimi burada tanımlıdır.' })));
    var dl = h('dl.glossary-list');
    GLOSSARY.forEach(function (g) { dl.appendChild(h('div.dl-row', h('dt', { text: g[0] }), h('dd', { text: g[1] }))); });
    el.appendChild(dl);
    return { el: el };
  };

  // ------------------------------------------------------------------
  // Seviye belirleme sınavı
  // ------------------------------------------------------------------
  var EXAM = ['s1e4', 's2e8', 's3e4', 's4e3', 's5e1', 's6e5', 's7e3', 's8e1'];
  Views.placement = function () {
    UI.confirm({
      title: 'Seviye belirleme sınavı',
      text: 'Her bölümden bir soru, kolaydan zora 8 soru. İpucu yok ve her soruda tek hata hakkın var. İlk hatada sınav biter; geçtiğin bölümler ve bir sonraki bölüm açılır. Bu sınav XP veya yıldız vermez.',
      ok: 'Başla'
    }).then(function (ok) { if (ok) run(0); });
    function run(i) {
      if (i >= EXAM.length) return done(EXAM.length);
      var info = P.catalog[EXAM[i]];
      app().showScreen(T.openExercise(info.ex, {
        crumb: 'Seviye belirleme · Soru ' + (i + 1) + ' / ' + EXAM.length + ' · ' + info.section.title,
        exam: true,
        onExit: function () { app().route(); },
        onExamResult: function (pass) {
          if (pass) { UI.toast('Doğru! ' + (i + 1) + '. bölüm geçildi.', 'good'); setTimeout(function () { run(i + 1); }, 700); }
          else setTimeout(function () { done(i); }, 900);
        }
      }));
    }
    function done(n) {
      P.setPlacement(n);
      var el = screen('placement-result');
      var opened = C.sections.slice(0, Math.min(n + 1, 8)).map(function (s) { return s.no + '. ' + s.title; });
      el.appendChild(h('div.page-head',
        h('p.eyebrow', { text: 'Sınav sonucu' }),
        h('h1', { text: n + ' / ' + EXAM.length + ' bölüm geçildi' }),
        h('p.lead', { text: 'Açık bölümler: ' + opened.join(', ') + '. Tahmini başlangıç puanın ' + P.state.rating + '.' }),
        h('div.controls', UI.btn('Öğrenme yoluna git', { kind: 'primary', onClick: function () { app().pathOpen = C.sections[Math.min(n, 7)].id; location.hash = '#yol'; app().route(); } }))));
      app().showScreen({ el: el });
    }
  };

  root.Views = Views;
})(typeof window !== 'undefined' ? window : globalThis);
