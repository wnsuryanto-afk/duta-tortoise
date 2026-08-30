import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { getOtomatis, setOtomatis, wibNow, notifSekali, emailPerRole } from "../../shared/otomatis.ts";
import { sendWhatsAppNotification, getPhoneNumbersForRoles } from "../../shared/whatsapp.ts";

const STATUS_KELUAR = ["mati", "terjual", "diarsipkan"];

/** "Rp 1.234.567" */
function rupiah(n: number): string {
  return "Rp " + Math.round(n || 0).toLocaleString("id-ID");
}

/** Bulan sebelumnya dari "YYYY-MM". */
function bulanSebelum(bulan: string): string {
  const [y, m] = bulan.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * A13 — Laporan biaya per ekor, terbit sendiri tiap awal bulan.
 *
 * Perhitungannya sudah ada di aplikasi tapi hanya jalan kalau halamannya
 * dibuka. Di sini ia berjalan sendiri, membandingkan dengan bulan lalu, dan
 * mengirim angkanya — karena biaya per ekor baru berguna bila dilihat sebagai
 * tren, bukan sebagai satu angka sesaat.
 *
 * Pencairan kas kecil sengaja TIDAK dijumlahkan: itu perpindahan uang, bukan
 * biaya. Belanjanya sudah tercatat sebagai FinanceTransaction saat dipakai.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const otomatis = await getOtomatis(base44);

    if (otomatis.laporan_biaya_enabled !== true) {
      return Response.json({ skipped: "disabled" });
    }

    const wib = wibNow();
    const tanggalKirim = Number(otomatis.laporan_biaya_tanggal ?? 1);
    if (wib.getUTCDate() < tanggalKirim) {
      return Response.json({ skipped: "belum_tanggalnya" });
    }

    // Laporan untuk bulan yang baru saja selesai.
    const bulanIni = `${wib.getUTCFullYear()}-${String(wib.getUTCMonth() + 1).padStart(2, "0")}`;
    const periode = bulanSebelum(bulanIni);

    if ((otomatis.laporan_biaya_terakhir || "") === periode) {
      return Response.json({ skipped: "sudah_kirim_periode_ini", periode });
    }

    const [finance, slip, tortoises] = await Promise.all([
      base44.asServiceRole.entities.FinanceTransaction.list("-date", 2000),
      base44.asServiceRole.entities.SalarySlip.list("-period", 300),
      base44.asServiceRole.entities.Tortoise.list("name", 2000),
    ]);

    const layak = (t: any) => !t.is_test_data && !t.excluded_from_reports;

    const hitungBulan = (bulan: string) => {
      const tx = (finance || []).filter(
        (t: any) => t.type === "pengeluaran" && String(t.date || "").startsWith(bulan) && layak(t),
      );
      const totalFinance = tx.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);

      // D18 — Gaji tidak lagi dijumlahkan dari SalarySlip. Slip yang ditandai
      // dibayar membuat FinanceTransaction-nya sendiri, jadi gajinya sudah ada
      // di totalFinance; menjumlahkan keduanya membuat gaji terhitung dua kali.
      const totalGaji = tx
        .filter((t: any) => ["gaji", "gaji_karyawan"].includes(t.category))
        .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);

      const perKategori: Record<string, number> = {};
      for (const t of tx) {
        const c = t.category || "lainnya";
        perKategori[c] = (perKategori[c] || 0) + Number(t.amount || 0);
      }
      return { total: totalFinance, totalFinance, totalGaji, perKategori };
    };

    const ini = hitungBulan(periode);
    const lalu = hitungBulan(bulanSebelum(periode));

    const jumlahKura = (tortoises || []).filter(
      (t: any) => t && !t.is_archived && !STATUS_KELUAR.includes(t.status),
    ).length;

    const perEkor = jumlahKura > 0 ? Math.round(ini.total / jumlahKura) : 0;
    const perEkorLalu = jumlahKura > 0 ? Math.round(lalu.total / jumlahKura) : 0;
    const selisih = perEkorLalu > 0 ? ((perEkor - perEkorLalu) / perEkorLalu) * 100 : 0;
    const arah = selisih > 1 ? `naik ${selisih.toFixed(0)}%` : selisih < -1 ? `turun ${Math.abs(selisih).toFixed(0)}%` : "stabil";

    const kategoriTeratas = Object.entries(ini.perKategori)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k, v]) => `  • ${k}: ${rupiah(v)}`)
      .join("\n");

    const pesan =
      `📊 *Biaya Peternakan — ${periode}*\n\n` +
      `Total pengeluaran: *${rupiah(ini.total)}*\n` +
      `Jumlah kura di peternakan: ${jumlahKura} ekor\n` +
      `*Biaya per ekor: ${rupiah(perEkor)}* (${arah} dibanding bulan lalu)\n\n` +
      `Rincian:\n` +
      `  • Gaji karyawan: ${rupiah(ini.totalGaji)}\n` +
      (kategoriTeratas ? kategoriTeratas + "\n" : "") +
      `\nBulan lalu: ${rupiah(lalu.total)} (${rupiah(perEkorLalu)}/ekor)` +
      (ini.total === 0
        ? `\n\n⚠️ Tidak ada pengeluaran tercatat bulan ini — kemungkinan besar pencatatan yang belum jalan, bukan biaya yang benar-benar nol.`
        : "");

    const nomorOwner = await getPhoneNumbersForRoles(base44, ["owner"]);
    let wa = false;
    if (nomorOwner.length > 0) {
      const r = await sendWhatsAppNotification(base44, {
        targets: nomorOwner,
        message: pesan,
        notificationType: "laporan_biaya",
        relatedEntityId: `laporan_biaya_${periode}`,
      });
      wa = r.success;
    }

    const penerima = await emailPerRole(base44, ["owner", "manajer"]);
    for (const email of penerima) {
      await notifSekali(base44, {
        recipient_email: email,
        title: `Biaya per ekor ${periode}: ${rupiah(perEkor)}`,
        message: pesan.replace(/\*/g, "").slice(0, 900),
        type: "info",
        priority: "sedang",
        category: "keuangan",
        action_label: "Lihat Keuangan",
        action_url: "/finance",
        related_entity_id: `laporan_biaya_${periode}`,
        related_entity_type: "FinanceTransaction",
      });
    }

    await setOtomatis(base44, otomatis, { laporan_biaya_terakhir: periode });

    return Response.json({
      success: true,
      periode,
      total_pengeluaran: ini.total,
      jumlah_kura: jumlahKura,
      biaya_per_ekor: perEkor,
      biaya_per_ekor_bulan_lalu: perEkorLalu,
      wa_terkirim: wa,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
