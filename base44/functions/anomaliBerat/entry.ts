import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { getOtomatis, setOtomatis, wibTanggal, sudahWaktunya, notifSekali, emailPerRole, potongRapi } from "../../shared/otomatis.ts";
import { masukLaporan } from "../../shared/laporan.ts";
import { STATUS_KELUAR } from "../../shared/kura.ts";


/**
 * A11 — Deteksi kura yang turun berat atau berhenti tumbuh.
 *
 * Data timbang sudah masuk tapi tidak pernah dibandingkan dengan riwayatnya
 * sendiri. Padahal turun berat adalah tanda paling awal yang bisa dilihat
 * tanpa dokter: kura sakit berhenti makan jauh sebelum terlihat sakit.
 *
 * Dua hal yang ditandai:
 *   - TURUN  : berat terakhir lebih rendah dari sebelumnya melebihi ambang persen
 *   - STAGNAN: berat tidak pernah naik selama sekian hari (bayi & remaja saja;
 *              kura dewasa memang berhenti tumbuh, jadi tidak dihitung)
 *
 * Hasilnya satu notifikasi ringkas per hari ke owner & manajer, bukan satu
 * notifikasi per kura.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const otomatis = await getOtomatis(base44);

    if (otomatis.anomali_berat_enabled !== true) {
      return Response.json({ skipped: "disabled" });
    }

    const hariIni = wibTanggal();
    if ((otomatis.anomali_terakhir || "").slice(0, 10) === hariIni) {
      return Response.json({ skipped: "sudah_jalan_hari_ini" });
    }
    // Jadwal per jam: tanpa pagar jam, jalan pertama tiap hari jatuh 00:15 WIB.
    if (!sudahWaktunya(otomatis.anomali_jam, "08:00")) {
      return Response.json({ skipped: "belum_jamnya" });
    }

    const ambangTurun = Number(otomatis.anomali_turun_persen ?? 5);
    const ambangStagnan = Number(otomatis.anomali_stagnan_hari ?? 90);

    const [tortoises, ukuran] = await Promise.all([
      base44.asServiceRole.entities.Tortoise.list("name", 2000),
      base44.asServiceRole.entities.MeasurementHistory.list("-date", 3000),
    ]);

    const diPeternakan = (t: any) => t && !t.is_archived && !STATUS_KELUAR.includes(t.status);

    // Kelompokkan riwayat per kura, urut naik menurut tanggal.
    const perKura = new Map<string, any[]>();
    for (const m of ukuran || []) {
      if (!masukLaporan(m)) continue;
      if (!m.tortoise_id || !m.weight_grams) continue;
      if (!perKura.has(m.tortoise_id)) perKura.set(m.tortoise_id, []);
      perKura.get(m.tortoise_id)!.push(m);
    }
    for (const arr of perKura.values()) {
      arr.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    }

    const turun: { teks: string; tanggal: string }[] = [];
    const stagnan: string[] = [];
    const satuanJanggal: string[] = [];

    /*
     * Penjaga satuan, versi server (15-09-2026).
     *
     * 48 catatan Juli-September 2026 tersimpan dalam kilogram di kolom gram.
     * Di layar sekarang sudah ada InputBerat dengan pilihan satuan; ini jaring
     * kedua, untuk catatan yang lolos lewat jalan lain (impor, perbaikan
     * manual, layar yang belum tersentuh).
     *
     * Sengaja TIDAK memakai rumus berat-dari-panjang seperti di layar. Kalau
     * aturannya disalin, dua salinan itu akan berbeda diam-diam suatu hari.
     * Di sini dipakai bukti yang berdiri sendiri: lompatan antar-penimbangan.
     * Kura tidak bisa berubah 50 kali lipat dari satu timbangan ke timbangan
     * berikutnya; salah satuan persis seperti itu (100x untuk ons, 1000x untuk
     * kilogram).
     */
    const LOMPATAN_MUSTAHIL = 50;

    /*
     * Lompatan panjang tempurung (15-09-2026).
     *
     * Pemeriksaan berat-terhadap-panjang di layar punya satu titik buta yang
     * baru ketahuan: kalau BERAT DAN PANJANG sama-sama tergeser koma, rasionya
     * tetap masuk akal dan peringatan tidak muncul. Contohnya nyata:
     *
     *     A43  25 Jul  20 g / 5,2 cm    (benarnya 20.700 g / 52 cm)
     *     A45  25 Jul  36 g / 5,9 cm    (benarnya 36.000 g / 59 cm)
     *
     * Dua-duanya lolos karena kura 5 cm seberat 20 g memang wajar. Yang tidak
     * wajar adalah tempurung yang menyusut sepuluh kali lipat dari penimbangan
     * sebelumnya — dan itu hanya terlihat dari riwayat kura itu sendiri.
     */
    const SUSUT_TEMPURUNG_MUSTAHIL = 3;

    for (const t of tortoises || []) {
      if (!diPeternakan(t)) continue;
      const riwayat = perKura.get(t.id) || [];
      if (riwayat.length < 2) continue;

      const terakhir = riwayat[riwayat.length - 1];
      const sebelumnya = riwayat[riwayat.length - 2];
      const beratAkhir = Number(terakhir.weight_grams || 0);
      const beratSebelum = Number(sebelumnya.weight_grams || 0);

      if (beratSebelum > 0 && beratAkhir > 0) {
        const lipat = beratAkhir > beratSebelum
          ? beratAkhir / beratSebelum
          : beratSebelum / beratAkhir;
        if (lipat >= LOMPATAN_MUSTAHIL) {
          satuanJanggal.push(
            `${t.name || t.code || t.id}: ${beratSebelum}g (${sebelumnya.date}) → ` +
            `${beratAkhir}g (${terakhir.date}), beda ${Math.round(lipat)}x — periksa satuannya`,
          );
          continue;
        }
        const panjangAkhir = Number(terakhir.shell_length_cm || 0);
        const panjangSebelum = Number(sebelumnya.shell_length_cm || 0);
        if (panjangAkhir > 0 && panjangSebelum > 0) {
          const lipatPanjang = panjangAkhir > panjangSebelum
            ? panjangAkhir / panjangSebelum
            : panjangSebelum / panjangAkhir;
          if (lipatPanjang >= SUSUT_TEMPURUNG_MUSTAHIL) {
            satuanJanggal.push(
              `${t.name || t.code || t.id}: tempurung ${panjangSebelum} cm (${sebelumnya.date}) → ` +
              `${panjangAkhir} cm (${terakhir.date}), beda ${lipatPanjang.toFixed(1)}x — periksa komanya`,
            );
            continue;
          }
        }

        const selisihPersen = ((beratSebelum - beratAkhir) / beratSebelum) * 100;
        if (selisihPersen >= ambangTurun) {
          turun.push({
            tanggal: String(terakhir.date || ""),
            teks:
              `${t.name || t.code || t.id} turun ${selisihPersen.toFixed(1)}% ` +
              `(${beratSebelum}g → ${beratAkhir}g, ${terakhir.date})`,
          });
          continue; // sudah ditandai, tidak perlu dicek stagnan
        }
      }

      // Stagnan hanya relevan untuk yang masih seharusnya tumbuh.
      const masihTumbuh =
        t.age_category === "baby" ||
        t.age_category === "juvenile" ||
        (t.shell_length_cm && Number(t.shell_length_cm) < 30);
      if (!masihTumbuh) continue;

      // Kapan terakhir kali beratnya naik?
      let tanggalNaikTerakhir = riwayat[0].date;
      for (let i = 1; i < riwayat.length; i++) {
        if (Number(riwayat[i].weight_grams) > Number(riwayat[i - 1].weight_grams)) {
          tanggalNaikTerakhir = riwayat[i].date;
        }
      }
      const selisihHari =
        (new Date(terakhir.date).getTime() - new Date(tanggalNaikTerakhir).getTime()) /
        (24 * 60 * 60 * 1000);
      if (selisihHari >= ambangStagnan) {
        stagnan.push(
          `${t.name || t.code || t.id} tidak naik berat sejak ${tanggalNaikTerakhir} (${Math.round(selisihHari)} hari)`,
        );
      }
    }

    let dikirim = 0;
    if (turun.length > 0 || stagnan.length > 0 || satuanJanggal.length > 0) {
      const penerima = await emailPerRole(base44, ["owner", "manajer"]);
      const bagian: string[] = [];
      if (satuanJanggal.length > 0) bagian.push(`SATUAN BERAT JANGGAL (${satuanJanggal.length}):\n` + satuanJanggal.slice(0, 10).join("\n"));
      /*
       * Yang BARU lebih dulu, yang basi disebut apa adanya.
       *
       * Penurunan berat tetap dilaporkan tiap hari selama kura itu belum
       * ditimbang ulang — jadi temuan bulan Juli ikut muncul setiap pagi dan
       * menenggelamkan yang baru. 17-09-2026 laporannya berbunyi "6 kura
       * perlu diperiksa": tiga dari Juli yang sudah berkali-kali dibaca, dan
       * DUA baby yang benar-benar turun kemarin. Yang penting ada di urutan
       * keempat dan kelima.
       *
       * Temuan yang tidak bisa dipadamkan dengan bekerja akan berhenti
       * dibaca. Yang lama tidak dibuang — ia berpindah ke bawah dengan
       * sebutan yang jujur: bukan "turun berat", melainkan "belum ditimbang
       * ulang sejak penurunan itu".
       */
      const BATAS_BARU_HARI = 21;
      const usiaHari = (tgl: string) => {
        const t = Date.parse(tgl);
        return Number.isFinite(t) ? Math.floor((Date.now() - t) / 86400000) : 9999;
      };
      const baru = turun.filter((x) => usiaHari(x.tanggal) <= BATAS_BARU_HARI)
        .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
      const lama = turun.filter((x) => usiaHari(x.tanggal) > BATAS_BARU_HARI)
        .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
      if (baru.length > 0) {
        bagian.push(`TURUN BERAT — BARU (${baru.length}):\n` + baru.slice(0, 10).map((x) => x.teks).join("\n"));
      }
      if (lama.length > 0) {
        bagian.push(
          `TURUN BERAT — BELUM DITIMBANG ULANG (${lama.length}):\n` +
          lama.slice(0, 10).map((x) => `${x.teks} — ${usiaHari(x.tanggal)} hari lalu`).join("\n") +
          "\nTimbang ulang untuk memastikan; selama belum, temuan ini terus muncul.",
        );
      }
      if (stagnan.length > 0) bagian.push(`BERHENTI TUMBUH (${stagnan.length}):\n` + stagnan.slice(0, 10).join("\n"));

      for (const email of penerima) {
        const dibuat = await notifSekali(base44, {
          recipient_email: email,
          title: baru.length > 0
            ? `${baru.length} kura BARU turun berat${turun.length - baru.length > 0 ? ` (+${turun.length - baru.length} lama)` : ""}`
            : `${turun.length + stagnan.length + satuanJanggal.length} kura perlu diperiksa (berat)`,
          message: potongRapi(bagian.join("\n\n"), 900),
          // Prioritas tinggi hanya untuk yang BARU. Temuan lama yang sama
          // berbunyi keras tiap pagi adalah cara tercepat membuat orang
          // berhenti membuka notifikasi sama sekali.
          type: baru.length > 0 || satuanJanggal.length > 0 ? "alert" : "warning",
          priority: baru.length > 0 || satuanJanggal.length > 0 ? "tinggi" : "sedang",
          category: "kesehatan",
          action_label: "Lihat Daftar Kura",
          action_url: "/tortoise",
          related_entity_id: `anomali_berat_${hariIni}`,
          related_entity_type: "MeasurementHistory",
        });
        if (dibuat) dikirim++;
      }
    }

    await setOtomatis(base44, otomatis, { anomali_terakhir: hariIni });

    return Response.json({
      success: true,
      turun: turun.length,
      stagnan: stagnan.length,
      satuan_janggal: satuanJanggal.length,
      notifikasi_dibuat: dikirim,
      detail_satuan: satuanJanggal.slice(0, 20),
      detail_turun: turun.slice(0, 20).map((x) => x.teks),
      detail_stagnan: stagnan.slice(0, 20),
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
