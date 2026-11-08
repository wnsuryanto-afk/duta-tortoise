/**
 * telurRetak.js — telur yang cangkangnya retak, dan kenapa itu BUKAN sebuah
 * status.
 *
 * ── Permintaannya ───────────────────────────────────────────────────────────
 *
 * 8 Nov 2026: "Sering kali kura bertelur, ada beberapa yang retak, yang perlu
 * perlakuan dan perlu pendataan. Kita jadi bisa sendirikan supaya ada
 * perhatian lebih untuk yang retak."
 *
 * ── Kenapa tidak ditambahkan saja ke enum status ────────────────────────────
 *
 * Cara termudah adalah menambah "retak" sebagai nilai keenam di samping
 * belum_dicek / fertile / infertil / menetas / gagal. Itu akan salah, dan
 * salahnya diam.
 *
 * Retak adalah KEADAAN FISIK CANGKANG. Status adalah PERJALANAN HIDUP telur.
 * Keduanya berjalan bersamaan: telur retak tetap bisa belum dicek, tetap bisa
 * terbukti fertil, dan tetap bisa menetas. Justru itu yang ingin diketahui —
 * apakah yang retak selamat, dan apakah perlakuannya berhasil.
 *
 * Kalau "retak" jadi status, tiga hal rusak sekaligus:
 *
 *   1. Menandai retak MENGHAPUS status fertilitasnya. Telur yang sudah
 *      terbukti fertil lalu ketahuan retak akan kehilangan catatan fertilnya.
 *
 *   2. ringkasDariBarisTelur menghitung per status. Telur "retak" tidak masuk
 *      fertile_count, tidak masuk infertile_count, tidak masuk hatched_count —
 *      ia menguap dari seluruh hitungan. Fertilitas mengukur PEJANTAN dan daya
 *      tetas mengukur INKUBATOR; telur yang menguap menekan keduanya tanpa
 *      alasan, dan Ranking Indukan memakai angka itu untuk memutuskan indukan
 *      mana yang dilepas.
 *
 *   3. Pertanyaan yang paling berguna jadi tidak bisa dijawab. "Dari 7 telur
 *      retak musim ini, berapa yang menetas?" menuntut retak DAN status ada
 *      berdampingan.
 *
 * Jadi `retak` adalah penanda tersendiri di samping `status`, bukan salah satu
 * nilainya. Penjaga cek-retak.mjs menolak kalau ia menyelinap masuk ke enum.
 */

/** Telur ini retak? */
export function retak(telur) {
  return telur?.retak === true;
}

/**
 * Tandai satu telur retak atau tidak.
 *
 * Statusnya TIDAK disentuh — itu seluruh maksud berkas ini. Melepas tandanya
 * ikut mengosongkan tanggal dan catatan perlakuan: telur yang ternyata tidak
 * retak tidak boleh meninggalkan catatan perlakuan yang tidak pernah terjadi.
 */
export function tandaiRetak(records = [], { eggNumber, nilai = true, tanggal, catatan } = {}) {
  return (records || []).map((e) => {
    if (e?.egg_number !== eggNumber) return e;
    if (!nilai) return { ...e, retak: false, retak_date: null, retak_catatan: "" };
    return {
      ...e,
      retak: true,
      retak_date: e.retak_date || tanggal || null,
      retak_catatan: catatan !== undefined ? catatan : (e.retak_catatan || ""),
    };
  });
}

/**
 * Tandai SEJUMLAH telur retak sekaligus — jalur "berapa yang retak" saat
 * mencatat kura bertelur.
 *
 * Di lapangan yang diketahui saat itu adalah ANGKANYA, bukan nomor telurnya:
 * telurnya baru diangkat dari lubang dan belum dinomori di tray. Jadi yang
 * diminta formulir adalah jumlah, dan nomor persisnya bisa dibetulkan
 * belakangan di layar telur.
 *
 * Yang sudah menetas tidak pernah ikut ditandai — telur yang sudah jadi kura
 * tidak bisa "baru ketahuan retak", dan menandainya akan menaruh peringatan
 * perawatan pada telur yang sudah tidak ada.
 *
 * Mengembalikan jumlah yang BENAR-BENAR tertandai beserta yang tidak muat,
 * supaya layarnya bisa menyebutkannya alih-alih diam.
 */
