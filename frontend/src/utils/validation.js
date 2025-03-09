// src/utils/validation.js
// Form validation utility functions

/**
 * Validate an email address
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid, false otherwise
 */
export const isValidEmail = (email) => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate a password (min 8 chars, at least 1 letter and 1 number)
 * @param {string} password - Password to validate
 * @returns {boolean} True if valid, false otherwise
 */
export const isValidPassword = (password) => {
  if (!password) return false;
  if (password.length < 8) return false;
  // Check for at least one letter and one number
  return /[A-Za-z]/.test(password) && /\d/.test(password);
};

/**
 * Get password strength (0-4)
 * @param {string} password - Password to check
 * @returns {number} Strength score (0-4)
 */
export const getPasswordStrength = (password) => {
  if (!password) return 0;
  
  let score = 0;
  
  // Length check
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  
  // Complexity checks
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  
  // Cap at 4
  return Math.min(4, Math.floor(score / 2));
};

/**
 * Get password strength label
 * @param {number} strength - Password strength (0-4)
 * @returns {string} Strength label
 */
export const getPasswordStrengthLabel = (strength) => {
  const labels = ['Very Weak', 'Weak', 'Medium', 'Strong', 'Very Strong'];
  return labels[strength] || labels[0];
};

/**
 * Validate a phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid, false otherwise
 */
export const isValidPhone = (phone) => {
  if (!phone) return false;
  // Basic phone validation (numbers, spaces, dashes, parentheses, plus)
  const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
  return phoneRegex.test(phone);
};

/**
 * Validate a URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid, false otherwise
 */
export const isValidUrl = (url) => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Validate form fields
 * @param {Object} fields - Form fields to validate
 * @param {Object} rules - Validation rules
 * @returns {Object} Validation result { isValid, errors }
 */
export const validateForm = (fields, rules) => {
  const errors = {};
  let isValid = true;
  
  Object.keys(rules).forEach((fieldName) => {
    const fieldRules = rules[fieldName];
    const fieldValue = fields[fieldName];
    
    // Required check
    if (fieldRules.required && !fieldValue) {
      errors[fieldName] = fieldRules.requiredMessage || 'This field is required';
      isValid = false;
      return;
    }
    
    // Skip other validations if field is empty and not required
    if (!fieldValue && !fieldRules.required) {
      return;
    }
    
    // Minimum length check
    if (fieldRules.minLength && fieldValue.length < fieldRules.minLength) {
      errors[fieldName] = fieldRules.minLengthMessage || 
        `Must be at least ${fieldRules.minLength} characters`;
      isValid = false;
      return;
    }
    
    // Maximum length check
    if (fieldRules.maxLength && fieldValue.length > fieldRules.maxLength) {
      errors[fieldName] = fieldRules.maxLengthMessage || 
        `Must be no more than ${fieldRules.maxLength} characters`;
      isValid = false;
      return;
    }
    
    // Pattern check
    if (fieldRules.pattern && !fieldRules.pattern.test(fieldValue)) {
      errors[fieldName] = fieldRules.patternMessage || 'Invalid format';
      isValid = false;
      return;
    }
    
    // Custom validation
    if (fieldRules.validate && typeof fieldRules.validate === 'function') {
      const customError = fieldRules.validate(fieldValue, fields);
      if (customError) {
        errors[fieldName] = customError;
        isValid = false;
        return;
      }
    }
  });
  
  return { isValid, errors };
}; 