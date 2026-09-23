'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  openVpd: () => ipcRenderer.invoke('dialog:openVpd'),
  openSrt: () => ipcRenderer.invoke('dialog:openSrt'),
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  saveVpdAs: (defaultPath) => ipcRenderer.invoke('dialog:saveVpdAs', defaultPath),
  runConvert: (args) => ipcRenderer.invoke('convert:run', args),
});
