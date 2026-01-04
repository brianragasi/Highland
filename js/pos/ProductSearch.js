class ProductSearch {
    constructor(options = {}) {
        this.apiUrl = options.apiUrl || '../api/ProductsAPI.php';
        this.searchInput = options.searchInput || null;
        this.resultsContainer = options.resultsContainer || null;
        this.onProductSelect = options.onProductSelect || null;
        this.minSearchLength = options.minSearchLength || 2;
        this.searchDelay = options.searchDelay || 300;
        this.searchTimeout = null;
        this.currentResults = [];
        this.selectedIndex = -1;
        this.initialProducts = [];
        this.init();
    }

    init() {
        if (this.searchInput) {
            this.setupEventListeners();
        }
        this.loadInitialProducts();
    }

    setupEventListeners() {
        this.searchInput.addEventListener('input', (e) => {
            this.handleSearchInput(e.target.value);
        });

        this.searchInput.addEventListener('keydown', (e) => {
            this.handleKeyDown(e);
        });

        this.searchInput.addEventListener('focus', () => {
            if (this.searchInput.value === this.searchInput.placeholder) {
                this.searchInput.value = '';
            }
        });

        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleBarcodeSearch(this.searchInput.value);
            }
        });

        document.addEventListener('click', (e) => {
            if (!this.searchInput.contains(e.target) && 
                !this.resultsContainer.contains(e.target)) {
                this.hideResults();
            }
        });
    }

    handleSearchInput(searchTerm) {
        clearTimeout(this.searchTimeout);
        
        if (searchTerm.length < this.minSearchLength) {
            this.hideResults();
            return;
        }

        this.searchTimeout = setTimeout(() => {
            this.searchProducts(searchTerm);
        }, this.searchDelay);
    }

    handleKeyDown(e) {
        if (!this.currentResults.length) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectedIndex = Math.min(this.selectedIndex + 1, this.currentResults.length - 1);
                this.updateSelection();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
                this.updateSelection();
                break;
            case 'Enter':
                e.preventDefault();
                if (this.selectedIndex >= 0) {
                    this.selectProduct(this.currentResults[this.selectedIndex]);
                }
                break;
            case 'Escape':
                this.hideResults();
                break;
        }
    }

    async handleBarcodeSearch(barcode) {
        if (!barcode.trim()) return;

        try {
            const products = await this.searchProductsByBarcode(barcode);
            
            if (products.length === 1) {
                this.selectProduct(products[0]);
            } else if (products.length > 1) {
                this.displayResults(products);
            } else {
                this.searchProducts(barcode);
            }
        } catch (error) {
            console.error('Barcode search error:', error);
            this.showError('Failed to search by barcode');
        }
    }

    async searchProducts(searchTerm) {
        try {
            const response = await axios.get(this.apiUrl, {
                params: { search: searchTerm },
                headers: {
                    'Accept': 'application/json'
                },
                withCredentials: true
            });
            
            const result = response.data;
            if (result.success) {
                this.currentResults = result.data || [];
                this.displayResults(this.currentResults);
            } else {
                this.showError(result.message || 'Search failed');
            }
        } catch (error) {
            console.error('Product search error:', error);
            this.showError('Failed to search products');
        }
    }

    async searchProductsByBarcode(barcode) {
        try {
            const response = await axios.get(this.apiUrl, {
                params: { barcode: barcode },
                headers: {
                    'Accept': 'application/json'
                },
                withCredentials: true
            });
            
            const result = response.data;
            return result.success ? (result.data || []) : [];
        } catch (error) {
            console.error('Barcode search error:', error);
            return [];
        }
    }

    async loadInitialProducts() {
        try {
            const response = await axios.get(this.apiUrl, {
                params: { active: 1, limit: 20 },
                headers: {
                    'Accept': 'application/json'
                },
                withCredentials: true
            });
            
            const result = response.data;
            if (result.success) {
                this.initialProducts = result.data || [];
            }
        } catch (error) {
            console.error('Failed to load initial products:', error);
        }
    }

    displayResults(products) {
        if (!this.resultsContainer) return;

        this.selectedIndex = -1;
        
        if (products.length === 0) {
            this.resultsContainer.innerHTML = '<div class="search-no-results">No products found</div>';
            this.resultsContainer.style.display = 'block';
            return;
        }

        const resultsHtml = products.map((product, index) => `
            <div class="search-result-item" data-index="${index}">
                <div class="product-name">${product.name}</div>
                <div class="product-details">
                    <span class="product-sku">${product.sku || ''}</span>
                    <span class="product-price">$${parseFloat(product.price || 0).toFixed(2)}</span>
                </div>
            </div>
        `).join('');

        this.resultsContainer.innerHTML = resultsHtml;
        this.resultsContainer.style.display = 'block';

        // Add click listeners
        this.resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                this.selectProduct(products[index]);
            });
        });
    }

    updateSelection() {
        const items = this.resultsContainer.querySelectorAll('.search-result-item');
        items.forEach((item, index) => {
            item.classList.toggle('selected', index === this.selectedIndex);
        });
    }

    selectProduct(product) {
        if (this.onProductSelect && typeof this.onProductSelect === 'function') {
            this.onProductSelect(product);
        }
        this.hideResults();
        this.searchInput.value = '';
    }

    hideResults() {
        if (this.resultsContainer) {
            this.resultsContainer.style.display = 'none';
        }
        this.selectedIndex = -1;
    }

    showError(message) {
        if (this.resultsContainer) {
            this.resultsContainer.innerHTML = `<div class="search-error">${message}</div>`;
            this.resultsContainer.style.display = 'block';
        }
    }

    destroy() {
        this.hideResults();
        clearTimeout(this.searchTimeout);
    }
}
