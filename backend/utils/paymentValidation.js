function validateVPA(vpa) {
  const pattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
  return pattern.test(vpa);
}

function normalizeCardNumber(cardNumber) {
  return String(cardNumber || '').replace(/[\s-]/g, '');
}

function luhnCheck(cardNumber) {
  const digits = normalizeCardNumber(cardNumber);
  if (!/^\d{13,19}$/.test(digits)) return false;

  let sum = 0;
  let shouldDouble = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

function detectCardNetwork(cardNumber) {
  const digits = normalizeCardNumber(cardNumber);
  const firstTwo = Number(digits.slice(0, 2));

  if (digits.startsWith('4')) return 'visa';
  if (firstTwo >= 51 && firstTwo <= 55) return 'mastercard';
  if (firstTwo === 34 || firstTwo === 37) return 'amex';
  if (digits.startsWith('60') || digits.startsWith('65') || (firstTwo >= 81 && firstTwo <= 89)) return 'rupay';

  return 'unknown';
}

function validateExpiry(monthValue, yearValue) {
  const month = Number(monthValue);
  let year = Number(yearValue);

  if (!Number.isInteger(month) || month < 1 || month > 12) return false;
  if (!Number.isInteger(year)) return false;

  if (String(yearValue).length === 2) year += 2000;
  if (String(year).length !== 4) return false;

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const expiryMonthStart = new Date(year, month - 1, 1);
  return expiryMonthStart >= currentMonthStart;
}

function getPaymentProcessingDelay() {
  const testMode = String(process.env.TEST_MODE || 'false').toLowerCase() === 'true';
  if (testMode) {
    const delay = Number(process.env.TEST_PROCESSING_DELAY || 1000);
    return Number.isFinite(delay) && delay >= 0 ? delay : 1000;
  }

  const min = Number(process.env.PROCESSING_DELAY_MIN || 5000);
  const max = Number(process.env.PROCESSING_DELAY_MAX || 10000);
  const safeMin = Number.isFinite(min) ? min : 5000;
  const safeMax = Number.isFinite(max) ? max : 10000;
  const lower = Math.min(safeMin, safeMax);
  const upper = Math.max(safeMin, safeMax);
  return Math.floor(Math.random() * (upper - lower + 1)) + lower;
}

function shouldPaymentSucceed(method) {
  const testMode = String(process.env.TEST_MODE || 'false').toLowerCase() === 'true';
  if (testMode) {
    const explicit = process.env.TEST_PAYMENT_SUCCESS;
    if (explicit === undefined) return true;
    return String(explicit).toLowerCase() !== 'false';
  }

  const upiRate = Number(process.env.UPI_SUCCESS_RATE || 0.9);
  const cardRate = Number(process.env.CARD_SUCCESS_RATE || 0.95);
  const threshold = method === 'upi' ? upiRate : cardRate;
  return Math.random() < threshold;
}

function getRefundProcessingDelay() {
  return Math.floor(Math.random() * (5000 - 3000 + 1)) + 3000;
}

function getWebhookRetryIntervalsInSeconds() {
  const testIntervals = String(process.env.WEBHOOK_RETRY_INTERVALS_TEST || 'false').toLowerCase() === 'true';
  if (testIntervals) {
    return [0, 5, 10, 15, 20];
  }
  return [0, 60, 300, 1800, 7200];
}

module.exports = {
  validateVPA,
  normalizeCardNumber,
  luhnCheck,
  detectCardNetwork,
  validateExpiry,
  getPaymentProcessingDelay,
  shouldPaymentSucceed,
  getRefundProcessingDelay,
  getWebhookRetryIntervalsInSeconds,
};
