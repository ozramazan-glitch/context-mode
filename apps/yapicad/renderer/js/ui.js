/* YapıCAD — arayüz bağlantıları: şerit, paneller, ağaç, özellikler, komut satırı. */
(function () {
  'use strict';
  const YC = (window.YC = window.YC || {});
  const U = () => YC.util;
  const G = () => YC.geom;

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const TYPE_TR = { column: 'Kolon', beam: 'Kiriş', wall: 'Perde', slab: 'Döşeme' };
  const TYPE_PL = { column: 'Kolonlar', beam: 'Kirişler', wall: 'Perdeler', slab: 'Döşemeler' };

  const UI = {
    app: null,
    collapsed: {},          // ağaç düğüm durumları

    init(app) {
      this.app = app;
      this.fillSelects();
      this.bindRibbon();
      this.bindOptions();
      this.bindStatusBar();
      this.bindCommandLine();
      this.bindKeyboard();
      this.bindSplitter();
      this.bindModal();

      const s = app.store;
      s.on('change', () => { this.refresh(); this.markDirty(); });
      s.on('select', () => { this.renderProps(); this.renderTree(); app.v2.request(); app.v3.request(); });
      s.on('story', () => { this.renderStories(); this.renderTree(); this.renderProps(); this.updateStatus(); });
      s.on('tool', () => this.syncTool());
      s.on('status', (e) => this.say(e.msg, e.kind));
      s.on('cursor', (e) => this.showCursor(e));
      s.on('viewport', () => this.updateZoom());

      this.syncTool();
      this.syncSnaps();
      this.refresh();
    },

    // ------------------------------------------------------------- doldurma
    fillSelects() {
      const o = this.app.store.toolOpts;
      const colP = $('#colPreset');
      colP.innerHTML = YC.PRESETS.column.map((p) => `<option value="${p}">${p}</option>`).join('') +
        YC.PRESETS.columnRound.map((d) => `<option value="D${d}">Ø${d}</option>`).join('');
      colP.value = `${o.colB}/${o.colH}`;

      const beamP = $('#beamPreset');
      beamP.innerHTML = YC.PRESETS.beam.map((p) => `<option value="${p}">${p}</option>`).join('');
      beamP.value = `${o.beamB}/${o.beamH}`;

      $('#matConcrete').innerHTML = YC.MATERIALS.concrete
        .map((m) => `<option value="${m.id}">${m.id} (fck=${m.fck} MPa)</option>`).join('');
      $('#matSteel').innerHTML = YC.MATERIALS.steel
        .map((m) => `<option value="${m.id}">${m.id} (fyk=${m.fyk} MPa)</option>`).join('');

      $('#colB').value = o.colB; $('#colH').value = o.colH; $('#colRot').value = o.colRot;
      $('#colShape').value = o.colShape;
      $('#beamB').value = o.beamB; $('#beamH').value = o.beamH;
      $('#wallT').value = o.wallT; $('#slabT').value = o.slabT;
    },

    // --------------------------------------------------------------- şerit
    bindRibbon() {
      $$('.rtab').forEach((t) => t.addEventListener('click', () => {
        $$('.rtab').forEach((x) => x.classList.toggle('active', x === t));
        $$('.rpanel').forEach((p) => p.classList.toggle('active', p.dataset.tab === t.dataset.tab));
      }));

      document.body.addEventListener('click', (e) => {
        const tb = e.target.closest('[data-tool]');
        if (tb) { this.app.store.setTool(tb.dataset.tool); return; }
        const vb = e.target.closest('[data-vmode]');
        if (vb) { this.setViewMode(vb.dataset.vmode); return; }
        const cb = e.target.closest('[data-cmd]');
        if (cb) { this.run(cb.dataset.cmd); }
      });
    },

    bindOptions() {
      const s = this.app.store, o = s.toolOpts;

      const numIn = (id, key, after) => {
        const el = $(id);
        el.addEventListener('change', () => {
          o[key] = U().num(el.value, o[key]);
          el.value = o[key];
          if (after) after();
          this.app.v2.request();
        });
      };
      numIn('#colB', 'colB', () => this.syncColPreset());
      numIn('#colH', 'colH', () => this.syncColPreset());
      numIn('#colRot', 'colRot');
      numIn('#beamB', 'beamB', () => this.syncBeamPreset());
      numIn('#beamH', 'beamH', () => this.syncBeamPreset());
      numIn('#wallT', 'wallT');
      numIn('#slabT', 'slabT');

      $('#colPreset').addEventListener('change', (e) => {
        const v = e.target.value;
        if (v.startsWith('D')) { o.colShape = 'circle'; o.colD = U().num(v.slice(1), 40); $('#colShape').value = 'circle'; }
        else { o.colShape = 'rect'; const bh = YC.parseBH(v); o.colB = bh.b; o.colH = bh.h; $('#colShape').value = 'rect'; }
        $('#colB').value = o.colB; $('#colH').value = o.colH;
        this.app.v2.request();
      });
      $('#colShape').addEventListener('change', (e) => { o.colShape = e.target.value; this.app.v2.request(); });
      $('#beamPreset').addEventListener('change', (e) => {
        const bh = YC.parseBH(e.target.value);
        o.beamB = bh.b; o.beamH = bh.h;
        $('#beamB').value = bh.b; $('#beamH').value = bh.h;
      });

      $('#matConcrete').addEventListener('change', (e) => { s.project.settings.concrete = e.target.value; s.dirty = true; });
      $('#matSteel').addEventListener('change', (e) => { s.project.settings.steel = e.target.value; s.dirty = true; });

      const chk = (id, fn) => $(id).addEventListener('change', (e) => { fn(e.target.checked); this.app.v2.request(); this.app.v3.request(); });
      chk('#optGrid', (v) => (s.project.settings.showGrid = v));
      chk('#optAxes', (v) => (s.project.settings.showAxes = v));
      chk('#optDims', (v) => (s.project.settings.showDims = v));
      chk('#optNames', (v) => (s.project.settings.showNames = v));
      chk('#ghostStory', (v) => (this.app.v2.ghostStoryVisible = v));
      chk('#opt3dWire', (v) => (this.app.v3.mode = v ? 'wire' : 'solid'));
      chk('#opt3dAll', (v) => (this.app.v3.allStories = v));
    },

    syncColPreset() {
      const o = this.app.store.toolOpts;
      const sel = $('#colPreset');
      const want = o.colShape === 'circle' ? 'D' + o.colD : `${o.colB}/${o.colH}`;
      sel.value = Array.from(sel.options).some((x) => x.value === want) ? want : '';
    },
    syncBeamPreset() {
      const o = this.app.store.toolOpts;
      const sel = $('#beamPreset');
      const want = `${o.beamB}/${o.beamH}`;
      sel.value = Array.from(sel.options).some((x) => x.value === want) ? want : '';
    },

    syncTool() {
      const t = this.app.store.tool;
      $$('[data-tool]').forEach((b) => b.classList.toggle('active', b.dataset.tool === t));
      $('#toolHint').textContent = YC.TOOL_HINTS[t] || '';
      const c = $('#c2d');
      c.style.cursor = t === 'select' ? 'default' : 'crosshair';
    },

    setViewMode(m) {
      $('#viewport').dataset.mode = m;
      $$('[data-vmode]').forEach((b) => b.classList.toggle('active', b.dataset.vmode === m));
      requestAnimationFrame(() => { this.app.v2.resize(); this.app.v3.resize(); });
    },

    // ---------------------------------------------------------- durum çubuğu
    bindStatusBar() {
      $$('.stog').forEach((b) => b.addEventListener('click', () => {
        const k = b.dataset.snap;
        this.app.store.snaps[k] = !this.app.store.snaps[k];
        this.syncSnaps();
      }));
    },
    syncSnaps() {
      const s = this.app.store.snaps;
      $$('.stog').forEach((b) => b.classList.toggle('on', !!s[b.dataset.snap]));
    },
    showCursor(e) {
      $('#stCoord').textContent = `X: ${U().fmtM(e.world.x)} m   Y: ${U().fmtM(e.world.y)} m`;
      $('#stSnap').textContent = e.snap ? e.snap.label : '—';
    },
    updateZoom() {
      // Ekranda 1 cm ≈ 37.8 px (96 dpi). Ölçek = gerçek cm / ekran cm.
      const s = this.app.v2.vp.scale;
      const denom = s > 0 ? (96 / 2.54) / s : 0;
      $('#stZoom').textContent = denom ? `Ölçek ≈ 1:${Math.round(denom)}` : '—';
    },
    updateStatus() {
      const s = this.app.store, st = s.activeStory();
      $('#stStory').textContent = 'Kat: ' + (st ? st.name : '—');
      const n = st ? st.elements.length : 0;
      const tot = s.project.stories.reduce((a, x) => a + x.elements.length, 0);
      $('#stCount').textContent = `${n} eleman (toplam ${tot})`;
      this.updateZoom();
    },
    say(msg, kind) {
      const el = $('#cmdMsg');
      el.textContent = msg;
      el.className = 'cmdmsg ' + (kind || '');
    },
    markDirty() {
      $('#dirtyDot').hidden = !this.app.store.dirty;
      $('#btnUndo').disabled = !this.app.store.canUndo();
      $('#btnRedo').disabled = !this.app.store.canRedo();
      YC.platform.setDirty(this.app.store.dirty);
    },

    // --------------------------------------------------------------- yenile
    refresh() {
      this.renderTree();
      this.renderStories();
      this.renderProps();
      this.renderMetraj();
      this.updateStatus();
      $('#projTitle').textContent = this.app.store.project.name || 'Adsız Proje';
      this.app.v2.request();
      this.app.v3.request();
    },

    // ---------------------------------------------------------- proje ağacı
    renderTree() {
      const s = this.app.store, p = s.project, box = $('#tree');
      const sel = new Set(s.selection);
      const out = [];
      out.push(`<div class="trow active" data-k="proj"><span class="tcar">▾</span><b>${esc(p.name)}</b></div>`);
      out.push('<div class="tchildren">');
      for (const st of p.stories) {
        const key = 'st_' + st.id;
        const open = !this.collapsed[key];
        const act = st.id === p.activeStoryId ? ' active' : '';
        out.push(`<div class="trow${act}" data-story="${st.id}" data-toggle="${key}">
          <span class="tcar">${open ? '▾' : '▸'}</span>${esc(st.name)}
          <span class="tcount">${st.elements.length}</span></div>`);
        if (!open) continue;
        out.push('<div class="tchildren">');
        for (const t of ['column', 'beam', 'wall', 'slab']) {
          const list = st.elements.filter((e) => e.type === t);
          if (!list.length) continue;
          const gkey = key + '_' + t;
          const gopen = !this.collapsed[gkey];
          out.push(`<div class="trow" data-toggle="${gkey}">
            <span class="tcar">${gopen ? '▾' : '▸'}</span>
            <span class="tdot ${t}"></span>${TYPE_PL[t]}<span class="tcount">${list.length}</span></div>`);
          if (!gopen) continue;
          out.push('<div class="tchildren">');
          for (const el of list) {
            out.push(`<div class="trow${sel.has(el.id) ? ' sel' : ''}" data-el="${el.id}" data-st="${st.id}">
              <span class="tcar"></span><span class="tdot ${t}"></span>${esc(el.name)}
              <span class="tcount">${esc(this.elShort(el))}</span></div>`);
          }
          out.push('</div>');
        }
        out.push('</div>');
      }
      out.push('</div>');

      // aks düğümü
      const akey = 'axes';
      const aopen = !this.collapsed[akey];
      out.push(`<div class="trow" data-toggle="${akey}"><span class="tcar">${aopen ? '▾' : '▸'}</span>Akslar
        <span class="tcount">${p.axesX.length}×${p.axesY.length}</span></div>`);
      if (aopen) {
        out.push('<div class="tchildren">');
        out.push(`<div class="trow"><span class="tcar"></span>Düşey: ${p.axesX.map((a) => esc(a.name)).join(', ') || '—'}</div>`);
        out.push(`<div class="trow"><span class="tcar"></span>Yatay: ${p.axesY.map((a) => esc(a.name)).join(', ') || '—'}</div>`);
        out.push('</div>');
      }
      box.innerHTML = out.join('');

      $$('.trow', box).forEach((row) => {
        row.addEventListener('click', (e) => {
          if (row.dataset.el) {
            if (row.dataset.st && row.dataset.st !== s.project.activeStoryId) s.setActiveStory(row.dataset.st);
            s.toggleSelection(row.dataset.el, e.shiftKey);
            return;
          }
          if (row.dataset.story) { s.setActiveStory(row.dataset.story); }
          if (row.dataset.toggle) {
            this.collapsed[row.dataset.toggle] = !this.collapsed[row.dataset.toggle];
            this.renderTree();
          }
        });
      });
    },

    elShort(el) {
      if (el.type === 'column') return el.shape === 'circle' ? 'Ø' + el.b : `${el.b}/${el.h}`;
      if (el.type === 'beam') return `${el.b}/${el.h}`;
      if (el.type === 'wall') return `t${el.t}`;
      if (el.type === 'slab') return `h${el.t}`;
      return '';
    },

    // ------------------------------------------------------------ kat listesi
    renderStories() {
      const s = this.app.store, p = s.project, box = $('#storyList');
      const rows = p.stories.slice().reverse().map((st) => `
        <div class="story${st.id === p.activeStoryId ? ' active' : ''}" data-id="${st.id}">
          <div>
            <div class="sname">${esc(st.name)}</div>
            <div class="smeta">h=${U().fmtM(st.height)} m · kot +${U().fmtM(st.elevation)} m · ${st.elements.length} eleman</div>
          </div>
          <button class="mini eye" data-vis="${st.id}" title="Görünürlük">${st.visible ? '👁' : '–'}</button>
        </div>`).join('');
      box.innerHTML = rows || '<div class="empty">Kat yok.</div>';
      $$('.story', box).forEach((r) => r.addEventListener('click', (e) => {
        if (e.target.dataset.vis) {
          const st = p.stories.find((x) => x.id === e.target.dataset.vis);
          st.visible = !st.visible;
          this.renderStories(); this.app.v3.request();
          return;
        }
        s.setActiveStory(r.dataset.id);
      }));
    },

    // ------------------------------------------------------------- özellikler
    renderProps() {
      const s = this.app.store, box = $('#props');
      const sel = s.selectedElements();

      if (sel.length === 0) return this.propsStory(box);
      if (sel.length > 1) return this.propsMulti(box, sel);
      this.propsSingle(box, sel[0]);
    },

    propsStory(box) {
      const s = this.app.store, st = s.activeStory(), p = s.project;
      if (!st) { box.innerHTML = '<div class="empty">Kat yok.</div>'; return; }
      box.innerHTML = `
        <div class="prop-title">Aktif Kat <span class="badge">${esc(st.name)}</span></div>
        <div class="prop">
          <label>Kat adı</label><input id="pStName" type="text" value="${esc(st.name)}">
          <label>Yükseklik (cm)</label><input id="pStH" type="number" min="200" max="900" step="10" value="${st.height}">
          <label>Taban kotu (cm)</label><input id="pStE" type="number" value="${st.elevation}" ${p.stories.indexOf(st) ? 'disabled' : ''}>
        </div>
        <div class="prop-title" style="margin-top:12px">Proje</div>
        <div class="prop">
          <label>Proje adı</label><input id="pPName" type="text" value="${esc(p.name)}">
          <label>Mühendis</label><input id="pPEng" type="text" value="${esc(p.info.engineer || '')}">
          <label>Izgara (cm)</label><input id="pGrid" type="number" min="5" step="5" value="${p.settings.gridMinor}">
        </div>
        <div class="empty" style="margin-top:10px">Bir eleman seçerseniz kesit özellikleri burada düzenlenir.</div>`;

      const bindT = (id, fn) => $(id).addEventListener('change', (e) => { s.snapshot(); fn(e.target.value); s.emit('change'); });
      bindT('#pStName', (v) => (st.name = v || st.name));
      bindT('#pStH', (v) => { st.height = U().num(v, st.height); this.recalcElevations(); });
      bindT('#pStE', (v) => { st.elevation = U().num(v, st.elevation); this.recalcElevations(); });
      bindT('#pPName', (v) => (p.name = v || p.name));
      bindT('#pPEng', (v) => (p.info.engineer = v));
      bindT('#pGrid', (v) => (p.settings.gridMinor = Math.max(5, U().num(v, 50))));
    },

    propsMulti(box, sel) {
      const s = this.app.store;
      const kinds = {};
      sel.forEach((e) => (kinds[e.type] = (kinds[e.type] || 0) + 1));
      box.innerHTML = `
        <div class="prop-title">Çoklu seçim <span class="badge">${sel.length} eleman</span></div>
        ${Object.entries(kinds).map(([k, v]) => `<div class="kv"><span>${TYPE_TR[k]}</span><span>${v}</span></div>`).join('')}
        <div class="prop" style="margin-top:10px">
          <label>Beton</label>
          <select id="pMulMat">${YC.MATERIALS.concrete.map((m) => `<option>${m.id}</option>`).join('')}</select>
        </div>
        <div style="display:flex;gap:5px;margin-top:8px">
          <button class="rbtn sm" data-cmd="edit.delete">Seçileni sil</button>
          <button class="rbtn sm" data-cmd="edit.deselect">Bırak</button>
        </div>`;
      $('#pMulMat').addEventListener('change', (e) => {
        s.snapshot();
        sel.forEach((el) => (el.material = e.target.value));
        s.emit('change');
      });
    },

    propsSingle(box, el) {
      const s = this.app.store;
      const matOpts = YC.MATERIALS.concrete
        .map((m) => `<option${m.id === el.material ? ' selected' : ''}>${m.id}</option>`).join('');
      let body = '';

      if (el.type === 'column') {
        body = `
          <div class="prop">
            <label>Ad</label><input data-f="name" type="text" value="${esc(el.name)}">
            <label>Biçim</label><select data-f="shape">
              <option value="rect"${el.shape === 'rect' ? ' selected' : ''}>Dikdörtgen</option>
              <option value="circle"${el.shape === 'circle' ? ' selected' : ''}>Dairesel</option></select>
            ${el.shape === 'circle'
              ? `<label>Çap (cm)</label><input data-f="b" type="number" min="20" step="5" value="${el.b}">`
              : `<label>b (cm)</label><input data-f="b" type="number" min="20" step="5" value="${el.b}">
                 <label>h (cm)</label><input data-f="h" type="number" min="20" step="5" value="${el.h}">
                 <label>Dönme (°)</label><input data-f="rot" type="number" step="15" value="${el.rot}">`}
            <label>X (cm)</label><input data-f="x" type="number" step="5" value="${el.x.toFixed(1)}">
            <label>Y (cm)</label><input data-f="y" type="number" step="5" value="${el.y.toFixed(1)}">
            <label>Beton</label><select data-f="material">${matOpts}</select>
          </div>`;
      } else if (el.type === 'beam' || el.type === 'wall') {
        const L = G().dist({ x: el.x1, y: el.y1 }, { x: el.x2, y: el.y2 });
        body = `
          <div class="prop">
            <label>Ad</label><input data-f="name" type="text" value="${esc(el.name)}">
            ${el.type === 'beam'
              ? `<label>b (cm)</label><input data-f="b" type="number" min="15" step="5" value="${el.b}">
                 <label>h (cm)</label><input data-f="h" type="number" min="20" step="5" value="${el.h}">`
              : `<label>t (cm)</label><input data-f="t" type="number" min="15" step="5" value="${el.t}">`}
            <label>X1 (cm)</label><input data-f="x1" type="number" step="5" value="${el.x1.toFixed(1)}">
            <label>Y1 (cm)</label><input data-f="y1" type="number" step="5" value="${el.y1.toFixed(1)}">
            <label>X2 (cm)</label><input data-f="x2" type="number" step="5" value="${el.x2.toFixed(1)}">
            <label>Y2 (cm)</label><input data-f="y2" type="number" step="5" value="${el.y2.toFixed(1)}">
            <label>Beton</label><select data-f="material">${matOpts}</select>
          </div>
          <div class="kv"><span>Uzunluk</span><span>${U().fmtM(L)} m</span></div>`;
      } else if (el.type === 'slab') {
        const A = Math.abs(G().polygonArea(el.pts)) * 1e-4;
        body = `
          <div class="prop">
            <label>Ad</label><input data-f="name" type="text" value="${esc(el.name)}">
            <label>Kalınlık (cm)</label><input data-f="t" type="number" min="8" step="1" value="${el.t}">
            <label>Beton</label><select data-f="material">${matOpts}</select>
          </div>
          <div class="kv"><span>Köşe sayısı</span><span>${el.pts.length}</span></div>
          <div class="kv"><span>Alan</span><span>${A.toFixed(2)} m²</span></div>
          <div class="kv"><span>Beton hacmi</span><span>${(A * el.t / 100).toFixed(2)} m³</span></div>`;
      }

      box.innerHTML = `
        <div class="prop-title"><span class="tdot ${el.type}"></span>${TYPE_TR[el.type]}
          <span class="badge">${esc(el.name)}</span></div>
        ${body}
        <div style="display:flex;gap:5px;margin-top:10px">
          <button class="rbtn sm" data-cmd="edit.delete">Sil</button>
          <button class="rbtn sm" data-cmd="edit.zoomSel">Yakınlaştır</button>
        </div>`;

      $$('[data-f]', box).forEach((inp) => inp.addEventListener('change', () => {
        const f = inp.dataset.f;
        s.snapshot();
        if (f === 'name' || f === 'material' || f === 'shape') el[f] = inp.value;
        else el[f] = U().num(inp.value, el[f]);
        if (f === 'shape' && el.shape === 'circle') el.h = el.b;
        s.emit('change');
      }));
    },

    // ---------------------------------------------------------------- metraj
    renderMetraj() {
      const m = YC.metraj(this.app.store.project);
      const b = m.betonM3;
      $('#metraj').innerHTML = `
        <div class="kv"><span>Kolon (${m.counts.column || 0})</span><span>${b.kolon.toFixed(2)} m³</span></div>
        <div class="kv"><span>Kiriş (${m.counts.beam || 0})</span><span>${b.kiris.toFixed(2)} m³</span></div>
        <div class="kv"><span>Perde (${m.counts.wall || 0})</span><span>${b.perde.toFixed(2)} m³</span></div>
        <div class="kv"><span>Döşeme (${m.counts.slab || 0})</span><span>${b.doseme.toFixed(2)} m³</span></div>
        <div class="kv"><span>Döşeme alanı</span><span>${m.dosemeAlanM2.toFixed(1)} m²</span></div>
        <div class="kv total"><span>Toplam beton</span><span>${b.toplam.toFixed(2)} m³</span></div>
        <div class="empty" style="margin-top:6px">Sadece geometrik hacim. Kesişimler (kolon-kiriş birleşimi) çıkarılmaz.</div>`;
    },

    // ----------------------------------------------------------- komut satırı
    bindCommandLine() {
      const inp = $('#cmdInput');
      const hist = []; let hi = -1;
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const t = inp.value.trim();
          if (!t) return;
          hist.push(t); hi = hist.length;
          inp.value = '';
          this.command(t);
        } else if (e.key === 'ArrowUp') { if (hi > 0) inp.value = hist[--hi]; e.preventDefault(); }
        else if (e.key === 'ArrowDown') { hi = Math.min(hist.length, hi + 1); inp.value = hist[hi] || ''; e.preventDefault(); }
        else if (e.key === 'Escape') { inp.value = ''; $('#c2d').focus(); }
        e.stopPropagation();
      });
    },

    command(raw) {
      const s = this.app.store, t = this.app.tools;
      const txt = raw.trim();
      const low = txt.toLowerCase().replace(/ı/g, 'i');

      // koordinat girişi
      if (/^@?-?[\d.,]+[;,\s]+-?[\d.,]+$/.test(txt)) {
        if (t.enterCoord(txt)) return;
      }
      // kesit girişi: 30/60
      if (/^\d+\/\d+$/.test(txt)) {
        const bh = YC.parseBH(txt);
        if (s.tool === 'beam') {
          s.toolOpts.beamB = bh.b; s.toolOpts.beamH = bh.h;
          $('#beamB').value = bh.b; $('#beamH').value = bh.h;
          this.syncBeamPreset();
        } else {
          s.toolOpts.colB = bh.b; s.toolOpts.colH = bh.h; s.toolOpts.colShape = 'rect';
          $('#colB').value = bh.b; $('#colH').value = bh.h; $('#colShape').value = 'rect';
          this.syncColPreset();
        }
        this.say(`Kesit ${txt} olarak ayarlandı.`, 'ok');
        return;
      }

      const TOOLS = {
        sec: 'select', s: 'select', kolon: 'column', k: 'column', kiris: 'beam',
        ki: 'beam', perde: 'wall', p: 'wall', doseme: 'slab', d: 'slab',
        aksx: 'axisX', aksy: 'axisY', olcu: 'measure', o: 'measure',
        tasi: 'move', kopyala: 'copy',
      };
      if (TOOLS[low]) { s.setTool(TOOLS[low]); this.say(YC.TOOL_HINTS[TOOLS[low]] || ''); return; }

      const CMDS = {
        sil: 'edit.delete', geri: 'edit.undo', ileri: 'edit.redo', tumu: 'edit.selectAll',
        zoom: 'view.zoomExtents', sigdir: 'view.zoomExtents', tema: 'view.theme',
        kaydet: 'file.save', ac: 'file.open', yeni: 'file.new', png: 'file.png',
        metraj: 'calc.metraj', csv: 'calc.csv', yardim: 'help.about', '?': 'help.about',
        plan: 'view.plan', '3b': 'view.3d', bolunmus: 'view.split',
        katekle: 'story.add', katsil: 'story.remove', katcogalt: 'story.duplicate',
      };
      if (CMDS[low]) { this.run(CMDS[low]); return; }

      this.say(`Bilinmeyen komut: "${txt}" — "yardim" yazın.`, 'err');
    },

    // -------------------------------------------------------------- klavye
    bindKeyboard() {
      window.addEventListener('keydown', (e) => {
        const tag = (e.target.tagName || '').toLowerCase();
        const typing = tag === 'input' || tag === 'select' || tag === 'textarea';
        const s = this.app.store, t = this.app.tools;

        if (e.ctrlKey || e.metaKey) {
          const k = e.key.toLowerCase();
          if (k === 'z') { e.preventDefault(); s.undo(); this.refresh(); return; }
          if (k === 'y') { e.preventDefault(); s.redo(); this.refresh(); return; }
          if (k === 's') { e.preventDefault(); this.run('file.save'); return; }
          if (k === 'o') { e.preventDefault(); this.run('file.open'); return; }
          if (k === 'n') { e.preventDefault(); this.run('file.new'); return; }
          if (k === 'a' && !typing) { e.preventDefault(); t.selectAll(); return; }
          if (k === 'c' && !typing) { e.preventDefault(); s.setTool('copy'); return; }
          return;
        }

        if (typing) return;

        if (e.key === 'Escape') { t.cancel(); return; }
        if (e.key === 'Enter') { t.finishPending(); return; }
        if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); t.deleteSelection(); return; }
        if (e.key === 'F8') { e.preventDefault(); s.snaps.ortho = !s.snaps.ortho; this.syncSnaps(); this.say('Orto ' + (s.snaps.ortho ? 'açık' : 'kapalı')); return; }
        if (e.key === 'F3') { e.preventDefault(); const on = !s.snaps.axis; ['axis', 'end', 'mid', 'perp', 'grid'].forEach((k) => (s.snaps[k] = on)); this.syncSnaps(); return; }
        if (e.key === ' ') { t.spaceDown = true; $('#c2d').style.cursor = 'grab'; return; }

        const step = e.shiftKey ? 50 : 5;
        if (e.key === 'ArrowLeft') { t.nudge(-step, 0); e.preventDefault(); }
        else if (e.key === 'ArrowRight') { t.nudge(step, 0); e.preventDefault(); }
        else if (e.key === 'ArrowUp') { t.nudge(0, step); e.preventDefault(); }
        else if (e.key === 'ArrowDown') { t.nudge(0, -step); e.preventDefault(); }

        const KEYS = { s: 'select', k: 'column', b: 'beam', p: 'wall', d: 'slab', m: 'measure' };
        const kk = e.key.toLowerCase();
        if (KEYS[kk]) s.setTool(KEYS[kk]);
        if (kk === 'f') this.run('view.zoomExtents');
      });

      window.addEventListener('keyup', (e) => {
        if (e.key === ' ') { this.app.tools.spaceDown = false; this.syncTool(); }
      });
    },

    bindSplitter() {
      const sp = $('#splitter'), vp = $('#viewport');
      let drag = false;
      sp.addEventListener('pointerdown', (e) => { drag = true; sp.setPointerCapture(e.pointerId); });
      window.addEventListener('pointermove', (e) => {
        if (!drag) return;
        const r = vp.getBoundingClientRect();
        const f = U().clamp((e.clientX - r.left) / r.width, 0.15, 0.85);
        $('.pane2d').style.flex = String(f);
        $('.pane3d').style.flex = String(1 - f);
        this.app.v2.resize(); this.app.v3.resize();
      });
      window.addEventListener('pointerup', () => (drag = false));
    },

    // --------------------------------------------------------------- modal
    bindModal() {
      $('#modalClose').addEventListener('click', () => this.closeModal());
      $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') this.closeModal(); });
    },
    modal(title, html, buttons) {
      $('#modalTitle').textContent = title;
      $('#modalBody').innerHTML = html;
      const foot = $('#modalFoot');
      foot.innerHTML = '';
      (buttons || [{ label: 'Kapat' }]).forEach((b) => {
        const el = document.createElement('button');
        el.className = 'rbtn sm' + (b.accent ? ' accent' : '');
        el.textContent = b.label;
        el.onclick = () => { this.closeModal(); if (b.fn) b.fn(); };
        foot.appendChild(el);
      });
      $('#modal').hidden = false;
    },
    closeModal() { $('#modal').hidden = true; },
    confirm(title, msg, onYes) {
      this.modal(title, `<p>${msg}</p>`, [
        { label: 'Vazgeç' },
        { label: 'Evet', accent: true, fn: onYes },
      ]);
    },

    // ------------------------------------------------------- kat yardımcıları
    recalcElevations() {
      const p = this.app.store.project;
      let z = p.stories.length ? p.stories[0].elevation : 0;
      for (const st of p.stories) { st.elevation = z; z += st.height; }
    },

    // ------------------------------------------------------------- komutlar
    run(cmd) {
      const s = this.app.store, t = this.app.tools, v2 = this.app.v2, v3 = this.app.v3;
      const P = YC.platform;

      switch (cmd) {
        // ---- dosya
        case 'file.new':
          this.confirm('Yeni proje', 'Kaydedilmemiş değişiklikler kaybolur. Devam edilsin mi?', () => {
            s.init(YC.createProject(false));
            P.currentPath = null;
            this.fillSelects(); this.refresh(); v2.zoomExtents(); v3.fit();
            s.status('Yeni proje oluşturuldu.', 'ok');
          });
          break;
        case 'file.open':
          P.openProject().then((r) => {
            if (!r) return;
            s.init(r.project);
            this.fillSelects(); this.refresh(); v2.zoomExtents(); v3.fit();
            s.status(`Açıldı: ${r.name}`, 'ok');
          }).catch((e) => s.status(e.message, 'err'));
          break;
        case 'file.save':
        case 'file.saveAs':
          P.saveProject(s.project, cmd === 'file.saveAs').then((r) => {
            if (r.saved) { s.dirty = false; this.markDirty(); s.status('Kaydedildi' + (r.path ? ': ' + r.path : '.'), 'ok'); }
            else s.status('Kaydetme iptal edildi.', 'warn');
          });
          break;
        case 'file.png': {
          const c = $('#viewport').dataset.mode === '3d' ? $('#c3d') : $('#c2d');
          P.exportCanvasPng(c, (s.project.name || 'plan') + '.png');
          s.status('PNG dışa aktarıldı.', 'ok');
          break;
        }

        // ---- düzenle
        case 'edit.undo': s.undo(); this.refresh(); break;
        case 'edit.redo': s.redo(); this.refresh(); break;
        case 'edit.delete': t.deleteSelection(); break;
        case 'edit.selectAll': t.selectAll(); break;
        case 'edit.deselect': s.setSelection([]); break;
        case 'edit.zoomSel': {
          const sel = s.selectedElements();
          if (!sel.length) break;
          let b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
          sel.forEach((el) => {
            const eb = G().elementBounds(el); if (!eb) return;
            b.minX = Math.min(b.minX, eb.minX); b.maxX = Math.max(b.maxX, eb.maxX);
            b.minY = Math.min(b.minY, eb.minY); b.maxY = Math.max(b.maxY, eb.maxY);
          });
          v2.vp.fit(b, v2.W, v2.H, 160); v2.request(); this.updateZoom();
          break;
        }

        // ---- görünüm
        case 'view.theme': {
          const dark = document.documentElement.dataset.theme !== 'light';
          document.documentElement.dataset.theme = dark ? 'light' : 'dark';
          v2.theme = v3.theme = dark ? 'light' : 'dark';
          v2.request(); v3.request();
          break;
        }
        case 'view.zoomExtents': v2.zoomExtents(); this.updateZoom(); break;
        case 'view.plan': this.setViewMode('plan'); break;
        case 'view.split': this.setViewMode('split'); break;
        case 'view.3d': this.setViewMode('3d'); break;
        case 'v3.iso': v3.setView('iso'); break;
        case 'v3.top': v3.setView('top'); break;
        case 'v3.front': v3.setView('front'); break;
        case 'v3.left': v3.setView('left'); break;
        case 'v3.fit': v3.fit(); break;

        // ---- akslar
        case 'axis.generate': this.generateAxes(); break;
        case 'axis.columnsAtNodes': this.columnsAtNodes(); break;
        case 'axis.beamsOnAxes': this.beamsOnAxes(); break;
        case 'axis.clear':
          this.confirm('Aksları temizle', 'Bütün akslar silinecek. Elemanlar kalır. Devam?', () => {
            s.snapshot(); s.project.axesX = []; s.project.axesY = [];
            s.emit('change'); s.status('Akslar silindi.', 'ok');
          });
          break;

        // ---- katlar
        case 'story.add': this.storyAdd(); break;
        case 'story.remove': this.storyRemove(); break;
        case 'story.duplicate': this.storyDuplicate(); break;
        case 'story.copyElementsUp': this.copyElementsUp(); break;
        case 'story.renumber': this.renumberStories(); break;

        // ---- betonarme yardımcı
        case 'rc.slabFromAxes': this.slabsFromAxes(); break;

        // ---- metraj
        case 'calc.metraj': this.renderMetraj(); this.showMetrajTable(); break;
        case 'calc.csv': this.exportCsv(); break;

        case 'help.about': this.showAbout(); break;
        default: s.status('Tanımsız komut: ' + cmd, 'err');
      }
    },

    // -------------------------------------------------------- aks üreteçleri
    generateAxes() {
      const s = this.app.store, p = s.project;
      const parse = (txt) => String(txt).split(/[,;]/).map((x) => U().num(x, NaN))
        .filter((x) => Number.isFinite(x) && x > 0).map((m) => m * 100);
      const sx = parse($('#gridSpansX').value);
      const sy = parse($('#gridSpansY').value);
      if (!sx.length || !sy.length) { s.status('Açıklıkları "5, 5, 4" biçiminde girin (metre).', 'err'); return; }
      s.snapshot();
      p.axesX = []; p.axesY = [];
      let x = 0;
      p.axesX.push({ id: U().uid('ax'), name: '1', x: 0 });
      sx.forEach((d, i) => { x += d; p.axesX.push({ id: U().uid('ax'), name: String(i + 2), x: Math.round(x) }); });
      let y = 0;
      p.axesY.push({ id: U().uid('ay'), name: 'A', y: 0 });
      sy.forEach((d, i) => { y += d; p.axesY.push({ id: U().uid('ay'), name: String.fromCharCode(66 + i), y: Math.round(y) }); });
      s.emit('change');
      this.app.v2.zoomExtents(); this.app.v3.fit();
      s.status(`${p.axesX.length}×${p.axesY.length} aks oluşturuldu.`, 'ok');
    },

    columnsAtNodes() {
      const s = this.app.store, p = s.project, st = s.activeStory();
      if (!st) return;
      if (!p.axesX.length || !p.axesY.length) { s.status('Önce aks oluşturun.', 'warn'); return; }
      s.snapshot();
      const o = s.toolOpts;
      let n = 0;
      for (const ax of p.axesX) {
        for (const ay of p.axesY) {
          const dup = st.elements.some((e) => e.type === 'column' && Math.hypot(e.x - ax.x, e.y - ay.y) < 5);
          if (dup) continue;
          st.elements.push(o.colShape === 'circle'
            ? YC.make.column(st, ax.x, ay.y, o.colD, o.colD, 0, 'circle', p.settings.concrete)
            : YC.make.column(st, ax.x, ay.y, o.colB, o.colH, o.colRot, 'rect', p.settings.concrete));
          n++;
        }
      }
      s.emit('change');
      s.status(n ? `${n} kolon yerleştirildi.` : 'Tüm kesişimlerde zaten kolon var.', n ? 'ok' : 'warn');
    },

    beamsOnAxes() {
      const s = this.app.store, p = s.project, st = s.activeStory();
      if (!st) return;
      if (p.axesX.length < 2 && p.axesY.length < 2) { s.status('En az iki aks gerekir.', 'warn'); return; }
      s.snapshot();
      const o = s.toolOpts;
      const xs = p.axesX.map((a) => a.x).sort((a, b) => a - b);
      const ys = p.axesY.map((a) => a.y).sort((a, b) => a - b);
      const same = (e, x1, y1, x2, y2) =>
        (Math.hypot(e.x1 - x1, e.y1 - y1) < 5 && Math.hypot(e.x2 - x2, e.y2 - y2) < 5) ||
        (Math.hypot(e.x1 - x2, e.y1 - y2) < 5 && Math.hypot(e.x2 - x1, e.y2 - y1) < 5);
      let n = 0;
      const push = (x1, y1, x2, y2) => {
        if (st.elements.some((e) => e.type === 'beam' && same(e, x1, y1, x2, y2))) return;
        st.elements.push(YC.make.beam(st, x1, y1, x2, y2, o.beamB, o.beamH, p.settings.concrete));
        n++;
      };
      for (const y of ys) for (let i = 0; i < xs.length - 1; i++) push(xs[i], y, xs[i + 1], y);
      for (const x of xs) for (let i = 0; i < ys.length - 1; i++) push(x, ys[i], x, ys[i + 1]);
      s.emit('change');
      s.status(n ? `${n} kiriş çizildi.` : 'Yeni kiriş eklenmedi (hepsi mevcut).', n ? 'ok' : 'warn');
    },

    slabsFromAxes() {
      const s = this.app.store, p = s.project, st = s.activeStory();
      if (!st) return;
      if (p.axesX.length < 2 || p.axesY.length < 2) { s.status('En az 2×2 aks gerekir.', 'warn'); return; }
      s.snapshot();
      const xs = p.axesX.map((a) => a.x).sort((a, b) => a - b);
      const ys = p.axesY.map((a) => a.y).sort((a, b) => a - b);
      let n = 0;
      for (let i = 0; i < xs.length - 1; i++) {
        for (let j = 0; j < ys.length - 1; j++) {
          const c = { x: (xs[i] + xs[i + 1]) / 2, y: (ys[j] + ys[j + 1]) / 2 };
          if (st.elements.some((e) => e.type === 'slab' && G().pointInPolygon(c, e.pts))) continue;
          st.elements.push(YC.make.slab(st, [
            { x: xs[i], y: ys[j] }, { x: xs[i + 1], y: ys[j] },
            { x: xs[i + 1], y: ys[j + 1] }, { x: xs[i], y: ys[j + 1] },
          ], s.toolOpts.slabT, p.settings.concrete));
          n++;
        }
      }
      s.emit('change');
      s.status(n ? `${n} döşeme oluşturuldu.` : 'Boş aks gözü kalmadı.', n ? 'ok' : 'warn');
    },

    // ------------------------------------------------------------ kat komutları
    storyAdd() {
      const s = this.app.store, p = s.project;
      s.snapshot();
      const top = p.stories[p.stories.length - 1];
      const st = YC.make.story(`${p.stories.length}. Kat`, top ? top.height : 300, 0);
      p.stories.push(st);
      this.recalcElevations();
      p.activeStoryId = st.id;
      s.emit('change'); s.emit('story');
      s.status(`${st.name} eklendi.`, 'ok');
    },

    storyRemove() {
      const s = this.app.store, p = s.project, st = s.activeStory();
      if (!st) return;
      if (p.stories.length < 2) { s.status('Son kat silinemez.', 'warn'); return; }
      this.confirm('Kat sil', `<b>${esc(st.name)}</b> ve içindeki ${st.elements.length} eleman silinecek. Devam?`, () => {
        s.snapshot();
        p.stories = p.stories.filter((x) => x.id !== st.id);
        this.recalcElevations();
        p.activeStoryId = p.stories[p.stories.length - 1].id;
        s.setSelection([]);
        s.emit('change'); s.emit('story');
        s.status('Kat silindi.', 'ok');
      });
    },

    /** Kat adları hâlâ varsayılan şemada mı? ("Zemin Kat", "1. Kat", ...) */
    hasDefaultStoryNames() {
      return this.app.store.project.stories.every((st, i) =>
        i === 0 ? st.name === 'Zemin Kat' : /^\d+\. Kat$/.test(st.name));
    },

    uniqueStoryName(base) {
      const names = new Set(this.app.store.project.stories.map((x) => x.name));
      if (!names.has(base)) return base;
      let i = 2;
      while (names.has(`${base} ${i}`)) i++;
      return `${base} ${i}`;
    },

    storyDuplicate() {
      const s = this.app.store, p = s.project, st = s.activeStory();
      if (!st) return;
      s.snapshot();
      const wasDefault = this.hasDefaultStoryNames();
      const copy = U().clone(st);
      copy.id = U().uid('kat');
      copy.elements.forEach((e) => (e.id = U().uid(e.type[0])));
      const i = p.stories.indexOf(st);
      p.stories.splice(i + 1, 0, copy);
      // Kopya araya girdiği için üstteki katların adı kayar. Adlar varsayılan
      // şemadaysa tüm diziyi yeniden numaralamak doğru sonucu verir; kullanıcı
      // kendi adlarını verdiyse onlara dokunmayıp kopyayı "(kopya)" diye adlandır.
      if (wasDefault) p.stories.forEach((x, k) => (x.name = k === 0 ? 'Zemin Kat' : `${k}. Kat`));
      else copy.name = this.uniqueStoryName(`${st.name} (kopya)`);
      this.recalcElevations();
      p.activeStoryId = copy.id;
      s.emit('change'); s.emit('story');
      s.status(`${copy.name} oluşturuldu (${copy.elements.length} eleman kopyalandı).`, 'ok');
    },

    copyElementsUp() {
      const s = this.app.store, p = s.project, st = s.activeStory();
      if (!st) return;
      const i = p.stories.indexOf(st);
      if (i >= p.stories.length - 1) { s.status('Üstte kat yok — önce kat ekleyin.', 'warn'); return; }
      const up = p.stories[i + 1];
      s.snapshot();
      let n = 0;
      for (const e of st.elements) {
        const c = U().clone(e);
        c.id = U().uid(e.type[0]);
        c.name = YC.nextName(up, e.type);
        up.elements.push(c); n++;
      }
      s.emit('change');
      s.status(`${n} eleman ${up.name} katına kopyalandı.`, 'ok');
    },

    renumberStories() {
      const s = this.app.store, p = s.project;
      s.snapshot();
      p.stories.forEach((st, i) => { st.name = i === 0 ? 'Zemin Kat' : `${i}. Kat`; });
      s.emit('change'); s.emit('story');
      s.status('Kat adları yenilendi.', 'ok');
    },

    // ---------------------------------------------------------------- rapor
    showMetrajTable() {
      const p = this.app.store.project;
      const rows = p.stories.map((st) => {
        const m = YC.metraj({ stories: [st] });
        return `<tr><td>${esc(st.name)}</td><td>${m.counts.column || 0}</td><td>${m.counts.beam || 0}</td>
          <td>${m.counts.wall || 0}</td><td>${m.counts.slab || 0}</td>
          <td>${m.betonM3.toplam.toFixed(2)}</td><td>${m.dosemeAlanM2.toFixed(1)}</td></tr>`;
      }).join('');
      const tot = YC.metraj(p);
      this.modal('Metraj Tablosu', `
        <table>
          <thead><tr><th>Kat</th><th>Kolon</th><th>Kiriş</th><th>Perde</th><th>Döşeme</th>
            <th>Beton m³</th><th>Döşeme m²</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr><th>Toplam</th><th>${tot.counts.column || 0}</th><th>${tot.counts.beam || 0}</th>
            <th>${tot.counts.wall || 0}</th><th>${tot.counts.slab || 0}</th>
            <th>${tot.betonM3.toplam.toFixed(2)}</th><th>${tot.dosemeAlanM2.toFixed(1)}</th></tr></tfoot>
        </table>
        <p style="margin-top:10px;font-size:11px;color:var(--txt-dim)">
          Hacimler brüt geometriden hesaplanır; kolon-kiriş-döşeme kesişimleri iki kez sayılır.
          Bu tablo bir <b>ön metrajdır</b>, ihale/keşif belgesi değildir.</p>`);
    },

    exportCsv() {
      const p = this.app.store.project;
      const lines = ['kat;tip;ad;b_cm;h_cm;t_cm;x1_cm;y1_cm;x2_cm;y2_cm;malzeme'];
      for (const st of p.stories) {
        for (const e of st.elements) {
          const f = (v) => (v == null ? '' : String(v));
          if (e.type === 'column') lines.push([st.name, 'Kolon', e.name, e.b, e.h, '', e.x.toFixed(1), e.y.toFixed(1), '', '', e.material].map(f).join(';'));
          else if (e.type === 'beam') lines.push([st.name, 'Kiriş', e.name, e.b, e.h, '', e.x1.toFixed(1), e.y1.toFixed(1), e.x2.toFixed(1), e.y2.toFixed(1), e.material].map(f).join(';'));
          else if (e.type === 'wall') lines.push([st.name, 'Perde', e.name, '', '', e.t, e.x1.toFixed(1), e.y1.toFixed(1), e.x2.toFixed(1), e.y2.toFixed(1), e.material].map(f).join(';'));
          else if (e.type === 'slab') lines.push([st.name, 'Döşeme', e.name, '', '', e.t, '', '', '', '', e.material].map(f).join(';'));
        }
      }
      YC.platform.exportText((p.name || 'metraj') + '.csv', '﻿' + lines.join('\r\n'), 'text/csv;charset=utf-8');
      this.app.store.status('CSV dışa aktarıldı.', 'ok');
    },

    showAbout() {
      this.modal('YapıCAD hakkında — kapsam ve sınırlar', `
        <p><b>YapıCAD</b>, betonarme kalıp planı çizmek için yapılmış bağımsız bir editördür.
        ideCAD'in <i>çalışma mantığını</i> (şerit menü, aks sistemi, kat yöneticisi, yakalama,
        komut satırı) örnek alır; ideCAD ile bağlantısı yoktur, onun dosyalarını okumaz.</p>

        <h4>Yapabildikleri</h4>
        <ul>
          <li>Aks sistemi kurma (tekil aks veya açıklık listesinden dizi)</li>
          <li>Kolon (dikdörtgen/dairesel), kiriş, perde, döşeme yerleştirme</li>
          <li>Yakalama: aks kesişimi, uç nokta, orta nokta, dik izdüşüm, ızgara, orto (F8)</li>
          <li>Seçme, taşıma, kopyalama, tutamakla düzenleme, sınırsız geri alma</li>
          <li>Çok katlı model, kat çoğaltma, elemanları üst kata kopyalama</li>
          <li>3B katı model önizleme (döndür/yakınlaştır)</li>
          <li>Geometrik metraj, CSV ve PNG dışa aktarma, .ycad (JSON) proje dosyası</li>
        </ul>

        <h4>Yapamadıkları — açıkça</h4>
        <ul>
          <li><b>Statik analiz yok.</b> Sonlu eleman çözümü, kesit tesiri, deplasman hesabı yoktur.</li>
          <li><b>Yönetmelik kontrolü yok.</b> TBDY 2018 / TS 500 kontrolleri yapılmaz.</li>
          <li><b>Donatı tasarımı yok.</b> Donatı çapı, aralığı, açılımı üretilmez.</li>
          <li><b>Otomatik çizim üretimi yok.</b> Kalıp/donatı paftası, aplikasyon planı çıkmaz.</li>
          <li>Malzeme seçimleri yalnızca <i>etiket</i> olarak saklanır, hesaba girmez.</li>
        </ul>
        <p style="margin-top:10px;padding:8px;border-radius:4px;background:rgba(224,92,92,.12);border:1px solid rgba(224,92,92,.4)">
          <b>Bu program ile ruhsata esas statik proje üretilemez.</b> Çıktıları
          fikir/eskiz aşaması ve metraj tahmini içindir.</p>

        <h4>Kısayollar</h4>
        <table>
          <tr><td><code>S</code></td><td>Seç</td><td><code>K</code></td><td>Kolon</td></tr>
          <tr><td><code>B</code></td><td>Kiriş</td><td><code>P</code></td><td>Perde</td></tr>
          <tr><td><code>D</code></td><td>Döşeme</td><td><code>M</code></td><td>Ölçüm</td></tr>
          <tr><td><code>F</code></td><td>Tümünü sığdır</td><td><code>F8</code></td><td>Orto</td></tr>
          <tr><td><code>Esc</code></td><td>İptal</td><td><code>Del</code></td><td>Sil</td></tr>
          <tr><td><code>Ctrl+Z/Y</code></td><td>Geri/İleri</td><td><code>Boşluk</code></td><td>Kaydır</td></tr>
        </table>
        <p style="font-size:11px;color:var(--txt-dim);margin-top:8px">
          Komut satırına <code>kolon</code>, <code>30/60</code>, <code>500,300</code>, <code>@200,0</code> gibi girdiler yazılabilir.</p>`);
    },
  };

  YC.UI = UI;
})();
