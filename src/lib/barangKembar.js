/**
 * barangKembar.js — menemukan barang gudang & pakan yang terdaftar dua kali.
 *
 * Sampai perbaikan pada modul Stok, penerimaan barang mencocokkan barang lewat
 * NAMA. Nama yang beda satu spasi atau satu huruf besar dianggap barang lain,
 * lalu dibuatkan barang gudang baru berstok 0 sementara stok yang lama tidak
 * pernah bertambah. Perbaikan itu memakai id dan menghentikan yang baru;
 * barang yang terlanjur kembar masih ada, memecah stok dan riwayatnya.
 *
 * Ada fungsi backend bersihkanDuplikatStok yang dulu ditulis untuk ini, tetapi
 * ia tidak dipakai di sini karena dua alasan yang keduanya merusak data:
 *
 *   1. Ia memindahkan ItemUsage saja. Padahal ENAM entitas menunjuk ke id
 *      barang — StockMovement, BatchBarang, ItemUsage, WarehouseTransaction,
 *      ItemBorrow, dan ToolLoan. Menghapus barang kembar tanpa memindahkan
 *      kelimanya membuat riwayat pergerakan stok menunjuk ke barang yang sudah
 *      tidak ada. Riwayat itu justru yang dipakai menghitung perkiraan stok
 *      habis, jadi kehilangannya berarti kehilangan prediksinya juga.
 *   2. Ia mengelompokkan dengan `trim().toLowerCase()`, yang tidak menyamakan
 *      spasi di TENGAH nama — padahal justru itu bentuk duplikat yang dibuat
 *      pencocokan nama tadi.
 *
 * Seperti penyapu transaksi kembar, yang PASTI dan yang RAGU dipisah tegas:
 *
 *   PASTI — nama sama setelah dinormalkan DAN satuannya sama. Stoknya bisa
 *           dijumlahkan tanpa mengubah artinya.
 *   RAGU  — nama sama tetapi SATUANNYA BEDA (mis. "karung" vs "kg").
 *           Menjumlahkan 3 karung dengan 50 kg menghasilkan angka yang tidak
 *           berarti apa-apa. Ini keputusan manusia, bukan tebakan mesin.
 */

/**
 * Nama yang dinormalkan untuk perbandingan.
 *
 * Selain huruf besar/kecil dan spasi di ujung, spasi berulang di tengah
 * dirapatkan dan tanda baca ringan dibuang. "Pelet Ayam 5kg", "pelet ayam 5kg",
 * dan "Pelet  Ayam  5kg" karena itu dikenali sebagai satu barang yang sama.
 *
 * Yang TIDAK disamakan: "5kg" dengan "5 kg". Keduanya beda tulisan ukuran, dan
 * menyamakannya berisiko menggabung dua kemasan yang memang berbeda.
 */
export function namaNormal(nama) {
  return String(nama || "")
    .trim()
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ");
}

/** Satuan yang dinormalkan — hanya beda huruf besar/kecil yang disamakan. */
function satuanNormal(satuan) {
  return String(satuan || "").trim().toLowerCase();
}

/**
 * Penanda duplikat yang ditulis manusia di depan nama barang.
 *
 * Dipakai dua gaya di aplikasi ini: "[DUPLIKAT - ABAIKAN] Kasa Basah" yang
 * diketik lewat layar Gudang, dan "[DUPLIKAT-HAPUS] ..." yang dulu dipakai
 * fungsi pembersih di server. Polanya sengaja longgar — kurung siku apa pun
 * yang memuat kata "duplikat" — supaya gaya penulisan yang sedikit berbeda
 * tidak lolos begitu saja.
 */
const TANDA_DUPLIKAT = /^\s*\[[^\]]*duplikat[^\]]*\]\s*/i;

/** Apakah nama barang ini sudah ditandai duplikat oleh manusia? */
export function bertandaDuplikat(nama) {
  return TANDA_DUPLIKAT.test(String(nama || ""));
}

