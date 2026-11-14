/**
 * barisTelur.js — perubahan pada satu array `egg_records`, sebagai hitungan
 * yang bisa diuji.
 *
 * ── Kenapa dipisahkan dari layarnya ─────────────────────────────────────────
 *
 * EggGrid mengirim SELURUH array egg_records setiap kali satu telur ditandai.
 * Artinya tiap penyimpanan bukan "ubah telur ini" melainkan "ganti seluruh
 * daftar dengan yang ini" — dan daftar yang dipakai menyusunnya menentukan
 * nasib 24 telur lain yang tidak sedang disentuh.
 *
 * Pada 22 Okt 2026 daftar itu terbukti bisa basi (lihat kunciBreeding.js), dan
 * akibatnya telur yang sudah ditandai kembali kosong tanpa satu pun galat.
 * Aturan yang bisa merusak dua puluh empat baris yang tidak diminta berubah
 * tidak boleh hidup di dalam penangan klik.
 */

/** Telur yang sudah menetas DAN sudah punya data kura terdaftar. */
export function sudahJadiKura(telur) {
  return telur?.status === "menetas" && !!telur?.tortoise_id;
}

/**
 * Daftar telur yang dipakai layar: yang tersimpan, atau daftar kosong
 * sebanyak jumlah telurnya.
 *
 * Clutch yang belum pernah dicek sama sekali tidak punya `egg_records` —
 * barisnya dibuat di layar, dan baru benar-benar ada sesudah penyimpanan
 * pertama.
 */
export function barisTelurAwal({ eggCount = 0, eggRecords } = {}) {
  const ada = Array.isArray(eggRecords) ? eggRecords : [];
  if (ada.length > 0) return ada;
  return Array.from({ length: Math.max(0, Number(eggCount) || 0) }, (_, i) => ({
    egg_number: i + 1,
    status: "belum_dicek",
    check_date: null,
    hatch_date: null,
    notes: "",
    tortoise_id: null,
    tortoise_code: null,
  }));
}

/**
 * Satu telur berubah status; yang lain disalin apa adanya.
 *
 * `hatch_date` hanya diisi saat telur menjadi "menetas" dan belum punya
 * tanggal — menandai ulang telur yang sudah menetas tidak boleh memindahkan
 * tanggal menetasnya ke hari ini.
 */
export function terapkanStatus(records = [], { eggNumber, status, checkDate, notes, hariIni } = {}) {
  const tgl = checkDate || hariIni;
  return (records || []).map((e) =>
    e.egg_number === eggNumber
      ? {
          ...e,
          status,
          check_date: tgl,
          notes: notes ?? e.notes,
          hatch_date: status === "menetas" ? (e.hatch_date || hariIni) : e.hatch_date,
        }
      : e,
  );
}

/**
 * Semua telur sekaligus — KECUALI yang sudah jadi kura.
 *
 * ── Kenapa ada pengecualian ─────────────────────────────────────────────────
 *
 * Tombol "Semua Fertile" dan "Semua Infertil" dulu menimpa SELURUH baris.
 * Telur yang sudah menetas dan sudah punya bayi terdaftar ikut berubah jadi
 * infertil — sambil tetap membawa `tortoise_id`-nya, sehingga ada kura hidup
 * yang menurut catatan berasal dari telur yang tidak pernah berkembang.
 *
 * Jalur satu-per-satu sudah meminta konfirmasi untuk perubahan itu sejak
 * awal; jalur massal tidak pernah bertanya. Dua tombol untuk satu keputusan,
 * dan yang lebih cepat justru yang tidak bertanya.
 *
 * Mengembalikan jumlah yang DILEWATI, bukan hanya hasilnya, supaya layarnya
 * bisa menyebutkannya alih-alih diam.
 */
export function terapkanSemua(records = [], { status, hariIni } = {}) {
  return terapkanTerpilih(records, { nomor: null, status, hariIni });
}

/**
 * Beberapa telur yang DIPILIH sekaligus — bukan satu-satu, bukan semuanya.
 *
 * ── Permintaannya ───────────────────────────────────────────────────────────
 *
 * 14 Nov 2026: "Waktu kita konfirmasi sudah menetas atau kita menentukan
 * gagal, ini kan satu-satu. Jadi apakah kita bisa memilih beberapa telur,
 * jadi kita langsung menentukan ini sudah menetas? Misalkan langsung lima
 * atau enam atau delapan."
 *
 * Satu clutch di kebun ini bisa 28 butir, dan yang menetas sering keluar
 * bersamaan dalam sehari. Dua puluh delapan ketukan untuk satu kejadian yang
 * sama adalah dua puluh delapan kesempatan berhenti di tengah — dan clutch
 * yang separuh ditandai lebih buruk daripada yang belum ditandai sama
 * sekali, karena ia terbaca seolah sudah selesai dihitung.
 *
 * ── Kenapa satu fungsi untuk "terpilih" DAN "semua" ─────────────────────────
 *
 * `terapkanSemua` sekarang memanggil fungsi ini dengan `nomor: null`. Dua
 * jalur massal dengan dua aturan sendiri adalah persis bentuk yang sudah
 * sekali melukai data di berkas ini: jalur satu-per-satu meminta konfirmasi
 * sejak awal, jalur massal tidak pernah bertanya, dan telur yang sudah jadi
 * kura ikut ditimpa. Satu badan aturan, dua pintu.
 *
 * ── hatch_date, yang dulu hilang di jalur massal ────────────────────────────
 *
 * `terapkanStatus` (satu telur) mengisi `hatch_date` saat telur menjadi
 * "menetas". `terapkanSemua` TIDAK — dan itu tidak pernah ketahuan karena
 * tombolnya cuma dipakai untuk fertile/infertil. Begitu "menetas" boleh
 * dipilih massal, lubang itu langsung berarti: bayi yang ditandai menetas
 * berbondong-bondong tidak akan punya tanggal menetas sama sekali.
 *
 * Tanggalnya hanya diisi bila belum ada, sama seperti jalur satu telur:
 * menandai ulang tidak boleh memindahkan tanggal menetas ke hari ini.
 *
 * @param {Array} records
 * @param {Set<number>|Array<number>|null} nomor egg_number yang dipilih;
 *   null berarti SEMUA
 * @returns {{ hasil, dilewati, diubah }}
 */
export function terapkanTerpilih(records = [], { nomor = null, status, hariIni } = {}) {
  const pilih = nomor === null ? null : new Set([...(nomor || [])].map(Number));
  let dilewati = 0;
  let diubah = 0;
  const hasil = (records || []).map((e) => {
    if (pilih && !pilih.has(Number(e.egg_number))) return e;
    if (sudahJadiKura(e)) { dilewati += 1; return e; }
    diubah += 1;
    return {
      ...e,
      status,
      check_date: hariIni,
      hatch_date: status === "menetas" ? (e.hatch_date || hariIni) : e.hatch_date,
    };
  });
  return { hasil, dilewati, diubah };
}
