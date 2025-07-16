function validateProduct(data) {
  const errors = [];
  
  if (!data.sku) errors.push('SKU is required');
  if (!data.name) errors.push('Name is required');
  if (!data.unit_price && data.unit_price !== 0) errors.push('Unit price is required');
  
  if (data.sku && !/^[A-Za-z0-9-]+$/.test(data.sku)) {
    errors.push('SKU can only contain letters, numbers, and hyphens');
  }
  
  if (data.unit_price < 0) errors.push('Unit price must be non-negative');
  if (data.quantity_in_stock < 0) errors.push('Quantity must be non-negative');
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

function validateSupplier(data) {
  const errors = [];
  
  if (!data.name) errors.push('Supplier name is required');
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Invalid email format');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

function validateOrder(data) {
  const errors = [];
  
  if (!data.supplier_id) errors.push('Supplier is required');
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    errors.push('Order must contain at least one item');
  }
  
  if (data.items) {
    data.items.forEach((item, index) => {
      if (!item.product_id) errors.push(`Item ${index + 1}: Product is required`);
      if (!item.quantity || item.quantity <= 0) errors.push(`Item ${index + 1}: Valid quantity is required`);
      if (!item.unit_cost || item.unit_cost < 0) errors.push(`Item ${index + 1}: Valid unit cost is required`);
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

function validateUser(data) {
  const errors = [];
  
  if (!data.username) errors.push('Username is required');
  if (!data.password) errors.push('Password is required');
  if (data.password && data.password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (data.role && !['admin', 'manager', 'staff'].includes(data.role)) {
    errors.push('Role must be admin, manager, or staff');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateProduct,
  validateSupplier,
  validateOrder,
  validateUser
};