// frontend/js/app.js - UPDATED with destroy handling
const App = {
    currentPage: null,

    init() {
        // Check authentication
        if (!Auth.isAuthenticated()) {
            window.location.href = '/pages/login.html';
            return;
        }

        // Setup router
        this.setupRouter();
        
        // Setup user menu
        this.setupUserMenu();
        
        // Setup logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
        
        // Setup view modal close buttons
        const closeViewModal = document.getElementById('close-view-modal');
        if (closeViewModal) {
            closeViewModal.addEventListener('click', () => {
                document.getElementById('view-modal').classList.remove('show');
            });
        }
        
        const closeViewModalBtn = document.getElementById('close-view-modal-btn');
        if (closeViewModalBtn) {
            closeViewModalBtn.addEventListener('click', () => {
                document.getElementById('view-modal').classList.remove('show');
            });
        }
        
        // Initialize based on current route
        this.handleRoute();
    },

    setupRouter() {
        // Handle navigation clicks
        document.querySelectorAll('[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.dataset.page;
                this.navigateTo(page);
            });
        });

        // Handle browser back/forward
        window.addEventListener('popstate', () => {
            this.handleRoute();
        });
    },

    setupUserMenu() {
        const user = Auth.getCurrentUser();
        if (user) {
            const userDisplay = document.getElementById('user-display');
            if (userDisplay) {
                userDisplay.textContent = `${user.username} (${user.role})`;
            }
        }
    },

    navigateTo(page) {
        window.history.pushState({}, '', `#${page}`);
        this.handleRoute();
    },

    handleRoute() {
        const hash = window.location.hash.substring(1) || 'dashboard';
        const [page, params] = hash.split('?');
        
        // Clean up previous page
        this.cleanupCurrentPage();
        
        // Update active nav
        document.querySelectorAll('[data-page]').forEach(link => {
            link.classList.toggle('active', link.dataset.page === page);
        });

        // Hide all pages
        document.querySelectorAll('.page').forEach(p => {
            p.style.display = 'none';
        });

        // Show current page
        const pageElement = document.getElementById(`${page}-page`);
        if (pageElement) {
            pageElement.style.display = 'block';
            this.currentPage = page;
            
            // Initialize page controller
            this.initializePage(page, params);
        }
    },
    
    cleanupCurrentPage() {
        // Clean up dashboard charts when leaving dashboard
        if (this.currentPage === 'dashboard' && Dashboard.destroy) {
            Dashboard.destroy();
        }
    },

    async initializePage(page, params) {
        try {
            switch (page) {
                case 'dashboard':
                    await Dashboard.init();
                    break;
                case 'products':
                    await Products.init();
                    break;
                case 'suppliers':
                    await Suppliers.init();
                    break;
                case 'orders':
                    await Orders.init(params);
                    break;
                case 'reports':
                    await Reports.init();
                    break;
            }
        } catch (error) {
            console.error(`Error initializing ${page}:`, error);
            Utils.showAlert(`Failed to load ${page}`, 'danger');
        }
    },

    logout() {
        if (confirm('Are you sure you want to logout?')) {
            // Clean up current page
            this.cleanupCurrentPage();
            Auth.logout();
        }
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (!window.location.pathname.includes('login.html')) {
        App.init();
    }
});