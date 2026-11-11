/*
 * 3B tahta çizici (Three.js r128, cdnjs üzerinden ihtiyaç anında yüklenir).
 * Arayüzü 2B çiziciyle aynıdır: render(state, deco, anim), destroy().
 * Fareyle/parmakla sürükleyerek kamera döner, tekerlek veya iki parmakla yakınlaşır.
 */
(function (root) {
  'use strict';
  var E = root.ChessEngine;
  // Önce cdnjs, olmazsa jsDelivr (ikisi de aynı sürüm: three.js r128).
  var THREE_URLS = [
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
    'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js'
  ];
  var loading = null;
  var reduceMotion = false;
  try { reduceMotion = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* yok */ }

  function loadFrom(i, resolve, reject) {
    if (i >= THREE_URLS.length) { loading = null; reject(new Error('3B kitaplığı indirilemedi (internet bağlantısı gerekir).')); return; }
    var s = document.createElement('script');
    s.src = THREE_URLS[i];
    s.async = true;
    s.onload = function () { if (root.THREE) resolve(); else { s.remove(); loadFrom(i + 1, resolve, reject); } };
    s.onerror = function () { s.remove(); loadFrom(i + 1, resolve, reject); };
    document.head.appendChild(s);
  }
  function load() {
    if (root.THREE) return Promise.resolve();
    if (!loading) loading = new Promise(function (resolve, reject) { loadFrom(0, resolve, reject); });
    return loading;
  }

  function cssVar(name, fallback) {
    try { var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v || fallback; } catch (e) { return fallback; }
  }

  // ---- Taş geometrileri (bir kez oluşturulur) ----
  var GEO = null;
  function v2(x, y) { return new root.THREE.Vector2(x, y); }
  function lathe(pts) { return new root.THREE.LatheGeometry(pts.map(function (p) { return v2(p[0], p[1]); }), 40); }
  function buildGeometries() {
    if (GEO) return GEO;
    var T = root.THREE;
    var base = [[0, 0], [0.34, 0], [0.35, 0.03], [0.34, 0.07], [0.29, 0.1], [0.27, 0.13], [0.22, 0.15]];
    GEO = {
      p: [lathe(base.concat([[0.15, 0.2], [0.11, 0.33], [0.1, 0.38], [0.17, 0.4], [0.17, 0.43], [0.09, 0.45], [0, 0.45]])), [new T.SphereGeometry(0.13, 28, 20), 0, 0.54, 0]],
      r: [lathe(base.concat([[0.2, 0.2], [0.19, 0.48], [0.25, 0.5], [0.26, 0.64], [0.19, 0.64], [0.19, 0.6], [0, 0.6]]))],
      n: [lathe(base.concat([[0.2, 0.2], [0.2, 0.24], [0, 0.24]]))],
      b: [lathe(base.concat([[0.15, 0.2], [0.1, 0.48], [0.17, 0.5], [0.17, 0.53], [0.09, 0.55], [0, 0.55]])), [new T.SphereGeometry(0.16, 28, 20), 0, 0.68, 0, 1, 1.35, 1], [new T.SphereGeometry(0.045, 16, 12), 0, 0.9, 0]],
      q: [lathe(base.concat([[0.17, 0.2], [0.11, 0.56], [0.2, 0.6], [0.2, 0.63], [0.12, 0.66], [0.22, 0.84], [0.17, 0.86], [0.1, 0.84], [0, 0.85]])), [new T.SphereGeometry(0.06, 16, 12), 0, 0.92, 0]],
      k: [lathe(base.concat([[0.18, 0.2], [0.12, 0.6], [0.21, 0.63], [0.21, 0.66], [0.13, 0.69], [0.19, 0.86], [0.15, 0.9], [0, 0.9]])), [new T.BoxGeometry(0.06, 0.22, 0.06), 0, 1.0, 0], [new T.BoxGeometry(0.18, 0.06, 0.06), 0, 1.02, 0]]
    };
    // Kale burçları
    for (var i = 0; i < 6; i++) {
      var a = i / 6 * Math.PI * 2;
      GEO.r.push([new T.BoxGeometry(0.09, 0.08, 0.08), Math.cos(a) * 0.21, 0.68, Math.sin(a) * 0.21, 1, 1, 1, -a]);
    }
    // Vezir tacı
    for (var j = 0; j < 8; j++) {
      var b = j / 8 * Math.PI * 2;
      GEO.q.push([new T.SphereGeometry(0.04, 12, 10), Math.cos(b) * 0.2, 0.86, Math.sin(b) * 0.2]);
    }
    // At başı: yandan görünüş çizilip ekstrüde edilir (burun +x yönünde)
    var sh = new T.Shape();
    var pts = [[-0.2, 0.2], [0.18, 0.2], [0.17, 0.33], [0.08, 0.44], [0.27, 0.52], [0.31, 0.6], [0.26, 0.69], [0.1, 0.74], [0.07, 0.84], [-0.01, 0.76], [-0.13, 0.71], [-0.21, 0.52]];
    sh.moveTo(pts[0][0], pts[0][1]);
    pts.slice(1).forEach(function (p) { sh.lineTo(p[0], p[1]); });
    sh.lineTo(pts[0][0], pts[0][1]);
    var head = new T.ExtrudeGeometry(sh, { depth: 0.24, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.03, bevelSegments: 2, curveSegments: 4 });
    head.translate(0, 0, -0.12);
    GEO.n.push([head, 0, 0, 0, 1, 1, 1, 0, true]);
    return GEO;
  }

  // Bauhaus taşları: küp, küre ve çubuklardan (ölçüler kare = 1 birime göre)
  var GEO_BH = null;
  function buildBauhaus() {
    if (GEO_BH) return GEO_BH;
    var T = root.THREE;
    var cube = function (s) { return new T.BoxGeometry(s, s, s); };
    GEO_BH = {
      p: [[cube(0.34), 0, 0.17, 0]],
      r: [[new T.BoxGeometry(0.52, 0.56, 0.52), 0, 0.28, 0]],
      n: [[cube(0.24), -0.12, 0.12, 0], [cube(0.24), -0.12, 0.36, 0], [cube(0.24), -0.12, 0.6, 0], [cube(0.24), 0.12, 0.12, 0]],
      b: [[new T.BoxGeometry(0.42, 0.1, 0.42), 0, 0.05, 0], [new T.BoxGeometry(0.13, 0.66, 0.3), 0, 0.42, 0, 1, 1, 1, 0, false, Math.PI / 4], [new T.BoxGeometry(0.13, 0.66, 0.3), 0, 0.42, 0, 1, 1, 1, 0, false, -Math.PI / 4]],
      q: [[new T.BoxGeometry(0.42, 0.34, 0.42), 0, 0.17, 0], [new T.SphereGeometry(0.21, 32, 24), 0, 0.55, 0]],
      k: [[new T.BoxGeometry(0.44, 0.4, 0.44), 0, 0.2, 0], [cube(0.27), 0, 0.6, 0, 1, 1, 1, 0, false, Math.PI / 4]]
    };
    return GEO_BH;
  }

  function starGeometry() {
    var T = root.THREE, s = new T.Shape();
    for (var i = 0; i < 10; i++) {
      var r = i % 2 ? 0.13 : 0.3, a = Math.PI / 2 + i * Math.PI / 5;
      if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r); else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    var g = new T.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1 });
    g.translate(0, 0, -0.03);
    return g;
  }

  function sqPos(s) { return { x: (s & 7) - 3.5, z: 3.5 - (s >> 3) }; }

  function Board3D(host, handlers) {
    var T = root.THREE;
    if (!T) throw new Error('3B kitaplığı yok.');
    this.h = handlers;
    this.host = host;
    this.root = document.createElement('div');
    this.root.className = 'b3d';
    host.appendChild(this.root);
    var renderer;
    try {
      renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
      this.root.remove();
      throw new Error('Bu cihazda WebGL (3B grafik) kullanılamıyor.');
    }
    this.renderer = renderer;
    renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, 2));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.root.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-label', '3B satranç tahtası');
    renderer.domElement.setAttribute('role', 'img');

    var scene = this.scene = new T.Scene();
    this.camera = new T.PerspectiveCamera(42, 1, 0.1, 100);
    this.cam = { r: 15, phi: 0.76, theta: 0 };
    this.orientation = 'w';

    scene.add(new T.HemisphereLight(0xfff4e0, 0x223322, 0.5));
    var sun = new T.DirectionalLight(0xffffff, 0.62);
    sun.position.set(-5, 11, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -7; sun.shadow.camera.right = 7; sun.shadow.camera.top = 7; sun.shadow.camera.bottom = -7;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 30;
    sun.shadow.bias = -0.0008;
    scene.add(sun);
    var fill = new T.DirectionalLight(0xc9dcff, 0.18);
    fill.position.set(6, 6, -6);
    scene.add(fill);

    // Tahta: ahşap gövde + dokulu üst yüzey
    var frame = new T.Mesh(new T.BoxGeometry(9.3, 0.36, 9.3), new T.MeshStandardMaterial({ color: new T.Color(cssVar('--frame-3d', '#5b3a22')), roughness: 0.6 }));
    frame.position.y = -0.185;
    frame.receiveShadow = true;
    scene.add(frame);
    this.topTex = this.makeBoardTexture();
    var top = this.top = new T.Mesh(new T.PlaneGeometry(9, 9), new T.MeshStandardMaterial({ map: this.topTex, roughness: 0.55 }));
    top.rotation.x = -Math.PI / 2;
    top.position.y = 0.001;
    top.receiveShadow = true;
    scene.add(top);

    this.pieceGroup = new T.Group(); scene.add(this.pieceGroup);
    this.decoGroup = new T.Group(); scene.add(this.decoGroup);
    this.meshes = {}; // sq -> { g, ch }
    this.tweens = [];
    this.stars = [];
    var white = cssVar('--piece-3d-w', '#efe4cf'), black = cssVar('--piece-3d-b', '#2a2420');
    this.mat = {
      w: new T.MeshStandardMaterial({ color: new T.Color(white), roughness: 0.42, metalness: 0.05 }),
      b: new T.MeshStandardMaterial({ color: new T.Color(black), roughness: 0.38, metalness: 0.12 })
    };
    this.ray = new T.Raycaster();
    this.ptr = new T.Vector2();
    this.dirty = true;
    this.bindInput();
    this.resize();
    var self = this;
    this.ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(function () { self.resize(); }) : null;
    if (this.ro) this.ro.observe(this.root);
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);

    var reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'cam-reset';
    reset.textContent = 'Kamerayı sıfırla';
    reset.addEventListener('click', function () { self.cam = { r: 15, phi: 0.76, theta: self.orientation === 'w' ? 0 : Math.PI }; self.dirty = true; });
    this.root.appendChild(reset);
    var tip = document.createElement('p');
    tip.className = 'cam-tip';
    tip.textContent = 'Döndürmek için sürükle';
    this.root.appendChild(tip);
  }

  Board3D.load = load;

  Board3D.prototype.makeBoardTexture = function () {
    var T = root.THREE;
    var size = 1024, cv = document.createElement('canvas');
    cv.width = cv.height = size;
    var g = cv.getContext('2d');
    var unit = size / 9, m = unit / 2;
    g.fillStyle = cssVar('--frame-3d', '#5b3a22'); g.fillRect(0, 0, size, size);
    var light = cssVar('--sq-light', '#ecd8b4'), dark = cssVar('--sq-dark', '#b08257');
    for (var r = 0; r < 8; r++) for (var f = 0; f < 8; f++) {
      g.fillStyle = (f + r) % 2 === 1 ? light : dark; // r: 0 = 1. sıra
      g.fillRect(m + f * unit, m + (7 - r) * unit, unit, unit);
    }
    g.fillStyle = cssVar('--frame-3d-ink', '#f1e3c8');
    g.font = '600 ' + Math.round(unit * 0.3) + 'px "IBM Plex Mono", monospace';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (var i = 0; i < 8; i++) {
      var x = m + i * unit + unit / 2;
      g.fillText('abcdefgh'.charAt(i), x, size - m / 2);
      g.save(); g.translate(x, m / 2); g.rotate(Math.PI); g.fillText('abcdefgh'.charAt(i), 0, 0); g.restore();
      var y = m + (7 - i) * unit + unit / 2;
      g.fillText(String(i + 1), m / 2, y);
      g.save(); g.translate(size - m / 2, y); g.rotate(Math.PI); g.fillText(String(i + 1), 0, 0); g.restore();
    }
    var tex = new T.CanvasTexture(cv);
    tex.encoding = T.sRGBEncoding;
    tex.anisotropy = 4;
    return tex;
  };

  Board3D.prototype.makePiece = function (ch) {
    var T = root.THREE, bh = document.documentElement.getAttribute('data-skin') === 'bauhaus';
    var geo = bh ? buildBauhaus() : buildGeometries();
    var color = E.colorOf(ch), parts = geo[ch.toLowerCase()];
    var g = new T.Group();
    parts.forEach(function (p) {
      var isGeo = !!p.isBufferGeometry;
      var gm = isGeo ? p : p[0];
      var mesh = new T.Mesh(gm, this.mat[color]);
      if (!isGeo) {
        mesh.position.set(p[1] || 0, p[2] || 0, p[3] || 0);
        if (p[4] !== undefined) mesh.scale.set(p[4], p[5], p[6]);
        if (p[7]) mesh.rotation.y = p[7];
        if (p[8]) mesh.rotation.y = color === 'w' ? Math.PI * 0.75 : -Math.PI * 0.25; // at başı çapraz olarak rakibe dönük
        if (p[9]) mesh.rotation.z = p[9];
      }
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      g.add(mesh);
    }, this);
    g.userData.ch = ch;
    return g;
  };

  Board3D.prototype.resize = function () {
    var w = this.root.clientWidth || 300, h = this.root.clientHeight || w;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.dirty = true;
  };

  Board3D.prototype.bindInput = function () {
    var self = this, el = this.renderer.domElement;
    var pointers = {}, start = null, pinch = null;
    el.addEventListener('pointerdown', function (ev) {
      pointers[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
      try { el.setPointerCapture(ev.pointerId); } catch (e) { /* yok */ }
      var ids = Object.keys(pointers);
      if (ids.length === 1) start = { x: ev.clientX, y: ev.clientY, moved: false, theta: self.cam.theta, phi: self.cam.phi };
      else if (ids.length === 2) {
        var a = pointers[ids[0]], b = pointers[ids[1]];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), r: self.cam.r };
        if (start) start.moved = true;
      }
    });
    el.addEventListener('pointermove', function (ev) {
      if (!pointers[ev.pointerId]) return;
      pointers[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
      var ids = Object.keys(pointers);
      if (ids.length === 2 && pinch) {
        var a = pointers[ids[0]], b = pointers[ids[1]];
        var d = Math.hypot(a.x - b.x, a.y - b.y);
        self.cam.r = Math.max(9, Math.min(24, pinch.r * pinch.d / Math.max(d, 1)));
        self.dirty = true;
        return;
      }
      if (!start) return;
      var dx = ev.clientX - start.x, dy = ev.clientY - start.y;
      if (!start.moved && Math.hypot(dx, dy) > 6) start.moved = true;
      if (start.moved) {
        self.cam.theta = start.theta - dx * 0.008;
        self.cam.phi = Math.max(0.25, Math.min(1.3, start.phi - dy * 0.006));
        self.dirty = true;
        self.root.classList.add('rotated');
      }
    });
    function up(ev) {
      if (!pointers[ev.pointerId]) return;
      delete pointers[ev.pointerId];
      if (Object.keys(pointers).length < 2) pinch = null;
      if (start && !start.moved && !Object.keys(pointers).length && ev.type === 'pointerup') {
        var sq = self.pick(ev.clientX, ev.clientY);
        if (sq >= 0) { self.h.onSquare(sq, 'down'); self.h.onSquare(sq, 'up'); }
      }
      if (!Object.keys(pointers).length) start = null;
    }
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', function (ev) {
      ev.preventDefault();
      self.cam.r = Math.max(9, Math.min(24, self.cam.r * (ev.deltaY > 0 ? 1.08 : 0.93)));
      self.dirty = true;
    }, { passive: false });
  };

  Board3D.prototype.pick = function (cx, cy) {
    var rect = this.renderer.domElement.getBoundingClientRect();
    this.ptr.x = ((cx - rect.left) / rect.width) * 2 - 1;
    this.ptr.y = -((cy - rect.top) / rect.height) * 2 + 1;
    this.ray.setFromCamera(this.ptr, this.camera);
    var hits = this.ray.intersectObjects(this.pieceGroup.children, true);
    if (hits.length) {
      var o = hits[0].object;
      while (o && o.parent !== this.pieceGroup) o = o.parent;
      if (o && o.userData.sq !== undefined) return o.userData.sq;
    }
    var th = this.ray.intersectObject(this.top);
    if (th.length) {
      var p = th[0].point;
      var f = Math.floor(p.x + 4), r = Math.floor(4 - p.z);
      if (f >= 0 && f < 8 && r >= 0 && r < 8) return r * 8 + f;
    }
    return -1;
  };

  Board3D.prototype.render = function (st, deco, anim) {
    var T = root.THREE;
    if (deco.orientation && deco.orientation !== this.orientation) {
      this.orientation = deco.orientation;
      this.cam.theta = this.orientation === 'w' ? 0 : Math.PI;
    }
    var self = this;
    var old = this.meshes, next = {};
    var board = st ? st.board : new Array(64).fill(null);
    var animate = anim && !reduceMotion && deco.animate !== false && old[anim.from];
    var moving = [];
    if (animate) {
      moving.push([anim.from, anim.to]);
      if (anim.flags && anim.flags.indexOf('k') >= 0) moving.push([anim.to + 1, anim.to - 1]);
      if (anim.flags && anim.flags.indexOf('q') >= 0) moving.push([anim.to - 2, anim.to + 1]);
      moving.forEach(function (mv) {
        var m = old[mv[0]];
        if (!m || !board[mv[1]]) return;
        if (old[mv[1]] && old[mv[1]] !== m) { self.pieceGroup.remove(old[mv[1]].g); }
        delete old[mv[1]];
        delete old[mv[0]];
        var a = sqPos(mv[0]), b = sqPos(mv[1]);
        var hop = m.ch.toLowerCase() === 'n' ? 0.9 : 0.25;
        self.tweens.push({ g: m.g, a: a, b: b, t0: performance.now(), dur: 260, hop: hop });
        m.g.userData.sq = mv[1];
        if (m.ch !== board[mv[1]]) {
          // terfi: animasyon sonunda yeni taşa dönüştür
          var target = board[mv[1]];
          self.tweens[self.tweens.length - 1].done = function () {
            self.pieceGroup.remove(m.g);
            var ng = self.makePiece(target); var p = sqPos(mv[1]);
            ng.position.set(p.x, 0, p.z); ng.userData.sq = mv[1];
            self.pieceGroup.add(ng);
            if (self.meshes[mv[1]] && self.meshes[mv[1]].g === m.g) self.meshes[mv[1]] = { g: ng, ch: target };
          };
        }
        next[mv[1]] = { g: m.g, ch: m.ch === board[mv[1]] ? m.ch : board[mv[1]] };
      });
    }
    for (var s = 0; s < 64; s++) {
      if (next[s]) continue;
      var ch = board[s];
      var cur = old[s];
      if (ch && cur && cur.ch === ch) { next[s] = cur; delete old[s]; continue; }
      if (ch) {
        var g = this.makePiece(ch), p = sqPos(s);
        g.position.set(p.x, 0, p.z);
        g.userData.sq = s;
        this.pieceGroup.add(g);
        next[s] = { g: g, ch: ch };
      }
    }
    Object.keys(old).forEach(function (k) { if (old[k]) self.pieceGroup.remove(old[k].g); });
    this.meshes = next;
    this.drawDeco(deco);
    this.dirty = true;
  };

  var DECO_COLORS = { sel: 0xd9a52a, last: 0xd8c25a, check: 0xd2452f, mark: 0x3f78b0, good: 0x2f9a5c, bad: 0xcc3d2b, focus: 0xe6b84a };
  Board3D.prototype.drawDeco = function (deco) {
    var T = root.THREE, grp = this.decoGroup;
    while (grp.children.length) {
      var c = grp.children.pop();
      if (c.material && c.material.dispose) c.material.dispose();
    }
    this.stars = [];
    if (!this.planeGeo) {
      this.planeGeo = new T.PlaneGeometry(0.98, 0.98);
      this.dotGeo = new T.CircleGeometry(0.13, 24);
      this.ringGeo = new T.RingGeometry(0.36, 0.46, 32);
      this.frameGeo = new T.RingGeometry(0.42, 0.49, 4, 1, Math.PI / 4);
      this.starGeo = starGeometry();
    }
    var self = this;
    function plane(sq, color, opacity, geo, y) {
      var m = new T.Mesh(geo || self.planeGeo, new T.MeshBasicMaterial({ color: color, transparent: true, opacity: opacity, depthWrite: false }));
      var p = sqPos(sq);
      m.rotation.x = -Math.PI / 2;
      m.position.set(p.x, y || 0.004, p.z);
      m.renderOrder = 2;
      grp.add(m);
      return m;
    }
    (deco.last || []).forEach(function (s) { plane(s, DECO_COLORS.last, 0.38); });
    if (deco.selected >= 0) plane(deco.selected, DECO_COLORS.sel, 0.55);
    if (deco.check >= 0) plane(deco.check, DECO_COLORS.check, 0.6);
    (deco.marks || []).forEach(function (s) { plane(s, DECO_COLORS.mark, 0.5); });
    (deco.good || []).forEach(function (s) { plane(s, DECO_COLORS.good, 0.6, null, 0.006); });
    (deco.bad || []).forEach(function (s) { plane(s, DECO_COLORS.bad, 0.6, null, 0.006); });
    (deco.focus || []).forEach(function (s) { plane(s, DECO_COLORS.focus, 0.9, self.frameGeo, 0.008); });
    var caps = {}; (deco.captures || []).forEach(function (s) { caps[s] = true; });
    (deco.targets || []).forEach(function (s) {
      if (caps[s]) plane(s, 0x1d2a22, 0.45, self.ringGeo, 0.01);
      else plane(s, 0x1d2a22, 0.4, self.dotGeo, 0.01);
    });
    (deco.stars || []).forEach(function (s) {
      var m = new T.Mesh(self.starGeo, new T.MeshStandardMaterial({ color: 0xf2b53a, emissive: 0x7a4b00, emissiveIntensity: 0.5, roughness: 0.3, metalness: 0.4 }));
      var p = sqPos(s);
      var hasPiece = self.meshes[s];
      m.position.set(p.x, hasPiece ? 1.25 : 0.42, p.z);
      m.castShadow = true;
      grp.add(m);
      self.stars.push(m);
    });
    (deco.arrows || []).forEach(function (a) {
      var from = typeof a[0] === 'number' ? a[0] : E.sqIndex(a[0]);
      var to = typeof a[1] === 'number' ? a[1] : E.sqIndex(a[1]);
      var p = sqPos(from), q = sqPos(to);
      var dx = q.x - p.x, dz = q.z - p.z, len = Math.hypot(dx, dz);
      var sh = new T.Shape(), L = len - 0.4, w = 0.09, hw = 0.24, hl = 0.36;
      sh.moveTo(0.2, -w); sh.lineTo(L - hl + 0.2, -w); sh.lineTo(L - hl + 0.2, -hw); sh.lineTo(L + 0.2, 0);
      sh.lineTo(L - hl + 0.2, hw); sh.lineTo(L - hl + 0.2, w); sh.lineTo(0.2, w); sh.lineTo(0.2, -w);
      var mesh = new T.Mesh(new T.ShapeGeometry(sh), new T.MeshBasicMaterial({ color: a[2] === 'alt' ? 0x3f78b0 : 0x2f9a5c, transparent: true, opacity: 0.85, depthWrite: false, side: T.DoubleSide }));
      mesh.rotation.x = -Math.PI / 2;
      var holder = new T.Group();
      holder.add(mesh);
      holder.position.set(p.x, 0.02, p.z);
      holder.rotation.y = Math.atan2(-dz, dx);
      holder.renderOrder = 3;
      grp.add(holder);
    });
    this.dirty = true;
  };

  Board3D.prototype.loop = function (now) {
    if (this.destroyed) return;
    this.raf = requestAnimationFrame(this.loop);
    if (!this.root.isConnected) return;
    var active = this.tweens.length > 0 || this.stars.length > 0;
    if (this.tweens.length) {
      var keep = [];
      this.tweens.forEach(function (tw) {
        var t = Math.min(1, (now - tw.t0) / tw.dur);
        var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        tw.g.position.x = tw.a.x + (tw.b.x - tw.a.x) * e;
        tw.g.position.z = tw.a.z + (tw.b.z - tw.a.z) * e;
        tw.g.position.y = Math.sin(Math.PI * t) * tw.hop;
        if (t < 1) keep.push(tw); else if (tw.done) tw.done();
      });
      this.tweens = keep;
    }
    var self = this;
    this.stars.forEach(function (s, i) {
      s.rotation.y = now / 700 + i;
      s.position.y += Math.sin(now / 400 + i) * 0.0015;
    });
    if (!active && !this.dirty) return;
    this.dirty = false;
    var c = this.cam, th = c.theta;
    this.camera.position.set(c.r * Math.sin(c.phi) * Math.sin(th), c.r * Math.cos(c.phi), c.r * Math.sin(c.phi) * Math.cos(th));
    this.camera.lookAt(0, -0.5, 0.9);
    this.renderer.render(this.scene, this.camera);
    void self;
  };

  Board3D.prototype.destroy = function () {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    if (this.ro) this.ro.disconnect();
    try { this.renderer.dispose(); this.renderer.forceContextLoss(); } catch (e) { /* yok */ }
    if (this.topTex) this.topTex.dispose();
    this.root.remove();
  };

  root.Board3D = Board3D;
})(typeof window !== 'undefined' ? window : globalThis);
