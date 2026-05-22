// Utility: cek kelengkapan data per entity

export const INCOMPLETE_CHECKS = {
  tortoise: {
    label: "Kura-kura",
    fields: [
      { key: "photo_url", label: "Foto", check: (d) => !!d.photo_url || (Array.isArray(d.photos) && d.photos.length > 0) },
      { key: "weight_grams", label: "Berat (gram)", check: (d) => !!d.weight_grams },
      { key: "shell_length_cm", label: "Panjang cangkang", check: (d) => !!d.shell_length_cm },
      { key: "birth_or_purchase", label: "Tgl lahir / beli", check: (d) => !!d.birth_date || !!d.purchase_date },
      { key: "enclosure", label: "Kandang", check: (d) => !!d.enclosure },
    ],
  },
  breeding: {
    label: "Breeding",
    fields: [
      { key: "incubation_temp", label: "Suhu inkubasi", check: (d) => !!d.incubation_temp },
      { key: "incubation_humidity", label: "Kelembapan inkubasi", check: (d) => !!d.incubation_humidity },
      { key: "estimated_hatch_date", label: "Est. tanggal menetas", check: (d) => !!d.estimated_hatch_date },
    ],
  },
  sale: {
    label: "Penjualan",
    fields: [
      { key: "buyer_phone", label: "No. telepon pembeli", check: (d) => !!d.buyer_phone },
      { key: "platform", label: "Platform penjualan", check: (d) => !!d.platform },
      { key: "payment_status", label: "Status pembayaran", check: (d) => !!d.payment_status },
      { key: "shipping_method", label: "Metode pengiriman", check: (d) => !!d.shipping_method },
      { key: "hpp", label: "HPP / Modal", check: (d) => !!d.hpp },
    ],
  },
  health: {
    label: "Catatan Kesehatan",
    fields: [
      { key: "description", label: "Deskripsi kondisi", check: (d) => !!d.description },
      { key: "treatment", label: "Penanganan/obat", check: (d) => !!d.treatment },
    ],
  },
  userProfile: {
    label: "Profil Karyawan",
    fields: [
      { key: "full_name", label: "Nama lengkap", check: (d) => !!d.full_name },
      { key: "phone", label: "No. telepon", check: (d) => !!d.phone },
      { key: "join_date", label: "Tanggal bergabung", check: (d) => !!d.join_date },
      { key: "bank_name", label: "Nama bank", check: (d) => !!d.bank_name },
      { key: "bank_account_number", label: "No. rekening", check: (d) => !!d.bank_account_number },
      { key: "id_number", label: "Nomor KTP", check: (d) => !!d.id_number },
    ],
  },
  warehouseItem: {
    label: "Barang Gudang",
    fields: [
      { key: "supplier", label: "Supplier", check: (d) => !!d.supplier },
      { key: "expired_date", label: "Tgl kadaluarsa", check: (d) => !["obat","vitamin"].includes(d.category) || !!d.expired_date },
      { key: "location", label: "Lokasi penyimpanan", check: (d) => !!d.location },
    ],
  },
  feedStock: {
    label: "Stok Pakan",
    fields: [
      { key: "supplier", label: "Supplier", check: (d) => !!d.supplier },
      { key: "daily_ideal", label: "Kebutuhan harian", check: (d) => !!d.daily_ideal && d.daily_ideal > 0 },
    ],
  },
  buyerProfile: {
    label: "Profil Pembeli",
    fields: [
      { key: "whatsapp", label: "WhatsApp", check: (d) => !!d.whatsapp },
      { key: "city", label: "Kota", check: (d) => !!d.city },
      { key: "favorite_morph", label: "Morph favorit", check: (d) => !!d.favorite_morph },
    ],
  },
  enclosure: {
    label: "Kandang",
    fields: [
      { key: "size_m2", label: "Luas kandang (m²)", check: (d) => !!d.size_m2 },
      { key: "ideal_temp_min", label: "Suhu minimum ideal", check: (d) => !!d.ideal_temp_min },
      { key: "ideal_temp_max", label: "Suhu maksimum ideal", check: (d) => !!d.ideal_temp_max },
      { key: "photo_url", label: "Foto kandang", check: (d) => !!d.photo_url },
    ],
  },
  warningLetter: {
    label: "Surat Peringatan",
    fields: [
      { key: "description", label: "Deskripsi lengkap", check: (d) => !!d.description },
      { key: "issued_by", label: "Diterbitkan oleh", check: (d) => !!d.issued_by },
    ],
  },
  kasbon: {
    label: "Kasbon",
    fields: [
      { key: "reason", label: "Alasan kasbon", check: (d) => !!d.reason },
    ],
  },
};

/**
 * Kembalikan daftar field yang kosong untuk satu record
 * @param {string} entityType - key dari INCOMPLETE_CHECKS
 * @param {object} data - record data
 * @returns {string[]} - array label field yang kosong
 */
export function getMissingFields(entityType, data) {
  if (!data || !INCOMPLETE_CHECKS[entityType]) return [];
  return INCOMPLETE_CHECKS[entityType].fields
    .filter(f => !f.check(data))
    .map(f => f.label);
}

/**
 * Kembalikan true jika data tidak lengkap
 */
export function isIncomplete(entityType, data) {
  return getMissingFields(entityType, data).length > 0;
}

/**
 * Hitung skor kelengkapan (0-100)
 */
export function completenessScore(entityType, data) {
  if (!data || !INCOMPLETE_CHECKS[entityType]) return 100;
  const fields = INCOMPLETE_CHECKS[entityType].fields;
  const done = fields.filter(f => f.check(data)).length;
  return Math.round((done / fields.length) * 100);
}