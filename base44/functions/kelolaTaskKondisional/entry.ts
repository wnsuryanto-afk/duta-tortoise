import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { getOtomatis } from "../../shared/otomatis.ts";
import { clutchAktif } from "../../shared/kura.ts";

/**
 * Menyalakan dan mematikan SOP task yang hanya berlaku saat keadaannya ada.
 *
 * Sebagian pekerjaan tidak berulang menurut kalender, melainkan menurut
 * keadaan: karantina hanya perlu dicek selama ada penghuninya, inkubator hanya
 * perlu dicatat selama ada telur. Dipasang sebagai task harian biasa, keduanya
 * berubah menjadi poin gratis di hari-hari kosong; dinonaktifkan manual, mereka
 * lupa dinyalakan justru di hari yang penting.
 *
 * Fungsi ini menyambungkan keduanya: task dinyalakan saat keadaannya muncul dan
 * dimatikan lagi saat keadaannya hilang, tanpa ada yang perlu ingat.
 *
 * Menambah task kondisional baru cukup menambah satu baris di ATURAN.
 */

type Aturan = {
  cocok: RegExp;
  keterangan: string;
  aktifBila: (base44: any) => Promise<{ aktif: boolean; alasan: string }>;
};

const ATURAN: Aturan[] = [
  {
    cocok: /karantina/i,
    keterangan: "Cek kura karantina",
    aktifBila: async (base44) => {
      const kura = await base44.asServiceRole.entities.Tortoise.list("-updated_date", 2000);
      const dikarantina = (kura || []).filter(
        (t: any) => !t.is_archived && t.status === "karantina",
      );
      return {
        aktif: dikarantina.length > 0,
        alasan:
          dikarantina.length > 0
            ? `${dikarantina.length} kura di karantina: ${dikarantina.slice(0, 5).map((t: any) => t.name || t.code).join(", ")}`
            : "tidak ada kura di karantina",
      };
    },
  },
  {
    cocok: /inkubator|suhu.*kelembapan/i,
    keterangan: "Catat suhu & kelembapan inkubator",
    aktifBila: async (base44) => {
      const breedings = await base44.asServiceRole.entities.Breeding.list("-egg_laying_date", 200);
      // Task "catat suhu inkubator" harus menyala selama telurnya ada —
      // status "bertelur" maupun "inkubasi" (../../shared/kura.ts). Menyaring
      // "inkubasi" saja membuat task ini mati justru di clutch yang sedang
      // dierami sekarang.
      const inkubasi = (breedings || []).filter(clutchAktif);
      const telur = inkubasi.reduce((s: number, b: any) => s + Number(b.egg_count || 0), 0);
      return {
        aktif: inkubasi.length > 0,
        alasan:
          inkubasi.length > 0
            ? `${inkubasi.length} clutch (${telur} telur) sedang dierami`
            : "tidak ada telur dalam inkubasi",
      };
    },
  },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const otomatis = await getOtomatis(base44);

    if (otomatis.task_kondisional_enabled !== true) {
      return Response.json({ skipped: "disabled" });
    }

    const sopTasks = await base44.asServiceRole.entities.SOPTask.list();
    const hasil: string[] = [];

    for (const aturan of ATURAN) {
      const target = (sopTasks || []).filter((t: any) => aturan.cocok.test(t.title || ""));
      if (target.length === 0) continue;

      const { aktif, alasan } = await aturan.aktifBila(base44);

      for (const t of target) {
        if (t.is_active === aktif) continue;
        await base44.asServiceRole.entities.SOPTask.update(t.id, {
          is_active: aktif,
          description:
            String(t.description || "").split("\n\n[Otomatis]")[0] +
            `\n\n[Otomatis] ${aktif ? "Dinyalakan" : "Dimatikan"} ${new Date().toISOString().slice(0, 10)} — ${alasan}.`,
        });
        hasil.push(`${aktif ? "NYALA" : "MATI"}: ${t.title} — ${alasan}`);
      }
    }

    return Response.json({ success: true, perubahan: hasil.length, detail: hasil });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
