const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { RaydiumTrader } = require('./trader');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 900,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
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

// Handle trade execution
ipcMain.handle('execute-trade', async (event, { walletKey, outputMint, inputAmount }) => {
    try {
        const trader = new RaydiumTrader(walletKey);
        const result = await trader.executeSwap(outputMint, inputAmount);
        return { success: true, result };
    } catch (error) {
        return { success: false, error: error.message };
    }
});