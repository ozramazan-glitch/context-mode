/*
 * Satranç Akademisi — kural motoru ve basit yapay zekâ.
 *
 * Tahta gösterimi: 64 elemanlı dizi. İndeks = sıra * 8 + sütun,
 * a1 = 0, h1 = 7, a8 = 56, h8 = 63. Taşlar FEN harfleriyle tutulur:
 * büyük harf beyaz, küçük harf siyah (P N B R Q K).
 *
 * Bu dosya hem tarayıcıda (window.ChessEngine) hem de Node testlerinde
 * (vm ile yüklenerek) çalışır; dış bağımlılığı yoktur.
 */
(function (root) {
  'use strict';

  var FILES = 'abcdefgh';
  var START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  function sqName(i) { return FILES.charAt(i & 7) + ((i >> 3) + 1); }
  function sqIndex(name) {
    if (typeof name !== 'string' || name.length !== 2) return -1;
    var f = name.charCodeAt(0) - 97, r = name.charCodeAt(1) - 49;
    if (f < 0 || f > 7 || r < 0 || r > 7) return -1;
    return r * 8 + f;
  }
  function colorOf(p) { if (!p) return null; return p === p.toUpperCase() ? 'w' : 'b'; }
  function opp(c) { return c === 'w' ? 'b' : 'w'; }
  function isLight(i) { return ((i & 7) + (i >> 3)) % 2 === 1; }

  // ---- Önceden hesaplanan tablolar ----
  var DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
  var KNIGHT_D = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
  var RAYS = [], KN = [], KG = [];
  (function () {
    for (var s = 0; s < 64; s++) {
      var f = s & 7, r = s >> 3;
      RAYS[s] = DIRS.map(function (d) {
        var out = [], nf = f + d[0], nr = r + d[1];
        while (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) { out.push(nr * 8 + nf); nf += d[0]; nr += d[1]; }
        return out;
      });
      KN[s] = []; KG[s] = [];
      KNIGHT_D.forEach(function (d) {
        var nf = f + d[0], nr = r + d[1];
        if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) KN[s].push(nr * 8 + nf);
      });
      DIRS.forEach(function (d) {
        var nf = f + d[0], nr = r + d[1];
        if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) KG[s].push(nr * 8 + nf);
      });
    }
  })();

  // ---- FEN ----
  function parseFEN(fen) {
    var parts = String(fen).trim().split(/\s+/);
    var rows = parts[0].split('/');
    if (rows.length !== 8) throw new Error('FEN hatalı: 8 sıra olmalı (' + fen + ')');
    var board = new Array(64).fill(null);
    for (var i = 0; i < 8; i++) {
      var rank = 7 - i, f = 0;
      for (var j = 0; j < rows[i].length; j++) {
        var ch = rows[i].charAt(j);
        if (ch >= '1' && ch <= '8') f += +ch;
        else if ('pnbrqkPNBRQK'.indexOf(ch) >= 0) {
          if (f > 7) throw new Error('FEN hatalı: sıra taşıyor (' + fen + ')');
          board[rank * 8 + f] = ch; f++;
        } else throw new Error('FEN hatalı karakter: ' + ch);
      }
      if (f !== 8) throw new Error('FEN hatalı: sırada 8 kare yok (' + fen + ')');
    }
    var cs = parts[2] || '-';
    return {
      board: board,
      turn: parts[1] === 'b' ? 'b' : 'w',
      castling: { K: cs.indexOf('K') >= 0, Q: cs.indexOf('Q') >= 0, k: cs.indexOf('k') >= 0, q: cs.indexOf('q') >= 0 },
      ep: parts[3] && parts[3] !== '-' ? sqIndex(parts[3]) : -1,
      half: parseInt(parts[4] || '0', 10) || 0,
      full: parseInt(parts[5] || '1', 10) || 1
    };
  }

  function toFEN(st) {
    var rows = [];
    for (var r = 7; r >= 0; r--) {
      var row = '', empty = 0;
      for (var f = 0; f < 8; f++) {
        var p = st.board[r * 8 + f];
        if (!p) empty++; else { if (empty) { row += empty; empty = 0; } row += p; }
      }
      if (empty) row += empty;
      rows.push(row);
    }
    var c = (st.castling.K ? 'K' : '') + (st.castling.Q ? 'Q' : '') + (st.castling.k ? 'k' : '') + (st.castling.q ? 'q' : '');
    return rows.join('/') + ' ' + st.turn + ' ' + (c || '-') + ' ' + (st.ep >= 0 ? sqName(st.ep) : '-') + ' ' + st.half + ' ' + st.full;
  }

  // Tekrar tespiti için konum anahtarı (hamle sayaçları hariç).
  function positionKey(st) { return toFEN(st).split(' ').slice(0, 4).join(' '); }

  function cloneState(st) {
    return { board: st.board.slice(), turn: st.turn, castling: Object.assign({}, st.castling), ep: st.ep, half: st.half, full: st.full };
  }

  // ---- Saldırı ----
  function isAttacked(board, sq, by) {
    var f = sq & 7, r = sq >> 3, i, t;
    if (by === 'w') {
      if (r > 0) {
        if (f > 0 && board[sq - 9] === 'P') return true;
        if (f < 7 && board[sq - 7] === 'P') return true;
      }
    } else if (r < 7) {
      if (f > 0 && board[sq + 7] === 'p') return true;
      if (f < 7 && board[sq + 9] === 'p') return true;
    }
    var w = by === 'w';
    var N = w ? 'N' : 'n', K = w ? 'K' : 'k', R = w ? 'R' : 'r', B = w ? 'B' : 'b', Q = w ? 'Q' : 'q';
    var kn = KN[sq];
    for (i = 0; i < kn.length; i++) if (board[kn[i]] === N) return true;
    var kg = KG[sq];
    for (i = 0; i < kg.length; i++) if (board[kg[i]] === K) return true;
    var rays = RAYS[sq];
    for (var d = 0; d < 8; d++) {
      var ray = rays[d];
      for (i = 0; i < ray.length; i++) {
        t = board[ray[i]];
        if (t) { if (t === Q || (d < 4 ? t === R : t === B)) return true; break; }
      }
    }
    return false;
  }

  // Bir kareye saldıran taşların listesi (öğretim amaçlı vurgulama için).
  function attackersOf(board, sq, by) {
    var out = [];
    for (var s = 0; s < 64; s++) {
      var p = board[s];
      if (!p || colorOf(p) !== by) continue;
      if (attacksSquare(board, s, sq)) out.push(s);
    }
    return out;
  }

  // s karesindeki taş, t karesine saldırıyor mu?
  function attacksSquare(board, s, t) {
    var p = board[s]; if (!p) return false;
    var type = p.toLowerCase(), c = colorOf(p);
    var df = (t & 7) - (s & 7), dr = (t >> 3) - (s >> 3);
    if (type === 'p') return Math.abs(df) === 1 && dr === (c === 'w' ? 1 : -1);
    if (type === 'n') return KN[s].indexOf(t) >= 0;
    if (type === 'k') return KG[s].indexOf(t) >= 0;
    var dirs = type === 'r' ? [0, 1, 2, 3] : type === 'b' ? [4, 5, 6, 7] : [0, 1, 2, 3, 4, 5, 6, 7];
    for (var k = 0; k < dirs.length; k++) {
      var ray = RAYS[s][dirs[k]];
      for (var i = 0; i < ray.length; i++) {
        if (ray[i] === t) return true;
        if (board[ray[i]]) break;
      }
    }
    return false;
  }

  function findKing(board, color) {
    var K = color === 'w' ? 'K' : 'k';
    for (var i = 0; i < 64; i++) if (board[i] === K) return i;
    return -1;
  }

  function inCheck(st, color) {
    color = color || st.turn;
    var k = findKing(st.board, color);
    return k >= 0 && isAttacked(st.board, k, opp(color));
  }

  // ---- Hamle üretimi ----
  function addMove(out, st, from, to, flags, promo) {
    var captured = flags.indexOf('e') >= 0 ? (st.turn === 'w' ? 'p' : 'P') : st.board[to];
    out.push({ from: from, to: to, piece: st.board[from], captured: captured || null, promotion: promo || null, flags: flags });
  }

  function pawnMoves(st, s, out) {
    var B = st.board, us = st.turn;
    var dir = us === 'w' ? 8 : -8;
    var startRank = us === 'w' ? 1 : 6, lastRank = us === 'w' ? 7 : 0;
    var one = s + dir;
    if (one >= 0 && one < 64 && !B[one]) {
      if ((one >> 3) === lastRank) ['q', 'r', 'b', 'n'].forEach(function (pr) { addMove(out, st, s, one, 'np', pr); });
      else {
        addMove(out, st, s, one, 'n');
        var two = one + dir;
        if ((s >> 3) === startRank && !B[two]) addMove(out, st, s, two, 'b');
      }
    }
    var f = s & 7;
    [-1, 1].forEach(function (df) {
      var nf = f + df; if (nf < 0 || nf > 7) return;
      var to = s + dir + df; if (to < 0 || to > 63) return;
      var t = B[to];
      if (t && colorOf(t) !== us) {
        if ((to >> 3) === lastRank) ['q', 'r', 'b', 'n'].forEach(function (pr) { addMove(out, st, s, to, 'cp', pr); });
        else addMove(out, st, s, to, 'c');
      } else if (!t && to === st.ep) {
        addMove(out, st, s, to, 'e');
      }
    });
  }

  function stepMoves(st, s, targets, out) {
    var B = st.board, us = st.turn;
    for (var i = 0; i < targets.length; i++) {
      var t = targets[i], p = B[t];
      if (!p) addMove(out, st, s, t, 'n');
      else if (colorOf(p) !== us) addMove(out, st, s, t, 'c');
    }
  }

  function slideMoves(st, s, dirs, out) {
    var B = st.board, us = st.turn;
    for (var k = 0; k < dirs.length; k++) {
      var ray = RAYS[s][dirs[k]];
      for (var i = 0; i < ray.length; i++) {
        var t = ray[i], p = B[t];
        if (!p) addMove(out, st, s, t, 'n');
        else { if (colorOf(p) !== us) addMove(out, st, s, t, 'c'); break; }
      }
    }
  }

  function castleMoves(st, s, out) {
    var us = st.turn, B = st.board, them = opp(us);
    var home = us === 'w' ? 4 : 60;
    if (s !== home) return;
    var R = us === 'w' ? 'R' : 'r';
    var kRight = us === 'w' ? st.castling.K : st.castling.k;
    var qRight = us === 'w' ? st.castling.Q : st.castling.q;
    if (kRight && B[home + 3] === R && !B[home + 1] && !B[home + 2] &&
        !isAttacked(B, home, them) && !isAttacked(B, home + 1, them) && !isAttacked(B, home + 2, them)) {
      addMove(out, st, home, home + 2, 'k');
    }
    if (qRight && B[home - 4] === R && !B[home - 1] && !B[home - 2] && !B[home - 3] &&
        !isAttacked(B, home, them) && !isAttacked(B, home - 1, them) && !isAttacked(B, home - 2, them)) {
      addMove(out, st, home, home - 2, 'q');
    }
  }

  function pseudoMoves(st, from) {
    var out = [], B = st.board, us = st.turn;
    var start = from >= 0 ? from : 0, end = from >= 0 ? from + 1 : 64;
    for (var s = start; s < end; s++) {
      var p = B[s];
      if (!p || colorOf(p) !== us) continue;
      var t = p.toLowerCase();
      if (t === 'p') pawnMoves(st, s, out);
      else if (t === 'n') stepMoves(st, s, KN[s], out);
      else if (t === 'k') { stepMoves(st, s, KG[s], out); castleMoves(st, s, out); }
      else if (t === 'b') slideMoves(st, s, [4, 5, 6, 7], out);
      else if (t === 'r') slideMoves(st, s, [0, 1, 2, 3], out);
      else slideMoves(st, s, [0, 1, 2, 3, 4, 5, 6, 7], out);
    }
    return out;
  }

  function makeMove(st, m) {
    var B = st.board.slice(), us = st.turn;
    var piece = B[m.from];
    B[m.from] = null;
    if (m.flags.indexOf('e') >= 0) B[m.to + (us === 'w' ? -8 : 8)] = null;
    B[m.to] = m.promotion ? (us === 'w' ? m.promotion.toUpperCase() : m.promotion.toLowerCase()) : piece;
    if (m.flags.indexOf('k') >= 0) { B[m.to - 1] = B[m.to + 1]; B[m.to + 1] = null; }
    if (m.flags.indexOf('q') >= 0) { B[m.to + 1] = B[m.to - 2]; B[m.to - 2] = null; }
    var c = { K: st.castling.K, Q: st.castling.Q, k: st.castling.k, q: st.castling.q };
    if (piece === 'K') { c.K = false; c.Q = false; }
    if (piece === 'k') { c.k = false; c.q = false; }
    [m.from, m.to].forEach(function (sq) {
      if (sq === 0) c.Q = false; else if (sq === 7) c.K = false;
      else if (sq === 56) c.q = false; else if (sq === 63) c.k = false;
    });
    var isPawn = piece && piece.toLowerCase() === 'p';
    return {
      board: B,
      turn: opp(us),
      castling: c,
      ep: m.flags.indexOf('b') >= 0 ? (m.from + m.to) / 2 : -1,
      half: (isPawn || m.captured) ? 0 : st.half + 1,
      full: us === 'b' ? st.full + 1 : st.full
    };
  }

  // Yasal hamleler. Tahtada o rengin şahı yoksa (alıştırma konumları)
  // şah kontrolü yapılmaz.
  function legalMoves(st, from) {
    var ps = pseudoMoves(st, from === undefined ? -1 : from);
    var Kc = st.turn === 'w' ? 'K' : 'k';
    var ks = findKing(st.board, st.turn);
    if (ks < 0) return ps;
    var them = opp(st.turn), out = [];
    for (var i = 0; i < ps.length; i++) {
      var m = ps[i];
      var n = makeMove(st, m);
      var k = m.piece === Kc ? m.to : ks;
      if (!isAttacked(n.board, k, them)) out.push(m);
    }
    return out;
  }

  function perft(st, depth) {
    if (depth === 0) return 1;
    var ms = legalMoves(st);
    if (depth === 1) return ms.length;
    var n = 0;
    for (var i = 0; i < ms.length; i++) n += perft(makeMove(st, ms[i]), depth - 1);
    return n;
  }

  function insufficientMaterial(st) {
    var minors = [], others = 0;
    for (var i = 0; i < 64; i++) {
      var p = st.board[i]; if (!p) continue;
      var t = p.toLowerCase();
      if (t === 'k') continue;
      if (t === 'b' || t === 'n') minors.push({ t: t, sq: i, c: colorOf(p) });
      else others++;
    }
    if (others) return false;
    if (minors.length <= 1) return true;
    // Yalnızca aynı renk karelerde filler kaldıysa mat imkânsızdır.
    if (minors.every(function (m) { return m.t === 'b'; })) {
      var l = isLight(minors[0].sq);
      return minors.every(function (m) { return isLight(m.sq) === l; });
    }
    return false;
  }

  // 'checkmate' | 'stalemate' | 'insufficient' | 'fifty' | 'check' | 'ok'
  function status(st) {
    var ms = legalMoves(st);
    var chk = inCheck(st);
    if (!ms.length) return chk ? 'checkmate' : 'stalemate';
    if (insufficientMaterial(st)) return 'insufficient';
    if (st.half >= 100) return 'fifty';
    return chk ? 'check' : 'ok';
  }

  // ---- Notasyon (Türkçe harfler) ----
  var TR = { n: 'A', b: 'F', r: 'K', q: 'V', k: 'Ş' };
  var TR_NAME = { p: 'Piyon', n: 'At', b: 'Fil', r: 'Kale', q: 'Vezir', k: 'Şah' };

  function toUci(m) { return sqName(m.from) + sqName(m.to) + (m.promotion ? m.promotion.toLowerCase() : ''); }

  function moveFromUci(st, uci) {
    if (!uci || uci.length < 4) return null;
    var from = sqIndex(uci.slice(0, 2)), to = sqIndex(uci.slice(2, 4));
    var promo = uci.length > 4 ? uci.charAt(4).toLowerCase() : null;
    var ms = legalMoves(st, from);
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i];
      if (m.to !== to) continue;
      if (m.promotion) { if ((promo || 'q') === m.promotion) return m; } else return m;
    }
    return null;
  }

  function san(st, m, legal) {
    legal = legal || legalMoves(st);
    var s;
    if (m.flags.indexOf('k') >= 0) s = 'O-O';
    else if (m.flags.indexOf('q') >= 0) s = 'O-O-O';
    else {
      var t = m.piece.toLowerCase(), cap = !!m.captured;
      if (t === 'p') {
        s = (cap ? FILES.charAt(m.from & 7) + 'x' : '') + sqName(m.to);
        if (m.promotion) s += '=' + TR[m.promotion];
      } else {
        s = TR[t];
        var amb = legal.filter(function (o) { return o.piece === m.piece && o.to === m.to && o.from !== m.from; });
        if (amb.length) {
          var sameFile = amb.some(function (o) { return (o.from & 7) === (m.from & 7); });
          var sameRank = amb.some(function (o) { return (o.from >> 3) === (m.from >> 3); });
          if (!sameFile) s += FILES.charAt(m.from & 7);
          else if (!sameRank) s += ((m.from >> 3) + 1);
          else s += sqName(m.from);
        }
        s += (cap ? 'x' : '') + sqName(m.to);
      }
    }
    var n = makeMove(st, m);
    if (inCheck(n)) s += legalMoves(n).length ? '+' : '#';
    return s;
  }

  // ---- Mat arayıcı (n hamlede zorlayıcı mat) ----
  // Sıradaki taraf en fazla n hamlede zorla mat edebiliyorsa ilk hamleyi döndürür.
  function findForcedMate(st, n) {
    // Önce şah çeken hamleler: mat ararken en olası adaylar.
    var cand = legalMoves(st).map(function (m) {
      var n2 = makeMove(st, m);
      return { m: m, n: n2, chk: inCheck(n2) ? 1 : 0 };
    });
    cand.sort(function (a, b) { return b.chk - a.chk; });
    for (var i = 0; i < cand.length; i++) {
      if (n === 1 && !cand[i].chk) break; // tek hamlede mat ancak şah çekerek olur
      if (forcedAfter(cand[i].n, n)) return cand[i].m;
    }
    return null;
  }

  // s: rakibin sırası. Az önce yapılan hamle dahil toplam n hamlede mat garanti mi?
  function forcedAfter(s, n) {
    if (n <= 1) {
      if (!inCheck(s)) return false;
      return legalMoves(s).length === 0;
    }
    var replies = legalMoves(s);
    if (!replies.length) return inCheck(s);
    for (var i = 0; i < replies.length; i++) {
      if (!findForcedMate(makeMove(s, replies[i]), n - 1)) return false;
    }
    return true;
  }

  // Matı en uzun geciktiren savunma (yoksa yapay zekânın seçimi).
  function bestDefense(s, n) {
    var replies = legalMoves(s);
    var escape = null;
    for (var i = 0; i < replies.length; i++) {
      if (!findForcedMate(makeMove(s, replies[i]), n - 1)) { escape = replies[i]; break; }
    }
    return escape;
  }

  // ---- Değerlendirme ----
  var VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
  // Tablolar 8. sıradan 1. sıraya doğru yazılmıştır (beyazın bakışı).
  var PST = {
    p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
    n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
    b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
    r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
    q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
    k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
    ke: [-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50]
  };

  function centerDist(s) {
    var f = s & 7, r = s >> 3;
    return Math.max(3 - f, f - 4) + Math.max(3 - r, r - 4);
  }

  // Beyazın bakış açısından santipiyon cinsinden değerlendirme.
  function evaluate(st) {
    var B = st.board, score = 0, npm = { w: 0, b: 0 }, mat = { w: 0, b: 0 }, wk = -1, bk = -1;
    for (var s = 0; s < 64; s++) {
      var p = B[s]; if (!p) continue;
      var t = p.toLowerCase(), c = colorOf(p);
      if (t === 'k') { if (c === 'w') wk = s; else bk = s; continue; }
      mat[c] += VAL[t];
      if (t !== 'p') npm[c] += VAL[t];
    }
    var endgame = (npm.w + npm.b) <= 1700;
    for (s = 0; s < 64; s++) {
      p = B[s]; if (!p) continue;
      t = p.toLowerCase(); c = colorOf(p);
      var idx = c === 'w' ? (7 - (s >> 3)) * 8 + (s & 7) : (s >> 3) * 8 + (s & 7);
      var tbl = t === 'k' ? (endgame ? PST.ke : PST.k) : PST[t];
      var v = VAL[t] + tbl[idx];
      score += c === 'w' ? v : -v;
    }
    // Yalnız şaha karşı mat tekniği: zayıf şahı kenara it, kendi şahını yaklaştır,
    // kale/vezir ile zayıf şahın kapalı kaldığı "kutuyu" küçült.
    if (wk >= 0 && bk >= 0) {
      if (mat.b === 0 && npm.w >= 500) score += mopUp(B, wk, bk, 'w');
      if (mat.w === 0 && npm.b >= 500) score -= mopUp(B, bk, wk, 'b');
    }
    return score;
  }

  function mopUp(B, strongK, weakK, strong) {
    var kd = Math.abs((strongK & 7) - (weakK & 7)) + Math.abs((strongK >> 3) - (weakK >> 3));
    var s = 20 * centerDist(weakK) + 6 * (14 - kd);
    var bf = weakK & 7, br = weakK >> 3, best = 64;
    for (var i = 0; i < 64; i++) {
      var p = B[i];
      if (!p || colorOf(p) !== strong) continue;
      var t = p.toLowerCase();
      if (t !== 'r' && t !== 'q') continue;
      var rf = i & 7, rr = i >> 3;
      if (rf === bf || rr === br) continue;
      var w = bf < rf ? rf : 7 - rf, h = br < rr ? rr : 7 - rr;
      if (w * h < best) best = w * h;
    }
    return s + 4 * (64 - best);
  }

  // ---- Arama ----
  var MATE = 100000;
  function SearchAbort() {}

  function orderMoves(ms, pv) {
    ms.forEach(function (m) {
      var sc = 0;
      if (m.captured) sc += 10 * VAL[m.captured.toLowerCase()] - VAL[m.piece.toLowerCase()] + 1000;
      if (m.promotion) sc += VAL[m.promotion] + 900;
      if (pv && m.from === pv.from && m.to === pv.to && m.promotion === pv.promotion) sc += 100000;
      m._o = sc;
    });
    ms.sort(function (a, b) { return b._o - a._o; });
    return ms;
  }

  function Searcher(opts) {
    this.deadline = opts.timeMs ? Date.now() + opts.timeMs : Infinity;
    this.nodes = 0;
    this.maxNodes = opts.maxNodes || Infinity;
  }
  Searcher.prototype.tick = function () {
    this.nodes++;
    if ((this.nodes & 1023) === 0 && (Date.now() > this.deadline || this.nodes > this.maxNodes)) throw new SearchAbort();
  };
  Searcher.prototype.quiesce = function (st, alpha, beta, qd) {
    this.tick();
    var all = legalMoves(st);
    var checked = inCheck(st);
    // Şah altındayken "hiçbir şey yapmama" seçeneği yoktur: tüm kaçışlar denenir.
    if (checked && qd < 6) {
      if (!all.length) return -MATE + 50 + qd;
      orderMoves(all);
      for (var j = 0; j < all.length; j++) {
        var s2 = -this.quiesce(makeMove(st, all[j]), -beta, -alpha, qd + 1);
        if (s2 >= beta) return beta;
        if (s2 > alpha) alpha = s2;
      }
      return alpha;
    }
    if (!all.length) return checked ? -MATE + 50 + qd : 0;
    var stand = evaluate(st) * (st.turn === 'w' ? 1 : -1);
    if (stand >= beta) return beta;
    if (stand > alpha) alpha = stand;
    if (qd >= 6) return alpha;
    var ms = all.filter(function (m) { return m.captured || m.promotion; });
    orderMoves(ms);
    for (var i = 0; i < ms.length; i++) {
      var sc = -this.quiesce(makeMove(st, ms[i]), -beta, -alpha, qd + 1);
      if (sc >= beta) return beta;
      if (sc > alpha) alpha = sc;
    }
    return alpha;
  };
  Searcher.prototype.negamax = function (st, depth, alpha, beta, ply) {
    this.tick();
    var ms = legalMoves(st);
    if (!ms.length) return inCheck(st) ? -MATE + ply : 0;
    if (st.half >= 100 || insufficientMaterial(st)) return 0;
    if (depth <= 0) return this.quiesce(st, alpha, beta, 0);
    orderMoves(ms);
    for (var i = 0; i < ms.length; i++) {
      var sc = -this.negamax(makeMove(st, ms[i]), depth - 1, -beta, -alpha, ply + 1);
      if (sc >= beta) return beta;
      if (sc > alpha) alpha = sc;
    }
    return alpha;
  };

  // Kök hamlelerin her birini tam pencereyle puanlar (küçük derinlikler için).
  function scoreRootMoves(st, depth, opts) {
    var se = new Searcher(opts || {});
    var ms = orderMoves(legalMoves(st));
    return ms.map(function (m) {
      return { move: m, score: -se.negamax(makeMove(st, m), depth - 1, -MATE - 1, MATE + 1, 1) };
    }).sort(function (a, b) { return b.score - a.score; });
  }

  // Yinelemeli derinleştirme ile en iyi hamle.
  // opts: { depth, timeMs, noise (santipiyon), avoid: [konum anahtarları] }
  function search(st, opts) {
    opts = opts || {};
    var maxDepth = opts.depth || 3;
    var root = legalMoves(st);
    if (!root.length) return null;
    var best = { move: root[0], score: -MATE, depth: 0 };
    var se = new Searcher(opts);
    var pv = null;
    try {
      for (var d = 1; d <= maxDepth; d++) {
        var ms = orderMoves(legalMoves(st), pv);
        var alpha = -MATE - 1, bestHere = null, scores = [];
        for (var i = 0; i < ms.length; i++) {
          var n = makeMove(st, ms[i]);
          var sc;
          if (opts.noise) sc = -se.negamax(n, d - 1, -MATE - 1, MATE + 1, 1);
          else sc = -se.negamax(n, d - 1, -MATE - 1, -alpha, 1);
          if (opts.avoid && opts.avoid.indexOf(positionKey(n)) >= 0 && sc > 0) sc = 0; // tekrar = beraberlik
          scores.push({ move: ms[i], score: sc });
          if (sc > alpha) { alpha = sc; bestHere = ms[i]; }
        }
        if (opts.noise) {
          var noisy = scores.map(function (x) { return { move: x.move, score: x.score + (Math.random() * 2 - 1) * opts.noise }; });
          noisy.sort(function (a, b) { return b.score - a.score; });
          bestHere = noisy[0].move;
          alpha = scores.filter(function (x) { return x.move === bestHere; })[0].score;
        }
        best = { move: bestHere || ms[0], score: alpha, depth: d };
        pv = best.move;
        if (Math.abs(alpha) > MATE - 100) break;
      }
    } catch (e) {
      if (!(e instanceof SearchAbort)) throw e;
    }
    return best;
  }

  // Bir taşın gidebileceği kareler (sıra kimde olursa olsun).
  function destinations(st, from) {
    var p = st.board[from]; if (!p) return [];
    var s = cloneState(st);
    s.turn = colorOf(p);
    var seen = {};
    return legalMoves(s, from).map(function (m) { return m.to; }).filter(function (t) {
      if (seen[t]) return false; seen[t] = true; return true;
    });
  }

  var api = {
    START_FEN: START_FEN,
    FILES: FILES,
    TR: TR,
    TR_NAME: TR_NAME,
    VAL: VAL,
    MATE: MATE,
    sqName: sqName,
    sqIndex: sqIndex,
    colorOf: colorOf,
    opp: opp,
    isLight: isLight,
    parseFEN: parseFEN,
    toFEN: toFEN,
    positionKey: positionKey,
    cloneState: cloneState,
    isAttacked: isAttacked,
    attackersOf: attackersOf,
    attacksSquare: attacksSquare,
    findKing: findKing,
    inCheck: inCheck,
    pseudoMoves: pseudoMoves,
    legalMoves: legalMoves,
    makeMove: makeMove,
    perft: perft,
    status: status,
    insufficientMaterial: insufficientMaterial,
    toUci: toUci,
    moveFromUci: moveFromUci,
    san: san,
    findForcedMate: findForcedMate,
    forcedAfter: forcedAfter,
    bestDefense: bestDefense,
    evaluate: evaluate,
    search: search,
    scoreRootMoves: scoreRootMoves,
    destinations: destinations
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ChessEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
