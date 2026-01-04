class ProductAPI {
    constructor() {
        this.baseUrl = APIResponseHandler.getApiUrl('ProductsAPI.php');
        this.#configureAxios();
    }
    #configureAxios() {
        axios.defaults.withCredentials = true;
    }
    async loadAll() {
        console.log('Loading products from API:', this.baseUrl);
        try {
            const response = await axios.get(this.baseUrl + '?include_highland_fresh=true');
            if (response.data.success) {
                console.log('Products loaded successfully:', response.data.data);
                return response.data.data;
            } else {
                throw new Error(response.data.message || 'Failed to load products');
            }
        } catch (error) {
            this.#handleApiError(error, 'loading products');
            throw error; 
        }
    }
    async loadCategories() {
        console.log('Loading categories from API');
        try {
            const response = await axios.get(`${this.baseUrl}?categories=1`);
            if (response.data.success) {
                console.log('Categories loaded successfully:', response.data.data);
                return response.data.data;
            } else {
                throw new Error(response.data.message || 'Failed to load categories');
            }
        } catch (error) {
            this.#handleApiError(error, 'loading categories');
            throw error;
        }
    }
    async loadCategoriesWithStats() {
        console.log('Loading categories with statistics from API');
        try {
            const response = await axios.get(`${this.baseUrl}?operation=get_categories_with_stats`);
            if (response.data.success) {
                console.log('Categories with stats loaded successfully:', response.data.data);
                return response.data.data;
            } else {
                throw new Error(response.data.message || 'Failed to load categories with statistics');
            }
        } catch (error) {
            this.#handleApiError(error, 'loading categories with statistics');
            throw error;
        }
    }
    async getCategories() {
        console.log('Getting categories with full response format');
        try {
            const response = await axios.get(`${this.baseUrl}?categories=1`);
            if (response.data.success) {
                console.log('Categories loaded successfully:', response.data.data);
                return {
                    success: true,
                    data: response.data.data,
                    message: response.data.message || 'Categories loaded successfully'
                };
            } else {
                return {
                    success: false,
                    data: [],
                    message: response.data.message || 'Failed to load categories'
                };
            }
        } catch (error) {
            console.error('Failed to get categories:', error);
            return {
                success: false,
                data: [],
                message: error.message || 'Failed to load categories'
            };
        }
    }
    async createCategory(categoryData) {
        console.log('Creating category via API:', categoryData);
        try {
            const response = await axios.post(`${this.baseUrl}?operation=create_category`, categoryData);
            if (response.data.success) {
                console.log('Category created successfully:', response.data.data);
                return response.data;
            } else {
                throw new Error(response.data.message || 'Failed to create category');
            }
        } catch (error) {
            this.#handleApiError(error, 'creating category');
            throw error;
        }
    }
    async updateCategory(categoryId, categoryData) {
        console.log('Updating category via API:', categoryId, categoryData);
        try {
            const response = await axios.put(`${this.baseUrl}?operation=update_category&id=${categoryId}`, categoryData);
            if (response.data.success) {
                console.log('Category updated successfully:', response.data.data);
                return response.data;
            } else {
                throw new Error(response.data.message || 'Failed to update category');
            }
        } catch (error) {
            this.#handleApiError(error, 'updating category');
            throw error;
        }
    }
    async deleteCategory(categoryId, options = {}) {
        console.log('Deleting category via API:', categoryId, options);
        try {
            const response = await axios.delete(`${this.baseUrl}?operation=delete_category&id=${categoryId}`, {
                data: options
            });
            if (response.data.success) {
                console.log('Category deleted successfully:', response.data.message);
                return response.data;
            } else {
                if (response.data.dependencies) {
                    console.log('Category deletion prevented due to dependencies:', response.data.dependencies);
                    return response.data; 
                }
                throw new Error(response.data.message || 'Failed to delete category');
            }
        } catch (error) {
            this.#handleApiError(error, 'deleting category');
            throw error;
        }
    }
    async loadUnits() {
        console.log('Loading units from API');
        try {
            const response = await axios.get(`${this.baseUrl}?units=1`);
            if (response.data.success) {
                console.log('Units loaded successfully:', response.data.data);
                return response.data.data;
            } else {
                throw new Error(response.data.message || 'Failed to load units');
            }
        } catch (error) {
            this.#handleApiError(error, 'loading units');
            throw error;
        }
    }
    async loadSuppliers() {
        console.log('Loading suppliers from API');
        try {
            const response = await axios.get(APIResponseHandler.getApiUrl('SuppliersAPI.php'));
            if (response.data.success) {
                console.log('Suppliers loaded successfully:', response.data.data);
                return response.data.data;
            } else {
                console.warn('Failed to load suppliers:', response.data.message);
                return []; 
            }
        } catch (error) {
            console.error('Error loading suppliers:', error);
            return [];
        }
    }
    async create(productData) {
        try {
            const response = await axios.post(this.baseUrl, productData);
            if (response.data.success) {
                return response.data;
            } else {
                throw new Error(response.data.message || 'Failed to create product');
            }
        } catch (error) {
            this.#handleApiError(error, 'creating product');
            throw error;
        }
    }
    async update(productId, productData) {
        try {
            const response = await axios.put(`${this.baseUrl}?id=${productId}`, productData);
            if (response.data.success) {
                return response.data;
            } else {
                throw new Error(response.data.message || 'Failed to update product');
            }
        } catch (error) {
            this.#handleApiError(error, 'updating product');
            throw error;
        }
    }
    async delete(productId) {
        try {
            const response = await axios.delete(`${this.baseUrl}?id=${productId}`);
            if (response.data.success) {
                return response.data;
            } else {
                throw new Error(response.data.message || 'Failed to delete product');
            }
        } catch (error) {
            this.#handleApiError(error, 'deleting product');
            throw error;
        }
    }
    #handleApiError(error, operation) {
        console.error(`Error ${operation}:`, error);
        const errorData = error.response?.data || {};
        const errorMessage = errorData.message || `Failed to ${operation}. Please try again.`;
        const errorType = errorData.error_type || 'unknown';
        const status = error.response?.status;
        console.log('Detailed API error info:', {
            type: errorType,
            message: errorMessage,
            status: status,
            operation: operation
        });
        error.operation = operation;
        error.userMessage = this.#formatUserErrorMessage(status, errorType, errorMessage);
    }
    #formatUserErrorMessage(status, errorType, message) {
        switch (status) {
            case 401:
                return 'Authentication required. Please log in again.';
            case 403:
                return 'Administrator access required.';
            case 404:
                return 'Product not found.';
            case 409:
                return message; 
            case 500:
                return errorType === 'database_error' 
                    ? 'Database connection issue. Please contact support.'
                    : 'Server error occurred. Please contact support if this persists.';
            default:
                return message;
        }
    }
}
window.ProductAPI = ProductAPI;