/**
 * urutanMenetas.js — urutan "mana yang menetas lebih dulu", per inkubator.
 *
 * ── Permintaannya, dan keadaan yang melahirkannya ────────────────────
 *
 * 13 Nov 2026: "Pada saat di inkubator tidak ada urutan mana yang menetas
 * sehingga seringkali ada yang miss menetas duluan tapi tanpa terpantau."
 *
 * Diukur pada data hari itu, 18 clutch sedang dierami:
 *
 *   Inkubator kecil (kap. 192)   10 clutch   188 butir   1 dari 10 punya tray
 *   Showcase 2pintu (kap. 768)    8 clutch   113 butir   7 dari 8 punya tray
 *
 * Kesembilan clutch yang menetas PALING DULU — 23 Nov sampai 21 Des —
 * semuanya di inkubator kecil, dan tidak satu pun punya nomor tray. Yang
 * pertama tinggal sepuluh hari lagi. Jadi saat bayinya keluar, tidak ada
 * yang tahu dari kotak mana, dan tidak ada yang tahu kotak mana berikutnya.
 *
 * Di Showcase keadaannya kebetulan baik: tray 5 → 12 terisi urut tanggal
 * bertelur. Tetapi itu kebetulan, bukan aturan — tidak ada satu pun layar
 * yang menyatakan urutannya, jadi tidak ada yang akan tahu kalau urutannya
 * rusak.
 *
 * Ini bukan temuan baru. `trayTelur.js` sudah menghitung clutch tanpa tray
 * pada 2 Okt 2026 dan laporannya masih ada; kartunya dicabut dari halaman
 * Breeding dua hari kemudian atas permintaan pemiliknya, dan fungsinya
 * sengaja ditinggalkan. Enam minggu kemudian akibatnya yang ditanyakan.
 *
 * ── Kenapa urutan bertelur SELALU sama dengan urutan menetas ─────────
 *
 * Jendela menetas setiap clutch adalah bertelur + 80 sampai + 105 hari —
 * lebar yang SAMA untuk semua. Jadi menggeser tanggal bertelur menggeser
 * seluruh jendelanya sejauh itu juga, dan dua clutch tidak pernah bertukar
 * urutan. Itu yang membuat urutan ini bisa dipercaya: ia tidak bergantung
 * pada tebakan, hanya pada tanggal yang memang dicatat.
 *
 * Akibat praktisnya: nomor tray yang diberikan urut tanggal bertelur
 * sekaligus merupakan urutan menetas. Tidak ada telur yang perlu dipindah
 * — yang kosong hanya perlu diisi.
 *
 * ── Kenapa nomor urutnya TIDAK disimpan ──────────────────────────────
 *
 * Urutan berubah tiap kali satu clutch menetas: yang tadinya nomor 2 jadi
 * nomor 1. Nomor yang disimpan akan basi pada hari pertama, dan nomor basi
 * di layar lebih berbahaya daripada tidak ada nomor sama sekali — orang
 * mempercayainya.
 *
 * Karena itu nomor urut dihitung setiap kali dibaca, dan TIDAK pernah
 * dicetak ke label. Yang dicetak ke label adalah tanggal bukanya, yang
 * tidak pernah basi.
 */

import { jendelaMenetas } from "@/lib/jendelaMenetas";
import { daftarTray } from "@/lib/trayTelur";
import { clutchAktif } from "@/lib/breedingUtils";
import { hitungMundur } from "@/lib/hitungMundur";

