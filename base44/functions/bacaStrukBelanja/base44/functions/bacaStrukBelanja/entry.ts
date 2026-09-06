import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { dilacak } from "../../shared/stok.ts";

/**
 * bacaStrukBelanja — baca screenshot pesanan marketplace, lalu cocokkan tiap
 * barangnya ke barang gudang yang sudah ada.
 *
 * ── Kenapa pencocokannya diserahkan ke AI, bukan ke skor kata ──
 *
 * Nama di marketplace tidak pernah sama dengan nama di gudang. Dari 16 baris
 * pesanan nyata 25 Agustus 2026, 13 punya padanan di gudang dan NOL yang cocok
 * lewat nama persis.
 *
 * Percobaan pertama memakai pencocokan kata kunci + ukuran, dan hasilnya
 * bukan sekadar meleset — ia meleset dengan percaya diri:
 *
 *   "Saline Wound Irrigation OneMed 100 ml"  → "Alkohol 70% (Onemed)"  skor 0,75
 *   "WONDER OXYTOCIN 10ML"                   → "Syringe 10ml"
 *   "INJEKVIT B PLEX 100ML"                  → "Gelas Ukur 50-100ml"
 *
 * Penyebabnya jelas: kata "onemed" dan "100 ml" ada di dua-duanya, sementara
 * kata yang benar-benar membedakan — saline, oxytocin, kompleks — tidak punya
 * arti apa pun bagi pencocok kata. Mencocokkan nama obat butuh tahu bahwa
 * Saline Wound Irrigation ADALAH NaCl 0,9%. Itu pengetahuan, bukan kemiripan
 * huruf.
 *
 * Menambah stok ke barang yang salah tidak terlihat sampai seseorang mencari
 * barangnya di rak dan tidak menemukannya. Jadi:
 *
 *   - AI mengusulkan, TIDAK memutuskan. Tiap baris membawa keyakinan dan
 *     alasan, dan layar wajib meminta orang memastikan sebelum stok bertambah.
 *   - Bila tidak yakin, AI diminta mengembalikan null, bukan menebak. Tebakan
 *     yang dilabeli "cocok" lebih buruk daripada mengaku tidak tahu.
 *
 * ── Angka di struk itu ambigu, dan itu disengaja dilaporkan apa adanya ──
 *
 * Marketplace menampilkan angka yang bisa berarti harga satuan ATAU subtotal
 * baris. Pada pesanan Zoetics: 3 x Rp 2.500 + 5 x Rp 1.500 = Rp 15.000,
 * sementara total pesanan tertulis Rp 13.000. Selisihnya bisa voucher, bisa
 * juga karena angkanya memang subtotal. Fungsi ini mengembalikan apa yang
 * terbaca beserta hasil hitungannya, dan menandai baris yang tidak cocok —
 * tanpa memilih tafsiran sendiri, karena salah tafsir di sini berarti angka
 * rupiah yang salah masuk ke catatan keuangan.
 *
 * Read-only. Tidak menulis apa pun.
 */

