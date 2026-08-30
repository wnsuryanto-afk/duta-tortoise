import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

/**
 * B3 — Gabungkan barang gudang & pakan yang terdaftar dua kali.
 *
 * Sudah ada fungsi lama `bersihkanDuplikatStok`, dan fungsi itu SENGAJA tidak
 * dipakai — alasannya tertulis di src/lib/barangKembar.js dan keduanya merusak
 * data:
 *
 *   1. Ia hanya memindahkan ItemUsage. Padahal DELAPAN tempat menunjuk ke id
 *      barang: StockMovement, BatchBarang, ItemUsage, WarehouseTransaction,
 *      ItemBorrow, MaintenanceLog, Purchase (item_id), serta ToolLoan dan
 *      ShoppingList (warehouse_item_id). Menghapus barang kembar tanpa
 *      memindahkan semuanya membuat riwayat menunjuk ke barang yang sudah
 *      tidak ada — dan riwayat itulah yang dipakai memperkirakan kapan stok
 *      habis.
 *   2. Ia mengelompokkan dengan trim().toLowerCase(), yang tidak menyamakan
 *      spasi ganda DI TENGAH nama — justru bentuk duplikat yang paling sering
 *      terjadi.
 *
 * Fungsi ini memperbaiki keduanya, dan memisahkan tegas yang PASTI dari yang
 * RAGU:
 *
 *   PASTI — nama sama setelah dinormalkan DAN satuan sama → stok dijumlahkan.
 *   RAGU  — nama sama tetapi satuan beda (mis. "karung" vs "kg") → tidak
 *           disentuh, hanya dilaporkan. Menjumlahkan 3 karung dengan 50 kg
 *           menghasilkan angka yang tidak berarti apa-apa.
 *
 * AMAN SECARA BAWAAN: tanpa parameter, fungsi ini hanya MELAPORKAN apa yang
 * akan digabung. Penggabungan baru berjalan bila dipanggil dengan
 * `?konfirmasi=true`, dan hanya boleh dijalankan owner/admin/manajer.
 */

/** Nama yang dinormalkan: huruf kecil, tanpa tanda baca ringan, spasi dirapatkan. */
function namaNormal(nama: string): string {
  return String(nama || "")
    .replace(/^\s*\[[^\]]*\]\s*/, "") // buang penanda seperti "[DUPLIKAT - ABAIKAN]"
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

    const url = new URL(req.url);
    const konfirmasi = url.searchParams.get("konfirmasi") === "true";

    const [gudang, pakan] = await Promise.all([
      base44.asServiceRole.entities.WarehouseItem.list("-created_date", 1000),
      base44.asServiceRole.entities.FeedStock.list("-created_date", 500),
    ]);

    const rencanaGabung: any[] = [];
    const perluKeputusan: any[] = [];

    const kelompokkan = (items: any[], jenis: string) => {
      const grup: Record<string, any[]> = {};
      for (const it of items || []) {
        const kunci = namaNormal(it.name);
        if (!kunci) continue;
        (grup[kunci] ||= []).push(it);
      }
      for (const [kunci, anggota] of Object.entries(grup)) {
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
        rencana_gabung: rencanaGabung,
        perlu_keputusan: perluKeputusan,
      });
    }

    // ── Jalankan penggabungan ──
    const log: string[] = [];
    let rujukanDipindah = 0;

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
      const stokBaru = Number(r.induk.stok || 0) + Number(r.kembar.stok || 0);
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

    return Response.json({
      mode: "gabung",
      dijalankan_oleh: user.email,
      digabung: rencanaGabung.length,
      rujukan_dipindah: rujukanDipindah,
      perlu_keputusan_manusia: perluKeputusan.length,
      perlu_keputusan: perluKeputusan,
      log,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
