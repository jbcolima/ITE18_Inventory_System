# Sari-Sari Store Inventory System

A desktop application for managing inventory in a Sari-Sari store built with Electron.js.

## Features

### Tier 1: Essential Features
- ✅ Add, edit, and delete products
- ✅ Search and filter products by name
- ✅ Category management
- ✅ Low stock alerts
- ✅ Product categorization

### Tier 2: Business Tools
- ✅ Simple Point of Sale (POS) functionality
- ✅ Cost and selling price tracking
- ✅ Basic profit calculation

## Installation

The easiest way to get started is by downloading the executable file:
1. Navigate to the Releases section of this repository.
2. Download the latest .exe file for Windows.
3. Run the installer to set up the application on your desktop.

_(For developers who wish to run from source, please see the previous version of the README or contact the contributor.)_

## Running the Application

To start the application, run:
```bash
npm start
```

_(This command is for running from source for developers.)_

## Usage

1. **Adding Products**
   - Fill out the form on the left side
   - Enter product details including name, category, prices, and quantity
   - Click "Save Product"

2. **Managing Categories**
   - Click "Add New Category" button
   - Enter category name in the dialog
   - Click "Save"

3. **Searching Products**
   - Use the search bar at the top
   - Filter by category using the dropdown

4. **Selling Products**
   - Click the "Sell" button next to a product
   - Enter the quantity to sell
   - Confirm the sale

5. **Low Stock Alerts**
   - Products below their alert level are highlighted
   - Set custom alert levels for each product

## Data Storage

The application stores data locally in a JSON file in the user's application data directory.

## Contributing

Feel free to submit issues and enhancement requests.
