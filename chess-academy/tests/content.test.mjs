// İçerik doğrulama: her ders kartı ve alıştırma motorla kontrol edilir.
// Amaç: yanlış çözümlü bulmaca, kural dışı konum veya hatalı soru cevabı yayınlamamak.
import assert from 'node:assert/strict';
import { loadScripts } from './load.mjs';

const ctx = loadScripts(['js/engine.js', 'js/kpk.js', 'js/kxk.js', 'js/curriculum.js', 'js/special.js']);
const { ChessEngine: E, KPK, KXK, CURRICULUM, SPECIAL } = ctx;
const verbose = process.argv.includes('--verbose');

let passed = 0, failed = 0;
function check(name, fn) {
  try { fn(); passed++; if (verbose) console.log('  ✓ ' + name); }
  catch (e) { failed++; console.error('  ✗ ' + name + '\n    ' + e.message); }
}
const isSq = (s) => E.sqIndex(s) >= 0;

// Yıldız alıştırması için en kısa çözüm (genişlik öncelikli arama).
export function starsPar(ex) {
  const st0 = E.parseFEN(ex.fen);
  const stars = ex.stars.map(E.sqIndex);
  const start = { st: st0, sq: E.sqIndex(ex.piece), mask: 0, d: 0 };
  const key = (n) => n.sq + ':' + n.mask + ':' + E.toFEN(n.st).split(' ')[0];
  const seen = new Set([key(start)]);
  const q = [start];
  const full = (1 << stars.length) - 1;
  while (q.length) {
    const n = q.shift();
    if (n.mask === full) return n.d;
    if (n.d > 12) continue;
    const s = E.cloneState(n.st); s.turn = 'w'; s.ep = -1;
    for (const m of E.legalMoves(s, n.sq)) {
      const st = E.makeMove(s, m); st.turn = 'w'; st.ep = -1;
      let mask = n.mask; const i = stars.indexOf(m.to); if (i >= 0) mask |= 1 << i;
      const nn = { st, sq: m.to, mask, d: n.d + 1 };
      const k = key(nn); if (seen.has(k)) continue; seen.add(k); q.push(nn);
    }
  }
  return -1;
}

function legalPosition(st, label) {
  assert.ok(E.findKing(st.board, 'w') >= 0, label + ': beyaz şah yok');
  assert.ok(E.findKing(st.board, 'b') >= 0, label + ': siyah şah yok');
  assert.ok(!E.inCheck(st, E.opp(st.turn)), label + ': sırası olmayan taraf şah altında (kural dışı konum)');
}

function engineCheckPuzzle(ex, st, step, acceptSet) {
  const good = (ex.alsoGood && ex.alsoGood[step]) || [];
  // Kabul edilen hamle motora göre en iyi olmalı ve kabul edilmeyen en iyi hamleden belirgin şekilde iyi olmalı.
  const scored = E.scoreRootMoves(st, 3);
  const bestAcc = scored.find((x) => acceptSet.includes(E.toUci(x.move)));
  const bestOther = scored.find((x) => !acceptSet.includes(E.toUci(x.move)) && !good.includes(E.toUci(x.move)));
  assert.ok(bestAcc, `${ex.id} adım ${step}: kabul edilen hamle yasal değil`);
  const after = E.makeMove(st, bestAcc.move);
  if (E.status(after) === 'checkmate') return;
  if (bestOther) {
    const margin = bestAcc.score - bestOther.score;
    if (verbose) console.log(`    ${ex.id} adım ${step}: çözüm ${E.toUci(bestAcc.move)}=${bestAcc.score}, sonraki en iyi ${E.toUci(bestOther.move)}=${bestOther.score}`);
    assert.ok(margin >= 100, `${ex.id} adım ${step}: çözüm (${E.toUci(bestAcc.move)} ${bestAcc.score}) ile alternatif (${E.toUci(bestOther.move)} ${bestOther.score}) arasındaki fark yetersiz`);
  }
}

// Yöntem öğreten (task) alıştırmalarda istenen hamle en iyisi olmayabilir ama hata da olmamalı.
function taskSanity(ex, st, step, acc) {
  const scored = E.scoreRootMoves(st, 3);
  const best = scored[0];
  acc.forEach((a) => {
    const mine = scored.find((x) => E.toUci(x.move) === a);
    assert.ok(best.score - mine.score <= 120, `${ex.id}: istenen ${a} (${mine.score}) en iyi hamleden (${E.toUci(best.move)} ${best.score}) çok kötü`);
  });
}

