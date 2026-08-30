import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

/**
 * Gabungkan barang gudang & pakan yang terdaftar dua kali.
 *
 * SATU-SATUNYA tempat aturan penggabungan barang berada. Layar "Satukan barang
 * kembar" di Pemeliharaan Sistem memanggil fungsi ini dan hanya menampilkan
 * laporannya; ia tidak menghitung apa pun sendiri.
 *
 * Sempat ada salinan aturan yang sama di sisi peramban. Keduanya berbeda dalam
 * hal-hal kecil yang justru berbahaya — daftar entitas penunjuk, cara
 * menormalkan nama, cara menjumlahkan stok saat sebuah barang punya tiga entri
 * — dan dua alat untuk satu pekerjaan adalah pola yang sama dengan yang
 * menyebabkan sebagian besar cacat di aplikasi ini. Salinannya dihapus.
 *
 * Fungsi lama `bersihkanDuplikatStok` juga tidak dipakai, karena dua hal yang
 * sama-sama merusak data:
 *
 *   1. Ia hanya memindahkan ItemUsage. Padahal SEMBILAN tempat menunjuk ke id
 *      barang: StockMovement, BatchBarang, ItemUsage, WarehouseTransaction,
 *      ItemBorrow, MaintenanceLog, dan Purchase lewat `item_id`; ToolLoan dan
 *      ShoppingList lewat `warehouse_item_id`. Menghapus barang kembar tanpa
 *      memindahkan semuanya membuat riwayat menunjuk ke barang yang sudah
 *      tidak ada — dan riwayat itulah yang dipakai memperkirakan kapan stok
 *      habis.
 *   2. Ia mengelompokkan dengan trim().toLowerCase(), yang tidak menyamakan
 *      spasi ganda DI TENGAH nama — justru bentuk duplikat yang paling sering
 *      terjadi.
 *
 * Tiga golongan dipisah tegas:
 *
 *   PASTI    — nama sama setelah dinormalkan DAN satuan sama → riwayat
 *              dipindahkan, stok dijumlahkan, yang kembar dihapus.
 *   BERTANDA — sudah ditandai manusia "[DUPLIKAT ...]" tetapi tidak ada barang
 *              lain bernama sama. Tidak ada induk untuk menampung riwayatnya,
 *              jadi hanya dihapus bila stoknya nol DAN tidak dirujuk satu baris
 *              pun. Yang masih berisi atau masih dirujuk dibiarkan.
 *   RAGU     — nama sama tetapi satuan beda (mis. "karung" vs "kg") → tidak
 *              disentuh, hanya dilaporkan. Menjumlahkan 3 karung dengan 50 kg
 *              menghasilkan angka yang tidak berarti apa-apa.
 *
 * AMAN SECARA BAWAAN: tanpa `konfirmasi`, fungsi ini hanya MELAPORKAN. Ia baru
 * mengubah data bila dipanggil dengan `{ konfirmasi: true }` (atau
 * `?konfirmasi=true`), dan hanya oleh owner/admin/manajer.
 */

/**
 * Penanda duplikat yang ditulis manusia di depan nama barang.
 *
 * Dipakai dua gaya: "[DUPLIKAT - ABAIKAN] Kasa Basah" dari layar Gudang, dan
 * "[DUPLIKAT-HAPUS] ..." dari fungsi pembersih lama. Polanya longgar soal gaya
 * penulisan, tetapi HANYA mengenali kurung siku yang memuat kata "duplikat" —
 * bukan kurung siku apa pun. Membuang semua kurung siku akan menyamakan
 * "[Besar] Kasa" dengan "Kasa", dua barang yang memang berbeda.
 */
const TANDA_DUPLIKAT = /^\s*\[[^\]]*duplikat[^\]]*\]\s*/i;

function bertandaDuplikat(nama: string): boolean {
  return TANDA_DUPLIKAT.test(String(nama || ""));
}

/** Nama yang dinormalkan: huruf kecil, tanpa tanda baca ringan, spasi dirapatkan. */
function namaNormal(nama: string): string {
  return String(nama || "")
    .replace(TANDA_DUPLIKAT, "")
    .trim()
    .toLowerCase()
    .replace(/[.,()]/g, "")
    .replace(/\s+/g, " ");
}

