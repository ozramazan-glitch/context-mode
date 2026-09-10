/* YapıCAD — preload köprüsü.
 * Renderer'a yalnızca gereken dört işlem açılır; Node API'si sızdırılmaz.
 */
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('yapicad', {
  openFile: () => ipcRenderer.invoke('file:open'),
  saveFile: (payload) => ipcRenderer.invoke('file:save', payload),
  setTitle: (t) => ipcRenderer.send('app:title', t),
  setDirty: (d) => ipcRenderer.send('app:dirty', d),
  onMenu: (cb) => ipcRenderer.on('menu', (_e, cmd) => cb(cmd)),
});
