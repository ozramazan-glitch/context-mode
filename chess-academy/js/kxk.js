/*
 * Şah + Vezir/Kale – Şah (KQK, KRK) oyunsonu çözücüsü.
 *
 * Geriye doğru analizle her konum için "mata kaç yarım hamle kaldı" (DTM)
 * değerini kesin olarak hesaplar. Kullanım alanları:
 *  - bilgisayar en uzun direnen savunmayı oynar,
 *  - ipucu en kısa mata götüren hamleyi gösterir,
 *  - kullanıcının hamle sayısı en kısa matla karşılaştırılır.
 * Güçlü taraf her zaman beyazdır.
 */
(function (root) {
  'use strict';

  var SIDE = 64 * 64 * 64;
  var tables = {}; // 'q' | 'r' -> { res, dtm }
  var ADJ = new Uint8Array(4096), KG = [], RAYS = [];
  var DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
  (function () {
    for (var a = 0; a < 64; a++) {
      KG[a] = []; RAYS[a] = [];
      for (var b = 0; b < 64; b++) {
        var d = Math.max(Math.abs((a & 7) - (b & 7)), Math.abs((a >> 3) - (b >> 3)));
        ADJ[a * 64 + b] = d <= 1 ? 1 : 0;
        if (d === 1) KG[a].push(b);
      }
      for (var k = 0; k < 8; k++) {
        var ray = [], f = (a & 7) + DIRS[k][0], r = (a >> 3) + DIRS[k][1];
        while (f >= 0 && f < 8 && r >= 0 && r < 8) { ray.push(r * 8 + f); f += DIRS[k][0]; r += DIRS[k][1]; }
        RAYS[a].push(ray);
      }
    }
  })();

  // x karesindeki taş t karesine saldırıyor mu? Tek engel beyaz şah (wk).
  function attacks(type, x, t, wk) {
    var nd = type === 'q' ? 8 : 4;
    for (var k = 0; k < nd; k++) {
      var ray = RAYS[x][k];
      for (var i = 0; i < ray.length; i++) {
        if (ray[i] === t) return true;
        if (ray[i] === wk) break;
      }
    }
    return false;
  }

  function build(type) {
    if (tables[type]) return tables[type];
    var res = new Uint8Array(2 * SIDE), dtm = new Uint8Array(2 * SIDE);
    var wk, bk, x, i, k, t;
    var nd = type === 'q' ? 8 : 4;
    // Geçersizleri işaretle, matları bul
    for (wk = 0; wk < 64; wk++) for (bk = 0; bk < 64; bk++) for (x = 0; x < 64; x++) {
      i = (wk * 64 + bk) * 64 + x;
      if (wk === bk || wk === x || bk === x || ADJ[wk * 64 + bk]) { res[i] = 2; res[i + SIDE] = 2; continue; }
      if (attacks(type, x, bk, wk)) res[i] = 2; // beyaz sıradayken siyah şah tehdit altında olamaz
      // siyah sırada: mat mı?
      var inCheck = attacks(type, x, bk, wk), any = false;
      for (k = 0; k < KG[bk].length; k++) {
        t = KG[bk][k];
        if (ADJ[t * 64 + wk]) continue;
        if (t === x) { any = true; break; } // korumasız taşı alabilir
        if (attacks(type, x, t, wk)) continue;
        any = true; break;
      }
      if (!any && inCheck) { res[i + SIDE] = 1; dtm[i + SIDE] = 0; }
    }
    var ply = 0, idle = 0;
    while (idle < 2 && ply < 80) {
      ply++;
      var changed = false;
      if (ply % 2 === 1) {
        // Beyaz sırada: siyahın kaybettiği bir konuma giden hamle var mı?
        for (wk = 0; wk < 64; wk++) for (bk = 0; bk < 64; bk++) for (x = 0; x < 64; x++) {
          i = (wk * 64 + bk) * 64 + x;
          if (res[i] !== 0) continue;
          var win = false;
          var kg = KG[wk];
          for (k = 0; !win && k < kg.length; k++) {
            t = kg[k];
            if (t === x || ADJ[t * 64 + bk]) continue;
            var j = (t * 64 + bk) * 64 + x + SIDE;
            if (res[j] === 1 && dtm[j] === ply - 1) win = true;
          }
          for (var d = 0; !win && d < nd; d++) {
            var ray = RAYS[x][d];
            for (var q = 0; q < ray.length; q++) {
              t = ray[q];
              if (t === wk || t === bk) break;
              var j2 = (wk * 64 + bk) * 64 + t + SIDE;
              if (res[j2] === 1 && dtm[j2] === ply - 1) { win = true; break; }
            }
          }
          if (win) { res[i] = 1; dtm[i] = ply; changed = true; }
        }
      } else {
        // Siyah sırada: tüm hamleler beyazın kazandığı konumlara mı gidiyor?
        for (wk = 0; wk < 64; wk++) for (bk = 0; bk < 64; bk++) for (x = 0; x < 64; x++) {
          i = (wk * 64 + bk) * 64 + x + SIDE;
          if (res[i] !== 0) continue;
          var lose = true, moves = 0;
          for (k = 0; k < KG[bk].length; k++) {
            t = KG[bk][k];
            if (ADJ[t * 64 + wk]) continue;
            if (t === x) { lose = false; break; }
            if (attacks(type, x, t, wk)) continue;
            moves++;
            var j3 = (wk * 64 + t) * 64 + x;
            if (res[j3] !== 1 || dtm[j3] >= ply) { lose = false; break; }
          }
          if (lose && moves > 0) { res[i] = 1; dtm[i] = ply; changed = true; }
        }
      }
      idle = changed ? 0 : idle + 1;
    }
    tables[type] = { res: res, dtm: dtm };
    return tables[type];
  }

  function squaresOf(st) {
    var wk = -1, bk = -1, x = -1, type = null, extra = false;
    for (var i = 0; i < 64; i++) {
      var c = st.board[i]; if (!c) continue;
      if (c === 'K') wk = i; else if (c === 'k') bk = i;
      else if ((c === 'Q' || c === 'R') && x < 0) { x = i; type = c.toLowerCase(); }
      else extra = true;
    }
    if (extra || wk < 0 || bk < 0 || x < 0) return null;
    return { wk: wk, bk: bk, x: x, type: type };
  }

  // { win, dtm } — dtm: mata kalan yarım hamle; yalnızca uygun konumlarda.
  function probe(st) {
    var q = squaresOf(st); if (!q) return null;
    var tb = build(q.type);
    var i = (q.wk * 64 + q.bk) * 64 + q.x + (st.turn === 'w' ? 0 : SIDE);
    if (tb.res[i] === 2) return null;
    return { win: tb.res[i] === 1, dtm: tb.dtm[i] };
  }
  function applies(st) { return !!squaresOf(st); }

  // Beyaz için en kısa mata götüren hamle
  function bestWhite(st, E) {
    var best = null, bd = 999;
    E.legalMoves(st).forEach(function (m) {
      var n = E.makeMove(st, m);
      if (E.status(n) === 'checkmate') { if (bd > 0) { bd = 0; best = m; } return; }
      var p = probe(n);
      if (p && p.win && p.dtm < bd) { bd = p.dtm; best = m; }
    });
    return best;
  }
  // Siyah için en uzun direnen hamle (alabiliyorsa taşı alır)
  function bestBlack(st, E) {
    var best = null, bd = -1;
    E.legalMoves(st).forEach(function (m) {
      if (m.captured) { best = m; bd = 999; return; }
      var n = E.makeMove(st, m), p = probe(n);
      var v = !p ? 999 : p.win ? p.dtm + Math.random() * 0.5 : 998;
      if (v > bd) { bd = v; best = m; }
    });
    return best;
  }

  var api = { build: build, probe: probe, applies: applies, bestWhite: bestWhite, bestBlack: bestBlack };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.KXK = api;
})(typeof window !== 'undefined' ? window : globalThis);
