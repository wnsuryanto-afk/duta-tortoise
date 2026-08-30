import { base44 } from "@/api/base44Client";
import { hitungIsiKandang } from "@/lib/kandang";

/**
 * Hitung ulang `current_count` kandang dari data kura yang sebenarnya.
 *
 * `current_count` adalah salinan dari sesuatu yang sebetulnya bisa dihitung,
 * jadi satu-satunya cara ia tetap benar adalah kalau SETIAP jalur yang mengubah
 * penghuni kandang memanggil fungsi ini, dan fungsi ini memakai aturan yang
 * sama dengan yang ditampilkan di layar.
 *
 * Dua hal itu dulu sama-sama tidak dipenuhi:
 *
 * 1. **Aturannya berbeda dari layar.** Fungsi ini mencocokkan kandang lewat
 *    NAMA (`t.enclosure === enc.name`), sementara halaman Kandang memakai
 *    `hitungIsiKandang` yang mencocokkan lewat NOMOR (`enclosure_id`) dengan
 *    nama sebagai cadangan. Selama nama dan nomor sepakat keduanya sama; begitu
 *    sebuah kandang diganti nama, keduanya berpisah. Selain itu fungsi ini hanya
 *    mengeluarkan kura berstatus "mati" dan "terjual", sedangkan definisi
 *    populasi (lib/populasiKura.js) juga mengeluarkan "diarsipkan" dan
 *    `is_archived` — kura arsip tetap terhitung sebagai penghuni.
 *
 *    Seseorang sudah menyadari selisih ini dan memperbaikinya, tetapi hanya di
 *    dalam dialog Pindah Kandang — bukan di sini. Akibatnya mencatat kematian
 *    atau penjualan memanggil fungsi ini dan MENIMPA angka yang sudah benar
 *    dengan angka versi longgar.
 *
 * 2. **Tidak semua jalur memanggilnya.** Hanya penjualan dan pencatatan
 *    kematian. Pemindahan massal, ganti nama kandang, pembatalan penjualan,
 *    penghapusan kura, dan bayi yang baru menetas tidak.
 *
 * Sekarang aturannya satu (`hitungIsiKandang`) dan pemanggilnya lengkap.
 *
 * @param {string[]|null} names Nama kandang yang ingin dihitung ulang.
 *                              Kosongkan untuk menghitung ulang semua kandang.
 * @returns {Promise<{updated: number, checked: number}>}
 */
export async function recalcEnclosureCounts(names = null) {
  const target = Array.isArray(names) ? names.filter(Boolean) : null;

  const [enclosures, tortoises] = await Promise.all([
    base44.entities.Enclosure.list(),
    base44.entities.Tortoise.list("-created_date", 2000),
  ]);

  let updated = 0;
  let checked = 0;
  for (const enc of enclosures) {
    if (target && !target.includes(enc.name)) continue;
    checked += 1;
    const real = hitungIsiKandang(enc, tortoises, enclosures);
    if ((enc.current_count || 0) !== real) {
      await base44.entities.Enclosure.update(enc.id, { current_count: real });
      updated += 1;
    }
  }
  return { updated, checked };
}

/**
 * Hitung ulang tanpa melempar galat.
 *
 * Dipakai di jalur yang pekerjaan utamanya sudah selesai dan tersimpan —
 * memindahkan kura, membatalkan penjualan, mencatat kelahiran. Kalau
 * penyegaran angka kandang gagal, pekerjaan utamanya tidak boleh ikut gagal;
 * angkanya akan benar lagi pada pemanggilan berikutnya.
 */
export async function recalcEnclosureCountsAman(names = null) {
  try {
    return await recalcEnclosureCounts(names);
  } catch (_) {
    return { updated: 0, checked: 0 };
  }
}
