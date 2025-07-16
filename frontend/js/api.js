// frontend/js/api.js */
class API {
    constructor() {
        this.baseURL = '/api';
        this.token = localStorage.getItem('token');
    }

    // Set auth token
    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
    }

    // Clear auth token
    clearToken() {
        this.token = null;
        localStorage.removeItem('token');
    }

    // Make API request
    async request(url, options = {}) {
        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        // Add auth token if available
        if (this.token) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(`${this.baseURL}${url}`, config);
            
            // Handle auth errors
            if (response.status === 401 || response.status === 403) {
                this.clearToken();
                window.location.href = '/login';
                throw new Error('Authentication failed');
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // GET request
    get(url, params) {
        const queryString = params ? `?${Utils.buildQueryString(params)}` : '';
        return this.request(`${url}${queryString}`, {
            method: 'GET'
        });
    }

    // POST request
    post(url, data) {
        return this.request(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // PUT request
    put(url, data) {
        return this.request(url, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // DELETE request
    delete(url) {
        return this.request(url, {
            method: 'DELETE'
        });
    }

    // Upload file
    async upload(url, file, additionalData = {}) {
        const formData = new FormData();
        formData.append('file', file);
        
        Object.keys(additionalData).forEach(key => {
            formData.append(key, additionalData[key]);
        });

        const config = {
            method: 'POST',
            headers: {}
        };

        if (this.token) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
        }

        config.body = formData;

        try {
            const response = await fetch(`${this.baseURL}${url}`, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Upload failed');
            }

            return data;
        } catch (error) {
            console.error('Upload Error:', error);
            throw error;
        }
    }
}

// Create global API instance
const api = new API();