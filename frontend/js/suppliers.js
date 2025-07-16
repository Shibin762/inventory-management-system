// frontend/js/suppliers.js - FIXED VERSION
const Suppliers = {
    currentPage: 1,
    filters: {},

    async init() {
        this.setupEventListeners();
        await this.loadSuppliers();
    },

    setupEventListeners() {
        // Search
        const searchInput = document.getElementById('supplier-search');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce(() => this.search(), 300));
        }

        // Form
        const supplierForm = document.getElementById('supplier-form');
        if (supplierForm) {
            supplierForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveSupplier();
            });
        }
        
        // Add button
        const addBtn = document.getElementById('add-supplier-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showSupplierModal());
        }
        
        // Modal close buttons
        const closeBtn = document.getElementById('close-supplier-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeSupplierModal());
        }
        
        const cancelBtn = document.getElementById('cancel-supplier-modal');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeSupplierModal());
        }
    },

    async loadSuppliers(page = 1) {
        try {
            const container = document.getElementById('suppliers-container');
            if (container) {
                Utils.showLoading(container);
            }
            
            this.currentPage = page;
            const params = {
                page: page,
                limit: 10,
                ...this.filters
            };

            const response = await api.get('/suppliers', params);
            this.displaySuppliers(response);
        } catch (error) {
            Utils.showAlert('Failed to load suppliers', 'danger');
        }
    },

    displaySuppliers(response) {
        const container = document.getElementById('suppliers-container');
        if (!container) return;
        
        if (!response || !response.suppliers || response.suppliers.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No suppliers found</p>';
            return;
        }

        const table = `
            <div class="table-responsive">
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Contact Person</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${response.suppliers.map(supplier => `
                            <tr>
                                <td>${supplier.name}</td>
                                <td>${supplier.contact_person || 'N/A'}</td>
                                <td>${supplier.email || 'N/A'}</td>
                                <td>${supplier.phone || 'N/A'}</td>
                                <td>
                                    ${supplier.is_active 
                                        ? '<span class="badge badge-success">Active</span>' 
                                        : '<span class="badge badge-secondary">Inactive</span>'}
                                </td>
                                <td>
                                    <div class="actions">
                                        <button class="btn btn-sm btn-info" data-action="view" data-id="${supplier.id}">
                                            View
                                        </button>
                                        ${Auth.hasAnyRole(['admin', 'manager']) ? `
                                            <button class="btn btn-sm btn-primary" data-action="edit" data-id="${supplier.id}">
                                                Edit
                                            </button>
                                            <button class="btn btn-sm btn-warning" data-action="products" data-id="${supplier.id}">
                                                Products
                                            </button>
                                        ` : ''}
                                        ${Auth.hasRole('admin') ? `
                                            <button class="btn btn-sm btn-danger" data-action="delete" data-id="${supplier.id}">
                                                Delete
                                            </button>
                                        ` : ''}
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = table;
        
        // Add event listeners to action buttons
        container.querySelectorAll('button[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                const id = e.target.dataset.id;
                
                switch(action) {
                    case 'view':
                        this.viewSupplier(id);
                        break;
                    case 'edit':
                        this.editSupplier(id);
                        break;
                    case 'products':
                        this.viewProducts(id);
                        break;
                    case 'delete':
                        this.deleteSupplier(id);
                        break;
                }
            });
        });
        
        this.displayPagination(response.pagination);
    },

    displayPagination(pagination) {
        const container = document.getElementById('suppliers-pagination');
        if (!container || !pagination) return;
        
        if (pagination.total_pages <= 1) {
            container.innerHTML = '';
            return;
        }

        const paginationHTML = `
            <ul class="pagination justify-content-center">
                <li class="page-item ${pagination.current_page === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${pagination.current_page - 1}">
                        Previous
                    </a>
                </li>
                ${Array.from({length: pagination.total_pages}, (_, i) => i + 1).map(page => `
                    <li class="page-item ${page === pagination.current_page ? 'active' : ''}">
                        <a class="page-link" href="#" data-page="${page}">${page}</a>
                    </li>
                `).join('')}
                <li class="page-item ${pagination.current_page === pagination.total_pages ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${pagination.current_page + 1}">
                        Next
                    </a>
                </li>
            </ul>
        `;

        container.innerHTML = paginationHTML;
        
        // Add click handlers
        container.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(e.target.dataset.page);
                if (page && !e.target.parentElement.classList.contains('disabled')) {
                    this.loadSuppliers(page);
                }
            });
        });
    },

    search() {
        this.filters = {
            search: document.getElementById('supplier-search')?.value || ''
        };
        this.loadSuppliers(1);
    },

    showSupplierModal(supplierId = null) {
        const modal = document.getElementById('supplier-modal');
        const title = document.getElementById('supplier-modal-title');
        const form = document.getElementById('supplier-form');
        
        if (!modal || !title || !form) return;
        
        form.reset();
        
        if (supplierId) {
            title.textContent = 'Edit Supplier';
            form.dataset.supplierId = supplierId;
            this.loadSupplierDetails(supplierId);
        } else {
            title.textContent = 'Add Supplier';
            delete form.dataset.supplierId;
        }
        
        modal.classList.add('show');
    },

    closeSupplierModal() {
        const modal = document.getElementById('supplier-modal');
        if (modal) {
            modal.classList.remove('show');
        }
    },

    async loadSupplierDetails(supplierId) {
        try {
            const supplier = await api.get(`/suppliers/${supplierId}`);
            
            // Populate form fields
            const fields = {
                'supplier-name': supplier.name,
                'supplier-contact': supplier.contact_person || '',
                'supplier-email': supplier.email || '',
                'supplier-phone': supplier.phone || '',
                'supplier-address': supplier.address || ''
            };
            
            Object.entries(fields).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.value = value;
                }
            });
        } catch (error) {
            Utils.showAlert('Failed to load supplier details', 'danger');
            this.closeSupplierModal();
        }
    },

    async saveSupplier() {
        const form = document.getElementById('supplier-form');
        if (!form) return;
        
        const supplierId = form.dataset.supplierId;
        
        const data = {
            name: document.getElementById('supplier-name')?.value || '',
            contact_person: document.getElementById('supplier-contact')?.value || '',
            email: document.getElementById('supplier-email')?.value || '',
            phone: document.getElementById('supplier-phone')?.value || '',
            address: document.getElementById('supplier-address')?.value || ''
        };
        
        // Validate
        if (!data.name.trim()) {
            Utils.showAlert('Supplier name is required', 'danger');
            return;
        }

        try {
            if (supplierId) {
                await api.put(`/suppliers/${supplierId}`, data);
                Utils.showAlert('Supplier updated successfully');
            } else {
                await api.post('/suppliers', data);
                Utils.showAlert('Supplier created successfully');
            }
            
            this.closeSupplierModal();
            this.loadSuppliers(this.currentPage);
        } catch (error) {
            Utils.showAlert(error.message || 'Failed to save supplier', 'danger');
        }
    },

    async viewSupplier(supplierId) {
        try {
            const supplier = await api.get(`/suppliers/${supplierId}`);
            
            const modal = document.getElementById('view-modal');
            const content = document.getElementById('view-modal-content');
            
            if (!modal || !content) return;
            
            content.innerHTML = `
                <h3>${supplier.name}</h3>
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>Contact Person:</strong> ${supplier.contact_person || 'N/A'}</p>
                        <p><strong>Email:</strong> ${supplier.email || 'N/A'}</p>
                        <p><strong>Phone:</strong> ${supplier.phone || 'N/A'}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Address:</strong> ${supplier.address || 'N/A'}</p>
                        <p><strong>Status:</strong> ${supplier.is_active ? 'Active' : 'Inactive'}</p>
                        <p><strong>Created:</strong> ${Utils.formatDateTime(supplier.created_at)}</p>
                    </div>
                </div>
            `;
            
            modal.classList.add('show');
        } catch (error) {
            Utils.showAlert('Failed to load supplier details', 'danger');
        }
    },

    async viewProducts(supplierId) {
        try {
            const products = await api.get(`/suppliers/${supplierId}/products`);
            
            const modal = document.getElementById('view-modal');
            const content = document.getElementById('view-modal-content');
            
            if (!modal || !content) return;
            
            if (!products || products.length === 0) {
                content.innerHTML = '<p class="text-muted">No products from this supplier</p>';
            } else {
                content.innerHTML = `
                    <h3>Products from Supplier</h3>
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>SKU</th>
                                    <th>Product Name</th>
                                    <th>Cost Price</th>
                                    <th>Supplier SKU</th>
                                    <th>Lead Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${products.map(product => `
                                    <tr>
                                        <td>${product.sku}</td>
                                        <td>${product.name}</td>
                                        <td>${Utils.formatCurrency(product.cost_price)}</td>
                                        <td>${product.supplier_sku || 'N/A'}</td>
                                        <td>${product.lead_time_days} days</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            }
            
            modal.classList.add('show');
        } catch (error) {
            Utils.showAlert('Failed to load supplier products', 'danger');
        }
    },

    editSupplier(supplierId) {
        this.showSupplierModal(supplierId);
    },

    async deleteSupplier(supplierId) {
        if (!confirm('Are you sure you want to delete this supplier?')) {
            return;
        }

        try {
            await api.delete(`/suppliers/${supplierId}`);
            Utils.showAlert('Supplier deleted successfully');
            this.loadSuppliers(this.currentPage);
        } catch (error) {
            Utils.showAlert('Failed to delete supplier', 'danger');
        }
    }
};
