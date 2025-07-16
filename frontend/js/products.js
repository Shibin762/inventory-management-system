// frontend/js/products.js - FIXED VERSION
const Products = {
    currentPage: 1,
    filters: {},

    async init() {
        this.setupEventListeners();
        await this.loadCategories();
        await this.loadProducts();
    },

    setupEventListeners() {
        // Check if elements exist before adding listeners
        const searchInput = document.getElementById('product-search');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce(() => this.search(), 300));
        }

        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => this.search());
        }

        const stockFilter = document.getElementById('stock-filter');
        if (stockFilter) {
            stockFilter.addEventListener('change', () => this.search());
        }

        const sortBy = document.getElementById('sort-by');
        if (sortBy) {
            sortBy.addEventListener('change', () => this.search());
        }

        const productForm = document.getElementById('product-form');
        if (productForm) {
            productForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveProduct();
            });
        }

        // Add button event listeners
        const addProductBtn = document.getElementById('add-product-btn');
        if (addProductBtn) {
            addProductBtn.addEventListener('click', () => this.showProductModal());
        }

        const exportBtn = document.getElementById('export-products-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportProducts());
        }

        const closeModalBtn = document.getElementById('close-product-modal');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => this.closeProductModal());
        }

        const cancelModalBtn = document.getElementById('cancel-product-modal');
        if (cancelModalBtn) {
            cancelModalBtn.addEventListener('click', () => this.closeProductModal());
        }
    },

    async loadCategories() {
        try {
            const categories = await api.get('/categories');
            const select = document.getElementById('category-filter');
            const formSelect = document.getElementById('product-category');
            
            if (categories && categories.length > 0) {
                const options = categories.map(cat => 
                    `<option value="${cat.id}">${cat.name}</option>`
                ).join('');
                
                if (select) {
                    select.innerHTML = '<option value="">All Categories</option>' + options;
                }
                if (formSelect) {
                    formSelect.innerHTML = '<option value="">Select Category</option>' + options;
                }
            }
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    },

    async loadProducts(page = 1) {
        try {
            const container = document.getElementById('products-container');
            if (container) {
                Utils.showLoading(container);
            }
            
            this.currentPage = page;
            const params = {
                page: page,
                limit: 10,
                ...this.filters
            };

            const response = await api.get('/products', params);
            this.displayProducts(response);
        } catch (error) {
            Utils.showAlert('Failed to load products', 'danger');
        }
    },

    displayProducts(response) {
        const container = document.getElementById('products-container');
        if (!container) return;
        
        if (!response || !response.products || response.products.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No products found</p>';
            return;
        }

        const table = `
            <div class="table-responsive">
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>SKU</th>
                            <th>Name</th>
                            <th>Category</th>
                            <th>Price</th>
                            <th>Stock</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${response.products.map(product => `
                            <tr>
                                <td>${product.sku}</td>
                                <td>${product.name}</td>
                                <td>${product.category_name || 'N/A'}</td>
                                <td>${Utils.formatCurrency(product.unit_price)}</td>
                                <td>${product.quantity_in_stock}</td>
                                <td>${Utils.getStockStatusBadge(product)}</td>
                                <td>
                                    <div class="actions">
                                        <button class="btn btn-sm btn-info" data-action="view" data-id="${product.id}">
                                            View
                                        </button>
                                        ${Auth.hasAnyRole(['admin', 'manager']) ? `
                                            <button class="btn btn-sm btn-primary" data-action="edit" data-id="${product.id}">
                                                Edit
                                            </button>
                                        ` : ''}
                                        ${Auth.hasRole('admin') ? `
                                            <button class="btn btn-sm btn-danger" data-action="delete" data-id="${product.id}">
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
                        this.viewProduct(id);
                        break;
                    case 'edit':
                        this.editProduct(id);
                        break;
                    case 'delete':
                        this.deleteProduct(id);
                        break;
                }
            });
        });
        
        this.displayPagination(response.pagination);
    },

    displayPagination(pagination) {
        const container = document.getElementById('products-pagination');
        if (!container || !pagination) return;
        
        if (pagination.total_pages <= 1) {
            container.innerHTML = '';
            return;
        }

        const pages = [];
        for (let i = 1; i <= pagination.total_pages; i++) {
            if (
                i === 1 || 
                i === pagination.total_pages || 
                (i >= pagination.current_page - 2 && i <= pagination.current_page + 2)
            ) {
                pages.push(i);
            }
        }

        const paginationHTML = `
            <ul class="pagination justify-content-center">
                <li class="page-item ${pagination.current_page === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${pagination.current_page - 1}">
                        Previous
                    </a>
                </li>
                ${pages.map((page, index) => {
                    if (index > 0 && pages[index - 1] < page - 1) {
                        return `<li class="page-item disabled"><span class="page-link">...</span></li>`;
                    }
                    return `
                        <li class="page-item ${page === pagination.current_page ? 'active' : ''}">
                            <a class="page-link" href="#" data-page="${page}">${page}</a>
                        </li>
                    `;
                }).join('')}
                <li class="page-item ${pagination.current_page === pagination.total_pages ? 'disabled' : ''}">
                    <a class="page-link" href="#" data-page="${pagination.current_page + 1}">
                        Next
                    </a>
                </li>
            </ul>
        `;

        container.innerHTML = paginationHTML;
        
        // Add click handlers to pagination links
        container.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(e.target.dataset.page);
                if (page && !e.target.parentElement.classList.contains('disabled')) {
                    this.loadProducts(page);
                }
            });
        });
    },

    search() {
        this.filters = {
            search: document.getElementById('product-search')?.value || '',
            category: document.getElementById('category-filter')?.value || '',
            lowStock: document.getElementById('stock-filter')?.value || '',
            sortBy: document.getElementById('sort-by')?.value || 'name'
        };
        this.loadProducts(1);
    },

    showProductModal(productId = null) {
        const modal = document.getElementById('product-modal');
        const title = document.getElementById('product-modal-title');
        const form = document.getElementById('product-form');
        
        if (!modal || !title || !form) return;
        
        form.reset();
        
        if (productId) {
            title.textContent = 'Edit Product';
            form.dataset.productId = productId;
            this.loadProductDetails(productId);
        } else {
            title.textContent = 'Add Product';
            delete form.dataset.productId;
        }
        
        modal.classList.add('show');
    },

    closeProductModal() {
        const modal = document.getElementById('product-modal');
        if (modal) {
            modal.classList.remove('show');
        }
    },

    async loadProductDetails(productId) {
        try {
            const product = await api.get(`/products/${productId}`);
            
            // Populate form fields
            const fields = {
                'product-sku': product.sku,
                'product-name': product.name,
                'product-description': product.description || '',
                'product-category': product.category_id || '',
                'product-price': product.unit_price,
                'product-stock': product.quantity_in_stock,
                'product-reorder-level': product.reorder_level,
                'product-reorder-qty': product.reorder_quantity
            };
            
            Object.entries(fields).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.value = value;
                }
            });
        } catch (error) {
            Utils.showAlert('Failed to load product details', 'danger');
            this.closeProductModal();
        }
    },

    async saveProduct() {
        const form = document.getElementById('product-form');
        if (!form) return;
        
        const productId = form.dataset.productId;
        
        const data = {
            sku: document.getElementById('product-sku')?.value || '',
            name: document.getElementById('product-name')?.value || '',
            description: document.getElementById('product-description')?.value || '',
            category_id: document.getElementById('product-category')?.value || null,
            unit_price: parseFloat(document.getElementById('product-price')?.value || 0),
            quantity_in_stock: parseInt(document.getElementById('product-stock')?.value || 0),
            reorder_level: parseInt(document.getElementById('product-reorder-level')?.value || 10),
            reorder_quantity: parseInt(document.getElementById('product-reorder-qty')?.value || 50)
        };

        try {
            if (productId) {
                await api.put(`/products/${productId}`, data);
                Utils.showAlert('Product updated successfully');
            } else {
                await api.post('/products', data);
                Utils.showAlert('Product created successfully');
            }
            
            this.closeProductModal();
            this.loadProducts(this.currentPage);
        } catch (error) {
            Utils.showAlert(error.message || 'Failed to save product', 'danger');
        }
    },

    async viewProduct(productId) {
        try {
            const product = await api.get(`/products/${productId}`);
            
            const modal = document.getElementById('view-modal');
            const content = document.getElementById('view-modal-content');
            
            if (!modal || !content) return;
            
            content.innerHTML = `
                <h3>${product.name}</h3>
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>SKU:</strong> ${product.sku}</p>
                        <p><strong>Category:</strong> ${product.category_name || 'N/A'}</p>
                        <p><strong>Price:</strong> ${Utils.formatCurrency(product.unit_price)}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Current Stock:</strong> ${product.quantity_in_stock}</p>
                        <p><strong>Reorder Level:</strong> ${product.reorder_level}</p>
                        <p><strong>Status:</strong> ${Utils.getStockStatusBadge(product)}</p>
                    </div>
                </div>
                ${product.description ? `<p><strong>Description:</strong> ${product.description}</p>` : ''}
                <p><strong>Created:</strong> ${Utils.formatDateTime(product.created_at)}</p>
                <p><strong>Last Updated:</strong> ${Utils.formatDateTime(product.updated_at)}</p>
            `;
            
            modal.classList.add('show');
        } catch (error) {
            Utils.showAlert('Failed to load product details', 'danger');
        }
    },

    editProduct(productId) {
        this.showProductModal(productId);
    },

    async deleteProduct(productId) {
        if (!confirm('Are you sure you want to delete this product?')) {
            return;
        }

        try {
            await api.delete(`/products/${productId}`);
            Utils.showAlert('Product deleted successfully');
            this.loadProducts(this.currentPage);
        } catch (error) {
            Utils.showAlert('Failed to delete product', 'danger');
        }
    },

    async exportProducts() {
        try {
            const response = await api.get('/products', { limit: 1000 });
            if (response && response.products) {
                Utils.exportToCSV(response.products, `products_${new Date().toISOString().split('T')[0]}.csv`);
                Utils.showAlert('Products exported successfully');
            }
        } catch (error) {
            Utils.showAlert('Failed to export products', 'danger');
        }
    }
};