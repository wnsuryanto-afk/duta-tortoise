import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { BATAS_AMBIL } from "../../shared/batas.ts";
import { masukLaporan } from "../../shared/laporan.ts";
import { wibTanggal, notifSekali, emailPerRole } from "../../shared/otomatis.ts";

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

/**
 * ALARM YANG TIDAK BISA BERBUNYI.
 *
 * Tiga kali dalam satu hari (15-09-2026) ditemukan hal yang sama: peringatan
 * yang dibangun lengkap — aturan, lencana, halaman, bahkan pemindai foto —
 * lalu diam selamanya karena satu kolom tidak pernah diisi siapa pun.
 *
 *   Notifikasi WhatsApp per-karyawan  employee_phones kosong  → 15 fungsi diam
 *   Alarm belanja pakan               daily_requirement kosong di 10/10
 *   Peringatan kedaluwarsa            expired_date kosong di 156/156
 *
 * Tidak satu pun melempar error. Tidak ada yang merah. Semuanya tampak beres,
 * dan itulah sebabnya bertahan berbulan-bulan.
 *
 * Pemeriksaan di bawah membalik pertanyaannya: bukan "apakah datanya benar?"
 * melainkan "apakah alarm ini PUNYA data untuk bekerja?". Sebuah alarm yang
 * kolom pemicunya kosong di hampir semua baris tidak sedang tenang — ia mati.
 */
const ALARM = [
  {
    nama: "Peringatan kedaluwarsa obat & bahan",
    tabel: "BatchBarang",
    kolom: "expired_date",
    // Batch yang sudah habis tidak perlu tanggal lagi.
    berlaku: (r: any) => r?.status !== "habis" && (Number(r?.jumlah_sisa) || 0) > 0,
    akibat: "obat lewat tanggal tidak akan pernah ditandai",
  },
  {
    nama: "Alarm belanja pakan otomatis",
    tabel: "FeedStock",
    kolom: "daily_requirement",
    berlaku: (r: any) => r?.is_active !== false,
    akibat: "sisa-berapa-hari tidak bisa dihitung, daftar belanja pakan tidak pernah terisi",
  },
  {
    nama: "Peringatan kepadatan kandang",
    tabel: "Enclosure",
    kolom: "capacity",
    berlaku: (r: any) => r?.is_active !== false,
    akibat: "kandang penuh tidak pernah diperingatkan",
  },
  {
    nama: "Pemeriksaan kewajaran berat",
    tabel: "MeasurementHistory",
    kolom: "shell_length_cm",
    berlaku: () => true,
    akibat: "berat tanpa panjang tempurung tidak bisa diperiksa kewajarannya",
  },
];

