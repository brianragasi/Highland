// Dispatch Order with FIFO Validation
// Highland Fresh Inventory Management System

class DispatchOrder {
    constructor() {
        this.orderId = null;
        this.orderData = null;
        this.validatedItems = new Set(); // Track which items have been validated
        this.batchAssignments = []; // Store validated batch assignments

        // Native BarcodeDetector scanner state
        this.scannerSupported = false;
        this.barcodeDetector = null;
        this.mediaStream = null;
        this.currentScanItem = null;
        this.currentScanIndex = null;
        this.isScanning = false;

        this.init();
    }

    init() {
        // Check authentication
        if (!isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }

        const user = getLoggedInUser();
        const allowedRoles = ['Admin', 'Warehouse Manager', 'Warehouse Staff'];
        if (!user || !allowedRoles.includes(user.role)) {
            alert('Unauthorized access. Warehouse Staff, Manager, or Admin required.');
            window.location.href = 'login.html';
            return;
        }

        // Get order ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        this.orderId = urlParams.get('order_id');

        if (!this.orderId) {
            this.showError('No order ID provided');
            return;
        }

        // Check if native BarcodeDetector is supported
        this.checkScannerSupport();

        // Load order for dispatch
        this.loadOrderForDispatch();
    }

    /**
     * Check if native BarcodeDetector API is available
     * This determines if we show the camera scan button or not
     */
    async checkScannerSupport() {
        if ('BarcodeDetector' in window) {
            try {
                const formats = await BarcodeDetector.getSupportedFormats();
                if (formats && formats.length > 0) {
                    this.scannerSupported = true;
                    this.barcodeDetector = new BarcodeDetector({
                        formats: ['code_128', 'code_39', 'ean_13', 'qr_code', 'upc_a']
                    });
                    console.log('✅ Native BarcodeDetector available! Supported formats:', formats);
                }
            } catch (err) {
                console.log('❌ BarcodeDetector check failed:', err);
            }
        } else {
            console.log('❌ BarcodeDetector not supported - will use manual entry only');
        }
    }

    async loadOrderForDispatch() {
        try {
            const response = await axios.get(APIResponseHandler.getApiUrl('SalesAPI.php'), {
                params: {
                    operation: 'getOrderForDispatch',
                    order_id: this.orderId
                },
                withCredentials: true
            });

            if (response.data.success) {
                this.orderData = response.data.data;
                this.displayOrder();
            } else {
                throw new Error(response.data.message);
            }
        } catch (error) {
            console.error('Error loading order:', error);
            console.error('Error response data:', error.response?.data);
            console.error('Error message:', error.response?.data?.message);
            console.error('Error status:', error.response?.status);
            this.showError(error.response?.data?.message || error.message || 'Unknown error occurred');
        }
    }

    displayOrder() {
        const { order, items } = this.orderData;

        // Display user info
        const user = getLoggedInUser();
        if (user) {
            const userNameEl = document.getElementById('currentUser');
            if (userNameEl) {
                userNameEl.textContent = user.full_name || user.username || 'Staff';
            }
        }

        // Display order header
        document.getElementById('orderNumber').textContent = order.sale_number;
        document.getElementById('customerName').textContent = order.customer_name;
        document.getElementById('orderDate').textContent = this.formatDate(order.sale_date);
        document.getElementById('totalAmount').textContent = '₱' + parseFloat(order.total_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 });

        // Show order info stats
        document.getElementById('orderInfoStats').style.display = 'block';

        // Display dispatch items in TABLE (desktop)
        const tbody = document.getElementById('dispatchTableBody');
        tbody.innerHTML = '';

        items.forEach((item, index) => {
            const row = this.createItemRow(item, index);
            tbody.innerHTML += row;
        });

        // Display dispatch items in CARDS (mobile)
        const cardsContainer = document.getElementById('dispatchCards');
        if (cardsContainer) {
            cardsContainer.innerHTML = '';
            items.forEach((item, index) => {
                const card = this.createMobileCard(item, index);
                cardsContainer.innerHTML += card;
            });
        }

        // Show order content
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('orderContent').style.display = 'block';

        // Setup scanner inputs with improved UX
        this.setupScannerInputs(items);