const SKEMA = {
  type: "object",
  properties: {
    pesanan: {
      type: "array",
      description: "Satu entri per pesanan/toko. Satu gambar biasanya satu pesanan.",
      items: {
        type: "object",
        properties: {
          toko: { type: "string" },
          marketplace: { type: "string", description: "Shopee, Tokopedia, Lazada, atau kosong" },
          tanggal: { type: "string", description: "YYYY-MM-DD bila terbaca, selain itu null" },
          nomor_resi: { type: "string" },
          ongkir: { type: "number" },
          diskon: { type: "number" },
          total_pesanan: { type: "number", description: "Angka 'Total Pesanan' persis seperti tertulis" },
          barang: {
            type: "array",
            items: {
              type: "object",
              properties: {
                nama_struk: { type: "string", description: "Nama barang persis seperti di struk" },
                varian: { type: "string", description: "Varian/ukuran bila ada, mis. '10cc', '500 ml'" },
                jumlah: { type: "number" },
                harga_tertera: { type: "number", description: "Angka rupiah di baris itu, apa adanya" },
                arti_harga: {
                  type: "string",
                  enum: ["satuan", "subtotal", "tidak_yakin"],
                  description: "Apakah harga_tertera itu per unit atau subtotal baris. Isi tidak_yakin bila ragu.",
                },
                sku_gudang: {
                  type: "string",
                  description: "SKU barang gudang yang cocok. WAJIB null bila tidak yakin — jangan menebak.",
                },
                nama_gudang: { type: "string", description: "Nama barang gudang yang dicocokkan" },
                keyakinan: { type: "string", enum: ["tinggi", "sedang", "rendah", "tidak_ada"] },
                alasan: { type: "string", description: "Satu kalimat singkat kenapa dicocokkan begitu" },
              },
            },
          },
        },
      },
    },
  },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const fileUrls: string[] = Array.isArray(body.file_urls) ? body.file_urls.slice(0, 8) : [];
    if (fileUrls.length === 0) {
      return Response.json({ error: "Tidak ada gambar yang dikirim." }, { status: 400 });
    }

    const svc = base44.asServiceRole;

    // Katalog gudang dikirim ke AI supaya pencocokan dilakukan olehnya, bukan
    // ditebak oleh pemanggil. Hanya barang yang dilacak — barang nonaktif tidak
    // boleh jadi tujuan penambahan stok.
    const [gudang, pakan] = await Promise.all([
      svc.entities.WarehouseItem.list("-name", 500),
      svc.entities.FeedStock.list("-name", 200),
    ]);
    const katalog = [
      ...(gudang || []).filter(dilacak).map((w: any) => ({
        sku: w.sku || "", nama: w.name, satuan: w.unit || "", jenis: "gudang",
      })),
      ...(pakan || []).filter(dilacak).map((f: any) => ({
        sku: f.sku || "", nama: f.name, satuan: f.unit || "", jenis: "pakan",
      })),
    ].filter((k) => k.sku);

    const daftarKatalog = katalog
      .map((k) => `${k.sku} | ${k.nama} | satuan: ${k.satuan || "-"}`)
      .join("\n");

    const prompt = [
      "Anda membaca screenshot rincian pesanan dari marketplace Indonesia (Shopee, Tokopedia, Lazada) atau nota apotek.",
      fileUrls.length > 1
        ? "Setiap gambar adalah pesanan yang BERBEDA dari toko yang berbeda. Kembalikan satu entri per gambar. JANGAN menggabungkannya."
        : "",
      "",
      "TUGAS 1 — baca isinya apa adanya:",
      "  toko, marketplace, tanggal, nomor resi, ongkir, diskon, total pesanan, dan tiap baris barang.",
      "  Untuk tiap baris: nama persis seperti tertulis, varian/ukuran, jumlah (angka setelah tanda x),",
      "  dan angka rupiah di baris itu.",
      "",
      "  PENTING soal angka: di Shopee angka di baris barang biasanya HARGA SATUAN, tapi tidak selalu.",
      "  Isi arti_harga dengan 'satuan' atau 'subtotal' hanya bila Anda benar-benar bisa memastikannya",
      "  dari perhitungan yang cocok dengan total pesanan. Bila ragu, isi 'tidak_yakin'.",
      "  JANGAN mengarang angka yang tidak terbaca — isi null.",
      "",
      "TUGAS 2 — cocokkan tiap barang ke katalog gudang di bawah:",
      "  Cocokkan berdasarkan ZAT atau FUNGSINYA, bukan kemiripan huruf. Contoh yang benar:",
      "    'Saline Wound Irrigation OneMed 100 ml'  →  NaCl 0.9% 100ml   (saline = NaCl 0,9%)",
      "    'WONDER OXYTOCIN 10ML'                   →  Oxytocin 10 IU/ml",
      "    'INJEKVIT B PLEX VITAMIN B KOMPLEKS'     →  Vitamin B Kompleks Injeksi",
      "    'Needle agani terumo 25G'                →  Jarum 25G",
      "",
      "  UKURAN MEMBEDAKAN BARANG. NaCl 100 ml dan NaCl 500 ml adalah dua barang berbeda;",
      "  jangan disamakan. Begitu juga suntikan 3cc dan 10cc.",
      "",
      "  Bila tidak ada yang benar-benar cocok, isi sku_gudang null dan keyakinan 'tidak_ada'.",
      "  Barang yang belum ada di gudang itu WAJAR dan akan dibuatkan baru oleh orangnya.",
      "  Menebak lebih buruk daripada mengaku tidak tahu: tebakan yang salah membuat stok",
      "  bertambah di barang yang keliru, dan itu baru ketahuan saat barangnya dicari di rak.",
      "",
      "KATALOG GUDANG (SKU | nama | satuan):",
      daftarKatalog || "(katalog kosong)",
    ].join("\n");

    const hasil = await svc.integrations.Core.InvokeLLM({
      prompt,
      file_urls: fileUrls,
      response_json_schema: SKEMA,
    });

    const perSku: Record<string, any> = {};
    for (const k of katalog) perSku[k.sku] = k;

    // Lengkapi tiap baris dengan hitungan angkanya, supaya layar tidak perlu
    // menghitung ulang dan tidak ada dua tempat yang bisa berbeda hasil.
    const pesanan = (hasil?.pesanan || []).map((p: any) => {
      const barang = (p.barang || []).map((b: any) => {
        const jumlah = Number(b.jumlah) || 0;
        const harga = Number(b.harga_tertera) || 0;
        const kaliJumlah = jumlah * harga;
        const cocokKatalog = b.sku_gudang ? perSku[b.sku_gudang] || null : null;
        return {
          ...b,
          jumlah,
          harga_tertera: harga,
          // Dua kemungkinan tafsiran, dua-duanya ditampilkan supaya orang
          // memilih, bukan ditebak di sini.
          jika_satuan: { harga_satuan: harga, subtotal: kaliJumlah },
          jika_subtotal: { harga_satuan: jumlah > 0 ? Math.round(harga / jumlah) : 0, subtotal: harga },
          // sku_gudang hanya dipercaya bila SKU-nya benar-benar ada di katalog.
          sku_gudang: cocokKatalog ? b.sku_gudang : null,
          nama_gudang: cocokKatalog ? cocokKatalog.nama : null,
          satuan_gudang: cocokKatalog ? cocokKatalog.satuan : null,
          keyakinan: cocokKatalog ? b.keyakinan || "sedang" : "tidak_ada",
        };
      });

      const totalJikaSatuan = barang.reduce((s: number, b: any) => s + b.jika_satuan.subtotal, 0);
      const totalJikaSubtotal = barang.reduce((s: number, b: any) => s + b.jika_subtotal.subtotal, 0);
      const totalTertulis = Number(p.total_pesanan) || 0;

      return {
        ...p,
        barang,
        hitung: {
          total_jika_satuan: totalJikaSatuan,
          total_jika_subtotal: totalJikaSubtotal,
          total_tertulis: totalTertulis,
          // Tafsiran mana yang paling mendekati total tertulis (setelah ongkir).
          // Ini PETUNJUK, bukan keputusan — voucher dan gratis ongkir membuat
          // totalnya bisa tidak cocok dengan tafsiran mana pun.
          tafsiran_terdekat:
            totalTertulis === 0
              ? null
              : Math.abs(totalJikaSatuan - totalTertulis) <= Math.abs(totalJikaSubtotal - totalTertulis)
                ? "satuan"
                : "subtotal",
          selisih_terkecil:
            totalTertulis === 0
              ? null
              : Math.min(
                  Math.abs(totalJikaSatuan - totalTertulis),
                  Math.abs(totalJikaSubtotal - totalTertulis),
                ),
        },
      };
    });

    return Response.json({
      pesanan,
      jumlah_gambar: fileUrls.length,
      katalog_diperiksa: katalog.length,
    });
  } catch (e) {
    return Response.json({ error: (e as Error)?.message || "Gagal membaca struk." }, { status: 500 });
  }
});
