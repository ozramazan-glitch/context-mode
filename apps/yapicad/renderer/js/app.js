/* YapıCAD — başlangıç. */
(function () {
  'use strict';
  const YC = window.YC;

  function boot() {
    const store = YC.Store;
    store.init(YC.createProject(false));

    const v2 = new YC.View2D(document.getElementById('c2d'), store);
    const v3 = new YC.View3D(document.getElementById('c3d'), store);
    const tools = new YC.Tools2D(v2, store);

    const app = { store, v2, v3, tools };
    window.YCAPP = app;                 // konsoldan hata ayıklama için

    YC.UI.init(app);
    YC.UI.setViewMode('split');

    // ilk yerleşim ölçüleri DOM oturduktan sonra doğru olur
    requestAnimationFrame(() => {
      v2.resize(); v3.resize();
      v2.zoomExtents(); v3.fit();
      YC.UI.updateStatus();
    });

    // pencere yeniden boyutlandırma
    let rt = 0;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => { v2.resize(); v3.resize(); }, 60);
    });

    // 3B görünüm seçimle birlikte tazelensin
    store.on('change', () => v3.request());

    // otomatik yedek (tarayıcıda localStorage, Electron'da da zararsız)
    setInterval(() => { if (store.dirty) YC.platform.autosave(store.project); }, 20000);

    // Electron ana süreç menüsünden gelen komutlar
    YC.platform.onMenu((cmd) => YC.UI.run(cmd));

    // Kaydedilmemiş değişiklik uyarısı.
    // Electron'da bunu ana süreç (main.js -> win.on('close')) yerel bir kutuyla
    // soruyor; burada da sorarsak kullanıcı iki kez uyarılır. Bu yüzden yalnızca
    // düz tarayıcıda bağlanır.
    if (!YC.platform.isElectron) {
      window.addEventListener('beforeunload', (e) => {
        if (!store.dirty) return;
        e.preventDefault();
        e.returnValue = '';
      });
    }

    store.status('Hazır. Yardım için komut satırına "yardim" yazın.', 'ok');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