function replyCheck(ex, st, reply, step) {
  const scored = E.scoreRootMoves(st, 3);
  const best = scored[0];
  const mine = scored.find((x) => E.toUci(x.move) === reply);
  assert.ok(mine, `${ex.id}: senaryo cevabı ${reply} yasal değil`);
  // Senaryodaki cevap, savunan için en iyi cevaptan çok kötü olmamalı (yoksa bulmaca gerçekçi olmaz).
  assert.ok(best.score - mine.score <= 150, `${ex.id} adım ${step}: senaryo cevabı ${reply} (${mine.score}) en iyi savunma ${E.toUci(best.move)} (${best.score}) yanında çok zayıf`);
}

function checkExercise(ex) {
  const id = ex.id;
  switch (ex.type) {
    case 'coord':
      assert.ok(ex.targets.length && ex.targets.every(isSq), id + ': hedef kareler'); break;
    case 'pick':
    case 'squares': {
      const st = E.parseFEN(ex.fen);
      if (ex.from) {
        const d = E.destinations(st, E.sqIndex(ex.from));
        assert.ok(d.length > 0, id + ': taşın gidebileceği kare yok');
      } else assert.ok(ex.answer.length && ex.answer.every(isSq), id + ': cevap kareleri');
      break;
    }
    case 'stars': {
      const st = E.parseFEN(ex.fen);
      assert.ok(st.board[E.sqIndex(ex.piece)] && E.colorOf(st.board[E.sqIndex(ex.piece)]) === 'w', id + ': hareket eden taş beyaz olmalı');
      assert.ok(ex.stars.every(isSq), id + ': yıldız kareleri');
      const par = starsPar(ex);
      assert.ok(par > 0, id + ': yıldızların hepsine ulaşılamıyor');
      if (verbose) console.log(`    ${id}: en az ${par} hamle`);
      break;
    }
    case 'quiz': {
      assert.ok(ex.answer >= 0 && ex.answer < ex.options.length, id + ': cevap indeksi');
      const v = ex.verify;
      if (v) {
        const st = E.parseFEN(ex.fen);
        if (v.status) assert.equal(E.status(st), v.status, id + ': konum durumu');
        if (v.move) assert.equal(!!E.moveFromUci(st, v.move), v.legal, id + ': ' + v.move + ' yasallığı');
        if (v.squareAttacked) assert.ok(E.isAttacked(st.board, E.sqIndex(v.squareAttacked), E.opp(st.turn)), id + ': ' + v.squareAttacked + ' tehdit altında olmalı');
        if (v.inCheck) assert.ok(E.inCheck(st), id + ': şah altında olmalı');
        if (v.kpkWin !== undefined) {
          const pr = KPK.probe(st);
          assert.ok(pr, id + ': KPK konumu değil');
          assert.equal(pr.win, v.kpkWin, id + ': kare kuralı sonucu');
        }
      }
      if (ex.fen) E.parseFEN(ex.fen);
      break;
    }
    case 'puzzle': {
      let st = E.parseFEN(ex.fen);
      const hasKings = E.findKing(st.board, 'w') >= 0 && E.findKing(st.board, 'b') >= 0;
      if (hasKings) legalPosition(st, id);
      for (const p of ex.pre || []) {
        const m = E.moveFromUci(st, p); assert.ok(m, id + ': ön hamle ' + p + ' yasal değil'); st = E.makeMove(st, m);
      }
      assert.equal(st.turn, 'w', id + ': kullanıcı beyazla oynamalı');
      for (let i = 0; i < ex.line.length; i++) {
        const uci = ex.line[i];
        const m = E.moveFromUci(st, uci);
        assert.ok(m, `${id}: çözüm hamlesi ${uci} yasal değil`);
        if (i % 2 === 0) {
          const acc = (ex.accept && ex.accept[i]) || [uci];
          acc.forEach((a) => assert.ok(E.moveFromUci(st, a), `${id}: kabul edilen ${a} yasal değil`));
          if (ex.verify && ex.verify.kpkOnly) {
            const wins = KPK.winningMoves(st, E).map(E.toUci).sort();
            assert.equal(JSON.stringify(Array.from(wins)), JSON.stringify(acc.slice().sort()), id + ': KPK kazandıran hamleler');
          } else if (hasKings && !ex.task) engineCheckPuzzle(ex, st, i, acc);
          else if (hasKings) taskSanity(ex, st, i, acc);
          Object.keys(ex.wrong || {}).forEach((w) => assert.ok(E.moveFromUci(st, w) || i > 0, `${id}: yanlış hamle açıklaması ${w} yasal değil`));
        } else if (hasKings) replyCheck(ex, st, uci, i);
        st = E.makeMove(st, m);
      }
      break;
    }
    case 'mate': {
      const st = E.parseFEN(ex.fen);
      legalPosition(st, id);
      const m = E.findForcedMate(st, ex.n);
      assert.ok(m, `${id}: ${ex.n} hamlede mat yok`);
      if (ex.n > 1) assert.equal(E.findForcedMate(st, ex.n - 1), null, `${id}: daha kısa mat var`);
      if (verbose) {
        const all = E.legalMoves(st).filter((mv) => E.forcedAfter(E.makeMove(st, mv), ex.n)).map((mv) => E.san(st, mv));
        console.log(`    ${id}: çözümler ${all.join(', ')}`);
      }
      break;
    }
    case 'endgame': {
      const st = E.parseFEN(ex.fen);
      legalPosition(st, id);
      assert.equal(E.status(st), 'ok', id + ': başlangıç durumu');
      assert.ok(ex.maxMoves > 0, id + ': hamle sınırı');
      if (KXK.applies(st)) {
        const p = KXK.probe(st);
        assert.ok(p && p.win, id + ': konum kazanç olmalı');
        const optimal = Math.ceil(p.dtm / 2);
        assert.ok(optimal * 2 <= ex.maxMoves, `${id}: hamle sınırı (${ex.maxMoves}) en kısa matın (${optimal}) en az iki katı olmalı`);
        if (verbose) console.log(`    ${id}: en kısa mat ${optimal} hamle`);
      }
      break;
    }
    case 'kpk': {
      const st = E.parseFEN(ex.fen);
      legalPosition(st, id);
      const pr = KPK.probe(st);
      assert.ok(pr && pr.win, id + ': konum beyaz için kazanç olmalı');
      if (verbose) console.log(`    ${id}: kazandıran ilk hamleler ${KPK.winningMoves(st, E).map((m) => E.san(st, m)).join(', ')}`);
      break;
    }
    case 'game':
      assert.ok(['kolay', 'orta', 'zor'].includes(ex.level), id + ': seviye'); break;
    default:
      throw new Error(id + ': bilinmeyen tür ' + ex.type);
  }
}

