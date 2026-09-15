import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { getOtomatis, setOtomatis, wibTanggal, wibNow, sudahWaktunya, notifSekali, emailPerRole } from "../../shared/otomatis.ts";
import { sendWhatsAppNotification, getSettings, getEmployeePhone } from "../../shared/whatsapp.ts";
import { masukLaporan } from "../../shared/laporan.ts";
import { STATUS_KELUAR } from "../../shared/kura.ts";
import { BATAS_AMBIL } from "../../shared/batas.ts";


/**
 * A12 — Laporan kebersihan data mingguan, dikirim ke admin (bukan ke owner).
 *
 * Halaman kelengkapan data sudah ada, tapi harus dibuka orang untuk berguna —
 * dan tidak pernah dibuka. Di sini pemeriksaannya berjalan sendiri tiap pekan
 * dan hasilnya mendatangi orang yang bertugas merapikannya.
 *
 * Yang diperiksa: kura tanpa data wajib, item gudang duplikat, stok pakan
 * tanpa kebutuhan harian (yang membuat alarm belanja tidak pernah bunyi),
 * profil pembeli tanpa kontak, dan karyawan tanpa data rekening.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const otomatis = await getOtomatis(base44);

    if (otomatis.higiene_data_enabled !== true) {
      return Response.json({ skipped: "disabled" });
    }

    const hariIni = wibTanggal();
    if ((otomatis.higiene_terakhir || "").slice(0, 10) === hariIni) {
      return Response.json({ skipped: "sudah_kirim_hari_ini" });
    }
    const hariSetel = Number(otomatis.higiene_hari ?? 1);
    if (wibNow().getUTCDay() !== hariSetel) {
      return Response.json({ skipped: "bukan_harinya", hari_ini: wibNow().getUTCDay(), hari_setel: hariSetel });
    }
    // Jadwal per jam: tanpa pagar jam, jalan pertama tiap Senin jatuh 00:25 WIB.
    if (!sudahWaktunya(otomatis.higiene_jam, "08:00")) {
      return Response.json({ skipped: "belum_jamnya" });
    }

    const [tortoises, gudang, pakan, pembeli, users] = await Promise.all([
      base44.asServiceRole.entities.Tortoise.list("name", 2000),
      base44.asServiceRole.entities.WarehouseItem.list("name", 500),
      base44.asServiceRole.entities.FeedStock.list("name", 200),
      base44.asServiceRole.entities.BuyerProfile.list("-created_date", 200),
      base44.asServiceRole.entities.User.list(null, BATAS_AMBIL),
    ]);

    const temuan: string[] = [];

    // 1. Kura dengan data wajib kosong.
    const kuraAktif = (tortoises || []).filter(
      (t: any) => t && !t.is_archived && !STATUS_KELUAR.includes(t.status),
    );
    const kuraKurang = kuraAktif.filter((t: any) => {
      const adaFoto = !!t.photo_url || (Array.isArray(t.photos) && t.photos.length > 0);
      const adaBerat = Number(t.weight_grams || 0) > 0;
      const adaKandang = !!t.enclosure;
      return !adaFoto || !adaBerat || !adaKandang;
    });
    if (kuraKurang.length > 0) {
      temuan.push(
        `${kuraKurang.length} kura belum lengkap (foto/berat/kandang): ` +
        kuraKurang.slice(0, 8).map((t: any) => t.name || t.code || t.id).join(", ") +
        (kuraKurang.length > 8 ? ", ..." : ""),
      );
    }

    /*
     * 2. Item gudang duplikat.
     *
     * Diperbaiki 15-09-2026. Versi lama menghitung 23 duplikat tiap pekan, dan
     * ke-23-nya sudah beres:
     *
     *   3 item bernama "[DUPLIKAT - ABAIKAN]" dengan SKU ZZZ-DUP dan
     *     is_active: false — itu bentuk pensiunnya, bukan masalahnya.
     *   20 item bernama gabungan seperti "NaCl 0.9% / NaCl 0.9% Flakon Kecil
     *     100ml" — itu justru CARA dua duplikat digabung. Menghitungnya sebagai
     *     duplikat membuat laporan ini makin berisik setiap kali ada yang
     *     merapikan gudang.
     *
     * Laporan yang salah tidak dikerjakan orang. Itu sebabnya angka 23 muncul
     * berbulan-bulan tanpa pernah turun. Sekarang yang dihitung hanya duplikat
     * yang benar-benar tersisa: dua item AKTIF dengan nama sama setelah
     * dinormalkan, atau SKU yang bertabrakan.
     */
    const aktifGudang = (gudang || []).filter(
      (i: any) => i && i.is_active !== false && !String(i.sku || "").startsWith("ZZZ-DUP"),
    );

    const namaKe = new Map<string, string[]>();
    for (const i of aktifGudang) {
      // Nama gabungan "A / B" dipecah: tiap sisi dibandingkan sendiri, supaya
      // item ketiga yang benar-benar kembar dengan salah satu sisi tetap
      // tertangkap, tanpa menuduh gabungannya sendiri.
      // Satu item hanya boleh menyumbang satu kali per kunci. Tanpa ini,
      // "Kasa Basah / Kasa Lembab Steril / Kasa basah" menuduh dirinya sendiri
      // kembar, karena dua sisinya sama setelah dinormalkan.
      const kunciItem = new Set<string>();
      for (const sisi of String(i.name || "").split(" / ")) {
        const kunci = sisi.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (kunci) kunciItem.add(kunci);
      }
      for (const kunci of kunciItem) {
        if (!namaKe.has(kunci)) namaKe.set(kunci, []);
        namaKe.get(kunci)!.push(String(i.name || i.id));
      }
    }
    const dupNama = [...namaKe.entries()].filter(([, v]) => v.length > 1);

    const skuKe = new Map<string, number>();
    for (const i of aktifGudang) {
      const s2 = String(i.sku || "").trim().toUpperCase();
      if (!s2) continue;
      skuKe.set(s2, (skuKe.get(s2) || 0) + 1);
    }
    const dupSku = [...skuKe.entries()].filter(([, n]) => n > 1);

    if (dupNama.length > 0 || dupSku.length > 0) {
      const contoh = dupNama.slice(0, 4).map(([, v]) => v.join(" = ")).join("; ");
      temuan.push(
        `${dupNama.length + dupSku.length} duplikat gudang yang masih aktif` +
        (dupSku.length > 0 ? ` (${dupSku.length} SKU bertabrakan: ${dupSku.slice(0, 3).map(([x]) => x).join(", ")})` : "") +
        (contoh ? ` — contoh: ${contoh}` : ""),
      );
    }

    // 3. Stok pakan tanpa kebutuhan harian — inilah sebabnya alarm belanja diam.
    const pakanTanpaIdeal = (pakan || []).filter((f: any) => !(Number(f.daily_ideal || 0) > 0));
    if (pakanTanpaIdeal.length > 0) {
      temuan.push(
        `${pakanTanpaIdeal.length} item pakan belum punya kebutuhan harian, ` +
        `sehingga peringatan belanja tidak bisa bekerja: ` +
        pakanTanpaIdeal.slice(0, 8).map((f: any) => f.name).join(", "),
      );
    }

    // 4. Profil pembeli tanpa kontak.
    const pembeliKurang = (pembeli || []).filter((b: any) => !(b.whatsapp || b.hp_whatsapp || b.phone));
    if (pembeliKurang.length > 0) {
      temuan.push(`${pembeliKurang.length} profil pembeli tanpa nomor WhatsApp`);
    }

    // 5. Karyawan aktif tanpa data rekening (menghambat pembayaran gaji).
    const karyawan = (users || []).filter(
      (u: any) => u.role && !["kicked", "investor"].includes(u.role),
    );
    const profil = await base44.asServiceRole.entities.UserProfile.list(null, BATAS_AMBIL);
    const profilPerEmail = new Map((profil || []).map((p: any) => [p.email || p.user_email, p]));
    const tanpaRekening = karyawan.filter((u: any) => {
      const p: any = profilPerEmail.get(u.email);
      return !p || !p.bank_account_number;
    });
    if (tanpaRekening.length > 0) {
      temuan.push(
        `${tanpaRekening.length} karyawan belum punya data rekening: ` +
        tanpaRekening.map((u: any) => u.full_name || u.email).join(", "),
      );
    }

    // 6. Bulan berjalan tanpa catatan gaji.
    //
    // Ini pemeriksaan yang paling sering menyelamatkan laporan, dan justru yang
    // paling tidak terlihat. Data yang SALAH menonjol cepat: angkanya aneh, ada
    // yang protes. Data yang TIDAK ADA tidak menonjol sama sekali - laporan
    // laba/rugi tetap tampil rapi dengan total yang lebih kecil, dan justru
    // terbaca sebagai kabar baik.
    //
    // Nyatanya pernah terjadi: gaji terakhir tercatat 4 Juli, lalu dua bulan
    // penuh berlalu tanpa satu pun catatan gaji meski tim tetap bekerja dan
    // tetap dibayar - sekitar Rp 9 juta hilang dari laporan tanpa satu pun
    // peringatan. Karena itu yang diperiksa bukan "apakah angkanya masuk akal",
    // melainkan "apakah ada catatannya sama sekali".
    try {
      const bulanIni = hariIni.slice(0, 7);
      const [tx, slip] = await Promise.all([
        base44.asServiceRole.entities.FinanceTransaction.list("-date", 500),
        base44.asServiceRole.entities.SalarySlip.list("-period", 100),
      ]);
      const adaTxGaji = (tx || []).some(
        (t: any) =>
          String(t.date || "").startsWith(bulanIni) &&
          ["gaji", "gaji_karyawan"].includes(t.category) &&
          masukLaporan(t),
      );
      const adaSlipDibayar = (slip || []).some(
        (s: any) => s.period === bulanIni && s.status === "paid" && masukLaporan(s),
      );
      if (!adaTxGaji && !adaSlipDibayar) {
        temuan.push(
          `Belum ada satu pun catatan gaji untuk bulan ${bulanIni}. Selama tidak dicatat, ` +
          `laporan laba/rugi dan biaya per ekor menghitung gaji sebagai nol - labanya ` +
          `terlihat lebih besar daripada yang sebenarnya.`,
        );
      }
    } catch { /* pemeriksaan tambahan tidak boleh menggagalkan yang lain */ }

    if (temuan.length === 0) {
      await setOtomatis(base44, otomatis, { higiene_terakhir: hariIni });
      return Response.json({ success: true, bersih: true });
    }

    const isi = temuan.map((t, i) => `${i + 1}. ${t}`).join("\n\n");

    // Notifikasi ke admin (atau PJ administrasi bila sudah ditunjuk).
    const settings = await getSettings(base44);
    const pj = settings?.pic_administrasi;
    const penerima = pj ? [pj] : await emailPerRole(base44, ["admin"]);

    let notif = 0;
    for (const email of penerima) {
      const ok = await notifSekali(base44, {
        recipient_email: email,
        title: `Kebersihan data mingguan — ${temuan.length} hal perlu dirapikan`,
        message: isi.slice(0, 900),
        type: "info",
        priority: "sedang",
        category: "sistem",
        recipient_role: "admin",
        action_label: "Buka Kelengkapan Data",
        action_url: "/incomplete-data",
        related_entity_id: `higiene_${hariIni}`,
        related_entity_type: "sistem",
      });
      if (ok) notif++;
    }

    // Sekalian kirim ke WhatsApp PJ bila nomornya ada.
    let waTerkirim = false;
    for (const email of penerima) {
      const nomor = await getEmployeePhone(base44, email);
      if (!nomor) continue;
      const r = await sendWhatsAppNotification(base44, {
        targets: [nomor],
        message: `🧹 *Kebersihan Data Mingguan*\n\n${isi}`.slice(0, 1500),
        notificationType: "higiene_data",
        relatedEntityId: `higiene_${hariIni}`,
      });
      if (r.success) waTerkirim = true;
    }

    await setOtomatis(base44, otomatis, { higiene_terakhir: hariIni });

    return Response.json({ success: true, temuan: temuan.length, notifikasi: notif, wa: waTerkirim, detail: temuan });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
