// frontend/js/auth.js
const Auth = {
    // Check if user is authenticated
    isAuthenticated() {
        return !!localStorage.getItem('token');
    },

    // Get current user
    getCurrentUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },

    // Login
    async login(username, password) {
        try {
            const response = await api.post('/auth/login', { username, password });
            
            // Store token and user info
            api.setToken(response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
            
            return response;
        } catch (error) {
            throw error;
        }
    },

    // Logout
    logout() {
        api.clearToken();
        localStorage.removeItem('user');
        window.location.href = '/';
    },

    // Change password
    async changePassword(currentPassword, newPassword) {
        return api.post('/auth/change-password', {
            currentPassword,
            newPassword
        });
    },

    // Get user profile
    async getProfile() {
        return api.get('/auth/profile');
    },

    // Check user role
    hasRole(role) {
        const user = this.getCurrentUser();
        return user && user.role === role;
    },

    // Check if user has any of the specified roles
    hasAnyRole(roles) {
        const user = this.getCurrentUser();
        return user && roles.includes(user.role);
    }
};