/** Teks "YYYY-MM-DD" → angka hari UTC untuk diurutkan; null di belakang. */
function kunciUrut(teks) {
  const m = String(teks ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return Number.POSITIVE_INFINITY;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/**
 * Clutch yang sedang dierami, diurutkan dari yang menetas paling dulu.
 *
 * Tiap entri membawa apa yang dibutuhkan satu baris di layar, sudah
 * dihitung — supaya komponennya tidak menghitung ulang dan tidak ada
 * kesempatan dua layar berselisih:
 *
 *   urutan      1, 2, 3 … dihitung, tidak disimpan
 *   mulai       tanggal buka jendela, "YYYY-MM-DD"
 *   sampai      tanggal tutup jendela
 *   tray        array nomor tray, [] bila belum diisi
 *   tanpaTray   true bila [] — inilah yang membuat bayinya tak tertelusur
 *   mundur      hasil hitungMundur(), atau null
 *
 * @param {Array} breedings seluruh catatan Breeding
 * @param {Date} [hariIni]
 */
export function urutanMenetas(breedings = [], hariIni = new Date()) {
  const aktif = (breedings || []).filter((b) => b && clutchAktif(b));
  const baris = aktif.map((b) => {
    const { mulai, sampai } = jendelaMenetas(b);
    const tray = daftarTray(b);
    return {
      clutch: b,
      id: b.id,
      mulai,
      sampai,
      tray,
      tanpaTray: tray.length === 0,
      mundur: hitungMundur(b, hariIni),
    };
  });
  baris.sort((a, z) => {
    const d = kunciUrut(a.mulai) - kunciUrut(z.mulai);
    if (d !== 0) return d;
    // Dua clutch yang jendelanya buka di hari yang sama diurutkan lagi
    // dengan traynya, supaya urutannya tidak berpindah-pindah tiap render.
    const ta = a.tray[0] ?? Number.POSITIVE_INFINITY;
    const tz = z.tray[0] ?? Number.POSITIVE_INFINITY;
    if (ta !== tz) return ta - tz;
    return String(a.id).localeCompare(String(z.id));
  });
  return baris.map((b, i) => ({ ...b, urutan: i + 1 }));
}

/**
 * Urutan yang sama, dikelompokkan per inkubator.
 *
 * Nomor urutnya dihitung ULANG di dalam tiap kelompok, bukan diwarisi dari
 * daftar gabungan. Orang yang berdiri di depan satu inkubator ingin tahu
 * "mana yang berikutnya DI SINI" — nomor 7 dari daftar gabungan hanya
 * membuatnya mencari enam kotak yang tidak ada di lemari itu.
 *
 * Dikelompokkan lewat `incubator_id` bila ada, dan jatuh ke nama bila
 * tidak — alasannya ada di breedingUtils.js: mengganti nama inkubator
 * memutus tautan yang hanya berupa nama.
 *
 * Namanya diambil dari daftar `incubators`, BUKAN dari teks di clutch-nya.
 * Pada data 13 Nov 2026 sembilan clutch masih menyimpan "Inkubator 1",
 * nama yang sudah tidak ada sejak inkubatornya diganti nama jadi
 * "Inkubator kecil" pada 2 Okt; tautan id-nya yang menyelamatkan mereka.
 * Layar yang menampilkan nama basi itu akan mengirim orang mencari lemari
 * yang tidak ada.
 *
 * @param {Array} breedings
 * @param {Array} [incubators] daftar Incubator, untuk menamai kelompoknya
 * @param {Date} [hariIni]
 * @returns {Array<{ kunci, nama, namaBasi, baris: Array }>} urut dari
 *   inkubator yang clutch terdekatnya paling dulu menetas. `namaBasi`
 *   berisi nama yang tersimpan di clutch bila ia berbeda dari nama
 *   sebenarnya, supaya layar bisa mengatakannya sekali, dan "" bila sama.
 */
export function urutanPerInkubator(breedings = [], incubators = [], hariIni = new Date()) {
  const semua = urutanMenetas(breedings, hariIni);
  const namaPerId = new Map(
    (incubators || []).filter((i) => i?.id).map((i) => [i.id, String(i.name || "").trim()]),
  );
  const peta = new Map();
  for (const b of semua) {
    const kunci = b.clutch.incubator_id || b.clutch.incubator_name || "(tanpa inkubator)";
    if (!peta.has(kunci)) {
      const tersimpan = String(b.clutch.incubator_name || "").trim();
      const sebenarnya = namaPerId.get(b.clutch.incubator_id) || "";
      const nama = sebenarnya || tersimpan || "(tanpa inkubator)";
      peta.set(kunci, {
        kunci,
        nama,
        namaBasi: sebenarnya && tersimpan && sebenarnya !== tersimpan ? tersimpan : "",
        baris: [],
      });
    }
    peta.get(kunci).baris.push(b);
  }
  return [...peta.values()]
    .map((k) => ({ ...k, baris: k.baris.map((b, i) => ({ ...b, urutan: i + 1 })) }))
    .sort((a, z) => kunciUrut(a.baris[0]?.mulai) - kunciUrut(z.baris[0]?.mulai));
}

/**
 * Ringkasan satu kalimat untuk kepala layar.
 *
 * @returns {{ total, tanpaTray, berikutnya }} `berikutnya` baris pertama,
 *   atau null bila tidak ada clutch aktif sama sekali.
 */
export function ringkasUrutan(breedings = [], hariIni = new Date()) {
  const baris = urutanMenetas(breedings, hariIni);
  return {
    total: baris.length,
    tanpaTray: baris.filter((b) => b.tanpaTray).length,
    berikutnya: baris[0] || null,
  };
}
