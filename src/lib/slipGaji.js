/**
 * slipGaji.js — SATU aturan "slip ini masih berutang uang atau tidak".
 *
 * ── Cacat 1: slip yang dibatalkan tetap terhitung sebagai utang ─────────────
 *
 * Halaman Slip Gaji menghitung uang yang belum dibayar dengan
 * `slips.filter(s => s.status !== "paid")`. Penyaring itu bukan "belum
 * dibayar", melainkan "apa pun selain dibayar" — dan yang ikut tertangkap
 * adalah slip yang sudah DIBATALKAN.
 *
 * Di data sungguhan pada 19 September 2026 seluruh lima slip yang pernah ada
 * berstatus `dibatalkan` dan ditandai `excluded_from_reports`. Jumlah
 * `net_total`-nya Rp 4.925.850. Seluruhnya terbaca sebagai gaji yang masih
 * harus dibayarkan, padahal tidak sepeser pun terutang.
 *
 * Daftarnya pun tidak pernah menyaring `excluded_from_reports` maupun
 * `is_test_data`, tidak seperti hampir semua permukaan keuangan lain yang
 * sudah memakai `hanyaLaporan`.
 *
 * ── Cacat 2: status yang tidak dikenal menyamar jadi "Draft" ────────────────
 *
 * Tiga layar menuliskan statusnya dengan pola `statusConfig[s.status] ||
 * statusConfig.draft` atau rantai `? :` yang berakhir di `"Draft"`. Nilai
 * `dibatalkan` tidak ada di antara ketiga pilihan itu, jadi slip yang sudah
 * dibatalkan tampil sebagai **Draft** — persis seperti slip yang belum selesai
 * dikerjakan dan menunggu diproses.
 *
 * Sebabnya: `dibatalkan` tidak tercantum di enum skema. Tidak ada satu baris
 * kode pun yang menulisnya; ia masuk lewat pembatalan manual. Entitas lain di
 * aplikasi ini — Pembelian dan Tugas Insidentil — sudah lama memakai kata yang
 * sama sebagai status resmi, jadi yang kurang hanyalah menuliskannya di skema
 * dan memberinya rupa sendiri di layar.
 *
 * Yang TIDAK diubah: slip dibatalkan tetap tidak bisa disetujui maupun
 * dibayar. Tombolnya memang sudah menuntut `status === "draft"` dan
 * `status === "approved"` secara harfiah, jadi pintunya tidak pernah terbuka.
 * Yang salah selama ini hanya angkanya dan sebutannya.
 */

import { Clock, CheckCircle2, Ban, HelpCircle } from "lucide-react";
import { masukLaporan } from "@/lib/laporan";

/** Status yang berarti slip ini tidak akan pernah dibayarkan. */
export const STATUS_BATAL = "dibatalkan";

/** Rupa tiap status, dipakai bersama oleh semua layar yang menampilkannya. */
export const RUPA_STATUS = {
  draft: { label: "Draft", kelas: "bg-muted text-foreground", ikon: Clock },
  approved: { label: "Disetujui", kelas: "bg-blue-100 text-blue-700", ikon: CheckCircle2 },
  paid: { label: "Dibayar", kelas: "bg-green-100 text-green-700", ikon: CheckCircle2 },
  dibatalkan: { label: "Dibatalkan", kelas: "bg-red-100 text-red-700", ikon: Ban },
};

/**
 * Rupa satu slip.
 *
 * Status yang tidak dikenal TIDAK jatuh ke "Draft". Jatuh ke draft membuat
 * slip batal terlihat seperti slip yang menunggu diproses — kesalahan yang
 * mengundang orang menyetujuinya. Yang tidak dikenal disebut apa adanya.
 */
export function rupaStatusSlip(status) {
  return (
    RUPA_STATUS[status] || {
      label: status || "Tanpa status",
      kelas: "bg-amber-100 text-amber-800",
      ikon: HelpCircle,
    }
  );
}

/** Apakah slip ini sudah dibayarkan? */
export function sudahDibayar(slip) {
  return slip?.status === "paid";
}

/** Apakah slip ini dibatalkan — tidak akan pernah menjadi uang? */
export function dibatalkan(slip) {
  return slip?.status === STATUS_BATAL;
}

/**
 * Apakah slip ini masih berutang uang?
 *
 * Harus memenuhi tiga syarat sekaligus: belum dibayar, tidak dibatalkan, dan
 * boleh masuk laporan. Ketiganya diperiksa di satu tempat supaya tidak ada
 * layar yang kelak hanya memeriksa dua di antaranya.
 */
export function masihTerutang(slip) {
  return !!slip && !sudahDibayar(slip) && !dibatalkan(slip) && masukLaporan(slip);
}

/**
 * Ringkasan uang dari sekumpulan slip.
 *
 * `terutang` hanya menjumlahkan slip yang benar-benar masih harus dibayarkan;
 * `dibatalkan` dikembalikan terpisah supaya angkanya bisa DISEBUT alih-alih
 * menghilang tanpa penjelasan — lima slip yang lenyap dari layar tanpa
 * keterangan lebih membingungkan daripada lima slip yang tertulis batal.
 */
export function ringkasUangSlip(slips = []) {
  let dibayar = 0;
  let terutang = 0;
  let batal = 0;
  let jumlahBatal = 0;

  for (const s of slips || []) {
    const nilai = Number(s?.net_total || 0);
    if (dibatalkan(s)) {
      batal += nilai;
      jumlahBatal++;
      continue;
    }
    if (!masukLaporan(s)) continue;
    if (sudahDibayar(s)) dibayar += nilai;
    else terutang += nilai;
  }

  return { dibayar, terutang, batal, jumlahBatal };
}
