import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { BATAS_AMBIL } from "../../shared/batas.ts";
import { masukLaporan } from "../../shared/laporan.ts";

/**
 * higieneKembar — penyapu baris kembar dan penanda uji yang tidak ikut ditandai.
 *
 * Lahir dari dua temuan 15-09-2026 yang sama-sama ditemukan dengan tangan,
 * pada tabel yang berbeda, dengan cara yang sama:
 *
 *   MeasurementHistory  32 baris kembar. 23 di antaranya ditulis dua kiper
 *                       berbeda untuk kura yang sama di hari yang sama, karena
 *                       task-nya `task_scope: bersama`.
 *   HealthRecord        satu catatan berbunyi "[DATA UJI] ... kura tidak
 *                       benar-benar sakit" tapi kolom is_test_data-nya kosong,
 *                       jadi tetap dihitung sebagai penyakit sungguhan.
 *   Sale                satu penjualan Rp 9.522.500 ditandai dikecualikan,
 *                       tapi lima layar keuangan tidak menyaringnya.
 *
 * Ketiganya ditemukan karena kebetulan ada yang melihat. Fungsi ini membuat
 * pencarian itu berjalan sendiri, tiap pekan, di SEMUA tabel besar sekaligus.
 *
 * Fungsi ini TIDAK MENGUBAH APA PUN. Ia hanya melapor. Menghapus atau
 * mengecualikan baris adalah keputusan yang harus dilihat orang lebih dulu —
 * pada 15-09-2026 ternyata baris "duplikat" di UserProfile memegang
 * satu-satunya salinan dua nomor rekening gaji.
 */

/** Tabel besar dan kunci alaminya: dua baris dengan kunci sama = kembar. */
const TABEL = [
  { nama: "Attendance", kunci: ["employee_email", "date"], label: ["employee_email", "date", "check_in"] },
  { nama: "MeasurementHistory", kunci: ["tortoise_id", "date"], label: ["tortoise_name", "date", "weight_grams"] },
  { nama: "DailyChecklist", kunci: ["employee_email", "date"], label: ["employee_email", "date", "status"] },
  { nama: "MaintenanceLog", kunci: ["check_key"], label: ["done_by", "period_key", "item_label"] },
  { nama: "Sale", kunci: ["sale_date", "buyer_name", "total_amount"], label: ["sale_date", "buyer_name", "total_amount"] },
  { nama: "FinanceTransaction", kunci: ["date", "type", "amount", "description"], label: ["date", "type", "amount"] },
  { nama: "SalarySlip", kunci: ["employee_email", "period_start"], label: ["employee_email", "period_start", "total_gaji"] },
  { nama: "PettyCashLedger", kunci: ["date", "amount", "description"], label: ["date", "amount", "description"] },
  { nama: "StockMovement", kunci: ["date", "item_id", "type", "quantity"], label: ["date", "item_name", "quantity"] },
];

/** Tabel yang punya penanda data uji, untuk memeriksa tulisan vs kolom. */
const PUNYA_PENANDA = [
  "Sale", "FinanceTransaction", "HealthRecord", "MeasurementHistory",
  "DailyChecklist", "MaintenanceLog", "Attendance", "PettyCashLedger",
];

/**
 * Kata yang menandai sebuah baris sebagai percobaan. Sengaja sempit: "test"
 * saja terlalu longgar (ada "kontestan", "protest"), dan "coba" muncul di
 * kalimat biasa seperti "coba beri pakan lain".
 */
const POLA_UJI = /\[?\s*DATA UJI\s*\]?|percobaan fitur|hanya (uji ?coba|percobaan)|dummy|bukan data (asli|sungguhan)/i;

const KOLOM_TEKS = ["description", "notes", "keterangan", "catatan", "title"];

function kunciDari(r: any, kolom: string[]): string | null {
  const bagian: string[] = [];
  for (const k of kolom) {
    const v = r?.[k];
    if (v === undefined || v === null || v === "") return null; // kunci tak lengkap: jangan ditebak
    bagian.push(String(v));
  }
  return bagian.join("|");
}

function ringkas(r: any, kolom: string[]): string {
  return kolom.map((k) => `${r?.[k] ?? "-"}`).join(" · ");
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const kembar: any[] = [];
    const ujiTakBertanda: any[] = [];
    const gagal: any[] = [];
    let diperiksa = 0;

    for (const t of TABEL) {
      let baris: any[] = [];
      try {
        baris = await base44.asServiceRole.entities[t.nama].list("-created_date", BATAS_AMBIL);
      } catch (e) {
        gagal.push({ tabel: t.nama, alasan: String((e as Error)?.message || e).slice(0, 150) });
        continue;
      }
      if (!Array.isArray(baris)) continue;
      diperiksa += baris.length;

      const peta = new Map<string, any[]>();
      for (const r of baris) {
        // Baris yang sudah dikecualikan bukan masalah lagi — justru itu obatnya.
        if (!masukLaporan(r)) continue;
        const k = kunciDari(r, t.kunci);
        if (!k) continue;
        if (!peta.has(k)) peta.set(k, []);
        peta.get(k)!.push(r);
      }
      for (const [, grup] of peta) {
        if (grup.length < 2) continue;
        kembar.push({
          tabel: t.nama,
          jumlah: grup.length,
          contoh: ringkas(grup[0], t.label),
          id: grup.map((r) => r.id),
        });
      }
    }

    for (const nama of PUNYA_PENANDA) {
      let baris: any[] = [];
      try {
        baris = await base44.asServiceRole.entities[nama].list("-created_date", BATAS_AMBIL);
      } catch {
        continue;
      }
      for (const r of baris || []) {
        if (r?.is_test_data === true) continue;
        const teks = KOLOM_TEKS.map((k) => String(r?.[k] || "")).join(" ");
        if (!teks.trim() || !POLA_UJI.test(teks)) continue;
        ujiTakBertanda.push({
          tabel: nama,
          id: r.id,
          kutipan: teks.replace(/\s+/g, " ").trim().slice(0, 160),
        });
      }
    }

    return Response.json({
      success: true,
      baris_diperiksa: diperiksa,
      kelompok_kembar: kembar.length,
      baris_berlebih: kembar.reduce((s, k) => s + (k.jumlah - 1), 0),
      uji_tak_bertanda: ujiTakBertanda.length,
      tabel_gagal: gagal,
      kembar: kembar.slice(0, 60),
      uji: ujiTakBertanda.slice(0, 40),
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
