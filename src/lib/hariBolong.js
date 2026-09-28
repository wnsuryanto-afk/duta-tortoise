/**
 * hariBolong.js — hari yang DIKERJAKAN tetapi tidak pernah tercatat.
 *
 * ── Kenapa ini perlu ada ───────────────────────────────────────────────────
 *
 * Pada 13, 14 dan 15 Agustus 2026 kedua kiper tercatat HADIR — check-in 06:48
 * dan 06:55 — dan tidak ada satu pun DailyChecklist untuk hari-hari itu.
 * Tiga hari kerja penuh, dua orang, nol poin.
 *
 * Yang membuatnya mahal bukan kejadiannya, melainkan JEDANYA: tidak ada satu
 * layar pun yang menyebutkannya, jadi baru ketahuan tiga bulan kemudian saat
 * target poin dihitung ulang. Saat itu tidak ada lagi yang bisa mengingat
 * kandang mana yang dibersihkan, dan poinnya hangus untuk selamanya.
 *
 * Di seluruh data Juli–September ada tujuh kejadian semacam ini. Dengan laju
 * 195 poin per hari kerja, itu sekitar 1.365 poin — Rp 102.375 kerja nyata
 * yang tidak berbuah apa-apa.
 *
 * Penagih ini tidak memperbaiki apa pun sendiri. Ia hanya membuat jedanya
 * pendek: besok, bukan tiga bulan lagi, selagi orangnya masih ingat.
 */

// Hari ini menurut jam setempat. Rumahnya sekarang lib/safeDate.js — pustaka
// tanggal, bukan pustaka fitur. Diteruskan dari sini supaya pemanggil yang
// sudah ada tidak perlu diubah.
import { tanggalHariIni } from "@/lib/safeDate";
export { tanggalHariIni };

/** Mundur `n` hari dari sebuah tanggal yyyy-MM-dd. */
export function mundurHari(tanggal, n) {
  const d = new Date(`${tanggal}T00:00:00`);
  if (Number.isNaN(d.getTime())) return tanggal;
  d.setDate(d.getDate() - n);
  return tanggalHariIni(d);
}

/** Baris yang tidak boleh ikut laporan: data uji dan yang dikecualikan pemilik. */
function nyata(r) {
  return r && r.is_test_data !== true && r.excluded_from_reports !== true;
}

const kunci = (tanggal, email) => `${tanggal}|${String(email || "").toLowerCase()}`;

/**
 * Hari HADIR yang tidak punya DailyChecklist sama sekali.
 *
 * Hari ini SELALU dikecualikan: kiper masih punya sisa hari untuk mengisinya,
 * dan menagihnya pagi-pagi hanya menghasilkan peringatan yang selalu menyala
 * dan karena itu berhenti dibaca.
 *
 * @param {Array} absensi     baris Attendance
 * @param {Array} checklists  baris DailyChecklist
 * @param {object} opsi       { hariIni, mundur } — mundur = berapa hari ke belakang
 * @returns {Array} [{ tanggal, email, nama, jamMasuk }] terbaru lebih dulu
 */
export function hariHadirTanpaChecklist(absensi = [], checklists = [], opsi = {}) {
  const hariIni = opsi.hariIni || tanggalHariIni();
  const mundur = Number.isFinite(opsi.mundur) ? opsi.mundur : 30;
  const batasAwal = mundurHari(hariIni, mundur);

  const adaChecklist = new Set(
    (Array.isArray(checklists) ? checklists : [])
      .filter(nyata)
      .map((c) => kunci(c.date, c.employee_email)),
  );

  const terlihat = new Set();
  const hasil = [];
  for (const a of Array.isArray(absensi) ? absensi : []) {
    if (!nyata(a)) continue;
    if (a.status !== "hadir") continue;
    const tgl = String(a.date || "");
    if (!tgl || tgl >= hariIni || tgl < batasAwal) continue;
    const k = kunci(tgl, a.employee_email);
    // Absensi kembar pernah terjadi (28 Juli dan 19 September, dua baris untuk
    // orang dan hari yang sama). Satu hari bolong hanya boleh ditagih sekali.
    if (terlihat.has(k) || adaChecklist.has(k)) continue;
    terlihat.add(k);
    hasil.push({
      tanggal: tgl,
      email: a.employee_email || "",
      nama: a.employee_name || a.employee_email || "—",
      jamMasuk: a.check_in || "",
    });
  }
  return hasil.sort((x, y) => String(y.tanggal).localeCompare(String(x.tanggal)));
}

/**
 * Perkiraan poin yang hilang.
 *
 * Disebut PERKIRAAN dengan sengaja: tidak ada yang tahu persis berapa poin
 * yang akan dikumpulkan pada hari yang catatannya tidak pernah ada. Lajunya
 * diambil dari hari-hari yang BENAR-BENAR tercatat milik orang itu sendiri,
 * bukan angka yang dipatok di kode — kiper yang cepat dan yang lambat tidak
 * boleh diberi taksiran yang sama.
 */
export function perkiraanPoinHilang(bolong = [], checklists = [], nilaiPerPoin = 0) {
  const per = {};
  for (const c of (Array.isArray(checklists) ? checklists : []).filter(nyata)) {
    const e = String(c.employee_email || "").toLowerCase();
    const poin = Number(c.approved_points || c.total_points_claimed || 0);
    if (!e || !(poin > 0)) continue;
    (per[e] = per[e] || []).push(poin);
  }
  const rata = (e) => {
    const v = per[String(e || "").toLowerCase()];
    if (!v || v.length === 0) return 0;
    return v.reduce((s, n) => s + n, 0) / v.length;
  };
  const poin = Math.round((bolong || []).reduce((s, b) => s + rata(b.email), 0));
  return { poin, rupiah: Math.round(poin * (Number(nilaiPerPoin) || 0)) };
}
