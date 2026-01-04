/**
 * Highland Fresh - FIFO Material Issuance JavaScript
 * Handles FIFO-enforced material issuance for warehouse staff
 * 
 * Features:
 * - FIFO batch selection (oldest first)
 * - Batch code validation
 * - Step-by-step picking guidance
 * - Traceability recording
 * 
 * Date: December 2, 2025
 */

// ============================================================================
// GLOBAL STATE
// ============================================================================

let currentRequest = {
    rawMaterialId: null,
    rawMaterialName: '',
    quantityNeeded: 0,
    unitName: '',
    pickInstructions: [],
    validatedSteps: [],
    productionReference: '',
    notes: ''
};

let rawMaterialsData = [];

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    if (typeof checkAuth === 'function') {
        checkAuth();
    }
    
    // Load user info
    loadUserInfo();
    
    // Load raw materials for dropdown
    loadRawMaterials();
    
    // Load recent issuances
    loadRecentIssuances();
    
    // Setup event listeners
    setupEventListeners();
});

function loadUserInfo() {
    const userData = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
    if (userData.name) {
        document.getElementById('currentUser').textContent = userData.name;
    }
}

function setupEventListeners() {
    // Material request form
    document.getElementById('materialRequestForm').addEventListener('submit', handleMaterialRequest);
    
    // Raw material select change
    document.getElementById('rawMaterialSelect').addEventListener('change', handleMaterialSelectChange);
    
    // Confirm issuance button
    document.getElementById('confirmIssuanceBtn').addEventListener('click', showConfirmationModal);
    
    // Final confirm button in modal
    document.getElementById('finalConfirmBtn').addEventListener('click', confirmIssuance);
    
    // Cancel button
    document.getElementById('cancelIssuanceBtn').addEventListener('click', cancelIssuance);
    
    // Print summary
    document.getElementById('printSummaryBtn').addEventListener('click', printSummary);
}

// ============================================================================
// DATA LOADING
// ============================================================================

async function loadRawMaterials() {
    try {
        const response = await axios.get('../api/RawMaterialsAPI.php?action=get_raw_materials');
        
        if (response.data.success) {
            rawMaterialsData = response.data.data || response.data.raw_materials || [];
            populateRawMaterialsDropdown();
        } else {
            console.error('Failed to load raw materials:', response.data.message);
            showToast('Failed to load raw materials', 'error');
        }
    } catch (error) {
        console.error('Error loading raw materials:', error);
        showToast('Error loading raw materials', 'error');
    }
}

function populateRawMaterialsDropdown() {
    const select = document.getElementById('rawMaterialSelect');
    select.innerHTML = '<option value="">Select raw material...</option>';
    
    rawMaterialsData.forEach(material => {
        const option = document.createElement('option');
        option.value = material.raw_material_id;
        option.textContent = `${material.name} (Stock: ${material.quantity_on_hand || 0} ${material.unit_name || ''})`;
        option.dataset.unit = material.unit_name || '';
        option.dataset.stock = material.quantity_on_hand || 0;
        select.appendChild(option);
    });
}

function handleMaterialSelectChange(e) {
    const selectedOption = e.target.options[e.target.selectedIndex];
    const unitDisplay = document.getElementById('unitDisplay');
    
    if (selectedOption.value) {
        unitDisplay.value = selectedOption.dataset.unit || 'Units';
    } else {
        unitDisplay.value = '';
    }
}