/** Nama aslinya, tanpa penanda di depan. */
export function namaTanpaTanda(nama) {
  return String(nama || "").replace(TANDA_DUPLIKAT, "").trim();
}

/**
 * Barang mana yang jadi induk saat digabung?
 *
 * Yang PALING LAMA menang, kebalikan dari penyapu transaksi kembar. Alasannya
 * berbeda: di sini enam entitas menunjuk ke id barang lewat riwayat yang
 * panjang, dan yang paling lama hampir selalu yang paling banyak dirujuk.
 * Memilihnya sebagai induk berarti paling sedikit baris yang perlu dipindahkan,
 * jadi paling sedikit pula yang bisa gagal di tengah jalan.
 */
function lebihLama(a, b) {
  const ta = a.created_date || "";
  const tb = b.created_date || "";
  if (ta !== tb) return ta < tb ? a : b;
  return String(a.id) < String(b.id) ? a : b;
}

const angka = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0);

/**
 * Periksa seluruh barang, tanpa mengubah apa pun.
 *
 * @param {Array} barangGudang WarehouseItem
 * @param {Array} pakan        FeedStock
 * @returns {{
 *   diperiksa: number,
 *   kembar: Array<{ kunci, sumber, induk, hapus: Array, stokGabungan: number, satuan: string }>,
 *   ragu: Array<{ kunci, sumber, daftar: Array }>,
 *   totalHapus: number
 * }}
 */
export function periksaBarangKembar(barangGudang = [], pakan = []) {
  const hasil = { diperiksa: 0, kembar: [], ragu: [], bertanda: [], totalHapus: 0 };

  [
    ["gudang", barangGudang],
    ["pakan", pakan],
  ].forEach(([sumber, daftar]) => {
    const perNama = new Map();
    const ditandai = [];

    daftar.forEach((item) => {
      if (!item?.id) return;
      hasil.diperiksa += 1;
      // Yang sudah ditandai manusia tidak ikut dikelompokkan lewat namanya —
      // penandanya membuat namanya tidak akan pernah cocok dengan barang mana
      // pun. Ia diurus terpisah di bawah.
      if (bertandaDuplikat(item.name)) { ditandai.push(item); return; }
      const kunci = namaNormal(item.name);
      if (!kunci) return;
      if (!perNama.has(kunci)) perNama.set(kunci, []);
      perNama.get(kunci).push(item);
    });

    perNama.forEach((grup, kunci) => {
      if (grup.length < 2) return;

      // Pecah lagi per satuan: yang satuannya sama boleh digabung.
      const perSatuan = new Map();
      grup.forEach((item) => {
        const s = satuanNormal(item.unit);
        if (!perSatuan.has(s)) perSatuan.set(s, []);
        perSatuan.get(s).push(item);
      });

      if (perSatuan.size > 1) {
        // Nama sama, satuan beda — tidak boleh ditebak.
        hasil.ragu.push({ kunci, sumber, daftar: grup });
        return;
      }

      const induk = grup.reduce(lebihLama);
      const hapus = grup.filter((i) => i.id !== induk.id);
      hasil.kembar.push({
        kunci,
        sumber,
        induk,
        hapus,
        stokGabungan: grup.reduce((s, i) => s + angka(i.current_stock), 0),
        satuan: induk.unit || "",
      });
      hasil.totalHapus += hapus.length;
    });

    // ── Barang yang sudah ditandai duplikat oleh manusia ──
    //
    // Penandanya adalah keputusan yang sudah diambil, jadi tidak perlu ditebak
    // lagi. Yang masih perlu diputuskan hanyalah ke mana riwayatnya pergi:
    //
    //   - Bila ada barang lain bernama sama persis (setelah penandanya
    //     dilepas) dan satuannya sama, ia jadi induk dan barang bertanda ini
    //     diperlakukan seperti duplikat biasa — riwayatnya pindah, stoknya
    //     dijumlahkan.
    //   - Bila tidak ada, tidak ada tempat menampung riwayatnya. Barangnya
    //     hanya boleh dihapus kalau memang tidak membawa apa-apa: stok nol dan
    //     tidak ada satu pun baris riwayat yang menunjuknya. Itu diperiksa saat
    //     tombolnya ditekan, bukan di sini, karena perlu membaca enam entitas.
    ditandai.forEach((item) => {
      const bersih = namaNormal(namaTanpaTanda(item.name));
      const sesatuan = (m) => satuanNormal(m.unit) === satuanNormal(item.unit);

      // Nama bersihnya masuk daftar ragu (satuannya campur) — jangan ditebak.
      const raguSama = hasil.ragu.some((r) => r.sumber === sumber && r.kunci === bersih);
      const induk = bersih && !raguSama ? (perNama.get(bersih) || []).find(sesatuan) : undefined;

      if (!induk) {
        hasil.bertanda.push({ item, sumber, adaStok: angka(item.current_stock) > 0 });
        return;
      }

      // Bila induknya sudah punya grup, IKUT ke grup itu — jangan membuat grup
      // kedua di induk yang sama. Dua grup pada satu induk sama-sama menulis
      // `current_stock` secara mutlak, jadi tulisan terakhir menimpa yang
      // sebelumnya dan stok dari grup pertama hilang.
      const grupAda = hasil.kembar.find(
        (k) => k.sumber === sumber && k.induk.id === induk.id
      );
      if (grupAda) {
        grupAda.hapus.push(item);
        grupAda.stokGabungan += angka(item.current_stock);
        grupAda.dariTanda = true;
      } else {
        hasil.kembar.push({
          kunci: bersih,
          sumber,
          induk,
          hapus: [item],
          stokGabungan: angka(induk.current_stock) + angka(item.current_stock),
          satuan: induk.unit || "",
          dariTanda: true,
        });
      }
      hasil.totalHapus += 1;
    });
  });

  return hasil;
}

