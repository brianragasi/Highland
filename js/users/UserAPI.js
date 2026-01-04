class UserAPI {
    constructor() {
    this.baseURL = APIResponseHandler.getApiUrl('UsersAPI.php');
        this.axiosConfig = {
            withCredentials: true,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        this.cache = {
            users: null,
            timestamp: null,
            ttl: 30000 
        };
    }
    async getAllUsers(forceRefresh = false) {
        try {
            if (!forceRefresh && this.isCacheValid()) {
                return { success: true, data: this.cache.users };
            }
            const response = await axios.get(this.baseURL, this.axiosConfig);
            if (response.data.success) {
                this.cache.users = response.data.data;
                this.cache.timestamp = Date.now();
            }
            return response.data;
        } catch (error) {
            console.error('Error fetching users:', error);
            throw this.handleError(error);
        }
    }
    
    async getAllRoles() {
        try {
            const response = await axios.get(`${this.baseURL}?roles=true`, this.axiosConfig);
            return response.data;
        } catch (error) {
            console.error('Error fetching roles:', error);
            throw this.handleError(error);
        }
    }
    
    isCacheValid() {
        return this.cache.users !== null && 
               this.cache.timestamp !== null && 
               (Date.now() - this.cache.timestamp) < this.cache.ttl;
    }
    clearCache() {
        this.cache.users = null;
        this.cache.timestamp = null;
    }
    async createUser(userData) {
        try {
            const response = await axios.post(this.baseURL, userData, this.axiosConfig);
            if (response.data.success) {
                this.clearCache();
            }
            return response.data;
        } catch (error) {
            console.error('Error creating user:', error);
            throw this.handleError(error);
        }
    }
    async updateUser(userId, userData) {
        try {
            const url = `${this.baseURL}?id=${userId}`;
            const response = await axios.put(url, userData, this.axiosConfig);
            if (response.data.success) {
                this.clearCache();
            }
            return response.data;
        } catch (error) {
            console.error('Error updating user:', error);
            throw this.handleError(error);
        }
    }
    async deleteUser(userId) {
        try {
            const url = `${this.baseURL}?id=${userId}`;
            const response = await axios.delete(url, this.axiosConfig);
            if (response.data.success) {
                this.clearCache();
            }
            return response.data;
        } catch (error) {
            console.error('Error deleting user:', error);
            throw this.handleError(error);
        }
    }
    handleError(error) {
        let message = 'An unexpected error occurred';
        if (error.response) {
            const status = error.response.status;
            const data = error.response.data;
            switch (status) {
                case 400:
                    message = data.message || 'Invalid request data';
                    break;
                case 401:
                    message = 'Authentication required. Please log in again.';
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);
                    break;
                case 403:
                    message = 'Access denied. Administrator privileges required.';
                    break;
                case 404:
                    message = 'User not found';
                    break;
                case 409:
                    message = data.message || 'Username already exists';
                    break;
                case 500:
                    message = 'Server error. Please try again later.';
                    break;
                default:
                    message = data.message || `Server error (${status})`;
            }
        } else if (error.request) {
            message = 'Network error. Please check your connection.';
        }
        const formattedError = new Error(message);
        formattedError.originalError = error;
        return formattedError;
    }
    validateUserData(userData, isUpdate = false) {
        const errors = [];
        if (!userData.username || userData.username.trim().length === 0) {
            errors.push('Username is required');
        } else if (userData.username.trim().length < 3) {
            errors.push('Username must be at least 3 characters long');
        } else if (userData.username.trim().length > 50) {
            errors.push('Username must be less than 50 characters');
        } else if (!/^[a-zA-Z0-9_-]+$/.test(userData.username.trim())) {
            errors.push('Username can only contain letters, numbers, hyphens, and underscores');
        }
        if (!isUpdate && (!userData.password || userData.password.trim().length === 0)) {
            errors.push('Password is required');
        } else if (userData.password && userData.password.trim().length > 0) {
            const password = userData.password.trim();
            if (password.length < 8) {
                errors.push('Password must be at least 8 characters long');
            } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
                errors.push('Password must contain at least one uppercase letter, one lowercase letter, and one number');
            }
        }
    const validRoles = ['Admin', 'Warehouse Manager', 'Warehouse Staff', 'Sales Officer', 'Production Supervisor']; 
        if (!userData.role || !validRoles.includes(userData.role)) {
            errors.push('Please select a valid role');
        }
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
}
window.UserAPI = UserAPI;