// frontend/js/reports.js
const Reports = {
    async init() {
        this.setupEventListeners();
        await this.loadInventoryReport();
    },

    setupEventListeners() {
        document.getElementById('report-type')?.addEventListener('change', (e) => {
            this.switchReport(e.target.value);
        });
    },

    switchReport(reportType) {
        // Hide all report sections
        document.querySelectorAll('.report-section').forEach(section => {
            section.style.display = 'none';
        });
        
        // Show selected report
        const selectedSection = document.getElementById(`${reportType}-report`);
        if (selectedSection) {
            selectedSection.style.display = 'block';
            
            // Load report data
            switch (reportType) {
                case 'inventory':
                    this.loadInventoryReport();
                    break;
                case 'supplier':
                    this.loadSupplierReport();
                    break;
                case 'reorder':
                    this.loadReorderReport();
                    break;
                case 'movement':
                    this.loadMovementReport();
                    break;
            }
        }
    },

    async loadInventoryReport() {
        try {
            const container = document.getElementById('inventory-report-content');
            Utils.showLoading(container);
            
            const report = await api.get('/reports/inventory');
            
            const html = `
                <div class="row mb-4">
                    <div class="col-md-3">
                        <div class="stat-card">
                            <div class="stat-value">${report.summary.total_items}</div>
                            <div class="stat-label">Total Items</div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="stat-card">
                            <div class="stat-value">${Utils.formatCurrency(report.summary.total_value)}</div>
                            <div class="stat-label">Total Value</div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="stat-card">
                            <div class="stat-value stock-low">${report.summary.low_stock}</div>
                            <div class="stat-label">Low Stock Items</div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="stat-card">
                            <div class="stat-value stock-out">${report.summary.out_of_stock}</div>
                            <div class="stat-label">Out of Stock</div>
                        </div>
                    </div>
                </div>
                
                <div class="mb-3">
                    <button class="btn btn-primary" onclick="Reports.exportInventoryReport()">
                        Export to Excel
                    </button>
                    <button class="btn btn-secondary" onclick="Reports.printReport('inventory-report')">
                        Print Report
                    </button>
                </div>
                
                <div class="table-responsive">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>SKU</th>
                                <th>Product Name</th>
                                <th>Category</th>
                                <th>Stock</th>
                                <th>Unit Price</th>
                                <th>Stock Value</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${report.report.map(item => `
                                <tr>
                                    <td>${item.sku}</td>
                                    <td>${item.name}</td>
                                    <td>${item.category || 'N/A'}</td>
                                    <td>${item.quantity_in_stock}</td>
                                    <td>${Utils.formatCurrency(item.unit_price)}</td>
                                    <td>${Utils.formatCurrency(item.stock_value)}</td>
                                    <td>
                                        <span class="badge badge-${
                                            item.status === 'In Stock' ? 'success' : 
                                            item.status === 'Low Stock' ? 'warning' : 'danger'
                                        }">${item.status}</span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr>
                                <th colspan="5">Total</th>
                                <th>${Utils.formatCurrency(report.summary.total_value)}</th>
                                <th></th>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            `;
            
            container.innerHTML = html;
        } catch (error) {
            Utils.showAlert('Failed to load inventory report', 'danger');
        }
    },

    async loadSupplierReport() {
        try {
            const container = document.getElementById('supplier-report-content');
            Utils.showLoading(container);
            
            const report = await api.get('/reports/supplier-performance');
            
            const html = `
                <div class="mb-3">
                    <button class="btn btn-primary" onclick="Reports.exportSupplierReport()">
                        Export to Excel
                    </button>
                    <button class="btn btn-secondary" onclick="Reports.printReport('supplier-report')">
                        Print Report
                    </button>
                </div>
                
                <div class="table-responsive">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>Supplier</th>
                                <th>Total Orders</th>
                                <th>Total Spent</th>
                                <th>Avg Delivery Time</th>
                                <th>Products Supplied</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${report.map(supplier => `
                                <tr>
                                    <td>${supplier.name}</td>
                                    <td>${supplier.total_orders}</td>
                                    <td>${Utils.formatCurrency(supplier.total_spent || 0)}</td>
                                    <td>${supplier.avg_delivery_days ? `${Math.round(supplier.avg_delivery_days)} days` : 'N/A'}</td>
                                    <td>${supplier.products_supplied}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            
            container.innerHTML = html;
        } catch (error) {
            Utils.showAlert('Failed to load supplier report', 'danger');
        }
    },

    async loadReorderReport() {
        try {
            const container = document.getElementById('reorder-report-content');
            Utils.showLoading(container);
            
            const report = await api.get('/reports/reorder-suggestions');
            
            const html = `
                <div class="mb-3">
                    <button class="btn btn-primary" onclick="Reports.createBulkOrders()">
                        Create Bulk Orders
                    </button>
                    <button class="btn btn-secondary" onclick="Reports.exportReorderReport()">
                        Export to Excel
                    </button>
                </div>
                
                <div class="accordion" id="reorderAccordion">
                    ${report.map((item, index) => `
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">
                                    <button class="btn btn-link" type="button" data-toggle="collapse" 
                                            data-target="#collapse${index}">
                                        ${item.name} (${item.sku}) - 
                                        <span class="stock-low">Stock: ${item.current_stock}/${item.reorder_level}</span>
                                    </button>
                                </h5>
                            </div>
                            <div id="collapse${index}" class="collapse" data-parent="#reorderAccordion">
                                <div class="card-body">
                                    <p><strong>Category:</strong> ${item.category || 'N/A'}</p>
                                    <p><strong>Reorder Quantity:</strong> ${item.reorder_quantity}</p>
                                    
                                    ${item.suppliers.length > 0 ? `
                                        <h6>Available Suppliers:</h6>
                                        <div class="table-responsive">
                                            <table class="table table-sm">
                                                <thead>
                                                    <tr>
                                                        <th>Supplier</th>
                                                        <th>Cost Price</th>
                                                        <th>Lead Time</th>
                                                        <th>Est. Cost</th>
                                                        <th>Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${item.suppliers.map(supplier => `
                                                        <tr>
                                                            <td>${supplier.supplier_name}</td>
                                                            <td>${Utils.formatCurrency(supplier.cost_price)}</td>
                                                            <td>${supplier.lead_time_days} days</td>
                                                            <td>${Utils.formatCurrency(supplier.estimated_cost)}</td>
                                                            <td>
                                                                <button class="btn btn-sm btn-warning" 
                                                                        onclick="Reports.createReorderFromSuggestion(${item.product_id}, ${supplier.supplier_id})">
                                                                    Order
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    `).join('')}
                                                </tbody>
                                            </table>
                                        </div>
                                    ` : '<p class="text-muted">No suppliers configured for this product</p>'}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            
            container.innerHTML = html;
        } catch (error) {
            Utils.showAlert('Failed to load reorder suggestions', 'danger');
        }
    },

    async loadMovementReport() {
        try {
            const container = document.getElementById('movement-report-content');
            Utils.showLoading(container);
            
            // Get filter values
            const productId = document.getElementById('movement-product-filter').value;
            const fromDate = document.getElementById('movement-from-date').value;
            const toDate = document.getElementById('movement-to-date').value;
            const movementType = document.getElementById('movement-type-filter').value;
            
            const params = {
                product_id: productId,
                from_date: fromDate,
                to_date: toDate,
                movement_type: movementType
            };
            
            const report = await api.get('/reports/stock-movements', params);
            
            const html = `
                <div class="mb-3">
                    <button class="btn btn-primary" onclick="Reports.exportMovementReport()">
                        Export to Excel
                    </button>
                    <button class="btn btn-secondary" onclick="Reports.printReport('movement-report')">
                        Print Report
                    </button>
                </div>
                
                <div class="table-responsive">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>Date/Time</th>
                                <th>Product</th>
                                <th>SKU</th>
                                <th>Type</th>
                                <th>Quantity</th>
                                <th>Reference</th>
                                <th>Notes</th>
                                <th>User</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${report.map(movement => `
                                <tr>
                                    <td>${Utils.formatDateTime(movement.created_at)}</td>
                                    <td>${movement.product_name}</td>
                                    <td>${movement.sku}</td>
                                    <td>
                                        <span class="badge badge-${
                                            movement.movement_type === 'in' ? 'success' : 
                                            movement.movement_type === 'out' ? 'danger' : 'warning'
                                        }">${movement.movement_type}</span>
                                    </td>
                                    <td>${movement.movement_type === 'out' ? '-' : ''}${movement.quantity}</td>
                                    <td>${movement.reference_type || 'N/A'}</td>
                                    <td>${movement.notes || ''}</td>
                                    <td>${movement.created_by_name}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            
            container.innerHTML = html;
        } catch (error) {
            Utils.showAlert('Failed to load stock movement report', 'danger');
        }
    },

    async exportInventoryReport() {
        try {
            const report = await api.get('/reports/inventory');
            const data = report.report.map(item => ({
                SKU: item.sku,
                'Product Name': item.name,
                Category: item.category || 'N/A',
                Stock: item.quantity_in_stock,
                'Unit Price': item.unit_price,
                'Stock Value': item.stock_value,
                Status: item.status
            }));
            
            this.exportToExcel(data, 'inventory_report');
        } catch (error) {
            Utils.showAlert('Failed to export report', 'danger');
        }
    },

    async exportSupplierReport() {
        try {
            const report = await api.get('/reports/supplier-performance');
            const data = report.map(supplier => ({
                Supplier: supplier.name,
                'Total Orders': supplier.total_orders,
                'Total Spent': supplier.total_spent || 0,
                'Avg Delivery Days': supplier.avg_delivery_days || 'N/A',
                'Products Supplied': supplier.products_supplied
            }));
            
            this.exportToExcel(data, 'supplier_performance_report');
        } catch (error) {
            Utils.showAlert('Failed to export report', 'danger');
        }
    },

    async exportReorderReport() {
        try {
            const report = await api.get('/reports/reorder-suggestions');
            const data = [];
            
            report.forEach(item => {
                item.suppliers.forEach(supplier => {
                    data.push({
                        SKU: item.sku,
                        'Product Name': item.name,
                        Category: item.category || 'N/A',
                        'Current Stock': item.current_stock,
                        'Reorder Level': item.reorder_level,
                        'Reorder Quantity': item.reorder_quantity,
                        Supplier: supplier.supplier_name,
                        'Cost Price': supplier.cost_price,
                        'Lead Time (Days)': supplier.lead_time_days,
                        'Estimated Cost': supplier.estimated_cost
                    });
                });
            });
            
            this.exportToExcel(data, 'reorder_suggestions');
        } catch (error) {
            Utils.showAlert('Failed to export report', 'danger');
        }
    },

    async exportMovementReport() {
        try {
            const params = {
                product_id: document.getElementById('movement-product-filter').value,
                from_date: document.getElementById('movement-from-date').value,
                to_date: document.getElementById('movement-to-date').value,
                movement_type: document.getElementById('movement-type-filter').value
            };
            
            const report = await api.get('/reports/stock-movements', params);
            const data = report.map(movement => ({
                'Date/Time': movement.created_at,
                Product: movement.product_name,
                SKU: movement.sku,
                Type: movement.movement_type,
                Quantity: movement.quantity,
                Reference: movement.reference_type || 'N/A',
                Notes: movement.notes || '',
                User: movement.created_by_name
            }));
            
            this.exportToExcel(data, 'stock_movements');
        } catch (error) {
            Utils.showAlert('Failed to export report', 'danger');
        }
    },

    exportToExcel(data, filename) {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Report');
        
        // Generate filename with date
        const date = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `${filename}_${date}.xlsx`);
    },

    printReport(reportId) {
        const reportContent = document.getElementById(reportId).innerHTML;
        const printWindow = window.open('', '', 'height=600,width=800');
        
        printWindow.document.write('<html><head><title>Report</title>');
        printWindow.document.write('<link rel="stylesheet" href="css/styles.css">');
        printWindow.document.write('</head><body>');
        printWindow.document.write(reportContent);
        printWindow.document.write('</body></html>');
        
        printWindow.document.close();
        printWindow.print();
    },

    createReorderFromSuggestion(productId, supplierId) {
        // Navigate to orders page with pre-filled data
        window.location.href = `#orders?product=${productId}&supplier=${supplierId}`;
    },

    async createBulkOrders() {
        if (!confirm('This will create purchase orders for all reorder suggestions. Continue?')) {
            return;
        }
        
        try {
            const suggestions = await api.get('/reports/reorder-suggestions');
            
            // Group by supplier
            const ordersBySupplier = {};
            suggestions.forEach(item => {
                if (item.suppliers.length > 0) {
                    // Use first supplier as default
                    const supplier = item.suppliers[0];
                    if (!ordersBySupplier[supplier.supplier_id]) {
                        ordersBySupplier[supplier.supplier_id] = {
                            supplier_id: supplier.supplier_id,
                            items: []
                        };
                    }
                    
                    ordersBySupplier[supplier.supplier_id].items.push({
                        product_id: item.product_id,
                        quantity: item.reorder_quantity,
                        unit_cost: supplier.cost_price
                    });
                }
            });
            
            // Create orders
            const promises = Object.values(ordersBySupplier).map(order => 
                api.post('/orders', {
                    supplier_id: order.supplier_id,
                    notes: 'Bulk reorder based on system suggestions',
                    items: order.items
                })
            );
            
            await Promise.all(promises);
            Utils.showAlert(`Created ${promises.length} purchase orders successfully`);
            
            // Navigate to orders page
            window.location.href = '#orders';
        } catch (error) {
            Utils.showAlert('Failed to create bulk orders', 'danger');
        }
    }
};