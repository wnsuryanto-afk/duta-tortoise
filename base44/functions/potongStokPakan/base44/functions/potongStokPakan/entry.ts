import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { getOtomatis, wibTanggal, tanggalMundur, sopIdDariTaskId } from "../../shared/otomatis.ts";
import { masukLaporan } from "../../shared/laporan.ts";
import { BATAS_AMBIL } from "../../shared/batas.ts";

/**
 * A6 — Stok berkurang sendiri saat task pakan/suplemen dicentang.
 *
 * Pencatatan pakan manual (FeedingLog) tidak pernah diisi sekali pun dalam tiga
 * bulan, dan itu wajar: keeper sudah mencentang task "beri pakan", lalu diminta
 * mencatat hal yang sama sekali lagi di layar lain. Di sini pencatatan kedua
 * itu dihapus — centangnya sendiri yang memotong stok.
 *
 * Syaratnya satu kali kerja: isi `pakan_terpakai` pada SOPTask (bahan + jumlah
 * sekali kerja). Selama itu kosong, fungsi ini tidak melakukan apa-apa.
 *
 * Anti-dobel: setiap checklist ditandai `stok_dipotong` setelah diproses, jadi
 * memanggil fungsi ini berulang kali tidak menggandakan pengurangan.
 * Hanya checklist berstatus "approved" yang diproses — pekerjaan yang belum
 * disetujui belum tentu benar-benar terjadi.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const otomatis = await getOtomatis(base44);

    if (otomatis.potong_stok_pakan_enabled !== true) {
      return Response.json({ skipped: "disabled" });
    }

    const tanggalDiproses = [wibTanggal(), tanggalMundur(1), tanggalMundur(2)];

    const [sopTasks, feedStocks, warehouseItems] = await Promise.all([
      base44.asServiceRole.entities.SOPTask.list(null, BATAS_AMBIL),
      base44.asServiceRole.entities.FeedStock.list("name", 200),
      base44.asServiceRole.entities.WarehouseItem.list("name", 500),
    ]);
    // Bahan nonaktif dilewati. Bahan yang tidak dicatat masuk-keluarnya - mis.
    // rumput dan kaktus dari kebun sendiri - angka stoknya tidak pernah benar,
    // jadi bertindak atasnya berarti bertindak atas angka karangan.
    const feedStocksAktif = (feedStocks || []).filter((f: any) => f?.is_active !== false);

    const sopById = new Map((sopTasks || []).map((t: any) => [t.id, t]));
    const pakanBySku = new Map(
      (feedStocksAktif || []).filter((f: any) => f.sku).map((f: any) => [String(f.sku), f]),
    );
    const gudangBySku = new Map(
      (warehouseItems || []).filter((i: any) => i.sku).map((i: any) => [String(i.sku), i]),
    );

    // Kumpulkan pemakaian dulu, baru tulis sekali per bahan — supaya satu hari
    // kerja tidak menghasilkan puluhan update ke record stok yang sama.
    const pakai = new Map<string, { sumber: string; item: any; jumlah: number; oleh: string; tanggal: string }>();
    const checklistDiproses: any[] = [];
    const kurang: string[] = [];

    for (const tanggal of tanggalDiproses) {
      const checklists = await base44.asServiceRole.entities.DailyChecklist.filter({
        date: tanggal,
        status: "approved",
      }, null, BATAS_AMBIL);

      for (const cl of checklists || []) {
        if (cl.stok_dipotong === true) continue;
        if (!masukLaporan(cl)) continue;

        let adaYangDipotong = false;

        for (const t of cl.completed_tasks || []) {
          if (t.status === "skipped_no_stock") continue;
          const sopId = sopIdDariTaskId(t.task_id);
          if (!sopId) continue;
          const sop: any = sopById.get(sopId);
          if (!sop || !Array.isArray(sop.pakan_terpakai) || sop.pakan_terpakai.length === 0) continue;

          for (const bahan of sop.pakan_terpakai) {
            const jumlah = Number(bahan.jumlah || 0);
            if (!bahan.sku || jumlah <= 0) continue;
            const sumber = bahan.sumber === "gudang" ? "gudang" : "pakan";
            const item = sumber === "gudang" ? gudangBySku.get(String(bahan.sku)) : pakanBySku.get(String(bahan.sku));
            if (!item) {
              kurang.push(`SKU ${bahan.sku} (${bahan.nama || "-"}) tidak ditemukan di ${sumber}`);
              continue;
            }
            const kunci = `${sumber}:${item.id}`;
            const ada = pakai.get(kunci);
            if (ada) {
              ada.jumlah += jumlah;
            } else {
              pakai.set(kunci, {
                sumber,
                item,
                jumlah,
                oleh: cl.employee_email || "sistem",
                tanggal: cl.date,
              });
            }
            adaYangDipotong = true;
          }
        }

        if (adaYangDipotong) checklistDiproses.push(cl);
        else {
          // Tidak ada bahan terpasang untuk checklist ini — tandai juga supaya
          // tidak diperiksa ulang tiap kali fungsi berjalan.
          checklistDiproses.push(cl);
        }
      }
    }

    const hasil: string[] = [];

    for (const p of pakai.values()) {
      const stokLama = Number(p.item.current_stock || 0);
      const stokBaru = Math.max(0, stokLama - p.jumlah);
      const kurangDari = p.jumlah > stokLama ? p.jumlah - stokLama : 0;

      if (p.sumber === "gudang") {
        await base44.asServiceRole.entities.WarehouseItem.update(p.item.id, { current_stock: stokBaru });
      } else {
        await base44.asServiceRole.entities.FeedStock.update(p.item.id, { current_stock: stokBaru });
      }

      await base44.asServiceRole.entities.StockMovement.create({
        item_id: p.item.id,
        item_type: p.sumber === "gudang" ? "warehouse" : "feedstock",
        item_name: p.item.name,
        item_sku: p.item.sku || "",
        type: "keluar",
        quantity: p.jumlah,
        unit: p.item.unit || "",
        unit_price: Number(p.item.price_per_unit || 0),
        total_value: Number(p.item.price_per_unit || 0) * p.jumlah,
        stock_after: stokBaru,
        keperluan: "pemberian_pakan",
        by_email: p.oleh,
        by_name: "Otomatis dari checklist",
        date: p.tanggal,
        status: "selesai",
        notes:
          "Dipotong otomatis dari task yang dicentang" +
          (kurangDari > 0 ? ` — stok tercatat kurang ${kurangDari}, disetel ke 0` : ""),
      });

      hasil.push(`${p.item.name}: ${stokLama} → ${stokBaru} (-${p.jumlah})`);
      if (kurangDari > 0) {
        kurang.push(`${p.item.name} kurang ${kurangDari} dari yang seharusnya terpakai`);
      }
    }

    for (const cl of checklistDiproses) {
      await base44.asServiceRole.entities.DailyChecklist.update(cl.id, {
        stok_dipotong: true,
        stok_dipotong_at: new Date().toISOString(),
      });
    }

    return Response.json({
      success: true,
      checklist_diproses: checklistDiproses.length,
      bahan_dipotong: hasil.length,
      detail: hasil,
      catatan: kurang,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
