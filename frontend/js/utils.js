/* frontend/js/utils.js */
// Utility functions
const Utils = {
    // Format currency
    formatCurrency: (amount, currency = 'USD') => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    },

    // Format date
    formatDate: (dateString) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('en-US', options);
    },

    // Format datetime
    formatDateTime: (dateString) => {
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return new Date(dateString).toLocaleString('en-US', options);
    },

    // Debounce function
    debounce: (func, delay) => {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    },

    // Show alert
    showAlert: (message, type = 'success') => {
        const alertContainer = document.getElementById('alert-container') || createAlertContainer();
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade-in`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="close" onclick="this.parentElement.remove()">
                <span>&times;</span>
            </button>
        `;
        alertContainer.appendChild(alert);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            alert.remove();
        }, 5000);
    },

    // Show loading spinner
    showLoading: (container) => {
        container.innerHTML = '<div class="text-center p-4"><div class="spinner"></div></div>';
    },

    // Parse query parameters
    parseQueryParams: (queryString) => {
        const params = new URLSearchParams(queryString);
        const result = {};
        for (const [key, value] of params) {
            result[key] = value;
        }
        return result;
    },

    // Build query string
    buildQueryString: (params) => {
        const searchParams = new URLSearchParams();
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
                searchParams.append(key, params[key]);
            }
        });
        return searchParams.toString();
    },

    // Validate email
    validateEmail: (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    // Get stock status badge
    getStockStatusBadge: (product) => {
        if (product.quantity_in_stock <= 0) {
            return '<span class="badge badge-danger">Out of Stock</span>';
        } else if (product.quantity_in_stock <= product.reorder_level) {
            return '<span class="badge badge-warning">Low Stock</span>';
        } else {
            return '<span class="badge badge-success">In Stock</span>';
        }
    },

    // Export to CSV
    exportToCSV: (data, filename) => {
        const csv = convertToCSV(data);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    },

    // Convert array to CSV
    convertToCSV: (data) => {
        if (!data || data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvHeaders = headers.join(',');
        
        const csvRows = data.map(row => {
            return headers.map(header => {
                const value = row[header];
                return typeof value === 'string' && value.includes(',') 
                    ? `"${value}"` 
                    : value;
            }).join(',');
        });
        
        return [csvHeaders, ...csvRows].join('\n');
    }
};

// Create alert container if it doesn't exist
function createAlertContainer() {
    const container = document.createElement('div');
    container.id = 'alert-container';
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.right = '20px';
    container.style.zIndex = '9999';
    container.style.maxWidth = '400px';
    document.body.appendChild(container);
    return container;
}