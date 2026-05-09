const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('kiosk', {
  onInit: (callback) => ipcRenderer.on('init', (_event, data) => callback(data)),
  confirmQuit: () => ipcRenderer.send('quit-confirmed'),
  logError: (message) => ipcRenderer.send('log-error', message)
})
