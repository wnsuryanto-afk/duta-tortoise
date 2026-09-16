/**
 * sinkronProfilKura — samakan kembali profil kura dengan penimbangan SAH
 * yang paling akhir, lalu laporkan apa yang bergeser.
 *
 * ── KENAPA PERLU ───────────────────────────────────────────────────
 *
 * `Tortoise.weight_grams` adalah salinan dari baris MeasurementHistory
 * terakhir. Salinan itu dijaga oleh automation onMeasurementSaved, yang
 * sampai 16-09-2026 menyalin baris yang baru disentuh tanpa bertanya
 * apakah baris itu masih sah. Akibatnya profil bisa memuat:
 *
 *   • angka dari baris yang sudah DIKECUALIKAN (39 baris di peternakan ini),
 *   • angka dari catatan LAMA yang kebetulan diedit belakangan,
 *   • tanggal timbang dari baris yang sudah tidak dihitung.
 *
 * Ditemukan nyata: A43 berprofil 20.000 g sementara timbangan sahnya
 * 20.700 g. Selisih 700 g pada kura yang dosis obatnya dihitung dengan
 * membagi berat — dan tidak ada satu pun layar yang bisa menunjukkan
 * bahwa kedua angka itu berbeda.
 *
 * Automation-nya sudah diperbaiki, tapi hanya berjalan saat ada baris
 * disentuh. Profil yang sudah terlanjur melenceng akan tetap melenceng
 * sampai kura itu ditimbang lagi — bisa berbulan-bulan. Fungsi ini yang
 * menutup selisih itu, dan tetap berjalan tiap pekan supaya pergeseran
 * berikutnya tidak perlu ditemukan orang.
 *
 * ── KENAPA MEMPERBAIKI, BUKAN SEKADAR MELAPOR ──────────────────────
 *
 * Menghitung ulang bukan penilaian, melainkan mengembalikan definisi:
 * profil HARUS sama dengan timbangan sah terakhir. Tidak ada tebakan di
 * dalamnya. Yang dilaporkan adalah apa yang berubah, supaya perbaikan
 * diam-diam tetap bisa diperiksa.
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { getOtomatis, setOtomatis, wibTanggal, sudahWaktunya, notifSekali, emailPerRole } from "../../shared/otomatis.ts";
import { BATAS_AMBIL } from "../../shared/batas.ts";
import { masukLaporan } from "../../shared/laporan.ts";

function angka(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Baris sah paling akhir untuk satu kura. Kembaran logika onMeasurementSaved. */
function palingAkhir(riwayat: any[]): any | null {
  const sah = (riwayat || []).filter(masukLaporan);
  if (sah.length === 0) return null;
  return sah.slice().sort((a, b) => {
    const ta = String(a?.date || "");
    const tb = String(b?.date || "");
    if (ta !== tb) return ta < tb ? 1 : -1;
    return String(b?.created_date || "").localeCompare(String(a?.created_date || ""));
  })[0];
}

