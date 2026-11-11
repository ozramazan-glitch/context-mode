/*
 * Şah + Piyon – Şah (KPK) oyunsonu çözücüsü.
 *
 * Geriye doğru analiz (retrograd analiz): ilgili tüm konumlar için
 * "beyaz kazanır mı?" sorusunu kesin olarak hesaplar. Piyon her zaman
 * beyazdır. Terfiden sonra vezir (gerekirse kale) alınamıyor ve pat yoksa
 * konum kazanılmış sayılır; Şah+Vezir'in yalnız Şah'a karşı kazandığı
 * bilinen bir sonuçtur.
 *
 * Piyon başka sütuna geçemediği için (alacak taş yok) tablolar sütun sütun,
 * yalnızca gerektiğinde hesaplanır.
 *
 * Kullanım: KPK.probe(state) -> { win, dtw } (dtw: kazanca kalan yaklaşık adım)
 */
(function (root) {
  'use strict';

  var SIDE = 64 * 64 * 64; // siyah sıradaki konumların ofseti
  var res = null, dtw = null, built = [];
  var ADJ = new Uint8Array(4096), PA = new Uint8Array(4096), KG = [];

  (function init() {
    for (var a = 0; a < 64; a++) {
      KG[a] = [];
      for (var b = 0; b < 64; b++) {
        var d = Math.max(Math.abs((a & 7) - (b & 7)), Math.abs((a >> 3) - (b >> 3)));
        ADJ[a * 64 + b] = d <= 1 ? 1 : 0;
        if (d === 1) KG[a].push(b);
      }
      // a karesindeki beyaz piyonun saldırdığı kareler
      if ((a & 7) > 0 && a + 7 < 64) PA[a * 64 + a + 7] = 1;
      if ((a & 7) < 7 && a + 9 < 64) PA[a * 64 + a + 9] = 1;
    }
  })();

  // Terfi eden taşın (vezir/kale) sq karesine saldırısı; tek engel beyaz şah.
  function lineAttack(from, sq, wk, diag) {
    var dfx = (sq & 7) - (from & 7), dry = (sq >> 3) - (from >> 3);
    if (!dfx && !dry) return false;
    var straight = !dfx || !dry, diagonal = Math.abs(dfx) === Math.abs(dry);
    if (!(straight || (diag && diagonal))) return false;
    var sx = Math.sign(dfx), sy = Math.sign(dry);
    var x = (from & 7) + sx, y = (from >> 3) + sy;
    while (x !== (sq & 7) || y !== (sq >> 3)) {
      if (y * 8 + x === wk) return false;
      x += sx; y += sy;
    }
    return true;
  }

  function promotionWins(wk, bk, q) {
    if (ADJ[bk * 64 + q] && !ADJ[wk * 64 + q]) return false; // terfi taşı alınır
    for (var pass = 0; pass < 2; pass++) {
      var diag = pass === 0; // önce vezir, sonra kale
      if (lineAttack(q, bk, wk, diag)) return true; // şah çekiyor: pat değil
      var moves = KG[bk];
      for (var k = 0; k < moves.length; k++) {
        var t = moves[k];
        if (t === q || ADJ[t * 64 + wk] || lineAttack(q, t, wk, diag)) continue;
        return true; // siyahın hamlesi var: pat değil
      }
    }
    return false;
  }

  function build(file) {
    if (file === undefined) { for (var ff = 0; ff < 8; ff++) build(ff); return; }
    if (built[file]) return;
    if (!res) { res = new Uint8Array(2 * SIDE); dtw = new Uint8Array(2 * SIDE); }
    var ps = [], r, p, wk, bk, i, k, t, base;
    for (r = 6; r >= 1; r--) ps.push(r * 8 + file); // ileri piyonlar önce: daha hızlı yakınsar
    // Geçersiz konumları işaretle (2)
    for (k = 0; k < ps.length; k++) {
      p = ps[k];
      for (wk = 0; wk < 64; wk++) for (bk = 0; bk < 64; bk++) {
        i = (wk * 64 + bk) * 64 + p;
        var bad = wk === bk || wk === p || bk === p || ADJ[wk * 64 + bk];
        res[i] = (bad || PA[p * 64 + bk]) ? 2 : 0;
        res[i + SIDE] = bad ? 2 : 0;
        dtw[i] = 0; dtw[i + SIDE] = 0;
      }
    }
    var iter = 0, changed = true;
    while (changed && iter < 250) {
      iter++; changed = false;
      for (k = 0; k < ps.length; k++) {
        p = ps[k];
        var q = p + 8;
        for (wk = 0; wk < 64; wk++) {
          var kgw = KG[wk];
          for (bk = 0; bk < 64; bk++) {
            base = (wk * 64 + bk) * 64;
            // --- Beyaz sırada ---
            i = base + p;
            if (res[i] === 0) {
              var win = false;
              if (q !== wk && q !== bk) {
                if (q >= 56) win = promotionWins(wk, bk, q);
                else {
                  win = res[base + q + SIDE] === 1;
                  if (!win && p < 16 && q + 8 !== wk && q + 8 !== bk) win = res[base + q + 8 + SIDE] === 1;
                }
              }
              for (var a = 0; !win && a < kgw.length; a++) {
                t = kgw[a];
                if (t === p || ADJ[t * 64 + bk]) continue;
                if (res[(t * 64 + bk) * 64 + p + SIDE] === 1) win = true;
              }
              if (win) { res[i] = 1; dtw[i] = iter; changed = true; }
            }
            // --- Siyah sırada ---
            i = base + p + SIDE;
            if (res[i] === 0) {
              var any = false, lose = true, kgb = KG[bk];
              for (var b = 0; b < kgb.length; b++) {
                t = kgb[b];
                if (ADJ[t * 64 + wk] || PA[p * 64 + t]) continue;
                if (t === p) { lose = false; break; } // korunmayan piyon alınır: beraberlik
                any = true;
                if (res[(wk * 64 + t) * 64 + p] !== 1) { lose = false; break; }
              }
              if (lose && !any) lose = PA[p * 64 + bk] === 1; // hamle yok: şahtaysa mat, değilse pat
              if (lose) { res[i] = 1; dtw[i] = iter; changed = true; }
            }
          }
        }
      }
    }
    built[file] = true;
  }

  function squaresOf(st) {
    var wk = -1, bk = -1, p = -1, extra = false;
    for (var i = 0; i < 64; i++) {
      var c = st.board[i]; if (!c) continue;
      if (c === 'K') wk = i; else if (c === 'k') bk = i; else if (c === 'P' && p < 0) p = i; else extra = true;
    }
    if (extra || wk < 0 || bk < 0 || p < 0) return null;
    return { wk: wk, bk: bk, p: p };
  }

  // Sadece Şah+Piyon–Şah konumları için; diğer konumlarda null.
  function probe(st) {
    var q = squaresOf(st);
    if (!q || q.p < 8 || q.p > 55) return null;
    build(q.p & 7);
    var i = (q.wk * 64 + q.bk) * 64 + q.p + (st.turn === 'w' ? 0 : SIDE);
    if (res[i] === 2) return null;
    return { win: res[i] === 1, dtw: dtw[i] };
  }

  // Terfi sonrası konum: vezir/kale alınmıyor ve pat yoksa kazanç.
  function promoWins(n, E) {
    if (E.status(n) === 'stalemate') return false;
    var q = -1, wk = -1, bk = -1;
    for (var i = 0; i < 64; i++) { var c = n.board[i]; if (c === 'Q' || c === 'R') q = i; if (c === 'K') wk = i; if (c === 'k') bk = i; }
    if (q < 0) return false;
    return !(ADJ[bk * 64 + q] && !ADJ[wk * 64 + q]);
  }

  // Bir hamleden sonra beyaz hâlâ kazanıyor mu?
  function moveKeepsWin(st, m, E) {
    var n = E.makeMove(st, m);
    if (m.promotion) return (m.promotion === 'q' || m.promotion === 'r') && promoWins(n, E);
    var pr = probe(n);
    return !!(pr && pr.win);
  }

  function winningMoves(st, E) {
    return E.legalMoves(st).filter(function (m) { return moveKeepsWin(st, m, E); });
  }

  // Siyahın en iyi savunması: beraberliği koruyan hamle, yoksa kaybı en çok geciktiren.
  function bestBlackMove(st, E) {
    var ms = E.legalMoves(st);
    var best = null, bestKey = -1;
    ms.forEach(function (m) {
      var n = E.makeMove(st, m);
      var pr = probe(n);
      var key = !pr ? 1000 : (pr.win ? pr.dtw : 500 + Math.random() * 10);
      if (key > bestKey) { bestKey = key; best = m; }
    });
    return best;
  }

  var api = {
    build: build,
    probe: probe,
    winningMoves: winningMoves,
    moveKeepsWin: moveKeepsWin,
    bestBlackMove: bestBlackMove,
    promoWins: promoWins
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.KPK = api;
})(typeof window !== 'undefined' ? window : globalThis);