function checkCards(owner, cards) {
  cards.forEach((c, i) => {
    const label = `${owner} kart ${i + 1}`;
    let st = E.parseFEN(c.fen || CURRICULUM.EMPTY);
    (c.marks || []).forEach((s) => assert.ok(isSq(s), label + ': işaret ' + s));
    (c.arrows || []).forEach((a) => assert.ok(isSq(a[0]) && isSq(a[1]), label + ': ok'));
    if (c.showMoves) assert.ok(st.board[E.sqIndex(c.showMoves)], label + ': showMoves karesinde taş yok');
    (c.demo || []).forEach((u) => {
      const m = E.moveFromUci(st, u);
      assert.ok(m, `${label}: gösterim hamlesi ${u} yasal değil`);
      st = E.makeMove(st, m);
    });
  });
}

console.log('İçerik doğrulama');
const ids = new Set();
const all = [];
CURRICULUM.sections.forEach((s) => {
  s.lessons.forEach((l) => check(`${l.id} kartları`, () => checkCards(l.id, l.cards)));
  s.exercises.forEach((ex) => all.push(ex));
});
SPECIAL.topics.forEach((t) => {
  check(`${t.id} kartları`, () => checkCards(t.id, t.cards));
  t.exercises.forEach((ex) => all.push(ex));
});
all.forEach((ex) => {
  check(`${ex.id} benzersiz`, () => { assert.ok(!ids.has(ex.id), 'tekrarlanan id ' + ex.id); ids.add(ex.id); });
  check(`${ex.id} (${ex.type}) ${ex.title}`, () => checkExercise(ex));
});

// Ders metnindeki bir iddia: e4 piyonu için kilit kareler (d6, e6, f6).
check('kilit kare iddiası (e4 piyonu)', () => {
  for (const wkName of ['d6', 'e6', 'f6']) {
    for (let bk = 0; bk < 64; bk++) {
      for (const turn of ['w', 'b']) {
        const st = E.parseFEN('8/8/8/8/4P3/8/8/8 w - - 0 1');
        const wk = E.sqIndex(wkName);
        if (bk === wk || bk === E.sqIndex('e4')) continue;
        st.board[wk] = 'K'; st.board[bk] = 'k'; st.turn = turn;
        const pr = KPK.probe(st);
        if (!pr) continue; // geçersiz konum
        // Piyonu hemen alınabilecek konumlar istisnadır (ders metni “piyonu tehlikeye atmadan” diyor).
        const pawnHangs = turn === 'b' && E.legalMoves(st).some((m) => m.to === E.sqIndex('e4'));
        if (pawnHangs) continue;
        if (turn === 'w' && E.inCheck(st, 'b')) continue;
        assert.ok(pr.win, `Şah ${wkName}, siyah şah ${E.sqName(bk)}, sıra ${turn}: kazanç bekleniyordu`);
      }
    }
  }
});

console.log(`${passed} kontrol geçti, ${failed} başarısız (${all.length} alıştırma)`);
if (failed) process.exitCode = 1;
