import { bacaBarang, bacaHarga } from "@/lib/hargaSupplier";

/**
 * pasarSupplier.js — sayur apa yang ada, dari siapa, dan berapa per kilogram.
 *
 * ── Pertanyaan yang dijawabnya ──────────────────────────────────────────────
 *
 * Pemiliknya (17 Okt 2026) meminta "laporan supplier mana yang terbaik atau
 * ranking dan harga yang paling ideal dan sayur apa yang ada".
 *
 * Tiga dari empat dijawab dari apa yang penjual TULIS — sayur apa, dari
 * siapa, berapa harganya. Yang keempat, "supplier mana yang terbaik", tidak
 * bisa dijawab dari tulisan sama sekali, dan itu dua hal yang berbeda.
 *
 * ── Dua sumber yang tidak boleh dicampur ────────────────────────────────────
 *
 * HARGA berasal dari postingan: apa yang penjual sebut sendiri sebelum
 * mengirim apa pun. `kumpulkanPenawaran` dan `penjualTermurah` di bawah
 * bekerja dengan itu, dan tidak lebih.
 *
 * KEANDALAN hanya bisa berasal dari riwayat: siapa yang benar-benar datang,
 * dan seberapa sering. Sampai 17 Okt 2026 riwayat itu tidak ada tempatnya —
 * `FeedStock.supplier`, `WarehouseItem.supplier` dan `StockMovement.supplier`
 * semuanya TEKS BEBAS, tanpa `supplier_id`, dan nol baris terisi. Tanggal 18
 * `supplier_id` ditambahkan ke StockMovement dan form barang masuk mulai
 * menanyakannya; `keandalanSupplier` di bawah memakainya.
 *
 * Mencampur keduanya adalah kesalahan yang paling mudah dibuat di sini:
 * penjual termurah di daftar harga belum tentu yang pernah datang sekali pun.
 *
 * Yang TIDAK dipakai sebagai peringkat, kemarin maupun hari ini, adalah
 * `rating` 1–5 yang diketik sendiri saat supplier dibuat — bawaannya 5, jadi
 * setiap supplier "bintang lima" sebelum mengirim apa pun. Mengurutkan dengan
 * itu menghasilkan peringkat yang terlihat tegas dan tidak berdasar apa pun.
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

/** Jeda hari antara dua tanggal ISO. */
function jedaHari(a, b) {
  const t1 = Date.parse(`${a}T00:00:00Z`);
  const t2 = Date.parse(`${b}T00:00:00Z`);
  if (!Number.isFinite(t1) || !Number.isFinite(t2)) return null;
  return Math.round((t2 - t1) / 86400000);
}

/** Irama yang dijanjikan, dalam hari. `null` bila tidak menjanjikan irama. */
const HARI_IRAMA = { harian: 1, "2_hari": 2, mingguan: 7, "2_minggu": 14, bulanan: 30 };

/**
 * Keandalan supplier DARI PENGIRIMAN YANG BENAR-BENAR TERCATAT.
 *
 * ── Kenapa ini baru mungkin sekarang ────────────────────────────────────────
 *
 * Sampai 18 Okt 2026 kolom supplier di StockMovement hanya teks bebas, dan
 * nol baris terisi — jadi tidak ada satu pun barang masuk yang menunjuk balik
 * ke entitas Supplier. `supplier_id` menutup jarak itu; fungsi ini yang
 * memakainya.
 *
 * ── Apa yang disebut "andal" di sini, dan apa yang TIDAK ────────────────────
 *
 * Yang diukur hanya yang benar-benar terekam: berapa kali ia mengirim, kapan
 * terakhir, dan berapa rata-rata jeda antar pengiriman. Bila ia menjanjikan
 * irama tertentu (irama_kirim), jeda nyata itu dibandingkan dengan janjinya.
 *
 * Yang TIDAK diukur: mutu barang, ketepatan jam, dan kesesuaian harga dengan
 * yang disebut di postingan. Tidak ada satu pun dari ketiganya yang tercatat
 * di mana pun, dan mengarang angka untuknya akan membuat peringkat yang
 * terlihat lengkap padahal menilai satu hal saja.
 *
 * Supplier yang BELUM pernah mengirim tetap dikembalikan, dengan
 * `pengiriman: 0`. Menyembunyikannya membuat daftar terbaca seperti semua
 * supplier pernah mengirim — dan yang paling perlu dilihat pemiliknya justru
 * yang sudah didaftarkan tetapi tidak pernah datang.
 */
export function keandalanSupplier({ movements = [], suppliers = [], hariIni = new Date() } = {}) {
  const per = new Map(suppliers.map((s) => [s.id, { supplier: s, tanggal: [], nilai: 0 }]));

  for (const m of movements) {
    if (m?.type !== "masuk") continue;
    if (!m.supplier_id || !per.has(m.supplier_id)) continue;
    if (m.excluded_from_reports || m.is_test_data) continue;
    const e = per.get(m.supplier_id);
    if (m.date) e.tanggal.push(String(m.date));
    e.nilai += Number(m.total_value || m.total_purchase_price || 0);
  }

  const hariIniStr = hariIni.toISOString().slice(0, 10);

  return [...per.values()]
    .map(({ supplier: s, tanggal, nilai }) => {
      const urut = [...new Set(tanggal)].sort();
      const jeda = [];
      for (let i = 1; i < urut.length; i++) {
        const d = jedaHari(urut[i - 1], urut[i]);
        if (d != null) jeda.push(d);
      }
      const rataJeda = jeda.length ? Math.round(jeda.reduce((t, n) => t + n, 0) / jeda.length) : null;
      const dijanjikan = s.rutin_kirim ? HARI_IRAMA[s.irama_kirim] ?? null : null;

      return {
        id: s.id,
        nama: s.name,
        hp: s.hp_whatsapp || "",
        rutin: !!s.rutin_kirim,
        irama: s.irama_kirim || "",
        pengiriman: urut.length,
        terakhir: urut[urut.length - 1] || "",
        hariSejakTerakhir: urut.length ? jedaHari(urut[urut.length - 1], hariIniStr) : null,
        rataJeda,
        dijanjikan,
        /*
          Hanya dinilai bila ADA janji DAN ada cukup pengiriman untuk punya
          jeda. Satu pengiriman tidak membuktikan irama apa pun, dan menyebut
          supplier "tidak tepat janji" karena baru sekali datang adalah
          tuduhan yang tidak dimiliki datanya.
        */
        tepatJanji: dijanjikan != null && rataJeda != null ? rataJeda <= dijanjikan * 1.5 : null,
        nilai,
      };
    })
    .sort((a, b) => b.pengiriman - a.pengiriman || String(b.terakhir).localeCompare(String(a.terakhir)) || a.nama.localeCompare(b.nama));
}