/** Kolom dianggap terisi bila bukan null/undefined/""/0-yang-berarti-belum-diisi. */
function terisi(nilai: any): boolean {
  if (nilai === null || nilai === undefined) return false;
  if (typeof nilai === "string") return nilai.trim() !== "" && nilai.trim() !== "-";
  if (typeof nilai === "number") return Number.isFinite(nilai) && nilai > 0;
  return true;
}

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

    // ── Alarm yang tidak bisa berbunyi ──
    const alarmMati: any[] = [];
    for (const a of ALARM) {
      let baris: any[] = [];
      try {
        baris = await base44.asServiceRole.entities[a.tabel].list(null, BATAS_AMBIL);
      } catch (e) {
        gagal.push({ tabel: `${a.tabel} (alarm)`, alasan: String((e as Error)?.message || e).slice(0, 150) });
        continue;
      }
      const relevan = (Array.isArray(baris) ? baris : []).filter(a.berlaku);
      if (relevan.length === 0) continue;
      const adaIsi = relevan.filter((r: any) => terisi(r?.[a.kolom])).length;
      // Ambang 10%: satu-dua baris terisi tidak membuat alarm hidup, tapi alarm
      // yang sebagian besar datanya ada memang sedang bekerja — kekurangannya
      // urusan kelengkapan data, bukan alarm mati.
      if (adaIsi / relevan.length > 0.1) continue;
      alarmMati.push({
        nama: a.nama,
        tabel: a.tabel,
        kolom: a.kolom,
        terisi: adaIsi,
        dari: relevan.length,
        akibat: a.akibat,
      });
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

    /*
     * Hasilnya harus mendatangi orang, bukan menunggu dibuka. Sapuan mingguan
     * yang hanya mengembalikan JSON ke penjadwal sama saja dengan tidak ada:
     * itu persis kesalahan yang membuat halaman kelengkapan data menganggur
     * berbulan-bulan sampai higieneData dibuat.
     */
    const hariIni = wibTanggal();
    let dikirim = 0;
    if (kembar.length > 0 || ujiTakBertanda.length > 0 || gagal.length > 0 || alarmMati.length > 0) {
      const bagian: string[] = [];
      if (alarmMati.length > 0) {
        bagian.push(
          `ALARM YANG TIDAK BISA BERBUNYI (${alarmMati.length}):\n` +
          alarmMati.map((a) =>
            `${a.nama} — ${a.kolom} terisi ${a.terisi}/${a.dari} di ${a.tabel}; ${a.akibat}`,
          ).join("\n"),
        );
      }
      /*
       * Tabel yang gagal dibaca disebut PALING ATAS, bukan disembunyikan di
       * JSON. Tabel yang gagal dan tabel yang bersih menghasilkan laporan yang
       * sama persis kalau kegagalannya tidak disebut — dan seluruh sesi
       * 15-09-2026 adalah rentetan hal yang gagal tanpa bersuara.
       */
      if (gagal.length > 0) {
        bagian.push(
          `TIDAK BISA DIPERIKSA (${gagal.length}) — anggap belum diperiksa, bukan bersih:\n` +
          gagal.map((g) => `${g.tabel}: ${g.alasan}`).join("\n"),
        );
      }
      if (kembar.length > 0) {
        const perTabel = new Map<string, number>();
        for (const k of kembar) perTabel.set(k.tabel, (perTabel.get(k.tabel) || 0) + (k.jumlah - 1));
        bagian.push(
          `BARIS KEMBAR (${kembar.reduce((s, k) => s + (k.jumlah - 1), 0)} baris berlebih):\n` +
          [...perTabel.entries()].map(([t, n]) => `${t}: ${n}`).join("\n"),
        );
      }
      if (ujiTakBertanda.length > 0) {
        bagian.push(
          `DITULIS "DATA UJI" TAPI TIDAK DITANDAI (${ujiTakBertanda.length}):\n` +
          ujiTakBertanda.slice(0, 5).map((u) => `${u.tabel}: ${u.kutipan.slice(0, 70)}`).join("\n"),
        );
      }
      for (const email of await emailPerRole(base44, ["owner", "admin"])) {
        const dibuat = await notifSekali(base44, {
          recipient_email: email,
          title: gagal.length > 0
            ? `Higiene data: ${gagal.length} tabel gagal diperiksa, ${kembar.length} kelompok kembar`
            : alarmMati.length > 0
              ? `${alarmMati.length} alarm tidak bisa berbunyi, ${kembar.length} kelompok kembar`
              : `Higiene data: ${kembar.length} kelompok kembar, ${ujiTakBertanda.length} catatan uji`,
          message: bagian.join("\n\n").slice(0, 900),
          type: gagal.length > 0 ? "alert" : "warning",
          priority: gagal.length > 0 ? "tinggi" : "sedang",
          category: "sistem",
          action_label: "Lihat kelengkapan data",
          action_url: "/kelengkapan-data",
          related_entity_id: `higiene_kembar_${hariIni}`,
          related_entity_type: "sistem",
        });
        if (dibuat) dikirim++;
      }
    }

    return Response.json({
      success: true,
      notifikasi_dibuat: dikirim,
      baris_diperiksa: diperiksa,
      alarm_mati: alarmMati.length,
      detail_alarm: alarmMati,
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
