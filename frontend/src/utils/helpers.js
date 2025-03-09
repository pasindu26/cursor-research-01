// src/utils/helpers.js
// Common utility functions

/**
 * Format a date string or timestamp
 * @param {string|number} date - Date string or timestamp
 * @param {string} format - Format string (default: 'YYYY-MM-DD HH:mm:ss')
 * @returns {string} Formatted date string
 */
export const formatDate = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid date';
  
  // Simple formatter - for more complex formatting, consider using a library like date-fns
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
};

/**
 * Format a number with specified decimal places and thousands separator
 * @param {number} number - Number to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @param {string} decimalSeparator - Decimal separator (default: '.')
 * @param {string} thousandsSeparator - Thousands separator (default: ',')
 * @returns {string} Formatted number string
 */
export const formatNumber = (
  number,
  decimals = 2,
  decimalSeparator = '.',
  thousandsSeparator = ','
) => {
  if (number === null || number === undefined) return '';
  
  const num = Number(number);
  if (isNaN(num)) return 'Invalid number';
  
  const fixed = num.toFixed(decimals);
  const [whole, fraction] = fixed.split('.');
  
  // Add thousands separator
  const withSeparator = whole.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
  
  return fraction ? `${withSeparator}${decimalSeparator}${fraction}` : withSeparator;
};

/**
 * Truncate a string to a specified length and add ellipsis
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length (default: 50)
 * @returns {string} Truncated string
 */
export const truncateString = (str, maxLength = 50) => {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return `${str.substring(0, maxLength)}...`;
};

/**
 * Debounce a function call
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds (default: 300)
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait = 300) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Generate a random ID
 * @param {number} length - Length of the ID (default: 8)
 * @returns {string} Random ID
 */
export const generateId = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Check if an object is empty
 * @param {Object} obj - Object to check
 * @returns {boolean} True if empty, false otherwise
 */
export const isEmptyObject = (obj) => {
  return obj && Object.keys(obj).length === 0 && obj.constructor === Object;
}; 