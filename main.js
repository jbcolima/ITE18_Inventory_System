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
console.log('Data file location:', dataPath);

// Helper function to ensure data file exists with proper structure
function ensureDataFile() {
    const defaultData = {
        products: [],
        categories: [],
        sales: [],
        dailyReports: []
    };

    try {
        if (!fs.existsSync(dataPath)) {
            console.log('Creating new data file...');
            fs.writeFileSync(dataPath, JSON.stringify(defaultData, null, 2));
            console.log('New data file created successfully');
            return defaultData;
        }
        console.log('Reading existing data file...');

        const data = JSON.parse(fs.readFileSync(dataPath));
        
        // Ensure all required properties exist
        if (!data.products) data.products = [];
        if (!data.categories) data.categories = [];
        if (!data.sales) data.sales = [];
        if (!data.dailyReports) data.dailyReports = [];

        return data;
    } catch (error) {
        console.error('Error reading/writing data file:', error);
        return defaultData;
    }
}

// Initialize data file
const initialData = ensureDataFile();

// IPC handlers for CRUD operations
ipcMain.on('load-data', (event) => {
    try {
        console.log('Loading data...');
        const data = ensureDataFile();
        console.log('Current data:', JSON.stringify(data, null, 2));
        event.reply('data-loaded', data);
    } catch (error) {
        console.error('Error loading data:', error);
        event.reply('error', 'Failed to load data');
    }
});

ipcMain.on('save-product', (event, product) => {
    try {
        const data = ensureDataFile();
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
    } catch (error) {
        console.error('Error saving product:', error);
        event.reply('error', 'Failed to save product');
    }
});

ipcMain.on('delete-product', (event, productId) => {
    const data = JSON.parse(fs.readFileSync(dataPath));
    data.products = data.products.filter(p => p.id !== productId);
    fs.writeFileSync(dataPath, JSON.stringify(data));
    event.reply('product-deleted', data);
});

ipcMain.on('save-category', (event, category) => {
    try {
        const data = ensureDataFile();
        if (!data.categories.includes(category)) {
            data.categories.push(category);
            fs.writeFileSync(dataPath, JSON.stringify(data));
        }
        event.reply('category-saved', data);
    } catch (error) {
        console.error('Error saving category:', error);
        event.reply('error', 'Failed to save category');
    }
});

// New handlers for sales and reports
ipcMain.on('record-sale', (event, sale) => {
    try {
        console.log('Recording sale:', sale);
        const data = ensureDataFile();
        
        // Find and validate product first
        console.log('Looking for product with ID:', sale.productId);
        console.log('Available products:', data.products);
        const productIndex = data.products.findIndex(p => p.id === sale.productId);
        if (productIndex === -1) {
            console.log('Product not found in inventory');
            event.reply('error', 'Product not found');
            return;
        }

        const product = data.products[productIndex];
        if (product.quantity < sale.quantity) {
            event.reply('error', 'Insufficient stock');
            return;
        }

        // Process the sale
        sale.id = Date.now().toString();
        sale.timestamp = new Date().toISOString();
        data.sales.push(sale);

        // Update product quantity
        product.quantity -= sale.quantity;
        data.products[productIndex] = product;

        // Update or create daily report
        const today = new Date().toISOString().split('T')[0];
        let dailyReport = data.dailyReports.find(r => r.date === today);
        
        if (!dailyReport) {
            dailyReport = {
                date: today,
                totalSales: 0,
                totalProfit: 0,
                transactions: 0
            };
            data.dailyReports.push(dailyReport);
        }

        dailyReport.totalSales += sale.totalAmount;
        dailyReport.totalProfit += sale.profit;
        dailyReport.transactions += 1;

        fs.writeFileSync(dataPath, JSON.stringify(data));
        event.reply('sale-recorded', data);
    } catch (error) {
    console.error('Error recording sale:', error.message, error.stack);
    event.reply('error', 'Failed to record sale: ' + error.message);
    }

});

ipcMain.on('get-daily-report', (event, date) => {
    try {
        const data = JSON.parse(fs.readFileSync(dataPath));
        if (!data || !data.dailyReports || !data.sales) {
            // Initialize empty data structure if missing
            data = {
                products: [],
                categories: [],
                sales: [],
                dailyReports: []
            };
            fs.writeFileSync(dataPath, JSON.stringify(data));
        }
        
        const report = data.dailyReports.find(r => r.date === date) || {
            date: date,
            totalSales: 0,
            totalProfit: 0,
            transactions: 0
        };
        const sales = data.sales.filter(s => s.timestamp.startsWith(date));
        event.reply('daily-report-loaded', { report, sales });
    } catch (error) {
        console.error('Error getting daily report:', error);
        // Send an empty report if there's an error
        event.reply('daily-report-loaded', {
            report: {
                date: date,
                totalSales: 0,
                totalProfit: 0,
                transactions: 0
            },
            sales: []
        });
    }
});