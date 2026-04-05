const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const si = require('systeminformation');

function createWindow() {
    const win = new BrowserWindow({
        width: 1000,
        height: 800,
        backgroundColor: '#1a1a2e',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            // Add these to potentially help with network-related issues
            webSecurity: false,
            allowRunningInsecureContent: true
        },
        title: "Drakaina 🐉"
    });

    win.loadFile('src/index.html');
}

app.whenReady().then(() => {
    // Add speech-related command-line flags
    app.commandLine.appendSwitch('enable-speech-dispatcher');
    app.commandLine.appendSwitch('enable-media-stream');
    app.commandLine.appendSwitch('use-fake-ui-for-media-stream');

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// IPC Handler: Save Data (Now in project root)
ipcMain.on('save-data', (event, { file, data }) => {
    const filePath = path.join(__dirname, file);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    event.reply('save-data-success', { file });
});

// IPC Handler: Load Data (Now in project root)
ipcMain.on('load-data', (event, { file }) => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        event.reply('load-data-success', { file, data });
    } else {
        event.reply('load-data-success', { file, data: {} });
    }
});

// IPC Handler: System Information
ipcMain.on('get-sys-info', async (event) => {
    try {
        const cpu = await si.cpu();
        const mem = await si.mem();
        const load = await si.currentLoad();
        const temp = await si.cpuTemperature();
        const net = await si.networkStats();
        
        event.reply('sys-info-data', {
            cpu: {
                brand: cpu.brand,
                speed: cpu.speed,
                load: load.currentLoad.toFixed(1),
                temp: temp.main
            },
            mem: {
                total: (mem.total / 1024 / 1024 / 1024).toFixed(1),
                used: (mem.used / 1024 / 1024 / 1024).toFixed(1),
                percent: ((mem.used / mem.total) * 100).toFixed(1)
            },
            net: {
                rx: net[0] ? (net[0].rx_sec / 1024 / 1024).toFixed(2) : "0.00",
                tx: net[0] ? (net[0].tx_sec / 1024 / 1024).toFixed(2) : "0.00"
            }
        });
    } catch (e) {
        console.error("System Information Error:", e);
    }
});
