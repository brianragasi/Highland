class UserRenderer {
    constructor() {
        this.tableBody = document.getElementById('usersTableBody');
        this.loadingSpinner = document.getElementById('loadingSpinner');
        this.emptyState = document.getElementById('emptyState');
        this.alertContainer = document.getElementById('alertContainer');
        this.animationDelay = 50; 
    }
    renderUsers(users) {
        this.hideLoading();
        if (!users || users.length === 0) {
            this.showEmptyState();
            return;
        }
        this.hideEmptyState();
        this.tableBody.innerHTML = '';
        users.forEach((user, index) => {
            const row = this.createUserRow(user);
            this.tableBody.appendChild(row);
            setTimeout(() => {
                row.style.opacity = '1';
                row.style.transform = 'translateY(0)';
            }, index * this.animationDelay);
        });
    }
    createUserRow(user) {
        const row = document.createElement('tr');
        row.style.opacity = '0';
        row.style.transform = 'translateY(20px)';
        row.style.transition = 'all 0.3s ease';
        row.setAttribute('data-user-id', user.user_id);
        const createdAt = new Date(user.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        const lastLogin = user.last_login 
            ? new Date(user.last_login).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
            : 'Never';
        const roleBadgeClass = this.getRoleBadgeClass(user.role);
        const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || '-';
        row.innerHTML = `
            <td>
                <div class="d-flex align-items-center">
                    <i class="bi bi-person-circle text-success me-2"></i>
                    <strong>${this.escapeHtml(user.username)}</strong>
                </div>
            </td>
            <td>${this.escapeHtml(fullName)}</td>
            <td>
                ${user.email ? `<small>${this.escapeHtml(user.email)}</small>` : '-'}
            </td>
            <td>
                <span class="badge ${roleBadgeClass}">
                    <i class="bi bi-shield-check me-1"></i>${this.escapeHtml(user.role)}
                </span>
            </td>
            <td>
                <span class="badge ${user.is_active ? 'bg-success' : 'bg-secondary'}">
                    <i class="bi ${user.is_active ? 'bi-check-circle' : 'bi-pause-circle'} me-1"></i>
                    ${user.is_active ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>
                <small class="text-muted">
                    <i class="bi bi-clock me-1"></i>${lastLogin}
                </small>
            </td>
            <td>
                <div class="btn-group btn-group-sm" role="group">
                    <button type="button" class="btn btn-outline-primary" 
                            onclick="editUser(${user.user_id})" 
                            title="Edit Highland Fresh User">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button type="button" class="btn btn-outline-danger" 
                            onclick="deleteUser(${user.user_id}, '${this.escapeHtml(user.username)}')" 
                            title="Delete User">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;
        return row;
    }
    getRoleBadgeClass(role) {
        switch (role) {
            case 'Admin':
                return 'bg-danger'; 
            case 'Warehouse Manager':
                return 'bg-info text-white';
            case 'Cashier':
            case 'Sales': 
            case 'Sales Officer':
                return 'bg-primary'; 
            case 'Warehouse Staff':
                return 'bg-success'; 
            case 'Production Supervisor':
                return 'bg-warning text-dark'; 
            default:
                return 'bg-light text-dark'; 
        }
    }
    updateUserRow(user) {
        const existingRow = this.tableBody.querySelector(`tr[data-user-id="${user.user_id}"]`);
        if (existingRow) {
            const newRow = this.createUserRow(user);
            newRow.style.opacity = '1';
            newRow.style.transform = 'translateY(0)';
            newRow.classList.add('table-warning');
            setTimeout(() => {
                newRow.classList.remove('table-warning');
            }, 2000);
            existingRow.replaceWith(newRow);
        }
    }
    removeUserRow(userId) {
        const row = this.tableBody.querySelector(`tr[data-user-id="${userId}"]`);
        if (row) {
            const rowHeight = row.offsetHeight;
            row.style.height = rowHeight + 'px';
            row.style.overflow = 'hidden';
            row.style.transition = 'opacity 0.3s ease-out, height 0.4s ease-out, padding 0.4s ease-out';
            row.offsetHeight;
            row.style.opacity = '0';
            row.style.height = '0';
            row.style.paddingTop = '0';
            row.style.paddingBottom = '0';
            setTimeout(() => {
                row.remove();
                if (this.tableBody.children.length === 0) {
                    this.showEmptyState();
                }
            }, 450); 
        }
    }
    addUserRow(user) {
        this.hideEmptyState();
        const newRow = this.createUserRow(user);
        this.tableBody.appendChild(newRow);
        setTimeout(() => {
            newRow.style.opacity = '1';
            newRow.style.transform = 'translateY(0)';
        }, 100);
    }
    showLoading() {
        this.loadingSpinner.classList.remove('d-none');
        this.hideEmptyState();
    }
    hideLoading() {
        this.loadingSpinner.classList.add('d-none');
    }
    showEmptyState() {
        this.emptyState.classList.remove('d-none');
        this.tableBody.innerHTML = '';
    }
    hideEmptyState() {
        this.emptyState.classList.add('d-none');
    }
    showSuccess(message) {
        this.showToast(message, 'success');
    }
    showError(message) {
        this.showToast(message, 'danger');
    }
    showToast(message, type = 'info') {
        const toastId = 'toast-' + Date.now();
        const iconClass = this.getToastIcon(type);
        const toastHTML = `
            <div id="${toastId}" class="toast align-items-center text-white bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="bi bi-${iconClass} me-2"></i>
                        ${this.escapeHtml(message)}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
            </div>
        `;
        this.alertContainer.insertAdjacentHTML('beforeend', toastHTML);
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, {
            autohide: true,
            delay: type === 'danger' ? 8000 : 5000
        });
        toast.show();
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }
    getToastIcon(type) {
        switch (type) {
            case 'success':
                return 'check-circle-fill';
            case 'danger':
                return 'exclamation-triangle-fill';
            case 'warning':
                return 'exclamation-triangle-fill';
            case 'info':
            default:
                return 'info-circle-fill';
        }
    }
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    clear() {
        this.tableBody.innerHTML = '';
        this.hideEmptyState();
        this.showLoading();
    }
    getUserFromRow(userId) {
        const row = this.tableBody.querySelector(`tr[data-user-id="${userId}"]`);
        if (!row) return null;
        const cells = row.querySelectorAll('td');
        return {
            user_id: parseInt(userId),
            username: cells[1].querySelector('strong').textContent,
            role: cells[2].querySelector('.badge').textContent,
            created_at: cells[3].querySelector('small').textContent
        };
    }
}
window.UserRenderer = UserRenderer;