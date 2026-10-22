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
  let dilewati = 0;
  const hasil = (records || []).map((e) => {
    if (sudahJadiKura(e)) { dilewati += 1; return e; }
    return { ...e, status, check_date: hariIni };
  });
  return { hasil, dilewati };
}
