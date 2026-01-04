class PlantOperationsDashboard {
    constructor() {
        this.apiBaseUrl = '../api/PlantOperationsAPI.php';
        this.refreshInterval = 60000; 
        this.init();
    }
    init() {
        this.loadDailyMetrics();
        this.startAutoRefresh();
        this.setupEventListeners();
    }
    setupEventListeners() {
        const refreshBtn = document.getElementById('refreshMetrics');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadDailyMetrics());
        }
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('view-details-btn')) {
                const section = e.target.dataset.section;
                this.showDetailModal(section);
            }
        });
    }
    async loadDailyMetrics() {
        try {
            this.showLoading(true);
            const response = await axios.get(this.apiBaseUrl, {
                params: { action: 'daily_metrics' },
                withCredentials: true
            });
            const result = response.data;
            if (result.success) {
                this.renderDashboard(result.data);
                this.updateLastRefresh();
            } else {
                this.showError('Failed to load plant metrics: ' + result.message);
            }
        } catch (error) {
            console.error('Error loading plant metrics:', error);
            this.showError('Network error while loading plant metrics');
        } finally {
            this.showLoading(false);
        }
    }
    renderDashboard(data) {
        this.renderMilkReceived(data.milk_received);
        this.renderProduction(data.production_summary);
        this.renderCapacityUtilization(data.capacity_utilization);
        this.renderQualityStatus(data.quality_status);
        this.renderEquipmentStatus(data.equipment_status);
        this.renderStaffAttendance(data.staff_attendance);
        this.renderAlerts(data.alerts);
    }
    renderMilkReceived(data) {
        const container = document.getElementById('milkReceivedMetrics');
        if (!container) return;
        const statusClass = data.percentage_of_target >= 100 ? 'text-success' : 'text-warning';
        container.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <div class="metric-card">
                        <h6 class="metric-title">Today's Milk Received</h6>
                        <div class="metric-value ${statusClass}">
                            ${data.total_liters}L
                        </div>
                        <div class="metric-subtitle">
                            Target: ${data.target_liters}L (${data.percentage_of_target}%)
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="metric-card">
                        <h6 class="metric-title">Cooperatives</h6>
                        ${data.cooperatives.map(coop => `
                            <div class="cooperative-item">
                                <strong>${coop.name}</strong><br>
                                ${coop.liters}L - Grade ${coop.quality_grade} - ${coop.time_received}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            <div class="text-muted small mt-2">
                Last updated: ${data.last_updated}
            </div>
        `;
    }
    renderProduction(data) {
        const container = document.getElementById('productionMetrics');
        if (!container) return;
        container.innerHTML = `
            <div class="row">
                <div class="col-md-4">
                    <div class="metric-card">
                        <h6 class="metric-title">Total Processed</h6>
                        <div class="metric-value text-primary">${data.total_processed}L</div>
                        <div class="metric-subtitle">Efficiency: ${data.efficiency_rate}%</div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="metric-card">
                        <h6 class="metric-title">Waste Percentage</h6>
                        <div class="metric-value ${data.waste_percentage <= 2 ? 'text-success' : 'text-warning'}">
                            ${data.waste_percentage}%
                        </div>
                        <div class="metric-subtitle">Target: < 2%</div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="metric-card">
                        <h6 class="metric-title">Products in Progress</h6>
                        <div class="metric-value text-info">${data.products.length}</div>
                        <div class="metric-subtitle">Production lines</div>
                    </div>
                </div>
            </div>
            <div class="mt-3">
                <h6>Production Status</h6>
                <div class="production-items">
                    ${data.products.map(product => `
                        <div class="production-item d-flex justify-content-between align-items-center">
                            <div>
                                <strong>${product.name}</strong><br>
                                <small>${product.units_produced} units (${product.liters_used}L)</small>
                            </div>
                            <span class="badge bg-${this.getStatusColor(product.status)}">${product.status}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    renderCapacityUtilization(data) {
        const container = document.getElementById('capacityMetrics');
        if (!container) return;
        container.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <div class="metric-card">
                        <h6 class="metric-title">Plant Utilization</h6>
                        <div class="metric-value text-primary">${data.current_utilization}%</div>
                        <div class="progress mt-2">
                            <div class="progress-bar" style="width: ${data.current_utilization}%"></div>
                        </div>
                        <div class="metric-subtitle mt-1">
                            ${data.current_production}L / ${data.max_daily_capacity}L capacity
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="metric-card">
                        <h6 class="metric-title">Equipment Utilization</h6>
                        ${data.equipment_utilization.map(eq => `
                            <div class="equipment-item d-flex justify-content-between">
                                <span>${eq.equipment}</span>
                                <span class="text-${eq.utilization >= 80 ? 'success' : 'warning'}">
                                    ${eq.utilization}%
                                </span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    renderQualityStatus(data) {
        const container = document.getElementById('qualityMetrics');
        if (!container) return;
        container.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <div class="metric-card">
                        <h6 class="metric-title">Quality Test Results</h6>
                        <div class="metric-value text-success">${data.pass_rate}%</div>
                        <div class="metric-subtitle">
                            ${data.tests_passed}/${data.tests_completed} tests passed
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="metric-card">
                        <h6 class="metric-title">Recent Tests</h6>
                        ${data.recent_tests.map(test => `
                            <div class="test-item d-flex justify-content-between">
                                <div>
                                    <strong>${test.test_type}</strong><br>
                                    <small>${test.batch}</small>
                                </div>
                                <div class="text-end">
                                    <span class="badge bg-${test.result === 'Pass' ? 'success' : 'danger'}">
                                        ${test.result}
                                    </span><br>
                                    <small>${test.time}</small>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    renderEquipmentStatus(data) {
        const container = document.getElementById('equipmentMetrics');
        if (!container) return;
        container.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <div class="metric-card">
                        <h6 class="metric-title">Equipment Overview</h6>
                        <div class="equipment-overview">
                            <div class="d-flex justify-content-between">
                                <span>Operational:</span>
                                <span class="text-success">${data.operational}/${data.total_equipment}</span>
                            </div>
                            <div class="d-flex justify-content-between">
                                <span>Maintenance:</span>
                                <span class="text-warning">${data.maintenance}</span>
                            </div>
                            <div class="d-flex justify-content-between">
                                <span>Offline:</span>
                                <span class="text-danger">${data.offline}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="metric-card">
                        <h6 class="metric-title">Equipment Status</h6>
                        ${data.equipment_list.map(eq => `
                            <div class="equipment-item d-flex justify-content-between align-items-center">
                                <div>
                                    <strong>${eq.name}</strong><br>
                                    <small>${eq.temperature || eq.speed || eq.issue || 'Normal operation'}</small>
                                </div>
                                <span class="badge bg-${this.getEquipmentStatusColor(eq.status)}">
                                    ${eq.status}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    renderStaffAttendance(data) {
        const container = document.getElementById('staffMetrics');
        if (!container) return;
        container.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <div class="metric-card">
                        <h6 class="metric-title">Today's Attendance</h6>
                        <div class="metric-value ${data.attendance_rate >= 90 ? 'text-success' : 'text-warning'}">
                            ${data.attendance_rate}%
                        </div>
                        <div class="metric-subtitle">
                            ${data.present}/${data.total_staff} staff present
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="metric-card">
                        <h6 class="metric-title">Shift Attendance</h6>
                        ${data.shifts.map(shift => `
                            <div class="shift-item d-flex justify-content-between">
                                <div>
                                    <strong>${shift.shift}</strong><br>
                                    <small>${shift.present}/${shift.scheduled} present</small>
                                </div>
                                <span class="${shift.rate >= 90 ? 'text-success' : 'text-warning'}">
                                    ${shift.rate}%
                                </span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    renderAlerts(alerts) {
        const container = document.getElementById('alertsSection');
        if (!container) return;
        if (alerts.length === 0) {
            container.innerHTML = '<div class="alert alert-success">No alerts at this time</div>';
            return;
        }
        container.innerHTML = alerts.map(alert => `
            <div class="alert alert-${this.getAlertTypeClass(alert.type)} alert-dismissible fade show">
                <div class="d-flex justify-content-between">
                    <div>
                        <strong>${alert.priority.toUpperCase()}</strong> - ${alert.message}
                    </div>
                    <small>${alert.time}</small>
                </div>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `).join('');
    }
    getStatusColor(status) {
        switch (status.toLowerCase()) {
            case 'completed': return 'success';
            case 'in progress': return 'primary';
            case 'queued': return 'secondary';
            default: return 'info';
        }
    }
    getEquipmentStatusColor(status) {
        switch (status.toLowerCase()) {
            case 'operational': return 'success';
            case 'maintenance': return 'warning';
            case 'offline': return 'danger';
            default: return 'secondary';
        }
    }
    getAlertTypeClass(type) {
        switch (type.toLowerCase()) {
            case 'success': return 'success';
            case 'warning': return 'warning';
            case 'error': return 'danger';
            default: return 'info';
        }
    }
    startAutoRefresh() {
        setInterval(() => {
            this.loadDailyMetrics();
        }, this.refreshInterval);
    }
    updateLastRefresh() {
        const refreshElement = document.getElementById('lastRefresh');
        if (refreshElement) {
            refreshElement.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
        }
    }
    showLoading(show) {
        const loadingElement = document.getElementById('loadingSpinner');
        if (loadingElement) {
            loadingElement.style.display = show ? 'block' : 'none';
        }
    }
    showError(message) {
        console.error(message);
        const alertContainer = document.getElementById('alertsSection');
        if (alertContainer) {
            const errorAlert = `
                <div class="alert alert-danger alert-dismissible fade show">
                    ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            `;
            alertContainer.insertAdjacentHTML('afterbegin', errorAlert);
        }
    }
    async showDetailModal(section) {
        console.log(`Showing details for: ${section}`);
    }
}
window.PlantOperationsDashboard = PlantOperationsDashboard;