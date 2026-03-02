import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('namouDesktop', {
  quitApp: () => ipcRenderer.send('app:quit'),
})

