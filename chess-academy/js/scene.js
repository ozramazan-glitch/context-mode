/*
 * Kuantum Arena teması için arka plan sahnesi (WebGL, three.js r128).
 * Yıldız alanı (sayfa geçişinde "ışık hızı" çizgilerine dönüşür), sonsuz
 * ızgara zemin ve yavaşça dönen hologram satranç tahtası. Fare hareketiyle
 * kamera hafifçe kayar. Sekme görünmezken durur; "hareketi azalt" açıksa
 * tek kare çizilir.
 *
 * İki kip vardır: 'arena' (Kuantum Arena: parlak, hızlı) ve 'calm'
 * (Kuantum Sakin: soluk ve yavaş yıldızlar, ızgara ve kristaller gizli,
 * ışık hızı geçişi çok hafif).
 */
(function (root) {
  'use strict';
  var S = { on: false };
  var T, renderer, scene, camera, canvas, starGeo, starArr, grid, holo, crystals = [];
  var raf = 0, last = 0, warpBoost = 0, mouse = { x: 0, y: 0 }, N = 0;
  var BASE = 0.9, MODE = 'arena', starMat, edgeMat, sqMats = [];
  var MODES = {
    arena: { base: 0.9, warp: 26, star: 0xa8e6ff, starOp: 0.85, fog: 0x05070f, grid: true, crystals: true, sq: [0.16, 0.07], edge: 0x3df2ff, edgeOp: 0.75, spin: 0.12 },
    calm: { base: 0.16, warp: 5, star: 0xc9d6f0, starOp: 0.38, fog: 0x0b1020, grid: false, crystals: false, sq: [0.06, 0.03], edge: 0x7fd3e0, edgeOp: 0.22, spin: 0.04 }
  };
  function applyMode() {
    var m = MODES[MODE];
    BASE = m.base;
    if (!renderer) return;
    starMat.color.setHex(m.star); starMat.opacity = m.starOp;
    scene.fog.color.setHex(m.fog);
    grid.visible = m.grid;
    crystals.forEach(function (c) { c.visible = m.crystals; });
    sqMats[0].opacity = m.sq[0]; sqMats[1].opacity = m.sq[1];
    edgeMat.color.setHex(m.edge); edgeMat.opacity = m.edgeOp;
  }

  function reduced() {
    try { return root.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }

  function init() {
    T = root.THREE;
    canvas = document.createElement('canvas');
    canvas.className = 'bg-scene';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(canvas, document.body.firstChild);
    renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    var small = root.innerWidth < 700;
    renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, small ? 1 : 1.5));
    scene = new T.Scene();
    scene.fog = new T.FogExp2(0x05070f, 0.016);
    camera = new T.PerspectiveCamera(60, 1, 0.1, 300);
    camera.position.set(0, 1.5, 12);

    // Yıldızlar: her yıldız kısa bir çizgi (baş ve kuyruk); hızlanınca uzar.
    N = small ? 600 : 1300;
    starArr = new Float32Array(N * 6);
    for (var i = 0; i < N; i++) {
      var x = (Math.random() - 0.5) * 150, y = (Math.random() - 0.5) * 90, z = -Math.random() * 170 + 14;
      starArr.set([x, y, z, x, y, z - 0.08], i * 6);
    }
    starGeo = new T.BufferGeometry();
    starGeo.setAttribute('position', new T.BufferAttribute(starArr, 3));
    starMat = new T.LineBasicMaterial({ color: 0xa8e6ff, transparent: true, opacity: 0.85, blending: T.AdditiveBlending, depthWrite: false });
    var stars = new T.LineSegments(starGeo, starMat);
    scene.add(stars);

    // Sonsuz ızgara zemin
    grid = new T.GridHelper(260, 104, 0x3df2ff, 0x1a2f66);
    grid.position.y = -9;
    grid.material.transparent = true;
    grid.material.opacity = 0.3;
    scene.add(grid);

    // Hologram satranç tahtası
    holo = new T.Group();
    var sqGeo = new T.PlaneGeometry(0.94, 0.94);
    var mA = new T.MeshBasicMaterial({ color: 0x3df2ff, transparent: true, opacity: 0.16, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending });
    var mB = new T.MeshBasicMaterial({ color: 0xb46bff, transparent: true, opacity: 0.07, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending });
    for (var r = 0; r < 8; r++) for (var f = 0; f < 8; f++) {
      var sq = new T.Mesh(sqGeo, (r + f) % 2 ? mA : mB);
      sq.position.set(f - 3.5, 0, r - 3.5);
      sq.rotation.x = -Math.PI / 2;
      holo.add(sq);
    }
    sqMats = [mA, mB];
    edgeMat = new T.LineBasicMaterial({ color: 0x3df2ff, transparent: true, opacity: 0.75 });
    holo.add(new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(8.4, 0.25, 8.4)), edgeMat));
    // Tahta üstünde süzülen tel kafes taşlar (geometrik "veri kristalleri")
    var shapes = [new T.OctahedronGeometry(0.55), new T.BoxGeometry(0.7, 0.7, 0.7), new T.IcosahedronGeometry(0.5), new T.TetrahedronGeometry(0.6), new T.CylinderGeometry(0.3, 0.45, 0.9, 6)];
    for (var k = 0; k < 7; k++) {
      var w = new T.LineSegments(new T.EdgesGeometry(shapes[k % shapes.length]), new T.LineBasicMaterial({ color: k % 2 ? 0xff4fd8 : 0x3df2ff, transparent: true, opacity: 0.85 }));
      w.position.set((Math.random() - 0.5) * 7, 0.8 + Math.random() * 2.4, (Math.random() - 0.5) * 7);
      w.userData.base = w.position.y;
      holo.add(w);
      crystals.push(w);
    }
    scene.add(holo);
    applyMode();

    resize();
    root.addEventListener('resize', resize);
    root.addEventListener('pointermove', function (e) { mouse.x = e.clientX / root.innerWidth - 0.5; mouse.y = e.clientY / root.innerHeight - 0.5; }, { passive: true });
    document.addEventListener('visibilitychange', function () { if (!document.hidden && S.on && !raf) start(); });
  }

  function resize() {
    if (!renderer) return;
    var w = root.innerWidth, h = root.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (w < 860) { holo.position.set(0, -3.2, -16); holo.scale.setScalar(1); }
    else { holo.position.set(10, -1.2, -12); holo.scale.setScalar(1.15); }
    holo.rotation.set(0.42, -0.6, 0.08);
    if (S.on && !raf) frame(performance.now(), true);
  }

  function frame(t, once) {
    var dt = Math.min(0.05, last ? (t - last) / 1000 : 0.016);
    last = t;
    var speed = BASE + warpBoost;
    warpBoost *= Math.pow(0.03, dt);
    var v = speed * dt * 12, len = 0.08 + speed * 0.35;
    for (var i = 0; i < N; i++) {
      var o = i * 6;
      var z = starArr[o + 2] + v;
      if (z > 14) z -= 175;
      starArr[o + 2] = z;
      starArr[o + 5] = z - len;
    }
    starGeo.attributes.position.needsUpdate = true;
    grid.position.z = (grid.position.z + v * 0.6) % 2.5;
    if (!once) {
      holo.rotation.y += dt * MODES[MODE].spin;
      crystals.forEach(function (c, i) {
        c.rotation.x += dt * (0.3 + i * 0.05);
        c.rotation.y += dt * 0.45;
        c.position.y = c.userData.base + Math.sin(t / 900 + i) * 0.25;
      });
    }
    camera.position.x += (mouse.x * 3 - camera.position.x) * 0.04;
    camera.position.y += (1.5 - mouse.y * 2 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, -20);
    renderer.render(scene, camera);
  }

  function loop(t) {
    if (!S.on || document.hidden) { raf = 0; return; }
    raf = requestAnimationFrame(loop);
    frame(t);
  }
  function start() {
    if (reduced()) { frame(performance.now(), true); return; }
    if (!raf) { last = 0; raf = requestAnimationFrame(loop); }
  }

  S.start = function () {
    if (S.on) return;
    S.on = true;
    var load = root.Board3D && root.Board3D.load ? root.Board3D.load() : Promise.reject(new Error('3B yükleyici yok'));
    load.then(function () {
      if (!S.on) return;
      if (!renderer) {
        try { init(); } catch (e) { S.on = false; return; }
      }
      canvas.style.display = '';
      document.documentElement.classList.add('has-scene');
      start();
    }).catch(function () { S.on = false; });
  };
  S.stop = function () {
    S.on = false;
    if (canvas) canvas.style.display = 'none';
    document.documentElement.classList.remove('has-scene');
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };
  // Sayfa geçişinde ışık hızı (sakin kipte yalnızca hafif bir hızlanma)
  S.warp = function () { warpBoost = MODES[MODE].warp; };
  S.setMode = function (m) {
    if (!MODES[m] || m === MODE) return;
    MODE = m; applyMode();
    if (renderer && S.on && (reduced() || !raf)) frame(performance.now(), true);
  };
  root.Scene = S;
})(typeof window !== 'undefined' ? window : globalThis);
