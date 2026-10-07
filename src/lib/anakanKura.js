/**
 * anakanKura.js — SATU aturan "kura ini anakan", dan komposisi umur peternakan.
 *
 * ── Tiga aturan untuk satu pertanyaan ───────────────────────────────────────
 *
 * Sampai 7 Oktober 2026, "apakah kura ini anakan" dijawab tiga cara berbeda
 * di tiga berkas, dan ketiganya memberi jawaban yang berbeda pada data yang
 * sama:
 *
 *   TugasHariIni     `age_category === "baby" || status === "baby"`   → 15
 *   TortoiseList     `age_category === "baby" && status === "aktif"`  → 15
 *   GuidedHariIni    `Tortoise.filter({ status: "baby" })`            → 0
 *
 * Yang ketiga nol, dan nolnya berakibat: layar itu memakai angka tersebut
 * untuk menyembunyikan tugas "Jemur matahari pagi — SEMUA BABY" bila tidak ada
 * anakan. Jadi lima belas tukik berumur tiga bulan ada di kandang Baby 1, dan
 * tugas menjemur mereka tidak muncul di layar kiper yang memakai alur
 * terpandu. Tidak ada galat; tugasnya hanya tidak ada.
 *
 * Sebabnya satu: `status: "baby"` sudah TIDAK dipakai lagi. Fungsi migrasi
 * `migrateBabyStatus` memindahkan semuanya ke `status: "aktif"` +
 * `age_category: "baby"` — tetapi `HatchDialog` masih membuat tukik baru
 * dengan cara yang lama, sementara `EggGrid` sudah memakai yang baru. Dua
 * pintu penetasan, dua bentuk data.
 *
 * ── Aturan yang dipakai di sini ─────────────────────────────────────────────
 *
 * Umurnya, bukan kolomnya: `golonganUmur()` dari lib/umurKura.js, yang
 * menghitung dari `birth_date` dan hanya jatuh ke `age_category` bila tanggal
 * lahirnya kosong. Dua akibat yang memang diinginkan:
 *
 *   · tukik baru terhitung begitu dicatat, lewat pintu penetasan mana pun,
 *     karena keduanya mengisi tanggal lahir;
 *   · tukik 8 Juli 2026 berhenti terhitung anakan pada 8 Juli 2027, sendiri,
 *     tanpa ada yang perlu mengubah kolomnya. Kolom `age_category` tidak
 *     pernah dihitung ulang sejak ditulis saat menetas — yang memakainya
 *     sebagai sumber akan menghitung kura sepuluh tahun sebagai anakan.
 *
 * Dan tentu saja hanya yang masih ada di peternakan: yang sudah terjual atau
 * mati bukan anakan siapa-siapa lagi.
 */
import { diPeternakan } from "@/lib/populasiKura";
import { golonganUmur } from "@/lib/umurKura";

/**
 * Nilai yang HARUS ditulis saat tukik baru dicatat.
 *
 * Dipakai kedua pintu penetasan (EggGrid dan HatchDialog) supaya bentuk
 * datanya satu. `status: "aktif"` dan bukan `"baby"`: status "baby" sudah
 * dimigrasikan keluar, dan kura berstatus "baby" tidak terbaca sebagai kura
 * aktif oleh layar penjualan, hitungan kandang, maupun `aktifSehat()`.
 */
export const TANDA_ANAKAN = { status: "aktif", age_category: "baby" };

/**
 * Saringan sisi SERVER untuk mengambil calon anakan tanpa menarik seluruh
 * tabel. Ini hanya penyaring kasar — yang memutuskan tetap `anakan()`,
 * karena umur tidak bisa disaring di server.
 */
export const SARINGAN_ANAKAN = { age_category: "baby" };

/** Apakah kura ini anakan yang masih ada di peternakan? */
export function anakan(kura, pada = new Date()) {
  if (!diPeternakan(kura)) return false;
  return golonganUmur(kura, pada) === "baby";
}

/** Semua anakan di peternakan. */
export function hanyaAnakan(daftar = [], pada = new Date()) {
  return (daftar || []).filter((k) => anakan(k, pada));
}

/**
 * Komposisi umur kura yang ada di peternakan.
 *
 * Dipakai beranda untuk menjawab pertanyaan yang muncul begitu angka "Kura di
 * peternakan" dilihat: isinya apa saja? Tanpa rinciannya, angka itu mudah
 * disangka indukan saja — dan 135 memang bukan indukan saja.
 *
 * @returns {{total:number, anakan:number, remaja:number, dewasa:number, takDiketahui:number}}
 */
export function ringkasUmur(daftar = [], pada = new Date()) {
  const diKebun = (daftar || []).filter(diPeternakan);
  const hasil = { total: diKebun.length, anakan: 0, remaja: 0, dewasa: 0, takDiketahui: 0 };
  for (const kura of diKebun) {
    const golongan = golonganUmur(kura, pada);
    if (golongan === "baby") hasil.anakan++;
    else if (golongan === "juvenile") hasil.remaja++;
    else if (golongan === "dewasa") hasil.dewasa++;
    else hasil.takDiketahui++;
  }
  return hasil;
}

/**
 * Kalimat komposisi untuk di bawah angka "Kura di peternakan".
 *
 * Bagian yang nol dibuang: "0 remaja" bukan keterangan, ia hanya memanjangkan
 * baris yang ruangnya sempit.
 */
export function kalimatKomposisi(ringkas) {
  if (!ringkas || !ringkas.total) return "";
  const bagian = [
    ringkas.dewasa ? `${ringkas.dewasa} dewasa` : "",
    ringkas.remaja ? `${ringkas.remaja} remaja` : "",
    ringkas.anakan ? `${ringkas.anakan} anakan` : "",
    ringkas.takDiketahui ? `${ringkas.takDiketahui} tanpa tanggal lahir` : "",
  ].filter(Boolean);
  return bagian.join(" · ");
}

export default anakan;
