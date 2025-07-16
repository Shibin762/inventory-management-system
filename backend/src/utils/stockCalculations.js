// backend/src/utils/stockCalculations.js - Make sure this exists
function calculateReorderPoint(product) {
  const averageDailyUsage = product.average_daily_usage || 0;
  const leadTimeDays = product.lead_time_days || 0;
  const safetyStock = product.safety_stock || 0;
  
  return (averageDailyUsage * leadTimeDays) + safetyStock;
}

function shouldReorder(product) {
  return product.quantity_in_stock <= product.reorder_level;
}

function calculateStockValue(products) {
  if (!products || !Array.isArray(products)) return 0;
  
  return products.reduce((total, product) => {
    const price = product.unit_price || 0;
    const quantity = product.quantity_in_stock || 0;
    return total + (price * quantity);
  }, 0);
}

function getStockStatus(product) {
  if (!product) return 'unknown';
  
  if (product.quantity_in_stock <= 0) {
    return 'out_of_stock';
  } else if (product.quantity_in_stock <= product.reorder_level) {
    return 'low_stock';
  } else {
    return 'in_stock';
  }
}

module.exports = {
  calculateReorderPoint,
  shouldReorder,
  calculateStockValue,
  getStockStatus
};