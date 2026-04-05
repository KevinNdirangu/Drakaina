const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
    const win = new BrowserWindow({
        width: 1000,
        height: 800,
        backgroundColor: '#1a1a2e',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        title: "Drakaina 🐉"
    });

    win.loadFile('src/index.html');
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// IPC Handler: Save Data
ipcMain.on('save-data', (event, { file, data }) => {
    const filePath = path.join(app.getPath('userData'), file);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    event.reply('save-data-success', { file });
});

// IPC Handler: Load Data
ipcMain.on('load-data', (event, { file }) => {
    const filePath = path.join(app.getPath('userData'), file);
    if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        event.reply('load-data-success', { file, data });
    } else {
        event.reply('load-data-success', { file, data: {} });
    }
});
