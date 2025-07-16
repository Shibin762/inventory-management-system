// frontend/js/dashboard.js - FIXED VERSION
const Dashboard = {
    charts: {}, // Store chart instances
    
    async init() {
        await this.loadStats();
        await this.loadCharts();
        await this.loadRecentActivity();
        this.startAutoRefresh();
    },

    async loadStats() {
        try {
            const stats = await api.get('/dashboard/stats');
            
            // Update stat cards
            document.getElementById('stat-total-products').textContent = stats.totalProducts || 0;
            document.getElementById('stat-low-stock').textContent = stats.lowStockItems || 0;
            document.getElementById('stat-out-of-stock').textContent = stats.outOfStockItems || 0;
            document.getElementById('stat-inventory-value').textContent = Utils.formatCurrency(stats.totalInventoryValue || 0);
            document.getElementById('stat-active-suppliers').textContent = stats.activeSuppliers || 0;
            document.getElementById('stat-pending-orders').textContent = stats.pendingOrders || 0;
            
            // Load low stock alerts
            if (stats.lowStockItems > 0) {
                await this.loadLowStockAlerts();
            }
        } catch (error) {
            Utils.showAlert('Failed to load dashboard statistics', 'danger');
        }
    },

    async loadLowStockAlerts() {
        try {
            const products = await api.get('/products/low-stock');
            const container = document.getElementById('low-stock-alerts');
            
            if (!products || products.length === 0) {
                container.innerHTML = '<p class="text-muted">No low stock alerts</p>';
                return;
            }
            
            const table = `
                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>SKU</th>
                                <th>Product</th>
                                <th>Current Stock</th>
                                <th>Reorder Level</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${products.slice(0, 5).map(product => `
                                <tr>
                                    <td>${product.sku}</td>
                                    <td>${product.name}</td>
                                    <td class="stock-low">${product.quantity_in_stock}</td>
                                    <td>${product.reorder_level}</td>
                                    <td>
                                        <button class="btn btn-sm btn-warning" data-product-id="${product.id}">
                                            Create Order
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                ${products.length > 5 ? '<a href="#products" class="btn btn-link">View all low stock items</a>' : ''}
            `;
            
            container.innerHTML = table;
            
            // Add event listeners to buttons
            container.querySelectorAll('button[data-product-id]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const productId = e.target.dataset.productId;
                    this.createReorder(productId);
                });
            });
        } catch (error) {
            console.error('Failed to load low stock alerts:', error);
        }
    },

    async loadCharts() {
        await this.loadStockLevelChart();
        await this.loadMonthlyOrdersChart();
    },

    async loadStockLevelChart() {
        try {
            const data = await api.get('/dashboard/charts', { type: 'stock-levels' });
            
            const ctx = document.getElementById('stock-levels-chart');
            if (!ctx) return;
            
            // Destroy existing chart if it exists
            if (this.charts.stockLevels) {
                this.charts.stockLevels.destroy();
            }
            
            this.charts.stockLevels = new Chart(ctx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: data.map(d => d.category),
                    datasets: [{
                        label: 'Stock Quantity',
                        data: data.map(d => d.total_stock),
                        backgroundColor: 'rgba(54, 162, 235, 0.5)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Failed to load stock levels chart:', error);
        }
    },

    async loadMonthlyOrdersChart() {
        try {
            const data = await api.get('/dashboard/charts', { type: 'monthly-orders' });
            
            const ctx = document.getElementById('monthly-orders-chart');
            if (!ctx) return;
            
            // Destroy existing chart if it exists
            if (this.charts.monthlyOrders) {
                this.charts.monthlyOrders.destroy();
            }
            
            this.charts.monthlyOrders = new Chart(ctx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: data.map(d => d.month),
                    datasets: [{
                        label: 'Order Count',
                        data: data.map(d => d.order_count),
                        borderColor: 'rgba(255, 99, 132, 1)',
                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
                        yAxisID: 'y-count'
                    }, {
                        label: 'Total Value',
                        data: data.map(d => d.total_value),
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.1)',
                        yAxisID: 'y-value'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        'y-count': {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            beginAtZero: true
                        },
                        'y-value': {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            beginAtZero: true,
                            grid: {
                                drawOnChartArea: false
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Failed to load monthly orders chart:', error);
        }
    },

    async loadRecentActivity() {
        try {
            const stats = await api.get('/dashboard/stats');
            const container = document.getElementById('recent-activity');
            
            if (!stats.recentActivity || stats.recentActivity.length === 0) {
                container.innerHTML = '<p class="text-muted">No recent activity</p>';
                return;
            }
            
            const list = `
                <ul class="list-unstyled">
                    ${stats.recentActivity.map(activity => `
                        <li class="mb-2">
                            <small class="text-muted">${Utils.formatDateTime(activity.created_at)}</small><br>
                            <strong>${activity.username}</strong> - ${activity.type}: ${activity.item_name}
                        </li>
                    `).join('')}
                </ul>
            `;
            
            container.innerHTML = list;
        } catch (error) {
            console.error('Failed to load recent activity:', error);
        }
    },

    createReorder(productId) {
        // Navigate to orders page with product pre-selected
        window.location.href = `#orders?product=${productId}`;
    },

    startAutoRefresh() {
        // Clear any existing interval
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        // Refresh dashboard every 5 minutes
        this.refreshInterval = setInterval(() => {
            this.loadStats();
            this.loadRecentActivity();
        }, 5 * 60 * 1000);
    },
    
    // Clean up when leaving dashboard
    destroy() {
        // Clear interval
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        // Destroy charts
        if (this.charts.stockLevels) {
            this.charts.stockLevels.destroy();
        }
        if (this.charts.monthlyOrders) {
            this.charts.monthlyOrders.destroy();
        }
    }
};
