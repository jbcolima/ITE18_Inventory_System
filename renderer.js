const { ipcRenderer } = require('electron');

// DOM Elements
const productForm = document.getElementById('productForm');
const productTable = document.getElementById('inventoryTable').getElementsByTagName('tbody')[0];
const salesTable = document.getElementById('salesTable').getElementsByTagName('tbody')[0];
const searchInput = document.getElementById('searchInput');
const categorySelect = document.getElementById('category');
const categoryFilter = document.getElementById('categoryFilter');
const addCategoryBtn = document.getElementById('addCategoryBtn');
const categoryDialog = document.getElementById('categoryDialog');
const saveCategoryBtn = document.getElementById('saveCategoryBtn');
const cancelCategoryBtn = document.getElementById('cancelCategoryBtn');
const sellDialog = document.getElementById('sellDialog');
const sellQuantityInput = document.getElementById('sellQuantity');
const confirmSellBtn = document.getElementById('confirmSellBtn');
const cancelSellBtn = document.getElementById('cancelSellBtn');
const reportDateInput = document.getElementById('reportDate');
const inventoryTabBtn = document.getElementById('inventoryTabBtn');
const salesTabBtn = document.getElementById('salesTabBtn');
const inventoryTab = document.getElementById('inventoryTab');
const salesTab = document.getElementById('salesTab');

let currentProducts = [];
let selectedProductId = null;
let selectedProduct = null;

// Set default date to today
reportDateInput.valueAsDate = new Date();

// Load initial data
ipcRenderer.send('load-data');

// Tab switching
inventoryTabBtn.addEventListener('click', () => switchTab('inventory'));
salesTabBtn.addEventListener('click', () => switchTab('sales'));

function switchTab(tab) {
    if (tab === 'inventory') {
        inventoryTab.classList.add('active');
        salesTab.classList.remove('active');
        inventoryTabBtn.classList.add('active');
        salesTabBtn.classList.remove('active');
    } else {
        inventoryTab.classList.remove('active');
        salesTab.classList.add('active');
        inventoryTabBtn.classList.remove('active');
        salesTabBtn.classList.add('active');
        loadDailyReport();
    }
}

// Event Listeners
productForm.addEventListener('submit', handleProductSubmit);
searchInput.addEventListener('input', filterProducts);
categoryFilter.addEventListener('change', filterProducts);
addCategoryBtn.addEventListener('click', () => categoryDialog.style.display = 'block');
saveCategoryBtn.addEventListener('click', handleCategorySave);
cancelCategoryBtn.addEventListener('click', () => categoryDialog.style.display = 'none');
confirmSellBtn.addEventListener('click', handleSellConfirm);
cancelSellBtn.addEventListener('click', () => {
    sellDialog.style.display = 'none';
    selectedProduct = null;
});
reportDateInput.addEventListener('change', loadDailyReport);
sellQuantityInput.addEventListener('input', updateSaleSummary);

// IPC Handlers
ipcRenderer.on('data-loaded', (event, data) => {
    currentProducts = data.products;
    updateCategoryDropdowns(data.categories);
    renderProducts();
});

ipcRenderer.on('product-saved', (event, data) => {
    currentProducts = data.products;
    renderProducts();
    resetForm();
});

ipcRenderer.on('product-deleted', (event, data) => {
    currentProducts = data.products;
    renderProducts();
});

ipcRenderer.on('category-saved', (event, data) => {
    updateCategoryDropdowns(data.categories);
    categoryDialog.style.display = 'none';
    document.getElementById('newCategory').value = '';
});

ipcRenderer.on('sale-recorded', (event, data) => {
    currentProducts = data.products;
    renderProducts();
    sellDialog.style.display = 'none';
    selectedProduct = null;
    if (salesTab.classList.contains('active')) {
        loadDailyReport();
    }
});

// Handle errors
ipcRenderer.on('error', (event, message) => {
    alert(message);
});

ipcRenderer.on('daily-report-loaded', (event, { report, sales }) => {
    document.getElementById('totalSales').textContent = `P${report.totalSales.toFixed(2)}`;
    document.getElementById('totalProfit').textContent = `P${report.totalProfit.toFixed(2)}`;
    document.getElementById('totalTransactions').textContent = report.transactions;
    renderSalesHistory(sales);
});

// Functions
function handleProductSubmit(e) {
    e.preventDefault();
    const product = {
        id: document.getElementById('productId').value,
        name: document.getElementById('productName').value,
        category: document.getElementById('category').value,
        costPrice: parseFloat(document.getElementById('costPrice').value),
        sellingPrice: parseFloat(document.getElementById('sellingPrice').value),
        quantity: parseInt(document.getElementById('quantity').value),
        lowStockAlert: parseInt(document.getElementById('lowStockAlert').value)
    };
    ipcRenderer.send('save-product', product);
}

function handleCategorySave() {
    const newCategory = document.getElementById('newCategory').value.trim();
    if (newCategory) {
        ipcRenderer.send('save-category', newCategory);
    }
}

