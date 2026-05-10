const { app, BrowserWindow, ipcMain, globalShortcut, powerSaveBlocker } = require('electron')
const path = require('path')
const fs = require('fs')

let win
let powerSaveId
let adminExiting = false

const DEFAULT_CONFIG = {
  adminCode: 'quitnow',
  pauseDuration: 3000,
  videosDir: './videos',
  volumeStep: 0.05,
  initialVolume: 1.0,
  pauseMessage: ''
}

function loadConfig () {
  try {
    const raw = fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8')
    return Object.assign({}, DEFAULT_CONFIG, JSON.parse(raw))
  } catch (err) {
    console.warn('config.json missing or invalid, using defaults:', err.message)
    return Object.assign({}, DEFAULT_CONFIG)
  }
}

function loadVideos (videosDir) {
  const resolved = path.isAbsolute(videosDir)
    ? videosDir
    : path.join(__dirname, videosDir)

  let files = []
  try {
    files = fs.readdirSync(resolved)
  } catch (err) {
    console.warn('Could not read videos directory:', err.message)
    return []
  }

  return files
    .filter(f => /\.(mp4|mov|webm|mkv|avi)$/i.test(f) && !f.startsWith('.'))
    .sort()
    .map(f => 'file://' + path.join(resolved, f))
}

function sendInit () {
  if (!win) return
  const config = loadConfig()
  const videos = loadVideos(config.videosDir)
  win.webContents.send('init', { videos, config })
}

function createWindow () {
  win = new BrowserWindow({
    fullscreen: true,
    kiosk: true,
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'))

  win.webContents.on('did-finish-load', sendInit)

  win.webContents.on('crashed', () => {
    console.error('Renderer crashed — reloading')
    win.reload()
  })

  win.on('unresponsive', () => {
    console.error('Renderer unresponsive — reloading')
    win.reload()
  })

  // Keep focus on the kiosk window
  win.on('blur', () => {
    if (!adminExiting) win.focus()
  })
}

function registerShortcutBlocks () {
  const blocked = [
    'CommandOrControl+Q',
    'CommandOrControl+W',
    'CommandOrControl+Tab',
    'CommandOrControl+Space',
    'CommandOrControl+H',
    'CommandOrControl+M',
    'CommandOrControl+Option+Escape',
    'CommandOrControl+Shift+3',
    'CommandOrControl+Shift+4',
    'Control+Up',
    'Control+Down',
    'F11'
  ]
  blocked.forEach(key => {
    try { globalShortcut.register(key, () => {}) } catch (_) {}
  })
}

app.whenReady().then(() => {
  powerSaveId = powerSaveBlocker.start('prevent-display-sleep')
  createWindow()
  registerShortcutBlocks()

  app.on('render-process-gone', (_event, _webContents, details) => {
    console.error('Render process gone:', details.reason, '— reloading')
    if (win) win.reload()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.on('quit-confirmed', () => {
  adminExiting = true
  if (typeof powerSaveId === 'number') powerSaveBlocker.stop(powerSaveId)
  globalShortcut.unregisterAll()
  app.quit()
})

ipcMain.on('log-error', (_event, message) => {
  console.error('[renderer]', message)
})
