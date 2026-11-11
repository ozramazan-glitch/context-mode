// Oyunsonu çözücüleri: bilinen teorik sonuçlarla karşılaştırma.
import assert from 'node:assert/strict';
import { loadScripts } from './load.mjs';

const { ChessEngine: E, KPK, KXK } = loadScripts(['js/engine.js', 'js/kpk.js', 'js/kxk.js']);
let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✓ ' + name); }
  catch (e) { console.error('  ✗ ' + name + '\n    ' + e.message); process.exitCode = 1; }
}
const probe = (fen) => KPK.probe(E.parseFEN(fen));

console.log('Oyunsonu testleri');
test('KPK: şah 6. sırada piyonunun önünde → her iki sırada da kazanç', () => {
  assert.equal(probe('4k3/8/4K3/4P3/8/8/8/8 w - - 0 1').win, true);
  assert.equal(probe('4k3/8/4K3/4P3/8/8/8/8 b - - 0 1').win, true);
});
test('KPK: opozisyon — sıra beyazdaysa berabere, siyahtaysa kazanç', () => {
  assert.equal(probe('8/4k3/8/4K3/4P3/8/8/8 w - - 0 1').win, false);
  assert.equal(probe('8/4k3/8/4K3/4P3/8/8/8 b - - 0 1').win, true);
});
test('KPK: köşedeki şaha karşı kale piyonu berabere', () => {
  assert.equal(probe('k7/8/1K6/P7/8/8/8/8 w - - 0 1').win, false);
});
test('KPK: Şe2+d2 – Şd5 konumunda tek kazandıran hamle Şd3', () => {
  const st = E.parseFEN('8/8/8/3k4/8/8/3PK3/8 w - - 0 1');
  assert.deepEqual(Array.from(KPK.winningMoves(st, E).map(E.toUci)), ['e2d3']);
});
test('KQK: en uzun mat 10 hamle (19 yarım hamle)', () => {
  const tb = KXK.build('q'); let mx = 0;
  for (let i = 0; i < 262144; i++) if (tb.res[i] === 1 && tb.dtm[i] > mx) mx = tb.dtm[i];
  assert.equal(mx, 19);
});
test('KRK: en uzun mat 16 hamle (31 yarım hamle)', () => {
  const tb = KXK.build('r'); let mx = 0;
  for (let i = 0; i < 262144; i++) if (tb.res[i] === 1 && tb.dtm[i] > mx) mx = tb.dtm[i];
  assert.equal(mx, 31);
});
test('KXK: en iyi oyunla tahmin edilen hamle sayısında mat', () => {
  for (const fen of ['8/8/8/4k3/8/8/8/3QK3 w - - 0 1', '8/8/8/4k3/8/8/8/R3K3 w - - 0 1']) {
    let st = E.parseFEN(fen); const expected = Math.ceil(KXK.probe(st).dtm / 2); let n = 0;
    while (n < 40) {
      st = E.makeMove(st, KXK.bestWhite(st, E)); n++;
      if (E.status(st) === 'checkmate') break;
      st = E.makeMove(st, KXK.bestBlack(st, E));
    }
    assert.equal(E.status(st), 'checkmate');
    assert.equal(n, expected, fen);
  }
});
console.log(`${passed} test geçti`);
