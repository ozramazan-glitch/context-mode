/* YapıCAD — platform katmanı.
 * Aynı arayüz hem Electron'da (native dosya diyalogları, IPC) hem de düz
 * tarayıcıda (indirme + dosya seçici + localStorage) çalışsın diye tek soyutlama.
 */
(function () {
  'use strict';
  const YC = (window.YC = window.YC || {});

  const bridge = window.yapicad || null;      // preload.js tarafından sağlanır
  const isElectron = !!bridge;
  const LS_KEY = 'yapicad.autosave.v1';

  function download(filename, content, mime) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function pickFile(accept) {
    return new Promise((resolve) => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = accept || '.ycad,.json,application/json';
      inp.onchange = () => {
        const f = inp.files && inp.files[0];
        if (!f) return resolve(null);
        const r = new FileReader();
        r.onload = () => resolve({ name: f.name, text: String(r.result), path: null });
        r.onerror = () => resolve(null);
        r.readAsText(f, 'utf-8');
      };
      inp.click();
    });
  }

  const platform = {
    isElectron,
    currentPath: null,

    /** @returns {Promise<{project:object, path:string|null, name:string}|null>} */
    async openProject() {
      let res = null;
      if (isElectron) res = await bridge.openFile();
      else res = await pickFile();
      if (!res || !res.text) return null;
      let obj;
      try { obj = JSON.parse(res.text); }
      catch (e) { throw new Error('Dosya okunamadı: geçerli JSON değil.'); }
      if (!obj || !Array.isArray(obj.stories)) throw new Error('Bu bir YapıCAD projesi değil (stories alanı yok).');
      this.currentPath = res.path || null;
      return { project: obj, path: res.path || null, name: res.name || 'proje.ycad' };
    },

    /** @returns {Promise<{path:string|null, saved:boolean}>} */
    async saveProject(project, forceAs) {
      const text = JSON.stringify(project, null, 2);
      const base = (project.name || 'proje').replace(/[^\wçğıöşüÇĞİÖŞÜ .-]/g, '_') + '.ycad';
      if (isElectron) {
        const r = await bridge.saveFile({
          text, defaultName: base,
          path: forceAs ? null : this.currentPath,
        });
        if (r && r.path) this.currentPath = r.path;
        return { path: r ? r.path : null, saved: !!(r && r.path) };
      }
      download(base, text, 'application/json');
      try { localStorage.setItem(LS_KEY, text); } catch (_) {}
      return { path: null, saved: true };
    },

    async exportText(filename, text, mime) {
      if (isElectron) {
        const r = await bridge.saveFile({ text, defaultName: filename, path: null });
        return !!(r && r.path);
      }
      download(filename, text, mime || 'text/plain;charset=utf-8');
      return true;
    },

    exportCanvasPng(canvas, filename) {
      try {
        canvas.toBlob((b) => { if (b) download(filename, b, 'image/png'); }, 'image/png');
        return true;
      } catch (e) { return false; }
    },

    autosave(project) {
      try { localStorage.setItem(LS_KEY, JSON.stringify(project)); } catch (_) {}
    },
    loadAutosave() {
      try {
        const t = localStorage.getItem(LS_KEY);
        if (!t) return null;
        const o = JSON.parse(t);
        return o && Array.isArray(o.stories) ? o : null;
      } catch (_) { return null; }
    },
    clearAutosave() { try { localStorage.removeItem(LS_KEY); } catch (_) {} },

    onMenu(cb) { if (isElectron && bridge.onMenu) bridge.onMenu(cb); },
    setTitle(t) { document.title = t; if (isElectron && bridge.setTitle) bridge.setTitle(t); },
    setDirty(d) { if (isElectron && bridge.setDirty) bridge.setDirty(!!d); },
  };

  YC.platform = platform;
})();