/**
 * Entitas yang menunjuk ke sebuah barang, beserta nama kolom penunjuknya.
 *
 * Semua harus ikut dipindahkan sebelum barang kembarnya dihapus. Melewatkan
 * satu saja berarti meninggalkan riwayat yang menunjuk ke barang yang sudah
 * tidak ada — dan riwayat pergerakan stok itulah yang dipakai menghitung
 * perkiraan kapan sebuah barang habis.
 */
export const PENUNJUK_BARANG = [
  { entitas: "StockMovement", kolom: "item_id", kolomNama: "item_name" },
  { entitas: "BatchBarang", kolom: "item_id", kolomNama: null },
  { entitas: "ItemUsage", kolom: "item_id", kolomNama: "item_name" },
  { entitas: "WarehouseTransaction", kolom: "item_id", kolomNama: "item_name" },
  { entitas: "ItemBorrow", kolom: "item_id", kolomNama: "item_name" },
  { entitas: "MaintenanceLog", kolom: "item_id", kolomNama: null },
  { entitas: "Purchase", kolom: "item_id", kolomNama: null },
  { entitas: "ToolLoan", kolom: "warehouse_item_id", kolomNama: null },
  { entitas: "ShoppingList", kolom: "warehouse_item_id", kolomNama: null },
];

/**
 * Catatan: daftar ini semula hanya berisi enam entitas. Tiga yang terakhir —
 * MaintenanceLog, Purchase, dan ShoppingList — terlewat, padahal ketiganya
 * menyimpan penunjuk ke id barang. Artinya versi sebelumnya bisa menghapus
 * sebuah barang sambil meninggalkan baris di ketiganya menunjuk barang yang
 * sudah tidak ada — persis kegagalan yang alat ini dibuat untuk menghindarinya.
 *
 * Yang paling perlu diingat: `ShoppingList.warehouse_item_id` justru
 * ditambahkan di perbaikan modul Stok pada berkas ini juga. Menambah sebuah
 * penunjuk baru berarti daftar ini ikut bertambah; kalau tidak, alat ini
 * berbohong tentang apa yang aman dihapus.
 */
