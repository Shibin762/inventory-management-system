function generateOrderNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `PO-${year}${month}${day}-${random}`;
}

function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

function calculateTotal(items) {
  return items.reduce((total, item) => {
    return total + (item.quantity * item.unit_cost);
  }, 0);
}

function parsePaginationParams(query) {
  const page = parseInt(query.page) || 1;
  const limit = Math.min(parseInt(query.limit) || 10, 100);
  const offset = (page - 1) * limit;
  
  return { page, limit, offset };
}

module.exports = {
  generateOrderNumber,
  formatCurrency,
  calculateTotal,
  parsePaginationParams
};
