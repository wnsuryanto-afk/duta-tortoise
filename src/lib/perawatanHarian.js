/**
 * perawatanHarian.js — mencatat perawatan harian kura sakit.
 *
 * Sebelumnya centang "perawatan hari ini sudah dilakukan" hanya menulis satu
 * MaintenanceLog — entitas untuk kebersihan kandang — dengan kandang palsu
 * bernama "Perawatan". Akibatnya rekam kesehatan kura yang sedang diobati
 * berisi tepat dua baris: tanggal sakit dan tanggal sembuh. Bagian di antaranya,
 * yang justru paling penting untuk hewan yang sedang dirawat, kosong sama sekali.
 *
 * Fungsi ini menutup jarak itu. Satu centang sekarang meninggalkan tiga jejak:
 *
 *   1. HealthRecord bertipe "obat" — rekam medis yang sesungguhnya, berisi
 *      perlakuan yang dijalankan hari itu dan siapa yang menjalankannya.
 *   2. MaintenanceLog — tetap ditulis, karena dari sinilah layar keeper tahu
 *      kura mana yang sudah dicentang hari ini setelah halaman dimuat ulang.
 *   3. Tugas perawatan bikinan server ditutup lewat jalur resminya, supaya ia
 *      tidak menggantung terbuka selamanya.
 *
 * Ketiganya tidak sama pentingnya, jadi kegagalannya tidak diperlakukan sama:
 * rekam kesehatan wajib berhasil, dua sisanya boleh gagal tanpa membatalkan
 * pencatatan yang sudah tersimpan.
 */
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { claimIncidentalTask } from "@/lib/claimIncidentalTask";

/**
 * "sembuh" berada di luar daftar jenis catatan yang sah, dan penambahannya
 * masih menunggu keputusan. "obat" sudah ada di daftar itu dan artinya paling
 * dekat: perlakuan yang diberikan pada hari tersebut.
 */
const JENIS_CATATAN = "obat";

/** Penanda di deskripsi, dipakai mengenali catatan yang dibuat fungsi ini. */
const PENANDA = "[perawatan-harian]";

/**
 * Apakah kura ini sudah dicatat perawatannya hari ini?
 *
 * Diperiksa terhadap rekam kesehatan, bukan terhadap MaintenanceLog: dua
 * perangkat bisa mencentang bersamaan, dan yang tidak boleh berganda adalah
 * catatan medisnya.
 */
export function sudahDicatatHariIni(catatanKesehatan, tortoiseId, tanggal) {
  return (catatanKesehatan || []).some(
    (r) =>
      r.tortoise_id === tortoiseId &&
      r.date === tanggal &&
      r.type === JENIS_CATATAN &&
      String(r.description || "").includes(PENANDA)
  );
}

/**
 * Ambil nama kura dari judul tugas berformat "Perawatan [nama] — [penyakit]".
 * Mengembalikan null bila judulnya bukan tugas perawatan.
 */
function namaDariJudul(judul) {
  const teks = String(judul || "").trim();
  const cocok = teks.match(/^perawatan\s+(.+?)(?:\s*[—–-]\s*.*)?$/i);
  return cocok ? cocok[1].trim().toLowerCase() : null;
}

/**
 * Cari tugas perawatan harian yang dibuat server untuk kura ini.
 *
 * Tugasnya dibuat dengan judul "Perawatan [nama kura] — [penyakit]". Tidak ada
 * kolom yang menautkannya ke nomor kura, jadi pencocokan terpaksa lewat judul.
 *
 * Namanya diambil utuh dari judul lalu dibandingkan persis, bukan dicari sebagai
 * potongan teks. Bedanya nyata: dengan pencarian potongan, kura bernama "Bim"
 * akan mencomot tugas milik "Bimo" — dan menutup tugas kura lain lebih buruk
 * daripada membiarkan satu tugas terbuka.
 */