function handleSellConfirm() {
    const quantity = parseInt(sellQuantityInput.value);
    if (!selectedProduct || quantity <= 0 || quantity > selectedProduct.quantity) {
        alert('Invalid quantity!');
        return;
    }

    const sale = {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        quantity: quantity,
        unitPrice: selectedProduct.sellingPrice,
        totalAmount: quantity * selectedProduct.sellingPrice,
        profit: quantity * (selectedProduct.sellingPrice - selectedProduct.costPrice)
    };

    ipcRenderer.send('record-sale', sale);
}

function updateCategoryDropdowns(categories) {
    categorySelect.innerHTML = '<option value="">Select Category</option>';
    categoryFilter.innerHTML = '<option value="">All Categories</option>';
    
    categories.forEach(category => {
        categorySelect.add(new Option(category, category));
        categoryFilter.add(new Option(category, category));
    });
}

function renderProducts() {
    productTable.innerHTML = '';
    const searchTerm = searchInput.value.toLowerCase();
    const categoryFilterValue = categoryFilter.value;
    
    const filteredProducts = currentProducts.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm);
        const matchesCategory = !categoryFilterValue || product.category === categoryFilterValue;
        return matchesSearch && matchesCategory;
    });

    filteredProducts.forEach(product => {
        const row = productTable.insertRow();
        if (product.quantity <= product.lowStockAlert) {
            row.classList.add('low-stock');
        }
        
        row.innerHTML = `
            <td>${product.name}</td>
            <td>${product.category}</td>
            <td>P${product.costPrice.toFixed(2)}</td>
            <td>P${product.sellingPrice.toFixed(2)}</td>
            <td>${product.quantity}</td>
            <td>${product.quantity === 0 ? 'Out of Stock' : product.quantity <= product.lowStockAlert ? 'Low Stock' : 'In Stock'}</td>
            <td class="action-buttons">
                <button class="hamburger-btn" onclick="toggleActionMenu('${product.id}')">
                    <i class="fa-solid fa-bars"></i>
                </button>
                <div class="action-menu" id="menu-${product.id}">
                    <button class="edit-btn" onclick="editProduct('${product.id}')">Edit</button>
                    <button class="sell-btn" onclick="sellProduct('${product.id}')">Sell</button>
                    <button class="delete-btn" onclick="deleteProduct('${product.id}')">Delete</button>
                </div>
            </td>
        `;
    });
}

function renderSalesHistory(sales) {
    salesTable.innerHTML = '';
    sales.forEach(sale => {
        const row = salesTable.insertRow();
        const date = new Date(sale.timestamp);
        const time = date.toLocaleTimeString();
        
        row.innerHTML = `
            <td>${time}</td>
            <td>${sale.productName}</td>
            <td>${sale.quantity}</td>
            <td>P${sale.unitPrice.toFixed(2)}</td>
            <td>P${sale.totalAmount.toFixed(2)}</td>
            <td>P${sale.profit.toFixed(2)}</td>
        `;
    });
}

function filterProducts() {
    renderProducts();
}

function editProduct(id) {
    const product = currentProducts.find(p => p.id === id);
    if (product) {
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name;
        document.getElementById('category').value = product.category;
        document.getElementById('costPrice').value = product.costPrice;
        document.getElementById('sellingPrice').value = product.sellingPrice;
        document.getElementById('quantity').value = product.quantity;
        document.getElementById('lowStockAlert').value = product.lowStockAlert;
    }
}

function sellProduct(id) {
    selectedProduct = currentProducts.find(p => p.id === id);
    if (selectedProduct) {
        sellQuantityInput.value = '1';
        sellQuantityInput.max = selectedProduct.quantity;
        updateSaleSummary();
        sellDialog.style.display = 'block';
    }
}

function updateSaleSummary() {
    if (!selectedProduct) return;
    
    const quantity = parseInt(sellQuantityInput.value) || 0;
    const totalAmount = quantity * selectedProduct.sellingPrice;
    const profit = quantity * (selectedProduct.sellingPrice - selectedProduct.costPrice);
    
    document.getElementById('unitPrice').textContent = `P${selectedProduct.sellingPrice.toFixed(2)}`;
    document.getElementById('totalAmount').textContent = `P${totalAmount.toFixed(2)}`;
    document.getElementById('saleProfit').textContent = `P${profit.toFixed(2)}`;
}

function deleteProduct(id) {
    if (confirm('Are you sure you want to delete this product?')) {
        ipcRenderer.send('delete-product', id);
    }
}

function loadDailyReport() {
    const date = reportDateInput.value;
    ipcRenderer.send('get-daily-report', date);
}

function toggleActionMenu(productId) {
    // Close all other menus first
    const allMenus = document.querySelectorAll('.action-menu');
    allMenus.forEach(menu => {
        if (menu.id !== `menu-${productId}`) {
            menu.classList.remove('show');
        }
    });
    
    // Toggle the current menu
    const menu = document.getElementById(`menu-${productId}`);
    menu.classList.toggle('show');
}

// Close menus when clicking outside
document.addEventListener('click', function(event) {
    if (!event.target.closest('.action-buttons')) {
        const allMenus = document.querySelectorAll('.action-menu');
        allMenus.forEach(menu => {
            menu.classList.remove('show');
        });
    }
});

function resetForm() {
    document.getElementById('productId').value = '';
    productForm.reset();
}