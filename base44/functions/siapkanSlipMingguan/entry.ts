import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { getOtomatis, setOtomatis, wibNow, wibTanggal, notifSekali, userPerRole } from "../../shared/otomatis.ts";
import { sendWhatsAppNotification, getPhoneNumbersForRoles } from "../../shared/whatsapp.ts";

const PERAN_HARIAN = ["keeper", "kepala_feeder"];

function rupiah(n: number): string {
  return "Rp " + Math.round(n || 0).toLocaleString("id-ID");
}

/** Jam kerja dari check_in/check_out "HH:mm". */
function jamKerja(att: any): number {
  if (!att?.check_in || !att?.check_out) return 0;
  const [ih, im] = String(att.check_in).split(":").map(Number);
  const [oh, om] = String(att.check_out).split(":").map(Number);
  if ([ih, im, oh, om].some((x) => Number.isNaN(x))) return 0;
  return Math.max(0, (oh * 60 + om - ih * 60 - im) / 60);
}

/**
 * A5 — Siapkan angka slip mingguan, lalu ingatkan owner untuk menerbitkan.
 *
 * CATATAN PENTING soal batas fungsi ini, dan alasannya:
 *
 * Fungsi ini TIDAK menerbitkan slip gaji sendiri. Penerbitan slip mingguan di
 * aplikasi ini melewati satu keputusan yang memang milik manusia: berapa kasbon
 * yang dipotong minggu ini, dan kasbon mana yang dilewati (`kasbon_plan`
 * disebut "hasil konfirmasi owner" di skema). Memotong utang seseorang dari
 * gajinya secara otomatis bukan penghematan waktu, itu memindahkan keputusan
 * yang seharusnya diambil sadar.
 *
 * Jadi yang diotomatiskan adalah pekerjaan perakitannya: menghitung hari hadir,
 * jam lembur, poin, dan trip rempesan seluruh karyawan untuk minggu yang baru
 * selesai, lalu menyodorkan angkanya. Yang tersisa bagi owner adalah membuka
 * satu layar, menentukan potongan kasbon, dan menerbitkan.
 *
 * Perkiraan rupiah di sini adalah BRUTO sebelum potongan kasbon — sengaja,
 * supaya tidak terbaca sebagai angka final yang siap dibayar.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const otomatis = await getOtomatis(base44);

    if (otomatis.siapkan_slip_enabled !== true) {
      return Response.json({ skipped: "disabled" });
    }

    const wib = wibNow();
    const hariSetel = Number(otomatis.siapkan_slip_hari ?? 0);
    if (wib.getUTCDay() !== hariSetel) {
      return Response.json({ skipped: "bukan_harinya", hari_ini: wib.getUTCDay() });
    }

    // Minggu yang BARU SELESAI: Minggu lalu sampai Sabtu kemarin.
    const awalMingguIni = new Date(wib.getTime() - wib.getUTCDay() * 24 * 3600 * 1000);
    const awal = new Date(awalMingguIni.getTime() - 7 * 24 * 3600 * 1000);
    const akhir = new Date(awalMingguIni.getTime() - 1 * 24 * 3600 * 1000);
    const awalStr = wibTanggal(awal);
    const akhirStr = wibTanggal(akhir);

    if ((otomatis.siapkan_slip_terakhir || "") === awalStr) {
      return Response.json({ skipped: "sudah_kirim_minggu_ini", minggu: awalStr });
    }

    const hariMinggu: string[] = [];
    for (let i = 0; i < 7; i++) {
      hariMinggu.push(wibTanggal(new Date(awal.getTime() + i * 24 * 3600 * 1000)));
    }

    const [karyawan, absensi, checklists, rempesan, kasbons, konfigGaji, companySettings, slipAda] =
      await Promise.all([
        userPerRole(base44, PERAN_HARIAN),
        base44.asServiceRole.entities.Attendance.list("-date", 500),
        base44.asServiceRole.entities.DailyChecklist.list("-date", 500),
        base44.asServiceRole.entities.RempesanLog.list("-date", 300),
        base44.asServiceRole.entities.Kasbon.list("-created_date", 200),
        base44.asServiceRole.entities.SalaryConfig.list(),
        base44.asServiceRole.entities.CompanySettings.filter({ setting_key: "main" }),
        base44.asServiceRole.entities.SalarySlip.filter({ period: awalStr }),
      ]);

    if ((slipAda || []).length > 0) {
      await setOtomatis(base44, otomatis, { siapkan_slip_terakhir: awalStr });
      return Response.json({ skipped: "slip_sudah_ada", minggu: awalStr });
    }

    const nilaiPoinUmum = Number(companySettings?.[0]?.nilai_per_poin || 0);
    const dalamMinggu = (tgl: string) => tgl >= awalStr && tgl <= akhirStr;

    const baris: any[] = [];

    for (const k of karyawan || []) {
      const konfig: any = (konfigGaji || []).find((c: any) => c.role === k.role) || {};

      const absenSaya = (absensi || []).filter(
        (a: any) => a.employee_email === k.email && dalamMinggu(String(a.date || "")) && !a.is_test_data,
      );
      const hariHadir = absenSaya.filter((a: any) => a.status === "hadir").length;

      // Lembur dihitung per hari: kelebihan di atas 8 jam, lalu dibulatkan ke bawah.
      let lemburTotal = 0;
      for (const ds of hariMinggu) {
        const att = absenSaya.find((a: any) => a.date === ds);
        if (!att) continue;
        const hadir = att.status === "hadir" || (att.check_in && !att.status);
        if (!hadir) continue;
        const j = jamKerja(att);
        if (j > 8) lemburTotal += j - 8;
      }
      const jamLembur = Math.floor(lemburTotal);

      // Hanya checklist yang SUDAH DISETUJUI yang dihitung — persis seperti
      // WeeklySlipManager, yang benar-benar menerbitkan slipnya.
      //
      // Sebelumnya di sini dipakai `status !== "rejected"`, yang ikut
      // menghitung checklist yang masih menunggu persetujuan. Akibatnya pesan
      // ini menyebut angka rupiah yang lebih besar daripada slip yang nanti
      // benar-benar keluar, tanpa ada yang menjelaskan selisihnya.
      const checklistSaya = (checklists || []).filter(
        (c: any) =>
          c.employee_email === k.email &&
          dalamMinggu(String(c.date || "")) &&
          !c.is_test_data,
      );
      const poin = checklistSaya
        .filter((c: any) => c.status === "approved")
        .reduce((t: number, c: any) => t + Number(c.approved_points || c.total_points_claimed || 0), 0);

      // Yang masih menunggu disebut terpisah: poinnya belum masuk hitungan,
      // tetapi akan masuk bila disetujui sebelum slipnya diterbitkan.
      const menunggu = checklistSaya.filter((c: any) => c.status === "submitted");
      const poinMenunggu = menunggu.reduce(
        (t: number, c: any) => t + Number(c.approved_points || c.total_points_claimed || 0),
        0,
      );

      const tanggalRempesan = new Set(
        (rempesan || [])
          .filter(
            (r: any) =>
              r.employee_email === k.email &&
              dalamMinggu(String(r.date || "")) &&
              r.status !== "ditolak" &&
              r.status !== "rejected",
          )
          .map((r: any) => r.date),
      );
      const tripRempesan = tanggalRempesan.size;

      const sisaKasbon = (kasbons || [])
        .filter((x: any) => x.employee_email === k.email && x.status === "approved")
        .reduce((t: number, x: any) => t + Math.max(0, Number(x.amount || 0) - Number(x.total_paid || 0)), 0);

      const nilaiPoin = nilaiPoinUmum > 0 ? nilaiPoinUmum : Number(konfig.point_value || 0);
      const gajiPokok = hariHadir * Number(konfig.base_salary || 0);
      const upahLembur = jamLembur * Number(konfig.overtime_rate_per_hour || 0);
      const upahRempesan = tripRempesan * Number(konfig.rempesan_rate_per_trip || 0);
      const bonusPoin = poin * nilaiPoin;
      const bruto = gajiPokok + upahLembur + upahRempesan + bonusPoin;

      baris.push({
        nama: k.full_name || k.email,
        email: k.email,
        role: k.role,
        hariHadir,
        jamLembur,
        poin,
        jumlahMenunggu: menunggu.length,
        poinMenunggu,
        tripRempesan,
        gajiPokok,
        upahLembur,
        upahRempesan,
        bonusPoin,
        bruto,
        sisaKasbon,
        nilaiPoin,
      });
    }

    if (baris.length === 0) {
      await setOtomatis(base44, otomatis, { siapkan_slip_terakhir: awalStr });
      return Response.json({ success: true, tidak_ada_karyawan: true });
    }

    const totalBruto = baris.reduce((t, b) => t + b.bruto, 0);
    const adaKasbon = baris.filter((b) => b.sisaKasbon > 0);
    const konfigKosong = baris.filter((b) => b.gajiPokok === 0 && b.hariHadir > 0);

    const rincian = baris
      .map(
        (b) =>
          `*${b.nama}*\n` +
          `  ${b.hariHadir} hari hadir · ${b.poin} poin · ${b.jamLembur} jam lembur · ${b.tripRempesan} trip rempesan\n` +
          `  Pokok ${rupiah(b.gajiPokok)} + poin ${rupiah(b.bonusPoin)} + lembur ${rupiah(b.upahLembur)} + rempesan ${rupiah(b.upahRempesan)}\n` +
          `  *Bruto ${rupiah(b.bruto)}*` +
          (b.jumlahMenunggu > 0
            ? `\n  ⏳ ${b.jumlahMenunggu} checklist (${b.poinMenunggu} poin) masih menunggu persetujuan — setujui dulu bila ingin ikut terhitung`
            : "") +
          (b.sisaKasbon > 0 ? `\n  ⚠️ Sisa kasbon ${rupiah(b.sisaKasbon)} — potongannya Anda yang tentukan` : ""),
      )
      .join("\n\n");

    const pesan =
      `💰 *Slip minggu ${awalStr} s/d ${akhirStr} siap dibuat*\n\n` +
      rincian +
      `\n\nTotal bruto: *${rupiah(totalBruto)}*` +
      (adaKasbon.length > 0 ? `\n\n${adaKasbon.length} orang punya sisa kasbon — potongan belum dihitung di angka di atas.` : "") +
      (konfigKosong.length > 0
        ? `\n\n⚠️ Tarif harian belum diatur untuk: ${konfigKosong.map((b) => b.role).join(", ")} — angkanya jadi kurang.`
        : "") +
      `\n\nBuka *Rekap Poin & Gaji* untuk menerbitkan slip.`;

    const nomor = await getPhoneNumbersForRoles(base44, ["owner"]);
    let wa = false;
    if (nomor.length > 0) {
      const r = await sendWhatsAppNotification(base44, {
        targets: nomor,
        message: pesan.slice(0, 2000),
        notificationType: "siapkan_slip",
        relatedEntityId: `siapkan_slip_${awalStr}`,
      });
      wa = r.success;
    }

    for (const email of await (async () => (await userPerRole(base44, ["owner"])).map((u: any) => u.email))()) {
      await notifSekali(base44, {
        recipient_email: email,
        title: `Slip minggu ${awalStr} siap dibuat — bruto ${rupiah(totalBruto)}`,
        message: pesan.replace(/\*/g, "").slice(0, 900),
        type: "info",
        priority: "sedang",
        category: "keuangan",
        action_label: "Buka Rekap Poin & Gaji",
        action_url: "/rekap-poin-gaji",
        related_entity_id: `siapkan_slip_${awalStr}`,
        related_entity_type: "SalarySlip",
      });
    }

    await setOtomatis(base44, otomatis, { siapkan_slip_terakhir: awalStr });

    return Response.json({
      success: true,
      minggu: `${awalStr} s/d ${akhirStr}`,
      karyawan: baris.length,
      total_bruto: totalBruto,
      wa_terkirim: wa,
      rincian: baris,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
