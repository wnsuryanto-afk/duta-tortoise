/**
 * BATAS AMBIL — satu definisi untuk seluruh fungsi backend.
 *
 * SDK Base44 memakai limit BAWAAN 50 baris kalau argumen `limit` tidak
 * diisi (node_modules/@base44/sdk/dist/modules/entities.types.d.ts:
 * "Defaults to 50"). Tidak ada error, tidak ada tanda apa pun — baris
 * ke-51 dan seterusnya hilang diam-diam.
 *
 * Akibat nyata yang sudah ditemukan di aplikasi ini:
 *   • WarehouseItem ada 129 baris, ringkasan harian membaca 100  →
 *     29 barang tidak pernah bisa memicu alarm "PERLU DIBELI".
 *   • IncidentalTask aktif lebih dari 50 → sebagian tugas tambahan
 *     tidak muncul di pesan pagi.
 *   • DailyChecklist / Attendance / MaintenanceLog / Tortoise semuanya
 *     sudah lewat 50 baris.
 *
 * Aturannya sekarang: SETIAP .list()/.filter() menulis limit secara
 * eksplisit. Kalau tidak ada alasan khusus, pakai BATAS_AMBIL.
 *
 * Sisi frontend memakai pembungkus otomatis di src/api/base44Client.js
 * dengan nilai yang sama. Kalau nilai di sini diubah, ubah juga di sana.
 *
 * Batas keras SDK adalah 5.000 baris per permintaan.
 */
export const BATAS_AMBIL = 2000;
