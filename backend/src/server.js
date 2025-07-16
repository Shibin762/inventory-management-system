// backend/src/server.js - UPDATED to load env first
require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;

// Verify environment variables are loaded
console.log('Environment:', process.env.NODE_ENV);
console.log('JWT Secret exists:', !!process.env.JWT_SECRET);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});