const RUJUKAN_ITEM_ID = [
  "StockMovement",
  "BatchBarang",
  "ItemUsage",
  "WarehouseTransaction",
  "ItemBorrow",
  "MaintenanceLog",
  "Purchase",
];
const RUJUKAN_WAREHOUSE_ITEM_ID = ["ToolLoan", "ShoppingList"];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || !["owner", "admin", "manajer"].includes(user.role)) {
      return Response.json({ error: "Hanya owner, admin, atau manajer." }, { status: 403 });
    }

    // Dipanggil dua cara: lewat base44.functions.invoke (badan JSON) dari layar
    // Pemeliharaan Sistem, atau langsung dengan ?konfirmasi=true.
    const url = new URL(req.url);
    let body: any = {};
    try { body = await req.json(); } catch { /* tanpa badan — mode laporan */ }
    const konfirmasi = body?.konfirmasi === true || url.searchParams.get("konfirmasi") === "true";

    const [gudang, pakan] = await Promise.all([
      base44.asServiceRole.entities.WarehouseItem.list("-created_date", 1000),
      base44.asServiceRole.entities.FeedStock.list("-created_date", 500),
    ]);

    const rencanaGabung: any[] = [];
    const perluKeputusan: any[] = [];
    const bertandaTanpaInduk: any[] = [];

    const kelompokkan = (items: any[], jenis: string) => {
      const grup: Record<string, any[]> = {};
      for (const it of items || []) {
        const kunci = namaNormal(it.name);
        if (!kunci) continue;
        (grup[kunci] ||= []).push(it);
      }
      for (const [kunci, anggota] of Object.entries(grup)) {
        // Barang yang sudah ditandai duplikat oleh manusia tetapi tidak punya
        // barang lain bernama sama. Penandanya adalah keputusan yang sudah
        // diambil, tetapi tidak ada induk untuk menampung riwayatnya — jadi ia
        // hanya boleh dihapus kalau memang tidak membawa apa-apa. Diperiksa
        // saat dijalankan, karena perlu membaca sembilan entitas.
        if (anggota.length === 1 && bertandaDuplikat(anggota[0].name)) {
          bertandaTanpaInduk.push({
            jenis,
            id: anggota[0].id,
            name: anggota[0].name,
            unit: anggota[0].unit,
            stok: Number(anggota[0].current_stock || 0),
          });
          continue;
        }
        if (anggota.length < 2) continue;
        // Yang paling lama jadi induk — riwayatnya paling panjang.
        anggota.sort(
          (a, b) => new Date(a.created_date || 0).getTime() - new Date(b.created_date || 0).getTime(),
        );
        const induk = anggota[0];
        for (const kembar of anggota.slice(1)) {
          const satuanSama = (induk.unit || "") === (kembar.unit || "");
          const catatan = {
            jenis,
            kunci,
            induk: { id: induk.id, name: induk.name, unit: induk.unit, stok: induk.current_stock },
            kembar: { id: kembar.id, name: kembar.name, unit: kembar.unit, stok: kembar.current_stock },
          };
          if (satuanSama) rencanaGabung.push(catatan);
          else perluKeputusan.push(catatan);
        }
      }
    };

    kelompokkan(gudang, "warehouse");
    kelompokkan(pakan, "feedstock");

    if (!konfirmasi) {
      return Response.json({
        mode: "laporan",
        keterangan:
          "Belum ada yang diubah. Panggil ulang dengan ?konfirmasi=true untuk menggabungkan yang satuannya sama.",
        akan_digabung: rencanaGabung.length,
        perlu_keputusan_manusia: perluKeputusan.length,
        bertanda_tanpa_induk: bertandaTanpaInduk.length,
        akan_dihapus_bertanda: bertandaTanpaInduk.filter((b: any) => b.stok === 0).length,
        rencana_gabung: rencanaGabung,
        perlu_keputusan: perluKeputusan,
        bertanda: bertandaTanpaInduk,
      });
    }

    // ── Jalankan penggabungan ──
    const log: string[] = [];
    let rujukanDipindah = 0;
    /** Stok induk yang sudah berjalan, per id — lihat catatan di langkah 2. */
    const stokBerjalan = new Map<string, number>();

    for (const r of rencanaGabung) {
      const Entity =
        r.jenis === "warehouse"
          ? base44.asServiceRole.entities.WarehouseItem
          : base44.asServiceRole.entities.FeedStock;

      // 1. Pindahkan SEMUA rujukan lebih dulu — sebelum apa pun dihapus.
      for (const nama of RUJUKAN_ITEM_ID) {
        try {
          const rows = await base44.asServiceRole.entities[nama].filter({ item_id: r.kembar.id });
          for (const row of rows || []) {
            await base44.asServiceRole.entities[nama].update(row.id, {
              item_id: r.induk.id,
              ...(row.item_name !== undefined ? { item_name: r.induk.name } : {}),
            });
            rujukanDipindah++;
          }
        } catch (e) {
          log.push(`Gagal memindah ${nama} untuk ${r.kembar.name}: ${(e as Error).message}`);
        }
      }
      for (const nama of RUJUKAN_WAREHOUSE_ITEM_ID) {
        try {
          const rows = await base44.asServiceRole.entities[nama].filter({ warehouse_item_id: r.kembar.id });
          for (const row of rows || []) {
            await base44.asServiceRole.entities[nama].update(row.id, { warehouse_item_id: r.induk.id });
            rujukanDipindah++;
          }
        } catch (e) {
          log.push(`Gagal memindah ${nama} untuk ${r.kembar.name}: ${(e as Error).message}`);
        }
      }

      // 2. Jumlahkan stok, ambil data yang kosong di induk dari kembarnya.
      //
      // Stok induk diambil dari `stokBerjalan`, bukan dari nilai yang direkam
      // saat menyusun rencana. Untuk barang dengan TIGA entri atau lebih, tiap
      // kembar punya barisnya sendiri di rencanaGabung, dan semuanya menulis
      // current_stock secara mutlak. Memakai nilai rekaman membuat tiap tulisan
      // menimpa yang sebelumnya: induk 2 + kembar 5 + kembar 1 menghasilkan 3,
      // bukan 8.
      const stokIndukSekarang = stokBerjalan.has(r.induk.id)
        ? Number(stokBerjalan.get(r.induk.id))
        : Number(r.induk.stok || 0);
      const stokBaru = stokIndukSekarang + Number(r.kembar.stok || 0);
      stokBerjalan.set(r.induk.id, stokBaru);
      const indukPenuh = (r.jenis === "warehouse" ? gudang : pakan).find((x: any) => x.id === r.induk.id);
      const kembarPenuh = (r.jenis === "warehouse" ? gudang : pakan).find((x: any) => x.id === r.kembar.id);
      const patch: Record<string, unknown> = { current_stock: stokBaru };
      if (indukPenuh && kembarPenuh) {
        if (!indukPenuh.photo_url && kembarPenuh.photo_url) patch.photo_url = kembarPenuh.photo_url;
        if (!indukPenuh.supplier && kembarPenuh.supplier) patch.supplier = kembarPenuh.supplier;
        if (!indukPenuh.price_per_unit && kembarPenuh.price_per_unit) patch.price_per_unit = kembarPenuh.price_per_unit;
        if (!indukPenuh.sku && kembarPenuh.sku) patch.sku = kembarPenuh.sku;
        if (!indukPenuh.minimum_stock && kembarPenuh.minimum_stock) patch.minimum_stock = kembarPenuh.minimum_stock;
      }
      await Entity.update(r.induk.id, patch);

      // 3. Baru hapus yang kembar.
      await Entity.delete(r.kembar.id);
      log.push(
        `${r.jenis}: "${r.kembar.name}" digabung ke "${r.induk.name}" — stok ${r.induk.stok} + ${r.kembar.stok} = ${stokBaru} ${r.induk.unit || ""}`,
      );
    }

    // ── Barang bertanda duplikat yang tidak punya induk ──
    //
    // Tidak ada tempat memindahkan riwayatnya, jadi ia hanya dihapus bila
    // memang tidak membawa apa-apa: stok nol DAN tidak ada satu pun baris di
    // kesembilan entitas penunjuk. Yang masih berisi atau masih dirujuk
    // dibiarkan, dan alasannya disebutkan.
    let bertandaDihapus = 0;
    const bertandaDibiarkan: string[] = [];

    for (const b of bertandaTanpaInduk) {
      if (b.stok > 0) {
        bertandaDibiarkan.push(`${b.name} — masih berisi ${b.stok} ${b.unit || ""}`);
        continue;
      }
      let rujukan = 0;
      for (const nama of RUJUKAN_ITEM_ID) {
        const rows = await base44.asServiceRole.entities[nama].filter({ item_id: b.id });
        rujukan += (rows || []).length;
      }
      for (const nama of RUJUKAN_WAREHOUSE_ITEM_ID) {
        const rows = await base44.asServiceRole.entities[nama].filter({ warehouse_item_id: b.id });
        rujukan += (rows || []).length;
      }
      if (rujukan > 0) {
        bertandaDibiarkan.push(`${b.name} — masih dirujuk ${rujukan} baris riwayat`);
        continue;
      }
      const Entity =
        b.jenis === "warehouse"
          ? base44.asServiceRole.entities.WarehouseItem
          : base44.asServiceRole.entities.FeedStock;
      await Entity.delete(b.id);
      bertandaDihapus++;
      log.push(`${b.jenis}: "${b.name}" dihapus — bertanda duplikat, stok nol, tanpa riwayat.`);
    }

    return Response.json({
      mode: "gabung",
      dijalankan_oleh: user.email,
      digabung: rencanaGabung.length,
      rujukan_dipindah: rujukanDipindah,
      bertanda_dihapus: bertandaDihapus,
      bertanda_dibiarkan: bertandaDibiarkan,
      perlu_keputusan_manusia: perluKeputusan.length,
      perlu_keputusan: perluKeputusan,
      log,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
