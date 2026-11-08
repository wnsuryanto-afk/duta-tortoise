/**
 * kelaminKura.js — SATU tempat yang memutuskan kapan jenis kelamin boleh
 * ditanyakan.
 *
 * ── Kenapa berkas ini ada ───────────────────────────────────────────────────
 *
 * 8 Nov 2026 pemiliknya menekan "Menetas" dan diminta memilih jenis kelamin
 * bayi yang baru keluar dari telurnya. Sulcata tidak bisa dikelamini pada umur
 * itu, pada ukuran itu, atau pada ukuran mana pun yang dekat dengannya.
 *
 * Ciri yang dipakai orang — plastron cekung, ekor panjang, gular menonjol —
 * baru muncul setelah kura mendekati dewasa. Reptiles Magazine menyebut
 * pengelaminan sulcata di bawah 12 inci (±30 cm) "sulit"; keterangan dari
 * peternak yang berpengalaman baru menyebut "yakin" di sekitar 15 inci
 * (±38 cm). Bayi menetas pada ±4,5 cm. Yang bisa diisi di layar penetasan
 * karena itu bukan pengamatan, melainkan tebakan — dan tebakan yang disimpan
 * ke kolom data tidak bisa dibedakan lagi dari hasil pemeriksaan.
 *
 * ── Kenapa angkanya penting, bukan sekadar "nanti saja" ─────────────────────
 *
 * Kolom ini BUKAN keterangan. Ia dipakai memilih kura mana yang diberi obat:
 *
 *     TreatmentPage.getTargetTortoises → tortoises.filter(t => t.gender === "betina")
 *
 * Jadwal "Boost Kalsium Betina (Musim Bertelur)" dan "Kapsul DUTA FEMALE PLUS"
 * memilih penerimanya persis dari kolom ini. Satu tebakan di hari penetasan
 * berarti bayi 50 gram masuk daftar vitamin reproduksi betina dewasa.
 *
 * Aplikasi ini sebelumnya memakai TIGA aturan sekaligus untuk hal yang sama:
 *
 *   TortoiseForm        wajib bila cangkang >= 20 cm         — terlalu dini
 *   incompleteChecks    "belum lengkap" bila >= 20 cm        — ikut menagih
 *   dua layar penetasan tidak punya aturan sama sekali       — ±4,5 cm
 *
 * Batas 20 cm itu bukan hanya terlalu dini, ia AKTIF menghasilkan tebakan:
 * saringan "Data Belum Lengkap" menandai setiap kura di atas 20 cm yang
 * kelaminnya belum diisi, jadi yang mengisinya mengisi karena ditagih. Dua
 * dari enam kura ber-kelamin di bawah 30 cm berukuran 20,5 cm dan 20,7 cm —
 * persis di atas garis itu.
 */

/**
 * Panjang cangkang (cm) minimum sebelum jenis kelamin sulcata bisa dibaca.
 *
 * 30 cm ≈ 12 inci, batas bawah yang disebut pustaka sebagai "di bawah ini
 * sulit". Bukan jaminan: di 30–38 cm masih perlu beberapa ciri sekaligus.
 * Yang dijaga angka ini hanyalah bahwa aplikasi tidak MEMINTA jawaban yang
 * belum mungkin ada.
 */
export const BATAS_KELAMIN_CM = 30;

/**
 * Apakah jenis kelamin kura ini sudah masuk akal untuk ditentukan?
 *
 * Panjang cangkang yang dipakai, bukan umur: dua kura seumur bisa berbeda
 * jauh ukurannya, dan yang menentukan munculnya ciri kelamin adalah
 * perkembangan tubuhnya. Umur hanya dipakai bila panjangnya belum diukur.
 *
 * @param {object} kura  { shell_length_cm, age_category, birth_date }
 * @returns {{bisa: boolean, sebab: string}}
 */
export function bisaDikelamini(kura) {
  const cm = Number(kura?.shell_length_cm) || 0;
  if (cm > 0) {
    if (cm >= BATAS_KELAMIN_CM) return { bisa: true, sebab: "" };
    return {
      bisa: false,
      sebab: `Cangkang ${cm} cm — jenis kelamin sulcata baru bisa dibaca mulai ±${BATAS_KELAMIN_CM} cm.`,
    };
  }
  /*
   * Belum diukur. Yang masih bayi jelas belum bisa; yang lain tidak boleh
   * dituduh apa pun — panjangnya yang kurang, bukan kuranya.
   */
  if (kura?.age_category === "baby") {
    return {
      bisa: false,
      sebab: `Masih bayi — jenis kelamin sulcata baru bisa dibaca mulai ±${BATAS_KELAMIN_CM} cm.`,
    };
  }
  return { bisa: true, sebab: "" };
}

/** Jenis kelaminnya sudah terisi, padahal ukurannya belum memungkinkan. */
export function kelaminTerlaluDini(kura) {
  const terisi = kura?.gender === "jantan" || kura?.gender === "betina";
  if (!terisi) return false;
  return !bisaDikelamini(kura).bisa;
}

/**
 * Kura yang jenis kelaminnya tercatat sebelum ukurannya memungkinkan.
 *
 * Bukan untuk dihapus otomatis — sebagian mungkin memang sudah diperiksa
 * dokter, dan menghapus kelamin yang benar akan memutus catatan perkawinan
 * dan silsilah. Yang dikembalikannya adalah daftar untuk DIPASTIKAN ULANG
 * oleh orangnya.
 */
export function kelaminPerluDipastikan(tortoises = []) {
  return (tortoises || [])
    .filter((t) => t && t.status !== "mati" && kelaminTerlaluDini(t))
    .sort((a, b) => (Number(a?.shell_length_cm) || 0) - (Number(b?.shell_length_cm) || 0));
}
