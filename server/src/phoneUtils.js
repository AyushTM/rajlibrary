function normalizeIndianPhoneNumber(value) {
  if (!value && value !== 0) {
    return null;
  }

  let digits = String(value).replace(/\D/g, '');

  if (!digits) {
    return null;
  }

  if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1);
  }

  if (digits.startsWith('91') && digits.length === 12) {
    return digits;
  }

  if (digits.length === 10) {
    return `91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith('0')) {
    return `91${digits.slice(1)}`;
  }

  return digits;
}

module.exports = {
  normalizeIndianPhoneNumber,
};