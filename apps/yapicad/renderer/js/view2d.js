/* YapıCAD — 2B plan görünümü (kalıp planı çizimi).
 * Dünya birimi cm, y ekseni YUKARI pozitif. Ekranda y ters çevrilir.
 */
(function () {
  'use strict';
  const YC = (window.YC = window.YC || {});
  const G = () => YC.geom;

  const THEMES = {
    dark: {
      bg: '#1b1f26', gridMinor: '#252b34', gridMajor: '#2f3742',
      axis: '#6f7b8c', axisText: '#c8d2df', axisBubble: '#0f1318',
      dim: '#8b95a5', dimText: '#aab4c2',
      column: '#3f6fb5', columnLine: '#9dc2ff',
      beam: '#4b6d52', beamLine: '#8fd3a3',
      wall: '#7a5230', wallLine: '#e0a86a',
      slab: 'rgba(90,110,145,0.16)', slabLine: '#6c86ad',
      name: '#d5dde8', ghost: '#e0b341', sel: '#ffcc44', grip: '#ffcc44',
      cross: '#4a5462', snapMark: '#28d17c', rubber: '#7aa2ff',
    },
    light: {
      bg: '#f4f5f7', gridMinor: '#e6e8ec', gridMajor: '#d5d9e0',
      axis: '#8a93a3', axisText: '#33404f', axisBubble: '#ffffff',
      dim: '#66707f', dimText: '#3a4451',
      column: '#b9cdec', columnLine: '#2d5aa0',
      beam: '#c9e4d1', beamLine: '#2f6b45',
      wall: '#f0d7b6', wallLine: '#8a5a24',
      slab: 'rgba(80,110,160,0.10)', slabLine: '#8ea3c2',
      name: '#2b3440', ghost: '#b8860b', sel: '#e08b00', grip: '#e08b00',
      cross: '#c3c8d1', snapMark: '#0a8f52', rubber: '#3b6fd4',
    },
  };

  // ------------------------------------------------------------- görüş alanı
  class Viewport {
    constructor() { this.scale = 0.25; this.ox = 80; this.oy = 400; }
    toScreen(p) { return { x: this.ox + p.x * this.scale, y: this.oy - p.y * this.scale }; }
    sx(x) { return this.ox + x * this.scale; }
    sy(y) { return this.oy - y * this.scale; }
    toWorld(p) { return { x: (p.x - this.ox) / this.scale, y: (this.oy - p.y) / this.scale }; }
    zoomAt(sp, factor) {
      const w = this.toWorld(sp);
      this.scale = YC.util.clamp(this.scale * factor, 0.004, 12);
      this.ox = sp.x - w.x * this.scale;
      this.oy = sp.y + w.y * this.scale;
    }
    pan(dx, dy) { this.ox += dx; this.oy += dy; }
    fit(b, W, H, margin) {
      margin = margin == null ? 90 : margin;
      if (!b || !isFinite(b.minX)) { this.scale = 0.25; this.ox = 120; this.oy = H - 120; return; }
      const w = Math.max(b.maxX - b.minX, 100), h = Math.max(b.maxY - b.minY, 100);
      this.scale = YC.util.clamp(Math.min((W - margin * 2) / w, (H - margin * 2) / h), 0.004, 12);
      const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
      this.ox = W / 2 - cx * this.scale;
      this.oy = H / 2 + cy * this.scale;
    }
  }

  // ---------------------------------------------------------------- çizici
  class View2D {
    constructor(canvas, store) {
      this.canvas = canvas;
      this.store = store;
      this.vp = new Viewport();
      this.theme = 'dark';
      this.cursor = null;      // {x,y} dünya — imleç
      this.snapHit = null;     // yakalama sonucu
      this.preview = null;     // {kind, ...} çizim önizlemesi
      this.rubber = null;      // {x1,y1,x2,y2} seçim kutusu (ekran)
      this.ghostStoryVisible = true;
      this._raf = 0;
      this.resize();
    }

    palette() { return THEMES[this.theme]; }

    resize() {
      const c = this.canvas, r = c.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      this.W = Math.max(1, Math.round(r.width));
      this.H = Math.max(1, Math.round(r.height));
      c.width = Math.round(this.W * dpr);
      c.height = Math.round(this.H * dpr);
      this.ctx = c.getContext('2d');
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.request();
    }

    request() {
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => { this._raf = 0; this.draw(); });
    }

    projectBounds() {
      const p = this.store.project;
      let b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
      const acc = (x, y) => {
        if (x < b.minX) b.minX = x; if (y < b.minY) b.minY = y;
        if (x > b.maxX) b.maxX = x; if (y > b.maxY) b.maxY = y;
      };
      p.axesX.forEach((a) => acc(a.x, 0));
      p.axesY.forEach((a) => acc(0, a.y));
      for (const s of p.stories) {
        for (const el of s.elements) {
          const eb = G().elementBounds(el);
          if (eb) { acc(eb.minX, eb.minY); acc(eb.maxX, eb.maxY); }
        }
      }
      return isFinite(b.minX) ? b : null;
    }

    zoomExtents() {
      // Aks balonları ve ölçü zincirleri model sınırının dışına çizildiği için
      // sığdırma, çıplak model kutusuna değil, süslemeleri de kapsayan
      // axisSpan()'a göre yapılır; yoksa sol ölçü zinciri ekrandan taşar.
      this.vp.fit(this.axisSpan(), this.W, this.H, 78);
      this.request();
    }

    // ------------------------------------------------------------ ana çizim
    draw() {
      const ctx = this.ctx, C = this.palette(), p = this.store.project;
      if (!ctx || !p) return;
      ctx.save();
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, this.W, this.H);

      if (p.settings.showGrid) this.drawGrid();
      if (p.settings.showAxes) this.drawAxes();

      // alt kat hayaleti (referans)
      const story = this.store.activeStory();
      if (this.ghostStoryVisible && story) {
        const idx = p.stories.indexOf(story);
        if (idx > 0) this.drawStory(p.stories[idx - 1], true);
      }
      if (story) this.drawStory(story, false);

      if (p.settings.showDims) this.drawDimensions();

      this.drawSelection();
      this.drawPreview();
      this.drawRubber();
      this.drawCrosshair();
      this.drawSnapMarker();
      this.drawOriginBadge();
      ctx.restore();
    }

    // ------------------------------------------------------------------ ızgara
    drawGrid() {
      const ctx = this.ctx, C = this.palette(), st = this.store.project.settings;
      const vp = this.vp;
      const w0 = vp.toWorld({ x: 0, y: this.H }), w1 = vp.toWorld({ x: this.W, y: 0 });

      const drawSet = (step, color, width) => {
        if (step * vp.scale < 7) return;
        ctx.beginPath();
        ctx.strokeStyle = color; ctx.lineWidth = width;
        const x0 = Math.floor(w0.x / step) * step, x1 = Math.ceil(w1.x / step) * step;
        for (let x = x0; x <= x1; x += step) {
          const sx = Math.round(vp.sx(x)) + 0.5;
          ctx.moveTo(sx, 0); ctx.lineTo(sx, this.H);
        }
        const y0 = Math.floor(w0.y / step) * step, y1 = Math.ceil(w1.y / step) * step;
        for (let y = y0; y <= y1; y += step) {
          const sy = Math.round(vp.sy(y)) + 0.5;
          ctx.moveTo(0, sy); ctx.lineTo(this.W, sy);
        }
        ctx.stroke();
      };
      drawSet(st.gridMinor || 50, C.gridMinor, 1);
      drawSet(st.gridMajor || 500, C.gridMajor, 1);
    }

    axisSpan() {
      const p = this.store.project;
      const xs = p.axesX.map((a) => a.x), ys = p.axesY.map((a) => a.y);
      const b = this.projectBounds() || { minX: 0, maxX: 1000, minY: 0, maxY: 1000 };
      const minX = Math.min(b.minX, ...(xs.length ? xs : [0]));
      const maxX = Math.max(b.maxX, ...(xs.length ? xs : [0]));
      const minY = Math.min(b.minY, ...(ys.length ? ys : [0]));
      const maxY = Math.max(b.maxY, ...(ys.length ? ys : [0]));
      const padX = Math.max((maxX - minX) * 0.12, 150);
      const padY = Math.max((maxY - minY) * 0.12, 150);
      return { minX: minX - padX, maxX: maxX + padX, minY: minY - padY, maxY: maxY + padY };
    }

    drawAxes() {
      const ctx = this.ctx, C = this.palette(), p = this.store.project, vp = this.vp;
      const s = this.axisSpan();
      ctx.save();
      ctx.strokeStyle = C.axis; ctx.lineWidth = 1;
      ctx.setLineDash([14, 5, 3, 5]);

      for (const a of p.axesX) {
        ctx.beginPath();
        ctx.moveTo(vp.sx(a.x), vp.sy(s.minY)); ctx.lineTo(vp.sx(a.x), vp.sy(s.maxY));
        ctx.stroke();
      }
      for (const a of p.axesY) {
        ctx.beginPath();
        ctx.moveTo(vp.sx(s.minX), vp.sy(a.y)); ctx.lineTo(vp.sx(s.maxX), vp.sy(a.y));
        ctx.stroke();
      }
      ctx.setLineDash([]);

      const R = 13;
      const bubble = (cx, cy, text) => {
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.fillStyle = C.axisBubble; ctx.fill();
        ctx.strokeStyle = C.axis; ctx.lineWidth = 1.4; ctx.stroke();
        ctx.fillStyle = C.axisText;
        ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(text, cx, cy + 0.5);
      };
      for (const a of p.axesX) {
        bubble(vp.sx(a.x), vp.sy(s.maxY) - R - 2, a.name);
        bubble(vp.sx(a.x), vp.sy(s.minY) + R + 2, a.name);
      }
      for (const a of p.axesY) {
        bubble(vp.sx(s.minX) - R - 2, vp.sy(a.y), a.name);
        bubble(vp.sx(s.maxX) + R + 2, vp.sy(a.y), a.name);
      }
      ctx.restore();
    }

    // ------------------------------------------------------------- ölçü zinciri
    drawDimensions() {
      const ctx = this.ctx, C = this.palette(), p = this.store.project, vp = this.vp;
      const s = this.axisSpan();
      const xs = p.axesX.slice().sort((a, b) => a.x - b.x);
      const ys = p.axesY.slice().sort((a, b) => a.y - b.y);
      ctx.save();
      ctx.strokeStyle = C.dim; ctx.fillStyle = C.dimText; ctx.lineWidth = 1;
      ctx.font = '11px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';

      const tick = (x, y, dx, dy) => {
        ctx.beginPath(); ctx.moveTo(x - dx, y - dy); ctx.lineTo(x + dx, y + dy); ctx.stroke();
      };

      // üst yatay zincir
      const yLine = vp.sy(s.maxY) - 42;
      for (let i = 0; i < xs.length - 1; i++) {
        const a = vp.sx(xs[i].x), b = vp.sx(xs[i + 1].x);
        if (b - a < 26) continue;
        ctx.beginPath(); ctx.moveTo(a, yLine); ctx.lineTo(b, yLine); ctx.stroke();
        tick(a, yLine, 4, 4); tick(b, yLine, 4, 4);
        ctx.fillText(YC.util.fmtM(xs[i + 1].x - xs[i].x) + ' m', (a + b) / 2, yLine - 4);
      }
      // sol düşey zincir — aks balonlarının DIŞINDA kalmalı (üst zincirle simetrik)
      const xLine = vp.sx(s.minX) - 42;
      for (let i = 0; i < ys.length - 1; i++) {
        const a = vp.sy(ys[i].y), b = vp.sy(ys[i + 1].y);
        if (a - b < 26) continue;
        ctx.beginPath(); ctx.moveTo(xLine, a); ctx.lineTo(xLine, b); ctx.stroke();
        tick(xLine, a, 4, 4); tick(xLine, b, 4, 4);
        ctx.save();
        ctx.translate(xLine - 5, (a + b) / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(YC.util.fmtM(ys[i + 1].y - ys[i].y) + ' m', 0, 0);
        ctx.restore();
      }
      ctx.restore();
    }

    // ------------------------------------------------------------- kat çizimi
    drawStory(story, ghost) {
      const ctx = this.ctx;
      ctx.save();
      if (ghost) ctx.globalAlpha = 0.22;
      const order = ['slab', 'wall', 'beam', 'column'];
      for (const t of order) {
        for (const el of story.elements) if (el.type === t) this.drawElement(el, ghost);
      }
      if (!ghost && this.store.project.settings.showNames) {
        for (const el of story.elements) this.drawName(el);
      }
      ctx.restore();
    }

    drawElement(el, ghost) {
      const C = this.palette();
      if (el.type === 'column') this.drawColumn(el, C, ghost);
      else if (el.type === 'beam') this.drawBeam(el, C, ghost);
      else if (el.type === 'wall') this.drawWall(el, C, ghost);
      else if (el.type === 'slab') this.drawSlab(el, C, ghost);
    }

    polyPath(pts) {
      const ctx = this.ctx, vp = this.vp;
      ctx.beginPath();
      pts.forEach((p, i) => {
        const s = vp.toScreen(p);
        i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y);
      });
      ctx.closePath();
    }

    drawColumn(el, C) {
      const ctx = this.ctx, vp = this.vp;
      ctx.lineWidth = 1.6; ctx.strokeStyle = C.columnLine; ctx.fillStyle = C.column;
      if (el.shape === 'circle') {
        const c = vp.toScreen({ x: el.x, y: el.y });
        ctx.beginPath(); ctx.arc(c.x, c.y, Math.max(2, (el.b / 2) * vp.scale), 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      } else {
        this.polyPath(G().rectCorners(el.x, el.y, el.b, el.h, el.rot));
        ctx.fill(); ctx.stroke();
      }
    }

    drawBeam(el, C) {
      const ctx = this.ctx, vp = this.vp;
      this.polyPath(G().bandCorners(el.x1, el.y1, el.x2, el.y2, el.b));
      ctx.fillStyle = C.beam; ctx.fill();
      ctx.strokeStyle = C.beamLine; ctx.lineWidth = 1.4; ctx.stroke();
      // eksen çizgisi
      const a = vp.toScreen({ x: el.x1, y: el.y1 }), b = vp.toScreen({ x: el.x2, y: el.y2 });
      ctx.save(); ctx.setLineDash([6, 4]); ctx.globalAlpha = 0.65;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.restore();
    }

    drawWall(el, C) {
      const ctx = this.ctx;
      this.polyPath(G().bandCorners(el.x1, el.y1, el.x2, el.y2, el.t));
      ctx.fillStyle = C.wall; ctx.fill();
      ctx.strokeStyle = C.wallLine; ctx.lineWidth = 1.8; ctx.stroke();
    }

    drawSlab(el, C) {
      const ctx = this.ctx;
      if (el.pts.length < 3) return;
      this.polyPath(el.pts);
      ctx.fillStyle = C.slab; ctx.fill();
      ctx.save();
      ctx.setLineDash([9, 6]); ctx.strokeStyle = C.slabLine; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.restore();
    }

    /** Zemine karışmasın diye yazının arkasına ince bir hâle çizilir. */
    haloText(txt, x, y) {
      const ctx = this.ctx, C = this.palette();
      ctx.lineWidth = 3; ctx.lineJoin = 'round';
      ctx.strokeStyle = C.bg;
      ctx.strokeText(txt, x, y);
      ctx.fillStyle = C.name;
      ctx.fillText(txt, x, y);
    }

    /**
     * Eleman etiketleri. Kolon adı kesitin sağ-üst köşesine, kiriş/perde adı
     * eksen boyunca döndürülüp yana kaydırılarak yazılır — böylece kolon ve
     * kiriş yazıları birbirinin üstüne binmez.
     */
    drawName(el) {
      const ctx = this.ctx, vp = this.vp;
      if (vp.scale < 0.05) return;
      ctx.save();
      ctx.font = '11px "Segoe UI", system-ui, sans-serif';

      if (el.type === 'column') {
        const w = (el.shape === 'circle' ? el.b : el.b) * vp.scale;
        const h = (el.shape === 'circle' ? el.b : el.h) * vp.scale;
        if (Math.min(w, h) < 5) { ctx.restore(); return; }
        const s = vp.toScreen({ x: el.x, y: el.y });
        ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
        const x = s.x + w / 2 + 4, y = s.y - h / 2 - 1;
        this.haloText(el.name, x, y);
        if (Math.min(w, h) >= 11) {
          this.haloText(el.shape === 'circle' ? 'Ø' + el.b : `${el.b}/${el.h}`, x, y + 11);
        }
      } else if (el.type === 'beam' || el.type === 'wall') {
        const a = vp.toScreen({ x: el.x1, y: el.y1 }), b = vp.toScreen({ x: el.x2, y: el.y2 });
        const dx = b.x - a.x, dy = b.y - a.y;
        const L = Math.hypot(dx, dy);
        if (L < 44) { ctx.restore(); return; }
        let ang = Math.atan2(dy, dx);
        if (ang > Math.PI / 2 || ang < -Math.PI / 2) ang += Math.PI;  // yazı baş aşağı durmasın
        const w = (el.type === 'beam' ? el.b : el.t) * vp.scale;
        ctx.translate((a.x + b.x) / 2, (a.y + b.y) / 2);
        ctx.rotate(ang);
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        const label = el.type === 'beam' ? `${el.name} ${el.b}/${el.h}` : `${el.name} t=${el.t}`;
        this.haloText(label, 0, -w / 2 - 3);
      } else if (el.type === 'slab') {
        if (el.pts.length < 3) { ctx.restore(); return; }
        const s = vp.toScreen(G().polygonCentroid(el.pts));
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        this.haloText(el.name, s.x, s.y - 6);
        this.haloText(`h=${el.t}`, s.x, s.y + 6);
      }
      ctx.restore();
    }

    // ------------------------------------------------------------------ seçim
    drawSelection() {
      const ctx = this.ctx, C = this.palette(), vp = this.vp;
      const sel = this.store.selectedElements();
      if (!sel.length) return;
      ctx.save();
      ctx.strokeStyle = C.sel; ctx.lineWidth = 2.2;
      for (const el of sel) {
        if (el.type === 'column') {
          if (el.shape === 'circle') {
            const c = vp.toScreen({ x: el.x, y: el.y });
            ctx.beginPath(); ctx.arc(c.x, c.y, Math.max(3, (el.b / 2) * vp.scale + 2), 0, Math.PI * 2); ctx.stroke();
          } else { this.polyPath(G().rectCorners(el.x, el.y, el.b, el.h, el.rot)); ctx.stroke(); }
        } else if (el.type === 'beam') { this.polyPath(G().bandCorners(el.x1, el.y1, el.x2, el.y2, el.b)); ctx.stroke(); }
        else if (el.type === 'wall') { this.polyPath(G().bandCorners(el.x1, el.y1, el.x2, el.y2, el.t)); ctx.stroke(); }
        else if (el.type === 'slab' && el.pts.length > 2) { this.polyPath(el.pts); ctx.stroke(); }

        ctx.fillStyle = C.grip;
        for (const g of G().elementGrips(el)) {
          const s = vp.toScreen(g);
          ctx.fillRect(s.x - 3.5, s.y - 3.5, 7, 7);
        }
      }
      ctx.restore();
    }

    // ------------------------------------------------------------- önizleme
    drawPreview() {
      const pv = this.preview;
      if (!pv) return;
      const ctx = this.ctx, C = this.palette(), vp = this.vp;
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.strokeStyle = C.ghost; ctx.fillStyle = 'rgba(224,179,65,0.20)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([5, 4]);

      if (pv.kind === 'column') {
        if (pv.shape === 'circle') {
          const c = vp.toScreen(pv);
          ctx.beginPath(); ctx.arc(c.x, c.y, Math.max(2, (pv.b / 2) * vp.scale), 0, Math.PI * 2);
          ctx.fill(); ctx.stroke();
        } else { this.polyPath(G().rectCorners(pv.x, pv.y, pv.b, pv.h, pv.rot || 0)); ctx.fill(); ctx.stroke(); }
      } else if (pv.kind === 'band') {
        this.polyPath(G().bandCorners(pv.x1, pv.y1, pv.x2, pv.y2, pv.w));
        ctx.fill(); ctx.stroke();
        const a = vp.toScreen({ x: pv.x1, y: pv.y1 }), b = vp.toScreen({ x: pv.x2, y: pv.y2 });
        const L = G().dist({ x: pv.x1, y: pv.y1 }, { x: pv.x2, y: pv.y2 });
        ctx.setLineDash([]);
        ctx.fillStyle = C.dimText;
        ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText(YC.util.fmtM(L) + ' m', (a.x + b.x) / 2, (a.y + b.y) / 2 - 8);
      } else if (pv.kind === 'poly') {
        if (pv.pts.length) {
          const all = pv.cursor ? pv.pts.concat([pv.cursor]) : pv.pts;
          ctx.beginPath();
          all.forEach((p, i) => { const s = vp.toScreen(p); i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y); });
          if (all.length > 2) { ctx.closePath(); ctx.fill(); }
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = C.ghost;
          for (const p of pv.pts) { const s = vp.toScreen(p); ctx.fillRect(s.x - 3, s.y - 3, 6, 6); }
        }
      } else if (pv.kind === 'axisX' || pv.kind === 'axisY') {
        const s = this.axisSpan();
        ctx.beginPath();
        if (pv.kind === 'axisX') { ctx.moveTo(vp.sx(pv.v), vp.sy(s.minY)); ctx.lineTo(vp.sx(pv.v), vp.sy(s.maxY)); }
        else { ctx.moveTo(vp.sx(s.minX), vp.sy(pv.v)); ctx.lineTo(vp.sx(s.maxX), vp.sy(pv.v)); }
        ctx.stroke();
      } else if (pv.kind === 'measure') {
        const a = vp.toScreen({ x: pv.x1, y: pv.y1 }), b = vp.toScreen({ x: pv.x2, y: pv.y2 });
        ctx.setLineDash([]); ctx.strokeStyle = C.snapMark; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        const L = G().dist({ x: pv.x1, y: pv.y1 }, { x: pv.x2, y: pv.y2 });
        const dx = pv.x2 - pv.x1, dy = pv.y2 - pv.y1;
        const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
        ctx.fillStyle = C.snapMark;
        ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
        ctx.fillText(`${YC.util.fmtM(L)} m  ∠${ang.toFixed(1)}°`, b.x + 10, b.y - 8);
      }
      ctx.restore();
    }

    drawRubber() {
      if (!this.rubber) return;
      const ctx = this.ctx, C = this.palette(), r = this.rubber;
      const x = Math.min(r.x1, r.x2), y = Math.min(r.y1, r.y2);
      const w = Math.abs(r.x2 - r.x1), h = Math.abs(r.y2 - r.y1);
      ctx.save();
      ctx.strokeStyle = C.rubber; ctx.setLineDash([5, 4]); ctx.lineWidth = 1;
      ctx.fillStyle = 'rgba(122,162,255,0.10)';
      ctx.fillRect(x, y, w, h); ctx.strokeRect(x + 0.5, y + 0.5, w, h);
      ctx.restore();
    }

    drawCrosshair() {
      if (!this.cursor || this.store.tool === 'select') return;
      const ctx = this.ctx, C = this.palette();
      const s = this.vp.toScreen(this.cursor);
      ctx.save();
      ctx.strokeStyle = C.cross; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, Math.round(s.y) + 0.5); ctx.lineTo(this.W, Math.round(s.y) + 0.5);
      ctx.moveTo(Math.round(s.x) + 0.5, 0); ctx.lineTo(Math.round(s.x) + 0.5, this.H);
      ctx.stroke();
      ctx.restore();
    }

    drawSnapMarker() {
      const h = this.snapHit;
      if (!h) return;
      const ctx = this.ctx, C = this.palette();
      const s = this.vp.toScreen(h);
      ctx.save();
      ctx.strokeStyle = C.snapMark; ctx.lineWidth = 2;
      const r = 6;
      if (h.type === 'axis') {
        ctx.beginPath();
        ctx.moveTo(s.x - r, s.y - r); ctx.lineTo(s.x + r, s.y + r);
        ctx.moveTo(s.x + r, s.y - r); ctx.lineTo(s.x - r, s.y + r);
        ctx.stroke();
      } else if (h.type === 'mid') {
        ctx.beginPath();
        ctx.moveTo(s.x, s.y - r); ctx.lineTo(s.x + r, s.y + r); ctx.lineTo(s.x - r, s.y + r);
        ctx.closePath(); ctx.stroke();
      } else if (h.type === 'perp') {
        ctx.beginPath();
        ctx.moveTo(s.x - r, s.y - r); ctx.lineTo(s.x - r, s.y + r); ctx.lineTo(s.x + r, s.y + r);
        ctx.stroke();
      } else if (h.type === 'grid') {
        ctx.beginPath(); ctx.arc(s.x, s.y, 3.5, 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.strokeRect(s.x - r, s.y - r, r * 2, r * 2);
      }
      if (h.label) {
        ctx.fillStyle = C.snapMark;
        ctx.font = '11px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(h.label, s.x + 11, s.y + 9);
      }
      ctx.restore();
    }

    drawOriginBadge() {
      const ctx = this.ctx, C = this.palette(), vp = this.vp;
      const o = vp.toScreen({ x: 0, y: 0 });
      if (o.x < -50 || o.x > this.W + 50 || o.y < -50 || o.y > this.H + 50) return;
      ctx.save();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = '#e05555';
      ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(o.x + 26, o.y); ctx.stroke();
      ctx.strokeStyle = '#55c46a';
      ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(o.x, o.y - 26); ctx.stroke();
      ctx.fillStyle = C.dimText;
      ctx.font = '10px "Segoe UI", system-ui, sans-serif';
      ctx.fillText('X', o.x + 29, o.y + 4);
      ctx.fillText('Y', o.x - 3, o.y - 30);
      ctx.restore();
    }
  }

  YC.Viewport = Viewport;
  YC.View2D = View2D;
  YC.THEMES = THEMES;
})();
