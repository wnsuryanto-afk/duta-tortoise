/**
 * diseaseClusterUtils — deteksi kluster penyakit dari HealthRecord (MURNI MEMBACA).
 *
 * Aturan: bila 3 kura atau lebih memperoleh catatan "sakit" dengan diagnosis
 * yang SAMA dalam rentang 3 hari, tandai sebagai kluster.
 *
 * Tidak menulis/mengubah data apa pun — semua dihitung dari record yang ada.
 */
import { differenceInCalendarDays, parseISO, format } from "date-fns";
import { masukLaporan } from "./laporan";

const DIAGNOSIS_LABELS = {
  infeksi_saluran_pernapasan: "Infeksi Saluran Pernapasan",
  rns: "RNS",
  pneumonia: "Pneumonia",
  shell_rot: "Shell Rot",
  pyramiding: "Pyramiding",
  retak_cangkang: "Retak Cangkang",
  infeksi_jamur_cangkang: "Infeksi Jamur Cangkang",
  mbd: "MBD",
  hipovitaminosis_a: "Hipovitaminosis A",
  gout: "Gout",
  batu_kandung_kemih: "Batu Kandung Kemih",
  sembelit: "Sembelit",
  diare: "Diare",
  anorexia: "Anorexia",
  cacingan: "Cacingan",
  protozoa: "Protozoa",
  tungau_kutu: "Tungau/Kutu",
  luka_gigitan: "Luka Gigitan",
  abses: "Abses",
  infeksi_jamur_kulit: "Infeksi Jamur Kulit",
  infeksi_mata: "Infeksi Mata",
  stomatitis: "Stomatitis",
  abses_telinga: "Abses Telinga",
  prolaps: "Prolaps",
  prolaps_penis: "Prolaps Penis",
  egg_binding: "Egg Binding",
  edema: "Edema",
  dehidrasi: "Dehidrasi",
  heat_stroke: "Heat Stroke",
  stres: "Stres",
  checkup_rutin: "Checkup Rutin",
  lainnya: "Lainnya",
};

/**
 * Berapa hari sebuah kluster masih pantas MEMINTA TINDAKAN di beranda.
 *
 * ── Kenapa batas ini ada ────────────────────────────────────────────────
 *
 * Kartu kluster di beranda berbunyi "Periksa: pergantian jenis pakan, cuaca,
 * atau kualitas air pada tanggal 22 Jul 2026". Pada 12 Okt 2026 kalimat itu
 * meminta sesuatu yang MUSTAHIL — tidak ada yang bisa memeriksa kualitas air
 * bulan Juli di bulan Oktober.
 *
 * Deteksi di bawah tidak pernah punya batas waktu sama sekali, dan kartunya
 * menarik seribu catatan terakhir, jadi dua kluster Juli duduk di beranda
 * selama 82 hari. Satu-satunya cara menghilangkannya adalah menekan ×, dan
 * tanda itu disimpan di localStorage PER PERAMBAN — ditutup di laptop, muncul
 * lagi di HP.
 *
 * Peringatan yang tidak bisa dikerjakan mengajari orang berhenti membaca
 * kartunya, dan ia akan tetap tidak terbaca pada hari kluster sungguhan
 * muncul. Itu harga yang jauh lebih mahal daripada melewatkan satu kluster
 * lama.
 *
 * Empat belas hari: satu kluster membentang paling lama 3 hari, dan dua
 * minggu memberi ruang untuk episodenya mereda lalu ditindaklanjuti —
 * sementara pertanyaan "pakan apa yang berganti dua minggu lalu" masih bisa
 * dijawab catatan stok dan ingatan orang.
 *
 * Yang lama TIDAK hilang: /riwayat-kluster memakai detectDiseaseClusters
 * tanpa saringan ini, jadi seluruh riwayatnya tetap utuh di sana.
 */
export const HARI_KLUSTER_AKTIF = 14;

/**
 * Kluster yang masih pantas meminta tindakan hari ini.
 *
 * Dihitung dari tanggal TERAKHIR kluster, bukan tanggal pertamanya: kluster
 * yang mulai 15 hari lalu tetapi kasus terakhirnya kemarin masih berjalan.
 *
 * `hariIni` disuntikkan supaya bisa diuji.
 */
