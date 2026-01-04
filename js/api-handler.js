class APIResponseHandler {
    static getApiBasePath() {
        const isPhpDevServer = window.location.hostname === 'localhost' && window.location.port === '8000';
        return isPhpDevServer ? '' : '/HighlandFreshApp';
    }
    static getApiUrl(endpoint) {
        const origin = window.location.protocol + '//' + window.location.host;
        return `${origin}${this.getApiBasePath()}/api/${endpoint}`;
    }
    static async handleResponse(apiCall, onSuccess, onError = null) {
        try {
            const response = await apiCall;
            if (response.data.success) {
                return onSuccess(response.data);
            } else {
                const errorMessage = response.data.message || 'Operation failed';
                console.error('API returned error:', errorMessage);
                if (onError) {
                    return onError(errorMessage, response.data);
                } else {
                    this.showAlert('error', errorMessage);
                }
            }
        } catch (error) {
            console.error('API call failed:', error);
            const errorData = error.response?.data || {};
            const errorMessage = errorData.message || 'An unexpected error occurred';
            const errorType = errorData.error_type || 'unknown';
            const status = error.response?.status;
            console.log('Detailed error info:', {
                type: errorType,
                message: errorMessage,
                status: status,
                code: errorData.error_code || ''
            });
            if (status === 401) {
                this.handleAuthenticationError();
            } else if (status === 403) {
                this.showAlert('error', 'Administrator access required.');
            } else if (status === 409) {
                if (onError) {
                    return onError(errorMessage, errorData, 'conflict');
                } else {
                    this.showAlert('error', errorMessage);
                }
            } else if (status === 500) {
                const userMessage = this.formatServerError(errorType, errorMessage);
                this.showAlert('error', userMessage);
            } else {
                const debugInfo = status ? ` (Status: ${status}, Type: ${errorType})` : ` (Network: ${error.message})`;
                this.showAlert('error', errorMessage + debugInfo);
            }
            if (onError) {
                return onError(errorMessage, errorData, errorType);
            }
        }
    }
    static formatServerError(errorType, message) {
        switch (errorType) {
            case 'database_error':
                return `Database error: ${message}. Please contact support if this persists.`;
            case 'general_error':
                return 'System error occurred. Please try again or contact support. (Error logged)';
            default:
                return message;
        }
    }
    static handleAuthenticationError() {
        this.showAlert('error', 'Authentication required. Please log in again.');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    }
    static showAlert(type, message) {
        if (typeof window.showAlert === 'function') {
            window.showAlert(type, message);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
    static createConfig(method, url, data = null) {
        const config = {
            method: method.toLowerCase(),
            url: url,
            withCredentials: true
        };
        if (data && ['post', 'put', 'patch'].includes(config.method)) {
            config.data = data;
        }
        return config;
    }
}
window.APIResponseHandler = APIResponseHandler;