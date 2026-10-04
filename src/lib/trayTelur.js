import { clutchAktif } from "@/lib/breedingUtils";

/**
 * trayTelur.js — satu clutch bisa memakai lebih dari satu tray.
 *
 * ── Kenapa berubah ─────────────────────────────────────────────────────────
 *
 * Kolom `tray_number` menyimpan SATU angka. Itu cukup selama clutchnya kecil,
 * tetapi tidak lagi: pada data 2 Okt 2026 ada clutch 28 butir (C23), 25 butir
 * (A47), dan 23 butir (C23, A31) — tidak muat di satu tray. Kiper yang
 * membaginya ke dua tray tidak punya tempat menuliskannya, jadi tray kedua
 * hanya diingat, atau tidak sama sekali.
 *
 * Kolom lamanya SENGAJA tidak dihapus. Catatan sebelum hari ini menyimpan
 * traynya di sana, dan menghapus kolomnya berarti menghapus datanya.
 * Pembacaan memakai `tray_numbers` lebih dulu lalu jatuh ke `tray_number`.
 */

/**
 * Daftar tray sebuah clutch, selalu berupa array angka yang sudah dirapikan.
 *
 * Urutan sumbernya penting: `tray_numbers` menang atas `tray_number`. Kalau
 * dibalik, clutch yang baru diisi dua tray akan terbaca satu tray saja selama
 * kolom lamanya masih terisi.
 */
export function daftarTray(breeding) {
  const baru = breeding?.tray_numbers;
  if (Array.isArray(baru) && baru.length > 0) return rapikanTray(baru);
  const lama = Number(breeding?.tray_number);
  return Number.isFinite(lama) && lama > 0 ? [lama] : [];
}

/** Buang yang bukan angka, buang kembar, urutkan menaik. */
export function rapikanTray(nilai = []) {
  const set = new Set();
  for (const n of nilai || []) {
    const angka = Number(n);
    if (Number.isFinite(angka) && angka > 0) set.add(Math.trunc(angka));
  }
  return [...set].sort((a, b) => a - b);
}

/**
 * Baca ketikan orang menjadi daftar tray.
 *
 * Diterima apa adanya: "1,2" / "1, 2" / "1 2" / "1;2" / "Tray 1 dan 2".
 * Yang diambil hanya angkanya, karena di lapangan orang mengetik dengan
 * pemisah apa pun yang ada di kepalanya, dan menolak ketikan yang maksudnya
 * jelas hanya membuat catatannya tidak jadi ditulis.
 */
export function uraikanTray(teks) {
  const cocok = String(teks ?? "").match(/\d+/g);
  return rapikanTray(cocok || []);
}

/** "Tray 1" / "Tray 1, 2" / "" bila tidak ada. */
export function teksTray(breeding) {
  const daftar = daftarTray(breeding);
  if (daftar.length === 0) return "";
  return `Tray ${daftar.join(", ")}`;
}

/**
 * Tray yang dipakai LEBIH DARI SATU clutch yang sedang dierami.
 *
 * ── Kenapa ini perlu diperiksa ────────────────────────────────────────────
 *
 * Tray adalah satu-satunya hal yang membedakan telur milik induk A dari
 * telur milik induk B setelah keduanya masuk inkubator yang sama. Dua clutch
 * di satu tray berarti saat menetas tidak ada lagi cara mengetahui anak itu
 * anak siapa — dan silsilah yang hilang tidak bisa dipulihkan belakangan.
 *
 * Sepuluh clutch sedang dierami sekarang, semuanya di Inkubator 1. Dengan 32
 * tray, bentrokan tidak perlu terjadi — tetapi tanpa ada yang memeriksa,
 * bentrokan tidak akan terlihat sampai menetas.
 *
 * @returns {Array<{ tray, clutch: Array }>} hanya tray yang bentrok
 */
export function trayBentrok(breedings = [], { kecuali = null } = {}) {
  const peta = new Map();
  for (const b of breedings || []) {
    if (!b || b.id === kecuali) continue;
    for (const t of daftarTray(b)) {
      if (!peta.has(t)) peta.set(t, []);
      peta.get(t).push(b);
    }
  }
  return [...peta.entries()]
    .filter(([, isi]) => isi.length > 1)
    .map(([tray, clutch]) => ({ tray, clutch }))
    .sort((a, b) => a.tray - b.tray);
}

/** Tray yang sedang terpakai oleh clutch lain — untuk memperingatkan saat mengisi. */
export function trayTerpakai(breedings = [], { kecuali = null } = {}) {
  const peta = new Map();
  for (const b of breedings || []) {
    if (!b || b.id === kecuali) continue;
    for (const t of daftarTray(b)) if (!peta.has(t)) peta.set(t, b);
  }
  return peta;
}

/**
 * Clutch yang sedang dierami tetapi traynya belum diisi.
 *
 * ── Kenapa ini penting, dengan angkanya ───────────────────────────────────
 *
 * Diperiksa pada data 2 Okt 2026: dari 208 telur yang sedang dierami di
 * Inkubator 1, hanya 41 butir (20%) yang induknya pasti bisa ditelusuri.
 *
 *   127 butir (6 clutch)  traynya KOSONG
 *    40 butir (2 clutch)  berbagi tray 8 — C23 9 Sep dan C22 14 Sep
 *    41 butir (2 clutch)  tray 7 dan tray 3, jelas
 *
 * Menetas pertama diperkirakan 31 Okt. Begitu bayinya keluar, 167 butir itu
 * tidak punya cara lagi dihubungkan ke induknya — dan silsilah yang hilang
 * tidak bisa dipulihkan belakangan.
 *
 * Aplikasi ini sedang dipakai untuk menjawab "betina mana yang produktif".
 * Jawaban itu dibangun dari catatan induk per clutch. Telur yang sampai ke
 * penetasan tanpa tray memutus rantainya tepat di langkah terakhir.
 *
 * ── 4 Okt 2026: kartunya dicabut, hitungannya tidak ──────────────────────
 *
 * Kartu peringatan di halaman Breeding dihapus atas permintaan pemilik.
 * Kedua fungsi di bawah SENGAJA ditinggalkan meski tidak ada layar yang
 * memanggilnya lagi: keadaannya belum berubah (127 butir masih tanpa tray
 * pada tanggal itu), tugas mengisinya masih terbuka, dan laporan
 * `laporan/2026-10-02-telur-tanpa-tray.md` dibangun dari angka-angka ini.
 * Menghapusnya berarti menurunkan ulang aturannya dari nol saat angkanya
 * ditanyakan lagi. Keduanya tetap diuji di cek-ronda.mjs.
 */
export function clutchTanpaTray(breedings = []) {
  return (breedings || []).filter(
    (b) => b && clutchAktif(b) && daftarTray(b).length === 0,
  );
}

/** Bentrok tray, dibatasi pada clutch yang sedang dierami saja. */
export function bentrokTrayAktif(breedings = []) {
  return trayBentrok((breedings || []).filter(clutchAktif));
}
