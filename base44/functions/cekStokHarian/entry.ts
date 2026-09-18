import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { getOtomatis, setOtomatis, wibTanggal, sudahWaktunya, notifSekali, emailPerRole, potongRapi } from "../../shared/otomatis.ts";
import { BATAS_AMBIL } from "../../shared/batas.ts";
import {
  stokPerluDiperhatikan, golonganStok, dilacak,
  akanKadaluarsa, sudahKadaluarsa, HARI_PERINGATAN_KADALUARSA,
  sisaHariBatch, kedaluwarsaEfektifBatch,
} from "../../shared/stok.ts";

/**
 * Pemeriksaan stok harian.
 *
 * Menggantikan otomatisasi "Alert Stok Obat Menipis", yang dipicu SAAT
 * WarehouseItem diubah. Pemicu berbasis kejadian punya titik buta yang persis
 * berlawanan dengan yang dibutuhkan: barang yang turun di bawah minimum lalu
 * tidak pernah disentuh lagi berhenti berbunyi selamanya. Justru barang yang
 * diam itulah yang paling lama kosong.
 *
 * Buktinya di data 15-09-2026: otomatisasi lama terakhir jalan 31 Agustus,
 * sementara racikan Duta Repro, bahan Vitamin E, dan bahan Vitamin D sudah
 * berstok nol tanpa satu pun peringatan. Tanpa Vitamin E dan D, racikannya
 * bahkan tidak bisa dibuat ulang.
 *
 * Pemeriksaan ini berjalan tiap hari atas SELURUH daftar — gudang dan pakan —
 * jadi barang yang diam tetap terhitung. Anti-dobelnya per tanggal WIB, dan
 * ada pagar jam supaya tidak mendarat tengah malam.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const otomatis = await getOtomatis(base44);

    if (otomatis.cek_stok_enabled !== true) {
      return Response.json({ skipped: "disabled" });
    }

    const hariIni = wibTanggal();
    if ((otomatis.cek_stok_terakhir || "").slice(0, 10) === hariIni) {
      return Response.json({ skipped: "sudah_jalan_hari_ini" });
    }
    if (!sudahWaktunya(otomatis.cek_stok_jam, "07:00")) {
      return Response.json({ skipped: "belum_jamnya" });
    }

    const [gudang, pakan, batch] = await Promise.all([
      base44.asServiceRole.entities.WarehouseItem.list("name", BATAS_AMBIL),
      base44.asServiceRole.entities.FeedStock.list("name", BATAS_AMBIL),
      // Tanggal kedaluwarsa sebenarnya hidup di batch, bukan di barangnya.
      base44.asServiceRole.entities.BatchBarang.list("tanggal_expired", BATAS_AMBIL),
    ]);

    const perlu = stokPerluDiperhatikan(gudang || [], pakan || []);

    /*
     * Tiga golongan, bukan satu daftar panjang.
     *
     * Jalan pertama menghasilkan 23 baris "HABIS" sekaligus, dan di dalamnya
     * bercampur dua hal yang sangat berbeda: sembilan barang yang minimumnya
     * sudah ditentukan lalu kosong (bisa langsung dibeli), dan empat belas
     * barang bertanda wajib-ada yang minimumnya masih 0 — sebagian memang
     * tidak mungkin distok, seperti "Antibiotik via Dokter Hewan (Resep)".
     *
     * Menyebut keduanya dengan kata yang sama membuat daftar terlalu panjang
     * untuk dikerjakan, dan daftar yang terlalu panjang tidak dikerjakan sama
     * sekali. Itu persis cacat yang hari ini ditemukan pada laporan higiene
     * gudang: 23 temuan tiap pekan yang semuanya sudah beres.
     */
    const { habis, menipis, wajibTanpaMinimum } = golonganStok(perlu);

    /*
     * Kedaluwarsa ditambahkan 15-09-2026.
     *
     * Aturannya sudah ada (akanKadaluarsa/sudahKadaluarsa), lencananya sudah
     * ada di halaman stok, bahkan ada pemindai foto tanggal kedaluwarsa. Yang
     * tidak ada: satu pun otomatisasi yang memeriksanya. Kedaluwarsa hanya
     * terlihat oleh orang yang kebetulan membuka halaman yang tepat.
     *
     * Catatan jujur: per 15-09-2026 TIDAK SATU PUN barang atau batch punya
     * expired_date terisi — 23 batch, termasuk Meloxicam, Oxytocin, Vitamin B
     * kompleks, dan Dextrose 5%, semuanya kosong. Jadi bagian ini belum akan
     * berbunyi. Ia dipasang sekarang supaya berbunyi pada hari pertama ada
     * yang mengisi tanggalnya, bukan menunggu diingat lagi nanti.
     */
    const batchAktif = (batch || []).filter(
      (b: any) => b && b.status !== "habis" && (Number(b.jumlah_sisa) || 0) > 0,
    );
    const petaBarang = new Map<string, any>();
    for (const g of gudang || []) if (g?.id) petaBarang.set(g.id, g);

    // Batch memakai aturannya sendiri (tanggal cetak vs tanggal buka); barang
    // gudang memakai kolom expired_date-nya. Dua kolom, dua nama, satu maksud.
    const batchLewat: any[] = [];
    const batchSegera: any[] = [];
    for (const b of batchAktif) {
      const sisa = sisaHariBatch(b, petaBarang.get(b.item_id));
      if (sisa === null) continue;
      if (sisa < 0) batchLewat.push({ b, sisa });
      else if (sisa <= HARI_PERINGATAN_KADALUARSA) batchSegera.push({ b, sisa });
    }

    const barangDilacak = (gudang || []).filter(dilacak);
    const lewatTanggal = [
      ...barangDilacak.filter((i: any) => sudahKadaluarsa(i)).map((i: any) => ({ nama: i.name, teks: String(i.expired_date).slice(0, 10) })),
      ...batchLewat.map(({ b, sisa }) => ({
        nama: b.nama_barang,
        teks: `${String(kedaluwarsaEfektifBatch(b, petaBarang.get(b.item_id)).tanggal?.toISOString() || "").slice(0, 10)} (lewat ${Math.abs(sisa)} hari)`,
      })),
    ];
    const segeraKadaluarsa = [
      ...barangDilacak.filter((i: any) => akanKadaluarsa(i)).map((i: any) => ({ nama: i.name, teks: String(i.expired_date).slice(0, 10) })),
      ...batchSegera.map(({ b, sisa }) => ({ nama: b.nama_barang, teks: `tinggal ${sisa} hari` })),
    ];

    const barisKadaluarsa = (i: any) => `${i.nama}: ${i.teks}`;

    const baris = (i: any) =>
      `${i.name}${i._sumber === "pakan" ? " (pakan)" : ""}: ${Number(i.current_stock) || 0} dari minimum ${Number(i.minimum_stock) || 0} ${i.unit || ""}`.trim();

    let dikirim = 0;
    if (perlu.length > 0 || lewatTanggal.length > 0 || segeraKadaluarsa.length > 0) {
      const bagian: string[] = [];
      // Kedaluwarsa disebut lebih dulu: obat lewat tanggal yang terlanjur
      // dipakai lebih berbahaya daripada obat yang habis dan tidak dipakai.
      if (lewatTanggal.length > 0) {
        bagian.push(
          `SUDAH LEWAT TANGGAL — jangan dipakai (${lewatTanggal.length}):\n` +
          lewatTanggal.slice(0, 10).map(barisKadaluarsa).join("\n"),
        );
      }
      if (segeraKadaluarsa.length > 0) {
        bagian.push(
          `KEDALUWARSA ≤ ${HARI_PERINGATAN_KADALUARSA} HARI (${segeraKadaluarsa.length}):\n` +
          segeraKadaluarsa.slice(0, 10).map(barisKadaluarsa).join("\n"),
        );
      }
      if (habis.length > 0) bagian.push(`HABIS — perlu dibeli (${habis.length}):\n` + habis.slice(0, 12).map(baris).join("\n"));
      if (menipis.length > 0) bagian.push(`MENIPIS (${menipis.length}):\n` + menipis.slice(0, 12).map(baris).join("\n"));
      if (wajibTanpaMinimum.length > 0) {
        bagian.push(
          `Selain itu ${wajibTanpaMinimum.length} barang bertanda wajib-ada berstok nol tapi batas minimumnya belum diisi ` +
          `(sebagian memang tidak distok, mis. obat resep dokter). Isi minimumnya bila memang perlu selalu ada.`,
        );
      }

      for (const email of await emailPerRole(base44, ["owner", "manajer", "admin"])) {
        const dibuat = await notifSekali(base44, {
          recipient_email: email,
          title: lewatTanggal.length > 0
            ? `${lewatTanggal.length} barang lewat tanggal, ${habis.length} habis`
            : `${habis.length} barang habis, ${menipis.length} menipis`,
          // Judul sengaja hanya menghitung yang bisa langsung dikerjakan.
          // Barang wajib-ada tanpa minimum disebut di badan pesan, bukan di
          // angka yang dilihat orang sekilas.
          message: potongRapi(bagian.join("\n\n"), 900),
          type: habis.length > 0 || lewatTanggal.length > 0 ? "alert" : "warning",
          priority: habis.length > 0 || lewatTanggal.length > 0 ? "tinggi" : "sedang",
          category: "stok",
          action_label: "Buka Stok & Gudang",
          action_url: "/stok-unified",
          related_entity_id: `cek_stok_${hariIni}`,
          related_entity_type: "WarehouseItem",
        });
        if (dibuat) dikirim++;
      }
    }

    await setOtomatis(base44, otomatis, { cek_stok_terakhir: hariIni });

    return Response.json({
      success: true,
      diperiksa: (gudang?.length || 0) + (pakan?.length || 0),
      habis: habis.length,
      menipis: menipis.length,
      wajib_tanpa_minimum: wajibTanpaMinimum.length,
      lewat_tanggal: lewatTanggal.length,
      segera_kadaluarsa: segeraKadaluarsa.length,
      batch_punya_tanggal: (batch || []).filter((b: any) => b?.tanggal_expired).length,
      batch_total: (batch || []).length,
      notifikasi_dibuat: dikirim,
      detail_habis: habis.slice(0, 20).map(baris),
      detail_menipis: menipis.slice(0, 20).map(baris),
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
