const { ipcRenderer } = require('electron');

// DOM Elements
const productForm = document.getElementById('productForm');
const productTable = document.getElementById('inventoryTable').getElementsByTagName('tbody')[0];
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

let currentProducts = [];
let selectedProductId = null;

// Load initial data
ipcRenderer.send('load-data');

// Event Listeners
productForm.addEventListener('submit', handleProductSubmit);
searchInput.addEventListener('input', filterProducts);
categoryFilter.addEventListener('change', filterProducts);
addCategoryBtn.addEventListener('click', () => categoryDialog.style.display = 'block');
saveCategoryBtn.addEventListener('click', handleCategorySave);
cancelCategoryBtn.addEventListener('click', () => categoryDialog.style.display = 'none');
confirmSellBtn.addEventListener('click', handleSellConfirm);
cancelSellBtn.addEventListener('click', () => sellDialog.style.display = 'none');

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
    const product = currentProducts.find(p => p.id === selectedProductId);
    
    if (quantity > 0 && quantity <= product.quantity) {
        product.quantity -= quantity;
        ipcRenderer.send('save-product', product);
        sellDialog.style.display = 'none';
        sellQuantityInput.value = '';
    } else {
        alert('Invalid quantity!');
    }
}

function updateCategoryDropdowns(categories) {
    // Update add/edit form category dropdown
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
            <td>${product.quantity <= product.lowStockAlert ? 'Low Stock!' : 'In Stock'}</td>
            <td class="action-buttons">
                <button class="edit-btn" onclick="editProduct('${product.id}')">Edit</button>
                <button class="sell-btn" onclick="sellProduct('${product.id}')">Sell</button>
                <button class="delete-btn" onclick="deleteProduct('${product.id}')">Delete</button>
            </td>
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
    selectedProductId = id;
    sellDialog.style.display = 'block';
}

function deleteProduct(id) {
    if (confirm('Are you sure you want to delete this product?')) {
        ipcRenderer.send('delete-product', id);
    }
}

function resetForm() {
    document.getElementById('productId').value = '';
    productForm.reset();
}