export function cariTugasPerawatan(tugas, namaKura) {
  if (!namaKura) return null;
  const nama = namaKura.trim().toLowerCase();
  if (!nama) return null;
  return (
    (tugas || []).find(
      (t) => t.status === "pending" && namaDariJudul(t.title) === nama
    ) || null
  );
}

/**
 * Catat perawatan harian untuk satu kura sakit.
 *
 * @param {object} kura   { tortoise_id, tortoise_name, treatment, diagnosis_notes }
 * @param {object} user   pengguna yang mencatat
 * @param {object} opsi
 * @param {Array}  [opsi.tugasInsidentil] daftar tugas untuk dicarikan pasangannya
 * @param {Array}  [opsi.catatanKesehatan] untuk memeriksa catatan ganda
 * @param {string} [opsi.tanggal]
 *
 * @returns {Promise<{dicatat: boolean, tugasDitutup: boolean, peringatan: string|null}>}
 *   `dicatat: false` berarti hari ini memang sudah pernah dicatat — bukan gagal.
 *   `peringatan` terisi bila jejak tambahan gagal ditulis; pemanggil sebaiknya
 *   menampilkannya, karena diam di sini berarti keeper mengira semua beres.
 */
export async function catatPerawatanHarian(kura, user, opsi = {}) {
  const {
    tugasInsidentil = [],
    catatanKesehatan = [],
    tanggal = format(new Date(), "yyyy-MM-dd"),
  } = opsi;

  const tortoiseId = kura.tortoise_id;
  const namaKura = kura.tortoise_name;

  if (sudahDicatatHariIni(catatanKesehatan, tortoiseId, tanggal)) {
    return { dicatat: false, tugasDitutup: false, peringatan: null };
  }

  const oleh = user?.full_name || user?.email || "keeper";
  const perlakuan = String(kura.treatment || "").trim();

  // ── 1. Rekam medis — inti dari pencatatan ini, harus berhasil ──
  await base44.entities.HealthRecord.create({
    tortoise_id: tortoiseId,
    tortoise_name: namaKura,
    date: tanggal,
    type: JENIS_CATATAN,
    source: "manual",
    treatment: perlakuan || undefined,
    diagnosis_notes: kura.diagnosis_notes || undefined,
    description:
      `${PENANDA} Perawatan harian dijalankan oleh ${oleh}` +
      (perlakuan ? `. Perlakuan: ${perlakuan}` : "."),
  });

  const peringatan = [];

  // ── 2. Penanda layar keeper — supaya centangnya bertahan setelah muat ulang ──
  try {
    await base44.entities.MaintenanceLog.create({
      check_key: `${user?.email}__harian__perawatan_${tortoiseId}__${tanggal}`,
      enclosure_id: "perawatan",
      enclosure_name: "Perawatan",
      freq: "harian",
      item_id: `perawatan_${tortoiseId}`,
      item_label: `Perawatan ${namaKura}`,
      period_key: tanggal,
      is_done: true,
      done_at: format(new Date(), "HH:mm"),
      done_by: oleh,
      done_by_email: user?.email,
      poin_earned: 0,
    });
  } catch {
    // Catatan medisnya sudah tersimpan. Yang gagal hanya penanda tampilan,
    // jadi tombolnya mungkin muncul lagi setelah halaman dimuat ulang —
    // pemeriksaan ganda di atas mencegah catatan medisnya terduplikasi.
    peringatan.push("tanda centangnya mungkin muncul lagi setelah muat ulang");
  }

  // ── 3. Tutup tugas bikinan server, lewat jalur resminya ──
  let tugasDitutup = false;
  const tugas = cariTugasPerawatan(tugasInsidentil, namaKura);
  if (tugas) {
    try {
      await claimIncidentalTask(tugas, user, {
        notes: `Perawatan harian ${namaKura} — dicatat dari layar keeper`,
      });
      tugasDitutup = true;
    } catch (e) {
      peringatan.push(`tugas "${tugas.title}" belum tertutup (${e?.message || "gagal"})`);
    }
  }

  return {
    dicatat: true,
    tugasDitutup,
    peringatan: peringatan.length ? peringatan.join("; ") : null,
  };
}
