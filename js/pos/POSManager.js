/**
 * POS Manager - Core POS System Functionality
 * Handles cart management, payments, and sales processing
 * Highland Fresh Dairy Cooperative Management System
 */

class POSManager {
    constructor() {
        this.cart = [];
        this.cartTotal = 0;
        this.products = [];
        
        this.init();
    }
    
    init() {
        console.log('Initializing POS Manager...');
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Payment input
        const paymentInput = document.getElementById('paymentReceived');
        if (paymentInput) {
            paymentInput.addEventListener('input', () => this.calculateChange());
            paymentInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !document.getElementById('processSaleBtn').disabled) {
                    this.processSale();
                }
            });
        }
    }
    
    setProducts(products) {
        this.products = products;
    }
    
    // Add product to cart
    addToCart(productId) {
        if (!this.products || !Array.isArray(this.products)) {
            this.showError('Products not loaded properly');
            return;
        }
        
        const product = this.products.find(p => p.product_id == productId);
        if (!product) {
            this.showError('Product not found');
            console.error('Product not found with ID:', productId, 'Available products:', this.products);
            return;
        }
        
        // Use the correct field name from the database - quantity_on_hand
        const productStock = parseInt(product.quantity_on_hand) || 0;
        
        console.log('Adding to cart - Product:', product.name, 'Stock:', productStock);
        
        if (productStock <= 0) {
            const productName = product.name || 'Product';
            this.showError(`${productName} is out of stock`);
            return;
        }

        const productId_normalized = product.product_id;
        const productName = product.name || 'Unknown Product';
        const productPrice = parseFloat(product.price || 0);

        const existingItem = this.cart.find(item => item.product_id == productId_normalized);
        if (existingItem) {
            if (existingItem.quantity >= productStock) {
                this.showError('Cannot exceed available stock');
                return;
            }
            existingItem.quantity++;
            existingItem.line_total = existingItem.quantity * existingItem.unit_price;
        } else {
            this.cart.push({
                product_id: productId_normalized,
                name: productName,
                unit_price: productPrice,
                quantity: 1,
                line_total: productPrice,
                max_stock: productStock
            });
        }
        
        this.updateCartDisplay();
        this.updateTotals();
        
        // Show success message
        this.showSuccess(`${productName} added to cart`);
    }

    // Remove from cart
    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item.product_id !== productId);
        this.updateCartDisplay();
        this.updateTotals();
    }

    // Update quantity
    updateQuantity(productId, newQuantity) {
        const item = this.cart.find(item => item.product_id === productId);
        if (!item) return;
        
        if (newQuantity <= 0) {
            this.removeFromCart(productId);
            return;
        }
        
        if (newQuantity > item.max_stock) {
            this.showError('Cannot exceed available stock');
            return;
        }
        
        item.quantity = newQuantity;
        item.line_total = item.quantity * item.unit_price;
        this.updateCartDisplay();
        this.updateTotals();
    }

    // Update cart display
    updateCartDisplay() {
        const cartItems = document.getElementById('cartItems');
        const itemCount = document.getElementById('itemCount');
        
        if (this.cart.length === 0) {
            cartItems.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-cart-x"></i>
                    <h6>Cart is Empty</h6>
                    <p>Scan barcodes or select products to add them to cart.</p>
                </div>
            `;
            itemCount.textContent = '0 items';
            return;
        }
        
        cartItems.innerHTML = this.cart.map(item => `
            <div class="cart-item">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div class="flex-grow-1">
                        <div class="fw-bold">${item.name}</div>
                        <div class="text-muted small">₱${item.unit_price.toFixed(2)} each</div>
                    </div>
                    <button class="btn btn-sm btn-outline-danger" onclick="window.posManager.removeFromCart(${item.product_id})" title="Remove item">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
                <div class="item-controls">
                    <div class="qty-controls">
                        <button class="qty-btn" onclick="window.posManager.updateQuantity(${item.product_id}, ${item.quantity - 1})">-</button>
                        <input type="number" class="qty-input" value="${item.quantity}" 
                               min="1" max="${item.max_stock}"
                               onchange="window.posManager.updateQuantity(${item.product_id}, parseInt(this.value))">
                        <button class="qty-btn" onclick="window.posManager.updateQuantity(${item.product_id}, ${item.quantity + 1})">+</button>
                    </div>
                    <div class="fw-bold" style="color: var(--hf-primary);">₱${item.line_total.toFixed(2)}</div>
                </div>
            </div>
        `).join('');
        
        itemCount.textContent = `${this.cart.reduce((sum, item) => sum + item.quantity, 0)} items`;
    }

    // Update totals
    updateTotals() {
        console.log('updateTotals called, cart length:', this.cart.length);
        
        const subtotal = this.cart.reduce((sum, item) => sum + item.line_total, 0);
        const tax = subtotal * 0.12; // 12% VAT
        const total = subtotal + tax;
        
        this.cartTotal = total;
        
        const totalsSection = document.getElementById('cartTotals');
        const processSaleBtn = document.getElementById('processSaleBtn');
        
        console.log('Elements found:', {
            totalsSection: !!totalsSection,
            processSaleBtn: !!processSaleBtn
        });
        
        // Add null checks to prevent errors
        if (!totalsSection) {
            console.error('❌ cartTotals element not found');
            return;
        }
        
        if (!processSaleBtn) {
            console.error('❌ processSaleBtn element not found');  
            return;
        }
        
        if (this.cart.length === 0) {
            console.log('Cart is empty, hiding totals');
            totalsSection.style.display = 'none';
            processSaleBtn.disabled = true;
            return;
        }
        
        console.log('Showing totals, subtotal:', subtotal, 'tax:', tax, 'total:', total);
        totalsSection.style.display = 'block';
        
        // Add null checks for total elements
        const subtotalEl = document.getElementById('subtotal');
        const discountEl = document.getElementById('discount');
        const taxEl = document.getElementById('tax');
        const finalTotalEl = document.getElementById('finalTotal');
        
        console.log('Total elements found:', {
            subtotalEl: !!subtotalEl,
            discountEl: !!discountEl,
            taxEl: !!taxEl, 
            finalTotalEl: !!finalTotalEl
        });
        
        if (subtotalEl) subtotalEl.textContent = `₱${subtotal.toFixed(2)}`;
        if (discountEl) discountEl.textContent = '₱0.00';
        if (taxEl) taxEl.textContent = `₱${tax.toFixed(2)}`;
        if (finalTotalEl) finalTotalEl.textContent = `₱${total.toFixed(2)}`;
        
        processSaleBtn.disabled = false;
        this.calculateChange();
    }

    // Calculate change
    calculateChange() {
        const paymentInput = document.getElementById('paymentReceived');
        const changeSection = document.getElementById('changeSection');
        const changeAmount = document.getElementById('changeAmount');
        
        // Add null checks
        if (!paymentInput || !changeSection || !changeAmount) {
            console.warn('Payment elements not found:', {
                paymentInput: !!paymentInput,
                changeSection: !!changeSection,
                changeAmount: !!changeAmount
            });
            return;
        }
        
        const payment = parseFloat(paymentInput.value) || 0;
        const change = payment - this.cartTotal;
        
        if (this.cart.length === 0) {
            changeSection.style.display = 'none';
            return;
        }
        
        if (payment > 0) {
            changeSection.style.display = 'block';
            if (change >= 0) {
                changeAmount.textContent = `₱${change.toFixed(2)}`;
                changeAmount.parentElement.className = 'alert alert-success text-center';
                changeAmount.parentElement.innerHTML = `<strong>Change: ${changeAmount.textContent}</strong>`;
            } else {
                changeAmount.textContent = `₱${Math.abs(change).toFixed(2)}`;
                changeAmount.parentElement.className = 'alert alert-warning text-center';
                changeAmount.parentElement.innerHTML = `<strong>Remaining: ${changeAmount.textContent}</strong>`;
            }
        } else {
            changeSection.style.display = 'none';
        }
    }

    // Quick payment functions
    setExactPayment() {
        const paymentInput = document.getElementById('paymentReceived');
        if (!paymentInput) {
            console.error('Payment input not found');
            return;
        }
        paymentInput.value = this.cartTotal.toFixed(2);
        this.calculateChange();
    }

    addToPayment(amount) {
        const paymentInput = document.getElementById('paymentReceived');
        if (!paymentInput) {
            console.error('Payment input not found');
            return;
        }
        const current = parseFloat(paymentInput.value) || 0;
        paymentInput.value = (current + amount).toFixed(2);
        this.calculateChange();
    }

    // Process sale
    async processSale() {
        if (this.cart.length === 0) {
            this.showError('Cart is empty');
            return;
        }
        
        const payment = parseFloat(document.getElementById('paymentReceived').value) || 0;
        if (payment < this.cartTotal) {
            this.showError('Insufficient payment');
            return;
        }
        
        const processSaleBtn = document.getElementById('processSaleBtn');
        processSaleBtn.disabled = true;
        processSaleBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Processing Sale...';
        
        try {
            const saleData = {
                items: this.cart.map(item => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    unit_price: item.unit_price
                })),
                payment_received: payment,
                notes: 'Walk-in POS Sale'
            };
            
            const response = await axios.post('../api/SalesAPI.php', saleData, {
                headers: { 'Content-Type': 'application/json' },
                withCredentials: true
            });
            
            const result = response.data;
            
            if (result.success) {
                this.showSuccess('Sale completed successfully!');
                
                // Show receipt
                this.showReceipt(result.sale || result.data, payment);
                
                // Clear cart
                this.clearCart();
            } else {
                this.showError('Sale failed: ' + (result.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Sale error:', error);
            this.showError('Sale processing failed. Please try again.');
        } finally {
            processSaleBtn.disabled = false;
            processSaleBtn.innerHTML = '<i class="bi bi-check-circle-fill me-2"></i>Process Sale';
        }
    }

    // Clear cart
    clearCart() {
        this.cart = [];
        this.updateCartDisplay();
        this.updateTotals();
        
        const paymentInput = document.getElementById('paymentReceived');
        const barcodeInput = document.getElementById('barcodeInput');
        
        if (paymentInput) paymentInput.value = '';
        if (barcodeInput) barcodeInput.focus();
    }

    // Show receipt
    showReceipt(sale, payment) {
        const modal = new bootstrap.Modal(document.getElementById('receiptModal'));
        const receiptContent = document.getElementById('receiptContent');
        
        const change = payment - this.cartTotal;
        const saleId = sale ? (sale.id || sale.sale_id || 'N/A') : 'N/A';
        
        receiptContent.innerHTML = `
            <div class="text-center mb-3">
                <h5 style="color: var(--hf-primary);">Highland Fresh</h5>
                <small>Dairy Products</small>
                <hr>
            </div>
            
            <div class="mb-3">
                <strong>Sale #:</strong> ${saleId}<br>
                <strong>Date:</strong> ${new Date().toLocaleDateString()}<br>
                <strong>Time:</strong> ${new Date().toLocaleTimeString()}<br>
                <strong>Processed By:</strong> ${document.getElementById('currentUser').textContent}
            </div>
            
            <hr>
            
            <div class="mb-3">
                ${this.cart.map(item => `
                    <div class="d-flex justify-content-between">
                        <span>${item.name}</span>
                        <span>₱${item.line_total.toFixed(2)}</span>
                    </div>
                    <div class="text-muted small mb-1">
                        ${item.quantity} x ₱${item.unit_price.toFixed(2)}
                    </div>
                `).join('')}
            </div>
            
            <hr>
            
            <div class="d-flex justify-content-between mb-1">
                <strong>Total:</strong>
                <strong>₱${this.cartTotal.toFixed(2)}</strong>
            </div>
            <div class="d-flex justify-content-between mb-1">
                <span>Payment:</span>
                <span>₱${payment.toFixed(2)}</span>
            </div>
            <div class="d-flex justify-content-between">
                <span>Change:</span>
                <span>₱${change.toFixed(2)}</span>
            </div>
            
            <div class="text-center mt-3">
                <small class="text-muted">Thank you for choosing Highland Fresh!</small>
            </div>
        `;
        
        modal.show();
    }

    // Utility functions
    showSuccess(message) {
        this.showStatus(message, 'success');
    }

    showError(message) {
        this.showStatus(message, 'error');
    }

    showStatus(message, type) {
        const statusMessage = document.getElementById('statusMessage');
        const alertDiv = statusMessage.querySelector('.alert');
        
        alertDiv.className = `alert alert-${type === 'error' ? 'danger' : 'success'} alert-dismissible fade show`;
        document.getElementById('statusText').textContent = message;
        statusMessage.style.display = 'block';
        
        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, 3000);
    }

    holdTransaction() {
        this.showError('Hold transaction feature not yet implemented');
    }

    printReceipt() {
        window.print();
    }
}

// Global functions for HTML onclick handlers
function addToCart(productId) {
    if (window.posManager) {
        window.posManager.addToCart(productId);
    }
}

function setExactPayment() {
    if (window.posManager) {
        window.posManager.setExactPayment();
    }
}

function addToPayment(amount) {
    if (window.posManager) {
        window.posManager.addToPayment(amount);
    }
}

function processSale() {
    if (window.posManager) {
        window.posManager.processSale();
    }
}

function clearCart() {
    if (window.posManager) {
        if (confirm('Clear cart?')) {
            window.posManager.clearCart();
        }
    }
}

function holdTransaction() {
    if (window.posManager) {
        window.posManager.holdTransaction();
    }
}

function printReceipt() {
    if (window.posManager) {
        window.posManager.printReceipt();
    }
}

function hideStatus() {
    document.getElementById('statusMessage').style.display = 'none';
}
