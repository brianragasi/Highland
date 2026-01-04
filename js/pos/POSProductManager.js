/**
 * POS Product Manager - Product Management and Display
 * Handles product loading, display, categorization, and barcode scanning
 * Highland Fresh Dairy Cooperative Management System
 */

class POSProductManager {
    constructor(posManager) {
        this.posManager = posManager;
        this.products = [];
        this.currentCategory = 'popular';
        
        this.init();
    }
    
    init() {
        console.log('Initializing POS Product Manager...');
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Category buttons
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentCategory = btn.dataset.category;
                this.displayProducts(this.currentCategory);
            });
        });

        // Barcode scanner
        const barcodeInput = document.getElementById('barcodeInput');
        if (barcodeInput) {
            barcodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleBarcodeInput(e.target.value.trim());
                    e.target.value = '';
                }
            });
        }
    }
    
    // Load Highland Fresh products
    async loadHighlandFreshProducts() {
        try {
            const response = await axios.get('../api/ProductsAPI.php?operation=getAllProducts', { 
                withCredentials: true 
            });
            const result = response.data;
            
            console.log('API Response:', result); // Debug log
            
            if (result.success && result.data) {
                this.products = result.data;
                console.log('✅ Loaded', this.products.length, 'Highland Fresh products');
                
                // Share products with POS Manager
                this.posManager.setProducts(this.products);
            } else {
                console.error('API Response Error:', result);
                this.products = []; // Initialize empty array
                this.showError('Failed to load Highland Fresh products: ' + (result.message || 'Unknown error'));
                return;
            }
            
            // Ensure products is an array
            if (!Array.isArray(this.products)) {
                console.error('Products is not an array:', this.products);
                this.products = [];
                this.showError('Invalid product data format received');
                return;
            }
            
            this.displayProducts(this.currentCategory);
        } catch (error) {
            console.error('Error loading products:', error);
            this.products = []; // Initialize empty array on error
            this.showError('Error loading Highland Fresh products: ' + error.message);
            this.displayProducts(this.currentCategory); // Show empty state
        }
    }

    // Display products by category
    displayProducts(category) {
        const productGrid = document.getElementById('productGrid');
        const loadingElement = document.getElementById('loadingProducts');
        const emptyElement = document.getElementById('emptyProducts');
        
        // Hide loading state
        if (loadingElement) loadingElement.style.display = 'none';
        if (emptyElement) emptyElement.style.display = 'none';
        
        // Check if products array exists and is valid
        if (!this.products || !Array.isArray(this.products)) {
            console.error('Products array is invalid:', this.products);
            if (emptyElement) emptyElement.style.display = 'block';
            return;
        }
        
        let filteredProducts = [];
        
        try {
            if (category === 'all') {
                filteredProducts = this.products;
            } else if (category === 'popular') {
                // Show most commonly sold Highland Fresh items (first 12)
                filteredProducts = this.products.slice(0, 12);
            } else {
                // Filter by category
                filteredProducts = this.products.filter(product => {
                    if (!product.category) return false;
                    return product.category.toLowerCase().includes(category.replace('-', ' '));
                });
            }
        } catch (error) {
            console.error('Error filtering products:', error);
            filteredProducts = [];
        }
        
        // Show empty state if no products found
        if (filteredProducts.length === 0) {
            if (emptyElement) {
                emptyElement.style.display = 'block';
            } else {
                productGrid.innerHTML = `
                    <div class="col-12 empty-state">
                        <i class="bi bi-basket"></i>
                        <h5>No Highland Fresh Products Found</h5>
                        <p>No products available in this category.</p>
                    </div>
                `;
            }
            return;
        }
        
        // Display products
        productGrid.innerHTML = filteredProducts.map(product => {
            const productName = product.name || 'Unknown Product';
            const productPrice = product.price || '0.00';
            
            // Use the correct field name from the database - quantity_on_hand
            let productStock = parseInt(product.quantity_on_hand) || 0;
            
            // Debug log to see the actual stock value
            console.log('Product stock for', productName, ':', {
                quantity_on_hand: product.quantity_on_hand,
                final_stock_value: productStock,
                product_object: product
            });
            
            const productId = product.product_id;
            
            // Stock status styling
            let stockClass = 'text-success';
            let stockText = `${productStock} in stock`;
            
            if (productStock <= 0) {
                stockClass = 'text-danger';
                stockText = 'Out of stock';
            } else if (productStock <= 5) {
                stockClass = 'text-warning';
                stockText = `${productStock} remaining`;
            }
            
            return `
                <div class="col-lg-3 col-md-4 col-sm-6 col-6">
                    <div class="product-card" onclick="addToCart(${productId})" data-product-id="${productId}">
                        <div class="product-image">
                            <i class="bi bi-droplet-fill"></i>
                        </div>
                        <div class="product-name">${productName}</div>
                        <div class="product-price">₱${parseFloat(productPrice).toFixed(2)}</div>
                        <div class="product-stock ${stockClass}">${stockText}</div>
                    </div>
                </div>
            `;
        }).join('');
        
        console.log(`✅ Displayed ${filteredProducts.length} products for category: ${category}`);
    }

    // Handle barcode input
    handleBarcodeInput(barcode) {
        if (!barcode) return;
        
        if (!this.products || !Array.isArray(this.products)) {
            this.showError('Products not loaded. Please wait and try again.');
            return;
        }
        
        const product = this.products.find(p => {
            const sku = p.sku || '';
            const productBarcode = p.barcode || '';
            return sku === barcode || productBarcode === barcode;
        });
        
        if (product) {
            const productId = product.product_id;
            this.posManager.addToCart(productId);
        } else {
            this.showError('Product not found. Please check barcode.');
            console.log('Barcode not found:', barcode, 'Available SKUs:', this.products.map(p => p.sku));
        }
    }
    
    // Utility methods
    showError(message) {
        if (this.posManager) {
            this.posManager.showError(message);
        } else {
            console.error(message);
        }
    }
    
    getProducts() {
        return this.products;
    }
    
    getCurrentCategory() {
        return this.currentCategory;
    }
    
    setCurrentCategory(category) {
        this.currentCategory = category;
        this.displayProducts(category);
    }
}
