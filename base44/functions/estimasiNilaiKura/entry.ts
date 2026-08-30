import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { getOtomatis, setOtomatis, wibNow, notifSekali, emailPerRole } from "../../shared/otomatis.ts";
import { masukLaporan } from "../../shared/laporan.ts";

const STATUS_KELUAR = ["mati", "terjual", "diarsipkan"];
const MIN_SAMPEL = 3;

function median(angka: number[]): number {
  if (angka.length === 0) return 0;
  const s = [...angka].sort((a, b) => a - b);
  const t = Math.floor(s.length / 2);
  return s.length % 2 ? s[t] : (s[t - 1] + s[t]) / 2;
}

function persentil(angka: number[], p: number): number {
  if (angka.length === 0) return 0;
  const s = [...angka].sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.max(0, Math.round((p / 100) * (s.length - 1))));
  return s[i];
}

/**
 * C8 — Perkiraan nilai jual per ekor, dari harga penjualan Anda sendiri.
 *
 * Penetapan harga saat ini bergantung pada ingatan dan perasaan, dan nilai
 * seluruh stok hidup tidak pernah diketahui. Padahal data harga jual nyata
 * sudah tercatat di setiap penjualan, lengkap dengan berat kura saat dijual.
 *
 * Modelnya sengaja dibuat sederhana dan bisa diperiksa manusia: harga per gram
 * dari penjualan nyata, diambil MEDIAN-nya supaya satu penjualan yang tidak
 * biasa tidak menarik seluruh angka. Rentang wajar diambil dari persentil 25
 * dan 75 — bukan satu angka tunggal yang terkesan lebih pasti dari kenyataannya.
 *
 * Bila penjualan yang tercatat lengkap dengan berat masih kurang dari
 * ${MIN_SAMPEL}, fungsi ini TIDAK mengarang angka. Ia melapor bahwa datanya
 * belum cukup, karena estimasi harga yang dibuat-buat lebih berbahaya daripada
 * tidak ada estimasi sama sekali.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const otomatis = await getOtomatis(base44);

    if (otomatis.estimasi_nilai_enabled !== true) {
      return Response.json({ skipped: "disabled" });
    }

    const wib = wibNow();
    const periode = `${wib.getUTCFullYear()}-${String(wib.getUTCMonth() + 1).padStart(2, "0")}`;
    if ((otomatis.estimasi_nilai_terakhir || "") === periode) {
      return Response.json({ skipped: "sudah_hitung_periode_ini", periode });
    }

    const [sales, tortoises, nilaiLama] = await Promise.all([
      base44.asServiceRole.entities.Sale.list("-sale_date", 500),
      base44.asServiceRole.entities.Tortoise.list("name", 2000),
      base44.asServiceRole.entities.NilaiKura.list("-dihitung_at", 2000),
    ]);

    // ── Bentuk harga per gram dari penjualan nyata ──
    const sampel: number[] = [];
    for (const s of sales || []) {
      if (!masukLaporan(s)) continue;
      const harga = Number(s.price || 0);
      const berat = Number(s.tortoise_weight || 0);
      if (harga <= 0 || berat <= 0) continue;
      sampel.push(harga / berat);
    }

    if (sampel.length < MIN_SAMPEL) {
      const penerima = await emailPerRole(base44, ["owner"]);
      for (const email of penerima) {
        await notifSekali(base44, {
          recipient_email: email,
          title: "Estimasi nilai kura belum bisa dihitung",
          message:
            `Baru ${sampel.length} penjualan yang mencatat harga DAN berat kura. ` +
            `Perlu minimal ${MIN_SAMPEL} supaya angkanya berarti. ` +
            `Isi kolom berat kura pada penjualan berikutnya, dan angka ini akan terbentuk sendiri.`,
          type: "info",
          priority: "rendah",
          category: "penjualan",
          action_label: "Buka Penjualan",
          action_url: "/sales",
          related_entity_id: `estimasi_nilai_kurang_data_${periode}`,
          related_entity_type: "Sale",
        });
      }
      return Response.json({ success: true, cukup_data: false, sampel: sampel.length, minimal: MIN_SAMPEL });
    }

    const perGram = median(sampel);
    const perGramBawah = persentil(sampel, 25);
    const perGramAtas = persentil(sampel, 75);

    const lamaPerKura = new Map((nilaiLama || []).map((n: any) => [n.tortoise_id, n]));

    let dibuat = 0;
    let diperbarui = 0;
    let tanpaBerat = 0;
    let totalNilai = 0;

    for (const t of tortoises || []) {
      if (!t || t.is_archived || STATUS_KELUAR.includes(t.status)) continue;

      const berat = Number(t.weight_grams || 0);
      if (berat <= 0) {
        tanpaBerat++;
        continue;
      }

      let umurBulan = 0;
      if (t.birth_date) {
        umurBulan = Math.max(
          0,
          Math.round((Date.now() - new Date(t.birth_date).getTime()) / (30.44 * 24 * 3600 * 1000)),
        );
      }

      const nilai = Math.round(berat * perGram);
      const data = {
        tortoise_id: t.id,
        tortoise_name: t.name || "",
        tortoise_code: t.code || "",
        periode,
        berat_gram: berat,
        panjang_cm: Number(t.shell_length_cm || 0) || undefined,
        umur_bulan: umurBulan || undefined,
        gender: t.gender || "",
        nilai_estimasi: nilai,
        nilai_bawah: Math.round(berat * perGramBawah),
        nilai_atas: Math.round(berat * perGramAtas),
        dasar: "penjualan_nyata",
        harga_per_gram: Math.round(perGram),
        jumlah_sampel: sampel.length,
        catatan:
          `Dihitung dari ${sampel.length} penjualan nyata. Angka ini perkiraan kasar berbasis berat saja — ` +
          `morph, silsilah, dan kondisi tidak ikut dihitung.`,
        dihitung_at: new Date().toISOString(),
      };

      const lama: any = lamaPerKura.get(t.id);
      if (lama) {
        await base44.asServiceRole.entities.NilaiKura.update(lama.id, data);
        diperbarui++;
      } else {
        await base44.asServiceRole.entities.NilaiKura.create(data);
        dibuat++;
      }
      totalNilai += nilai;
    }

    const penerima = await emailPerRole(base44, ["owner"]);
    for (const email of penerima) {
      await notifSekali(base44, {
        recipient_email: email,
        title: `Nilai stok hidup ${periode}: Rp ${totalNilai.toLocaleString("id-ID")}`,
        message:
          `${dibuat + diperbarui} kura dinilai, dasar ${sampel.length} penjualan nyata ` +
          `(median Rp ${Math.round(perGram).toLocaleString("id-ID")}/gram).\n` +
          (tanpaBerat > 0 ? `${tanpaBerat} kura belum punya data berat sehingga belum bisa dinilai.\n` : "") +
          `\nCatatan: perkiraan ini hanya memakai berat. Morph dan silsilah belum diperhitungkan, ` +
          `jadi pakai sebagai titik awal tawar-menawar, bukan harga pasti.`,
        type: "info",
        priority: "sedang",
        category: "penjualan",
        action_label: "Lihat Daftar Kura",
        action_url: "/tortoise",
        related_entity_id: `estimasi_nilai_${periode}`,
        related_entity_type: "NilaiKura",
      });
    }

    await setOtomatis(base44, otomatis, { estimasi_nilai_terakhir: periode });

    return Response.json({
      success: true,
      periode,
      sampel: sampel.length,
      harga_per_gram: Math.round(perGram),
      rentang_per_gram: [Math.round(perGramBawah), Math.round(perGramAtas)],
      dibuat,
      diperbarui,
      tanpa_berat: tanpaBerat,
      total_nilai_stok: totalNilai,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
