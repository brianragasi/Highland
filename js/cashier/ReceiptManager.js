class ReceiptManager {
    constructor() {
        this.currentReceiptData = null;
        this.printStyles = `
            @media print {
                body * { visibility: hidden; }
                .receipt-content, .receipt-content * { visibility: visible; }
                .receipt-content {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                }
                .no-print { display: none !important; }
                .page-break { page-break-after: always; }
            }
        `;
    }
    static init() {
        window.receiptManager = new ReceiptManager();
        window.receiptManager.addPrintStyles();
        window.printReceipt = (saleId) => window.receiptManager.printReceipt(saleId);
    }
    addPrintStyles() {
        const style = document.createElement('style');
        style.textContent = this.printStyles;
        document.head.appendChild(style);
    }
    async printReceipt(saleId) {
        try {
            this.showPrintLoading(true);
            const response = await axios.get('../api/SalesAPI.php', {
                params: { operation: 'receipt', sale_id: saleId },
                withCredentials: true
            });
            const result = response.data;
            if (result.success) {
                this.currentReceiptData = result.data;
                this.showReceiptPreview();
            } else {
                window.transactionHistory.showError(result.message || 'Failed to load receipt data');
            }
        } catch (error) {
            console.error('Error printing receipt:', error);
            window.transactionHistory.showError('Failed to print receipt. Please try again.');
        } finally {
            this.showPrintLoading(false);
        }
    }
    showReceiptPreview() {
        const receiptData = this.currentReceiptData;
        let modal = document.getElementById('receiptPreviewModal');
        if (!modal) {
            modal = this.createReceiptPreviewModal();
        }
        const receiptHTML = this.generateReceiptHTML(receiptData);
        const receiptContent = modal.querySelector('.receipt-content');
        receiptContent.innerHTML = receiptHTML;
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }
    createReceiptPreviewModal() {
        const modal = document.createElement('div');
        modal.id = 'receiptPreviewModal';
        modal.className = 'modal fade';
        modal.tabIndex = -1;
        modal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header no-print">
                        <h5 class="modal-title">
                            <i class="bi bi-receipt"></i> Receipt Preview
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-0">
                        <div class="receipt-content p-3">
                            <!-- Receipt content will be inserted here -->
                        </div>
                    </div>
                    <div class="modal-footer no-print">
                        <button type="button" class="btn btn-primary" onclick="receiptManager.doPrint()">
                            <i class="bi bi-printer"></i> Print
                        </button>
                        <button type="button" class="btn btn-info" onclick="receiptManager.downloadPDF()">
                            <i class="bi bi-file-pdf"></i> Download PDF
                        </button>
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;
        modal.addEventListener('shown.bs.modal', function () {
            this.removeAttribute('aria-hidden');
        });
        modal.addEventListener('hidden.bs.modal', function () {
            this.setAttribute('aria-hidden', 'true');
        });
        document.body.appendChild(modal);
        return modal;
    }
    generateReceiptHTML(receiptData) {
        return `
            <div class="receipt-wrapper" style="max-width: 350px; margin: 0 auto; font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.4;">
                <!-- Header -->
                <div class="text-center mb-3">
                    <h4 class="mb-1" style="font-weight: bold;">HIGHLAND FRESH</h4>
                    <p class="mb-1" style="font-size: 11px;">Daily Products Management</p>
                    <p class="mb-1" style="font-size: 10px;">123 Fresh Street, Market District</p>
                    <p class="mb-2" style="font-size: 10px;">Tel: (02) 123-4567</p>
                    <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
                </div>
                <!-- Transaction Info -->
                <div class="mb-3">
                    <div class="row">
                        <div class="col-6" style="font-size: 11px;">
                            <strong>Receipt #:</strong><br>
                            <strong>Date:</strong><br>
                            <strong>Time:</strong><br>
                            <strong>Processed By:</strong>
                        </div>
                        <div class="col-6 text-end" style="font-size: 11px;">
                            ${receiptData.sale_number}<br>
                            ${receiptData.sale_date}<br>
                            ${receiptData.sale_time}<br>
                            ${receiptData.cashier_name}
                        </div>
                    </div>
                    ${receiptData.customer_name ? `
                        <div class="mt-2">
                            <div class="row">
                                <div class="col-6" style="font-size: 11px;"><strong>Customer:</strong></div>
                                <div class="col-6 text-end" style="font-size: 11px;">${receiptData.customer_name}</div>
                            </div>
                            ${receiptData.customer_phone ? `
                                <div class="row">
                                    <div class="col-6" style="font-size: 11px;"><strong>Phone:</strong></div>
                                    <div class="col-6 text-end" style="font-size: 11px;">${receiptData.customer_phone}</div>
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}
                    <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
                </div>
                <!-- Items -->
                <div class="mb-3">
                    <div style="font-size: 11px; font-weight: bold; margin-bottom: 5px;">ITEMS PURCHASED:</div>
                    ${receiptData.items.map(item => `
                        <div style="margin-bottom: 8px;">
                            <div style="font-size: 11px; font-weight: bold;">${item.product_name}</div>
                            <div class="d-flex justify-content-between" style="font-size: 10px;">
                                <span>SKU: ${item.product_sku}</span>
                            </div>
                            <div class="d-flex justify-content-between" style="font-size: 11px;">
                                <span>${item.quantity} x ${item.unit_price}</span>
                                <span style="font-weight: bold;">${item.line_total}</span>
                            </div>
                            ${parseFloat(item.discount_amount.replace('₱', '').replace(',', '')) > 0 ? `
                                <div class="d-flex justify-content-between" style="font-size: 10px; color: #666;">
                                    <span>Discount:</span>
                                    <span>-${item.discount_amount}</span>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                    <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
                </div>
                <!-- Totals -->
                <div class="mb-3">
                    <div class="d-flex justify-content-between" style="font-size: 11px;">
                        <span>Subtotal:</span>
                        <span>${receiptData.subtotal}</span>
                    </div>
                    ${parseFloat(receiptData.discount_amount.replace('₱', '').replace(',', '')) > 0 ? `
                        <div class="d-flex justify-content-between" style="font-size: 11px; color: #666;">
                            <span>Discount:</span>
                            <span>-${receiptData.discount_amount}</span>
                        </div>
                    ` : ''}
                    <div class="d-flex justify-content-between" style="font-size: 11px;">
                        <span>Tax ${receiptData.tax_rate}:</span>
                        <span>${receiptData.tax_amount}</span>
                    </div>
                    <div style="border-top: 1px solid #000; margin: 5px 0;"></div>
                    <div class="d-flex justify-content-between" style="font-size: 14px; font-weight: bold;">
                        <span>TOTAL:</span>
                        <span>${receiptData.total_amount}</span>
                    </div>
                    <div style="border-top: 1px solid #000; margin: 5px 0;"></div>
                </div>
                <!-- Payment Info -->
                <div class="mb-3">
                    <div class="d-flex justify-content-between" style="font-size: 11px;">
                        <span>Payment Method:</span>
                        <span>${receiptData.payment_method}</span>
                    </div>
                    <div class="d-flex justify-content-between" style="font-size: 11px;">
                        <span>Amount Paid:</span>
                        <span>${receiptData.payment_received}</span>
                    </div>
                    <div class="d-flex justify-content-between" style="font-size: 11px;">
                        <span>Change:</span>
                        <span>${receiptData.change_amount}</span>
                    </div>
                    <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
                </div>
                <!-- Footer -->
                <div class="text-center" style="font-size: 10px;">
                    <p class="mb-1">Thank you for shopping with us!</p>
                    <p class="mb-1">Visit us again soon</p>
                    <p class="mb-2">Follow us on social media @HighlandFresh</p>
                    <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
                    <p class="mb-0">This receipt serves as your proof of purchase</p>
                    <p style="font-size: 9px; margin-top: 10px;">Powered by Highland Fresh POS System</p>
                </div>
            </div>
        `;
    }
    doPrint() {
        const modalElement = document.getElementById('receiptPreviewModal');
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
            modalElement.removeAttribute('aria-hidden');
            modal.hide();
        }
        setTimeout(() => {
            window.print();
        }, 500);
    }
    downloadPDF() {
        this.doPrint();
        window.transactionHistory.showSuccess('Use your browser\'s print dialog to save as PDF');
    }
    async emailReceipt(saleId, emailAddress) {
        try {
            const response = await axios.post('../api/SalesAPI.php', {
                operation: 'email_receipt',
                sale_id: saleId,
                email: emailAddress
            }, {
                headers: {
                    'Content-Type': 'application/json',
                },
                withCredentials: true
            });
            const result = response.data;
            if (result.success) {
                window.transactionHistory.showSuccess('Receipt sent to email successfully');
            } else {
                window.transactionHistory.showError(result.message || 'Failed to send receipt');
            }
        } catch (error) {
            console.error('Error emailing receipt:', error);
            window.transactionHistory.showError('Failed to send receipt via email');
        }
    }
    showPrintLoading(show) {
        let loadingDiv = document.getElementById('printLoading');
        if (show) {
            if (!loadingDiv) {
                loadingDiv = document.createElement('div');
                loadingDiv.id = 'printLoading';
                loadingDiv.className = 'position-fixed top-50 start-50 translate-middle';
                loadingDiv.style.zIndex = '2000';
                loadingDiv.innerHTML = `
                    <div class="bg-white p-4 rounded shadow border">
                        <div class="text-center">
                            <div class="spinner-border text-primary mb-2" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <div>Preparing receipt...</div>
                        </div>
                    </div>
                `;
                document.body.appendChild(loadingDiv);
            }
            loadingDiv.style.display = 'block';
        } else {
            if (loadingDiv) {
                loadingDiv.style.display = 'none';
            }
        }
    }
    formatForThermalPrinter(receiptData) {
        const ESC = '\x1B';
        const commands = [];
        commands.push(ESC + '@'); 
        commands.push(ESC + 'a' + '\x01'); 
        commands.push(ESC + '!' + '\x18'); 
        commands.push('HIGHLAND FRESH\n');
        commands.push(ESC + '!' + '\x00'); 
        commands.push('Daily Products Management\n');
        commands.push('123 Fresh Street, Market District\n');
        commands.push('Tel: (02) 123-4567\n');
        commands.push('--------------------------------\n');
        commands.push(ESC + 'a' + '\x00'); 
        commands.push(`Receipt #: ${receiptData.sale_number}\n`);
        commands.push(`Date: ${receiptData.sale_date}\n`);
        commands.push(`Time: ${receiptData.sale_time}\n`);
        commands.push(`Processed By: ${receiptData.cashier_name}\n`);
        if (receiptData.customer_name) {
            commands.push(`Customer: ${receiptData.customer_name}\n`);
        }
        commands.push('--------------------------------\n');
        receiptData.items.forEach(item => {
            commands.push(`${item.product_name}\n`);
            commands.push(`${item.quantity} x ${item.unit_price} = ${item.line_total}\n`);
        });
        commands.push('--------------------------------\n');
        commands.push(`Subtotal: ${receiptData.subtotal}\n`);
        commands.push(`Tax: ${receiptData.tax_amount}\n`);
        commands.push(ESC + '!' + '\x08'); 
        commands.push(`TOTAL: ${receiptData.total_amount}\n`);
        commands.push(ESC + '!' + '\x00'); 
        commands.push(`Payment: ${receiptData.payment_method}\n`);
        commands.push(`Paid: ${receiptData.payment_received}\n`);
        commands.push(`Change: ${receiptData.change_amount}\n`);
        commands.push('--------------------------------\n');
        commands.push(ESC + 'a' + '\x01'); 
        commands.push('Thank you for shopping with us!\n');
        commands.push('Visit us again soon\n');
        commands.push('\x1D' + 'V' + '\x42' + '\x00');
        return commands.join('');
    }
    async sendToThermalPrinter(receiptData) {
        try {
            const printerCommands = this.formatForThermalPrinter(receiptData);
            window.transactionHistory.showSuccess('Thermal printer functionality not implemented yet');
        } catch (error) {
            console.error('Error sending to thermal printer:', error);
            window.transactionHistory.showError('Failed to print to thermal printer');
        }
    }
    async bulkPrintReceipts(saleIds) {
        if (!saleIds || saleIds.length === 0) {
            window.transactionHistory.showError('No receipts selected for printing');
            return;
        }
        this.showPrintLoading(true);
        try {
            const receiptPromises = saleIds.map(saleId => 
                axios.get('../api/SalesAPI.php', {
                    params: { operation: 'receipt', sale_id: saleId },
                    withCredentials: true
                }).then(response => response.data)
            );
            const results = await Promise.all(receiptPromises);
            const successfulReceipts = results.filter(result => result.success);
            if (successfulReceipts.length > 0) {
                const combinedHTML = successfulReceipts.map(result => 
                    this.generateReceiptHTML(result.data)
                ).join('<div class="page-break"></div>');
                this.showCombinedReceiptPreview(combinedHTML);
                window.transactionHistory.showSuccess(`${successfulReceipts.length} receipts prepared for printing`);
            } else {
                window.transactionHistory.showError('Failed to load any receipts');
            }
        } catch (error) {
            console.error('Error bulk printing receipts:', error);
            window.transactionHistory.showError('Failed to prepare receipts for bulk printing');
        } finally {
            this.showPrintLoading(false);
        }
    }
    showCombinedReceiptPreview(combinedHTML) {
        let modal = document.getElementById('bulkReceiptPreviewModal');
        if (!modal) {
            modal = this.createBulkReceiptPreviewModal();
        }
        const receiptContent = modal.querySelector('.receipt-content');
        receiptContent.innerHTML = combinedHTML;
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }
    createBulkReceiptPreviewModal() {
        const modal = document.createElement('div');
        modal.id = 'bulkReceiptPreviewModal';
        modal.className = 'modal fade';
        modal.tabIndex = -1;
        modal.innerHTML = `
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header no-print">
                        <h5 class="modal-title">
                            <i class="bi bi-files"></i> Bulk Receipt Preview
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-0" style="max-height: 70vh; overflow-y: auto;">
                        <div class="receipt-content p-3">
                            <!-- Combined receipt content will be inserted here -->
                        </div>
                    </div>
                    <div class="modal-footer no-print">
                        <button type="button" class="btn btn-primary" onclick="receiptManager.doPrint()">
                            <i class="bi bi-printer"></i> Print All
                        </button>
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;
        modal.addEventListener('shown.bs.modal', function () {
            this.removeAttribute('aria-hidden');
        });
        modal.addEventListener('hidden.bs.modal', function () {
            this.setAttribute('aria-hidden', 'true');
        });
        document.body.appendChild(modal);
        return modal;
    }
}
document.addEventListener('DOMContentLoaded', function() {
    ReceiptManager.init();
});
window.ReceiptManager = ReceiptManager;