async function loadRecentIssuances() {
    try {
        const response = await axios.get('../api/RawMaterialInventoryAPI.php?action=getRecentConsumptions');
        
        const tbody = document.querySelector('#recentIssuancesTable tbody');
        
        if (response.data.success && response.data.data && response.data.data.length > 0) {
            tbody.innerHTML = '';
            response.data.data.forEach(issuance => {
                tbody.innerHTML += `
                    <tr>
                        <td>${formatDateTime(issuance.consumption_date)}</td>
                        <td>${issuance.raw_material_name || 'N/A'}</td>
                        <td>${issuance.quantity_consumed} ${issuance.unit_name || ''}</td>
                        <td><span class="batch-code">${issuance.highland_fresh_batch_code}</span></td>
                        <td>${issuance.production_batch_number || '-'}</td>
                        <td>${issuance.consumed_by_name || 'System'}</td>
                    </tr>
                `;
            });
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted">No recent issuances found</td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('Error loading recent issuances:', error);
        const tbody = document.querySelector('#recentIssuancesTable tbody');
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">Unable to load recent issuances</td>
            </tr>
        `;
    }
}

// ============================================================================
// FIFO PICK INSTRUCTIONS
// ============================================================================

async function handleMaterialRequest(e) {
    e.preventDefault();
    
    const rawMaterialId = document.getElementById('rawMaterialSelect').value;
    const quantityNeeded = parseFloat(document.getElementById('quantityNeeded').value);
    const selectedOption = document.getElementById('rawMaterialSelect').options[
        document.getElementById('rawMaterialSelect').selectedIndex
    ];
    
    if (!rawMaterialId || !quantityNeeded || quantityNeeded <= 0) {
        showToast('Please select a material and enter a valid quantity', 'warning');
        return;
    }
    
    // Store request details
    currentRequest = {
        rawMaterialId: parseInt(rawMaterialId),
        rawMaterialName: selectedOption.textContent.split(' (')[0],
        quantityNeeded: quantityNeeded,
        unitName: selectedOption.dataset.unit || 'Units',
        productionReference: document.getElementById('productionReference').value,
        notes: document.getElementById('issuanceNotes').value,
        pickInstructions: [],
        validatedSteps: []
    };
    
    // Get FIFO pick instructions
    try {
        showLoading();
        
        const response = await axios.get(
            `../api/RawMaterialInventoryAPI.php?action=getFIFOPickInstructions&raw_material_id=${rawMaterialId}&quantity_needed=${quantityNeeded}`
        );
        
        hideLoading();
        
        if (response.data.success) {
            currentRequest.pickInstructions = response.data.data.pick_instructions || response.data.pick_instructions || [];
            
            if (currentRequest.pickInstructions.length === 0) {
                showNoStockAlert(quantityNeeded, 0);
                return;
            }
            
            displayFIFOInstructions();
        } else {
            // Check if it's a stock shortage
            if (response.data.shortage && response.data.shortage > 0) {
                showNoStockAlert(
                    response.data.quantity_requested || quantityNeeded,
                    (response.data.quantity_requested || quantityNeeded) - response.data.shortage,
                    response.data.shortage
                );
            } else {
                showToast(response.data.message || 'Failed to get FIFO instructions', 'error');
            }
        }
    } catch (error) {
        hideLoading();
        console.error('Error getting FIFO instructions:', error);
        showToast('Error retrieving FIFO pick instructions', 'error');
    }
}

function displayFIFOInstructions() {
    // Hide form, show instructions
    document.getElementById('requestFormCard').style.display = 'none';
    document.getElementById('noStockAlert').style.display = 'none';
    document.getElementById('fifoInstructionsSection').style.display = 'block';
    
    // Update request summary
    document.getElementById('requestMaterialName').textContent = currentRequest.rawMaterialName;
    document.getElementById('requestQuantity').textContent = currentRequest.quantityNeeded;
    document.getElementById('requestUnit').textContent = currentRequest.unitName;
    
    // Build progress tracker
    buildProgressTracker();
    
    // Build pick steps
    buildPickSteps();
}

function buildProgressTracker() {
    const tracker = document.getElementById('progressTracker');
    tracker.innerHTML = '';
    
    currentRequest.pickInstructions.forEach((instruction, index) => {
        if (index > 0) {
            const line = document.createElement('div');
            line.className = 'progress-line';
            line.id = `progress-line-${index}`;
            tracker.appendChild(line);
        }
        
        const step = document.createElement('div');
        step.className = 'progress-step';
        step.id = `progress-step-${index}`;
        if (index === 0) step.classList.add('active');
        tracker.appendChild(step);
    });
}

function buildPickSteps() {
    const container = document.getElementById('pickStepsContainer');
    container.innerHTML = '';
    
    currentRequest.pickInstructions.forEach((instruction, index) => {
        const isActive = index === 0;
        const stepHtml = `
            <div class="step-card ${isActive ? 'active' : 'disabled'}" id="step-card-${index}">
                <div class="row align-items-start">
                    <div class="col-auto">
                        <div class="step-number" id="step-number-${index}">${index + 1}</div>
                    </div>
                    <div class="col">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <div>
                                <h5 class="mb-1">Pick ${instruction.quantity_to_pick} ${currentRequest.unitName}</h5>
                                <p class="text-muted mb-0">from batch received on ${formatDate(instruction.received_date)}</p>
                            </div>
                            <span class="status-badge status-pending" id="step-status-${index}">
                                <i class="bi bi-hourglass-split"></i> Pending
                            </span>
                        </div>
                        
                        <div class="row mb-3">
                            <div class="col-md-4">
                                <label class="form-label small text-muted">Batch Code to Pick</label>
                                <div class="batch-code">${instruction.highland_fresh_batch_code}</div>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label small text-muted">Storage Location</label>
                                <div class="fw-bold">${instruction.storage_location || 'Not specified'}</div>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label small text-muted">Expiry Status</label>
                                <div>
                                    ${getExpiryBadge(instruction.days_until_expiry, instruction.expiry_date)}
                                </div>
                            </div>
                        </div>
                        
                        <div class="batch-info mb-3">
                            <i class="bi bi-info-circle me-1"></i>
                            Current batch quantity: <strong>${instruction.current_quantity} ${currentRequest.unitName}</strong>
                            | After pick: <strong>${instruction.remaining_after_pick} ${currentRequest.unitName}</strong>
                            ${instruction.is_batch_depleted ? '<span class="badge bg-secondary ms-2">BATCH WILL BE DEPLETED</span>' : ''}
                        </div>
                        
                        <div class="row align-items-end">
                            <div class="col-md-6">
                                <label class="form-label">Scan/Enter Batch Code to Confirm</label>
                                <input type="text" class="form-control scanner-input" 
                                       id="scanner-input-${index}"
                                       placeholder="Scan batch code..."
                                       ${!isActive ? 'disabled' : ''}
                                       data-step="${index}"
                                       data-expected="${instruction.highland_fresh_batch_code}">
                            </div>
                            <div class="col-md-3">
                                <button class="btn btn-validate w-100" 
                                        id="validate-btn-${index}"
                                        onclick="validateStep(${index})"
                                        ${!isActive ? 'disabled' : ''}>
                                    <i class="bi bi-check-lg me-1"></i>Validate
                                </button>
                            </div>
                        </div>
                        
                        <div id="validation-message-${index}" class="validation-message" style="display: none;"></div>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += stepHtml;
    });
    
    // Add enter key listener for scanner inputs
    currentRequest.pickInstructions.forEach((_, index) => {
        const input = document.getElementById(`scanner-input-${index}`);
        if (input) {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    validateStep(index);
                }
            });
        }
    });
}

