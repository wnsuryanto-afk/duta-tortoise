import { terjadwalPada } from "@/lib/kepatuhanSOP";
import { keMenit } from "@/lib/tenggatNyata";

/**
 * tugasNolKali.js — tugas yang TERJADWAL tetapi tidak pernah dikerjakan.
 *
 * ── Pertanyaan yang belum punya jawabannya ─────────────────────────────────
 *
 * Layar "Tenggat vs jam kerja sebenarnya" mengukur KETERLAMBATAN: tugas
 * dikerjakan, hanya lewat jamnya. Itu pertanyaan yang berbeda dari KETIADAAN,
 * dan yang kedua tidak pernah muncul di mana pun — justru karena tugas yang
 * tidak pernah dicentang tidak meninggalkan satu baris pun untuk dilihat.
 *
 * Diukur pada 10-28 September 2026: lima tugas terjadwal 15 kali dan
 * dikerjakan NOL kali. Dua di antaranya memupuk kolam azolla — dan panen
 * azolla sedang terkunci menunggu kolamnya pulih. Lingkaran yang tidak
 * menutup, dan tak satu pun layar menunjukkannya.
 *
 * ── Yang sengaja TIDAK dihitung sebagai kelalaian ──────────────────────────
 *
 * Tiga hal dikeluarkan, masing-masing karena mencatatnya sebagai "nol kali"
 * akan menuduh orang untuk sesuatu yang bukan salahnya:
 *
 *   di_ubin_kandang  dicatat sebagai `kebersihan_kandang_<kode>`, bukan
 *                    `sop_<id>`. Nol di sini berarti pemetaannya beda, bukan
 *                    pekerjaannya tidak ada.
 *   di_luar_persen   task WADAH yang mekar jadi baris lain (rotasi timbang),
 *                    dan sah bernilai nol baris pada hari tanpa kura yang
 *                    perlu ditimbang.
 *   terkunci_bahan   bahannya memang habis. Tugas ini tetap DILAPORKAN, tapi
 *                    dengan penanda terpisah — yang perlu ditindak bukan
 *                    kelalaian tim, melainkan kuncinya sendiri.
 */

/** Data uji tidak ikut menghitung kepatuhan orang lain. */
function nyata(l) {
  return l && l.is_test_data !== true && l.excluded_from_reports !== true;
}

/** Semua tanggal "YYYY-MM-DD" dari `dari` sampai `sampai`, inklusif. */
export function rentangTanggal(dari, sampai) {
  const hasil = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dari)) || !/^\d{4}-\d{2}-\d{2}$/.test(String(sampai))) {
    return hasil;
  }
  const [ay, am, ad] = dari.split("-").map(Number);
  const [by, bm, bd] = sampai.split("-").map(Number);
  const d = new Date(ay, am - 1, ad);
  const akhir = new Date(by, bm - 1, bd);
  // Batas keras: satu tahun. Rentang yang keliru tidak boleh membekukan layar.
  for (let i = 0; d <= akhir && i < 400; i++) {
    hasil.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    );
    d.setDate(d.getDate() + 1);
  }
  return hasil;
}

/**
 * Berapa kali tiap tugas TERJADWAL, dan berapa kali benar-benar dikerjakan.
 *
 * @param {Array} sopTasks SOPTask aktif
 * @param {Array} logs     MaintenanceLog dalam rentang
 * @param {object} opsi    { dari, sampai } "YYYY-MM-DD"
 * @returns {Array} terurut: yang paling banyak terlewat lebih dulu
 */
