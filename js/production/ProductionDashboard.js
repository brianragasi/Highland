// Production Dashboard JavaScript
class ProductionDashboard {
    constructor() {
        this.recipes = [];
        this.batches = [];
        this.planningData = [];
        this.selectedRecipe = null;
        this.init();
    }

    async init() {
        try {
            console.log('Initializing Production Dashboard...');
            await this.loadInitialData();
            this.setupEventListeners();
            this.updateStatistics();
            this.showSuccessMessage('Production Dashboard loaded successfully');
        } catch (error) {
            console.error('Error initializing production dashboard:', error);
            this.showErrorMessage('Failed to load production data: ' + error.message);
        }
    }

    async loadInitialData() {
        // Load production batches and available milk from QC
        const loadingPromises = [
            this.loadProductionBatches(),
            this.loadAvailableMilk()
        ];

        // Load them with proper error handling
        const results = await Promise.allSettled(loadingPromises);

        // Log any failures but don't stop initialization
        results.forEach((result, index) => {
            const functionNames = ['loadProductionBatches', 'loadAvailableMilk'];
            if (result.status === 'rejected') {
                console.warn(`${functionNames[index]} failed:`, result.reason);
            }
        });
    }

    setupEventListeners() {
        // Batch status filter
        const statusFilter = document.getElementById('batchStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.loadProductionBatches();
            });
        }

        // No tabs in simplified dashboard - removed tab switching logic
    }

    // OUT OF SCOPE - Recipe Management removed
    /*
    async loadProductionRecipes() {
        try {
            const response = await axios.get('../api/ProductionAPI.php', {
                params: { action: 'get_production_recipes' }
            });
            const data = response.data;
            
            if (data.success) {
                this.recipes = data.recipes;
                this.displayRecipes();
                this.populateRecipeDropdown();
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Error loading production recipes:', error);
            this.showErrorMessage('Failed to load production recipes');
        }
    }
    */

    // OUT OF SCOPE - Production Planning removed from simplified dashboard
    /*
    async loadProductionPlanning() {
        try {
            const response = await axios.get('../api/ProductionAPI.php', {
                params: { action: 'get_production_planning' },
                withCredentials: true
            });
            const data = response.data;
            
            if (data.success) {
                this.planningData = data.planning;
                this.displayProductionPlanning();
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Error loading production planning:', error);
            this.displayErrorInTab('productionPlanningTable', 'Failed to load production planning data');
        }
    }
    */

    async loadProductionBatches() {
        try {
            this.showLoadingState('loadingOverlay', 'Loading production batches...');

            const statusFilter = document.getElementById('batchStatusFilter')?.value || '';
            const today = new Date().toISOString().split('T')[0];

            const response = await axios.post('../api/ProductionAPI.php', {
                action: 'get_production_batches',
                status: statusFilter,
                date_from: today,
                date_to: today
            }, {
                headers: { 'Content-Type': 'application/json' },
                withCredentials: true
            });

            const data = response.data;

            if (data.success) {
                this.batches = data.batches;
                this.displayProductionBatches();
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Error loading production batches:', error);
            this.displayErrorInTab('productionBatchesTable', 'Failed to load production batches');
        } finally {
            this.hideLoadingState();
        }
    }

    // Load available Raw Milk batches for production (FIFO order)
    async loadAvailableMilk() {
        try {
            // Get raw material batches for "Raw Milk"
            const response = await axios.get('../api/RawMaterialsAPI.php', {
                params: {
                    action: 'get_batches_for_material',
                    material_name: 'Raw Milk'
                },
                withCredentials: true
            });

            console.log('Raw Milk Batches Response:', response.data);

            if (response.data.success || response.data.batches) {
                const batches = response.data.batches || response.data.data || [];
                // Filter for batches with remaining quantity
                const availableBatches = batches.filter(b =>
                    parseFloat(b.current_quantity || 0) > 0 &&
                    b.status !== 'CONSUMED' &&
                    b.status !== 'EXPIRED'
                );
                this.displayAvailableMilk(availableBatches);
            } else {
                // Fallback: Try to get from milk collections API
                const fallbackResponse = await axios.get('../api/MilkCollectionAPI.php', {
                    params: {
                        operation: 'getCollections',
                        date_from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        date_to: new Date().toISOString().split('T')[0]
                    },
                    withCredentials: true
                });

                if (fallbackResponse.data.success) {
                    const collections = fallbackResponse.data.data || [];
                    // CRITICAL: Filter out expired milk - check multiple conditions
                    const availableMilk = collections.filter(c => {
                        const liters = parseFloat(c.liters_accepted || 0);
                        const ageHours = parseInt(c.age_hours || 0);
                        const status = (c.status || c.processing_status || '').toUpperCase();

                        // Exclude: no liters, expired status, age >= 48h, or rejected
                        if (liters <= 0) return false;
                        if (status === 'EXPIRED') return false;
                        if (status === 'REJECTED') return false;
                        if (ageHours >= 48) return false; // 48h+ = expired

                        return true;
                    });
                    this.displayAvailableMilkFromCollections(availableMilk);
                }
            }
        } catch (error) {
            console.error('Error loading milk batches:', error);
            const tbody = document.getElementById('availableMilkTableBody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center text-muted py-3">
                            <i class="bi bi-droplet fs-3 d-block mb-2"></i>
                            No Raw Milk inventory. Accept milk in QC Dashboard to add inventory.
                        </td>
                    </tr>
                `;
            }
        }
    }

    // Display available milk batches in the table (from raw_material_batches)
    displayAvailableMilk(batches) {
        const tbody = document.getElementById('availableMilkTableBody');
        const badge = document.getElementById('availableMilkBadge');

        if (!tbody) return;

        if (!batches || batches.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted py-3">
                        <i class="bi bi-droplet fs-3 d-block mb-2"></i>
                        No Raw Milk available. Accept milk collections in QC Dashboard.
                    </td>
                </tr>
            `;
            if (badge) badge.textContent = '0';
            return;
        }

        // Update badge with total quantity
        const totalLiters = batches.reduce((sum, b) => sum + parseFloat(b.current_quantity || 0), 0);
        if (badge) badge.textContent = `${totalLiters.toFixed(0)}L`;

        // CRITICAL UX FIX: Filter out expired batches - Production should only see USABLE milk
        // Handle NULL expiry_date: If no expiry set, use age-based check (48h for raw milk)
        const usableBatches = batches.filter(b => {
            const ageHours = parseInt(b.age_hours) || 0;
            const hoursLeft = b.hours_until_expiry !== null && b.hours_until_expiry !== '' 
                ? parseInt(b.hours_until_expiry) 
                : null; // NULL means no expiry date set
            const freshnessStatus = (b.freshness_status || 'GOOD').toUpperCase();
            
            // If status is EXPIRED, exclude
            if (freshnessStatus === 'EXPIRED' || b.status === 'EXPIRED') return false;
            
            // If hoursLeft is set and <= 0, it's expired
            if (hoursLeft !== null && hoursLeft <= 0) return false;
            
            // If no expiry date set, use age-based check (Raw Milk: max 48h)
            if (hoursLeft === null && ageHours >= 48) return false;
            
            // Otherwise, it's usable
            return true;
        });

        // Sort by age descending (oldest usable first = FIFO)
        usableBatches.sort((a, b) => {
            const ageA = parseInt(a.age_hours) || 0;
            const ageB = parseInt(b.age_hours) || 0;
            return ageB - ageA; // Oldest first
        });

        if (usableBatches.length === 0) {
            // Update badge to show 0
            if (badge) badge.textContent = '0L';
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted py-4">
                        <i class="bi bi-droplet-half fs-2 d-block mb-2 text-warning"></i>
                        <strong>No usable Raw Milk available</strong>
                        <p class="small mb-0">All milk has expired or been used. Request QC to accept new milk collections.</p>
                    </td>
                </tr>
            `;
            return;
        }

        // Update badge with usable quantity only
        const usableLiters = usableBatches.reduce((sum, b) => sum + parseFloat(b.current_quantity || 0), 0);
        if (badge) badge.textContent = `${usableLiters.toFixed(0)}L`;

        // Render only usable batches with FIFO indicator on first row
        tbody.innerHTML = usableBatches.map((b, index) => {
            const ageHours = parseInt(b.age_hours) || 0;
            const hoursLeft = parseInt(b.hours_until_expiry) || 0;
            const freshnessStatus = b.freshness_status || 'GOOD';

            let statusClass = 'success';
            let statusText = 'Fresh';
            if (freshnessStatus === 'CRITICAL' || hoursLeft <= 12) {
                statusClass = 'danger';
                statusText = 'Critical';
            } else if (freshnessStatus === 'WARNING' || hoursLeft <= 24) {
                statusClass = 'warning';
                statusText = 'Warning';
            }

            const available = parseFloat(b.current_quantity || 0);

            // FIFO Priority badge for first (oldest usable) batch
            const fifoIndicator = index === 0
                ? '<span class="badge bg-primary me-2"><i class="bi bi-1-circle me-1"></i>FIFO Next</span>'
                : '';

            return `
                <tr class="${statusClass === 'danger' ? 'table-warning' : ''}">
                    <td>
                        ${fifoIndicator}
                        <code>${b.batch_code || b.highland_fresh_batch_code || 'N/A'}</code>
                    </td>
                    <td>${b.supplier_name || 'Highland Fresh'}</td>
                    <td>${this.formatDate(b.received_date)}</td>
                    <td><strong>${available.toFixed(1)} L</strong></td>
                    <td>
                        <span class="badge bg-${statusClass}">
                            ${ageHours}h old
                        </span>
                        <small class="d-block text-muted">${hoursLeft}h left</small>
                    </td>
                    <td><span class="badge bg-${statusClass}">${statusText}</span></td>
                    <td>
                        <button class="btn btn-sm btn-highland" onclick="useMilkBatchForProduction(${b.batch_id}, '${b.batch_code || b.highland_fresh_batch_code}', ${available})">
                            <i class="bi bi-arrow-right-circle"></i> Use
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Fallback: Display milk from collections (legacy support)
    displayAvailableMilkFromCollections(collections) {
        const tbody = document.getElementById('availableMilkTableBody');
        const badge = document.getElementById('availableMilkBadge');

        if (!tbody) return;

        if (!collections || collections.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted py-4">
                        <i class="bi bi-droplet-half fs-2 d-block mb-2 text-warning"></i>
                        <strong>No usable Raw Milk available</strong>
                        <p class="small mb-0">Request QC to accept new milk collections.</p>
                    </td>
                </tr>
            `;
            if (badge) badge.textContent = '0L';
            return;
        }

        // CRITICAL UX FIX: Filter out expired milk - only show usable
        // Handle NULL expiry: use age-based check (48h for raw milk)
        const usableCollections = collections.filter(c => {
            const ageHours = parseInt(c.age_hours) || 0;
            const hoursLeft = c.hours_until_expiry !== null && c.hours_until_expiry !== '' 
                ? parseInt(c.hours_until_expiry) 
                : (48 - ageHours); // If no expiry set, calculate from 48h lifespan
            const status = (c.processing_status || c.status || '').toUpperCase();
            
            // If status is EXPIRED, exclude
            if (status === 'EXPIRED') return false;
            
            // If hoursLeft <= 0 or age >= 48h, it's expired
            if (hoursLeft <= 0 || ageHours >= 48) return false;
            
            return true;
        });

        // Sort by age descending (oldest usable first - FIFO)
        usableCollections.sort((a, b) => {
            const ageA = parseInt(a.age_hours) || 0;
            const ageB = parseInt(b.age_hours) || 0;
            return ageB - ageA;
        });

        if (usableCollections.length === 0) {
            if (badge) badge.textContent = '0L';
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted py-4">
                        <i class="bi bi-droplet-half fs-2 d-block mb-2 text-warning"></i>
                        <strong>No usable Raw Milk available</strong>
                        <p class="small mb-0">All milk has expired. Request QC to accept new collections.</p>
                    </td>
                </tr>
            `;
            return;
        }

        // Update badge with usable quantity
        const usableLiters = usableCollections.reduce((sum, c) => {
            return sum + (parseFloat(c.liters_accepted || c.liters_delivered || 0) - parseFloat(c.liters_rejected || 0));
        }, 0);
        if (badge) badge.textContent = `${usableLiters.toFixed(0)}L`;

        // Render only usable collections with FIFO indicator
        tbody.innerHTML = usableCollections.map((c, index) => {
            const ageHours = parseInt(c.age_hours) || 0;
            const hoursLeft = parseInt(c.hours_until_expiry) || (48 - ageHours);

            let statusClass = 'success';
            let statusText = 'Fresh';
            if (hoursLeft <= 12) {
                statusClass = 'danger';
                statusText = 'Critical';
            } else if (hoursLeft <= 24) {
                statusClass = 'warning';
                statusText = 'Warning';
            }

            const available = parseFloat(c.liters_accepted || c.liters_delivered || 0) - parseFloat(c.liters_rejected || 0);

            // FIFO Priority badge for first (oldest usable) batch
            const fifoIndicator = index === 0
                ? '<span class="badge bg-primary me-2"><i class="bi bi-1-circle me-1"></i>FIFO Next</span>'
                : '';

            return `
                <tr class="${statusClass === 'danger' ? 'table-warning' : ''}">
                    <td>
                        ${fifoIndicator}
                        <code>${c.rmr_number}</code>
                    </td>
                    <td>${c.supplier_name || 'Unknown'}</td>
                    <td>${this.formatDate(c.collection_date)}</td>
                    <td><strong>${available.toFixed(1)} L</strong></td>
                    <td>
                        <span class="badge bg-${statusClass}">
                            ${ageHours}h old
                        </span>
                        <small class="d-block text-muted">${hoursLeft}h left</small>
                    </td>
                    <td><span class="badge bg-${statusClass}">${statusText}</span></td>
                    <td>
                        <button class="btn btn-sm btn-highland" onclick="useMilkForProduction('${c.collection_id}', '${c.rmr_number}', ${available})">
                            <i class="bi bi-arrow-right-circle"></i> Use
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // OUT OF SCOPE - Raw Materials Status removed (read-only view moved to separate page)
    /*
    async loadRawMaterialsStatus() {
        try {
            const response = await axios.get('../api/RawMaterialsAPI.php', {
                params: { action: 'get_raw_materials_inventory' },
                withCredentials: true
            });
            const data = response.data;
            
            if (data.success) {
                this.displayRawMaterialsStatus(data.inventory);
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Error loading raw materials status:', error);
            this.displayErrorInTab('rawMaterialsStatus', 'Failed to load raw materials status');
        }
    }
    */

    // OUT OF SCOPE - Production Planning display removed
    /*
    displayProductionPlanning() {
        const container = document.getElementById('productionPlanningTable');
        
        if (this.planningData.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-check-circle text-success" style="font-size: 2rem;"></i>
                    <p class="text-muted mt-2">All products are well-stocked! No immediate production needed.</p>
                </div>
            `;
            return;
        }

        let html = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead class="table-light">
                        <tr>
                            <th>Product</th>
                            <th>Current Stock</th>
                            <th>Reorder Level</th>
                            <th>Production Needed</th>
                            <th>Batches Required</th>
                            <th>Est. Time (hrs)</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        this.planningData.forEach(item => {
            const urgency = item.production_needed > (item.reorder_level * 2) ? 'danger' : 
                          item.production_needed > item.reorder_level ? 'warning' : 'success';
            
            html += `
                <tr>
                    <td>
                        <strong>${item.product_name}</strong>
                        <small class="text-muted d-block">ID: ${item.product_id}</small>
                    </td>
                    <td>${parseFloat(item.current_stock).toFixed(2)}</td>
                    <td>${parseFloat(item.reorder_level).toFixed(2)}</td>
                    <td>
                        <span class="badge bg-${urgency}">${parseFloat(item.production_needed).toFixed(2)}</span>
                    </td>
                    <td>${item.batches_needed}</td>
                    <td>${parseFloat(item.total_production_time).toFixed(1)}</td>
                    <td>
                        <button class="btn btn-highland btn-sm" onclick="createBatchForProduct(${item.recipe_id}, ${item.batches_needed})">
                            <i class="bi bi-plus-circle"></i> Create Batch
                        </button>
                    </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;
    }
    */

    displayProductionBatches() {
        const container = document.getElementById('batchesTableBody');

        if (!container) {
            console.warn('Batches table body not found');
            return;
        }

        if (this.batches.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4">
                        <i class="bi bi-inbox text-muted" style="font-size: 2rem;"></i>
                        <p class="text-muted mt-2">No production batches found for the selected criteria.</p>
                        <button class="btn btn-highland" onclick="createBatch()">
                            <i class="bi bi-plus-circle"></i> Create First Batch
                        </button>
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';

        this.batches.forEach(batch => {
            const statusClass = batch.status.toLowerCase().replace(' ', '-');
            const startTime = batch.start_time || 'Not started';

            html += `
                <tr>
                    <td>
                        <strong>${batch.batch_number}</strong>
                    </td>
                    <td>${batch.product_name}</td>
                    <td>${parseFloat(batch.batch_size).toFixed(2)}</td>
                    <td>
                        <span class="status-badge status-${statusClass}">${batch.status}</span>
                    </td>
                    <td>
                        ${batch.production_date}<br>
                        <small class="text-muted">${startTime}</small>
                    </td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-highland" onclick="viewBatchDetails(${batch.batch_id})" title="View Details">
                                <i class="bi bi-eye"></i>
                            </button>
                            ${this.getBatchActionButton(batch)}
                        </div>
                    </td>
                </tr>
            `;
        });

        container.innerHTML = html;
    }

    getBatchActionButton(batch) {
        switch (batch.status) {
            case 'Planned':
                return `<button class="btn btn-success btn-sm" onclick="startBatch(${batch.batch_id})" title="Start Production">
                    <i class="bi bi-play-fill"></i>
                </button>`;
            case 'In Progress':
                return `<button class="btn btn-warning btn-sm" onclick="completeBatch(${batch.batch_id})" title="Complete Production">
                    <i class="bi bi-check-circle"></i>
                </button>`;
            case 'Completed':
                return `<button class="btn btn-info btn-sm" onclick="viewBatchReport(${batch.batch_id})" title="View Report">
                    <i class="bi bi-file-text"></i>
                </button>`;
            default:
                return '';
        }
    }

    // OUT OF SCOPE - Recipe Display removed
    /*
    displayRecipes() {
        const container = document.getElementById('recipesContainer');
        
        if (this.recipes.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-4">
                    <i class="bi bi-journal-x text-muted" style="font-size: 2rem;"></i>
                    <p class="text-muted mt-2">No production recipes available.</p>
                </div>
            `;
            return;
        }

        let html = '';
        this.recipes.forEach(recipe => {
            const difficultyColor = {
                'Easy': 'success',
                'Medium': 'warning', 
                'Hard': 'danger'
            }[recipe.difficulty_level] || 'secondary';

            html += `
                <div class="col-md-6 col-lg-4 mb-3">
                    <div class="card recipe-card h-100" onclick="selectRecipe(${recipe.recipe_id})">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h6 class="mb-0">${recipe.product_name}</h6>
                            <span class="badge bg-${difficultyColor}">${recipe.difficulty_level}</span>
                        </div>
                        <div class="card-body">
                            <h5 class="card-title">${recipe.recipe_name}</h5>
                            <div class="mb-2">
                                <small class="text-muted">Batch Yield:</small>
                                <strong class="ms-1">${parseFloat(recipe.batch_size_yield).toFixed(2)} units</strong>
                            </div>
                            <div class="mb-2">
                                <small class="text-muted">Production Time:</small>
                                <strong class="ms-1">${parseFloat(recipe.production_time_hours).toFixed(1)} hours</strong>
                            </div>
                            <div class="mb-3">
                                <small class="text-muted">Instructions:</small>
                                <p class="small mt-1">${recipe.instructions.substring(0, 100)}...</p>
                            </div>
                            <button class="btn btn-highland btn-sm" onclick="createBatchForRecipe(${recipe.recipe_id}); event.stopPropagation();">
                                <i class="bi bi-plus-circle"></i> Create Batch
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }
    */

    // OUT OF SCOPE - Raw Materials Status display removed
    /*
    displayRawMaterialsStatus(materials) {
        const container = document.getElementById('rawMaterialsStatus');
        
        if (materials.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-box text-muted" style="font-size: 2rem;"></i>
                    <p class="text-muted mt-2">No raw materials found in inventory.</p>
                </div>
            `;
            return;
        }

        let html = `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead class="table-light">
                        <tr>
                            <th>Material</th>
                            <th>Current Stock</th>
                            <th>Unit</th>
                            <th>Supplier</th>
                            <th>Status</th>
                            <th>Last Updated</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        materials.forEach(material => {
            const statusClass = material.quantity_on_hand <= material.reorder_level ? 'danger' :
                              material.quantity_on_hand <= material.max_stock_level ? 'warning' : 'success';
            const statusText = material.quantity_on_hand <= material.reorder_level ? 'Low Stock' :
                             material.quantity_on_hand <= material.max_stock_level ? 'Normal' : 'Good';

            html += `
                <tr>
                    <td>
                        <strong>${material.material_name}</strong>
                        <small class="text-muted d-block">ID: ${material.raw_material_id}</small>
                    </td>
                    <td>${parseFloat(material.quantity_on_hand || 0).toFixed(3)}</td>
                    <td>${material.unit_of_measure || 'N/A'}</td>
                    <td>${material.supplier_names || 'Multiple'}</td>
                    <td>
                        <span class="badge bg-${statusClass}">${statusText}</span>
                    </td>
                    <td>N/A</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;
    }
    */

    populateRecipeDropdown() {
        const select = document.getElementById('batchRecipe');
        select.innerHTML = '<option value="">Select Recipe...</option>';

        this.recipes.forEach(recipe => {
            const option = document.createElement('option');
            option.value = recipe.recipe_id;
            option.textContent = `${recipe.recipe_name} (${parseFloat(recipe.batch_size_yield).toFixed(2)} units)`;
            select.appendChild(option);
        });
    }

    async onRecipeSelected(recipeId) {
        if (!recipeId) {
            document.getElementById('requiredMaterials').style.display = 'none';
            return;
        }

        try {
            // Load recipe materials
            const response = await axios.get('../api/ProductionAPI.php', {
                params: {
                    action: 'check_raw_materials_availability',
                    recipe_id: recipeId,
                    batches_needed: 1
                },
                withCredentials: true
            });
            const data = response.data;

            if (data.success) {
                this.displayRequiredMaterials(recipeId, data);
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Error loading recipe materials:', error);
            this.showErrorMessage('Failed to load recipe materials');
        }
    }

    displayRequiredMaterials(recipeId, availabilityData) {
        const recipe = this.recipes.find(r => r.recipe_id == recipeId);
        if (!recipe) return;

        const container = document.getElementById('materialsRequiredList');
        const canProduce = availabilityData.can_produce;

        let html = `
            <div class="alert alert-${canProduce ? 'success' : 'warning'}">
                <i class="bi bi-${canProduce ? 'check-circle' : 'exclamation-triangle'}"></i>
                ${canProduce ? 'All materials available for production' : 'Some materials may be insufficient'}
            </div>
        `;

        if (availabilityData.missing_materials) {
            html += `
                <div class="alert alert-danger">
                    <strong>Missing Materials:</strong><br>
                    ${availabilityData.missing_materials}
                </div>
            `;
        }

        container.innerHTML = html;
        document.getElementById('requiredMaterials').style.display = 'block';
    }

    updateStatistics() {
        // Update header statistics - only 3 stats in simplified dashboard
        const activeBatches = this.batches.filter(b => b.status === 'In Progress' || b.status === 'Planned').length;
        const completedToday = this.batches.filter(b => b.status === 'Completed' && b.production_date === new Date().toISOString().split('T')[0]).length;
        const totalProduction = this.batches.filter(b => b.status === 'Completed').length;

        const activeBatchesEl = document.getElementById('activeBatchesCount');
        const completedTodayEl = document.getElementById('completedBatchesCount');
        const totalProductionEl = document.getElementById('totalProductionCount');

        if (activeBatchesEl) activeBatchesEl.textContent = activeBatches;
        if (completedTodayEl) completedTodayEl.textContent = completedToday;
        if (totalProductionEl) totalProductionEl.textContent = totalProduction;
    }

    // OUT OF SCOPE - Tab switching removed (no tabs in simplified dashboard)
    /*
    onTabSwitch(tabId) {
        // Refresh data when switching to different tabs
        switch(tabId) {
            case 'planning':
                this.loadProductionPlanning();
                break;
            case 'batches':
                this.loadProductionBatches();
                break;
            case 'materials':
                this.loadRawMaterialsStatus();
                break;
        }
    }
    */

    showLoadingState(overlayId = 'loadingOverlay', message = 'Loading...') {
        const overlay = document.getElementById(overlayId);
        const text = document.getElementById('loadingText');
        if (text) text.textContent = message;
        if (overlay) overlay.style.display = 'flex';
    }

    hideLoadingState() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.style.display = 'none';
    }

    displayErrorInTab(containerId, message) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-exclamation-triangle text-danger" style="font-size: 2rem;"></i>
                    <p class="text-danger mt-2">${message}</p>
                    <button class="btn btn-outline-danger" onclick="location.reload()">
                        <i class="bi bi-arrow-clockwise"></i> Retry
                    </button>
                </div>
            `;
        }
    }

    showSuccessMessage(message = 'Operation completed successfully') {
        // Create toast notification
        const toast = this.createToast('success', message);
        document.body.appendChild(toast);

        // Show the toast
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();

        // Remove toast after it's hidden
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });

        console.log('Success:', message);
    }

    showErrorMessage(message = 'An error occurred') {
        // Create toast notification
        const toast = this.createToast('error', message);
        document.body.appendChild(toast);

        // Show the toast
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();

        // Remove toast after it's hidden
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });

        console.error('Error:', message);
    }

    createToast(type, message) {
        const bgClass = type === 'success' ? 'bg-success' : 'bg-danger';
        const iconClass = type === 'success' ? 'bi-check-circle' : 'bi-exclamation-triangle';

        const toast = document.createElement('div');
        toast.className = `toast position-fixed top-0 end-0 m-3`;
        toast.style.zIndex = '9999';
        toast.innerHTML = `
            <div class="toast-header ${bgClass} text-white">
                <i class="bi ${iconClass} me-2"></i>
                <strong class="me-auto">${type === 'success' ? 'Success' : 'Error'}</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        `;

        return toast;
    }

    showInfoMessage(message) {
        const toast = this.createInfoToast(message);
        document.body.appendChild(toast);

        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();

        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }

    createInfoToast(message) {
        const toast = document.createElement('div');
        toast.className = `toast position-fixed top-0 end-0 m-3`;
        toast.style.zIndex = '9999';
        toast.innerHTML = `
            <div class="toast-header bg-info text-white">
                <i class="bi bi-info-circle me-2"></i>
                <strong class="me-auto">Information</strong>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        `;

        return toast;
    }

    // Format date for display
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// ============================================================================
// CORRECTED WORKFLOW: Materials-Issuance Based Production (NOT Recipe-Based)
// ============================================================================

// Global arrays to store available data
let availableFinishedProducts = [];
let availableRawMaterials = [];
let availableMilkCollections = [];
let materialRowCounter = 0;

// Global function: Use milk from QC collection in production
function useMilkForProduction(collectionId, rmrNumber, litersAvailable) {
    console.log(`Using milk collection ${rmrNumber} (${litersAvailable}L) for production`);

    // Open the create batch modal and pre-fill with milk information
    showCreateBatchModal().then(() => {
        // Show info message
        if (window.productionDashboard) {
            window.productionDashboard.showInfoMessage(
                `Ready to use ${litersAvailable}L from ${rmrNumber}. Select a dairy product to produce.`
            );
        }

        // Store the selected milk collection for reference
        window.selectedMilkCollection = {
            collection_id: collectionId,
            rmr_number: rmrNumber,
            liters_available: litersAvailable
        };

        // Add a note in production notes
        const notesField = document.getElementById('productionNotes');
        if (notesField) {
            notesField.value = `Using milk from ${rmrNumber} (${litersAvailable}L available)`;
        }
    });
}

// Global function: Use milk batch from raw_material_batches in production (FIFO)
function useMilkBatchForProduction(batchId, batchCode, litersAvailable) {
    console.log(`Using milk batch ${batchCode} (${litersAvailable}L) for production`);

    // Open the create batch modal and pre-fill with milk batch information
    showCreateBatchModal().then(() => {
        // Show info message
        if (window.productionDashboard) {
            window.productionDashboard.showInfoMessage(
                `Ready to use ${litersAvailable}L from batch ${batchCode}. Select a dairy product to produce.`
            );
        }

        // Store the selected milk batch for reference
        window.selectedMilkBatch = {
            batch_id: batchId,
            batch_code: batchCode,
            liters_available: litersAvailable,
            is_raw_material_batch: true
        };

        // Add a note in production notes
        const notesField = document.getElementById('productionNotes');
        if (notesField) {
            notesField.value = `Using Raw Milk batch ${batchCode} (${litersAvailable}L available) - FIFO allocation`;
        }
    });
}

// =============================================================================
// MASTER RECIPE FLOW: Recipe-driven production batch creation
// Finance sets the recipe, Production just follows
// =============================================================================

// Store current recipe data - make globally accessible for onclick handlers
let currentRecipe = null;
let currentRecipeMaterials = [];
window.currentRecipeMaterials = currentRecipeMaterials; // Expose to global scope

// Global functions for UI interactions
async function showCreateBatchModal() {
    try {
        console.log('Opening Create Batch Modal...');

        // Load finished products (recipes are loaded when product is selected)
        await loadFinishedProducts();

        // Reset the form
        const form = document.getElementById('createBatchForm');
        if (form) {
            form.reset();
        }

        // Reset recipe data
        currentRecipe = null;
        currentRecipeMaterials = [];
        
        // Hide recipe materials section, show placeholder
        const recipeMaterialsSection = document.getElementById('recipeMaterialsSection');
        const noRecipeMessage = document.getElementById('noRecipeMessage');
        const fifoPreviewSection = document.getElementById('fifoPreviewSection');
        const materialWarning = document.getElementById('materialWarning');
        const createBatchBtn = document.getElementById('createBatchBtn');
        
        if (recipeMaterialsSection) recipeMaterialsSection.classList.add('d-none');
        if (noRecipeMessage) noRecipeMessage.classList.remove('d-none');
        if (fifoPreviewSection) fifoPreviewSection.classList.add('d-none');
        if (materialWarning) materialWarning.classList.add('d-none');
        if (createBatchBtn) createBatchBtn.disabled = true;

        // Set today's date
        const dateInput = document.getElementById('productionDate');
        if (dateInput) {
            dateInput.valueAsDate = new Date();
        }

        // Show the modal
        const modalElement = document.getElementById('createBatchModal');
        if (modalElement) {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
            console.log('Modal opened successfully');
        } else {
            console.error('Create Batch Modal element not found');
            window.productionDashboard.showErrorMessage('Modal not found');
        }
    } catch (error) {
        console.error('Error opening modal:', error);
        window.productionDashboard.showErrorMessage('Failed to open create batch modal: ' + error.message);
    }
}

// Load recipe requirements when product is selected
async function loadRecipeRequirements() {
    const productSelect = document.getElementById('batchFinishedProduct');
    const productId = productSelect ? productSelect.value : null;
    
    const recipeMaterialsSection = document.getElementById('recipeMaterialsSection');
    const noRecipeMessage = document.getElementById('noRecipeMessage');
    const createBatchBtn = document.getElementById('createBatchBtn');
    const productUnitLabel = document.getElementById('productUnitLabel');
    
    if (!productId) {
        // Reset to placeholder
        currentRecipe = null;
        currentRecipeMaterials = [];
        window.currentRecipeMaterials = currentRecipeMaterials;
        if (recipeMaterialsSection) recipeMaterialsSection.classList.add('d-none');
        if (noRecipeMessage) noRecipeMessage.classList.remove('d-none');
        if (createBatchBtn) createBatchBtn.disabled = true;
        return;
    }
    
    try {
        console.log(`Loading recipe for product ID: ${productId}`);
        
        const response = await axios.get('../api/ProductionAPI.php', {
            params: { action: 'get_recipe_for_product', product_id: productId },
            withCredentials: true
        });
        
        console.log('Recipe API Response:', response.data);
        
        if (!response.data.success || !response.data.has_recipe) {
            window.productionDashboard.showErrorMessage(
                response.data.message || 'No recipe found for this product. Contact Finance to set up a Master Recipe.'
            );
            currentRecipe = null;
            currentRecipeMaterials = [];
            window.currentRecipeMaterials = currentRecipeMaterials;
            if (recipeMaterialsSection) recipeMaterialsSection.classList.add('d-none');
            if (noRecipeMessage) {
                noRecipeMessage.classList.remove('d-none');
                noRecipeMessage.innerHTML = `
                    <i class="bi bi-exclamation-triangle fs-2 d-block mb-2 text-warning"></i>
                    <strong>No Master Recipe Found</strong><br>
                    <small>Contact Finance Officer to define the recipe for this product.</small>
                `;
            }
            if (createBatchBtn) createBatchBtn.disabled = true;
            return;
        }
        
        // Store recipe data
        currentRecipe = response.data.recipe;
        currentRecipeMaterials = response.data.materials;
        window.currentRecipeMaterials = currentRecipeMaterials;
        console.log('Recipe materials loaded:', currentRecipeMaterials);
        
        // Update unit label
        if (productUnitLabel) {
            productUnitLabel.textContent = currentRecipe.product_unit || 'units';
        }
        
        // Show recipe section, hide placeholder
        if (recipeMaterialsSection) recipeMaterialsSection.classList.remove('d-none');
        if (noRecipeMessage) noRecipeMessage.classList.add('d-none');
        
        // Calculate materials needed (will update table)
        calculateMaterialsNeeded();
        
    } catch (error) {
        console.error('Error loading recipe:', error);
        window.productionDashboard.showErrorMessage('Failed to load recipe: ' + error.message);
    }
}

// Calculate materials needed based on quantity to produce
function calculateMaterialsNeeded() {
    const quantityInput = document.getElementById('batchPlannedQuantity');
    const quantity = parseFloat(quantityInput?.value) || 0;
    
    const tableBody = document.getElementById('recipeMaterialsTableBody');
    const materialWarning = document.getElementById('materialWarning');
    const warningText = document.getElementById('materialWarningText');
    const createBatchBtn = document.getElementById('createBatchBtn');
    
    if (!tableBody || !currentRecipeMaterials || currentRecipeMaterials.length === 0) {
        if (createBatchBtn) createBatchBtn.disabled = true;
        return;
    }
    
    let html = '';
    let hasInsufficientStock = false;
    const insufficientMaterials = [];
    let grandTotalCost = 0;
    
    currentRecipeMaterials.forEach(mat => {
        const perUnit = parseFloat(mat.quantity_per_unit) || 0;
        const totalNeeded = perUnit * quantity;
        const available = parseFloat(mat.available_qty) || 0;
        const isSufficient = available >= totalNeeded;
        
        if (!isSufficient && quantity > 0) {
            hasInsufficientStock = true;
            insufficientMaterials.push(`${mat.material_name} (need ${totalNeeded.toFixed(2)}, have ${available.toFixed(2)})`);
        }
        
        const statusBadge = quantity === 0 
            ? '<span class="badge bg-secondary">Enter qty</span>'
            : isSufficient 
                ? '<span class="badge bg-success"><i class="bi bi-check"></i> OK</span>'
                : '<span class="badge bg-danger"><i class="bi bi-x"></i> Low</span>';
        
        const criticalBadge = mat.is_critical == 1 
            ? '<span class="badge bg-warning text-dark ms-1" title="Critical ingredient">⚠️</span>' 
            : '';
        
        // Build FIFO batch breakdown with cost calculation
        let batchBreakdownHtml = '';
        let materialCost = 0;
        
        if (mat.batches && mat.batches.length > 0 && quantity > 0 && totalNeeded > 0) {
            let remainingNeeded = totalNeeded;
            const batchAllocations = [];
            
            // FIFO allocation calculation
            for (const batch of mat.batches) {
                if (remainingNeeded <= 0) break;
                
                const batchQty = parseFloat(batch.current_quantity) || 0;
                const batchPrice = parseFloat(batch.unit_cost) || 0;
                const useQty = Math.min(batchQty, remainingNeeded);
                const batchCost = useQty * batchPrice;
                
                if (useQty > 0) {
                    batchAllocations.push({
                        qty: useQty,
                        price: batchPrice,
                        cost: batchCost,
                        remaining: batchQty - useQty
                    });
                    materialCost += batchCost;
                    remainingNeeded -= useQty;
                }
            }
            
            grandTotalCost += materialCost;
            
            // Build the batch breakdown display
            if (batchAllocations.length > 0) {
                const hasMixedPrices = mat.has_mixed_prices;
                const rowClass = hasMixedPrices ? 'table-warning' : '';
                
                batchBreakdownHtml = `
                    <div class="mt-2 p-2 rounded" style="background: ${hasMixedPrices ? '#fff3cd' : '#f8f9fa'}; font-size: 0.85em;">
                        <div class="fw-bold mb-1">
                            <i class="bi bi-stack me-1"></i>FIFO Allocation:
                            ${hasMixedPrices ? '<span class="badge bg-warning text-dark ms-2">Mixed Prices</span>' : ''}
                        </div>
                        <table class="table table-sm table-borderless mb-0" style="font-size: 0.9em;">
                            <thead>
                                <tr class="text-muted">
                                    <th style="width:30%">Use</th>
                                    <th style="width:25%">@ Price</th>
                                    <th style="width:25%">Cost</th>
                                    <th style="width:20%">Left</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${batchAllocations.map((alloc, idx) => `
                                    <tr>
                                        <td>${alloc.qty.toFixed(2)} ${mat.unit}</td>
                                        <td>₱${alloc.price.toFixed(2)}</td>
                                        <td class="fw-bold ${alloc.price > (mat.lowest_price || 0) * 1.5 ? 'text-danger' : ''}">₱${alloc.cost.toFixed(2)}</td>
                                        <td class="text-muted">${alloc.remaining.toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            <tfoot>
                                <tr class="border-top">
                                    <td colspan="2" class="text-end fw-bold">Material Total:</td>
                                    <td colspan="2" class="fw-bold text-primary">₱${materialCost.toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                `;
            }
        } else if (mat.batches && mat.batches.length > 0 && mat.fifo_price) {
            // No quantity entered yet, just show price info
            batchBreakdownHtml = `<br><small class="text-muted">${mat.batch_count || mat.batches.length} batch(es) starting @ ₱${parseFloat(mat.fifo_price).toFixed(2)}</small>`;
        }
        
        html += `
            <tr class="${!isSufficient && quantity > 0 ? 'table-danger' : ''}">
                <td>
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <strong>${escapeHtml(mat.material_name)}</strong> ${criticalBadge}
                            ${mat.processing_notes ? `<br><small class="text-muted">${mat.processing_notes}</small>` : ''}
                        </div>
                    </div>
                    ${batchBreakdownHtml}
                </td>
                <td class="text-center align-top">${perUnit.toFixed(4)} ${mat.unit}</td>
                <td class="text-center align-top fw-bold">${quantity > 0 ? totalNeeded.toFixed(2) : '-'} ${mat.unit}</td>
                <td class="text-center align-top">${available.toFixed(2)} ${mat.unit}</td>
                <td class="text-center align-top">${statusBadge}</td>
            </tr>
        `;
    });
    
    // Add grand total row if we have costs
    if (grandTotalCost > 0) {
        html += `
            <tr class="table-primary">
                <td colspan="4" class="text-end fw-bold fs-6">
                    <i class="bi bi-calculator me-2"></i>Estimated Raw Material Cost:
                </td>
                <td class="text-center fw-bold fs-5 text-primary">₱${grandTotalCost.toFixed(2)}</td>
            </tr>
        `;
        
        // Store grand total for cost approval check
        window.lastCalculatedCost = grandTotalCost;
    }
    
    tableBody.innerHTML = html;
    
    // Show/hide warning
    if (materialWarning) {
        if (hasInsufficientStock) {
            materialWarning.classList.remove('d-none');
            if (warningText) {
                warningText.textContent = `Insufficient: ${insufficientMaterials.join(', ')}`;
            }
        } else {
            materialWarning.classList.add('d-none');
        }
    }
    
    // Check cost approval requirement
    if (grandTotalCost > 0 && currentRecipe && currentRecipe.standard_batch_cost) {
        checkCostApprovalRequired(grandTotalCost, quantity);
    } else {
        // No cost threshold set, enable button if valid
        if (createBatchBtn) {
            const isValid = quantity > 0 && !hasInsufficientStock && currentRecipeMaterials.length > 0;
            createBatchBtn.disabled = !isValid;
        }
        hideCostApprovalSection();
    }
}

// Check if cost approval is required from Finance
async function checkCostApprovalRequired(estimatedCost, plannedQuantity) {
    const createBatchBtn = document.getElementById('createBatchBtn');
    const costApprovalSection = document.getElementById('costApprovalSection');
    
    if (!currentRecipe || !currentRecipe.recipe_id) {
        if (createBatchBtn) createBatchBtn.disabled = false;
        return;
    }
    
    try {
        const response = await axios.post('../api/ProductionAPI.php', {
            action: 'check_cost_approval_required',
            recipe_id: currentRecipe.recipe_id,
            product_id: document.getElementById('batchFinishedProduct').value,
            planned_quantity: plannedQuantity,
            estimated_cost: estimatedCost
        }, {
            headers: { 'Content-Type': 'application/json' },
            withCredentials: true
        });
        
        const result = response.data;
        
        if (result.success) {
            if (result.approval_required) {
                // Cost exceeds threshold - need Finance approval
                showCostApprovalRequired(result);
                if (createBatchBtn) createBatchBtn.disabled = true;
            } else if (result.has_valid_approval) {
                // Already has Finance approval
                showCostApprovalGranted(result);
                if (createBatchBtn) createBatchBtn.disabled = false;
            } else {
                // Within threshold - no approval needed
                hideCostApprovalSection();
                if (createBatchBtn) createBatchBtn.disabled = false;
            }
        }
    } catch (error) {
        console.error('Error checking cost approval:', error);
        // On error, allow production to proceed
        if (createBatchBtn) createBatchBtn.disabled = false;
    }
}

function showCostApprovalRequired(data) {
    let section = document.getElementById('costApprovalSection');
    if (!section) {
        // Create the section if it doesn't exist
        const recipeMaterialsSection = document.getElementById('recipeMaterialsSection');
        if (recipeMaterialsSection) {
            section = document.createElement('div');
            section.id = 'costApprovalSection';
            section.className = 'mt-3';
            recipeMaterialsSection.appendChild(section);
        }
    }
    
    if (section) {
        section.innerHTML = `
            <div class="alert alert-danger">
                <h6 class="alert-heading">
                    <i class="bi bi-exclamation-octagon me-2"></i>Finance Approval Required
                </h6>
                <div class="row mb-2">
                    <div class="col-md-6">
                        <table class="table table-sm table-borderless mb-0">
                            <tr>
                                <td class="text-muted">Standard Cost:</td>
                                <td class="text-end">₱${parseFloat(data.standard_cost).toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td class="text-muted">Estimated Cost:</td>
                                <td class="text-end fw-bold text-danger">₱${parseFloat(data.estimated_cost).toFixed(2)}</td>
                            </tr>
                            <tr class="border-top">
                                <td class="text-muted">Variance:</td>
                                <td class="text-end text-danger">
                                    +₱${parseFloat(data.variance_amount).toFixed(2)} 
                                    <span class="badge bg-danger">${data.variance_percent}%</span>
                                </td>
                            </tr>
                        </table>
                    </div>
                    <div class="col-md-6 d-flex align-items-center">
                        <div>
                            <p class="mb-2"><strong>Threshold:</strong> ${data.threshold_percent}% variance allowed</p>
                            <p class="mb-0 text-muted small">${data.reason}</p>
                        </div>
                    </div>
                </div>
                <hr>
                <div class="d-flex justify-content-between align-items-center">
                    <span>Production cannot proceed until Finance approves the cost variance.</span>
                    <button type="button" class="btn btn-warning" onclick="requestCostApproval()">
                        <i class="bi bi-send me-1"></i>Request Finance Approval
                    </button>
                </div>
            </div>
        `;
        section.classList.remove('d-none');
        
        // Store data for the request
        window.pendingCostApproval = data;
    }
}

function showCostApprovalGranted(data) {
    let section = document.getElementById('costApprovalSection');
    if (!section) {
        const recipeMaterialsSection = document.getElementById('recipeMaterialsSection');
        if (recipeMaterialsSection) {
            section = document.createElement('div');
            section.id = 'costApprovalSection';
            section.className = 'mt-3';
            recipeMaterialsSection.appendChild(section);
        }
    }
    
    if (section) {
        section.innerHTML = `
            <div class="alert alert-success">
                <i class="bi bi-check-circle me-2"></i>
                <strong>Finance Approval Granted</strong> - 
                Cost variance of ${data.variance_percent}% has been approved. You may proceed with production.
            </div>
        `;
        section.classList.remove('d-none');
    }
}

function hideCostApprovalSection() {
    const section = document.getElementById('costApprovalSection');
    if (section) {
        section.classList.add('d-none');
    }
}

async function requestCostApproval() {
    const data = window.pendingCostApproval;
    if (!data) {
        window.productionDashboard.showErrorMessage('No cost approval data available');
        return;
    }
    
    try {
        const response = await axios.post('../api/ProductionAPI.php', {
            action: 'request_cost_approval',
            recipe_id: currentRecipe.recipe_id,
            product_id: document.getElementById('batchFinishedProduct').value,
            planned_quantity: parseFloat(document.getElementById('batchPlannedQuantity').value),
            estimated_cost: data.estimated_cost,
            standard_cost: data.standard_cost,
            variance_percent: data.variance_percent,
            variance_amount: data.variance_amount,
            batch_details: currentRecipeMaterials
        }, {
            headers: { 'Content-Type': 'application/json' },
            withCredentials: true
        });
        
        const result = response.data;
        
        if (result.success) {
            window.productionDashboard.showSuccessMessage(result.message);
            
            // Update the section to show pending status
            const section = document.getElementById('costApprovalSection');
            if (section) {
                section.innerHTML = `
                    <div class="alert alert-info">
                        <i class="bi bi-hourglass-split me-2"></i>
                        <strong>Approval Request Pending</strong> - 
                        Your request has been sent to Finance. You will be notified when approved.
                        <br><small class="text-muted">Request ID: ${result.approval_id}</small>
                    </div>
                `;
            }
        } else {
            window.productionDashboard.showErrorMessage(result.message || 'Failed to request approval');
        }
    } catch (error) {
        console.error('Error requesting cost approval:', error);
        window.productionDashboard.showErrorMessage('Failed to submit approval request');
    }
}

// Escape HTML for safety
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load finished products from API
async function loadFinishedProducts() {
    try {
        const response = await axios.get('../api/ProductsAPI.php', {
            // Request includes Highland Fresh products to match customer page listing.
            params: { operation: 'getAllProducts', include_highland_fresh: 1 },
            withCredentials: true
        });

        console.log('Finished Products API Response:', response.data);

        // Normalize response into an array safely so subsequent forEach calls never fail
        let productsArray = [];
        if (response && response.data) {
            if (Array.isArray(response.data.data)) productsArray = response.data.data;
            else if (Array.isArray(response.data.products)) productsArray = response.data.products;
            else if (Array.isArray(response.data)) productsArray = response.data;
        }

        if (!Array.isArray(productsArray)) {
            console.warn('Finished products response did not contain an array in expected properties; defaulting to empty array', response.data);
            productsArray = [];
        }

        availableFinishedProducts = productsArray;
        console.log(`Loaded ${availableFinishedProducts.length} finished products`);
        populateFinishedProductsDropdown();
    } catch (error) {
        console.error('Error loading finished products:', error);
        console.error('Error details:', error.response?.data);
        availableFinishedProducts = [];
        window.productionDashboard.showErrorMessage('Failed to load finished products: ' + (error.response?.data?.message || error.message));
    }
}

// Load raw materials from API
async function loadRawMaterials() {
    try {
        const response = await axios.get('../api/RawMaterialsAPI.php', {
            params: { action: 'get_all' },
            withCredentials: true
        });

        console.log('Raw Materials API Response:', response.data);
        // Normalize response into an array safely
        let materialsArray = [];
        if (response && response.data) {
            if (Array.isArray(response.data.data)) materialsArray = response.data.data;
            else if (Array.isArray(response.data.products)) materialsArray = response.data.products;
            else if (Array.isArray(response.data.raw_materials)) materialsArray = response.data.raw_materials;
            else if (Array.isArray(response.data)) materialsArray = response.data;
        }

        if (!Array.isArray(materialsArray)) {
            console.warn('Raw materials response did not contain an array in expected properties; defaulting to empty array', response.data);
            materialsArray = [];
        }

        availableRawMaterials = materialsArray;
        console.log(`Loaded ${availableRawMaterials.length} raw materials`);
    } catch (error) {
        console.error('Error loading raw materials:', error);
        console.error('Error details:', error.response?.data);
        availableRawMaterials = [];
        window.productionDashboard.showErrorMessage('Failed to load raw materials: ' + (error.response?.data?.message || error.message));
    }
}

// Populate finished products dropdown
function populateFinishedProductsDropdown() {
    const select = document.getElementById('batchFinishedProduct');

    if (!select) {
        console.error('Finished product dropdown not found');
        return;
    }

    select.innerHTML = '<option value="">Select finished product...</option>';
    // Ensure we always have an array to iterate over
    if (!Array.isArray(availableFinishedProducts)) {
        console.warn('availableFinishedProducts was undefined or not an array; initializing to []');
        availableFinishedProducts = [];
    }

    if (availableFinishedProducts.length === 0) {
        select.innerHTML += '<option value="" disabled>No finished products available</option>';
        console.warn('No finished products to display');
        return;
    }

    console.log('=== FINISHED PRODUCTS DATA ===');
    console.log('Total products:', availableFinishedProducts.length);
    console.log('First 3 products:', availableFinishedProducts.slice(0, 3));
    console.table(availableFinishedProducts.map(p => ({
        id: p.product_id || p.id,
        name: p.product_name || p.name,
        stock: p.quantity_on_hand || p.quantity_in_stock || p.stock || p.quantity || 0
    })));

    // Guard the forEach in case the data is unexpectedly not iterable
    if (Array.isArray(availableFinishedProducts)) {
        availableFinishedProducts.forEach((product, index) => {
            const option = document.createElement('option');

            // Handle different possible property names
            const productId = product.product_id || product.id;
            const productName = product.product_name || product.name || product.productName || `Product ${index + 1}`;
            const stockQty = product.quantity_on_hand || product.quantity_in_stock || product.stock || product.quantity || 0;

            option.value = productId;
            option.textContent = `${productName} (Current Stock: ${parseFloat(stockQty).toFixed(0)} units)`;
            option.dataset.productName = productName;
            option.dataset.productId = productId;
            select.appendChild(option);
        });
    }

    console.log(`✅ Populated ${availableFinishedProducts.length} finished products`);
}

// Add a new material row
function addMaterialRow() {
    const template = document.getElementById('materialRowTemplate');

    if (!template) {
        console.error('Material row template not found');
        return;
    }

    const clone = template.content.cloneNode(true);

    // Set unique ID for this row
    const rowId = ++materialRowCounter;
    const row = clone.querySelector('.material-row');
    row.dataset.rowId = rowId;

    // Populate raw materials dropdown
    const select = clone.querySelector('.material-select');
    select.innerHTML = '<option value="">Select raw material...</option>';

    if (!Array.isArray(availableRawMaterials) || availableRawMaterials.length === 0) {
        select.innerHTML += '<option value="" disabled>No raw materials available</option>';
        console.warn('No raw materials to display in new row');
    } else {
        console.log(`=== ADDING MATERIAL ROW #${rowId} ===`);
        console.log('Available raw materials:', availableRawMaterials.length);
        console.log('First 3 materials:', availableRawMaterials.slice(0, 3));

        availableRawMaterials.forEach(material => {
            const option = document.createElement('option');

            // Handle different possible property names
            const materialId = material.raw_material_id || material.id || material.material_id || material.product_id;
            const materialName = material.material_name || material.name || material.raw_material_name || material.product_name || 'Unnamed Material';
            const availableQty = material.quantity_on_hand || material.quantity || material.stock || 0;
            const unit = material.unit_of_measure || material.unit || 'units';

            option.value = materialId;
            option.textContent = materialName;
            option.dataset.availableQty = availableQty;
            option.dataset.unit = unit;
            select.appendChild(option);
        });
        console.log(`✅ Added material row with ${availableRawMaterials.length} materials`);
    }

    // Add event listener for material selection
    select.addEventListener('change', function () {
        updateMaterialInfo(rowId);
    });

    // Add event listener for remove button
    const removeBtn = clone.querySelector('.remove-material-btn');
    removeBtn.addEventListener('click', function () {
        removeMaterialRow(rowId);
    });

    // Add to the list
    const listContainer = document.getElementById('materialsIssuedList');
    if (listContainer) {
        listContainer.appendChild(clone);
    } else {
        console.error('Materials list container not found');
    }
}

// Update material info when material is selected
function updateMaterialInfo(rowId) {
    const row = document.querySelector(`.material-row[data-row-id="${rowId}"]`);
    const select = row.querySelector('.material-select');
    const selectedOption = select.options[select.selectedIndex];

    if (selectedOption.value) {
        const availableQty = selectedOption.dataset.availableQty;
        const unit = selectedOption.dataset.unit;

        row.querySelector('.available-quantity').textContent = parseFloat(availableQty).toFixed(3);
        row.querySelectorAll('.material-unit').forEach(el => el.textContent = unit);
        row.querySelector('.material-unit-text').textContent = unit;
    }
}

// Remove a material row
function removeMaterialRow(rowId) {
    const row = document.querySelector(`.material-row[data-row-id="${rowId}"]`);
    if (row) {
        row.remove();
    }

    // If no rows left, add one
    if (document.querySelectorAll('.material-row').length === 0) {
        addMaterialRow();
    }
}

// Setup Add Material button event listener - REMOVED (recipe-driven now)
// document.addEventListener('DOMContentLoaded', function () {
//     const addMaterialBtn = document.getElementById('addMaterialBtn');
//     if (addMaterialBtn) {
//         addMaterialBtn.addEventListener('click', addMaterialRow);
//     }
// });

// =============================================================================
// MASTER RECIPE FLOW: Issue Materials and Create Batch (Recipe-Driven)
// Materials are auto-calculated from the Master Recipe set by Finance
// =============================================================================
async function issueMaterialsAndCreateBatch() {
    try {
        // Validate form
        const finishedProductId = document.getElementById('batchFinishedProduct').value;
        const plannedQuantity = parseFloat(document.getElementById('batchPlannedQuantity').value);
        const operatorName = document.getElementById('operatorName').value;
        const productionDate = document.getElementById('productionDate').value;

        if (!finishedProductId) {
            window.productionDashboard.showErrorMessage('Please select a finished product');
            return;
        }

        if (!plannedQuantity || plannedQuantity <= 0) {
            window.productionDashboard.showErrorMessage('Please enter a valid quantity to produce');
            return;
        }

        if (!operatorName) {
            window.productionDashboard.showErrorMessage('Please enter operator name');
            return;
        }

        if (!productionDate) {
            window.productionDashboard.showErrorMessage('Please select production date');
            return;
        }

        // Validate recipe is loaded
        if (!currentRecipe || !currentRecipeMaterials || currentRecipeMaterials.length === 0) {
            window.productionDashboard.showErrorMessage('No recipe loaded. Please select a product with a defined Master Recipe.');
            return;
        }

        // Calculate materials to issue from recipe (auto-calculated, not manual)
        const materialsToIssue = currentRecipeMaterials.map(mat => {
            const perUnit = parseFloat(mat.quantity_per_unit) || 0;
            const totalNeeded = perUnit * plannedQuantity;
            
            return {
                raw_material_id: parseInt(mat.raw_material_id),
                quantity_issued: totalNeeded
            };
        });

        // Final check for sufficient stock
        for (const mat of currentRecipeMaterials) {
            const perUnit = parseFloat(mat.quantity_per_unit) || 0;
            const totalNeeded = perUnit * plannedQuantity;
            const available = parseFloat(mat.available_qty) || 0;
            
            if (totalNeeded > available) {
                window.productionDashboard.showErrorMessage(
                    `Insufficient stock for ${mat.material_name}: need ${totalNeeded.toFixed(2)}, have ${available.toFixed(2)}`
                );
                return;
            }
        }

        // Get finished product name for display
        const productSelect = document.getElementById('batchFinishedProduct');
        const productName = productSelect.options[productSelect.selectedIndex].dataset.productName || currentRecipe.product_name;

        // Prepare batch data with recipe reference
        const batchData = {
            action: 'issue_materials_and_create_batch',
            product_id: parseInt(finishedProductId),
            product_name: productName,
            recipe_id: currentRecipe.recipe_id,  // Link to Master Recipe
            planned_quantity: plannedQuantity,
            operator_name: operatorName,
            production_date: productionDate,
            production_notes: document.getElementById('productionNotes').value || '',
            materials_to_issue: materialsToIssue,
            recipe_driven: true  // Flag to indicate this was auto-calculated
        };

        console.log('Submitting recipe-driven batch data:', batchData);

        // Show loading
        window.productionDashboard.showLoadingState('loadingOverlay', 'Creating production batch from Master Recipe...');

        // Submit to API
        const response = await axios.post('../api/ProductionAPI.php', batchData, {
            headers: { 'Content-Type': 'application/json' },
            withCredentials: true
        });

        window.productionDashboard.hideLoadingState();

        const result = response.data;

        if (result.success) {
            window.productionDashboard.showSuccessMessage(
                `Production batch created successfully!\n` +
                `Batch Number: ${result.batch_number}\n` +
                `Recipe: ${currentRecipe.recipe_name}\n` +
                `Materials issued via FIFO allocation.`
            );

            // Close modal
            bootstrap.Modal.getInstance(document.getElementById('createBatchModal')).hide();

            // Refresh the dashboard
            window.productionDashboard.loadProductionBatches();
            window.productionDashboard.updateStatistics();
        } else {
            throw new Error(result.message || 'Failed to create production batch');
        }
    } catch (error) {
        console.error('Error creating production batch:', error);
        window.productionDashboard.hideLoadingState();
        window.productionDashboard.showErrorMessage(
            'Failed to create production batch: ' + (error.response?.data?.message || error.message)
        );
    }
}

// OLD FUNCTION - Now deprecated (recipe-based workflow)
/*
async function createProductionBatch() {
    const form = document.getElementById('createBatchForm');
    const formData = new FormData(form);
    
    const batchData = {
        action: 'create_production_batch',
        recipe_id: document.getElementById('batchRecipe').value,
        batch_size: parseFloat(document.getElementById('batchSize').value),
        operator_name: document.getElementById('operatorName').value,
        quality_grade: document.getElementById('qualityGrade').value
    };

    if (!batchData.recipe_id || !batchData.batch_size || !batchData.operator_name) {
        window.productionDashboard.showErrorMessage('Please fill in all required fields');
        return;
    }

    try {
        const response = await axios.post('../api/ProductionAPI.php', batchData, {
            headers: { 'Content-Type': 'application/json' },
            withCredentials: true
        });

        const result = response.data;
        
        if (result.success) {
            window.productionDashboard.showSuccessMessage(`Production batch created successfully! Batch Number: ${result.batch_number}`);
            bootstrap.Modal.getInstance(document.getElementById('createBatchModal')).hide();
            form.reset();
            // Refresh the dashboard
            window.productionDashboard.loadProductionBatches();
            window.productionDashboard.updateStatistics();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Error creating production batch:', error);
        window.productionDashboard.showErrorMessage('Failed to create production batch: ' + error.message);
    }
}

function createBatchForProduct(recipeId, batchesNeeded) {
    const recipeSelect = document.getElementById('batchRecipe');
    const batchSizeInput = document.getElementById('batchSize');
    
    recipeSelect.value = recipeId;
    batchSizeInput.value = batchesNeeded;
    
    // Trigger recipe selection
    window.productionDashboard.onRecipeSelected(recipeId);
    
    showCreateBatchModal();
}

function createBatchForRecipe(recipeId) {
    createBatchForProduct(recipeId, 1);
}

function selectRecipe(recipeId) {
    // Visual feedback for recipe selection
    document.querySelectorAll('.recipe-card').forEach(card => {
        card.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
}
*/

// ============================================================================
// Batch Management Functions (Start/Complete)
// ============================================================================

async function startBatch(batchId) {
    // Store the batch ID for use in the modal
    window.currentBatchId = batchId;

    // Show the confirmation modal
    const modal = new bootstrap.Modal(document.getElementById('startBatchModal'));
    modal.show();
}

// Handle the confirm start batch button click
document.addEventListener('DOMContentLoaded', function () {
    const confirmStartBatchBtn = document.getElementById('confirmStartBatchBtn');
    if (confirmStartBatchBtn) {
        confirmStartBatchBtn.addEventListener('click', async function () {
            try {
                const response = await axios.post('../api/ProductionAPI.php', {
                    action: 'start_production_batch',
                    batch_id: window.currentBatchId
                }, {
                    headers: { 'Content-Type': 'application/json' },
                    withCredentials: true
                });

                const result = response.data;

                if (result.success) {
                    window.productionDashboard.showSuccessMessage('Production batch started successfully!');
                    bootstrap.Modal.getInstance(document.getElementById('startBatchModal')).hide();
                    window.productionDashboard.loadProductionBatches();
                } else {
                    throw new Error(result.message);
                }
            } catch (error) {
                console.error('Error starting batch:', error);
                window.productionDashboard.showErrorMessage('Failed to start batch: ' + error.message);
            }
        });
    }
});

async function completeBatch(batchId) {
    // Store the batch ID for use in the modal
    window.currentBatchId = batchId;

    // Reset the form if it exists
    const form = document.getElementById('completeBatchForm');
    const yieldQty = document.getElementById('yieldQuantity');
    const wasteQty = document.getElementById('wasteQuantity');
    const wasteReason = document.getElementById('wasteReason');
    const notes = document.getElementById('qualityNotes');

    if (form) form.reset();
    if (yieldQty) yieldQty.value = '';
    if (wasteQty) wasteQty.value = '0';
    if (wasteReason) {
        wasteReason.value = '';
        wasteReason.disabled = true;
    }
    if (notes) notes.value = '';

    // Reset wastage sections
    const wasteBatchLinkSection = document.getElementById('wasteBatchLinkSection');
    const wasteReasonRequired = document.getElementById('wasteReasonRequired');
    if (wasteBatchLinkSection) wasteBatchLinkSection.style.display = 'none';
    if (wasteReasonRequired) wasteReasonRequired.classList.add('d-none');

    // Load materials used in this batch (GAP 2-GAP-3 fix)
    loadBatchMaterialsUsed(batchId);

    // Show the modal
    const modalElement = document.getElementById('completeBatchModal');
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    } else {
        console.error('Complete batch modal not found');
        window.productionDashboard.showErrorMessage('Complete batch modal not found');
    }
}

// Handle the complete batch button click
document.addEventListener('DOMContentLoaded', function () {
    const completeBatchBtn = document.getElementById('completeBatchBtn');
    if (completeBatchBtn) {
        completeBatchBtn.addEventListener('click', async function () {
            const yieldQtyElement = document.getElementById('yieldQuantity');
            const wasteQtyElement = document.getElementById('wasteQuantity');
            const wasteReasonElement = document.getElementById('wasteReason');
            const qualityNotesElement = document.getElementById('qualityNotes');

            if (!yieldQtyElement) {
                console.error('yieldQuantity input not found');
                window.productionDashboard.showErrorMessage('Form elements not found. Please close and reopen the modal.');
                return;
            }

            const yieldQuantity = yieldQtyElement.value;
            const wasteQuantity = wasteQtyElement ? wasteQtyElement.value || '0' : '0';
            const wasteReason = wasteReasonElement ? wasteReasonElement.value || '' : '';
            const qualityNotes = qualityNotesElement ? qualityNotesElement.value || '' : '';

            if (!yieldQuantity || parseFloat(yieldQuantity) <= 0) {
                window.productionDashboard.showErrorMessage('Please enter a valid yield quantity');
                return;
            }

            // Validate wastage reason if waste quantity > 0 (GAP 2-GAP-4 fix)
            if (parseFloat(wasteQuantity) > 0 && !wasteReason) {
                window.productionDashboard.showErrorMessage('Please select a reason for wastage');
                return;
            }

            try {
                const response = await axios.post('../api/ProductionAPI.php', {
                    action: 'complete_production_batch',
                    batch_id: window.currentBatchId,
                    yield_quantity: parseFloat(yieldQuantity),
                    waste_quantity: parseFloat(wasteQuantity),
                    waste_reason: wasteReason,  // GAP 2-GAP-4 fix
                    quality_notes: qualityNotes
                }, {
                    headers: { 'Content-Type': 'application/json' },
                    withCredentials: true
                });

                const result = response.data;

                if (result.success) {
                    // Close the complete batch modal first
                    bootstrap.Modal.getInstance(document.getElementById('completeBatchModal')).hide();

                    // Show success message with print label option (GAP 2-GAP-2)
                    if (result.batch_info) {
                        const printConfirm = confirm(
                            `Production batch completed successfully!\n\n` +
                            `Batch: ${result.batch_info.batch_number}\n` +
                            `Expiry: ${result.batch_info.expiry_date}\n\n` +
                            `Would you like to print batch labels?`
                        );

                        if (printConfirm) {
                            showPrintLabelModal(
                                result.batch_info.batch_number,
                                result.batch_info.product_name,
                                result.batch_info.production_date,
                                result.batch_info.expiry_date,
                                window.currentBatchId
                            );
                        }
                    } else {
                        window.productionDashboard.showSuccessMessage('Production batch completed successfully! Inventory has been updated.');
                    }

                    window.productionDashboard.loadProductionBatches();
                    window.productionDashboard.updateStatistics();
                } else {
                    throw new Error(result.message);
                }
            } catch (error) {
                console.error('Error completing batch:', error);
                window.productionDashboard.showErrorMessage('Failed to complete batch: ' + error.message);
            }
        });
    }
});

async function viewBatchDetails(batchId) {
    try {
        window.productionDashboard.showLoadingState('loadingOverlay', 'Loading batch details...');

        const response = await axios.get('../api/ProductionAPI.php', {
            params: {
                action: 'get_batch_details',
                batch_id: batchId
            },
            withCredentials: true
        });

        const result = response.data;

        if (result.success) {
            const batch = result.batch;
            const materials = result.materials;

            // Build materials table
            let materialsHtml = '';
            if (materials && materials.length > 0) {
                materialsHtml = `
                    <h6 class="mt-4 mb-3"><i class="bi bi-basket"></i> Raw Materials Used:</h6>
                    <table class="table table-sm">
                        <thead class="table-light">
                            <tr>
                                <th>Material</th>
                                <th>Quantity Issued</th>
                                <th>Issued At</th>
                            </tr>
                        </thead>
                        <tbody>
                `;
                materials.forEach(material => {
                    materialsHtml += `
                        <tr>
                            <td>${material.material_name}</td>
                            <td>${parseFloat(material.quantity_issued).toFixed(3)} ${material.unit_of_measure}</td>
                            <td>${new Date(material.issued_at).toLocaleString()}</td>
                        </tr>
                    `;
                });
                materialsHtml += `
                        </tbody>
                    </table>
                `;
            } else {
                materialsHtml = `
                    <div class="alert alert-info mt-4">
                        <i class="bi bi-info-circle"></i> No raw materials recorded for this batch.
                    </div>
                `;
            }

            // Build batch details HTML
            const detailsHtml = `
                <div class="row">
                    <div class="col-md-6">
                        <h6><i class="bi bi-info-circle"></i> Batch Information</h6>
                        <table class="table table-sm">
                            <tr>
                                <th>Batch Number:</th>
                                <td><strong>${batch.batch_number}</strong></td>
                            </tr>
                            <tr>
                                <th>Product:</th>
                                <td>${batch.product_name}</td>
                            </tr>
                            <tr>
                                <th>Status:</th>
                                <td><span class="badge bg-${batch.status === 'Completed' ? 'success' : batch.status === 'In Progress' ? 'warning' : 'secondary'}">${batch.status}</span></td>
                            </tr>
                            <tr>
                                <th>Operator:</th>
                                <td>${batch.operator_name || 'N/A'}</td>
                            </tr>
                            <tr>
                                <th>Production Date:</th>
                                <td>${batch.production_date}</td>
                            </tr>
                        </table>
                    </div>
                    <div class="col-md-6">
                        <h6><i class="bi bi-graph-up"></i> Production Metrics</h6>
                        <table class="table table-sm">
                            <tr>
                                <th>Planned Quantity:</th>
                                <td>${batch.planned_quantity ? parseFloat(batch.planned_quantity).toFixed(2) : parseFloat(batch.batch_size).toFixed(2)} units</td>
                            </tr>
                            <tr>
                                <th>Yield Quantity:</th>
                                <td>${batch.yield_quantity ? parseFloat(batch.yield_quantity).toFixed(2) : 'Not completed'} units</td>
                            </tr>
                            <tr>
                                <th>Waste Quantity:</th>
                                <td>${batch.waste_quantity ? parseFloat(batch.waste_quantity).toFixed(2) : '0.00'} units</td>
                            </tr>
                            <tr>
                                <th>Start Time:</th>
                                <td>${batch.start_time || 'Not started'}</td>
                            </tr>
                            <tr>
                                <th>End Time:</th>
                                <td>${batch.end_time || 'Not completed'}</td>
                            </tr>
                        </table>
                    </div>
                </div>
                
                ${materialsHtml}
                
                ${batch.production_notes ? `
                    <div class="mt-3">
                        <h6><i class="bi bi-sticky"></i> Production Notes:</h6>
                        <p class="text-muted">${batch.production_notes}</p>
                    </div>
                ` : ''}
                
                ${batch.quality_notes ? `
                    <div class="mt-3">
                        <h6><i class="bi bi-shield-check"></i> Quality Notes:</h6>
                        <p class="text-muted">${batch.quality_notes}</p>
                    </div>
                ` : ''}
            `;

            // Update modal content
            document.getElementById('batchDetailsContent').innerHTML = detailsHtml;

            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('batchDetailsModal'));
            modal.show();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Error loading batch details:', error);
        console.error('Response data:', error.response?.data);

        const errorMsg = error.response?.data?.message || error.message;
        const errorDetail = error.response?.data?.error_detail || '';

        window.productionDashboard.showErrorMessage(
            'Failed to load batch details: ' + errorMsg +
            (errorDetail ? '\n' + errorDetail : '')
        );
    } finally {
        window.productionDashboard.hideLoadingState();
    }
}

function viewBatchReport(batchId) {
    // Implementation for viewing batch report
    window.productionDashboard.showInfoMessage('Batch report feature coming soon! Batch ID: ' + batchId);
}

// OUT OF SCOPE - Production planning removed
/*
function refreshProductionPlanning() {
    window.productionDashboard.loadProductionPlanning();
}
*/

// OUT OF SCOPE - Raw materials status tab removed
/*
function viewRawMaterialsStatus() {
    // Switch to materials tab
    const materialsTab = document.getElementById('materials-tab');
    const tab = new bootstrap.Tab(materialsTab);
    tab.show();
}
*/

// Simplified: View all batches (no tabs)
function viewProductionHistory() {
    // Load all batches instead of just today's
    const statusFilter = document.getElementById('batchStatusFilter');
    if (statusFilter) {
        statusFilter.value = '';
        statusFilter.dispatchEvent(new Event('change'));
    }
    window.productionDashboard.loadProductionBatches();
}

// OUT OF SCOPE - Materials availability checker removed
/*
function checkAllMaterialsAvailability() {
    window.productionDashboard.loadRawMaterialsStatus();
}
*/

// Main Dashboard Card Functions (IN SCOPE)
function createBatch() {
    console.log('Create Batch clicked');
    showCreateBatchModal();
}

function viewBatches() {
    console.log('View Batches clicked');
    // Scroll to batches table section
    const batchesSection = document.querySelector('#batchesTableBody');
    if (batchesSection) {
        batchesSection.closest('.main-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.productionDashboard.loadProductionBatches();
    }
}

function viewRawMaterials() {
    console.log('View Raw Materials clicked');
    // Scroll to Raw Milk Inventory section on this page
    const rawMilkSection = document.querySelector('#availableMilkTable');
    if (rawMilkSection) {
        rawMilkSection.closest('.main-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.productionDashboard.showInfoMessage('Scroll down to view Raw Milk Inventory');
    }
}

// OUT OF SCOPE - Recipe management removed
/*
function manageRecipes() {
    console.log('Manage Recipes clicked');
    // Switch to recipes tab
    const recipesTab = document.querySelector('#recipes-tab');
    if (recipesTab) {
        const tab = new bootstrap.Tab(recipesTab);
        tab.show();
    } else {
        // Fallback: show recipes data
        window.productionDashboard.showInfoMessage('Loading recipes view...');
        setTimeout(() => {
            window.productionDashboard.loadProductionRecipes();
        }, 100);
    }
}
*/

// OUT OF SCOPE - Quality control removed
/*
function qualityControl() {
    console.log('Quality Control clicked');
    // Switch to batches tab and filter to in-progress batches for QC
    const batchesTab = document.querySelector('#batches-tab');
    if (batchesTab) {
        const tab = new bootstrap.Tab(batchesTab);
        tab.show();
        // Filter to in-progress batches for quality control
        setTimeout(() => {
            const statusFilter = document.getElementById('batchStatusFilter');
            if (statusFilter) {
                statusFilter.value = 'In Progress';
                statusFilter.dispatchEvent(new Event('change'));
                window.productionDashboard.loadProductionBatches();
            }
        }, 200);
    } else {
        window.productionDashboard.showInfoMessage('Loading quality control batches...');
        // Direct API call for quality control batches
        loadQualityControlBatches();
    }
}
*/

// OUT OF SCOPE - Production reports removed
/*
function productionReports() {
    console.log('Production Reports clicked');
    // Check if production-reports.html exists, otherwise show coming soon
    axios.head('../html/production-reports.html')
        .then(response => {
            if (response.status === 200) {
                window.location.href = 'production-reports.html';
            } else {
                throw new Error('Reports page not found');
            }
        })
        .catch(error => {
            console.log('Reports page not available:', error);
            window.productionDashboard.showInfoMessage('Production Reports feature coming soon! Currently showing batch summaries.');
            // Show current batch statistics as alternative
            showProductionSummary();
        });
}
*/

// OUT OF SCOPE - Raw materials tab removed (use separate page instead)
/*
function rawMaterials() {
    console.log('Raw Materials clicked');
    // Switch to materials tab
    const materialsTab = document.querySelector('#materials-tab');
    if (materialsTab) {
        const tab = new bootstrap.Tab(materialsTab);
        tab.show();
    } else {
        // Fallback: show raw materials status
        window.productionDashboard.showInfoMessage('Loading raw materials status...');
        setTimeout(() => {
            window.productionDashboard.loadRawMaterialsStatus();
        }, 100);
    }
}
*/

// OUT OF SCOPE - Quality control batches removed
/*
async function loadQualityControlBatches() {
    try {
        const response = await axios.post('../api/ProductionAPI.php', {
            action: 'get_production_batches',
            status: 'In Progress'
        }, {
            headers: { 'Content-Type': 'application/json' },
            withCredentials: true
        });
        
        const data = response.data;
        
        if (data.success && data.batches.length > 0) {
            console.log('Quality Control Batches:', data.batches);
            window.productionDashboard.showInfoMessage(`Found ${data.batches.length} batches needing quality control.`);
        } else {
            window.productionDashboard.showInfoMessage('No batches currently in production for quality control.');
        }
    } catch (error) {
        window.productionDashboard.showErrorMessage('Failed to load quality control data.');
    }
}
*/

// OUT OF SCOPE - Production summary modal removed (too detailed for Production Supervisor)
/*
function showProductionSummary() {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header bg-primary text-white">
                    <h5 class="modal-title">
                        <i class="bi bi-graph-up"></i> Production Summary
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="row text-center">
                        <div class="col-md-3">
                            <div class="card bg-light">
                                <div class="card-body">
                                    <h3 class="text-primary" id="summaryActiveBatches">0</h3>
                                    <small>Active Batches</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-light">
                                <div class="card-body">
                                    <h3 class="text-success" id="summaryCompletedToday">0</h3>
                                    <small>Completed Today</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-light">
                                <div class="card-body">
                                    <h3 class="text-info" id="summaryRecipes">0</h3>
                                    <small>Available Recipes</small>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-light">
                                <div class="card-body">
                                    <h3 class="text-warning" id="summaryPlanned">0</h3>
                                    <small>Planned Batches</small>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="mt-4">
                        <h6>Recent Activity</h6>
                        <div id="recentActivity">
                            <p class="text-muted">Loading recent activity...</p>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-primary" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    // Update summary data
    updateProductionSummaryData();
    
    // Clean up modal after hiding
    modal.addEventListener('hidden.bs.modal', () => {
        modal.remove();
    });
}

function updateProductionSummaryData() {
    // Update with current dashboard data
    const dashboard = window.productionDashboard;
    if (dashboard && dashboard.batches) {
        const today = new Date().toISOString().split('T')[0];
        const activeBatches = dashboard.batches.filter(b => ['In Progress', 'Planned'].includes(b.status)).length;
        const completedToday = dashboard.batches.filter(b => b.status === 'Completed' && b.production_date === today).length;
        const plannedBatches = dashboard.batches.filter(b => b.status === 'Planned').length;
        
        document.getElementById('summaryActiveBatches').textContent = activeBatches;
        document.getElementById('summaryCompletedToday').textContent = completedToday;
        document.getElementById('summaryRecipes').textContent = dashboard.recipes.length;
        document.getElementById('summaryPlanned').textContent = plannedBatches;
        
        // Show recent activity
        const recentBatches = dashboard.batches.slice(0, 5);
        const activityHTML = recentBatches.length > 0 ? 
            recentBatches.map(batch => `
                <div class="d-flex justify-content-between align-items-center border-bottom py-2">
                    <span>${batch.batch_number}</span>
                    <span class="badge bg-${getStatusColor(batch.status)}">${batch.status}</span>
                </div>
            `).join('') : '<p class="text-muted">No recent activity</p>';
            
        document.getElementById('recentActivity').innerHTML = activityHTML;
    }
}

function getStatusColor(status) {
    const colors = {
        'Planned': 'primary',
        'In Progress': 'warning',
        'Completed': 'success',
        'Failed': 'danger',
        'Quality Control': 'info'
    };
    return colors[status] || 'secondary';
}
*/

// Logout functionality
function handleLogout() {
    const modal = new bootstrap.Modal(document.getElementById('logoutModal'));
    modal.show();
}

// Confirm logout button handler
document.addEventListener('DOMContentLoaded', function () {
    const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');
    if (confirmLogoutBtn) {
        confirmLogoutBtn.addEventListener('click', function () {
            // Clear session
            sessionStorage.clear();
            localStorage.clear();

            // Redirect to login page
            window.location.href = 'login.html';
        });
    }
});

// ============================================================
// GAP 2-GAP-1 FIX: FIFO Preview Functions
// Shows which raw material batches will be consumed before issuing
// ============================================================

async function previewFifoBatches() {
    try {
        // Use currentRecipeMaterials from recipe-based flow (check both local and window scope)
        const recipeMaterials = currentRecipeMaterials || window.currentRecipeMaterials || [];
        const materialsToPreview = [];
        
        console.log('Preview FIFO - Recipe Materials:', recipeMaterials);
        
        // Get the production quantity
        const quantityInput = document.getElementById('batchPlannedQuantity');
        const productionQty = parseFloat(quantityInput?.value) || 0;
        
        if (productionQty <= 0) {
            window.productionDashboard.showErrorMessage('Please enter a quantity to produce');
            return;
        }
        
        // Check if we have recipe materials loaded
        if (recipeMaterials && recipeMaterials.length > 0) {
            // Recipe-based flow: calculate materials from recipe
            for (const mat of recipeMaterials) {
                const perUnit = parseFloat(mat.quantity_per_unit) || 0;
                const totalNeeded = perUnit * productionQty;
                
                if (mat.raw_material_id && totalNeeded > 0) {
                    materialsToPreview.push({
                        raw_material_id: parseInt(mat.raw_material_id),
                        quantity_requested: totalNeeded,
                        material_name: mat.material_name || 'Unknown'
                    });
                }
            }
        } else {
            // Fallback: check for manual material rows (old approach)
            const materialRows = document.querySelectorAll('.material-row');
            for (const row of materialRows) {
                const materialId = row.querySelector('.material-select')?.value;
                const quantity = row.querySelector('.material-quantity')?.value;
                const materialName = row.querySelector('.material-select')?.selectedOptions[0]?.text || 'Unknown';

                if (materialId && quantity && parseFloat(quantity) > 0) {
                    materialsToPreview.push({
                        raw_material_id: parseInt(materialId),
                        quantity_requested: parseFloat(quantity),
                        material_name: materialName
                    });
                }
            }
        }

        if (materialsToPreview.length === 0) {
            window.productionDashboard.showErrorMessage('No recipe materials found. Please select a product with a valid recipe.');
            return;
        }

        // Call API to get FIFO preview
        const response = await axios.post('../api/ProductionAPI.php', {
            action: 'preview_fifo_allocation',
            materials: materialsToPreview
        }, {
            headers: { 'Content-Type': 'application/json' },
            withCredentials: true
        });

        const result = response.data;

        if (result.success) {
            displayFifoPreview(result.fifo_preview, result.total_production_cost || 0);
        } else {
            throw new Error(result.message || 'Failed to get FIFO preview');
        }
    } catch (error) {
        console.error('Error getting FIFO preview:', error);
        window.productionDashboard.showErrorMessage('Failed to preview FIFO: ' + (error.response?.data?.message || error.message));
    }
}

function displayFifoPreview(fifoPreview, totalProductionCost = 0) {
    const previewSection = document.getElementById('fifoPreviewSection');
    const previewContent = document.getElementById('fifoPreviewContent');

    if (!fifoPreview || fifoPreview.length === 0) {
        previewContent.innerHTML = '<p class="text-warning">No batch data available for preview.</p>';
        previewSection.classList.remove('d-none');
        return;
    }

    // Check for any near-expiry batches being used
    let hasNearExpiryWarning = false;
    fifoPreview.forEach(material => {
        material.batches?.forEach(batch => {
            if (batch.quantity_to_use > 0 && isNearExpiry(batch.expiry_date)) {
                hasNearExpiryWarning = true;
            }
        });
    });

    let html = '';

    // Production Cost Summary (NEW - Gap Fix)
    if (totalProductionCost > 0) {
        html += `
            <div class="alert alert-primary mb-3">
                <div class="d-flex justify-content-between align-items-center">
                    <span><i class="bi bi-calculator me-2"></i><strong>Estimated Production Cost</strong></span>
                    <span class="fs-5 fw-bold">₱${totalProductionCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                </div>
            </div>
        `;
    }

    // Near-Expiry Warning (NEW - Gap Fix)
    if (hasNearExpiryWarning) {
        html += `
            <div class="alert alert-warning mb-3">
                <i class="bi bi-exclamation-triangle me-2"></i>
                <strong>Expiry Warning:</strong> Some batches being used expire within 3 days. 
                This is normal for FIFO - oldest batches are used first to prevent spoilage.
            </div>
        `;
    }

    fifoPreview.forEach((material, index) => {
        const hasInsufficient = material.insufficient_stock;
        const statusClass = hasInsufficient ? 'danger' : 'success';
        const statusIcon = hasInsufficient ? 'exclamation-triangle' : 'check-circle';
        const materialCost = material.total_material_cost || 0;

        html += `
            <div class="mb-3 ${index > 0 ? 'border-top pt-3' : ''}">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <strong><i class="bi bi-box-seam"></i> ${material.material_name}</strong>
                    <div>
                        ${materialCost > 0 ? `<span class="badge bg-info me-2">₱${materialCost.toFixed(2)}</span>` : ''}
                        <span class="badge bg-${statusClass}">
                            <i class="bi bi-${statusIcon}"></i> 
                            ${hasInsufficient ? 'Insufficient Stock' : 'Stock Available'}
                        </span>
                    </div>
                </div>
                <small class="text-muted">Requested: ${material.quantity_requested} | Available: ${material.total_available || 0}</small>
                
                ${material.batches && material.batches.length > 0 ? `
                    <table class="table table-sm table-bordered mt-2 mb-0">
                        <thead class="table-light">
                            <tr>
                                <th style="width: 30px;">#</th>
                                <th>Batch Code</th>
                                <th>Received</th>
                                <th>Expiry</th>
                                <th>Available</th>
                                <th>To Use</th>
                                <th>Cost</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${material.batches.map((batch, bIdx) => {
            const nearExpiry = isNearExpiry(batch.expiry_date);
            const rowClass = batch.quantity_to_use > 0
                ? (nearExpiry ? 'table-warning' : 'table-success')
                : '';
            return `
                                    <tr class="${rowClass}">
                                        <td><span class="badge bg-primary">${bIdx + 1}</span></td>
                                        <td><code>${batch.batch_code || 'N/A'}</code></td>
                                        <td>${formatDate(batch.received_date)}</td>
                                        <td class="${nearExpiry ? 'text-danger fw-bold' : ''}">
                                            ${formatDate(batch.expiry_date) || 'N/A'}
                                            ${nearExpiry && batch.quantity_to_use > 0 ? '<i class="bi bi-exclamation-triangle text-warning ms-1" title="Near expiry"></i>' : ''}
                                        </td>
                                        <td>${batch.current_quantity}</td>
                                        <td><strong class="text-success">${batch.quantity_to_use || 0}</strong></td>
                                        <td>${batch.batch_cost > 0 ? '₱' + batch.batch_cost.toFixed(2) : '-'}</td>
                                    </tr>
                                `;
        }).join('')}
                        </tbody>
                    </table>
                ` : '<p class="text-muted mt-2 mb-0">No batches found for this material</p>'}
            </div>
        `;
    });

    previewContent.innerHTML = html;
    previewSection.classList.remove('d-none');
}

function hideFifoPreview() {
    document.getElementById('fifoPreviewSection').classList.add('d-none');
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isNearExpiry(dateStr) {
    if (!dateStr) return false;
    const expiry = new Date(dateStr);
    const today = new Date();
    const daysUntilExpiry = Math.floor((expiry - today) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 3;
}

// ============================================================
// GAP 2-GAP-3 & 2-GAP-4 FIX: Wastage Handling with Batch Linkage
// ============================================================

function toggleWasteReason() {
    const wasteQty = parseFloat(document.getElementById('wasteQuantity').value) || 0;
    const wasteReason = document.getElementById('wasteReason');
    const wasteReasonRequired = document.getElementById('wasteReasonRequired');
    const wasteBatchLinkSection = document.getElementById('wasteBatchLinkSection');

    if (wasteQty > 0) {
        wasteReason.disabled = false;
        wasteReason.required = true;
        wasteReasonRequired.classList.remove('d-none');
        wasteBatchLinkSection.style.display = 'block';

        // Load batch info for wastage linkage
        loadWastageBatchInfo();
    } else {
        wasteReason.disabled = true;
        wasteReason.required = false;
        wasteReason.value = '';
        wasteReasonRequired.classList.add('d-none');
        wasteBatchLinkSection.style.display = 'none';
    }
}

async function loadWastageBatchInfo() {
    const batchId = window.currentBatchId;
    if (!batchId) return;

    try {
        const response = await axios.get('../api/ProductionAPI.php', {
            params: {
                action: 'get_batch_materials_used',
                batch_id: batchId
            },
            withCredentials: true
        });

        if (response.data.success && response.data.materials) {
            const materials = response.data.materials;
            const wasteBatchList = document.getElementById('wasteBatchList');

            if (materials.length > 0) {
                wasteBatchList.innerHTML = materials.map(m =>
                    `<span class="badge bg-secondary me-1">${m.batch_code || 'N/A'}</span>`
                ).join('') + '<br><small class="text-muted">Wastage will be linked to these batches for traceability</small>';
            } else {
                wasteBatchList.innerHTML = '<span class="text-muted">No batch linkage data available</span>';
            }
        }
    } catch (error) {
        console.error('Error loading wastage batch info:', error);
    }
}

// Load materials used when opening complete batch modal
async function loadBatchMaterialsUsed(batchId) {
    const listElement = document.getElementById('batchMaterialsUsedList');
    if (!listElement) return;

    try {
        const response = await axios.get('../api/ProductionAPI.php', {
            params: {
                action: 'get_batch_materials_used',
                batch_id: batchId
            },
            withCredentials: true
        });

        if (response.data.success && response.data.materials) {
            const materials = response.data.materials;

            if (materials.length > 0) {
                listElement.innerHTML = materials.map(m => `
                    <div class="d-flex justify-content-between align-items-center py-1 border-bottom">
                        <span>
                            <i class="bi bi-box-seam text-primary"></i> ${m.material_name}
                            <code class="ms-2">${m.batch_code || 'N/A'}</code>
                        </span>
                        <span class="text-muted">${m.quantity_issued} ${m.unit || ''}</span>
                    </div>
                `).join('');
            } else {
                listElement.innerHTML = '<small class="text-muted">No materials recorded</small>';
            }
        }
    } catch (error) {
        console.error('Error loading batch materials:', error);
        listElement.innerHTML = '<small class="text-danger">Failed to load materials</small>';
    }
}

// ============================================================
// GAP 2-GAP-2 FIX: Batch Label Printing
// ============================================================

// Store for current label data
window.currentLabelData = null;

function showPrintLabelModal(batchNumber, productName, productionDate, expiryDate, batchId) {
    window.currentLabelData = {
        batchNumber,
        productName,
        productionDate,
        expiryDate,
        batchId
    };

    // Update label preview
    document.getElementById('labelProductName').textContent = productName || 'Product';
    document.getElementById('labelBatchCode').textContent = batchNumber || 'N/A';
    document.getElementById('labelBatchCodeSmall').textContent = batchNumber || 'N/A';
    document.getElementById('labelProdDate').textContent = formatDate(productionDate);
    document.getElementById('labelExpiryDate').textContent = formatDate(expiryDate);

    // Generate real scannable barcode using JsBarcode
    try {
        if (typeof JsBarcode !== 'undefined' && batchNumber) {
            JsBarcode("#labelBarcodeSvg", batchNumber, {
                format: "CODE128",
                width: 1.5, // Smaller width to fit in label container
                height: 40,
                displayValue: false, // We already show it below
                margin: 2,
                background: "#ffffff"
            });
        }
    } catch (e) {
        console.error('Barcode generation failed:', e);
        // Fallback: just show text
        document.getElementById('labelBarcodeContainer').innerHTML =
            `<div style="font-family: monospace; font-size: 14px; padding: 10px; background: #f0f0f0; border: 1px dashed #999;">${batchNumber}</div>`;
    }

    // Load raw material count for traceability info
    loadLabelTraceabilityInfo(batchId);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('printLabelModal'));
    modal.show();
}

async function loadLabelTraceabilityInfo(batchId) {
    try {
        const response = await axios.get('../api/ProductionAPI.php', {
            params: {
                action: 'get_batch_materials_used',
                batch_id: batchId
            },
            withCredentials: true
        });

        if (response.data.success && response.data.materials) {
            document.getElementById('labelRawMaterialCount').textContent =
                `${response.data.materials.length} raw material batch(es) used`;
        }
    } catch (error) {
        console.error('Error loading traceability info:', error);
    }
}

function printBatchLabel() {
    const labelContent = document.getElementById('labelPreview').innerHTML;
    const quantity = parseInt(document.getElementById('labelQuantity').value) || 1;
    const labelSize = document.getElementById('labelSize').value;

    // Set label dimensions based on size selection
    const sizes = {
        small: { width: '2in', height: '1in' },
        medium: { width: '3in', height: '2in' },
        large: { width: '4in', height: '3in' }
    };
    const size = sizes[labelSize] || sizes.medium;

    // Create print window
    const printWindow = window.open('', '_blank');

    let labelsHtml = '';
    for (let i = 0; i < quantity; i++) {
        labelsHtml += `
            <div class="label" style="width: ${size.width}; height: ${size.height}; border: 1px dashed #ccc; margin: 5px; padding: 10px; page-break-after: always;">
                ${labelContent}
            </div>
        `;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Batch Labels - ${window.currentLabelData?.batchNumber || 'Print'}</title>
            <style>
                @media print {
                    body { margin: 0; padding: 0; }
                    .label { page-break-after: always; border: none !important; }
                }
                body { font-family: Arial, sans-serif; }
                .label { display: inline-block; vertical-align: top; }
            </style>
        </head>
        <body>
            ${labelsHtml}
            <script>
                window.onload = function() { window.print(); window.close(); };
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

function downloadLabelPDF() {
    // For now, just trigger print which can save as PDF
    window.productionDashboard.showSuccessMessage('Use "Save as PDF" option in the print dialog to download as PDF');
    printBatchLabel();
}

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', function () {
    window.productionDashboard = new ProductionDashboard();
});