// ============================================================================
// FIFO VALIDATION
// ============================================================================

async function validateStep(stepIndex) {
    const input = document.getElementById(`scanner-input-${stepIndex}`);
    const scannedCode = input.value.trim().toUpperCase();
    const instruction = currentRequest.pickInstructions[stepIndex];
    
    if (!scannedCode) {
        showValidationMessage(stepIndex, 'error', 'Please scan or enter the batch code');
        return;
    }
    
    // Call API to validate FIFO batch
    try {
        const response = await axios.get(
            `../api/RawMaterialInventoryAPI.php?action=validateFIFOBatch&raw_material_id=${currentRequest.rawMaterialId}&scanned_batch_code=${encodeURIComponent(scannedCode)}&expected_step=${stepIndex + 1}`
        );
        
        if (response.data.success && response.data.data && response.data.data.valid) {
            // Validation successful
            markStepCompleted(stepIndex);
            showValidationMessage(stepIndex, 'success', 
                `✓ Correct batch confirmed! Pick ${instruction.quantity_to_pick} ${currentRequest.unitName} from this batch.`);
            
            // Enable next step if exists
            if (stepIndex + 1 < currentRequest.pickInstructions.length) {
                enableStep(stepIndex + 1);
            } else {
                // All steps completed - show summary
                showIssuanceSummary();
            }
        } else {
            // Validation failed
            const errorData = response.data.data || response.data;
            showValidationMessage(stepIndex, 'error', 
                `<strong>WRONG BATCH!</strong><br>
                 You scanned: <code>${scannedCode}</code><br>
                 Expected: <code>${errorData.expected_batch_code || instruction.highland_fresh_batch_code}</code><br>
                 ${errorData.instruction || 'Please pick from the correct batch (FIFO enforced)'}`);
            
            input.value = '';
            input.focus();
        }
    } catch (error) {
        console.error('Validation error:', error);
        
        // Fallback to client-side validation
        const expectedCode = instruction.highland_fresh_batch_code.toUpperCase();
        if (scannedCode === expectedCode) {
            markStepCompleted(stepIndex);
            showValidationMessage(stepIndex, 'success', 
                `✓ Correct batch confirmed! Pick ${instruction.quantity_to_pick} ${currentRequest.unitName} from this batch.`);
            
            if (stepIndex + 1 < currentRequest.pickInstructions.length) {
                enableStep(stepIndex + 1);
            } else {
                showIssuanceSummary();
            }
        } else {
            showValidationMessage(stepIndex, 'error', 
                `<strong>WRONG BATCH!</strong><br>
                 You scanned: <code>${scannedCode}</code><br>
                 Expected: <code>${expectedCode}</code><br>
                 FIFO requires oldest batch first!`);
            input.value = '';
            input.focus();
        }
    }
}