export function tugasNolKali(sopTasks = [], logs = [], opsi = {}) {
  const hari = rentangTanggal(opsi.dari, opsi.sampai);
  if (hari.length === 0) return [];

  // Satu tugas dihitung selesai SEKALI PER HARI, berapa pun barisnya. Tugas
  // berskala "bersama" bisa dicentang dua orang pada hari yang sama; itu satu
  // pekerjaan, bukan dua.
  const selesaiPerHari = new Map();
  for (const l of logs) {
    if (!nyata(l)) continue;
    const id = String(l.item_id || "");
    if (!id.startsWith("sop_")) continue;
    const kunci = `${id.slice(4)}|${l.period_key}`;
    selesaiPerHari.set(kunci, true);
  }

  const hasil = [];
  for (const t of sopTasks) {
    if (!t || t.is_active === false) continue;
    if (t.di_ubin_kandang === true || t.di_luar_persen === true) continue;

    let terjadwal = 0;
    let dikerjakan = 0;
    for (const tgl of hari) {
      if (!terjadwalPada(t, tgl)) continue;
      terjadwal += 1;
      if (selesaiPerHari.has(`${t.id}|${tgl}`)) dikerjakan += 1;
    }
    if (terjadwal === 0) continue; // tidak pernah jatuh di rentang ini

    const poin = Number(t.points) || 0;
    hasil.push({
      id: t.id,
      judul: t.title || "(tanpa nama)",
      jadwal: ringkasJadwal(t),
      tenggat: keMenit(t.deadline_time) === null ? null : t.deadline_time,
      terjadwal,
      dikerjakan,
      terlewat: terjadwal - dikerjakan,
      persen: Math.round((dikerjakan / terjadwal) * 100),
      poinTerlewat: (terjadwal - dikerjakan) * poin,
      // Tugas terkunci dilaporkan, tapi TIDAK sebagai kelalaian tim.
      terkunci: t.terkunci_bahan === true,
      alasanKunci: t.terkunci_alasan || "",
    });
  }

  // Tugas TERKUNCI selalu di bawah, berapa pun yang terlewat. Ia memang tidak
  // dikerjakan, tetapi bukan karena dilalaikan — bahannya habis dan pemilik
  // sendiri yang menguncinya. Menaruhnya di puncak daftar membuat kunci yang
  // benar terbaca sebagai pelanggaran terburuk, dan yang membacanya akan
  // berhenti mempercayai seluruh daftarnya.
  return hasil.sort(
    (a, b) =>
      Number(a.terkunci) - Number(b.terkunci) ||
      b.terlewat - a.terlewat ||
      b.poinTerlewat - a.poinTerlewat,
  );
}

const NAMA_HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/** Jadwal tugas sebagaimana orang menyebutnya, bukan sebagai angka. */
export function ringkasJadwal(t) {
  if (!t) return "";
  if (t.frequency === "harian") return "tiap hari";
  if (t.frequency === "mingguan") {
    const hari = Array.isArray(t.weekly_days) ? t.weekly_days : [];
    if (hari.length === 0) return "tiap hari";
    if (hari.length === 7) return "tiap hari";
    return hari
      .slice()
      .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)) // Senin dulu, Minggu terakhir
      .map((n) => NAMA_HARI[n] || "?")
      .join(", ");
  }
  if (t.frequency === "bulanan") {
    const tgl = Array.isArray(t.monthly_dates) ? t.monthly_dates : [];
    if (tgl.length === 0) return "bulanan";
    return "tiap tanggal " + tgl.slice().sort((a, b) => a - b).join(" & ");
  }
  return "";
}

/** Hanya yang benar-benar nol kali dikerjakan dan TIDAK terkunci. */
export function benarBenarNol(baris = []) {
  return baris.filter((b) => b.dikerjakan === 0 && !b.terkunci);
}

/**
 * Tugas yang sedang terkunci bahannya.
 *
 * Dipisahkan karena yang perlu ditindak bukan tim, melainkan kuncinya. Sebuah
 * kunci dipasang dengan niat dibuka lagi — catatan pada kunci azolla bahkan
 * menuliskannya: "BUKA KEMBALI begitu kolam siap panen" — tetapi tidak ada satu
 * pun tempat di aplikasi yang mengingatkan bahwa ada kunci yang menunggu.
 * Sepuluh hari berlalu dan tak seorang pun ditanya.
 */
export function tugasTerkunci(sopTasks = []) {
  return (sopTasks || [])
    .filter((t) => t?.is_active !== false && t?.terkunci_bahan === true)
    .map((t) => ({
      id: t.id,
      judul: t.title || "(tanpa nama)",
      alasan: t.terkunci_alasan || "Tidak ada keterangan.",
      poin: Number(t.points) || 0,
      jadwal: ringkasJadwal(t),
    }));
}
