/* YapıCAD — 3B önizleme.
 * Bağımlılıksız katı model görüntüleyici: prizma yüzleri + ressam algoritması
 * (derinliğe göre sıralama) + basit Lambert gölgeleme. WebGL yok, sadece Canvas2D.
 * Bu bir GÖRSELLEŞTİRMEDİR; hesap veya analiz içermez.
 */
(function () {
  'use strict';
  const YC = (window.YC = window.YC || {});
  const G = () => YC.geom;

  const COLORS = {
    column: [95, 140, 205],
    beam: [110, 175, 130],
    wall: [200, 150, 90],
    slab: [150, 165, 190],
  };

  const LIGHT = (() => {
    const v = { x: -0.45, y: -0.35, z: 0.82 };
    const l = Math.hypot(v.x, v.y, v.z);
    return { x: v.x / l, y: v.y / l, z: v.z / l };
  })();

  class View3D {
    constructor(canvas, store) {
      this.canvas = canvas;
      this.store = store;
      this.az = -0.72;      // yatay dönüş (radyan)
      this.el = 0.62;       // yükseklik açısı (radyan, 0=cephe, PI/2=plan)
      this.scale = 0.12;    // piksel / cm
      this.panX = 0; this.panY = 0;
      this.center = { x: 0, y: 0, z: 0 };
      this.mode = 'solid';  // 'solid' | 'wire'
      this.allStories = true;
      this.theme = 'dark';
      this._raf = 0;
      this.drag = null;
      this.bind();
      this.resize();
    }

    bg() { return this.theme === 'dark' ? '#151920' : '#eef0f3'; }
    edge() { return this.theme === 'dark' ? 'rgba(0,0,0,0.45)' : 'rgba(30,40,55,0.35)'; }
    gridColor() { return this.theme === 'dark' ? '#2a313b' : '#d8dce2'; }
    textColor() { return this.theme === 'dark' ? '#9aa6b5' : '#4a5462'; }

    resize() {
      const r = this.canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      this.W = Math.max(1, Math.round(r.width));
      this.H = Math.max(1, Math.round(r.height));
      this.canvas.width = Math.round(this.W * dpr);
      this.canvas.height = Math.round(this.H * dpr);
      this.ctx = this.canvas.getContext('2d');
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.request();
    }

    request() {
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => { this._raf = 0; this.draw(); });
    }

    bind() {
      const c = this.canvas;
      c.addEventListener('pointerdown', (e) => {
        c.setPointerCapture(e.pointerId);
        this.drag = { x: e.clientX, y: e.clientY, pan: e.button === 1 || e.shiftKey };
      });
      c.addEventListener('pointermove', (e) => {
        if (!this.drag) return;
        const dx = e.clientX - this.drag.x, dy = e.clientY - this.drag.y;
        this.drag.x = e.clientX; this.drag.y = e.clientY;
        if (this.drag.pan) { this.panX += dx; this.panY += dy; }
        else {
          this.az -= dx * 0.008;
          this.el = YC.util.clamp(this.el + dy * 0.008, 0.02, Math.PI / 2 - 0.02);
        }
        this.request();
      });
      const end = () => { this.drag = null; };
      c.addEventListener('pointerup', end);
      c.addEventListener('pointercancel', end);
      c.addEventListener('wheel', (e) => {
        e.preventDefault();
        this.scale = YC.util.clamp(this.scale * (e.deltaY < 0 ? 1.12 : 1 / 1.12), 0.004, 3);
        this.request();
      }, { passive: false });
      c.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    // ------------------------------------------------------------- izdüşüm
    project(p) {
      const ca = Math.cos(this.az), sa = Math.sin(this.az);
      const ce = Math.cos(this.el), se = Math.sin(this.el);
      const x = p.x - this.center.x, y = p.y - this.center.y, z = p.z - this.center.z;
      const rx = x * ca - y * sa;
      const ry = x * sa + y * ca;
      return {
        x: this.W / 2 + this.panX + rx * this.scale,
        y: this.H / 2 + this.panY + (ry * se - z * ce) * this.scale,
        d: ry * ce + z * se,
      };
    }

    fit() {
      const p = this.store.project;
      let b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity, maxZ: 0 };
      for (const s of p.stories) {
        b.maxZ = Math.max(b.maxZ, s.elevation + s.height);
        for (const el of s.elements) {
          const eb = G().elementBounds(el);
          if (!eb) continue;
          b.minX = Math.min(b.minX, eb.minX); b.maxX = Math.max(b.maxX, eb.maxX);
          b.minY = Math.min(b.minY, eb.minY); b.maxY = Math.max(b.maxY, eb.maxY);
        }
      }
      if (!isFinite(b.minX)) {
        for (const a of p.axesX) { b.minX = Math.min(b.minX, a.x); b.maxX = Math.max(b.maxX, a.x); }
        for (const a of p.axesY) { b.minY = Math.min(b.minY, a.y); b.maxY = Math.max(b.maxY, a.y); }
      }
      if (!isFinite(b.minX)) { b = { minX: 0, maxX: 1000, minY: 0, maxY: 1000, maxZ: 300 }; }
      this.center = { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2, z: b.maxZ / 2 };
      const span = Math.max(b.maxX - b.minX, b.maxY - b.minY, b.maxZ, 200);
      this.scale = YC.util.clamp(Math.min(this.W, this.H) / (span * 1.9), 0.004, 3);
      this.panX = 0; this.panY = 0;
      this.request();
    }

    // --------------------------------------------------------------- yüzler
    /** Taban çokgeni z0..z1 arasında prizmaya çevir; yüz listesi döndür. */
    prism(base, z0, z1, rgb, key) {
      if (base.length < 3) return [];
      const faces = [];
      const top = base.map((p) => ({ x: p.x, y: p.y, z: z1 }));
      const bot = base.map((p) => ({ x: p.x, y: p.y, z: z0 }));
      faces.push({ pts: top, rgb, key });
      faces.push({ pts: bot.slice().reverse(), rgb, key });
      for (let i = 0; i < base.length; i++) {
        const j = (i + 1) % base.length;
        faces.push({ pts: [bot[i], bot[j], top[j], top[i]], rgb, key });
      }
      return faces;
    }

    circleBase(cx, cy, r, n) {
      const pts = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
      }
      return pts;
    }

    collectFaces() {
      const p = this.store.project;
      const active = this.store.activeStory();
      const faces = [];
      for (const s of p.stories) {
        if (!s.visible) continue;
        if (!this.allStories && s !== active) continue;
        const z0 = s.elevation, z1 = s.elevation + s.height;
        const dim = this.allStories && active && s !== active ? 0.55 : 1;
        for (const el of s.elements) {
          const c = COLORS[el.type] || [140, 140, 140];
          const rgb = dim === 1 ? c : c.map((v) => Math.round(v * dim + 30 * (1 - dim)));
          if (el.type === 'column') {
            const base = el.shape === 'circle'
              ? this.circleBase(el.x, el.y, el.b / 2, 16)
              : G().rectCorners(el.x, el.y, el.b, el.h, el.rot);
            faces.push(...this.prism(base, z0, z1, rgb, el.id));
          } else if (el.type === 'beam') {
            const base = G().bandCorners(el.x1, el.y1, el.x2, el.y2, el.b);
            faces.push(...this.prism(base, z1 - el.h, z1, rgb, el.id));
          } else if (el.type === 'wall') {
            const base = G().bandCorners(el.x1, el.y1, el.x2, el.y2, el.t);
            faces.push(...this.prism(base, z0, z1, rgb, el.id));
          } else if (el.type === 'slab' && el.pts.length >= 3) {
            faces.push(...this.prism(el.pts, z1 - el.t, z1, rgb, el.id));
          }
        }
      }
      return faces;
    }

    faceNormal(pts) {
      const a = pts[0], b = pts[1], c = pts[2];
      const u = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
      const v = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
      const n = { x: u.y * v.z - u.z * v.y, y: u.z * v.x - u.x * v.z, z: u.x * v.y - u.y * v.x };
      const l = Math.hypot(n.x, n.y, n.z) || 1;
      return { x: n.x / l, y: n.y / l, z: n.z / l };
    }

    // ---------------------------------------------------------------- çizim
    draw() {
      const ctx = this.ctx;
      if (!ctx || !this.store.project) return;
      ctx.fillStyle = this.bg();
      ctx.fillRect(0, 0, this.W, this.H);

      this.drawGround();

      const sel = new Set(this.store.selection);
      const faces = this.collectFaces();
      for (const f of faces) {
        let d = 0;
        for (const q of f.pts) d += this.project(q).d;
        f.depth = d / f.pts.length;
      }
      faces.sort((a, b) => a.depth - b.depth);

      const wire = this.mode === 'wire';
      ctx.lineJoin = 'round';
      for (const f of faces) {
        const sp = f.pts.map((q) => this.project(q));
        ctx.beginPath();
        sp.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
        ctx.closePath();
        if (!wire) {
          const n = this.faceNormal(f.pts);
          const lam = Math.abs(n.x * LIGHT.x + n.y * LIGHT.y + n.z * LIGHT.z);
          const k = 0.42 + 0.58 * lam;
          const c = f.rgb;
          ctx.fillStyle = `rgb(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)})`;
          ctx.fill();
        }
        if (sel.has(f.key)) { ctx.strokeStyle = '#ffcc44'; ctx.lineWidth = 2; }
        else { ctx.strokeStyle = wire ? 'rgba(140,160,190,0.85)' : this.edge(); ctx.lineWidth = wire ? 1 : 0.7; }
        ctx.stroke();
      }

      this.drawHud();
    }

    drawGround() {
      const ctx = this.ctx, p = this.store.project;
      const xs = p.axesX.map((a) => a.x), ys = p.axesY.map((a) => a.y);
      if (!xs.length || !ys.length) return;
      const pad = 200;
      const x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad;
      const y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad;
      ctx.save();
      ctx.strokeStyle = this.gridColor(); ctx.lineWidth = 1;
      const line = (a, b) => {
        const pa = this.project(a), pb = this.project(b);
        ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
      };
      for (const a of p.axesX) line({ x: a.x, y: y0, z: 0 }, { x: a.x, y: y1, z: 0 });
      for (const a of p.axesY) line({ x: x0, y: a.y, z: 0 }, { x: x1, y: a.y, z: 0 });

      ctx.fillStyle = this.textColor();
      ctx.font = '11px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const a of p.axesX) {
        const s = this.project({ x: a.x, y: y0 - 60, z: 0 });
        ctx.fillText(a.name, s.x, s.y);
      }
      for (const a of p.axesY) {
        const s = this.project({ x: x0 - 60, y: a.y, z: 0 });
        ctx.fillText(a.name, s.x, s.y);
      }
      ctx.restore();
    }

    drawHud() {
      const ctx = this.ctx, p = this.store.project;
      const n = p.stories.reduce((a, s) => a + s.elements.length, 0);
      const H = p.stories.reduce((a, s) => Math.max(a, s.elevation + s.height), 0);
      ctx.save();
      ctx.fillStyle = this.textColor();
      ctx.font = '11px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(`${p.stories.length} kat · ${n} eleman · toplam yükseklik ${YC.util.fmtM(H)} m`, 10, 8);
      ctx.fillText(`açı ${((-this.az * 180) / Math.PI).toFixed(0)}° / ${((this.el * 180) / Math.PI).toFixed(0)}°`, 10, 24);
      ctx.restore();
    }

    setView(name) {
      const D = Math.PI / 180;
      const V = {
        iso: [-45 * D, 35 * D], top: [0, 89 * D], front: [0, 3 * D],
        left: [-90 * D, 3 * D], right: [90 * D, 3 * D], back: [180 * D, 3 * D],
      };
      const v = V[name] || V.iso;
      this.az = v[0]; this.el = v[1];
      this.request();
    }
  }

  YC.View3D = View3D;
})();