/** Beda yang layak disebut. null vs 0 vs "" tidak dihitung sebagai beda. */
function berbeda(a: any, b: any): boolean {
  const na = angka(a), nb = angka(b);
  if (na === 0 && nb === 0) return false;
  return Math.abs(na - nb) > 0.001;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const hariIni = wibTanggal();
    const otomatis = await getOtomatis(base44);

    const paksa = new URL(req.url).searchParams.get("paksa") === "1";
    if (!paksa) {
      if (otomatis.sinkron_profil_terakhir === hariIni) {
        return Response.json({ skipped: "sudah_hari_ini" });
      }
      if (!sudahWaktunya(otomatis.sinkron_profil_jam, "08:20")) {
        return Response.json({ skipped: "belum_jamnya" });
      }
    }

    const [kura, ukuran] = await Promise.all([
      base44.asServiceRole.entities.Tortoise.list("-created_date", BATAS_AMBIL),
      base44.asServiceRole.entities.MeasurementHistory.list("-date", BATAS_AMBIL),
    ]);

    const perKura = new Map<string, any[]>();
    for (const m of ukuran || []) {
      if (!m?.tortoise_id) continue;
      if (!perKura.has(m.tortoise_id)) perKura.set(m.tortoise_id, []);
      perKura.get(m.tortoise_id)!.push(m);
    }

    const diperbaiki: string[] = [];
    const dikosongkan: string[] = [];
    let gagal = 0;

    for (const t of kura || []) {
      const riwayat = perKura.get(t.id) || [];
      // Kura yang belum pernah ditimbang sama sekali dibiarkan — profilnya
      // mungkin diisi tangan saat pendataan awal, dan mengosongkannya akan
      // menghapus satu-satunya angka yang ada.
      if (riwayat.length === 0) continue;

      const acuan = palingAkhir(riwayat);
      const baru = {
        weight_grams: angka(acuan?.weight_grams) > 0 ? angka(acuan.weight_grams) : null,
        shell_length_cm: angka(acuan?.shell_length_cm) > 0 ? angka(acuan.shell_length_cm) : null,
        last_weighed_date: acuan?.date || null,
      };

      const geserBerat = berbeda(t.weight_grams, baru.weight_grams);
      const geserPanjang = berbeda(t.shell_length_cm, baru.shell_length_cm);
      const geserTanggal = String(t.last_weighed_date || "") !== String(baru.last_weighed_date || "");
      if (!geserBerat && !geserPanjang && !geserTanggal) continue;

      try {
        await base44.asServiceRole.entities.Tortoise.update(t.id, baru);
      } catch {
        gagal++;
        continue;
      }

      const kode = t.code || t.name || t.id;
      if (!acuan) {
        dikosongkan.push(`${kode} — semua timbangannya dikecualikan`);
      } else if (geserBerat) {
        diperbaiki.push(
          `${kode}: ${angka(t.weight_grams).toLocaleString("id-ID")} g → ` +
          `${angka(baru.weight_grams).toLocaleString("id-ID")} g (timbang ${baru.last_weighed_date})`,
        );
      } else {
        diperbaiki.push(`${kode}: tanggal/panjang disamakan ke timbangan ${baru.last_weighed_date}`);
      }
    }

    if (diperbaiki.length > 0 || dikosongkan.length > 0 || gagal > 0) {
      const bagian: string[] = [];
      if (diperbaiki.length > 0) {
        bagian.push(
          `PROFIL DISAMAKAN DENGAN TIMBANGAN SAH TERAKHIR (${diperbaiki.length}):\n` +
          diperbaiki.slice(0, 20).join("\n") +
          (diperbaiki.length > 20 ? `\n…dan ${diperbaiki.length - 20} lagi` : ""),
        );
      }
      if (dikosongkan.length > 0) {
        bagian.push(
          `PROFIL DIKOSONGKAN (${dikosongkan.length}) — tidak ada timbangan sah tersisa:\n` +
          dikosongkan.slice(0, 10).join("\n"),
        );
      }
      // Kegagalan disebut, bukan disembunyikan: profil yang gagal diperbaiki
      // terlihat persis sama dengan profil yang memang sudah benar.
      if (gagal > 0) {
        bagian.unshift(`${gagal} kura GAGAL diperbarui — anggap belum diperiksa, bukan sudah benar.`);
      }

      const penerima = await emailPerRole(base44, ["owner", "manajer"]);
      for (const email of penerima) {
        await notifSekali(base44, {
          recipient_email: email,
          title: `Profil kura disamakan: ${diperbaiki.length} berubah${gagal > 0 ? `, ${gagal} gagal` : ""}`,
          message:
            bagian.join("\n\n") +
            "\n\nBerat di profil dipakai DosisKalkulator untuk membagi dosis obat, " +
            "jadi selisih di sini langsung jadi selisih dosis.",
          type: gagal > 0 ? "alert" : "info",
          priority: gagal > 0 ? "tinggi" : "sedang",
          category: "kesehatan",
          related_entity_id: `sinkron_profil_${hariIni}`,
          related_entity_type: "Tortoise",
        });
      }
    }

    await setOtomatis(base44, otomatis, { sinkron_profil_terakhir: hariIni });

    return Response.json({
      success: true,
      kura_diperiksa: (kura || []).length,
      diperbaiki: diperbaiki.length,
      dikosongkan: dikosongkan.length,
      gagal,
      detail: diperbaiki.slice(0, 40),
    });
  } catch (error) {
    return Response.json({ error: (error as Error)?.message }, { status: 500 });
  }
});
