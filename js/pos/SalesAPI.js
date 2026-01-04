class SalesAPI {
    constructor() {
        this.baseUrl = '../api/SalesAPI.php';
    }

    async createSale(saleData, onSuccess = null, onError = null) {
        try {
            const response = await axios.post(this.baseUrl, saleData, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                withCredentials: true
            });
            
            const result = response.data;
            if (result.success) {
                if (onSuccess) {
                    onSuccess(result.data, result.message);
                }
                return result;
            } else {
                const errorMessage = result.message || 'Failed to process sale';
                if (onError) {
                    onError(errorMessage, result);
                }
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error('SalesAPI createSale error:', error);
            if (onError) {
                onError(error.message, error);
            }
            throw error;
        }
    }

    async getAllSales(onSuccess = null, onError = null) {
        try {
            const response = await axios.get(this.baseUrl, {
                headers: {
                    'Accept': 'application/json'
                },
                withCredentials: true
            });
            
            const result = response.data;
            if (result.success) {
                if (onSuccess) {
                    onSuccess(result.data, result.message);
                }
                return result;
            } else {
                const errorMessage = result.message || 'Failed to retrieve sales';
                if (onError) {
                    onError(errorMessage, result);
                }
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error('SalesAPI getAllSales error:', error);
            if (onError) {
                onError(error.message, error);
            }
            throw error;
        }
    }
}
