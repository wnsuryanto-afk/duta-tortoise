import { bacaBarang, bacaHarga } from "@/lib/hargaSupplier";

/**
 * pasarSupplier.js — sayur apa yang ada, dari siapa, dan berapa per kilogram.
 *
 * ── Pertanyaan yang dijawabnya ──────────────────────────────────────────────
 *
 * Pemiliknya (17 Okt 2026) meminta "laporan supplier mana yang terbaik atau
 * ranking dan harga yang paling ideal dan sayur apa yang ada".
 *
 * Tiga dari empat bisa dijawab dari data yang ADA hari ini — sayur apa,
 * dari siapa, berapa harganya. Yang KEEMPAT tidak, dan itu harus dikatakan
 * alih-alih dikarang:
 *
 * ── Kenapa "supplier terbaik" belum bisa dihitung ───────────────────────────
 *
 * Peringkat yang berarti dibangun dari riwayat: siapa yang benar-benar
 * mengirim, tepat waktu, dengan harga yang dijanjikan. Hari ini tidak ada
 * satu pun catatan semacam itu — `FeedStock.supplier`, `WarehouseItem.supplier`
 * dan `StockMovement.supplier` semuanya TEKS BEBAS, tanpa `supplier_id`, dan
 * nol baris terisi. Jadi tidak ada barang masuk yang menunjuk balik ke
 * supplier mana pun.
 *
 * Satu-satunya angka "peringkat" yang ada adalah `rating` 1–5 yang diketik
 * sendiri saat supplier dibuat, dan bawaannya 5. Mengurutkan dengan itu
 * menghasilkan peringkat yang terlihat tegas dan tidak berdasar apa pun.
 *
 * Yang bisa diperingkat dengan jujur hari ini adalah HARGA — dan itu yang
 * dilakukan di sini. Peringkat keandalan menunggu sambungan ke barang masuk;
 * sampai itu ada, layarnya mengatakan apa yang belum bisa dijawabnya.
 */

/** Satu penawaran untuk satu barang, dari satu pihak. */
function penawaran({ nama, dari, hp, perKg, perKgMaks, jumlahHarga, asli, sebab, sumber, rutin, irama, supplierId, leadId }) {
  return {
    nama, dari, hp,
    perKg,
    /* Batas atas, bila satu kalimat menyebut beberapa harga. Sama dengan
       `perKg` bila hanya satu — jadi yang membaca cukup membandingkan
       keduanya untuk tahu apakah ini rentang. */
    perKgMaks: perKgMaks ?? perKg,
    jumlahHarga: jumlahHarga ?? (perKg == null ? 0 : 1),
    asli, sebab, sumber, rutin, irama, supplierId, leadId,
  };
}

/**
 * Kumpulkan penawaran dari lead DAN dari daftar barang supplier.
 *
 * Keduanya digabung karena keduanya menjawab pertanyaan yang sama. Lead
 * adalah tawaran yang belum ditindaklanjuti; SupplierItem adalah harga dari
 * pihak yang sudah jadi supplier. Memisahkan keduanya di layar akan menyuruh
 * orang membandingkan dua daftar sendiri.
 */
