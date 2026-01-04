class CategoryManager {
    constructor(productAPI) {
        this.api = productAPI || new ProductAPI();
        this.categories = [];
        this.categoryRenderer = null;
        this.categoryModal = null;
        this.init();
    }
    init() {
        this.initializeElements();
        this.initializeComponents();
        this.attachEventListeners();
        this.loadCategories();
        this.setupGlobalFunctions();
        console.log('CategoryManager initialized successfully');
    }
    initializeElements() {
        this.modal = document.getElementById('categoryModal');
        this.deleteModal = document.getElementById('deleteCategoryModal');
        this.categoriesTableBody = document.getElementById('categoriesTableBody');
        this.categoryForm = document.getElementById('categoryForm');
        this.searchInput = document.getElementById('categorySearch');
        this.statusFilter = document.getElementById('categoryStatusFilter');
        if (!this.modal) {
            console.warn('Category modal not found in DOM');
        }
    }
    initializeComponents() {
        if (!this.categoryRenderer) {
            this.categoryRenderer = new CategoryRenderer();
        }
        if (!this.categoryModal) {
            this.categoryModal = new CategoryModal(this.api, this.categoryRenderer);
        }
    }
    attachEventListeners() {
        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => this.applyFilters());
        }
        if (this.statusFilter) {
            this.statusFilter.addEventListener('change', () => this.applyFilters());
        }
        if (this.modal) {
            this.modal.addEventListener('show.bs.modal', () => this.onModalShow());
            this.modal.addEventListener('hidden.bs.modal', () => this.onModalHide());
        }
        document.addEventListener('categoryCreated', (e) => this.onCategoryCreated(e.detail));
        document.addEventListener('categoryUpdated', (e) => this.onCategoryUpdated(e.detail));
        document.addEventListener('categoryDeleted', (e) => this.onCategoryDeleted(e.detail));
    }
    setupGlobalFunctions() {
        window.openCategoryManagementModal = () => this.openModal();
        window.refreshCategoriesList = () => this.loadCategories();
        window.switchToCategoryForm = () => this.openAddCategoryModal();
        window.switchToCategoriesList = () => this.switchToList();
        window.resetCategoryForm = () => this.resetForm();
        window.editCategory = (categoryId) => {
            if (this.categoryModal && typeof this.categoryModal.editCategory === 'function') {
                this.categoryModal.editCategory(categoryId);
            } else {
                this.editCategory(categoryId);
            }
        };
        window.confirmDeleteCategory = (categoryId, categoryName, productCount, subcategoryCount) => 
            this.confirmDeleteCategory(categoryId, categoryName, productCount, subcategoryCount);
    }
    async loadCategories() {
        console.log('Loading categories with statistics...');
        try {
            this.showLoadingState();
            const categoriesData = await this.api.loadCategoriesWithStats();
            this.categories = categoriesData || [];
            console.log('Categories loaded:', this.categories);
            this.categoryRenderer.renderCategoriesTable(this.categories);
            document.dispatchEvent(new CustomEvent('categoriesLoaded', {
                detail: { categories: this.categories }
            }));
        } catch (error) {
            console.error('Failed to load categories:', error);
            this.showAlert('danger', 'Failed to load categories: ' + error.message);
            this.categoryRenderer.showEmptyState();
        } finally {
            this.hideLoadingState();
        }
    }
    openModal() {
        if (this.modal && window.bootstrap) {
            const bsModal = new bootstrap.Modal(this.modal);
            bsModal.show();
        }
    }
    openAddCategoryModal() {
        this.resetForm();
        this.switchToForm();
    }
    async editCategory(categoryId) {
        console.log('Editing category:', categoryId);
        try {
            const category = this.categories.find(cat => cat.category_id === categoryId);
            if (!category) {
                throw new Error('Category not found');
            }
            this.setEditMode(true, categoryId);
            this.populateForm(category);
            this.switchToForm();
        } catch (error) {
            console.error('Failed to edit category:', error);
            this.showAlert('danger', 'Failed to load category for editing: ' + error.message);
        }
    }
    confirmDeleteCategory(categoryId, categoryName, productCount) {
        if (this.categoryModal) {
            this.categoryModal.confirmDeleteCategory(categoryId, categoryName, productCount);
        }
    }
    populateForm(category) {
        const form = this.categoryForm;
        if (!form) return;
        form.querySelector('#categoryId').value = category.category_id || '';
        form.querySelector('#categoryName').value = category.category_name || '';
        form.querySelector('#categoryDescription').value = category.description || '';
        form.querySelector('#categoryActive').checked = Boolean(category.is_active);
    }
    setEditMode(isEdit, categoryId = null) {
        this.isEditMode = isEdit;
        this.currentCategoryId = categoryId;
        if (this.categoryModal) {
            this.categoryModal.isEditMode = isEdit;
            this.categoryModal.currentCategoryId = categoryId;
            if (typeof this.categoryModal.updateFormTitle === 'function') {
                this.categoryModal.updateFormTitle();
            }
        }
        const saveText = document.getElementById('saveCategoryText');
        const tabButton = document.getElementById('add-category-tab');
        if (isEdit) {
            if (saveText) saveText.textContent = 'Update Category';
            if (tabButton) tabButton.innerHTML = '<i class="bi bi-pencil"></i> Edit Category';
        } else {
            if (saveText) saveText.textContent = 'Save Category';
            if (tabButton) tabButton.innerHTML = '<i class="bi bi-plus-circle"></i> Add Category';
        }
    }
    resetForm() {
        if (this.categoryForm) {
            this.categoryForm.reset();
            this.categoryForm.classList.remove('was-validated');
            this.categoryForm.querySelectorAll('.is-valid, .is-invalid').forEach(input => {
                input.classList.remove('is-valid', 'is-invalid');
            });
        }
        this.setEditMode(false);
    }
    switchToList() {
        const listTab = document.getElementById('categories-list-tab');
        if (listTab && window.bootstrap) {
            const tab = new bootstrap.Tab(listTab);
            tab.show();
        }
    }
    switchToForm() {
        const formTab = document.getElementById('add-category-tab');
        if (formTab && window.bootstrap) {
            const tab = new bootstrap.Tab(formTab);
            tab.show();
        }
    }
    applyFilters() {
        const searchTerm = this.searchInput?.value || '';
        const statusFilter = this.statusFilter?.value || '';
        if (this.categoryRenderer) {
            this.categoryRenderer.filterCategoriesTable(searchTerm, statusFilter);
        }
    }
    showLoadingState() {
        if (this.categoryRenderer) {
            this.categoryRenderer.showLoadingState();
        }
    }
    hideLoadingState() {
        if (this.categoryRenderer) {
            this.categoryRenderer.hideLoadingState();
        }
    }
    onModalShow() {
        this.loadCategories();
    }
    onModalHide() {
        this.resetForm();
    }
    onCategoryCreated(categoryData) {
        console.log('Category created event received:', categoryData);
        setTimeout(() => {
            this.loadCategories();
        }, 100);
    }
    onCategoryUpdated(categoryData) {
        console.log('Category updated event received:', categoryData);
        setTimeout(() => {
            this.loadCategories();
        }, 100);
    }
    onCategoryDeleted(categoryData) {
        console.log('Category deleted event received:', categoryData);
        this.loadCategories(); 
    }
    showAlert(type, message) {
        if (window.showAlert) {
            window.showAlert(type, message);
        } else if (window.APIResponseHandler && window.APIResponseHandler.showToast) {
            window.APIResponseHandler.showToast(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
    getCategories() {
        return this.categories;
    }
    getCategoryById(categoryId) {
        return this.categories.find(cat => cat.category_id === categoryId) || null;
    }
    canManageCategories() {
        const userRole = window.currentUserRole || sessionStorage.getItem('userRole') || localStorage.getItem('userRole');
        return userRole === 'Admin' || userRole === 'Warehouse Manager';
    }
    refreshProductCategoryDropdowns() {
        const categorySelects = document.querySelectorAll('select[name*="category"], select[id*="category"]');
        categorySelects.forEach(async (select) => {
            const currentValue = select.value;
            try {
                const categories = await this.api.loadCategories();
                const firstOption = select.querySelector('option[value=""]');
                select.innerHTML = '';
                if (firstOption) {
                    select.appendChild(firstOption);
                }
                categories.forEach(category => {
                    if (category.is_active) {
                        const option = document.createElement('option');
                        option.value = category.category_id;
                        option.textContent = category.category_name;
                        select.appendChild(option);
                    }
                });
                if (currentValue && select.querySelector(`option[value="${currentValue}"]`)) {
                    select.value = currentValue;
                }
            } catch (error) {
                console.error('Failed to refresh category dropdown:', error);
            }
        });
    }
}
window.CategoryManager = CategoryManager;