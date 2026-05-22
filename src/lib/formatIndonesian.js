/**
 * Format currency to Indonesian Rupiah format
 * @param {number} amount - Amount in number
 * @returns {string} Formatted string like "Rp 1.500.000"
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return "Rp 0";
  return `Rp ${new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)}`;
}

/**
 * Format currency with decimals
 * @param {number} amount - Amount in number
 * @returns {string} Formatted string like "Rp 1.500.000,50"
 */
export function formatCurrencyDecimal(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return "Rp 0";
  return `Rp ${new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

/**
 * Format date to Indonesian long format
 * @param {string|Date} date - Date string or Date object
 * @returns {string} Formatted string like "23 Mei 2026"
 */
export function formatDateIndonesian(date) {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  
  return `${day} ${month} ${year}`;
}

/**
 * Format date to Indonesian short format
 * @param {string|Date} date - Date string or Date object
 * @returns {string} Formatted string like "23/05/2026"
 */
export function formatDateShort(date) {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}/${month}/${year}`;
}

/**
 * Format date with time
 * @param {string|Date} date - Date string or Date object
 * @returns {string} Formatted string like "23 Mei 2026, 14:30"
 */
export function formatDateTime(date) {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  
  const dateStr = formatDateIndonesian(date);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${dateStr}, ${hours}:${minutes}`;
}

/**
 * Format number with Indonesian thousand separator
 * @param {number} num - Number to format
 * @returns {string} Formatted string like "1.500"
 */
export function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return "0";
  return new Intl.NumberFormat('id-ID').format(num);
}

/**
 * Parse Indonesian currency string to number
 * @param {string} str - Currency string like "Rp 1.500.000"
 * @returns {number} Parsed number
 */
export function parseCurrency(str) {
  if (!str) return 0;
  const cleaned = str.replace(/[^0-9,-]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}