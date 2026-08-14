// 渲染进程与主进程的桥,只暴露桌宠需要的几个通道
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pet', {
  onNotify: (cb) => ipcRenderer.on('pet-notify', (_e, payload) => cb(payload)),
  onAssets: (cb) => ipcRenderer.on('pet-assets', (_e, manifest) => cb(manifest)),
  onState: (cb) => ipcRenderer.on('pet-state', (_e, state) => cb(state)),
  drag: (dx, dy) => ipcRenderer.send('pet-drag', { dx, dy }),
  dragEnd: () => ipcRenderer.send('pet-drag-end'),
  contextMenu: () => ipcRenderer.send('pet-context'),
  hover: (over) => ipcRenderer.send('pet-hover', over),
});
