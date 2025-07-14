const axios = require('axios');
const logger = require('../middleware/logger');

const EXCHANGE_API_KEY = process.env.EXCHANGE_RATE_API_KEY;
const BASE_URL = 'https://api.exchangerate-api.com/v4/latest';

let cachedRates = null;
let cacheExpiry = null;

const currencyService = {
  getExchangeRates: async (baseCurrency = 'USD') => {
    try {
      // Check cache
      if (cachedRates && cacheExpiry && new Date() < cacheExpiry) {
        return cachedRates;
      }
      
      const response = await axios.get(`${BASE_URL}/${baseCurrency}`);
      
      // Cache for 1 hour
      cachedRates = response.data.rates;
      cacheExpiry = new Date(Date.now() + 60 * 60 * 1000);
      
      return cachedRates;
    } catch (error) {
      logger.error(`Failed to fetch exchange rates: ${error.message}`);
      return null;
    }
  },
  
  convertCurrency: async (amount, fromCurrency, toCurrency) => {
    try {
      const rates = await currencyService.getExchangeRates(fromCurrency);
      if (!rates || !rates[toCurrency]) {
        throw new Error('Exchange rate not available');
      }
      
      return amount * rates[toCurrency];
    } catch (error) {
      logger.error(`Currency conversion error: ${error.message}`);
      throw error;
    }
  },
  
  formatMultiCurrency: async (amountUSD) => {
    try {
      const rates = await currencyService.getExchangeRates('USD');
      if (!rates) {
        return { USD: amountUSD };
      }
      
      return {
        USD: amountUSD,
        EUR: (amountUSD * rates.EUR).toFixed(2),
        GBP: (amountUSD * rates.GBP).toFixed(2),
        INR: (amountUSD * rates.INR).toFixed(2)
      };
    } catch (error) {
      logger.error(`Multi-currency formatting error: ${error.message}`);
      return { USD: amountUSD };
    }
  }
};

module.exports = currencyService;