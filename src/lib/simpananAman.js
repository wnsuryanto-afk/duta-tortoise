/**
 * simpananAman.js — localStorage / sessionStorage yang tidak bisa
 * menjatuhkan aplikasi.
 *
 * ── Kenapa berkas ini ada ────────────────────────────────────────────────
 *
 * Dua penyedia membungkus SELURUH aplikasi — ThemeProvider dan
 * ViewAsProvider — dan keduanya membaca penyimpanan peramban di dalam
 * `useState`, yaitu saat render pertama:
 *
 *     const [theme] = useState(() => localStorage.getItem("duta_theme") || "light");
 *     const [viewAsRole] = useState(() => sessionStorage.getItem(SESSION_KEY) || null);
 *
 * Kalau pembacaan itu melempar, tidak ada satu layar pun yang terbentuk.
 * Bukan pesan kesalahan, bukan layar kosong yang bisa dijelaskan: LAYAR
 * PUTIH, tanpa petunjuk apa pun.
 *
 * Dan keduanya memang bisa melempar. Di peramban yang data situsnya
 * diblokir, menyentuh `localStorage` saja sudah melempar SecurityError —
 * bukan mengembalikan null. Kiper membuka aplikasi ini dari ponsel masing
 * masing, dan satu setelan privasi yang tidak pernah kita lihat cukup untuk
 * membuat aplikasinya tidak bisa dibuka sama sekali.
 *
 * Ketahuan 4 Okt 2026, saat 26 halaman dimasukkan ke penjaga render: di Node
 * tidak ada `sessionStorage`, dan KESELURUHAN 122 kasus gagal dengan
 * "sessionStorage is not defined". Yang ditemukan penjaga itu bukan
 * kekurangan dirinya sendiri — melainkan satu baris di jalur paling kritis
 * aplikasi yang tidak pernah menyiapkan diri untuk gagal.
 *
 * Yang hilang saat penyimpanannya tidak bisa dipakai: tema kembali ke
 * terang tiap muat ulang, dan "Lihat Sebagai" lupa perannya. Keduanya bisa
 * diterima. Layar putih tidak.
 */

/** @param {"local"|"session"} jenis */
function wadah(jenis) {
  try {
    return jenis === "session" ? globalThis.sessionStorage : globalThis.localStorage;
  } catch {
    // Menyentuh propertinya pun bisa melempar saat data situs diblokir.
    return null;
  }
}

function baca(jenis, kunci) {
  try {
    return wadah(jenis)?.getItem(kunci) ?? null;
  } catch {
    return null;
  }
}

function tulis(jenis, kunci, nilai) {
  try {
    wadah(jenis)?.setItem(kunci, nilai);
    return true;
  } catch {
    return false;
  }
}

function hapus(jenis, kunci) {
  try {
    wadah(jenis)?.removeItem(kunci);
    return true;
  } catch {
    return false;
  }
}

/** Penyimpanan yang bertahan antar sesi — tema, penanda tur. */
export const simpananLokal = {
  baca: (kunci) => baca("local", kunci),
  tulis: (kunci, nilai) => tulis("local", kunci, nilai),
  hapus: (kunci) => hapus("local", kunci),
};

/** Penyimpanan satu sesi — "Lihat Sebagai". */
export const simpananSesi = {
  baca: (kunci) => baca("session", kunci),
  tulis: (kunci, nilai) => tulis("session", kunci, nilai),
  hapus: (kunci) => hapus("session", kunci),
};
