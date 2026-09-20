/**
 * persetujuanPoin.js — SATU aturan "siapa boleh menyetujui, dan kapan alasannya wajib".
 *
 * ── Apa yang terjadi selama ini ─────────────────────────────────────────────
 *
 * Dari 1 September sampai 20 September 2026, lima kali poin checklist dipotong
 * dan `rejection_reason` kosong di kelimanya:
 *
 *     15 Sep  Sholehuddin  206 → 10    (−196)
 *     12 Sep  Angsolo      181 → 15    (−166)
 *     12 Sep  Sholehuddin  206 → 173   (−33)
 *      4 Sep  Sholehuddin  221 → 183   (−38)
 *      4 Sep  Angsolo      196 → 181   (−15)
 *
 * Total 448 poin — Rp 33.600 dengan nilai poin Rp 75. Orang yang kehilangannya
 * tidak pernah diberi tahu sebabnya, karena tidak ada satu pun tempat di
 * aplikasi yang menampilkan alasan kepada mereka, dan tidak ada yang menuntut
 * alasan itu ditulis.
 *
 * Layar Approval Poin dulu hanya mewajibkan alasan saat MENOLAK seluruh
 * checklist (`handleReject`). Memotong 196 dari 206 poin lewat
 * `handleApprove` — membuka centang satu per satu lalu menekan Setujui —
 * tidak diminta alasan sama sekali. Padahal akibatnya bagi yang menerima
 * hampir sama.
 *
 * ── Aturan yang dijalankan di sini ──────────────────────────────────────────
 *
 * 1. Alasan WAJIB bila `approved_points < total_points_claimed`, minimal
 *    sepuluh huruf. Bukan karena sepuluh itu angka keramat, tetapi karena
 *    "salah", "ok", dan "-" bukan penjelasan.
 *
 * 2. Tidak ada yang boleh menyetujui checklist miliknya sendiri. Ini bukan
 *    dugaan: Angsolo berperan `kepala_feeder` DAN mengisi checklist harian
 *    sendiri, jadi begitu kepala_feeder diberi hak menyetujui, dia langsung
 *    bisa menilai pekerjaannya sendiri.
 *
 * 3. Checklist milik kepala_feeder hanya bisa disetujui manajer atau owner.
 *    Catatan penting untuk pemilik: di data saat ini TIDAK ADA satu pun user
 *    berperan `manajer`, jadi praktisnya checklist Angsolo hanya bisa
 *    disetujui owner. Itu memang yang diminta; disebut di sini supaya tidak
 *    terlihat seperti kerusakan saat admin mendapati dirinya tidak bisa.
 *
 * Daftar peran penyetuju disimpan di CompanySettings (`approver_roles`)
 * supaya bisa diubah lewat MCP tanpa membangun ulang aplikasi. Tetapi aturan
 * 2 dan 3 TIDAK bisa dilonggarkan dari sana — keduanya dikunci di kode,
 * karena sebuah daftar peran tidak bisa menyatakan "kecuali dirinya sendiri".
 */

/** Peran penyetuju bawaan bila CompanySettings belum menyimpannya. */
export const PERAN_PENYETUJU_BAWAAN = ["owner", "manajer", "kepala_feeder"];

/** Peran yang boleh menyetujui checklist milik kepala_feeder. */
export const PENYETUJU_KEPALA_FEEDER = ["owner", "manajer"];

/** Panjang minimal alasan pemotongan. */
export const MIN_HURUF_ALASAN = 10;

/** Pilihan cepat sebab pemotongan. `lainnya` selalu menuntut tulisan sendiri. */
export const SEBAB_POTONG = [
  { kode: "foto_tidak_sesuai", label: "Foto tidak sesuai" },
  { kode: "lewat_tenggat", label: "Lewat tenggat" },
  { kode: "tidak_dikerjakan", label: "Tidak dikerjakan" },
  { kode: "kualitas_kurang", label: "Kualitas kurang" },
  { kode: "lainnya", label: "Lainnya (tulis)" },
];

export function labelSebab(kode) {
  return SEBAB_POTONG.find((s) => s.kode === kode)?.label || "";
}

