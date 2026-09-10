/* YapıCAD — 2B çizim etkileşimi ve komut motoru.
 * Fare/klavye olaylarını araç durum makinesine bağlar.
 */
(function () {
  'use strict';
  const YC = (window.YC = window.YC || {});
  const G = () => YC.geom;
  const U = () => YC.util;

  const TOOL_HINTS = {
    select: 'Seçim: elemana tıkla · Shift ile ekle · boşluğa sürükle = pencere seçimi · sürükle = taşı',
    column: 'Kolon: yerleştirmek için tıkla · Esc = bitir',
    beam: 'Kiriş: başlangıç noktasına tıkla, sonra bitişe · Esc = bitir',
    wall: 'Perde: başlangıç noktasına tıkla, sonra bitişe · Esc = bitir',
    slab: 'Döşeme: köşeleri tıkla · Enter/sağ tık = kapat · Esc = iptal',
    axisX: 'Düşey aks: yerini tıkla · Esc = bitir',
    axisY: 'Yatay aks: yerini tıkla · Esc = bitir',
    measure: 'Ölçüm: iki nokta tıkla · Esc = bitir',
    move: 'Taşı: referans noktası, sonra hedef · Esc = iptal',
    copy: 'Kopyala: referans noktası, sonra hedef · Esc = iptal',
  };
  YC.TOOL_HINTS = TOOL_HINTS;

  class Tools2D {
    constructor(view, store) {
      this.v = view;
      this.s = store;
      this.pending = [];       // çok noktalı araçlar için toplanan noktalar
      this.base = null;        // orto kısıtı referansı
      this.lastPoint = null;   // en son kullanılan nokta — "@dx,dy" göreli girişin dayanağı
      this.drag = null;        // {mode:'pan'|'move'|'grip'|'rubber', ...}
      this.spaceDown = false;
      this.lastWorld = { x: 0, y: 0 };
      this.bind();
    }

    // ------------------------------------------------------------ yardımcı
    worldTol() { return (this.s.project.settings.snapPx || 14) / this.v.vp.scale; }

    /** Ekran noktası -> yakalanmış dünya noktası. */
    resolve(sp) {
      const raw = this.v.vp.toWorld(sp);
      this.lastWorld = raw;
      const hit = G().snap(raw, {
        project: this.s.project,
        story: this.s.activeStory(),
        snaps: this.s.snaps,
        worldTol: this.worldTol(),
      });
      let p = hit ? { x: hit.x, y: hit.y } : raw;
      this.v.snapHit = hit;

      if (this.s.snaps.ortho && this.base) {
        const o = G().applyOrtho(p, this.base);
        if (G().dist(o, p) > 1e-6) this.v.snapHit = null;
        p = o;
      }
      return p;
    }

    evPos(e) {
      const r = this.v.canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    // ------------------------------------------------------------ bağlama
    bind() {
      const c = this.v.canvas;
      c.addEventListener('pointerdown', (e) => this.onDown(e));
      c.addEventListener('pointermove', (e) => this.onMove(e));
      window.addEventListener('pointerup', (e) => this.onUp(e));
      c.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
      c.addEventListener('contextmenu', (e) => { e.preventDefault(); this.onRightClick(); });
      c.addEventListener('dblclick', () => this.finishPending());
      c.addEventListener('pointerleave', () => { this.v.cursor = null; this.v.snapHit = null; this.v.request(); });
    }

    // -------------------------------------------------------------- olaylar
    onWheel(e) {
      e.preventDefault();
      const f = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      this.v.vp.zoomAt(this.evPos(e), f);
      this.s.emit('viewport');
      this.v.request();
    }

    onDown(e) {
      this.v.canvas.focus();
      const sp = this.evPos(e);

      // orta tuş veya boşluk = kaydırma
      if (e.button === 1 || (e.button === 0 && this.spaceDown)) {
        this.drag = { mode: 'pan', sx: sp.x, sy: sp.y };
        this.v.canvas.setPointerCapture(e.pointerId);
        return;
      }
      if (e.button !== 0) return;

      const p = this.resolve(sp);
      const tool = this.s.tool;

      if (tool === 'select') return this.selectDown(e, sp, p);
      this.lastPoint = p;

      // çizim araçları
      if (tool === 'column') {
        const o = this.s.toolOpts;
        this.commitColumn(p, o);
      } else if (tool === 'beam' || tool === 'wall') {
        if (!this.pending.length) { this.pending = [p]; this.base = p; }
        else {
          const a = this.pending[0];
          if (G().dist(a, p) > 1) {
            tool === 'beam' ? this.commitBeam(a, p) : this.commitWall(a, p);
            this.pending = [p]; this.base = p;   // zincir devam
          }
        }
      } else if (tool === 'slab') {
        this.pending.push(p); this.base = p;
      } else if (tool === 'axisX') {
        this.commitAxis('x', p.x);
      } else if (tool === 'axisY') {
        this.commitAxis('y', p.y);
      } else if (tool === 'measure') {
        if (!this.pending.length) { this.pending = [p]; this.base = p; }
        else {
          const L = G().dist(this.pending[0], p);
          this.s.status(`Ölçüm: ${U().fmtM(L)} m (${L.toFixed(1)} cm)`, 'ok');
          this.pending = []; this.base = null; this.v.preview = null;
        }
      } else if (tool === 'move' || tool === 'copy') {
        if (!this.s.selection.length) { this.s.status('Önce eleman seçin.', 'warn'); this.s.setTool('select'); return; }
        if (!this.pending.length) { this.pending = [p]; this.base = p; }
        else {
          const d = { x: p.x - this.pending[0].x, y: p.y - this.pending[0].y };
          tool === 'move' ? this.doMove(d) : this.doCopy(d);
          this.pending = []; this.base = null; this.v.preview = null;
          this.s.setTool('select');
        }
      }
      this.updatePreview(p);
      this.v.request();
    }

    selectDown(e, sp, p) {
      const story = this.s.activeStory();
      if (!story) return;

      // 1) seçili elemanın tutamağı mı?
      const gtol = 7 / this.v.vp.scale;
      for (const el of this.s.selectedElements()) {
        for (const g of G().elementGrips(el)) {
          if (G().dist(g, p) <= gtol) {
            this.s.snapshot();
            this.drag = { mode: 'grip', el, grip: g.k, moved: false };
            this.v.canvas.setPointerCapture(e.pointerId);
            return;
          }
        }
      }

      // 2) eleman üzerinde mi?
      const hit = G().pickElement(story, p, 2 / this.v.vp.scale);
      if (hit) {
        if (e.shiftKey) this.s.toggleSelection(hit.id, true);
        else if (!this.s.selection.includes(hit.id)) this.s.setSelection([hit.id]);
        this.drag = { mode: 'move', start: p, last: p, moved: false, snapped: false };
        this.v.canvas.setPointerCapture(e.pointerId);
        return;
      }

      // 3) boşluk -> pencere seçimi
      if (!e.shiftKey) this.s.setSelection([]);
      this.drag = { mode: 'rubber', sx: sp.x, sy: sp.y, additive: e.shiftKey };
      this.v.canvas.setPointerCapture(e.pointerId);
      this.v.request();
    }

    onMove(e) {
      const sp = this.evPos(e);
      const d = this.drag;

      if (d && d.mode === 'pan') {
        this.v.vp.pan(sp.x - d.sx, sp.y - d.sy);
        d.sx = sp.x; d.sy = sp.y;
        this.s.emit('viewport');
        this.v.request();
        return;
      }

      const p = this.resolve(sp);
      this.v.cursor = p;
      this.s.emit('cursor', { world: p, snap: this.v.snapHit });

      if (d && d.mode === 'rubber') {
        this.v.rubber = { x1: d.sx, y1: d.sy, x2: sp.x, y2: sp.y };
        this.v.request();
        return;
      }
      if (d && d.mode === 'move') {
        if (!d.moved && G().dist(d.start, p) * this.v.vp.scale < 4) { this.v.request(); return; }
        if (!d.moved) { this.s.snapshot(); d.moved = true; }
        const dx = p.x - d.last.x, dy = p.y - d.last.y;
        this.translateSelection(dx, dy);
        d.last = p;
        this.s.emit('change');
        this.v.request();
        return;
      }
      if (d && d.mode === 'grip') {
        this.moveGrip(d.el, d.grip, p);
        d.moved = true;
        this.s.emit('change');
        this.v.request();
        return;
      }

      this.updatePreview(p);
      this.v.request();
    }

    onUp(e) {
      const d = this.drag;
      if (!d) return;
      if (d.mode === 'rubber') {
        const sp = this.evPos(e);
        const a = this.v.vp.toWorld({ x: Math.min(d.sx, sp.x), y: Math.max(d.sy, sp.y) });
        const b = this.v.vp.toWorld({ x: Math.max(d.sx, sp.x), y: Math.min(d.sy, sp.y) });
        const r = { minX: a.x, minY: a.y, maxX: b.x, maxY: b.y };
        const story = this.s.activeStory();
        if (story && Math.abs(d.sx - sp.x) > 3 && Math.abs(d.sy - sp.y) > 3) {
          const found = G().elementsInRect(story, r).map((x) => x.id);
          this.s.setSelection(d.additive ? this.s.selection.concat(found) : found);
          this.s.status(`${found.length} eleman seçildi.`);
        }
        this.v.rubber = null;
      }
      if ((d.mode === 'move' && d.moved) || (d.mode === 'grip' && d.moved)) this.s.dirty = true;
      this.drag = null;
      this.v.request();
    }

    onRightClick() {
      if (this.pending.length) this.finishPending();
      else { this.s.setSelection([]); this.s.setTool('select'); }
      this.v.request();
    }

    // -------------------------------------------------------------- önizleme
    updatePreview(p) {
      const t = this.s.tool, o = this.s.toolOpts;
      if (t === 'column') {
        this.v.preview = o.colShape === 'circle'
          ? { kind: 'column', shape: 'circle', x: p.x, y: p.y, b: o.colD }
          : { kind: 'column', shape: 'rect', x: p.x, y: p.y, b: o.colB, h: o.colH, rot: o.colRot };
      } else if ((t === 'beam' || t === 'wall') && this.pending.length) {
        const a = this.pending[0];
        this.v.preview = { kind: 'band', x1: a.x, y1: a.y, x2: p.x, y2: p.y, w: t === 'beam' ? o.beamB : o.wallT };
      } else if (t === 'slab') {
        this.v.preview = this.pending.length ? { kind: 'poly', pts: this.pending, cursor: p } : null;
      } else if (t === 'axisX') {
        this.v.preview = { kind: 'axisX', v: p.x };
      } else if (t === 'axisY') {
        this.v.preview = { kind: 'axisY', v: p.y };
      } else if (t === 'measure' && this.pending.length) {
        const a = this.pending[0];
        this.v.preview = { kind: 'measure', x1: a.x, y1: a.y, x2: p.x, y2: p.y };
      } else if ((t === 'move' || t === 'copy') && this.pending.length) {
        const a = this.pending[0];
        this.v.preview = { kind: 'measure', x1: a.x, y1: a.y, x2: p.x, y2: p.y };
      } else {
        this.v.preview = null;
      }
    }

    // ------------------------------------------------------------- oluşturma
    commitColumn(p, o) {
      const st = this.s.activeStory(); if (!st) return;
      this.s.snapshot();
      const mat = this.s.project.settings.concrete;
      const el = o.colShape === 'circle'
        ? YC.make.column(st, p.x, p.y, o.colD, o.colD, 0, 'circle', mat)
        : YC.make.column(st, p.x, p.y, o.colB, o.colH, o.colRot, 'rect', mat);
      st.elements.push(el);
      this.s.emit('change');
      this.s.status(`${el.name} eklendi (${el.shape === 'circle' ? 'Ø' + el.b : el.b + '/' + el.h}).`, 'ok');
    }

    commitBeam(a, b) {
      const st = this.s.activeStory(); if (!st) return;
      const o = this.s.toolOpts;
      this.s.snapshot();
      const el = YC.make.beam(st, a.x, a.y, b.x, b.y, o.beamB, o.beamH, this.s.project.settings.concrete);
      st.elements.push(el);
      this.s.emit('change');
      this.s.status(`${el.name} eklendi (L=${U().fmtM(G().dist(a, b))} m).`, 'ok');
    }

    commitWall(a, b) {
      const st = this.s.activeStory(); if (!st) return;
      const o = this.s.toolOpts;
      this.s.snapshot();
      const el = YC.make.wall(st, a.x, a.y, b.x, b.y, o.wallT, this.s.project.settings.concrete);
      st.elements.push(el);
      this.s.emit('change');
      this.s.status(`${el.name} eklendi (L=${U().fmtM(G().dist(a, b))} m).`, 'ok');
    }

    commitSlab(pts) {
      const st = this.s.activeStory(); if (!st) return;
      if (pts.length < 3) { this.s.status('Döşeme için en az 3 köşe gerekir.', 'warn'); return; }
      this.s.snapshot();
      const el = YC.make.slab(st, pts, this.s.toolOpts.slabT, this.s.project.settings.concrete);
      st.elements.push(el);
      this.s.emit('change');
      const A = Math.abs(G().polygonArea(pts)) * 1e-4;
      this.s.status(`${el.name} eklendi (A=${A.toFixed(2)} m²).`, 'ok');
    }

    commitAxis(dir, v) {
      const p = this.s.project;
      this.s.snapshot();
      if (dir === 'x') p.axesX.push({ id: U().uid('ax'), name: YC.nextAxisXName(p), x: Math.round(v) });
      else p.axesY.push({ id: U().uid('ay'), name: YC.nextAxisYName(p), y: Math.round(v) });
      this.s.emit('change');
      this.s.status('Aks eklendi.', 'ok');
    }

    finishPending() {
      if (this.s.tool === 'slab' && this.pending.length >= 3) this.commitSlab(this.pending);
      this.pending = []; this.base = null; this.v.preview = null;
      this.v.request();
    }

    cancel() {
      this.pending = []; this.base = null; this.v.preview = null; this.v.rubber = null;
      this.drag = null;
      if (this.s.tool !== 'select') { this.s.setTool('select'); this.s.status('İptal edildi.'); }
      else this.s.setSelection([]);
      this.v.request();
    }

    // ------------------------------------------------------------- düzenleme
    translateSelection(dx, dy) {
      for (const el of this.s.selectedElements()) this.translateElement(el, dx, dy);
    }

    translateElement(el, dx, dy) {
      if (el.type === 'column') { el.x += dx; el.y += dy; }
      else if (el.type === 'beam' || el.type === 'wall') { el.x1 += dx; el.y1 += dy; el.x2 += dx; el.y2 += dy; }
      else if (el.type === 'slab') el.pts.forEach((p) => { p.x += dx; p.y += dy; });
    }

    moveGrip(el, k, p) {
      if (el.type === 'column') { el.x = p.x; el.y = p.y; return; }
      if (el.type === 'beam' || el.type === 'wall') {
        if (k === 'p1') { el.x1 = p.x; el.y1 = p.y; }
        else if (k === 'p2') { el.x2 = p.x; el.y2 = p.y; }
        else {
          const m = G().mid({ x: el.x1, y: el.y1 }, { x: el.x2, y: el.y2 });
          this.translateElement(el, p.x - m.x, p.y - m.y);
        }
        return;
      }
      if (el.type === 'slab' && k.startsWith('v')) {
        const i = parseInt(k.slice(1), 10);
        if (el.pts[i]) { el.pts[i].x = p.x; el.pts[i].y = p.y; }
      }
    }

    doMove(d) {
      this.s.snapshot();
      this.translateSelection(d.x, d.y);
      this.s.emit('change');
      this.s.status(`Taşındı: Δ${U().fmtM(d.x)} / ${U().fmtM(d.y)} m`, 'ok');
    }

    doCopy(d) {
      const st = this.s.activeStory(); if (!st) return;
      this.s.snapshot();
      const news = [];
      for (const el of this.s.selectedElements()) {
        const c = U().clone(el);
        c.id = U().uid(el.type[0]);
        c.name = YC.nextName(st, el.type);
        this.translateElement(c, d.x, d.y);
        st.elements.push(c);
        news.push(c.id);
      }
      this.s.setSelection(news);
      this.s.emit('change');
      this.s.status(`${news.length} eleman kopyalandı.`, 'ok');
    }

    deleteSelection() {
      const ids = this.s.selection.slice();
      if (!ids.length) { this.s.status('Silinecek eleman seçili değil.', 'warn'); return; }
      this.s.snapshot();
      for (const s of this.s.project.stories) {
        s.elements = s.elements.filter((e) => !ids.includes(e.id));
      }
      this.s.setSelection([]);
      this.s.emit('change');
      this.s.status(`${ids.length} eleman silindi.`, 'ok');
    }

    selectAll() {
      const st = this.s.activeStory(); if (!st) return;
      this.s.setSelection(st.elements.map((e) => e.id));
      this.s.status(`${st.elements.length} eleman seçildi.`);
    }

    nudge(dx, dy) {
      if (!this.s.selection.length) return;
      this.s.snapshot();
      this.translateSelection(dx, dy);
      this.s.emit('change');
    }

    /** Klavye/komut satırından mutlak veya göreli koordinat girişi. */
    enterCoord(txt) {
      const t = String(txt).trim();
      const rel = t.startsWith('@');
      const parts = (rel ? t.slice(1) : t).split(/[;,\s]+/).filter(Boolean);
      if (parts.length !== 2) return false;
      const x = U().num(parts[0], NaN), y = U().num(parts[1], NaN);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
      // Göreli giriş, bekleyen son noktaya; o yoksa en son kullanılan noktaya dayanır.
      const base = this.pending.length
        ? this.pending[this.pending.length - 1]
        : (this.lastPoint || { x: 0, y: 0 });
      const p = rel ? { x: base.x + x, y: base.y + y } : { x, y };
      this.applyPoint(p);
      return true;
    }

    /** Bir noktayı, sanki tıklanmış gibi aktif araca uygula. */
    applyPoint(p) {
      const t = this.s.tool, o = this.s.toolOpts;
      this.lastPoint = p;
      if (t === 'column') this.commitColumn(p, o);
      else if (t === 'beam' || t === 'wall') {
        if (!this.pending.length) { this.pending = [p]; this.base = p; }
        else { const a = this.pending[0]; t === 'beam' ? this.commitBeam(a, p) : this.commitWall(a, p); this.pending = [p]; this.base = p; }
      } else if (t === 'slab') this.pending.push(p);
      else if (t === 'axisX') this.commitAxis('x', p.x);
      else if (t === 'axisY') this.commitAxis('y', p.y);
      else this.s.status('Bu araç koordinat girişi kullanmıyor.', 'warn');
      this.updatePreview(p);
      this.v.request();
    }
  }

  YC.Tools2D = Tools2D;
})();