export function tandaiRetakMassal(records = [], { jumlah = 0, tanggal } = {}) {
  const target = Math.max(0, Math.floor(Number(jumlah) || 0));
  const bisa = (e) => e?.status !== "menetas";

  let sisa = target;
  // Yang sudah bertanda dihitung lebih dulu: meminta "3 retak" pada clutch
  // yang sudah punya 2 bertanda berarti totalnya 3, bukan 5.
  for (const e of records || []) if (retak(e) && bisa(e)) sisa -= 1;

  const hasil = (records || []).map((e) => {
    if (!bisa(e)) return e;
    if (retak(e)) return e;
    if (sisa <= 0) return e;
    sisa -= 1;
    return { ...e, retak: true, retak_date: e.retak_date || tanggal || null };
  });

  const tertandai = hasil.filter((e) => retak(e) && bisa(e)).length;
  return { hasil, tertandai, takMuat: Math.max(0, target - tertandai) };
}

/**
 * Ringkasan telur retak satu clutch.
 *
 * `selamat` dan `gagal` hanya menghitung yang SUDAH ada hasilnya. Yang masih
 * berjalan dihitung terpisah, karena memasukkannya ke "gagal" akan membuat
 * perlakuan terbaca gagal sebelum sempat dinilai — cacat yang sama dengan
 * hatch rate yang memasukkan telur yang masih dierami.
 */
export function ringkasRetak(records = []) {
  const baris = (records || []).filter(retak);
  const n = (f) => baris.filter(f).length;
  const selamat = n((e) => e.status === "menetas");
  const gagal = n((e) => e.status === "gagal" || e.status === "infertil");
  const berjalan = baris.length - selamat - gagal;
  const adaHasil = selamat + gagal;
  return {
    total: baris.length,
    selamat,
    gagal,
    berjalan,
    /** Persen selamat dari yang SUDAH ada hasilnya; null bila belum ada. */
    persenSelamat: adaHasil > 0 ? Math.round((selamat / adaHasil) * 100) : null,
  };
}

/**
 * Telur retak yang masih perlu diperhatikan, dari seluruh clutch.
 *
 * "Masih perlu" berarti belum ada hasilnya: belum menetas, belum dinyatakan
 * gagal atau infertil. Telur retak yang sudah menetas tidak butuh perhatian
 * lagi — ia sudah jadi kura.
 *
 * Clutch yang sudah ditutup dilewati: telurnya tidak lagi dierami siapa pun,
 * dan menaruhnya di daftar kerja hanya membuat daftar itu diabaikan.
 */
const CLUTCH_BERJALAN = ["bertelur", "inkubasi"];

export function telurRetakPerluPerhatian(breedings = []) {
  const keluar = [];
  for (const b of breedings || []) {
    if (!b || !CLUTCH_BERJALAN.includes(b.status)) continue;
    for (const e of b.egg_records || []) {
      if (!retak(e)) continue;
      if (e.status === "menetas" || e.status === "gagal" || e.status === "infertil") continue;
      keluar.push({
        breeding_id: b.id,
        pasangan: `${b.male_name || "?"} × ${b.female_name || "?"}`,
        egg_number: e.egg_number,
        status: e.status || "belum_dicek",
        retak_date: e.retak_date || null,
        retak_catatan: e.retak_catatan || "",
        egg_laying_date: b.egg_laying_date || null,
        incubator_name: b.incubator_name || "",
      });
    }
  }
  return keluar.sort((a, b) =>
    String(a.egg_laying_date || "").localeCompare(String(b.egg_laying_date || "")) ||
    (a.egg_number || 0) - (b.egg_number || 0));
}
