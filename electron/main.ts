import { app, BrowserWindow } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distPath = path.join(__dirname, '../dist/index.html')
const isDev = !app.isPackaged
const DEV_SERVER = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:3000'
const isPortableRun = Boolean(process.env.PORTABLE_EXECUTABLE_FILE || process.env.PORTABLE_EXECUTABLE_DIR)

function createWindow() {
  const win = new BrowserWindow({
    width: 1366,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'namou',
    backgroundColor: '#F6F1E6',
    fullscreen: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  win.once('ready-to-show', () => {
    win.webContents.setZoomFactor(0.9)
    win.setFullScreen(true)
    win.show()
  })

  if (isDev) {
    const url = new URL(DEV_SERVER)
    if (isPortableRun) {
      url.searchParams.set('portableReset', '1')
    }
    win.loadURL(url.toString())
    if (process.env.OPEN_DEVTOOLS === 'true') {
      win.webContents.openDevTools({ mode: 'detach' })
    }
  } else {
    win.loadFile(distPath, {
      query: isPortableRun ? { portableReset: '1' } : undefined,
    })
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
