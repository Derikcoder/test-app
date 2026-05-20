/**
 * @file passwordSecurity.js
 * @description Shared password security evaluators for consistent password field UX.
 */

export const evaluatePasswordSecurity = (password = '') => {
  const value = String(password || '');
  const hasLower = /[a-z]/.test(value);
  const hasUpper = /[A-Z]/.test(value);
  const hasDigit = /\d/.test(value);
  const hasSpecial = /[^A-Za-z0-9]/.test(value);
  const hasLength = value.length >= 12;

  const isSecure = hasLower && hasUpper && hasDigit && hasSpecial && hasLength;

  return {
    isSecure,
    label: isSecure
      ? 'Secure password'
      : 'Add uppercase, lowercase, number, symbol, and 12+ chars',
  };
};

export const getPasswordInputBorderClass = (password = '') => {
  if (!password) return 'border-white/15';
  return evaluatePasswordSecurity(password).isSecure ? 'border-emerald-400/60' : 'border-amber-400/60';
};

export const getConfirmPasswordBorderClass = (password = '', confirmPassword = '') => {
  if (!confirmPassword) return 'border-white/15';
  return password === confirmPassword ? 'border-emerald-400/60' : 'border-rose-400/60';
};
