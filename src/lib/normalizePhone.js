/**
 * Normalisasi nomor HP/WhatsApp ke format 628xxxxxxxxx
 * - Hapus spasi, strip, kurung, titik
 * - 08xxx → 628xxx
 * - +62xxx → 62xxx
 * - 62xxx → 62xxx (biarkan)
 * Returns { normalized, display, isValid, waUrl }
 */
export function normalizePhone(raw) {
  // Aman untuk semua tipe: null, undefined, number, "", dll
  if (raw === null || raw === undefined) return { normalized: "", display: "", isValid: false, waUrl: "" };
  const str = String(raw).trim();
  if (!str) return { normalized: "", display: "", isValid: false, waUrl: "" };

  // Bersihkan semua karakter non-digit kecuali +
  let cleaned = str.replace(/[\s\-().]/g, "");
  // Hapus + di depan
  cleaned = cleaned.replace(/^\+/, "");

  // Konversi prefix
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  } else if (!cleaned.startsWith("62")) {
    cleaned = "62" + cleaned;
  }

  // Validasi: hanya digit, panjang 10-15 digit
  const digitsOnly = /^\d+$/.test(cleaned);
  const validLength = cleaned.length >= 10 && cleaned.length <= 15;
  const isValid = digitsOnly && validLength;

  // Format tampilan: 628xxx → 08xxx
  const display = isValid ? "0" + cleaned.slice(2) : str;
  const waUrl = isValid ? `https://wa.me/${cleaned}` : "";

  return { normalized: isValid ? cleaned : str, display, isValid, waUrl };
}

/**
 * Hook-free input handler: normalisasi on blur
 * Returns a plain string ("" if invalid), safe for all input types.
 */
export function normalizePhoneInput(value) {
  const { normalized } = normalizePhone(value);
  return normalized || "";
}