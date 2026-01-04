if (typeof axios !== 'undefined') {
    axios.defaults.baseURL = '';
    axios.defaults.timeout = 10000;
    axios.defaults.headers.post['Content-Type'] = 'application/json';
    axios.defaults.withCredentials = true;
}
class AuthManager {
    constructor() {
    this.apiEndpoint = APIResponseHandler.getApiUrl('AuthAPI.php');
        this.initializeEventListeners();
    }
    initializeEventListeners() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const usernameError = document.getElementById('usernameError');
        const passwordError = document.getElementById('passwordError');
        if (usernameInput && usernameError) {
            usernameInput.addEventListener('input', () => this.validateUsername());
            usernameInput.addEventListener('blur', () => this.validateUsername());
        }
        if (passwordInput && passwordError) {
            passwordInput.addEventListener('input', () => this.validatePassword());
            passwordInput.addEventListener('blur', () => this.validatePassword());
        }
    }
    validateUsername() {
        const usernameInput = document.getElementById('username');
        const usernameError = document.getElementById('usernameError');
        if (!usernameInput || !usernameError) {
            return true; 
        }
        const username = usernameInput.value.trim();
        usernameInput.classList.remove('is-invalid', 'is-valid');
        usernameError.textContent = '';
        if (username === '') {
            this.setFieldError(usernameInput, usernameError, 'Username is required');
            return false;
        }
        if (username.length < 3) {
            this.setFieldError(usernameInput, usernameError, 'Username must be at least 3 characters');
            return false;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            this.setFieldError(usernameInput, usernameError, 'Username can only contain letters, numbers, and underscores');
            return false;
        }
        this.setFieldValid(usernameInput);
        return true;
    }
    validatePassword() {
        const passwordInput = document.getElementById('password');
        const passwordError = document.getElementById('passwordError');
        if (!passwordInput || !passwordError) {
            return true; 
        }
        const password = passwordInput.value;
        passwordInput.classList.remove('is-invalid', 'is-valid');
        passwordError.textContent = '';
        if (password === '') {
            this.setFieldError(passwordInput, passwordError, 'Password is required');
            return false;
        }
        if (password.length < 6) {
            this.setFieldError(passwordInput, passwordError, 'Password must be at least 6 characters');
            return false;
        }
        this.setFieldValid(passwordInput);
        return true;
    }
    setFieldError(input, errorElement, message) {
        input.classList.add('is-invalid');
        input.classList.remove('is-valid');
        errorElement.textContent = message;
    }
    setFieldValid(input) {
        input.classList.add('is-valid');
        input.classList.remove('is-invalid');
    }
    async handleLogin(event) {
        event.preventDefault();
        const isUsernameValid = this.validateUsername();
        const isPasswordValid = this.validatePassword();
        if (!isUsernameValid || !isPasswordValid) {
            return;
        }
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        try {
            this.setLoadingState(true);
            this.hideError();
            const response = await axios.post(this.apiEndpoint, {
                username: username,
                password: password
            });
            if (response.data.success) {
                this.handleLoginSuccess(response.data.user);
            } else {
                this.showError(response.data.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            if (error.response) {
                if (error.response.status === 401) {
                    this.showError('Invalid username or password');
                } else if (error.response.status === 400) {
                    this.showError(error.response.data.message || 'Invalid request');
                } else if (error.response.status === 500) {
                    this.showError('Server error. Please try again later.');
                } else {
                    this.showError('Login failed. Please try again.');
                }
            } else if (error.request) {
                this.showError('Network error. Please check your connection and try again.');
            } else {
                this.showError('An unexpected error occurred. Please try again.');
            }
        } finally {
            this.setLoadingState(false);
        }
    }
    handleLoginSuccess(user) {
        sessionStorage.setItem('user', JSON.stringify(user));
        this.showSuccess(`Welcome, ${user.username}! Redirecting to your dashboard...`);
        setTimeout(() => {
            const dashboardUrl = this.getDashboardUrl(user.role);
            window.location.href = dashboardUrl;
        }, 1500);
    }
    getDashboardUrl(role) {
        switch (role) {
            case 'Admin':
                return 'admin-dashboard.html';
            case 'Sales Officer':
                return 'sales-dashboard.html';
            case 'Warehouse Staff':
                return 'warehouse-staff-dashboard.html';
            case 'Production Supervisor':
                return 'production-dashboard.html';
            case 'Quality Control Officer':
                return 'qc-dashboard.html';
            case 'Finance Officer':
                return 'finance-dashboard.html';
            default:
                return 'login.html';
        }
    }
    showError(message) {
        const errorAlert = document.getElementById('errorAlert');
        const errorMessage = document.getElementById('errorMessage');
        if (errorAlert && errorMessage) {
            errorMessage.textContent = message;
            errorAlert.classList.remove('d-none');
            setTimeout(() => {
                this.hideError();
            }, 5000);
        }
    }
    hideError() {
        const errorAlert = document.getElementById('errorAlert');
        if (errorAlert) {
            errorAlert.classList.add('d-none');
        }
    }
    showSuccess(message) {
        this.hideError();
        const errorAlert = document.getElementById('errorAlert');
        const errorMessage = document.getElementById('errorMessage');
        if (errorAlert && errorMessage) {
            errorAlert.classList.remove('alert-danger', 'd-none');
            errorAlert.classList.add('alert-success');
            errorMessage.textContent = message;
        }
    }
    setLoadingState(isLoading) {
        const loginButton = document.getElementById('loginButton');
        const loadingSpinner = document.getElementById('loadingSpinner');
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        if (isLoading) {
            loginButton.disabled = true;
            loginButton.textContent = 'Signing In...';
            loadingSpinner.classList.remove('d-none');
            usernameInput.disabled = true;
            passwordInput.disabled = true;
        } else {
            loginButton.disabled = false;
            loginButton.textContent = 'Sign In';
            loadingSpinner.classList.add('d-none');
            usernameInput.disabled = false;
            passwordInput.disabled = false;
        }
    }
}
const SecurityUtils = {
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    sanitizeInput(input) {
        return input.replace(/[<>]/g, '');
    }
};
function isAuthenticated() {
    const user = sessionStorage.getItem('user');
    console.log('isAuthenticated check:', { user, isLoggedIn: user !== null && user !== 'undefined' });
    return user !== null && user !== 'undefined';
}
function getLoggedInUser() {
    try {
        const userJson = sessionStorage.getItem('user');
        const userData = userJson ? JSON.parse(userJson) : null;
        console.log('getLoggedInUser:', { userJson, userData });
        return userData;
    } catch (error) {
        console.error('Error parsing user data:', error);
        return null;
    }
}
function hasRole(requiredRole) {
    const user = getLoggedInUser();
    const hasRequiredRole = user && user.role === requiredRole;
    console.log('hasRole check:', { requiredRole, user, hasRequiredRole });
    return hasRequiredRole;
}
async function authLogout() {
    try {
        await axios.post('../api/LogoutAPI.php');
    } catch (error) {
        console.error('Logout API error:', error);
    } finally {
        sessionStorage.clear();
        localStorage.clear();
        window.location.href = 'login.html';
    }
}
window.isAuthenticated = isAuthenticated;
window.getLoggedInUser = getLoggedInUser;
window.hasRole = hasRole;
window.authLogout = authLogout;
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthManager, SecurityUtils, isAuthenticated, getLoggedInUser, hasRole, authLogout };
}