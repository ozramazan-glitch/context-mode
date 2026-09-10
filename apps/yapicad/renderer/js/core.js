/* YapıCAD — core
 * Veri modeli, birimler, malzemeler, kesit önayarları, durum yönetimi (undo/redo).
 *
 * BİRİM SÖZLEŞMESİ (tek kural, istisnasız):
 *   Modelin içindeki BÜTÜN uzunluklar SANTİMETRE cinsindendir.
 *   Plan koordinatları da, kesit ölçüleri (b/h/t) de, kat yüksekliği de cm'dir.
 *   Metre yalnızca EKRANA yazarken üretilir (fmtM). Modelde metre yoktur.
 */
(function () {
  'use strict';
  const YC = (window.YC = window.YC || {});

  // ---------------------------------------------------------------- yardımcı
  let _seq = 0;
  const uid = (p) => `${p}_${Date.now().toString(36)}_${(_seq++).toString(36)}`;

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  const clone = (o) => {
    try { return structuredClone(o); } catch (_) { return JSON.parse(JSON.stringify(o)); }
  };

  /** cm -> "12.34" metre metni */
  const fmtM = (cm, dec = 2) => (Number(cm || 0) / 100).toFixed(dec);
  /** cm -> "1234" cm metni */
  const fmtCm = (cm, dec = 0) => Number(cm || 0).toFixed(dec);

  const num = (v, def = 0) => {
    const n = parseFloat(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : def;
  };

  YC.util = { uid, clamp, clone, fmtM, fmtCm, num };

  // ------------------------------------------------------------- malzemeler
  YC.MATERIALS = {
    concrete: [
      { id: 'C20/25', fck: 20, E: 30000 },
      { id: 'C25/30', fck: 25, E: 31000 },
      { id: 'C30/37', fck: 30, E: 33000 },
      { id: 'C35/45', fck: 35, E: 34000 },
      { id: 'C40/50', fck: 40, E: 35000 },
    ],
    steel: [
      { id: 'B420C', fyk: 420 },
      { id: 'B500C', fyk: 500 },
    ],
  };

  // --------------------------------------------------------- kesit önayarlar
  YC.PRESETS = {
    column: ['30/30', '30/50', '30/60', '40/40', '40/60', '50/50', '25/70', '60/60'],
    columnRound: [40, 50, 60],
    beam: ['20/50', '25/50', '25/60', '30/50', '30/60', '30/70', '40/60'],
    wall: [20, 25, 30, 40],
    slab: [12, 14, 15, 16, 18, 20],
  };

  const parseBH = (s) => {
    const m = String(s).split('/');
    return { b: num(m[0], 30), h: num(m[1], 30) };
  };
  YC.parseBH = parseBH;

  // ------------------------------------------------------------- eleman adı
  const PREFIX = { column: 'S', beam: 'K', wall: 'P', slab: 'D' };

  function nextName(story, type) {
    const pre = PREFIX[type] || 'X';
    let max = 0;
    for (const el of story.elements) {
      if (el.type !== type) continue;
      const m = /^([A-Z]+)(\d+)$/.exec(el.name || '');
      if (m && m[1] === pre) max = Math.max(max, parseInt(m[2], 10));
    }
    return pre + String(max + 1).padStart(2, '0');
  }
  YC.nextName = nextName;

  // ------------------------------------------------------------------ model
  function makeStory(name, height, elevation) {
    return {
      id: uid('kat'),
      name,
      height,          // cm
      elevation,       // cm, kat tabanı kotu
      visible: true,
      elements: [],
    };
  }

  /** Varsayılan proje: 3 açıklık x 3 açıklık aks, 2 kat, örnek kolonlar. */
  function createProject(empty) {
    const p = {
      version: 1,
      name: 'Adsız Proje',
      info: { engineer: '', location: '', note: '' },
      settings: {
        gridMinor: 50,     // cm
        gridMajor: 500,    // cm
        snapPx: 14,        // ekran pikseli
        concrete: 'C30/37',
        steel: 'B420C',
        showGrid: true,
        showAxes: true,
        showDims: true,
        showNames: true,
      },
      // Akslar tüm katlar için ORTAKTIR (ideCAD mantığı).
      axesX: [], // düşey akslar (sabit x), rakamla adlanır: 1,2,3
      axesY: [], // yatay akslar (sabit y), harfle adlanır: A,B,C
      stories: [],
      activeStoryId: null,
    };

    if (!empty) {
      const sx = [0, 500, 1000, 1500];
      const sy = [0, 400, 800, 1200];
      sx.forEach((x, i) => p.axesX.push({ id: uid('ax'), name: String(i + 1), x }));
      sy.forEach((y, i) => p.axesY.push({ id: uid('ay'), name: String.fromCharCode(65 + i), y }));

      const k1 = makeStory('Zemin Kat', 300, 0);
      const k2 = makeStory('1. Kat', 300, 300);
      p.stories.push(k1, k2);
      p.activeStoryId = k1.id;

      // Her aks kesişimine kolon, akslar boyunca kiriş.
      for (const ax of p.axesX) {
        for (const ay of p.axesY) {
          k1.elements.push(makeColumn(k1, ax.x, ay.y, 30, 60, 0, 'rect', p.settings.concrete));
        }
      }
      for (const ay of p.axesY) {
        for (let i = 0; i < sx.length - 1; i++) {
          k1.elements.push(makeBeam(k1, sx[i], ay.y, sx[i + 1], ay.y, 25, 50, p.settings.concrete));
        }
      }
      for (const ax of p.axesX) {
        for (let i = 0; i < sy.length - 1; i++) {
          k1.elements.push(makeBeam(k1, ax.x, sy[i], ax.x, sy[i + 1], 25, 50, p.settings.concrete));
        }
      }
    } else {
      const k = makeStory('Zemin Kat', 300, 0);
      p.stories.push(k);
      p.activeStoryId = k.id;
    }
    return p;
  }

  // -------------------------------------------------------- eleman üreticiler
  function makeColumn(story, x, y, b, h, rot, shape, mat) {
    return {
      id: uid('s'), type: 'column', name: nextName(story, 'column'),
      x, y, b, h, rot: rot || 0, shape: shape || 'rect',
      material: mat || 'C30/37',
    };
  }
  function makeBeam(story, x1, y1, x2, y2, b, h, mat) {
    return {
      id: uid('k'), type: 'beam', name: nextName(story, 'beam'),
      x1, y1, x2, y2, b, h, material: mat || 'C30/37',
    };
  }
  function makeWall(story, x1, y1, x2, y2, t, mat) {
    return {
      id: uid('p'), type: 'wall', name: nextName(story, 'wall'),
      x1, y1, x2, y2, t, material: mat || 'C30/37',
    };
  }
  function makeSlab(story, pts, t, mat) {
    return {
      id: uid('d'), type: 'slab', name: nextName(story, 'slab'),
      pts: pts.map((p) => ({ x: p.x, y: p.y })), t, material: mat || 'C30/37',
    };
  }

  YC.make = { story: makeStory, column: makeColumn, beam: makeBeam, wall: makeWall, slab: makeSlab };
  YC.createProject = createProject;

  // ------------------------------------------------------------ aks işlemleri
  function nextAxisXName(p) {
    let max = 0;
    for (const a of p.axesX) { const n = parseInt(a.name, 10); if (Number.isFinite(n)) max = Math.max(max, n); }
    return String(max + 1);
  }
  function nextAxisYName(p) {
    let max = -1;
    for (const a of p.axesY) {
      const c = String(a.name).trim().toUpperCase();
      if (/^[A-Z]$/.test(c)) max = Math.max(max, c.charCodeAt(0) - 65);
    }
    const i = max + 1;
    return i < 26 ? String.fromCharCode(65 + i) : 'A' + String.fromCharCode(65 + (i - 26));
  }
  YC.nextAxisXName = nextAxisXName;
  YC.nextAxisYName = nextAxisYName;

  // ------------------------------------------------------------------- store
  /**
   * Tek merkezî durum. Mutasyondan ÖNCE snapshot() çağır; geri al bunun üzerine kurulu.
   * Dinleyiciler: on('change'|'select'|'tool'|'story'|'status', fn)
   */
  const Store = {
    project: null,
    selection: [],        // element id listesi
    tool: 'select',
    toolOpts: {
      colB: 30, colH: 60, colRot: 0, colShape: 'rect', colD: 40,
      beamB: 25, beamH: 50,
      wallT: 25,
      slabT: 15,
    },
    snaps: { axis: true, end: true, mid: true, perp: true, grid: true, ortho: false },
    _undo: [], _redo: [], _lis: {},
    dirty: false,

    init(project) {
      this.project = project || createProject();
      this.selection = [];
      this._undo = []; this._redo = [];
      this.dirty = false;
      this.emit('change'); this.emit('select'); this.emit('story');
    },

    activeStory() {
      const p = this.project;
      return p.stories.find((s) => s.id === p.activeStoryId) || p.stories[0] || null;
    },
    setActiveStory(id) {
      if (!this.project.stories.some((s) => s.id === id)) return;
      this.project.activeStoryId = id;
      this.selection = [];
      this.emit('story'); this.emit('select'); this.emit('change');
    },

    findElement(id) {
      for (const s of this.project.stories) {
        const e = s.elements.find((x) => x.id === id);
        if (e) return { story: s, el: e };
      }
      return null;
    },
    selectedElements() {
      const out = [];
      for (const id of this.selection) { const f = this.findElement(id); if (f) out.push(f.el); }
      return out;
    },
    setSelection(ids) {
      this.selection = Array.from(new Set(ids));
      this.emit('select');
    },
    toggleSelection(id, additive) {
      if (!additive) { this.selection = [id]; }
      else if (this.selection.includes(id)) { this.selection = this.selection.filter((x) => x !== id); }
      else { this.selection = this.selection.concat([id]); }
      this.emit('select');
    },

    setTool(t) { this.tool = t; this.emit('tool'); },

    snapshot() {
      this._undo.push(clone(this.project));
      if (this._undo.length > 60) this._undo.shift();
      this._redo.length = 0;
      this.dirty = true;
    },
    undo() {
      if (!this._undo.length) { this.status('Geri alınacak işlem yok.'); return; }
      this._redo.push(clone(this.project));
      this.project = this._undo.pop();
      this.selection = this.selection.filter((id) => this.findElement(id));
      this.dirty = true;
      this.emit('change'); this.emit('select'); this.emit('story');
      this.status('Geri alındı.');
    },
    redo() {
      if (!this._redo.length) { this.status('Yinelenecek işlem yok.'); return; }
      this._undo.push(clone(this.project));
      this.project = this._redo.pop();
      this.selection = this.selection.filter((id) => this.findElement(id));
      this.dirty = true;
      this.emit('change'); this.emit('select'); this.emit('story');
      this.status('Yinelendi.');
    },
    canUndo() { return this._undo.length > 0; },
    canRedo() { return this._redo.length > 0; },

    on(ev, fn) { (this._lis[ev] = this._lis[ev] || []).push(fn); },
    emit(ev, arg) { (this._lis[ev] || []).forEach((f) => { try { f(arg); } catch (e) { console.error(e); } }); },
    status(msg, kind) { this.emit('status', { msg, kind: kind || 'info' }); },
  };

  YC.Store = Store;

  // ------------------------------------------------- proje istatistiği (bilgi)
  /**
   * Sadece GEOMETRİK metraj. Yapısal analiz DEĞİLDİR, taşıma gücü hesabı DEĞİLDİR.
   */
  function metraj(project) {
    let colVol = 0, beamVol = 0, wallVol = 0, slabVol = 0, slabArea = 0;
    let n = { column: 0, beam: 0, wall: 0, slab: 0 };
    for (const s of project.stories) {
      for (const e of s.elements) {
        n[e.type] = (n[e.type] || 0) + 1;
        if (e.type === 'column') {
          const a = e.shape === 'circle' ? Math.PI * (e.b / 2) ** 2 : e.b * e.h;
          colVol += a * s.height;
        } else if (e.type === 'beam') {
          const L = Math.hypot(e.x2 - e.x1, e.y2 - e.y1);
          beamVol += e.b * e.h * L;
        } else if (e.type === 'wall') {
          const L = Math.hypot(e.x2 - e.x1, e.y2 - e.y1);
          wallVol += e.t * L * s.height;
        } else if (e.type === 'slab') {
          const A = Math.abs(YC.geom.polygonArea(e.pts));
          slabArea += A;
          slabVol += A * e.t;
        }
      }
    }
    const cm3_to_m3 = 1e-6;
    return {
      counts: n,
      betonM3: {
        kolon: colVol * cm3_to_m3, kiris: beamVol * cm3_to_m3,
        perde: wallVol * cm3_to_m3, doseme: slabVol * cm3_to_m3,
        toplam: (colVol + beamVol + wallVol + slabVol) * cm3_to_m3,
      },
      dosemeAlanM2: slabArea * 1e-4,
    };
  }
  YC.metraj = metraj;
})();
