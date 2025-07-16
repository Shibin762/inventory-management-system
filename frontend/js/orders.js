// frontend/js/orders.js
const Orders = {
    currentPage: 1,
    filters: {},
    orderItems: [],

    async init(params) {
        this.setupEventListeners();
        await this.loadSuppliers();
        await this.loadProducts();
        await this.loadOrders();
        
        // Check if product ID was passed
        if (params) {
            const urlParams = new URLSearchParams(params);
            const productId = urlParams.get('product');
            if (productId) {
                this.showOrderModal();
                this.addProductToOrder(productId);
            }
        }
    },

    setupEventListeners() {
        // Filters
        document.getElementById('order-status-filter')?.addEventListener('change', () => this.search());
        document.getElementById('order-supplier-filter')?.addEventListener('change', () => this.search());
        
        // Form
        document.getElementById('order-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveOrder();
        });
        
        // Add item button
        document.getElementById('add-order-item')?.addEventListener('click', () => this.addOrderItem());
    },

    async loadSuppliers() {
        try {
            const response = await api.get('/suppliers', { active: true, limit: 100 });
            const select = document.getElementById('order-supplier-filter');
            const formSelect = document.getElementById('order-supplier');
            
            const options = response.suppliers.map(supplier => 
                `<option value="${supplier.id}">${supplier.name}</option>`
            ).join('');
            
            if (select) select.innerHTML = '<option value="">All Suppliers</option>' + options;
            if (formSelect) formSelect.innerHTML = '<option value="">Select Supplier</option>' + options;
        } catch (error) {
            console.error('Failed to load suppliers:', error);
        }
    },

    async loadProducts() {
        try {
            const response = await api.get('/products', { limit: 1000 });
            this.productsData = response.products;
        } catch (error) {
            console.error('Failed to load products:', error);
        }
    },

    async loadOrders(page = 1) {
        try {
            Utils.showLoading(document.getElementById('orders-container'));
            
            this.currentPage = page;
            const params = {
                page: page,
                limit: 10,
                ...this.filters
            };

            const response = await api.get('/orders', params);
            this.displayOrders(response);
        } catch (error) {
            Utils.showAlert('Failed to load orders', 'danger');
        }
    },

    displayOrders(response) {
        const container = document.getElementById('orders-container');
        
        if (response.orders.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No orders found</p>';
            return;
        }

        const table = `
            <div class="table-responsive">
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>Order Number</th>
                            <th>Supplier</th>
                            <th>Date</th>
                            <th>Expected Delivery</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${response.orders.map(order => `
                            <tr>
                                <td>${order.order_number}</td>
                                <td>${order.supplier_name}</td>
                                <td>${Utils.formatDate(order.order_date)}</td>
                                <td>${order.expected_delivery ? Utils.formatDate(order.expected_delivery) : 'N/A'}</td>
                                <td>${Utils.formatCurrency(order.total_amount)}</td>
                                <td>${this.getStatusBadge(order.status)}</td>
                                <td>
                                    <div class="actions">
                                        <button class="btn btn-sm btn-info" onclick="Orders.viewOrder(${order.id})">
                                            View
                                        </button>
                                        ${Auth.hasAnyRole(['admin', 'manager']) && order.status === 'pending' ? `
                                            <button class="btn btn-sm btn-success" onclick="Orders.confirmOrder(${order.id})">
                                                Confirm
                                            </button>
                                        ` : ''}
                                        ${Auth.hasAnyRole(['admin', 'manager']) && order.status === 'confirmed' ? `
                                            <button class="btn btn-sm btn-primary" onclick="Orders.receiveOrder(${order.id})">
                                                Receive
                                            </button>
                                        ` : ''}
                                        ${Auth.hasAnyRole(['admin', 'manager']) && order.status === 'pending' ? `
                                            <button class="btn btn-sm btn-danger" onclick="Orders.cancelOrder(${order.id})">
                                                Cancel
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
        this.displayPagination(response.pagination);
    },

    getStatusBadge(status) {
        const badges = {
            pending: '<span class="badge badge-warning">Pending</span>',
            confirmed: '<span class="badge badge-info">Confirmed</span>',
            delivered: '<span class="badge badge-success">Delivered</span>',
            cancelled: '<span class="badge badge-danger">Cancelled</span>'
        };
        return badges[status] || status;
    },

    displayPagination(pagination) {
        const container = document.getElementById('orders-pagination');
        
        if (pagination.total_pages <= 1) {
            container.innerHTML = '';
            return;
        }

        const paginationHTML = `
            <ul class="pagination justify-content-center">
                <li class="page-item ${pagination.current_page === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" onclick="Orders.loadOrders(${pagination.current_page - 1})">
                        Previous
                    </a>
                </li>
                ${Array.from({length: pagination.total_pages}, (_, i) => i + 1).map(page => `
                    <li class="page-item ${page === pagination.current_page ? 'active' : ''}">
                        <a class="page-link" href="#" onclick="Orders.loadOrders(${page})">${page}</a>
                    </li>
                `).join('')}
                <li class="page-item ${pagination.current_page === pagination.total_pages ? 'disabled' : ''}">
                    <a class="page-link" href="#" onclick="Orders.loadOrders(${pagination.current_page + 1})">
                        Next
                    </a>
                </li>
            </ul>
        `;

        container.innerHTML = paginationHTML;
    },

    search() {
        this.filters = {
            status: document.getElementById('order-status-filter').value,
            supplier_id: document.getElementById('order-supplier-filter').value
        };
        this.loadOrders(1);
    },

    showOrderModal() {
        const modal = document.getElementById('order-modal');
        const form = document.getElementById('order-form');
        
        form.reset();
        this.orderItems = [];
        this.updateOrderItemsDisplay();
        
        modal.classList.add('show');
    },

    closeOrderModal() {
        const modal = document.getElementById('order-modal');
        modal.classList.remove('show');
    },

    addOrderItem() {
        const itemsContainer = document.getElementById('order-items');
        const itemIndex = this.orderItems.length;
        
        const itemHTML = `
            <div class="order-item card mb-2" data-index="${itemIndex}">
                <div class="card-body">
                    <div class="form-row">
                        <div class="form-group col-md-5">
                            <label>Product</label>
                            <select class="form-control" id="item-product-${itemIndex}" onchange="Orders.updateItemPrice(${itemIndex})">
                                <option value="">Select Product</option>
                                ${this.productsData.map(product => 
                                    `<option value="${product.id}" data-price="${product.unit_price}">${product.name} (${product.sku})</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="form-group col-md-2">
                            <label>Quantity</label>
                            <input type="number" class="form-control" id="item-quantity-${itemIndex}" 
                                   min="1" value="1" onchange="Orders.updateItemTotal(${itemIndex})">
                        </div>
                        <div class="form-group col-md-2">
                            <label>Unit Cost</label>
                            <input type="number" class="form-control" id="item-cost-${itemIndex}" 
                                   min="0" step="0.01" value="0" onchange="Orders.updateItemTotal(${itemIndex})">
                        </div>
                        <div class="form-group col-md-2">
                            <label>Total</label>
                            <input type="text" class="form-control" id="item-total-${itemIndex}" readonly>
                        </div>
                        <div class="form-group col-md-1">
                            <label>&nbsp;</label>
                            <button type="button" class="btn btn-danger btn-block" onclick="Orders.removeItem(${itemIndex})">
                                &times;
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        itemsContainer.insertAdjacentHTML('beforeend', itemHTML);
        this.orderItems.push({ index: itemIndex });
    },

    addProductToOrder(productId) {
        this.addOrderItem();
        const itemIndex = this.orderItems.length - 1;
        document.getElementById(`item-product-${itemIndex}`).value = productId;
        this.updateItemPrice(itemIndex);
    },

    updateItemPrice(itemIndex) {
        const select = document.getElementById(`item-product-${itemIndex}`);
        const option = select.options[select.selectedIndex];
        const price = parseFloat(option.dataset.price) || 0;
        
        document.getElementById(`item-cost-${itemIndex}`).value = price.toFixed(2);
        this.updateItemTotal(itemIndex);
    },

    updateItemTotal(itemIndex) {
        const quantity = parseInt(document.getElementById(`item-quantity-${itemIndex}`).value) || 0;
        const cost = parseFloat(document.getElementById(`item-cost-${itemIndex}`).value) || 0;
        const total = quantity * cost;
        
        document.getElementById(`item-total-${itemIndex}`).value = Utils.formatCurrency(total);
        this.updateOrderTotal();
    },

    updateOrderTotal() {
        let total = 0;
        this.orderItems.forEach(item => {
            const quantity = parseInt(document.getElementById(`item-quantity-${item.index}`).value) || 0;
            const cost = parseFloat(document.getElementById(`item-cost-${item.index}`).value) || 0;
            total += quantity * cost;
        });
        
        document.getElementById('order-total').textContent = Utils.formatCurrency(total);
    },

    removeItem(itemIndex) {
        const item = document.querySelector(`.order-item[data-index="${itemIndex}"]`);
        item.remove();
        this.orderItems = this.orderItems.filter(i => i.index !== itemIndex);
        this.updateOrderTotal();
    },

    updateOrderItemsDisplay() {
        const itemsContainer = document.getElementById('order-items');
        itemsContainer.innerHTML = '';
        this.updateOrderTotal();
    },

    async saveOrder() {
        const supplierId = document.getElementById('order-supplier').value;
        const expectedDelivery = document.getElementById('order-delivery').value;
        const notes = document.getElementById('order-notes').value;
        
        if (!supplierId) {
            Utils.showAlert('Please select a supplier', 'danger');
            return;
        }
        
        const items = [];
        let hasError = false;
        
        this.orderItems.forEach(item => {
            const productId = document.getElementById(`item-product-${item.index}`).value;
            const quantity = parseInt(document.getElementById(`item-quantity-${item.index}`).value);
            const unitCost = parseFloat(document.getElementById(`item-cost-${item.index}`).value);
            
            if (!productId || !quantity || !unitCost) {
                hasError = true;
                return;
            }
            
            items.push({
                product_id: productId,
                quantity: quantity,
                unit_cost: unitCost
            });
        });
        
        if (hasError || items.length === 0) {
            Utils.showAlert('Please complete all order items', 'danger');
            return;
        }
        
        const data = {
            supplier_id: supplierId,
            expected_delivery: expectedDelivery || null,
            notes: notes,
            items: items
        };

        try {
            await api.post('/orders', data);
            Utils.showAlert('Order created successfully');
            this.closeOrderModal();
            this.loadOrders(this.currentPage);
        } catch (error) {
            Utils.showAlert(error.message || 'Failed to create order', 'danger');
        }
    },

    async viewOrder(orderId) {
        try {
            const order = await api.get(`/orders/${orderId}`);
            
            const modal = document.getElementById('view-modal');
            const content = document.getElementById('view-modal-content');
            
            content.innerHTML = `
                <h3>Order ${order.order_number}</h3>
                <div class="row mb-3">
                    <div class="col-md-6">
                        <p><strong>Supplier:</strong> ${order.supplier_name}</p>
                        <p><strong>Order Date:</strong> ${Utils.formatDateTime(order.order_date)}</p>
                        <p><strong>Expected Delivery:</strong> ${order.expected_delivery ? Utils.formatDate(order.expected_delivery) : 'N/A'}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Status:</strong> ${this.getStatusBadge(order.status)}</p>
                        <p><strong>Total Amount:</strong> ${Utils.formatCurrency(order.total_amount)}</p>
                        <p><strong>Created By:</strong> ${order.created_by_name}</p>
                    </div>
                </div>
                ${order.notes ? `<p><strong>Notes:</strong> ${order.notes}</p>` : ''}
                <h4>Order Items</h4>
                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>SKU</th>
                                <th>Quantity</th>
                                <th>Unit Cost</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${order.items.map(item => `
                                <tr>
                                    <td>${item.product_name}</td>
                                    <td>${item.sku}</td>
                                    <td>${item.quantity}</td>
                                    <td>${Utils.formatCurrency(item.unit_cost)}</td>
                                    <td>${Utils.formatCurrency(item.total_cost)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr>
                                <th colspan="4" class="text-right">Total:</th>
                                <th>${Utils.formatCurrency(order.total_amount)}</th>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            `;
            
            modal.classList.add('show');
        } catch (error) {
            Utils.showAlert('Failed to load order details', 'danger');
        }
    },

    async confirmOrder(orderId) {
        if (!confirm('Are you sure you want to confirm this order?')) {
            return;
        }

        try {
            await api.put(`/orders/${orderId}/status`, { status: 'confirmed' });
            Utils.showAlert('Order confirmed successfully');
            this.loadOrders(this.currentPage);
        } catch (error) {
            Utils.showAlert('Failed to confirm order', 'danger');
        }
    },

    async receiveOrder(orderId) {
        if (!confirm('Are you sure you want to mark this order as received? This will update product stock levels.')) {
            return;
        }

        try {
            await api.post(`/orders/${orderId}/receive`);
            Utils.showAlert('Order received successfully. Stock levels updated.');
            this.loadOrders(this.currentPage);
        } catch (error) {
            Utils.showAlert('Failed to receive order', 'danger');
        }
    },

    async cancelOrder(orderId) {
        if (!confirm('Are you sure you want to cancel this order?')) {
            return;
        }

        try {
            await api.put(`/orders/${orderId}/status`, { status: 'cancelled' });
            Utils.showAlert('Order cancelled successfully');
            this.loadOrders(this.currentPage);
        } catch (error) {
            Utils.showAlert('Failed to cancel order', 'danger');
        }
    }
};