export function klusterAktif(clusters = [], { hariIni = new Date(), hari = HARI_KLUSTER_AKTIF } = {}) {
  return clusters.filter((c) => {
    if (!c?.end_date) return false;
    const umur = differenceInCalendarDays(hariIni, parseISO(c.end_date));
    // Umur negatif = tanggal di masa depan (salah ketik). Dibiarkan tampil:
    // catatan bertanggal besok adalah hal yang perlu dilihat orang.
    return umur <= hari;
  });
}

export function diagnosisLabel(code) {
  return DIAGNOSIS_LABELS[code] || code || "—";
}

function eventDiagnosisKey(e) {
  return e.diagnosis_code || `__notes__:${e.diagnosis_name}`;
}

/**
 * Deteksi kluster dari daftar HealthRecord.
 * @param healthRecords  array HealthRecord (type "sakit" dipakai)
 * @param enclosureMap   { tortoise_id -> enclosure } (dari Tortoise, kandang saat ini)
 * @returns array kluster, urut mulai yang terbaru.
 */
export function detectDiseaseClusters(healthRecords, enclosureMap = {}) {
  if (!Array.isArray(healthRecords) || healthRecords.length === 0) return [];

  // Bangun "event" per diagnosis dari catatan sakit.
  const events = [];
  healthRecords.forEach((h) => {
    if (!masukLaporan(h)) return;
    if (h.type !== "sakit") return;
    if (!h.date) return;
    const name = h.tortoise_name || "—";
    const enclosure = enclosureMap[h.tortoise_id] || h.enclosure_name || "—";
    let codes = Array.isArray(h.diagnosis) && h.diagnosis.length > 0 ? [...h.diagnosis] : [];
    if (codes.length === 0 && h.diagnosis_notes) codes = [null]; // fallback: kelompokkan per catatan diagnosis
    if (codes.length === 0) codes = [null];
    codes.forEach((code) => {
      events.push({
        tortoise_id: h.tortoise_id || null,
        tortoise_name: name,
        enclosure,
        date: h.date,
        diagnosis_code: code,
        diagnosis_name: code ? diagnosisLabel(code) : (h.diagnosis_notes || "Lainnya"),
      });
    });
  });

  // Kelompokkan per diagnosis.
  const byDiag = {};
  events.forEach((e) => {
    const key = eventDiagnosisKey(e);
    if (!byDiag[key]) byDiag[key] = [];
    byDiag[key].push(e);
  });

  const clusters = [];
  Object.keys(byDiag).forEach((key) => {
    const evs = byDiag[key].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    let i = 0;
    while (i < evs.length) {
      const startDate = parseISO(evs[i].date);
      let j = i;
      while (j + 1 < evs.length && differenceInCalendarDays(parseISO(evs[j + 1].date), startDate) <= 3) {
        j++;
      }
      // Dedup per tortoise (ambil record terlama dalam jendela ini).
      const seen = new Map();
      for (let k = i; k <= j; k++) {
        const e = evs[k];
        if (!seen.has(e.tortoise_id)) seen.set(e.tortoise_id, e);
      }
      const unique = Array.from(seen.values());
      if (unique.length >= 3) {
        const dates = unique.map((e) => parseISO(e.date)).sort((a, b) => a - b);
        const enclosures = [...new Set(unique.map((e) => e.enclosure).filter((x) => x && x !== "—"))];
        clusters.push({
          key: `${key}__${format(dates[0], "yyyy-MM-dd")}`,
          diagnosis_code: unique[0].diagnosis_code,
          diagnosis_name: unique[0].diagnosis_name,
          count: unique.length,
          start_date: format(dates[0], "yyyy-MM-dd"),
          end_date: format(dates[dates.length - 1], "yyyy-MM-dd"),
          span_days: differenceInCalendarDays(dates[dates.length - 1], dates[0]),
          enclosures,
          same_enclosure: enclosures.length === 1,
          tortoises: unique
            .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
            .map((e) => ({ name: e.tortoise_name, enclosure: e.enclosure, date: e.date })),
        });
        i = j + 1; // lompat lewat jendela ini agar tidak tumpang tindih
      } else {
        i++;
      }
    }
  });

  clusters.sort((a, b) => b.start_date.localeCompare(a.start_date));
  return clusters;
}