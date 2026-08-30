/**
 * stokMenipis.js — SATU definisi "stok ini perlu diperhatikan".
 *
 * Barang di peternakan ini disimpan di dua entitas yang bentuknya nyaris sama:
 * WarehouseItem (gudang) dan FeedStock (pakan). Keduanya sama-sama punya
 * `current_stock`, `minimum_stock`, dan `is_mandatory`.
 *
 * Beranda Owner hanya memeriksa yang gudang. Pakan ikut diambil, tetapi hanya
 * dipakai menghitung nilai persediaan — tidak pernah masuk daftar peringatan.
 * Akibatnya pakan yang habis tidak memunculkan peringatan apa pun di beranda,
 * padahal di peternakan kura itu justru kehabisan yang paling gawat.
 *
 * Ambangnya dikumpulkan di sini supaya setiap layar menjawab dengan cara yang
 * sama, dan supaya menambah sumber stok baru kelak tidak perlu menambal ulang
 * setiap widget.
 */

/** Berapa hari sebelum kedaluwarsa sebuah barang mulai diperingatkan. */
export const HARI_PERINGATAN_KADALUARSA = 30;

/** Angka stok yang aman dibandingkan — kosong dianggap nol, bukan tak terhingga. */
function angka(nilai) {
  const n = Number(nilai);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Stok habis untuk barang yang ditandai wajib ada.
 *
 * Gate `is_mandatory` sengaja dipertahankan: tanpa itu setiap barang yang
 * memang sengaja dibiarkan nol ikut berteriak, dan peringatan yang selalu
 * menyala sama saja dengan tidak ada peringatan.
 */
export function stokHabis(item) {
  return !!item?.is_mandatory && angka(item.current_stock) <= 0;
}

/**
 * Stok menipis: masih ada, tapi sudah di bawah batas minimum.
 *
 * Barang tanpa `minimum_stock` tidak pernah dianggap menipis — batasnya belum
 * ditentukan, dan menebaknya akan memenuhi daftar dengan barang yang baik-baik
 * saja.
 */
export function stokMenipis(item) {
  const sekarang = angka(item?.current_stock);
  const minimum = angka(item?.minimum_stock);
  return sekarang > 0 && minimum > 0 && sekarang < minimum;
}

/**
 * Akan kedaluwarsa dalam `hari` ke depan. Yang sudah lewat tidak dihitung di
 * sini — itu keadaan lain, dan ditangani daftarnya sendiri.
 */
export function akanKadaluarsa(item, hari = HARI_PERINGATAN_KADALUARSA, sekarang = new Date()) {
  if (!item?.expired_date) return false;
  const tanggal = new Date(item.expired_date);
  if (Number.isNaN(tanggal.getTime())) return false;
  const selisih = Math.ceil((tanggal - sekarang) / 86400000);
  return selisih >= 0 && selisih <= hari;
}

/** Sudah lewat tanggal kedaluwarsanya. */
export function sudahKadaluarsa(item, sekarang = new Date()) {
  if (!item?.expired_date) return false;
  const tanggal = new Date(item.expired_date);
  if (Number.isNaN(tanggal.getTime())) return false;
  return tanggal < sekarang;
}

/**
 * Gabungkan barang gudang dan pakan jadi satu daftar yang bisa diperiksa
 * dengan aturan yang sama, sambil menandai asalnya supaya layar masih bisa
 * menyebut "pakan" atau "gudang" saat menampilkan.
 */
export function semuaStok(barangGudang = [], pakan = []) {
  return [
    ...barangGudang.map((i) => ({ ...i, _sumber: "gudang" })),
    ...pakan.map((i) => ({ ...i, _sumber: "pakan" })),
  ];
}

/**
 * Ringkasan satu langkah untuk widget peringatan.
 *
 * @returns {{habis: Array, menipis: Array, kadaluarsa: Array}}
 */
export function periksaStok(barangGudang = [], pakan = [], sekarang = new Date()) {
  const semua = semuaStok(barangGudang, pakan);
  return {
    habis: semua.filter(stokHabis),
    menipis: semua.filter(stokMenipis),
    kadaluarsa: semua.filter((i) => akanKadaluarsa(i, HARI_PERINGATAN_KADALUARSA, sekarang)),
  };
}

/**
 * ── Stok yang tidak dipantau ──
 *
 * Peringatan "stok habis" hanya berarti bila angkanya memang dipelihara. Di
 * peternakan ini angka stok pakan sengaja dinolkan (keputusan D3: "angka stok
 * tidak pernah diperbarui - nolkan saja"), dan seluruh riwayat pergerakan stok
 * hanya berisi DUA catatan, keduanya 31 Mei 2026.
 *
 * Akibatnya beranda memunculkan "Stok habis: Kaktus" setiap hari tanpa henti,
 * dan layar kepala feeder menandai KESEMBILAN item pakan sebagai kritis. Tidak
 * satu pun bisa dihilangkan dengan bekerja - satu-satunya cara adalah mencatat
 * stok, yang memang sedang tidak dilakukan.
 *
 * Peringatan yang selalu menyala sama saja dengan tidak ada peringatan, dan
 * lebih buruk: ia melatih orang mengabaikan panel yang suatu hari benar.
 *
 * Maka dibedakan dua keadaan yang selama ini tertukar:
 *
 *   - HABIS        : angkanya dipantau, dan sekarang nol. Ini kabar.
 *   - TAK TERPANTAU: angkanya tidak pernah diperbarui. Ini bukan kabar tentang
 *                    stok, melainkan kabar tentang pencatatan - dan disebutkan
 *                    sekali sebagai satu kalimat, bukan sebagai sederet alarm.
 */
export const HARI_STOK_DIANGGAP_DIAM = 30;

/** Tanggal pergerakan terakhir untuk sebuah item, atau null bila tidak pernah ada. */
export function pergerakanTerakhir(item, pergerakan = []) {
  let terbaru = null;
  for (const m of pergerakan || []) {
    const cocok =
      (m.item_id && (m.item_id === item?.id)) ||
      (m.item_name && item?.name && String(m.item_name).trim() === String(item.name).trim());
    if (!cocok) continue;
    const t = String(m.date || "");
    if (t && (!terbaru || t > terbaru)) terbaru = t;
  }
  return terbaru;
}

/**
 * Item yang angkanya tidak bisa dipercaya: tidak ada pergerakan tercatat sama
 * sekali, atau pergerakan terakhirnya sudah lebih lama dari `hariDiam`.
 */
export function stokTakTerpantau(item, pergerakan = [], hariDiam = HARI_STOK_DIANGGAP_DIAM, sekarang = new Date()) {
  const terakhir = pergerakanTerakhir(item, pergerakan);
  if (!terakhir) return true;
  const selisih = Math.floor((sekarang - new Date(terakhir)) / 86400000);
  return selisih > hariDiam;
}

/**
 * Versi periksaStok yang tahu mana angka yang layak dipercaya.
 *
 * Item tak terpantau DIKELUARKAN dari daftar habis/menipis dan dikumpulkan
 * terpisah, supaya layar bisa mengatakan hal yang benar: bukan "stok habis",
 * melainkan "stok belum dicatat sejak sekian lama".
 */
export function periksaStokTerpantau(barangGudang = [], pakan = [], pergerakan = [], sekarang = new Date()) {
  const semua = semuaStok(barangGudang, pakan);
  const terpantau = [];
  const takTerpantau = [];
  for (const i of semua) {
    (stokTakTerpantau(i, pergerakan, HARI_STOK_DIANGGAP_DIAM, sekarang) ? takTerpantau : terpantau).push(i);
  }
  return {
    habis: terpantau.filter(stokHabis),
    menipis: terpantau.filter(stokMenipis),
    kadaluarsa: terpantau.filter((i) => akanKadaluarsa(i, HARI_PERINGATAN_KADALUARSA, sekarang)),
    takTerpantau,
    pergerakanTerakhirKeseluruhan: (pergerakan || [])
      .map((m) => String(m.date || ""))
      .filter(Boolean)
      .sort()
      .pop() || null,
  };
}
