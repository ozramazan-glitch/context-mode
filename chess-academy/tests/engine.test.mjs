// Kural motoru testleri: bilinen perft değerleri (hamle ağacı sayımı) ve notasyon.
import assert from 'node:assert/strict';
import { loadScripts } from './load.mjs';

const { ChessEngine: E } = loadScripts(['js/engine.js']);

// Kaynak: Chess Programming Wiki "Perft Results" tablosu.
const PERFT = [
  { name: 'başlangıç', fen: E.START_FEN, counts: [20, 400, 8902, 197281] },
  { name: 'kiwipete', fen: 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', counts: [48, 2039, 97862] },
  { name: 'pozisyon 3', fen: '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', counts: [14, 191, 2812, 43238] },
  { name: 'pozisyon 4', fen: 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', counts: [6, 264, 9467] },
  { name: 'pozisyon 5', fen: 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', counts: [44, 1486, 62379] },
];

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✓ ' + name); }
  catch (e) { console.error('  ✗ ' + name + '\n    ' + e.message); process.exitCode = 1; }
}

console.log('Motor testleri');
for (const p of PERFT) {
  const st = E.parseFEN(p.fen);
  p.counts.forEach((c, i) => test(`perft ${p.name} d${i + 1} = ${c}`, () => assert.equal(E.perft(st, i + 1), c)));
}

test('FEN gidiş-dönüş', () => {
  for (const p of PERFT) assert.equal(E.toFEN(E.parseFEN(p.fen)), p.fen);
});

test('Türkçe notasyon: rok, terfi, şah, mat', () => {
  let st = E.parseFEN('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  assert.equal(E.san(st, E.moveFromUci(st, 'e1g1')), 'O-O');
  assert.equal(E.san(st, E.moveFromUci(st, 'e1c1')), 'O-O-O');
  st = E.parseFEN('7k/5P2/6K1/8/8/8/8/8 w - - 0 1');
  assert.equal(E.san(st, E.moveFromUci(st, 'f7f8q')), 'f8=V#');
  assert.equal(E.san(st, E.moveFromUci(st, 'f7f8n')), 'f8=A');
  st = E.parseFEN('6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1');
  assert.equal(E.san(st, E.moveFromUci(st, 'a1a8')), 'Ka8#');
  st = E.parseFEN('4k3/8/8/8/8/8/8/1N2KN2 w - - 0 1');
  assert.equal(E.san(st, E.moveFromUci(st, 'b1d2')), 'Abd2');
});

test('geçerken alma yalnızca hemen sonraki hamlede', () => {
  let st = E.parseFEN('4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1');
  st = E.makeMove(st, E.moveFromUci(st, 'd7d5'));
  assert.ok(E.moveFromUci(st, 'e5d6'), 'hemen sonra yasal olmalı');
  let late = E.makeMove(st, E.moveFromUci(st, 'e1e2'));
  late = E.makeMove(late, E.moveFromUci(late, 'e8e7'));
  assert.equal(E.moveFromUci(late, 'e5d6'), null, 'bir hamle sonra yasal olmamalı');
});

test('mat ve pat tespiti', () => {
  assert.equal(E.status(E.parseFEN('7k/5KQ1/8/8/8/8/8/8 b - - 0 1')), 'checkmate');
  assert.equal(E.status(E.parseFEN('7k/5K2/6Q1/8/8/8/8/8 b - - 0 1')), 'stalemate');
  assert.equal(E.status(E.parseFEN('8/8/8/8/8/2k5/8/K1B5 w - - 0 1')), 'insufficient');
});

test('mat arayıcı: 2 hamlede mat bulur', () => {
  const st = E.parseFEN('3qr1k1/5ppp/8/8/8/8/4QPPP/4R1K1 w - - 0 1');
  const m = E.findForcedMate(st, 2);
  assert.ok(m, 'mat bulunmalı');
  assert.equal(E.findForcedMate(st, 1), null, 'tek hamlede mat olmamalı');
});

test('arama asılı veziri alır', () => {
  const st = E.parseFEN('4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1');
  const r = E.search(st, { depth: 3 });
  assert.equal(E.toUci(r.move), 'd1d5');
});

console.log(`${passed} test geçti`);
