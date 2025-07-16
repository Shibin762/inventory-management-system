
// backend/src/utils/constants.js - Make sure this file exists
module.exports = {
  USER_ROLES: {
    ADMIN: 'admin',
    MANAGER: 'manager',
    STAFF: 'staff'
  },
  ORDER_STATUS: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled'
  },
  MOVEMENT_TYPES: {
    IN: 'in',
    OUT: 'out',
    ADJUSTMENT: 'adjustment'
  },
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100
  }
};