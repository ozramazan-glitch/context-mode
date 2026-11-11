/*
 * Tahta görünümü: 2B (DOM) çizici, 3B çiziciye geçiş ve ortak etkileşim
 * (taş seçme, yasal kareleri gösterme, terfi seçimi, sürükle-bırak, klavye).
 */
(function (root) {
  'use strict';
  var E = root.ChessEngine;

  var GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  function glyph(p) { return GLYPH[p.toLowerCase()] + '︎'; }

  // Bauhaus taşları (Josef Hartwig'in takımından esinlenerek): biçim hareketi anlatır.
  var BH = {
    p: '<rect class="f" x="34" y="46" width="32" height="32"/>',
    r: '<rect class="f" x="23" y="22" width="54" height="56"/>',
    n: '<path class="f" d="M24 14 H50 V52 H78 V80 H24 Z"/><path class="sep" d="M24 33 H50 M24 52 H50 V80"/>',
    b: '<rect class="f" x="28" y="70" width="44" height="12"/><path class="f" d="M24 30 L36 18 L78 60 L66 72 Z"/><path class="f" d="M64 18 L76 30 L34 72 L22 60 Z"/>',
    q: '<rect class="f" x="29" y="56" width="42" height="26"/><circle class="f" cx="50" cy="35" r="19"/>',
    k: '<rect class="f" x="27" y="52" width="46" height="30"/><path class="f" d="M50 12 L71 33 L50 54 L29 33 Z"/>'
  };
  function bauhausSVG(p) {
    var c = p === p.toUpperCase() ? 'w' : 'b';
    return '<svg class="bh ' + c + '" viewBox="0 0 100 100" aria-hidden="true">' + BH[p.toLowerCase()] + '</svg>';
  }
  function isBauhaus() { return document.documentElement.getAttribute('data-skin') === 'bauhaus'; }
  // Bir taşı bir öğenin içine çiz (temaya göre SVG ya da yazı karakteri)
  function drawPiece(el, p) {
    var bh = !!p && isBauhaus();
    var key = p ? (bh ? 'bh' + p : p) : '';
    if (el.dataset.k === key) return;
    el.dataset.k = key;
    if (!p) el.textContent = '';
    else if (bh) el.innerHTML = bauhausSVG(p);
    else el.textContent = glyph(p);
  }
  var reduceMotion = false;
  try { reduceMotion = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* yok */ }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  // ------------------------------------------------------------------
  // 2B çizici
  // ------------------------------------------------------------------
  function Board2D(host, handlers) {
    var self = this;
    this.h = handlers;
    this.orientation = 'w';
    this.root = el('div', 'b2d');
    this.root.setAttribute('role', 'grid');
    this.root.setAttribute('aria-label', 'Satranç tahtası');
    this.root.tabIndex = 0;
    this.sq = [];
    for (var s = 0; s < 64; s++) {
      var d = el('div', 'sq ' + (E.isLight(s) ? 'light' : 'dark'));
      d.dataset.sq = s;
      d.setAttribute('role', 'gridcell');
      d.appendChild(el('span', 'pc'));
      d.appendChild(el('span', 'st', '\u2605'));
      d.appendChild(el('span', 'cf'));
      d.appendChild(el('span', 'cr'));
      this.sq.push(d);
      this.root.appendChild(d);
    }
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('class', 'arrows');
    this.svg.setAttribute('viewBox', '0 0 8 8');
    this.svg.setAttribute('aria-hidden', 'true');
    this.root.appendChild(this.svg);
    this.cursor = -1;
    host.appendChild(this.root);
    this.place();

    // Sürükle-bırak ve tıklama (işaretçi olayları)
    var drag = null;
    this.root.addEventListener('pointerdown', function (ev) {
      var t = ev.target.closest('.sq'); if (!t) return;
      var sq = +t.dataset.sq;
      var canDrag = self.h.onSquare(sq, 'down');
      if (canDrag && ev.button === 0) {
        var pc = t.querySelector('.pc');
        drag = { sq: sq, x: ev.clientX, y: ev.clientY, moved: false, pc: pc, ghost: null, id: ev.pointerId };
        try { self.root.setPointerCapture(ev.pointerId); } catch (e) { /* yok */ }
      }
    });
    this.root.addEventListener('pointermove', function (ev) {
      if (!drag || ev.pointerId !== drag.id) return;
      var dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 6) return;
      if (!drag.moved) {
        drag.moved = true;
        drag.ghost = drag.pc.cloneNode(true);
        drag.ghost.classList.add('ghost');
        var r = drag.pc.getBoundingClientRect();
        drag.ghost.style.width = r.width + 'px';
        drag.ghost.style.height = r.height + 'px';
        drag.ghost.style.fontSize = getComputedStyle(drag.pc).fontSize;
        document.body.appendChild(drag.ghost);
        drag.pc.classList.add('lifted');
        drag.w = r.width; drag.hh = r.height;
      }
      drag.ghost.style.transform = 'translate(' + (ev.clientX - drag.w / 2) + 'px,' + (ev.clientY - drag.hh / 2) + 'px)';
    });
    function endDrag(ev) {
      if (!drag || ev.pointerId !== drag.id) return;
      var d = drag; drag = null;
      if (d.ghost) d.ghost.remove();
      d.pc.classList.remove('lifted');
      if (!d.moved) { self.h.onSquare(d.sq, 'up'); return; }
      var target = document.elementFromPoint(ev.clientX, ev.clientY);
      var t = target && target.closest && target.closest('.b2d .sq');
      if (t && t.parentNode === self.root && +t.dataset.sq !== d.sq) self.h.onSquare(+t.dataset.sq, 'drop');
    }
    this.root.addEventListener('pointerup', endDrag);
    this.root.addEventListener('pointercancel', function (ev) {
      if (drag && drag.ghost) drag.ghost.remove();
      if (drag) drag.pc.classList.remove('lifted');
      drag = null;
    });

    // Klavye: oklar imleci gezdirir, Enter/Boşluk seçer.
    this.root.addEventListener('keydown', function (ev) {
      var map = { ArrowUp: [0, 1], ArrowDown: [0, -1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
      if (map[ev.key]) {
        ev.preventDefault();
        if (self.cursor < 0) self.cursor = E.sqIndex('e2');
        var d = map[ev.key], flip = self.orientation === 'b' ? -1 : 1;
        var f = (self.cursor & 7) + d[0] * flip, r = (self.cursor >> 3) + d[1] * flip;
        if (f >= 0 && f < 8 && r >= 0 && r < 8) self.cursor = r * 8 + f;
        self.drawCursor();
      } else if (ev.key === 'Enter' || ev.key === ' ') {
        if (self.cursor >= 0) { ev.preventDefault(); self.h.onSquare(self.cursor, 'down'); self.h.onSquare(self.cursor, 'up'); }
      }
    });
    this.root.addEventListener('blur', function () { self.sq.forEach(function (d) { d.classList.remove('cursor'); }); });
  }

  Board2D.prototype.drawCursor = function () {
    var c = this.cursor;
    this.sq.forEach(function (d, i) { d.classList.toggle('cursor', i === c); });
    if (c >= 0) this.root.setAttribute('aria-activedescendant', '');
    if (this.h.onCursor) this.h.onCursor(c);
  };

  Board2D.prototype.place = function () {
    var o = this.orientation;
    this.sq.forEach(function (d, s) {
      var f = s & 7, r = s >> 3;
      d.style.gridColumn = (o === 'w' ? f : 7 - f) + 1;
      d.style.gridRow = (o === 'w' ? 7 - r : r) + 1;
    });
  };

  Board2D.prototype.render = function (st, deco, anim) {
    if (deco.orientation && deco.orientation !== this.orientation) { this.orientation = deco.orientation; this.place(); }
    var o = this.orientation;
    var set = function (arr) { var m = {}; (arr || []).forEach(function (x) { m[x] = true; }); return m; };
    var targets = set(deco.targets), captures = set(deco.captures), marks = set(deco.marks), stars = set(deco.stars);
    var good = set(deco.good), bad = set(deco.bad), last = set(deco.last), focus = set(deco.focus);
    for (var s = 0; s < 64; s++) {
      var d = this.sq[s], p = st ? st.board[s] : null;
      var pc = d.firstChild;
      drawPiece(pc, p);
      pc.className = 'pc' + (p ? (E.colorOf(p) === 'w' ? ' w' : ' b') : '');
      var cls = 'sq ' + (E.isLight(s) ? 'light' : 'dark');
      if (last[s]) cls += ' last';
      if (deco.selected === s) cls += ' sel';
      if (deco.check === s) cls += ' check';
      if (marks[s]) cls += ' mark';
      if (good[s]) cls += ' good';
      if (bad[s]) cls += ' bad';
      if (focus[s]) cls += ' focus';
      if (targets[s]) cls += captures[s] ? ' cap' : ' tgt';
      if (stars[s]) cls += ' star' + (p ? ' has-pc' : '');
      if (this.cursor === s && document.activeElement === this.root) cls += ' cursor';
      if (d.className !== cls) d.className = cls;
      // Koordinatlar: kenar karelerine küçük harf/rakam
      var f = s & 7, r = s >> 3;
      var showFile = deco.coords && (o === 'w' ? r === 0 : r === 7);
      var showRank = deco.coords && (o === 'w' ? f === 0 : f === 7);
      var cfT = showFile ? E.FILES.charAt(f) : '', crT = showRank ? String(r + 1) : '';
      if (d.children[2].textContent !== cfT) d.children[2].textContent = cfT;
      if (d.children[3].textContent !== crT) d.children[3].textContent = crT;
      d.setAttribute('aria-label', E.sqName(s) + (p ? ' ' + (E.colorOf(p) === 'w' ? 'beyaz ' : 'siyah ') + E.TR_NAME[p.toLowerCase()].toLowerCase() : ''));
    }
    this.drawArrows(deco.arrows || []);
    if (anim && !reduceMotion && deco.animate !== false) this.animate(anim);
  };

  Board2D.prototype.animate = function (m) {
    var o = this.orientation;
    function cr(s) { var f = s & 7, r = s >> 3; return o === 'w' ? [f, 7 - r] : [7 - f, r]; }
    var pairs = [[m.from, m.to]];
    if (m.flags && m.flags.indexOf('k') >= 0) pairs.push([m.to + 1, m.to - 1]);
    if (m.flags && m.flags.indexOf('q') >= 0) pairs.push([m.to - 2, m.to + 1]);
    var self = this;
    pairs.forEach(function (pr) {
      var a = cr(pr[0]), b = cr(pr[1]);
      var pc = self.sq[pr[1]].firstChild;
      pc.style.transition = 'none';
      pc.style.transform = 'translate(' + ((a[0] - b[0]) * 100) + '%,' + ((a[1] - b[1]) * 100) + '%)';
      pc.style.zIndex = 5;
      void pc.offsetWidth;
      pc.style.transition = 'transform 200ms cubic-bezier(.2,.7,.3,1)';
      pc.style.transform = '';
      setTimeout(function () { pc.style.zIndex = ''; pc.style.transition = ''; }, 220);
    });
  };

  Board2D.prototype.drawArrows = function (arrows) {
    var o = this.orientation, svg = this.svg;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    if (!arrows.length) return;
    var ns = 'http://www.w3.org/2000/svg';
    function c(s) { var f = s & 7, r = s >> 3; return o === 'w' ? [f + 0.5, 7 - r + 0.5] : [7 - f + 0.5, r + 0.5]; }
    arrows.forEach(function (a) {
      var from = typeof a[0] === 'number' ? a[0] : E.sqIndex(a[0]);
      var to = typeof a[1] === 'number' ? a[1] : E.sqIndex(a[1]);
      var p = c(from), q = c(to);
      var dx = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dx, dy);
      var ux = dx / len, uy = dy / len, head = 0.38, w = 0.11;
      var ex = q[0] - ux * 0.18, ey = q[1] - uy * 0.18;
      var bx = ex - ux * head, by = ey - uy * head;
      var nx = -uy, ny = ux;
      var sx = p[0] + ux * 0.22, sy = p[1] + uy * 0.22;
      var pts = [
        [sx + nx * w, sy + ny * w], [bx + nx * w, by + ny * w], [bx + nx * 0.26, by + ny * 0.26], [ex, ey],
        [bx - nx * 0.26, by - ny * 0.26], [bx - nx * w, by - ny * w], [sx - nx * w, sy - ny * w]
      ];
      var poly = document.createElementNS(ns, 'polygon');
      poly.setAttribute('points', pts.map(function (x) { return x[0].toFixed(3) + ',' + x[1].toFixed(3); }).join(' '));
      poly.setAttribute('class', 'arrow ' + (a[2] || ''));
      svg.appendChild(poly);
    });
  };

  Board2D.prototype.destroy = function () { this.root.remove(); };

  // ------------------------------------------------------------------
  // Ortak tahta görünümü
  // ------------------------------------------------------------------
  function BoardView(host, opts) {
    this.host = host;
    host.classList.add('board-host');
    this.wrap = el('div', 'board-wrap');
    host.appendChild(this.wrap);
    this.state = null;
    this.deco = {};
    this.sel = -1;
    this.legalSel = [];
    this.last = null;
    this.flashes = { good: [], bad: [] };
    this.opts = Object.assign({ interactive: false, mode: 'move', movable: null, onMove: null, onSquare: null, orientation: 'w', color: null }, opts || {});
    this.r = null;
    this.modeName = null;
    this.destroyed = false;
    var self = this;
    this._modeListener = function (mode) { self.setMode(mode); };
    BoardView.instances.push(this);
    this.setMode(BoardView.mode);
  }
  BoardView.instances = [];
  BoardView.mode = '2d';
  BoardView.coords = true;
  BoardView.showLegal = true;
  BoardView.onModeError = null;
  BoardView.setGlobalMode = function (mode) {
    BoardView.mode = mode;
    BoardView.instances = BoardView.instances.filter(function (b) { return !b.destroyed; });
    BoardView.instances.forEach(function (b) { b.setMode(mode); });
  };
  BoardView.refreshAll = function () {
    BoardView.instances.forEach(function (b) { if (!b.destroyed) b.redraw(); });
  };

  BoardView.prototype.handlers = function () {
    var self = this;
    return { onSquare: function (sq, phase) { return self.onSquare(sq, phase); } };
  };

  BoardView.prototype.setMode = function (mode) {
    var self = this;
    if (this.destroyed || this.modeName === mode) return Promise.resolve();
    var token = this._modeToken = {};
    function use2d() {
      if (self.r) self.r.destroy();
      self.r = new Board2D(self.wrap, self.handlers());
      self.modeName = '2d';
      self.wrap.classList.remove('is-3d');
      self.redraw();
    }
    if (mode === '3d' && root.Board3D) {
      this.wrap.classList.add('loading');
      return root.Board3D.load().then(function () {
        if (self.destroyed || token !== self._modeToken) return;
        var r3;
        try { r3 = new root.Board3D(self.wrap, self.handlers()); }
        catch (e) { throw e; }
        if (self.r) self.r.destroy();
        self.r = r3;
        self.modeName = '3d';
        self.wrap.classList.add('is-3d');
        self.wrap.classList.remove('loading');
        self.redraw();
      }).catch(function (err) {
        self.wrap.classList.remove('loading');
        if (token !== self._modeToken) return;
        use2d();
        if (BoardView.onModeError) BoardView.onModeError(err);
      });
    }
    use2d();
    return Promise.resolve();
  };

  BoardView.prototype.setPosition = function (st, move, opts) {
    this.state = st;
    if (move !== undefined) this.last = move ? [move.from, move.to] : null;
    this.sel = -1; this.legalSel = [];
    this.closePromo();
    this.redraw(move || null, opts);
  };
  BoardView.prototype.setDeco = function (d) { this.deco = d || {}; this.redraw(); };
  BoardView.prototype.update = function (o) { Object.assign(this.opts, o); this.sel = -1; this.legalSel = []; this.redraw(); };

  BoardView.prototype.fullDeco = function () {
    var d = Object.assign({}, this.deco);
    d.coords = BoardView.coords;
    d.orientation = this.opts.orientation;
    d.selected = this.sel;
    d.last = this.last ? this.last.slice() : [];
    if (this.deco.last) d.last = this.deco.last;
    var conv = function (arr) { return (arr || []).map(function (x) { return typeof x === 'number' ? x : E.sqIndex(x); }); };
    ['marks', 'stars', 'good', 'bad', 'focus', 'last'].forEach(function (k) { d[k] = conv(d[k]); });
    d.good = d.good.concat(this.flashes.good);
    d.bad = d.bad.concat(this.flashes.bad);
    if (this.sel >= 0 && BoardView.showLegal) {
      d.targets = this.legalSel.map(function (m) { return m.to; });
      d.captures = this.legalSel.filter(function (m) { return m.captured; }).map(function (m) { return m.to; });
    } else { d.targets = conv(this.deco.targets); d.captures = conv(this.deco.captures); }
    d.check = -1;
    if (this.state && this.deco.check !== false) {
      var ks = E.findKing(this.state.board, this.state.turn);
      if (ks >= 0 && E.isAttacked(this.state.board, ks, E.opp(this.state.turn))) d.check = ks;
    }
    return d;
  };

  BoardView.prototype.redraw = function (anim) {
    if (!this.r || this.destroyed) return;
    this.r.render(this.state, this.fullDeco(), anim || null);
  };

  BoardView.prototype.flash = function (sqs, kind, ms) {
    var self = this;
    sqs = (Array.isArray(sqs) ? sqs : [sqs]).map(function (x) { return typeof x === 'number' ? x : E.sqIndex(x); });
    this.flashes[kind] = this.flashes[kind].concat(sqs);
    this.redraw();
    setTimeout(function () {
      self.flashes[kind] = self.flashes[kind].filter(function (x) { return sqs.indexOf(x) < 0; });
      self.redraw();
    }, ms || 700);
  };

  BoardView.prototype.canMove = function (sq) {
    var st = this.state; if (!st) return false;
    var p = st.board[sq];
    if (!p || E.colorOf(p) !== st.turn) return false;
    if (this.opts.color && E.colorOf(p) !== this.opts.color) return false;
    if (this.opts.movable && !this.opts.movable(sq)) return false;
    return true;
  };

  // Dönüş değeri: bu karede sürüklenebilir bir taş seçildi mi?
  BoardView.prototype.onSquare = function (sq, phase) {
    if (!this.opts.interactive || !this.state) return false;
    if (this.opts.mode !== 'move') {
      if (phase === 'down' && this.opts.onSquare) this.opts.onSquare(sq);
      return false;
    }
    var st = this.state;
    if (phase === 'up') {
      if (this._deselectOnUp === sq) { this.sel = -1; this.legalSel = []; this.redraw(); }
      this._deselectOnUp = -1;
      return false;
    }
    if (this.sel >= 0 && sq !== this.sel) {
      var cand = this.legalSel.filter(function (m) { return m.to === sq; });
      // Rok kolaylığı: şah seçiliyken kendi kalesine tıklamak
      if (!cand.length && st.board[this.sel] && st.board[this.sel].toLowerCase() === 'k' && st.board[sq] && E.colorOf(st.board[sq]) === st.turn && st.board[sq].toLowerCase() === 'r') {
        cand = this.legalSel.filter(function (m) {
          return (m.flags.indexOf('k') >= 0 && sq === m.to + 1) || (m.flags.indexOf('q') >= 0 && sq === m.to - 2);
        });
      }
      if (cand.length) {
        if (cand.length > 1) this.askPromotion(cand);
        else this.emitMove(cand[0]);
        return false;
      }
      if (phase === 'drop') return false;
    }
    if (phase === 'drop') return false;
    if (this.canMove(sq)) {
      if (this.sel === sq) { this._deselectOnUp = sq; return true; }
      this.sel = sq;
      this.legalSel = E.legalMoves(st, sq);
      this._deselectOnUp = -1;
      this.redraw();
      if (this.opts.onSelect) this.opts.onSelect(sq, this.legalSel);
      return true;
    }
    if (st.board[sq] && this.opts.onForeign) this.opts.onForeign(sq);
    this.sel = -1; this.legalSel = [];
    this.redraw();
    return false;
  };

  BoardView.prototype.emitMove = function (m) {
    this.sel = -1; this.legalSel = [];
    this.closePromo();
    if (this.opts.onMove) this.opts.onMove(m);
    else this.redraw();
  };

  BoardView.prototype.askPromotion = function (cands) {
    var self = this;
    this.closePromo();
    var box = el('div', 'promo');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Terfi seçimi');
    box.appendChild(el('p', 'promo-title', 'Piyon hangi taşa terfi etsin?'));
    var row = el('div', 'promo-row');
    var color = E.colorOf(this.state.board[cands[0].from]);
    ['q', 'r', 'b', 'n'].forEach(function (t) {
      var m = cands.filter(function (c) { return c.promotion === t; })[0];
      if (!m) return;
      var b = el('button', 'promo-btn');
      b.type = 'button';
      var g = el('span', 'pc ' + color);
      drawPiece(g, color === 'w' ? t.toUpperCase() : t);
      b.appendChild(g);
      b.appendChild(el('span', 'promo-name', E.TR_NAME[t]));
      b.addEventListener('click', function () { self.emitMove(m); });
      row.appendChild(b);
    });
    box.appendChild(row);
    var cancel = el('button', 'promo-cancel', 'Vazgeç');
    cancel.type = 'button';
    cancel.addEventListener('click', function () { self.closePromo(); self.sel = -1; self.legalSel = []; self.redraw(); });
    box.appendChild(cancel);
    this.wrap.appendChild(box);
    this.promoBox = box;
    var first = box.querySelector('.promo-btn'); if (first) first.focus();
  };
  BoardView.prototype.closePromo = function () { if (this.promoBox) { this.promoBox.remove(); this.promoBox = null; } };

  BoardView.prototype.destroy = function () {
    this.destroyed = true;
    if (this.r) this.r.destroy();
    this.r = null;
    this.wrap.remove();
  };

  root.BoardView = BoardView;
  root.Board2D = Board2D;
  root.pieceGlyph = glyph;
  root.drawPiece = drawPiece;
  root.bauhausSVG = bauhausSVG;
})(typeof window !== 'undefined' ? window : globalThis);
