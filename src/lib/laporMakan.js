/**
 * laporMakan.js — menulis dan menutup laporan "kura ini tidak makan".
 *
 * Laporan ini adalah pemicu utama penimbangan sejak 17-09-2026. Sebelumnya
 * kura ditimbang menurut rotasi 2 ekor/hari; rotasi itu tidak pernah
 * menyelesaikan satu putaran (44 kura dewasa masih memakai berat Juli 2025)
 * karena kura dewasa 20–37 kg sulit dipegang dan tugasnya sering terlewat.
 *
 * Aturannya sekarang: yang ditimbang hanya yang ada alasannya. Tidak makan
 * adalah alasan pertama — dan sampai hari ini tidak ada satu pun tempat di
 * aplikasi untuk mencatatnya.
 */
import { base44 } from "@/api/base44Client";
import { BATAS_AMBIL } from "@/api/base44Client";
import { masukLaporan } from "@/lib/laporan";
import { laporanTerbukaPerKura } from "@/lib/jadwalTimbang";

/** Tanggal WIB hari ini, "YYYY-MM-DD". */
export function hariIniWIB() {
  const w = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return w.toISOString().slice(0, 10);
}

/** Semua laporan yang masih dihitung (bukan data uji, bukan dikecualikan). */
export async function ambilLaporanMakan() {
  const semua = await base44.entities.LaporanMakan.list("-date", BATAS_AMBIL);
  return (semua || []).filter(masukLaporan);
}

/** Peta kura → laporan tidak-makan yang masih terbuka. */
export async function petaLaporanTerbuka() {
  return laporanTerbukaPerKura(await ambilLaporanMakan());
}

/**
 * Catat bahwa seekor kura tidak makan.
 *
 * Laporan yang masih terbuka TIDAK digandakan: melaporkan hal yang sama dua
 * hari berturut-turut tidak menghasilkan dua tugas timbang. Yang dikembalikan
 * adalah laporan yang berlaku, baru atau lama, supaya pemanggil bisa
 * mengatakan apa adanya kepada kiper.
 *
 * @returns {{dibuat: boolean, laporan: object}}
 */
export async function catatTidakMakan(kura, { sumber = "lainnya", catatan = "", user } = {}) {
  if (!kura?.id) throw new Error("Laporan tidak makan butuh kura.");
  const terbuka = await petaLaporanTerbuka();
  const ada = terbuka.get(kura.id);
  if (ada) return { dibuat: false, laporan: ada };

  const laporan = await base44.entities.LaporanMakan.create({
    tortoise_id: kura.id,
    tortoise_code: kura.code || kura.name || "",
    enclosure_name: kura.enclosure || "",
    date: hariIniWIB(),
    status: "tidak_makan",
    sumber,
    catatan,
    dilaporkan_oleh_email: user?.email || "",
    dilaporkan_oleh_nama: user?.full_name || user?.email || "",
    sudah_ditimbang: false,
  });
  return { dibuat: true, laporan };
}

/**
 * Tutup laporan: kura sudah makan lagi.
 *
 * Ditulis sebagai BARIS BARU, bukan mengubah baris lama. Berapa lama seekor
 * kura tidak makan adalah keterangan yang paling berguna di sini, dan
 * keterangan itu hilang kalau baris pembukanya ditimpa.
 */
export async function catatMakanLagi(kura, { catatan = "", user } = {}) {
  if (!kura?.id) throw new Error("Penutupan laporan butuh kura.");
  return await base44.entities.LaporanMakan.create({
    tortoise_id: kura.id,
    tortoise_code: kura.code || kura.name || "",
    enclosure_name: kura.enclosure || "",
    date: hariIniWIB(),
    status: "makan_lagi",
    sumber: "halaman_kura",
    catatan,
    dilaporkan_oleh_email: user?.email || "",
    dilaporkan_oleh_nama: user?.full_name || user?.email || "",
    sudah_ditimbang: false,
  });
}

/**
 * Tandai bahwa laporan terbuka untuk kura ini sudah dijawab dengan timbangan.
 *
 * Dipanggil sesudah pengukuran tersimpan. Tanpa ini tugas timbang akan terus
 * muncul walau kiper sudah mengerjakannya — dan tugas yang tidak bisa
 * dipadamkan dengan bekerja adalah tugas yang berhenti dikerjakan.
 */
export async function tandaiSudahDitimbang(tortoiseId) {
  if (!tortoiseId) return 0;
  const terbuka = await petaLaporanTerbuka();
  const l = terbuka.get(tortoiseId);
  if (!l) return 0;
  await base44.entities.LaporanMakan.update(l.id, { sudah_ditimbang: true });
  return 1;
}