function markStepCompleted(stepIndex) {
    // Update step card
    const card = document.getElementById(`step-card-${stepIndex}`);
    card.classList.remove('active');
    card.classList.add('completed');
    
    // Update status badge
    const status = document.getElementById(`step-status-${stepIndex}`);
    status.className = 'status-badge status-validated';
    status.innerHTML = '<i class="bi bi-check-circle-fill"></i> Validated';
    
    // Update step number
    const stepNumber = document.getElementById(`step-number-${stepIndex}`);
    stepNumber.innerHTML = '<i class="bi bi-check-lg"></i>';
    
    // Disable input and button
    document.getElementById(`scanner-input-${stepIndex}`).disabled = true;
    document.getElementById(`validate-btn-${stepIndex}`).disabled = true;
    
    // Update progress tracker
    document.getElementById(`progress-step-${stepIndex}`).classList.remove('active');
    document.getElementById(`progress-step-${stepIndex}`).classList.add('completed');
    
    if (stepIndex > 0) {
        document.getElementById(`progress-line-${stepIndex}`).classList.add('completed');
    }
    
    // Add to validated steps
    currentRequest.validatedSteps.push({
        step: stepIndex + 1,
        ...currentRequest.pickInstructions[stepIndex]
    });
}

function enableStep(stepIndex) {
    const card = document.getElementById(`step-card-${stepIndex}`);
    card.classList.remove('disabled');
    card.classList.add('active');
    
    document.getElementById(`scanner-input-${stepIndex}`).disabled = false;
    document.getElementById(`validate-btn-${stepIndex}`).disabled = false;
    document.getElementById(`scanner-input-${stepIndex}`).focus();
    
    document.getElementById(`progress-step-${stepIndex}`).classList.add('active');
}

function showValidationMessage(stepIndex, type, message) {
    const messageDiv = document.getElementById(`validation-message-${stepIndex}`);
    messageDiv.style.display = 'flex';
    messageDiv.className = `validation-message validation-${type}`;
    messageDiv.innerHTML = `
        <i class="bi ${type === 'success' ? 'bi-check-circle-fill' : 'bi-x-circle-fill'} validation-icon"></i>
        <div>${message}</div>
    `;
}

// ============================================================================
// ISSUANCE COMPLETION
// ============================================================================

function showIssuanceSummary() {
    const summaryCard = document.getElementById('issuanceSummaryCard');
    summaryCard.style.display = 'block';
    
    // Update request status
    document.getElementById('requestStatus').innerHTML = 
        '<i class="bi bi-check-circle-fill me-1"></i>All Batches Validated';
    document.getElementById('requestStatus').classList.add('bg-success', 'text-white');
    document.getElementById('requestStatus').classList.remove('bg-light', 'text-dark');
    
    // Build summary table
    const tbody = document.getElementById('summaryTableBody');
    tbody.innerHTML = '';
    
    let totalQuantity = 0;
    currentRequest.validatedSteps.forEach(step => {
        totalQuantity += step.quantity_to_pick;
        tbody.innerHTML += `
            <tr>
                <td><span class="badge bg-success">${step.step}</span></td>
                <td><span class="batch-code">${step.highland_fresh_batch_code}</span></td>
                <td>${step.storage_location || 'N/A'}</td>
                <td>${step.quantity_to_pick} ${currentRequest.unitName}</td>
                <td>${step.is_batch_depleted ? 
                    '<span class="status-badge status-depleted">Depleted</span>' : 
                    '<span class="badge bg-light text-dark">Active</span>'}</td>
            </tr>
        `;
    });
    
    document.getElementById('totalIssuedQty').textContent = `${totalQuantity} ${currentRequest.unitName}`;
    
    // Scroll to summary
    summaryCard.scrollIntoView({ behavior: 'smooth' });
}