export function kumpulkanPenawaran({ leads = [], items = [], suppliers = [] } = {}) {
  const hasil = [];
  const supplierOleh = new Map(suppliers.map((s) => [s.id, s]));

  for (const l of leads) {
    /*
      Lead yang sudah ditolak tidak ikut. Yang berstatus "baru" ikut: justru
      itu gunanya daftar ini — menunjukkan tawaran yang belum dikejar.
    */
    if (l?.status === "tidak_cocok") continue;

    const barang = bacaBarang(l.yang_dijual);
    const harga = bacaHarga(l.harga_disebut);
    /*
      Harga TIDAK dipasangkan satu-satu dengan barang, meski jumlahnya
      kebetulan sama.

      Lead "Adinda" menyebut empat sayur dan empat harga, dan urutannya
      mungkin memang berpasangan — tetapi tidak ada yang menjaminnya, dan
      memasangkannya salah berarti mencantumkan harga terong pada tomat.
      Jadi tiap barang membawa SELURUH penawaran lead itu, dan yang membaca
      melihat kalimat aslinya.
    */
    const nama = l.nama || "(tanpa nama)";
    /*
      SATU baris per (barang, penjual) — bukan satu baris per harga.

      Versi pertama mengeluarkan tiap harga untuk tiap barang, jadi lead
      "Adinda" yang menyebut empat sayur dan empat harga menghasilkan enam
      belas baris yang nyaris sama: keempat harganya terulang di bawah
      keempat sayurnya. Penjaga lebar menangkapnya sebagai "kalimat yang
      sama 4×", dan ia benar — kalimat yang berlaku untuk semua baris adalah
      keterangan, bukan isi tiap baris.

      Yang dibawa sekarang RENTANGNYA (termurah sampai termahal) beserta
      kalimat aslinya. Harganya tetap tidak dipasangkan dengan barangnya,
      karena urutan di postingan tidak menjaminnya — yang hilang hanya
      pengulangannya.
    */
    const bisa = harga.filter((h) => h.bisaDibanding).map((h) => h.perKg);
    const takBisa = harga.find((h) => !h.bisaDibanding);
    for (const b of barang.length ? barang : ["(tidak disebut)"]) {
      hasil.push(penawaran({
        nama: b,
        dari: nama,
        hp: l.hp_whatsapp || "",
        perKg: bisa.length ? Math.min(...bisa) : null,
        perKgMaks: bisa.length ? Math.max(...bisa) : null,
        jumlahHarga: bisa.length,
        asli: l.harga_disebut || "",
        sebab: bisa.length ? "" : (takBisa?.sebab || "harga tidak disebut"),
        sumber: l.sumber || "",
        rutin: false,
        irama: "",
        leadId: l.id,
      }));
    }
  }

  for (const it of items) {
    if (it?.is_active === false) continue;
    const s = supplierOleh.get(it.supplier_id);
    const perKg = satuanKg(it.unit) ? Math.round(Number(it.price || 0) / satuanKg(it.unit)) : null;
    hasil.push(penawaran({
      nama: String(it.item_name || "").trim() || "(tanpa nama)",
      dari: it.supplier_name || s?.name || "(tanpa nama)",
      hp: s?.hp_whatsapp || "",
      perKg: Number.isFinite(perKg) && perKg > 0 ? perKg : null,
      asli: `${Number(it.price || 0).toLocaleString("id-ID")}/${it.unit || "?"}`,
      sebab: satuanKg(it.unit) ? "" : `satuan "${it.unit || "?"}" tidak bisa ditimbang`,
      sumber: "daftar barang supplier",
      rutin: !!s?.rutin_kirim,
      irama: s?.irama_kirim || "",
      supplierId: it.supplier_id || "",
    }));
  }

  return hasil;
}

/** Berat satu satuan dalam kg, atau null bila bukan satuan berat. */
function satuanKg(unit) {
  const u = String(unit || "").toLowerCase().trim();
  if (["kg", "kilo", "kilogram"].includes(u)) return 1;
  if (["ons", "hg"].includes(u)) return 0.1;
  if (["gram", "gr", "g"].includes(u)) return 0.001;
  return null;
}

