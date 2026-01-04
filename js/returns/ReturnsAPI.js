class ReturnsAPI {
    constructor() {
        this.baseUrl = '../api/ReturnsAPI.php';
    }
    async createReturn(returnData) {
        try {
            const response = await axios.post(this.baseUrl, returnData, {
                headers: {
                    'Content-Type': 'application/json'
                },
                withCredentials: true
            });
            const result = response.data;
            if (!result.success) {
                throw new Error(result.message || 'Failed to create return');
            }
            return result;
        } catch (error) {
            console.error('Create return error:', error);
            throw error;
        }
    }
    async findSaleByReceipt(receiptNumber) {
        try {
            const response = await axios.get(this.baseUrl, {
                params: {
                    operation: 'findSaleByReceipt',
                    receipt_number: receiptNumber
                },
                withCredentials: true
            });
            const result = response.data;
            if (!result.success) {
                throw new Error(result.message || 'Sale not found');
            }
            return result.data;
        } catch (error) {
            console.error('Find sale error:', error);
            throw error;
        }
    }
    async getEligibleSales() {
        try {
            const response = await axios.get(this.baseUrl, {
                params: {
                    operation: 'getEligibleSales'
                },
                withCredentials: true
            });
            const result = response.data;
            if (!result.success) {
                throw new Error(result.message || 'Failed to retrieve eligible sales');
            }
            return result.data;
        } catch (error) {
            console.error('Get eligible sales error:', error);
            throw error;
        }
    }
    async getReturnHistory(filters = {}) {
        try {
            const params = {
                operation: 'getReturnHistory',
                ...filters
            };
            const response = await axios.get(this.baseUrl, {
                params,
                withCredentials: true
            });
            const result = response.data;
            if (!result.success) {
                throw new Error(result.message || 'Failed to retrieve return history');
            }
            return result.data;
        } catch (error) {
            console.error('Get return history error:', error);
            throw error;
        }
    }
    async getReturnDetails(returnId) {
        try {
            const response = await axios.get(this.baseUrl, {
                params: {
                    operation: 'getReturnDetails',
                    return_id: returnId
                },
                withCredentials: true
            });
            const result = response.data;
            if (!result.success) {
                throw new Error(result.message || 'Failed to retrieve return details');
            }
            return result.data;
        } catch (error) {
            console.error('Get return details error:', error);
            throw error;
        }
    }
    async approveReturn(returnId) {
        try {
            const response = await axios.post(this.baseUrl, null, {
                params: {
                    operation: 'approveReturn',
                    return_id: returnId
                },
                withCredentials: true
            });
            const result = response.data;
            if (!result.success) {
                throw new Error(result.message || 'Failed to approve return');
            }
            return result;
        } catch (error) {
            console.error('Approve return error:', error);
            throw error;
        }
    }
    async rejectReturn(returnId) {
        try {
            const response = await axios.post(this.baseUrl, null, {
                params: {
                    operation: 'rejectReturn',
                    return_id: returnId
                },
                withCredentials: true
            });
            const result = response.data;
            if (!result.success) {
                throw new Error(result.message || 'Failed to reject return');
            }
            return result;
        } catch (error) {
            console.error('Reject return error:', error);
            throw error;
        }
    }
    async getAllReturns() {
        try {
            const response = await axios.get(this.baseUrl, {
                withCredentials: true
            });
            const result = response.data;
            if (!result.success) {
                throw new Error(result.message || 'Failed to retrieve returns');
            }
            return result.data;
        } catch (error) {
            console.error('Get all returns error:', error);
            throw error;
        }
    }
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReturnsAPI;
} else {
    window.ReturnsAPI = ReturnsAPI;
}