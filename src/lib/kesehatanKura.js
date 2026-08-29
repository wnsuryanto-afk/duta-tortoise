/**
 * kesehatanKura.js — SATU definisi "kura ini sedang sakit".
 *
 * Sebelum berkas ini ada, satu layar memakai tiga jawaban berbeda untuk
 * pertanyaan yang sama, dan ketiganya bisa saling bertentangan pada kura yang
 * sama di baris yang sama:
 *
 *   1. Lencana merah SAKIT   → dari HealthRecord: ada catatan jenis "sakit"
 *                              yang follow_up_date-nya kosong atau di masa depan.
 *   2. Penyaring "Sakit Saat Ini" dan angka penghitungnya
 *                            → dari penanda di data kura (status / is_currently_sick).
 *   3. Lencana hijau "Sehat" → dari catatan kesehatan terakhir.
 *
 * Akibatnya nyata dan terlihat di lapangan: B106 memakai lencana merah SAKIT
 * dan lencana hijau Sehat bersamaan, sementara penyaring "Sakit Saat Ini"
 * menunjukkan angka 0.
 *
 * Sumber kekeliruannya aturan nomor 1: menganggap "belum ada tanggal periksa
 * ulang" sama dengan "masih sakit". Sebagian besar laporan sakit ringan memang
 * tidak menjadwalkan pemeriksaan ulang, jadi hampir setiap laporan menandai
 * kuranya sakit SELAMANYA. Dan karena alur "tandai sembuh" hanya membuat
 * catatan baru berjenis "sembuh" tanpa menyentuh catatan sakit yang lama,
 * lencana itu tidak pernah bisa dipadamkan oleh siapa pun.
 *
 * Definisi yang dipakai sekarang: sebuah kasus terbuka bila catatannya berjenis
 * "sakit" DAN belum ditandai selesai (is_resolved). Menutup kasus adalah
 * tindakan yang tercatat — bukan efek samping dari kolom tanggal yang kebetulan
 * terisi.
 */
import { base44 } from "@/api/base44Client";
import { perubahanSembuh, sedangSakit } from "@/lib/statusKura";

/** Kasus sakit yang masih terbuka dari sekumpulan HealthRecord. */
export function kasusSakitTerbuka(healthRecords = []) {
  return (healthRecords || []).filter(
    (r) => r && r.type === "sakit" && r.is_resolved !== true,
  );
}

/** Set berisi tortoise_id yang punya kasus sakit terbuka. */
export function idKuraDenganKasusTerbuka(healthRecords = []) {
  const s = new Set();
  kasusSakitTerbuka(healthRecords).forEach((r) => {
    if (r.tortoise_id) s.add(r.tortoise_id);
  });
  return s;
}

/**
 * Apakah kura ini sedang sakit — menurut KEDUA sumbernya sekaligus.
 *
 * Penanda di data kura dan kasus terbuka di rekam kesehatan sama-sama dihitung.
 * Salah satu menyala sudah cukup: kura yang statusnya dikembalikan ke "aktif"
 * lewat formulir tetapi kasusnya belum ditutup masih perlu muncul, justru
 * supaya kasusnya bisa ditutup.
 */
export function sedangSakitLengkap(kura, idKasusTerbuka) {
  if (!kura) return false;
  if (sedangSakit(kura)) return true;
  return !!idKasusTerbuka && idKasusTerbuka.has(kura.id);
}

/**
 * Tandai satu kura sembuh, sekali jalan dan menyeluruh:
 *   1. tutup SEMUA kasus sakit yang masih terbuka untuk kura itu,
 *   2. catat kejadian "sembuh" sebagai riwayat,
 *   3. kembalikan statusnya ke keadaan sebelum sakit.
 *
 * Ketiganya harus terjadi bersama. Sebelumnya hanya nomor 2 dan 3 yang
 * dijalankan, dan itulah sebabnya lencana merah tidak pernah padam.
 *
 * @param {object} kura      minimal { tortoise_id | id, tortoise_name | name, status, previous_status }
 * @param {Array}  catatan   HealthRecord milik kura tsb (boleh seluruhnya, disaring di sini)
 * @param {object} user      pengguna yang menandai
 * @param {string} tanggal   YYYY-MM-DD
 * @param {string} asal      keterangan singkat dari layar mana tindakan ini datang
 */
export async function tandaiSembuh({ kura, catatan = [], user, tanggal, asal = "aplikasi" }) {
  const tortoiseId = kura.tortoise_id || kura.id;
  const nama = kura.tortoise_name || kura.name || tortoiseId;
  const olehNama = user?.full_name || user?.email || "pengelola";

  // 1. Tutup kasus yang masih terbuka.
  const terbuka = kasusSakitTerbuka(catatan).filter((r) => r.tortoise_id === tortoiseId);
  for (const r of terbuka) {
    await base44.entities.HealthRecord.update(r.id, {
      is_resolved: true,
      resolved_date: tanggal,
      resolved_by: olehNama,
    });
  }

  // 2. Catat kejadian sembuhnya sebagai riwayat tersendiri.
  await base44.entities.HealthRecord.create({
    tortoise_id: tortoiseId,
    tortoise_name: nama,
    date: tanggal,
    type: "sembuh",
    source: "manual",
    is_resolved: true,
    resolved_date: tanggal,
    resolved_by: olehNama,
    description:
      `Ditandai sembuh oleh ${olehNama} dari ${asal}.` +
      (terbuka.length ? ` ${terbuka.length} kasus sakit ditutup.` : ""),
  });

  // 3. Kembalikan status kura ke keadaan sebelum sakit.
  await base44.entities.Tortoise.update(tortoiseId, perubahanSembuh(kura, tanggal));

  return { kasusDitutup: terbuka.length };
}
