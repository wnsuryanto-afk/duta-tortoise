import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { getOtomatis, setOtomatis, wibTanggal, notifSekali, emailPerRole } from "../../shared/otomatis.ts";

/**
 * A7 — Daftar belanja terisi sendiri sebelum stok habis.
 *
 * Peringatan belanja yang ada sekarang menghitung sisa hari dari `daily_ideal`,
 * dan seluruh item pakan nilainya masih 0 — jadi peringatannya secara
 * matematis tidak pernah bisa bunyi. Fungsi ini memakai dua jalur: sisa hari
 * bila kebutuhan harian sudah diisi, dan stok minimum bila belum. Dengan
 * begitu ia tetap berguna sejak hari pertama, dan menjadi jauh lebih tajam
 * setelah kebutuhan harian diisi.
 *
 * Yang dibuat adalah baris daftar belanja biasa — bukan pesanan. Keputusan
 * membeli tetap di tangan manusia.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const otomatis = await getOtomatis(base44);

    if (otomatis.belanja_otomatis_enabled !== true) {
      return Response.json({ skipped: "disabled" });
    }

    const hariIni = wibTanggal();
    if ((otomatis.belanja_terakhir || "").slice(0, 10) === hariIni) {
      return Response.json({ skipped: "sudah_jalan_hari_ini" });
    }

    const ambangHari = Number(otomatis.belanja_ambang_hari ?? 7);

    const [pakan, gudang, belanja] = await Promise.all([
      base44.asServiceRole.entities.FeedStock.list("name", 200),
      base44.asServiceRole.entities.WarehouseItem.list("name", 500),
      base44.asServiceRole.entities.ShoppingList.list("-created_date", 300),
    ]);

    // Apa yang sudah ada di daftar dan belum dibeli — jangan ditambah lagi.
    const sudahAda = new Set(
      (belanja || [])
        .filter((b: any) => b.status !== "sudah_dibeli")
        .map((b: any) => String(b.item_sku || b.nama_barang || "").toLowerCase()),
    );

    const dibuat: string[] = [];
    const mendesak: string[] = [];

    const tambah = async (params: {
      nama: string;
      jumlah: number;
      satuan: string;
      sku: string;
      hargaPerUnit: number;
      warehouseItemId?: string;
      alasan: string;
      segera: boolean;
    }) => {
      const kunciSku = String(params.sku || "").toLowerCase();
      const kunciNama = String(params.nama || "").toLowerCase();
      if ((kunciSku && sudahAda.has(kunciSku)) || sudahAda.has(kunciNama)) return;

      const jumlah = Math.max(1, Math.ceil(params.jumlah));
      await base44.asServiceRole.entities.ShoppingList.create({
        nama_barang: params.nama,
        jumlah,
        satuan: params.satuan || "pcs",
        priority: params.segera ? "segera" : "minggu_ini",
        status: "belum_dibeli",
        item_sku: params.sku || undefined,
        warehouse_item_id: params.warehouseItemId || undefined,
        harga_est_per_unit: params.hargaPerUnit || 0,
        total_est: (params.hargaPerUnit || 0) * jumlah,
        notes: `Dibuat otomatis ${hariIni} — ${params.alasan}`,
      });
      sudahAda.add(kunciSku || kunciNama);
      dibuat.push(`${params.nama} × ${jumlah} ${params.satuan} (${params.alasan})`);
      if (params.segera) mendesak.push(params.nama);
    };

    // 1. Stok pakan.
    for (const f of pakan || []) {
      // Pakan yang dipanen atau dicari sendiri tidak pernah masuk daftar
      // belanja. Rumput gajah 180 kg/hari, misalnya, akan muncul sebagai
      // pesanan 2,5 ton tiap dua minggu — padahal yang dibutuhkan bukan uang,
      // melainkan orang yang memotongnya.
      if (f.sumber_sendiri === true) continue;
      const stok = Number(f.current_stock || 0);
      const ideal = Number(f.daily_ideal || 0);
      const min = Number(f.minimum_stock || 0);

      if (ideal > 0) {
        const sisaHari = stok / ideal;
        if (sisaHari > ambangHari) continue;
        // Belanja untuk dua pekan ke depan, dikurangi yang masih ada.
        const perlu = ideal * 14 - stok;
        if (perlu <= 0) continue;
        await tambah({
          nama: f.name,
          jumlah: perlu,
          satuan: f.unit || "kg",
          sku: f.sku || "",
          hargaPerUnit: Number(f.price_per_unit || 0),
          alasan: `sisa ${sisaHari.toFixed(1)} hari`,
          segera: sisaHari <= 2,
        });
      } else if (min > 0 && stok <= min) {
        await tambah({
          nama: f.name,
          jumlah: Math.max(min * 2 - stok, min),
          satuan: f.unit || "kg",
          sku: f.sku || "",
          hargaPerUnit: Number(f.price_per_unit || 0),
          alasan: stok <= 0 ? "stok habis" : `stok ${stok} di bawah minimum ${min}`,
          segera: stok <= 0,
        });
      }
    }

    // 2. Barang gudang (obat, suplemen, alat) yang menyentuh minimum.
    for (const i of gudang || []) {
      const nama = String(i.name || "");
      if (nama.toUpperCase().includes("DUPLIKAT")) continue;
      const stok = Number(i.current_stock || 0);
      const min = Number(i.minimum_stock || 0);
      if (min <= 0 || stok > min) continue;
      await tambah({
        nama,
        jumlah: Math.max(min * 2 - stok, min),
        satuan: i.unit || "pcs",
        sku: i.sku || "",
        hargaPerUnit: Number(i.price_per_unit || i.unit_price || 0),
        warehouseItemId: i.id,
        alasan: stok <= 0 ? "stok habis" : `stok ${stok} di bawah minimum ${min}`,
        segera: stok <= 0,
      });
    }

    if (dibuat.length > 0) {
      const penerima = await emailPerRole(base44, ["owner", "admin"]);
      for (const email of penerima) {
        await notifSekali(base44, {
          recipient_email: email,
          title: `${dibuat.length} barang masuk daftar belanja otomatis`,
          message:
            (mendesak.length > 0 ? `SEGERA: ${mendesak.join(", ")}\n\n` : "") +
            dibuat.slice(0, 12).join("\n"),
          type: mendesak.length > 0 ? "warning" : "info",
          priority: mendesak.length > 0 ? "tinggi" : "sedang",
          category: "stok",
          action_label: "Buka Daftar Belanja",
          action_url: "/daftar-belanja",
          related_entity_id: `belanja_otomatis_${hariIni}`,
          related_entity_type: "ShoppingList",
        });
      }
    }

    await setOtomatis(base44, otomatis, { belanja_terakhir: hariIni });

    return Response.json({
      success: true,
      dibuat: dibuat.length,
      mendesak: mendesak.length,
      detail: dibuat,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
