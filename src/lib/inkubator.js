import { calculateIncubatorEggs } from "@/lib/breedingUtils";

/**
 * inkubator.js — memeriksa setelan inkubator, bukan cuma menampilkannya.
 *
 * ── Kenapa berkas ini ada ──────────────────────────────────────────────────
 *
 * Setelan alarm inkubator sudah lama terisi dan terlihat benar di layar:
 * target 31 °C, alarm di bawah 31, alarm di atas 32. Sampai angkanya
 * dijalankan satu per satu, tidak ada yang terlihat salah.
 *
 *   30,8 °C  -> suhu_rendah        (0,2 di bawah target sudah alarm)
 *   31,0 °C  -> normal
 *   31,9 °C  -> normal             (0,9 di atas target masih diam)
 *   32,1 °C  -> suhu_tinggi
 *
 * Toleransinya −0,0 °C ke bawah dan +1,0 °C ke atas: targetnya duduk PERSIS
 * di tepi bawah pita alarmnya sendiri. Akibatnya dua arah sekaligus — alarm
 * palsu untuk penurunan sekecil apa pun, dan diam untuk kenaikan yang nyata.
 * Alarm yang sering salah akan berhenti dipercaya, dan alarm yang diam saat
 * suhu naik adalah alarm yang tidak melakukan apa-apa.
 *
 * Dua pembacaan yang pernah ada (29 Mei dan 1 Juni 2026) keduanya tepat
 * 31,0 °C — persis di tepi itu. Tidak ada yang menyadarinya karena pita
 * selebar itu memang tidak pernah diuji.
 */

/** Target harus duduk DI DALAM pita alarm, bukan di tepinya. */
export function periksaAmbang(inkubator) {
  const masalah = [];
  if (!inkubator) return masalah;

  const pasang = (label, target, min, maks, satuan) => {
    const t = Number(target);
    const bawah = Number(min);
    const atas = Number(maks);
    if (!Number.isFinite(t)) return;
    if (Number.isFinite(bawah) && t <= bawah) {
      masalah.push({
        jenis: "target_di_tepi_bawah",
        teks: `Target ${label} ${t}${satuan} sama dengan atau di bawah batas alarm bawah (${bawah}${satuan}) — turun sedikit saja sudah berbunyi alarm.`,
      });
    }
    if (Number.isFinite(atas) && t >= atas) {
      masalah.push({
        jenis: "target_di_tepi_atas",
        teks: `Target ${label} ${t}${satuan} sama dengan atau di atas batas alarm atas (${atas}${satuan}) — naik sedikit saja sudah berbunyi alarm.`,
      });
    }
    if (Number.isFinite(bawah) && Number.isFinite(atas) && bawah >= atas) {
      masalah.push({
        jenis: "pita_terbalik",
        teks: `Batas alarm ${label} terbalik: bawah ${bawah}${satuan} tidak lebih kecil daripada atas ${atas}${satuan}.`,
      });
    }
  };

  pasang("suhu", inkubator.temp_setting, inkubator.temp_min_alarm, inkubator.temp_max_alarm, "°C");
  pasang("kelembapan", inkubator.humidity_setting, inkubator.humidity_min_alarm, inkubator.humidity_max_alarm, "%");
  return masalah;
}

/**
 * Isi inkubator menurut clutch yang benar-benar ada di dalamnya.
 *
 * `current_eggs` pada record inkubator TIDAK dipakai: kolom itu hanya berubah
 * saat ada yang menekan sinkron. Pada 2 Okt 2026 ia berbunyi 72 sementara
 * clutch yang menunjuk inkubator itu berisi 208 butir — angka dari Juni yang
 * sudah empat bulan tidak benar. Dihitung ulang dari clutch-nya sendiri.
 */
export function isiInkubator(inkubator, breedings = []) {
  const telur = calculateIncubatorEggs(inkubator?.name, breedings, inkubator?.id);
  const kapasitas = Number(inkubator?.kapasitas ?? inkubator?.capacity_eggs) || 0;
  return {
    telur,
    kapasitas,
    lebih: kapasitas > 0 ? Math.max(0, telur - kapasitas) : 0,
    tercatat: Number(inkubator?.current_eggs) || 0,
    melencengDariCatatan: telur !== (Number(inkubator?.current_eggs) || 0),
  };
}

/**
 * Jenis alarm sebuah pembacaan terhadap ambang inkubatornya.
 *
 * ── Kenapa satu fungsi, dipakai semua layar ───────────────────────────────
 *
 * Sampai 2 Okt 2026 ada TIGA penilaian suhu yang berbeda di aplikasi ini:
 *
 *   record Incubator        29-31 °C   (setelah diubah pemiliknya hari ini)
 *   MonitorInkubator        membaca record itu — benar
 *   KeeperIncubatorWidget   `temp >= 28 && temp <= 33` ditulis mati,
 *                           sementara komentarnya sendiri berbunyi "29-31"
 *
 * Yang paling berbahaya yang terakhir: beranda KIPER — orang yang benar-benar
 * membaca alat ukurnya tiap hari — memakai ambang paling longgar dari
 * ketiganya. Pembacaan 32,5 °C akan berwarna HIJAU di layar kiper sementara
 * layar monitor menyebutnya alarm. Yang melihat angkanya lebih dulu justru
 * yang paling kecil kemungkinannya diberi tahu.
 *
 * Ambangnya sekarang selalu datang dari record inkubatornya. Mengubah batas
 * di satu tempat mengubahnya di semua layar.
 */
export function jenisAlarm(suhu, kelembapan, inkubator) {
  const t = Number(suhu);
  const h = Number(kelembapan);
  if (!inkubator) return "normal";
  if (Number.isFinite(t)) {
    const atas = Number(inkubator.temp_max_alarm);
    const bawah = Number(inkubator.temp_min_alarm);
    if (Number.isFinite(atas) && t > atas) return "suhu_tinggi";
    if (Number.isFinite(bawah) && t < bawah) return "suhu_rendah";
  }
  if (Number.isFinite(h)) {
    const atas = Number(inkubator.humidity_max_alarm);
    const bawah = Number(inkubator.humidity_min_alarm);
    if (Number.isFinite(atas) && h > atas) return "humidity_tinggi";
    if (Number.isFinite(bawah) && h < bawah) return "humidity_rendah";
  }
  return "normal";
}

/**
 * Suhu & kelembapan sebuah pembacaan.
 *
 * Kolomnya `temperature_actual` / `humidity_actual`. Disebut lewat fungsi
 * karena KeeperIncubatorWidget membacanya sebagai `temperature` /
 * `humidity` — kolom yang TIDAK ADA di skema IncubatorReading. Akibatnya
 * widget itu selalu berkata "belum ada data", bahkan setelah pembacaan
 * benar-benar dicatat. Tidak ada error; nilainya cuma undefined.
 */
export function angkaPembacaan(pembacaan) {
  if (!pembacaan) return { suhu: null, kelembapan: null };
  const suhu = Number(pembacaan.temperature_actual);
  const kelembapan = Number(pembacaan.humidity_actual);
  return {
    suhu: Number.isFinite(suhu) ? suhu : null,
    kelembapan: Number.isFinite(kelembapan) ? kelembapan : null,
  };
}
