// Symulator życia w Trębaczewie - okno gry na komputer.
// Najpierw próbuje wczytać aktualną wersję z trebaczew.io (te same zapisy i aktualizacje co w przeglądarce),
// a bez internetu uruchamia kopię gry dołączoną do instalatora.
const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');
const ONLINE = 'https://trebaczew.io/gra/';
const LOCAL = path.join(__dirname, 'game', 'index.html');

function create() {
  const win = new BrowserWindow({
    width: 1366, height: 800, minWidth: 900, minHeight: 560, backgroundColor: '#0d1217', autoHideMenuBar: true,
    title: 'Symulator życia w Trębaczewie',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  Menu.setApplicationMenu(null);
  let local = false;
  const goLocal = () => { if (local) return; local = true; win.loadFile(LOCAL); };
  win.webContents.on('did-fail-load', (e, code, desc, url, isMainFrame) => { if (isMainFrame && !local) goLocal(); });
  win.loadURL(ONLINE).catch(goLocal);
  // linki poza grą (strona, zgłoszenia) otwierają się w zwykłej przeglądarce
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (/^https?:/.test(url) && !url.startsWith(ONLINE)) { e.preventDefault(); shell.openExternal(url); } });
  win.webContents.on('before-input-event', (e, input) => { if (input.type === 'keyDown' && input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); } });
}
app.whenReady().then(create);
app.on('window-all-closed', () => app.quit());
