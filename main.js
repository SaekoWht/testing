const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'icon.png'),
    titleBarStyle: 'default',
    resizable: true,
    minimizable: true,
    maximizable: true
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  return result.filePaths[0];
});

ipcMain.handle('save-file', async (event, { folderPath, fileName, buffer, userData }) => {
  try {
    const videoPath = path.join(folderPath, fileName);
    const dataPath = path.join(folderPath, `${path.parse(fileName).name}_data.txt`);
    
    fs.writeFileSync(videoPath, Buffer.from(buffer));
    fs.writeFileSync(dataPath, userData);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});