/** Daftar peran penyetuju dari pengaturan, dengan cadangan bila kosong. */
export function peranPenyetuju(settings) {
  const dari = settings?.approver_roles;
  if (Array.isArray(dari) && dari.length > 0) return dari;
  return PERAN_PENYETUJU_BAWAAN;
}

/**
 * Bolehkah orang ini menyetujui checklist ini?
 *
 * Mengembalikan `{ boleh, sebab }`. `sebab` selalu berupa kalimat yang bisa
 * langsung ditampilkan — penolakan tanpa penjelasan adalah persis masalah
 * yang sedang diperbaiki berkas ini, jadi berkas ini tidak boleh melakukannya
 * sendiri.
 */
export function bolehMenyetujui({ penilai, checklist, settings }) {
  const peran = penilai?.role;
  const email = (penilai?.email || "").toLowerCase();
  const pemilikChecklist = (checklist?.employee_email || "").toLowerCase();

  if (!peran || !email) return { boleh: false, sebab: "Pengguna belum dikenali." };

  if (!peranPenyetuju(settings).includes(peran)) {
    return { boleh: false, sebab: "Peranmu tidak berhak menyetujui poin checklist." };
  }

  // Aturan konflik — dikunci di kode, tidak bisa dilonggarkan lewat pengaturan.
  if (email && email === pemilikChecklist) {
    return { boleh: false, sebab: "Checklist milik sendiri harus disetujui orang lain." };
  }

  const peranPemilik = checklist?.employee_role;
  if (peranPemilik === "kepala_feeder" && !PENYETUJU_KEPALA_FEEDER.includes(peran)) {
    return {
      boleh: false,
      sebab: "Checklist kepala feeder hanya bisa disetujui manajer atau owner.",
    };
  }

  return { boleh: true, sebab: "" };
}

/** Owner boleh meninjau ulang apa pun, kapan pun. */
export function bolehOverride(peran) {
  return peran === "owner";
}

/** Apakah jumlah yang akan disetujui ini merupakan pemotongan? */
export function adaPemotongan(checklist, akanDisetujui) {
  const klaim = Number(checklist?.total_points_claimed || 0);
  return Number(akanDisetujui || 0) < klaim;
}

/**
 * Apakah alasan pemotongan sudah cukup untuk disimpan?
 *
 * `{ sah, kurang }`, dengan `kurang` siap ditampilkan. Dipakai bersama oleh
 * tombol (untuk mengunci dirinya) dan oleh penyimpan (untuk menolak), supaya
 * keduanya tidak pernah berbeda pendapat tentang apa yang dianggap cukup.
 */
export function periksaAlasanPotong({ checklist, akanDisetujui, kode, teks }) {
  if (!adaPemotongan(checklist, akanDisetujui)) return { sah: true, kurang: "" };

  if (!kode) return { sah: false, kurang: "Pilih dulu sebab pemotongannya." };
  if (!SEBAB_POTONG.some((s) => s.kode === kode)) {
    return { sah: false, kurang: "Sebab pemotongan tidak dikenali." };
  }

  const isi = String(teks || "").trim();
  if (isi.length < MIN_HURUF_ALASAN) {
    return {
      sah: false,
      kurang: `Tulis alasannya minimal ${MIN_HURUF_ALASAN} huruf (sekarang ${isi.length}).`,
    };
  }
  return { sah: true, kurang: "" };
}

/**
 * Checklist yang sudah menunggu persetujuan lebih dari sehari.
 *
 * Dipakai sebagai pengingat di beranda penyetuju. Pada 20 September 2026 ada
 * lima checklist berstatus `submitted`, dua di antaranya sudah dua hari.
 */
export function checklistTertunda(checklists = [], hariIni, { lebihDari = 1 } = {}) {
  const batas = new Date(`${hariIni}T00:00:00`);
  batas.setDate(batas.getDate() - lebihDari);
  const batasStr = batas.toISOString().slice(0, 10);

  return (checklists || [])
    .filter((c) => c?.status === "submitted")
    .filter((c) => !c.excluded_from_reports && !c.is_test_data)
    .filter((c) => c.date && c.date <= batasStr)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}