/** Satu nama barang dianggap sama bila hurufnya sama setelah dirapikan. */
function kunciBarang(nama) {
  return String(nama || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Barang yang tersedia, masing-masing dengan penawarannya, termurah dulu.
 *
 * Penawaran yang harganya tidak bisa dibandingkan TIDAK dibuang — ia ditaruh
 * di belakang, dengan sebabnya. "Nego" bukan berarti mahal; ia berarti belum
 * ditanya, dan menyembunyikannya membuat orang mengira pilihannya lebih
 * sedikit daripada yang sebenarnya.
 */
export function barangTersedia(penawaranSemua = []) {
  const per = new Map();
  for (const p of penawaranSemua) {
    const k = kunciBarang(p.nama);
    if (!k) continue;
    if (!per.has(k)) per.set(k, { nama: p.nama, penawaran: [] });
    per.get(k).penawaran.push(p);
  }

  return [...per.values()]
    .map((b) => {
      const bisa = b.penawaran.filter((p) => p.perKg != null).sort((a, c) => a.perKg - c.perKg);
      const tidak = b.penawaran.filter((p) => p.perKg == null);
      return {
        nama: b.nama,
        penawaran: [...bisa, ...tidak],
        termurah: bisa[0] || null,
        jumlahPenjual: new Set(b.penawaran.map((p) => p.dari)).size,
        adaRutin: b.penawaran.some((p) => p.rutin),
      };
    })
    .sort((a, b) => b.jumlahPenjual - a.jumlahPenjual || a.nama.localeCompare(b.nama));
}

/**
 * Penjual diurutkan menurut HARGA, bukan menurut keandalan.
 *
 * Namanya sengaja bukan "peringkat supplier": yang diukur hanya satu hal, dan
 * menyebutnya peringkat akan membuat orang mengira keandalan ikut terhitung.
 * Lihat catatan di kepala berkas ini.
 */
export function penjualTermurah(penawaranSemua = []) {
  const per = new Map();
  for (const p of penawaranSemua) {
    if (p.perKg == null) continue;
    if (!per.has(p.dari)) per.set(p.dari, { dari: p.dari, hp: p.hp, rutin: p.rutin, irama: p.irama, harga: [], barang: new Set() });
    const e = per.get(p.dari);
    e.harga.push(p.perKg);
    e.barang.add(kunciBarang(p.nama));
    if (p.hp && !e.hp) e.hp = p.hp;
    if (p.rutin) { e.rutin = true; e.irama = p.irama || e.irama; }
  }

  return [...per.values()]
    .map((e) => ({
      dari: e.dari,
      hp: e.hp,
      rutin: e.rutin,
      irama: e.irama,
      jumlahBarang: e.barang.size,
      termurah: Math.min(...e.harga),
      rataRata: Math.round(e.harga.reduce((t, n) => t + n, 0) / e.harga.length),
    }))
    .sort((a, b) => a.termurah - b.termurah || a.dari.localeCompare(b.dari));
}

/**
 * Barang yang penjualnya SAMA PERSIS digabung jadi satu baris.
 *
 * ── Kenapa ──────────────────────────────────────────────────────────────────
 *
 * Lead "Adinda" adalah SATU tawaran yang mencakup empat sayur. Menampilkannya
 * sebagai empat baris — masing-masing berbunyi "dari Adinda · mulai Rp
 * 2.000/kg" — bukan sekadar berulang, melainkan distorsi: ia terbaca seperti
 * empat tawaran terpisah yang kebetulan seharga sama.
 *
 * Penjaga lebar menangkapnya sebagai "kalimat yang sama 4×" dan ia benar,
 * tetapi perbaikannya bukan memendekkan kalimatnya. Satu tawaran = satu
 * baris, dengan keempat sayurnya disebut di dalamnya.
 *
 * Digabung hanya bila himpunan penjualnya IDENTIK. Dua sayur yang kebetulan
 * sama-sama dijual Adinda tetapi salah satunya juga dijual orang lain adalah
 * dua keadaan pasar yang berbeda, dan menggabungkannya menyembunyikan
 * pilihan.
 */
export function barangSerumpun(barangList = []) {
  const per = new Map();
  for (const b of barangList) {
    const tanda = [...new Set(b.penawaran.map((p) => p.dari))].sort().join("|");
    if (!per.has(tanda)) per.set(tanda, { nama: [], penawaran: b.penawaran, termurah: b.termurah, jumlahPenjual: b.jumlahPenjual, adaRutin: b.adaRutin });
    const e = per.get(tanda);
    e.nama.push(b.nama);
    /* Yang termurah di antara anggotanya — tiap anggota bisa membawa batas
       bawah yang berbeda bila penjualnya menyebut harga per barang. */
    if (b.termurah && (!e.termurah || b.termurah.perKg < e.termurah.perKg)) e.termurah = b.termurah;
  }
  return [...per.values()].sort((a, b) => b.jumlahPenjual - a.jumlahPenjual || b.nama.length - a.nama.length);
}
