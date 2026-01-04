class UserModal {
    constructor(userAPI) {
        this.userAPI = userAPI;
        this.modal = null;
        this.form = null;
        this.isEditMode = false;
        this.currentUserId = null;
        this.availableRoles = [];
        this.init();
    }
    
    async init() {
        this.modal = new bootstrap.Modal(document.getElementById('userModal'));
        this.form = document.getElementById('userForm');
        this.elements = {
            userId: document.getElementById('userId'),
            username: document.getElementById('username'),
            firstName: document.getElementById('firstName'),
            lastName: document.getElementById('lastName'),
            email: document.getElementById('email'),
            phone: document.getElementById('phone'),
            role: document.getElementById('role'),
            isActive: document.getElementById('isActive'),
            statusGroup: document.getElementById('statusGroup'),
            password: document.getElementById('password'),
            newPassword: document.getElementById('newPassword'),
            changePassword: document.getElementById('changePassword'),
            passwordGroup: document.getElementById('passwordGroup'),
            changePasswordGroup: document.getElementById('changePasswordGroup'),
            newPasswordGroup: document.getElementById('newPasswordGroup'),
            modalTitle: document.getElementById('userModalLabel'),
            saveBtn: document.getElementById('saveUserBtn')
        };
        
        // Load roles from server
        await this.loadRoles();
        
        this.attachEventListeners();
    }
    
    async loadRoles() {
        try {
            const response = await this.userAPI.getAllRoles();
            if (response.success && response.data) {
                this.availableRoles = response.data;
                this.populateRoleSelect();
            } else {
                console.error('Failed to load roles:', response);
                this.showFallbackRoles();
            }
        } catch (error) {
            console.error('Error loading roles:', error);
            this.showFallbackRoles();
        }
    }
    
    populateRoleSelect() {
        const roleSelect = this.elements.role;
        // Clear existing options except the placeholder
        roleSelect.innerHTML = '<option value="">Select Highland Fresh Role</option>';
        
        // Add role options from server
        this.availableRoles.forEach(role => {
            const option = document.createElement('option');
            option.value = role.role_name;
            option.textContent = role.role_name;
            if (role.description) {
                option.title = role.description;
            }
            roleSelect.appendChild(option);
        });
    }
    
    showFallbackRoles() {
        // Fallback to hardcoded roles if API fails
        this.availableRoles = [
            { role_name: 'Admin', description: 'System Administrator' },
            { role_name: 'Warehouse Manager', description: 'Warehouse Manager - Inventory Oversight & Approvals' },
            { role_name: 'Production Supervisor', description: 'Manages production batches and raw material conversion' },
            { role_name: 'Sales Officer', description: 'Sales Officer (Wholesale)' },
            { role_name: 'Warehouse Staff', description: 'Warehouse Staff - Inventory & Dispatch' }
        ];
        this.populateRoleSelect();
    }
    
    attachEventListeners() {
        this.elements.changePassword.addEventListener('change', (e) => {
            this.togglePasswordFields(e.target.checked);
        });
        ['username', 'firstName', 'lastName', 'email', 'phone', 'role', 'isActive', 'password', 'newPassword'].forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                let inputTimer;
                if (fieldId === 'role' || fieldId === 'isActive') {
                    field.addEventListener('change', (e) => {
                        this.validateField(e.target);
                    });
                } else if (fieldId === 'email') {
                    field.addEventListener('input', (e) => {
                        e.target.classList.remove('is-valid', 'is-invalid');
                        clearTimeout(inputTimer);
                        inputTimer = setTimeout(() => {
                            this.validateField(e.target);
                        }, 500);
                    });
                } else {
                    field.addEventListener('input', (e) => {
                        e.target.classList.remove('is-valid', 'is-invalid');
                        clearTimeout(inputTimer);
                        inputTimer = setTimeout(() => {
                            this.validateField(e.target);
                        }, 200);
                    });
                }
                field.addEventListener('blur', (e) => {
                    clearTimeout(inputTimer);
                    this.validateField(e.target);
                });
            }
        });
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
        });
        document.getElementById('userModal').addEventListener('hidden.bs.modal', () => {
            this.resetForm();
        });
    }
    openAddModal() {
        this.isEditMode = false;
        this.currentUserId = null;
        this.elements.modalTitle.textContent = 'Add User';
        this.elements.saveBtn.innerHTML = '<i class="bi bi-plus-circle"></i> Add User';
        this.elements.passwordGroup.classList.remove('d-none');
        this.elements.changePasswordGroup.classList.add('d-none');
        this.elements.newPasswordGroup.classList.add('d-none');
        this.elements.password.required = true;
        this.elements.statusGroup.classList.add('d-none');
        this.elements.isActive.value = '1'; 
        this.resetForm();
        setTimeout(() => {
            this.clearValidation();
        }, 100);
        this.modal.show();
        setTimeout(() => {
            this.elements.username.focus();
        }, 300);
    }
    openEditModal(user) {
        this.isEditMode = true;
        this.currentUserId = user.user_id;
        this.elements.modalTitle.textContent = 'Edit User';
        this.elements.saveBtn.innerHTML = '<i class="bi bi-pencil"></i> Update User';
        this.elements.passwordGroup.classList.add('d-none');
        this.elements.changePasswordGroup.classList.remove('d-none');
        this.elements.password.required = false;
        this.elements.statusGroup.classList.remove('d-none');
        this.populateForm(user);
        setTimeout(() => {
            this.clearValidation();
        }, 100);
        this.modal.show();
        setTimeout(() => {
            this.elements.username.focus();
        }, 300);
    }
    populateForm(user) {
        this.elements.userId.value = user.user_id;
        this.elements.username.value = user.username;
        this.elements.firstName.value = user.first_name || '';
        this.elements.lastName.value = user.last_name || '';
        this.elements.email.value = user.email || '';
        this.elements.phone.value = user.phone || '';
        const roleMapping = {
            'Admin': 'Admin',
            'Sales': 'Sales Officer',
            'Cashier': 'Sales Officer',
            'Sales Officer': 'Sales Officer',
            'Inventory': 'Warehouse Staff',
            'Warehouse Staff': 'Warehouse Staff',
            'Production Supervisor': 'Production Supervisor'
        };
        this.elements.role.value = roleMapping[user.role] || '';
        this.elements.isActive.value = user.is_active ? '1' : '0';
        this.elements.changePassword.checked = false;
        this.togglePasswordFields(false);
        this.clearValidation();
    }
    togglePasswordFields(show) {
        if (show) {
            this.elements.newPasswordGroup.classList.remove('d-none');
            this.elements.newPassword.required = true;
        } else {
            this.elements.newPasswordGroup.classList.add('d-none');
            this.elements.newPassword.required = false;
            this.elements.newPassword.value = '';
            this.elements.newPassword.classList.remove('is-valid', 'is-invalid');
        }
    }
    getFormData() {
        const data = {
            username: this.elements.username.value.trim(),
            first_name: this.elements.firstName.value.trim(),
            last_name: this.elements.lastName.value.trim(),
            email: this.elements.email.value.trim(),
            phone: this.elements.phone.value.trim(),
            role: this.elements.role.value
        };
        if (!this.isEditMode) {
            data.is_active = 1; 
            data.password = this.elements.password.value.trim();
        } else {
            if (!this.elements.statusGroup.classList.contains('d-none')) {
                data.is_active = this.elements.isActive.value;
            }
            if (this.elements.changePassword.checked) {
                data.password = this.elements.newPassword.value.trim();
            }
        }
        return data;
    }
    validateForm() {
        const formData = this.getFormData();
        this.clearValidation();
        let allValid = true;
        const errors = [];
        if (!formData.username || formData.username.length < 3) {
            errors.push('Username must be at least 3 characters long');
            this.elements.username.classList.add('is-invalid');
            allValid = false;
        } else if (formData.username.length > 50) {
            errors.push('Username must be less than 50 characters');
            this.elements.username.classList.add('is-invalid');
            allValid = false;
        } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
            errors.push('Username can only contain letters, numbers, hyphens, and underscores');
            this.elements.username.classList.add('is-invalid');
            allValid = false;
        } else {
            this.elements.username.classList.add('is-valid');
        }
        
        const validRoles = this.availableRoles.map(r => r.role_name);
        if (!formData.role || !validRoles.includes(formData.role)) {
            errors.push('Please select a valid role');
            this.elements.role.classList.add('is-invalid');
            allValid = false;
        } else {
            this.elements.role.classList.add('is-valid');
        }
        if (!this.isEditMode) {
            if (!formData.password || formData.password.length < 8) {
                errors.push('Password must be at least 8 characters long');
                this.elements.password.classList.add('is-invalid');
                allValid = false;
            } else if (!this.validatePasswordComplexity(formData.password)) {
                errors.push('Password must contain at least one lowercase letter, one uppercase letter, and one number');
                this.elements.password.classList.add('is-invalid');
                allValid = false;
            } else {
                this.elements.password.classList.add('is-valid');
            }
        } else if (this.elements.changePassword.checked) {
            if (!formData.password || formData.password.length < 8) {
                errors.push('New password must be at least 8 characters long');
                this.elements.newPassword.classList.add('is-invalid');
                allValid = false;
            } else if (!this.validatePasswordComplexity(formData.password)) {
                errors.push('New password must contain at least one lowercase letter, one uppercase letter, and one number');
                this.elements.newPassword.classList.add('is-invalid');
                allValid = false;
            } else {
                this.elements.newPassword.classList.add('is-valid');
            }
        }
        if (!allValid && errors.length > 0) {
            console.error('Validation errors:', errors);
        }
        return allValid;
    }
    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        field.classList.remove('is-valid', 'is-invalid');
        if (value.length === 0 && !field.required) {
            return true;
        }
        switch (field.id) {
            case 'username':
                isValid = value.length >= 3 && value.length <= 50 && /^[a-zA-Z0-9_-]+$/.test(value);
                break;
            case 'email':
                if (value.length > 0) {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    isValid = emailRegex.test(value);
                }
                break;
            case 'phone':
                if (value.length > 0) {
                    isValid = value.length <= 20 && /^[\d\s\-\+\(\)]+$/.test(value);
                }
                break;
            case 'password':
            case 'newPassword':
                isValid = value.length >= 8 && 
                         /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value);
                break;
            case 'role':
                const validRoles = this.availableRoles.map(r => r.role_name);
                isValid = validRoles.includes(value);
                break;
            case 'isActive':
                isValid = ['0', '1'].includes(value);
                break;
        }
        if (isValid && (value.length > 0 || field.required)) {
            field.classList.add('is-valid');
            field.classList.remove('is-invalid');
        } else if (!isValid && value.length > 0) {
            field.classList.add('is-invalid');
            field.classList.remove('is-valid');
        }
        return isValid;
    }
    showValidationErrors(errors) {
        this.clearValidation();
        if (errors.length > 0) {
            const firstError = errors[0];
            if (firstError.toLowerCase().includes('username')) {
                this.elements.username.classList.add('is-invalid');
            } else if (firstError.toLowerCase().includes('password')) {
                const passwordField = this.isEditMode && this.elements.changePassword.checked ? 
                    this.elements.newPassword : this.elements.password;
                passwordField.classList.add('is-invalid');
            } else if (firstError.toLowerCase().includes('role')) {
                this.elements.role.classList.add('is-invalid');
            }
        }
    }
    clearValidation() {
        const fields = [this.elements.username, this.elements.role, this.elements.password, this.elements.newPassword];
        fields.forEach(field => {
            field.classList.remove('is-valid', 'is-invalid');
        });
    }
    resetForm() {
        this.form.reset();
        this.clearValidation();
        this.elements.changePassword.checked = false;
        this.togglePasswordFields(false);
        this.currentUserId = null;
        this.isEditMode = false;
        this.elements.password.required = false;
        this.elements.newPassword.required = false;
    }
    setLoading(loading) {
        try {
            const spinner = document.getElementById('saveSpinner');
            const saveBtn = document.getElementById('saveUserBtn');
            console.log('setLoading called with:', loading, { 
                spinnerFound: !!spinner, 
                saveBtnFound: !!saveBtn 
            });
            if (spinner) {
                if (loading) {
                    spinner.classList.remove('d-none');
                } else {
                    spinner.classList.add('d-none');
                }
            } else {
                console.error('Spinner element with ID "saveSpinner" not found');
            }
            if (saveBtn) {
                saveBtn.disabled = loading;
            } else {
                console.error('Save button with ID "saveUserBtn" not found');
            }
        } catch (error) {
            console.error('Error in setLoading:', error);
        }
    }
    validatePasswordComplexity(password) {
        const hasLower = /[a-z]/.test(password);
        const hasUpper = /[A-Z]/.test(password);
        const hasNumber = /\d/.test(password);
        return hasLower && hasUpper && hasNumber;
    }
    hide() {
        this.modal.hide();
    }
}
window.openAddUserModal = function() {
    console.log('openAddUserModal called');
    if (window.userManager && window.userManager.modal) {
        window.userManager.modal.openAddModal();
    } else {
        console.error('userManager or modal not available');
    }
};
window.saveUser = function() {
    console.log('saveUser global function called');
    if (window.userManager) {
        window.userManager.saveUser();
    } else {
        console.error('userManager not available');
    }
};
window.UserModal = UserModal;