const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('index.html');
    // Uncomment the following line to open DevTools by default
    // mainWindow.webContents.openDevTools();
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

// Data file path
const dataPath = path.join(app.getPath('userData'), 'inventory.json');

// Initialize data file if it doesn't exist
if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(dataPath, JSON.stringify({ products: [], categories: [] }));
}

// IPC handlers for CRUD operations
ipcMain.on('load-data', (event) => {
    const data = JSON.parse(fs.readFileSync(dataPath));
    event.reply('data-loaded', data);
});

ipcMain.on('save-product', (event, product) => {
    const data = JSON.parse(fs.readFileSync(dataPath));
    if (!product.id) {
        product.id = Date.now().toString();
        data.products.push(product);
    } else {
        const index = data.products.findIndex(p => p.id === product.id);
        if (index !== -1) {
            data.products[index] = product;
        }
    }
    fs.writeFileSync(dataPath, JSON.stringify(data));
    event.reply('product-saved', data);
});

ipcMain.on('delete-product', (event, productId) => {
    const data = JSON.parse(fs.readFileSync(dataPath));
    data.products = data.products.filter(p => p.id !== productId);
    fs.writeFileSync(dataPath, JSON.stringify(data));
    event.reply('product-deleted', data);
});

ipcMain.on('save-category', (event, category) => {
    const data = JSON.parse(fs.readFileSync(dataPath));
    if (!data.categories.includes(category)) {
        data.categories.push(category);
        fs.writeFileSync(dataPath, JSON.stringify(data));
    }
    event.reply('category-saved', data);
});