        // Auto-focus first pending input
        this.focusFirstPendingInput();
    }

    /**
     * Setup scanner inputs with auto-detection and validation
     * Barcode scanners type very fast (< 100ms between characters)
     * We detect this vs manual typing using debounce
     */
    setupScannerInputs(items) {
        items.forEach((item, index) => {
            const input = document.getElementById(`scanner-${index}`);
            if (!input) return;

            let scanTimeout;
            let lastInputTime = 0;
            let inputBuffer = '';

            // Detect fast input (scanner) vs slow input (typing)
            input.addEventListener('input', (e) => {
                const now = Date.now();
                const timeSinceLastInput = now - lastInputTime;
                lastInputTime = now;

                // If input is coming very fast (< 100ms), it's likely a scanner
                if (timeSinceLastInput < 100 || inputBuffer === '') {
                    inputBuffer = input.value;
                }

                clearTimeout(scanTimeout);

                // Auto-validate after 150ms pause (scanner finishes, human still typing)
                scanTimeout = setTimeout(() => {
                    if (input.value.length >= 5) { // Min barcode length
                        this.validateScannedBatch(item, index);
                    }
                    inputBuffer = '';
                }, 150);
            });

            // Also support Enter key for manual entry
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    clearTimeout(scanTimeout);
                    if (input.value.trim()) {
                        this.validateScannedBatch(item, index);
                    }
                }
            });

            // Tab to skip to next
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Tab' && !e.shiftKey) {
                    const nextInput = this.findNextPendingInput(index + 1);
                    if (nextInput !== -1) {
                        e.preventDefault();
                        document.getElementById(`scanner-${nextInput}`)?.focus();
                    }
                }
            });
        });
    }

    /**
     * Find next input that hasn't been validated yet
     */
    findNextPendingInput(startIndex) {
        const items = this.orderData.items;
        for (let i = startIndex; i < items.length; i++) {
            if (!this.validatedItems.has(items[i].sale_item_id)) {
                const input = document.getElementById(`scanner-${i}`);
                if (input) return i;
            }
        }
        // Wrap around to beginning
        for (let i = 0; i < startIndex; i++) {
            if (!this.validatedItems.has(items[i].sale_item_id)) {
                const input = document.getElementById(`scanner-${i}`);
                if (input) return i;
            }
        }
        return -1;
    }

    /**
     * Focus first pending scanner input
     */
    focusFirstPendingInput() {
        const firstIndex = this.findNextPendingInput(0);
        if (firstIndex !== -1) {
            setTimeout(() => {
                const input = document.getElementById(`scanner-${firstIndex}`);
                if (input) input.focus();
            }, 100);
        }
    }

    /**
     * Play audio feedback
     */
    playSound(type) {
        // Base64 encoded short sounds (works without external files)
        const sounds = {
            success: 'data:audio/wav;base64,UklGRl9vT19teleXAAAAYAAAACAAAAAgAAAABAABAAEAQB8AABBYAQABAAgAZGF0YVxvT19W',
            error: 'data:audio/wav;base64,UklGRl9vT19teleXAAAAYAAAACAAAAAgAAAABAABAAEAQB8AABBYAQABAAgAZGF0YVxvT19W'
        };

        try {
            // Use Web Audio API for reliability
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            if (type === 'success') {
                oscillator.frequency.value = 880; // A5 note - pleasant beep
                oscillator.type = 'sine';
                gainNode.gain.value = 0.3;
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.15);
            } else {
                oscillator.frequency.value = 220; // A3 note - low error tone
                oscillator.type = 'square';
                gainNode.gain.value = 0.2;
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.3);
            }
        } catch (e) {
            console.log('Audio not available');
        }
    }

    createItemRow(item, index) {
        const isValidated = this.validatedItems.has(item.sale_item_id);
        const rowClass = isValidated ? 'validated' : '';

        let batchDisplay = '';
        let scannerDisplay = '';
        let statusDisplay = '';

        if (item.fifo_status === 'NO_BATCH_AVAILABLE') {
            batchDisplay = '<span class="text-danger"><i class="bi bi-exclamation-triangle me-1"></i>No batches available</span>';
            scannerDisplay = '<em class="text-muted">Cannot dispatch</em>';
            statusDisplay = '<span class="status-badge bg-danger text-white">Unavailable</span>';
        } else if (item.fifo_status === 'INSUFFICIENT_QUANTITY') {
            batchDisplay = `
                <span class="batch-code">${item.required_batch_number}</span>
                <div class="batch-info text-danger">
                    <i class="bi bi-exclamation-triangle me-1"></i>Insufficient: ${item.batch_available_quantity}/${item.quantity_needed}
                </div>
            `;
            scannerDisplay = '<em class="text-muted">Insufficient stock</em>';
            statusDisplay = '<span class="status-badge bg-warning text-dark">Low Stock</span>';
        } else {
            batchDisplay = `
                <span class="batch-code">${item.required_batch_number}</span>
                <div class="batch-info">
                    Produced: ${this.formatDate(item.batch_production_date)}<br>
                    Available: ${item.batch_available_quantity} units
                </div>
            `;

            if (isValidated) {
                scannerDisplay = `<span class="text-success"><i class="bi bi-check-circle me-1"></i>Validated</span>`;
                statusDisplay = '<span class="status-badge status-validated"><i class="bi bi-check-circle"></i>Validated</span>';
            } else {
                // Scanner button only shown if native BarcodeDetector is available
                const scanButton = this.scannerSupported
                    ? `<button class="btn btn-primary btn-sm" onclick="window.dispatchOrderManager.startNativeScanner(${JSON.stringify(item).replace(/"/g, '&quot;')}, ${index})" title="Scan with camera">
                            <i class="bi bi-camera-fill"></i>
                       </button>`
                    : ''; // Hidden if not supported

                scannerDisplay = `
                    <div class="d-flex gap-2 align-items-start">
                        <div class="flex-grow-1">
                            <div class="input-group input-group-sm">
                                <input type="text" 
                                       class="form-control scanner-input" 
                                       id="scanner-${index}" 
                                       placeholder="Scan or type batch code"
                                       autocomplete="off">
                                <button class="btn btn-success btn-sm" onclick="window.dispatchOrderManager.validateScannedBatch(${JSON.stringify(item).replace(/"/g, '&quot;')}, ${index})" title="Validate">
                                    <i class="bi bi-check-lg"></i>
                                </button>
                            </div>
                        </div>
                        ${scanButton}
                    </div>
                    <div id="validation-result-${index}"></div>
                `;
                statusDisplay = '<span class="status-badge status-pending"><i class="bi bi-clock"></i>Pending</span>';
            }
        }

        return `
            <tr class="${rowClass}" id="row-${index}">
                <td>
                    <strong>${item.product_name}</strong>
                    <div class="batch-info">SKU: ${item.sku}</div>
                </td>
                <td>${batchDisplay}</td>
                <td class="text-center">
                    <strong>${item.quantity_needed}</strong>
                </td>
                <td>${scannerDisplay}</td>
                <td class="text-center">${statusDisplay}</td>
            </tr>
        `;
    }

    /**
     * Create mobile card layout for an item
     */
    createMobileCard(item, index) {
        const isValidated = this.validatedItems.has(item.sale_item_id);
        const cardClass = isValidated ? 'dispatch-card validated' : 'dispatch-card';

        if (isValidated) {
            return `
                <div class="${cardClass}" id="card-${index}">
                    <div class="dispatch-card-header">
                        <div>
                            <div class="dispatch-card-product">${item.product_name}</div>
                            <div class="dispatch-card-sku">SKU: ${item.sku}</div>
                        </div>
                        <span class="dispatch-card-qty">${item.quantity_needed} units</span>
                    </div>
                    <div class="dispatch-card-status validated">
                        <i class="bi bi-check-circle me-1"></i> Validated
                    </div>
                </div>
            `;
        }

        const batchCode = item.required_batch_number || 'ANY-VALID-BATCH';

        // Scan button only shown if native BarcodeDetector is available
        const scanButton = this.scannerSupported
            ? `<button class="btn btn-scan" onclick="window.dispatchOrderManager.startNativeScanner(${JSON.stringify(item).replace(/"/g, '&quot;')}, ${index})">
                    <i class="bi bi-camera-fill"></i> Scan Barcode
               </button>`
            : ''; // Hidden on unsupported devices

        return `
            <div class="${cardClass}" id="card-${index}">
                <div class="dispatch-card-header">
                    <div>
                        <div class="dispatch-card-product">${item.product_name}</div>
                        <div class="dispatch-card-sku">SKU: ${item.sku}</div>
                    </div>
                    <span class="dispatch-card-qty">${item.quantity_needed} units</span>
                </div>
                <div class="dispatch-card-batch">FIFO: ${batchCode}</div>
                <div class="dispatch-card-meta">
                    Produced: ${item.production_date || '-'} | Available: ${item.available_quantity || '-'} units
                </div>
                <div class="dispatch-card-actions">
                    <input type="text" 
                           class="form-control scanner-input" 
                           id="scanner-${index}" 
                           placeholder="Scan or type batch code"
                           autocomplete="off">
                    ${scanButton}
                </div>
                <div id="validation-result-${index}"></div>
            </div>
        `;
    }

    async validateScannedBatch(item, index) {
        const input = document.getElementById(`scanner-${index}`);
        const scannedBatch = input.value.trim().toUpperCase();

        if (!scannedBatch) {
            alert('Please scan or enter a batch code');
            return;
        }

        try {
            const response = await axios.post(
                APIResponseHandler.getApiUrl('SalesAPI.php'),
                {
                    operation: 'validateBatchForDispatch',
                    product_id: item.product_id,
                    scanned_batch: scannedBatch
                },
                { withCredentials: true }
            );

            const resultDiv = document.getElementById(`validation-result-${index}`);

            console.log('Validation response:', response.data);

            // Extract the validation data (API wraps in {success: true, data: {...}})
            const validationData = response.data.data || response.data;
            console.log('Validation data:', validationData);
            console.log('Is valid:', validationData.valid);

            if (validationData.valid) {
                // Success - correct batch
                this.playSound('success'); // Audio feedback

                resultDiv.innerHTML = `
                    <div class="validation-message validation-success mt-2">
                        <i class="bi bi-check-circle validation-icon"></i>
                        <div>
                            <strong>✓ Correct batch!</strong>
                            <div class="small">FIFO validated successfully</div>
                        </div>
                    </div>
                `;

                // Mark as validated
                this.validatedItems.add(item.sale_item_id);

                // Store batch assignment
                this.batchAssignments.push({
                    sale_item_id: item.sale_item_id,
                    batch_id: validationData.batch_id,
                    quantity: item.quantity_needed
                });

                // Update row appearance
                const row = document.getElementById(`row-${index}`);
                row.classList.add('validated');

                // Update status cell
                const statusCell = row.querySelector('td:last-child');
                statusCell.innerHTML = '<span class="status-badge status-validated"><i class="bi bi-check-circle"></i>Validated</span>';

                // Update scanner cell
                const scannerCell = row.querySelector('td:nth-child(4)');
                scannerCell.innerHTML = '<span class="text-success"><i class="bi bi-check-circle me-1"></i>Validated</span>';

                // Auto-focus next pending input
                const nextIndex = this.findNextPendingInput(index + 1);
                if (nextIndex !== -1) {
                    setTimeout(() => {
                        const nextInput = document.getElementById(`scanner-${nextIndex}`);
                        if (nextInput) nextInput.focus();
                    }, 100);
                }

                // Check if all items validated
                this.checkAllItemsValidated();

            } else {
                // Error - wrong batch (FIFO violation)
                this.playSound('error'); // Audio alert for FIFO violation

                resultDiv.innerHTML = `
                    <div class="validation-message validation-error mt-2">
                        <i class="bi bi-x-circle validation-icon"></i>
                        <div>
                            <strong>✗ WRONG BATCH SCANNED!</strong>
                            <div class="small mt-2">
                                <strong>You scanned:</strong> <code class="text-danger">${scannedBatch}</code> ❌<br>
                                <strong>You MUST use:</strong> <code class="text-success">${validationData.correct_batch}</code> ✓<br>
                                <em class="text-muted">Produced: ${this.formatDate(validationData.correct_batch_date)}</em>
                            </div>
                            <div class="alert alert-warning mt-2 mb-0" style="font-size: 0.85rem;">
                                <strong>Action Required:</strong> Put back the product you just picked. 
                                Go to the warehouse shelf and find <strong>${item.product_name}</strong> 
                                with batch code <strong>${validationData.correct_batch}</strong>. 
                                The older batch must be used first (FIFO rule).
                            </div>
                        </div>
                    </div>
                `;

                // Clear input for retry
                input.value = '';
                input.focus();
            }

        } catch (error) {
            console.error('Validation error:', error);
            const resultDiv = document.getElementById(`validation-result-${index}`);
            if (resultDiv) {
                resultDiv.innerHTML = `
                    <div class="validation-message validation-error mt-2">
                        <i class="bi bi-exclamation-triangle validation-icon"></i>
                        <div>
                            <strong>Validation failed</strong>
                            <div class="small">${error.response?.data?.message || error.message}</div>
                        </div>
                    </div>
                `;
            } else {
                alert(`Validation error: ${error.response?.data?.message || error.message}`);
            }
        }
    }

    checkAllItemsValidated() {
        const totalItems = this.orderData.items.length;
        const validatedCount = this.validatedItems.size;

        if (validatedCount === totalItems) {
            document.getElementById('completeDispatchBtn').disabled = false;

            // Show success message
            const dispatchItemsContainer = document.getElementById('dispatchItems');
            if (dispatchItemsContainer) {
                const alert = document.createElement('div');
                alert.className = 'alert alert-success mt-4';
                alert.innerHTML = `
                    <h5><i class="bi bi-check-circle me-2"></i>All Items Validated!</h5>
                    <p class="mb-0">All ${totalItems} items have been validated with correct FIFO batches. You can now complete the dispatch.</p>
                `;
                dispatchItemsContainer.appendChild(alert);
            }
        }
    }

    async completeDispatch() {
        if (this.validatedItems.size !== this.orderData.items.length) {
            this.showNotification('All items must be validated before dispatch', 'warning');
            return;
        }

        // Show confirmation modal
        this.showConfirmationModal();
    }

    showConfirmationModal() {
        const modalHtml = `
            <div class="modal fade" id="confirmDispatchModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header bg-warning text-dark">
                            <h5 class="modal-title">
                                <i class="bi bi-exclamation-triangle me-2"></i>Confirm Dispatch
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <p class="mb-3">
                                <strong>Are you sure you want to complete dispatch for Order ${this.orderData.order.sale_number}?</strong>
                            </p>
                            <div class="alert alert-info mb-0">
                                <i class="bi bi-info-circle me-2"></i>
                                This action will:
                                <ul class="mb-0 mt-2">
                                    <li>Update inventory quantities</li>
                                    <li>Deduct from production batches</li>
                                    <li>Mark order as completed</li>
                                </ul>
                                <strong class="text-danger d-block mt-2">This action cannot be undone.</strong>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                <i class="bi bi-x-circle me-2"></i>Cancel
                            </button>
                            <button type="button" class="btn btn-success" onclick="window.dispatchOrderManager.confirmDispatch()">
                                <i class="bi bi-check-circle me-2"></i>Yes, Complete Dispatch
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if present
        const existingModal = document.getElementById('confirmDispatchModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('confirmDispatchModal'));
        modal.show();
    }

    async confirmDispatch() {
        // Hide modal
        const modalElement = document.getElementById('confirmDispatchModal');
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal.hide();

        try {
            const completeBtn = document.getElementById('completeDispatchBtn');
            if (completeBtn) {
                completeBtn.disabled = true;
                completeBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processing...';
            }

            const response = await axios.post(
                APIResponseHandler.getApiUrl('SalesAPI.php'),
                {
                    operation: 'completeDispatch',
                    order_id: this.orderId,
                    batch_assignments: this.batchAssignments
                },
                { withCredentials: true }
            );

            if (response.data.success) {
                this.showNotification('✓ Order dispatched successfully with FIFO compliance!', 'success');
                setTimeout(() => {
                    window.location.href = 'warehouse-staff-dashboard.html';
                }, 1500);
            } else {
                throw new Error(response.data.message);
            }

        } catch (error) {
            console.error('Dispatch error:', error);
            this.showNotification('Dispatch failed: ' + (error.response?.data?.message || error.message), 'error');
            const completeBtn = document.getElementById('completeDispatchBtn');
            if (completeBtn) {
                completeBtn.disabled = false;
                completeBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i>Complete Dispatch';
            }
        }
    }

    showNotification(message, type = 'info') {
        const bgClass = {
            success: 'bg-success',
            error: 'bg-danger',
            warning: 'bg-warning',
            info: 'bg-info'
        }[type] || 'bg-info';

        const textClass = type === 'warning' ? 'text-dark' : 'text-white';

        const toastHtml = `
            <div class="toast align-items-center ${textClass} ${bgClass} border-0" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body">${message}</div>
                    <button type="button" class="btn-close ${textClass === 'text-dark' ? '' : 'btn-close-white'} me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;

        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container position-fixed top-0 end-0 p-3';
            container.style.zIndex = '9999';
            document.body.appendChild(container);
        }

        container.insertAdjacentHTML('beforeend', toastHtml);
        const toastElement = container.lastElementChild;
        const toast = new bootstrap.Toast(toastElement);
        toast.show();

        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }

    showError(message) {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('errorState').style.display = 'block';
        document.getElementById('errorMessage').textContent = message;
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    /**
     * Quick fill the correct batch code (FIFO)
     * Convenience method for warehouse staff to quickly fill the expected batch
     */
    quickFillBatch(index, batchCode) {
        const input = document.getElementById(`scanner-${index}`);
        if (input && batchCode) {
            input.value = batchCode;
            input.focus();
            // Visual feedback
            input.classList.add('border-primary');
            setTimeout(() => input.classList.remove('border-primary'), 500);
            this.playSound('success');
        }
    }

    /**
     * Start native barcode scanner using BarcodeDetector API
     */
    async startNativeScanner(item, index) {
        if (!this.scannerSupported || !this.barcodeDetector) {
            alert('Camera scanning not supported on this device. Please type the batch code.');
            return;
        }

        this.currentScanItem = item;
        this.currentScanIndex = index;
        this.isScanning = true;

        const overlay = document.getElementById('cameraOverlay');
        const video = document.getElementById('scannerVideo');
        const statusMsg = document.getElementById('scanStatus');

        try {
            // Show overlay
            overlay.classList.remove('d-none');
            overlay.style.display = 'flex';
            statusMsg.textContent = 'Starting camera...';

            // Request camera (rear-facing)
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: "environment" } }
            });
            video.srcObject = this.mediaStream;

            // Wait for video to be ready
            await new Promise((resolve) => {
                video.onloadedmetadata = () => {
                    video.play();
                    resolve();
                };
            });

            statusMsg.textContent = 'Scanning... hold barcode in view';
            console.log('📷 Native scanner started');

            // Start detection loop
            this.detectLoop();

        } catch (err) {
            console.error('Camera Error:', err);
            statusMsg.textContent = 'Camera access denied or not available';
            setTimeout(() => this.stopScanner(), 2000);
        }
    }

    /**
     * Detection loop using native BarcodeDetector
     */
    async detectLoop() {
        if (!this.isScanning) return;

        const video = document.getElementById('scannerVideo');
        const statusMsg = document.getElementById('scanStatus');

        try {
            // Detect barcodes in the video frame
            const codes = await this.barcodeDetector.detect(video);

            if (codes.length > 0) {
                // Found a barcode!
                const code = codes[0].rawValue;
                console.log('✅ Barcode detected:', code, 'Format:', codes[0].format);

                // Play success sound
                this.playSound('success');

                // Fill the input field
                const input = document.getElementById(`scanner-${this.currentScanIndex}`);
                if (input) {
                    input.value = code.toUpperCase();
                }

                // Stop scanner
                this.stopScanner();

                // Auto-validate
                if (this.currentScanItem && this.currentScanIndex !== null) {
                    setTimeout(() => {
                        this.validateScannedBatch(this.currentScanItem, this.currentScanIndex);
                    }, 200);
                }

                return;
            }
        } catch (err) {
            console.error('Detection error:', err);
        }

        // Keep scanning
        if (this.isScanning) {
            requestAnimationFrame(() => this.detectLoop());
        }
    }

    /**
     * Stop the camera scanner
     */
    stopScanner() {
        this.isScanning = false;

        const overlay = document.getElementById('cameraOverlay');
        const video = document.getElementById('scannerVideo');

        // Hide overlay
        if (overlay) {
            overlay.classList.add('d-none');
            overlay.style.display = 'none';
        }

        // Stop media stream
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }

        // Clear video
        if (video) {
            video.srcObject = null;
        }

        console.log('📷 Scanner stopped');
    }
}

// Global function for button onclick
function completeDispatch() {
    if (window.dispatchOrderManager) {
        window.dispatchOrderManager.completeDispatch();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.dispatchOrderManager = new DispatchOrder();
    // Backward compatibility alias
    window.dispatchOrder = window.dispatchOrderManager;
});