function showConfirmationModal() {
    document.getElementById('confirmMaterialName').textContent = currentRequest.rawMaterialName;
    document.getElementById('confirmQuantity').textContent = currentRequest.quantityNeeded;
    document.getElementById('confirmUnit').textContent = currentRequest.unitName;
    
    const modal = new bootstrap.Modal(document.getElementById('confirmationModal'));
    modal.show();
}

async function confirmIssuance() {
    try {
        showLoading();
        
        // Prepare consumption data for each batch
        const consumptions = currentRequest.validatedSteps.map(step => ({
            batch_id: step.batch_id,
            highland_fresh_batch_code: step.highland_fresh_batch_code,
            raw_material_id: currentRequest.rawMaterialId,
            quantity_consumed: step.quantity_to_pick,
            consumption_reason: 'PRODUCTION',
            production_reference: currentRequest.productionReference,
            notes: currentRequest.notes
        }));
        
        // Call API to record consumption
        const response = await axios.post('../api/RawMaterialInventoryAPI.php?action=recordFIFOIssuance', {
            raw_material_id: currentRequest.rawMaterialId,
            total_quantity: currentRequest.quantityNeeded,
            consumptions: consumptions,
            production_reference: currentRequest.productionReference,
            notes: currentRequest.notes
        });
        
        hideLoading();
        
        // Close modal
        bootstrap.Modal.getInstance(document.getElementById('confirmationModal')).hide();
        
        if (response.data.success) {
            showToast('Materials issued successfully!', 'success');
            
            // Reset form after delay
            setTimeout(() => {
                resetForm();
                loadRecentIssuances();
            }, 2000);
        } else {
            showToast(response.data.message || 'Failed to record issuance', 'error');
        }
    } catch (error) {
        hideLoading();
        console.error('Error confirming issuance:', error);
        showToast('Error recording issuance', 'error');
    }
}

function cancelIssuance() {
    if (confirm('Are you sure you want to cancel this issuance?')) {
        resetForm();
    }
}

function resetForm() {
    // Reset current request
    currentRequest = {
        rawMaterialId: null,
        rawMaterialName: '',
        quantityNeeded: 0,
        unitName: '',
        pickInstructions: [],
        validatedSteps: [],
        productionReference: '',
        notes: ''
    };
    
    // Show form, hide instructions
    document.getElementById('requestFormCard').style.display = 'block';
    document.getElementById('fifoInstructionsSection').style.display = 'none';
    document.getElementById('noStockAlert').style.display = 'none';
    document.getElementById('issuanceSummaryCard').style.display = 'none';
    
    // Reset form inputs
    document.getElementById('materialRequestForm').reset();
    document.getElementById('unitDisplay').value = '';
    
    // Reset request status
    document.getElementById('requestStatus').innerHTML = '<i class="bi bi-clock me-1"></i>In Progress';
    document.getElementById('requestStatus').classList.remove('bg-success', 'text-white');
    document.getElementById('requestStatus').classList.add('bg-light', 'text-dark');
}

// ============================================================================
// NO STOCK HANDLING
// ============================================================================

function showNoStockAlert(requested, available, shortage = null) {
    document.getElementById('noStockAlert').style.display = 'block';
    document.getElementById('alertRequested').textContent = `${requested} ${currentRequest.unitName}`;
    document.getElementById('alertAvailable').textContent = `${available || 0} ${currentRequest.unitName}`;
    document.getElementById('alertShortage').textContent = `${shortage || (requested - available)} ${currentRequest.unitName}`;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

function getExpiryBadge(daysUntilExpiry, expiryDate) {
    if (!expiryDate) return '<span class="badge bg-secondary">No Expiry</span>';
    
    if (daysUntilExpiry <= 0) {
        return `<span class="expiry-warning expiry-danger">EXPIRED</span>`;
    } else if (daysUntilExpiry <= 3) {
        return `<span class="expiry-warning expiry-danger">${daysUntilExpiry} days left</span>`;
    } else if (daysUntilExpiry <= 7) {
        return `<span class="expiry-warning">${daysUntilExpiry} days left</span>`;
    } else {
        return `<span class="badge bg-success">${formatDate(expiryDate)}</span>`;
    }
}

function showLoading() {
    // You can implement a loading spinner here
    document.body.style.cursor = 'wait';
}

function hideLoading() {
    document.body.style.cursor = 'default';
}

function showToast(message, type = 'info') {
    // Create toast element
    const toastContainer = document.getElementById('toastContainer') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast show align-items-center text-white bg-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'primary'}`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
    return container;
}

function printSummary() {
    window.print();
}
