/* YapıCAD — Electron ana süreç.
 * Pencere, yerel menü ve dosya diyalogları. Renderer sürecinde Node erişimi yok;
 * dosya işlemleri IPC üzerinden buraya gelir.
 */
'use strict';

const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');

let win = null;
let dirty = false;

const FILTERS = [
  { name: 'YapıCAD Projesi', extensions: ['ycad', 'json'] },
  { name: 'Tüm dosyalar', extensions: ['*'] },
];

function createWindow() {
  win = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1100,
    minHeight: 680,
    backgroundColor: '#10141a',
    show: false,
    title: 'YapıCAD',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.once('ready-to-show', () => win.show());

  win.on('close', (e) => {
    if (!dirty) return;
    const r = dialog.showMessageBoxSync(win, {
      type: 'warning',
      buttons: ['İptal', 'Yine de kapat'],
      defaultId: 0,
      cancelId: 0,
      title: 'Kaydedilmemiş değişiklikler',
      message: 'Projede kaydedilmemiş değişiklikler var. Yine de kapatılsın mı?',
    });
    if (r === 0) e.preventDefault();
  });

  win.on('closed', () => { win = null; });

  // dış bağlantılar varsayılan tarayıcıda açılsın, uygulama penceresinde değil
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
}

const send = (cmd) => win && win.webContents.send('menu', cmd);

function buildMenu() {
  const template = [
    {
      label: 'Dosya',
      submenu: [
        { label: 'Yeni', accelerator: 'CmdOrCtrl+N', click: () => send('file.new') },
        { label: 'Aç…', accelerator: 'CmdOrCtrl+O', click: () => send('file.open') },
        { type: 'separator' },
        { label: 'Kaydet', accelerator: 'CmdOrCtrl+S', click: () => send('file.save') },
        { label: 'Farklı Kaydet…', accelerator: 'CmdOrCtrl+Shift+S', click: () => send('file.saveAs') },
        { type: 'separator' },
        { label: 'PNG olarak dışa aktar', click: () => send('file.png') },
        { label: 'Metrajı CSV olarak dışa aktar', click: () => send('calc.csv') },
        { type: 'separator' },
        { role: 'quit', label: 'Çıkış' },
      ],
    },
    {
      label: 'Düzen',
      submenu: [
        { label: 'Geri al', accelerator: 'CmdOrCtrl+Z', click: () => send('edit.undo') },
        { label: 'Yinele', accelerator: 'CmdOrCtrl+Y', click: () => send('edit.redo') },
        { type: 'separator' },
        { label: 'Tümünü seç', accelerator: 'CmdOrCtrl+A', click: () => send('edit.selectAll') },
        { label: 'Seçimi sil', accelerator: 'Delete', click: () => send('edit.delete') },
      ],
    },
    {
      label: 'Görünüm',
      submenu: [
        { label: 'Kalıp planı', click: () => send('view.plan') },
        { label: 'Bölünmüş', click: () => send('view.split') },
        { label: '3B model', click: () => send('view.3d') },
        { type: 'separator' },
        { label: 'Tümünü sığdır', accelerator: 'F', click: () => send('view.zoomExtents') },
        { label: '3B sığdır', click: () => send('v3.fit') },
        { label: 'Temayı değiştir', click: () => send('view.theme') },
        { type: 'separator' },
        { role: 'reload', label: 'Yeniden yükle' },
        { role: 'toggleDevTools', label: 'Geliştirici araçları' },
        { role: 'togglefullscreen', label: 'Tam ekran' },
      ],
    },
    {
      label: 'Model',
      submenu: [
        { label: 'Aks dizisi oluştur', click: () => send('axis.generate') },
        { label: 'Kesişimlere kolon yerleştir', click: () => send('axis.columnsAtNodes') },
        { label: 'Akslar boyunca kiriş çiz', click: () => send('axis.beamsOnAxes') },
        { label: 'Aks gözlerini döşeme ile doldur', click: () => send('rc.slabFromAxes') },
        { type: 'separator' },
        { label: 'Kat ekle', click: () => send('story.add') },
        { label: 'Katı çoğalt', click: () => send('story.duplicate') },
        { label: 'Kat sil', click: () => send('story.remove') },
      ],
    },
    {
      label: 'Yardım',
      submenu: [
        { label: 'Kapsam ve sınırlar', click: () => send('help.about') },
        { label: 'Metraj tablosu', click: () => send('calc.metraj') },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ------------------------------------------------------------------- IPC
ipcMain.handle('file:open', async () => {
  const r = await dialog.showOpenDialog(win, {
    title: 'Proje aç',
    filters: FILTERS,
    properties: ['openFile'],
  });
  if (r.canceled || !r.filePaths.length) return null;
  const p = r.filePaths[0];
  const text = await fs.readFile(p, 'utf-8');
  return { text, path: p, name: path.basename(p) };
});

ipcMain.handle('file:save', async (_e, payload) => {
  let target = payload && payload.path;
  if (!target) {
    const r = await dialog.showSaveDialog(win, {
      title: 'Projeyi kaydet',
      defaultPath: (payload && payload.defaultName) || 'proje.ycad',
      filters: FILTERS,
    });
    if (r.canceled || !r.filePath) return null;
    target = r.filePath;
  }
  await fs.writeFile(target, payload.text, 'utf-8');
  return { path: target, name: path.basename(target) };
});

ipcMain.on('app:title', (_e, t) => { if (win) win.setTitle(String(t || 'YapıCAD')); });
ipcMain.on('app:dirty', (_e, d) => { dirty = !!d; });

// ------------------------------------------------------------------ yaşam
app.whenReady().then(() => {
  buildMenu();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
