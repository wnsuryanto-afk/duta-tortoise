/**
 * bayarInisiatifSurut — sekali pakai: membayar poin Inisiatif yang berhenti
 * dibayar pada 28 Juli 2026.
 *
 * ── Apa yang terjadi ────────────────────────────────────────────────────────
 *
 * `onMaintenanceDone` menyalin setiap MaintenanceLog menjadi satu baris di
 * `DailyChecklist.completed_tasks` — struktur yang dibaca slip gaji. Nilainya
 * diambil dari `poin_earned`, dan Inisiatif dibuat dengan nol. Sampai 12 Juli
 * baris itu berbunyi `log.poin_earned || 5`, jadi nol menjadi 5 dan DIBAYAR;
 * pada 28 Juli `||` diganti `??` — perbaikan yang benar, karena `||` membuat
 * nol yang DIPUTUSKAN penilai ikut tertimpa 5. Tetapi tidak ada yang
 * menggantikan 5 itu dengan penilaian sungguhan, karena tombol penilaiannya
 * tidak pernah dipakai satu kali pun. Sejak hari itu pekerjaan Inisiatif
 * dibayar nol: 210 catatan, dua orang.
 *
 * Pemilik memutuskan pada 7 Oktober 2026 untuk membayarkannya surut.
 *
 * ── Keputusan yang dipakai, dan alasannya ───────────────────────────────────
 *
 * TARIFNYA 5 POIN, bukan penilaian baru. Itu persis yang dibayarkan sistem ini
 * sendiri sampai 27 Juli. Menilai 210 catatan dengan angka baru berarti
 * mengarang 210 keputusan yang tidak pernah diambil siapa pun; memulihkan
 * tarif yang dulu berlaku tidak mengarang apa pun. Penilai tetap bisa
 * menaikkan catatan mana pun lewat layar Inisiatif, yang sekarang berfungsi.
 *
 * BATAS HARIAN TETAP BERLAKU. `poin_tambahan_maks_harian` (bawaan 30) dihitung
 * per orang per hari, dan poin Inisiatif yang SUDAH disetujui pada hari itu
 * ikut mengurangi kuota. Yang melewati batas tetap tercatat dinilai, dengan
 * poin yang terpotong dan alasannya tertulis.
 *
 * PEKERJAAN YANG SUDAH DIBAYAR LEWAT CHECKLIST TIDAK DIBAYAR DUA KALI.
 * Ujinya exact, bukan tebakan: bila checklist hari itu sudah punya baris LAIN
 * dengan judul yang sama persis (sesudah dinormalkan) dan poinnya di atas nol,
 * pekerjaannya sudah dibayar — catatan Inisiatifnya dinilai nol dengan alasan
 * yang tertulis. Contohnya "Siram tanaman", yang juga tugas SOP harian.
 *
 * `approved_points` DINAIKKAN pada checklist yang sudah disetujui, dan hanya
 * karena pemilik memerintahkannya. Itu angka yang sudah dibayar; menaikkannya
 * adalah pembayaran surut, bukan pembetulan catatan. Kenaikannya dilaporkan
 * per orang per bulan supaya bisa dicocokkan dengan slip.
 *
 * ── Cara pakai ──────────────────────────────────────────────────────────────
 *
 * Bawaannya KERING: tidak menulis apa pun, hanya melaporkan apa yang akan
 * terjadi. Kirim `{ "kering": false }` untuk benar-benar menulis. Aman
 * dijalankan dua kali: yang sudah dinilai tidak diambil lagi, karena
 * saringannya `approval_status: "pending"`.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { BATAS_AMBIL } from "../../shared/batas.ts";
import { kunciTugas } from "../../shared/kunciTugas.ts";
import { pasangKeBaris, rencanaHari } from "../../shared/bayarSurut.ts";

const DARI_BAWAAN = "2026-07-28";   // hari `||` menjadi `??`
const POIN_BAWAAN = 5;              // tarif yang dulu benar-benar dibayarkan
const MAKS_HARIAN_BAWAAN = 30;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Perlu masuk' }, { status: 401 });

    const badan = await req.json().catch(() => ({}));
    const kering = badan?.kering !== false;          // bawaan: tidak menulis
    const dari = badan?.dari || DARI_BAWAAN;
    const poinSatuan = Number(badan?.poin) > 0 ? Number(badan.poin) : POIN_BAWAAN;

    // Batas harian dibaca dari pengaturan, sama dengan yang dipakai layar.
    const setelan = await base44.asServiceRole.entities.CompanySettings.filter({ setting_key: "main" }, null, 5);
    const maksHarian = Number(setelan?.[0]?.poin_tambahan_maks_harian);
    const maks = Number.isFinite(maksHarian) && maksHarian >= 0 ? maksHarian : MAKS_HARIAN_BAWAAN;

    // ── 1. Catatan Inisiatif yang belum dinilai ──
    const semua = await base44.asServiceRole.entities.MaintenanceLog.filter({ is_extra: true }, "period_key", BATAS_AMBIL);
    const sasaran = (semua || [])
      .filter((l) => !l.is_test_data && !l.excluded_from_reports)
      .filter((l) => (l.period_key || "") >= dari)
      .filter((l) => !l.approval_status || l.approval_status === "pending")
      .filter((l) => l.done_by_email && l.period_key);

    // Poin Inisiatif yang SUDAH disetujui, untuk mengurangi kuota hari itu.
    const terpakai = new Map<string, number>();
    for (const l of semua || []) {
      if (l.is_test_data || l.excluded_from_reports) continue;
      if (l.approval_status !== "approved") continue;
      const k = `${l.done_by_email}__${l.period_key}`;
      terpakai.set(k, (terpakai.get(k) || 0) + (Number(l.poin_earned) || 0));
    }

    // ── 2. Checklist yang terkena, dibaca sekali ──
    const pasangan = [...new Set(sasaran.map((l) => `${l.done_by_email}__${l.period_key}`))];
    const semuaChecklist = await base44.asServiceRole.entities.DailyChecklist.list("-date", BATAS_AMBIL);
    const petaChecklist = new Map<string, Record<string, unknown>>();
    for (const c of semuaChecklist || []) {
      if (!c.employee_email || !c.date) continue;
      const k = `${c.employee_email}__${c.date}`;
      if (!petaChecklist.has(k)) petaChecklist.set(k, c);   // yang terbaru menang
    }

    const laporan = {
      kering,
      dari,
      poinSatuan,
      maksHarian: maks,
      catatan: { diperiksa: sasaran.length, dibayar: 0, nolKarenaSudahDibayar: 0, nolKarenaKuota: 0, terpotongKuota: 0 },
      poinPerOrangPerBulan: {} as Record<string, Record<string, number>>,
      checklist: { diubah: 0, tanpaBaris: 0, tanpaChecklist: 0, approvedDinaikkan: 0 },
      rincianTidakDibayar: [] as Array<Record<string, unknown>>,
      galat: [] as string[],
    };

    const tambahLaporan = (email: string, tanggal: string, poin: number) => {
      const bulan = String(tanggal).slice(0, 7);
      laporan.poinPerOrangPerBulan[email] = laporan.poinPerOrangPerBulan[email] || {};
      laporan.poinPerOrangPerBulan[email][bulan] = (laporan.poinPerOrangPerBulan[email][bulan] || 0) + poin;
    };

    const stempel = new Date().toISOString();
    const catatanPenilaian =
      `Pembayaran surut ${stempel.slice(0, 10)}: poin Inisiatif berhenti dibayar sejak 28 Juli 2026 ` +
      `karena cacat kode, bukan karena keputusan. Dinilai ${poinSatuan} poin — tarif yang berlaku sebelum tanggal itu.`;

    // ── 3. Per pasangan orang+hari, supaya kuota dan baris checklist konsisten ──
    for (const kunci of pasangan) {
      const [email, tanggal] = kunci.split("__");
      const logs = sasaran
        .filter((l) => l.done_by_email === email && l.period_key === tanggal)
        .sort((a, b) => String(a.done_at || "").localeCompare(String(b.done_at || "")));

      const checklist = petaChecklist.get(kunci);
      const barisAwal = Array.isArray(checklist?.completed_tasks)
        ? checklist.completed_tasks as Array<Record<string, unknown>>
        : [];

      /*
        Seluruh keputusan uangnya ada di shared/bayarSurut.ts — tanpa jaringan,
        dan diuji penjaga dengan kasus nyata. Yang ada di sini hanya penulisan.
      */
      const { keputusan, perJudul } = rencanaHari({
        logs,
        baris: barisAwal,
        maks,
        terpakai: terpakai.get(kunci) || 0,
        poinSatuan,
      });

      for (const k of keputusan) {
        if (k.sebab === "dibayar") laporan.catatan.dibayar++;
        else if (k.sebab === "kuota-terpotong") { laporan.catatan.dibayar++; laporan.catatan.terpotongKuota++; }
        else if (k.sebab === "sudah-dibayar") laporan.catatan.nolKarenaSudahDibayar++;
        else if (k.sebab === "kuota-habis") laporan.catatan.nolKarenaKuota++;

        if (k.poin > 0) tambahLaporan(email, tanggal, k.poin);
        else laporan.rincianTidakDibayar.push({ id: k.id, judul: k.judul, email, tanggal, alasan: k.alasan });

        if (!kering) {
          try {
            await base44.asServiceRole.entities.MaintenanceLog.update(k.id, {
              approval_status: k.poin > 0 ? "approved" : "rejected",
              menunggu_penilaian: false,
              poin_earned: k.poin,
              approved_by: "Pemilik (pembayaran surut)",
              poin_dinilai_oleh: user.email || "",
              approved_at: stempel,
              penilaian_note: [catatanPenilaian, k.alasan].filter(Boolean).join(" "),
            });
          } catch (e) {
            laporan.galat.push(`MaintenanceLog ${k.id}: ${e?.message || e}`);
          }
        }
      }

      // ── 4. Baris checklist: poinnya dipasang, totalnya dihitung ulang ──
      if (perJudul.size === 0) continue;
      if (!checklist) { laporan.checklist.tanpaChecklist += perJudul.size; continue; }

      const { baris, selisih, berubah, tanpaBaris, total } = pasangKeBaris(barisAwal, perJudul);
      laporan.checklist.tanpaBaris += tanpaBaris;
      if (berubah === 0) continue;

      const perubahan: Record<string, unknown> = { completed_tasks: baris, total_points_claimed: total };
      // Checklist yang sudah disetujui: `approved_points` adalah angka yang
      // dibayar, jadi ia dinaikkan sebesar selisihnya — ini pembayaran surut
      // yang diperintahkan pemilik, bukan pembetulan catatan.
      if (checklist.status === "approved") {
        perubahan.approved_points = (Number(checklist.approved_points) || 0) + selisih;
        laporan.checklist.approvedDinaikkan++;
      }
      laporan.checklist.diubah++;

      if (!kering) {
        try {
          await base44.asServiceRole.entities.DailyChecklist.update(checklist.id as string, perubahan);
        } catch (e) {
          laporan.galat.push(`DailyChecklist ${checklist.id}: ${e?.message || e}`);
        }
      }
    }

    // Rincian yang tidak dibayar dipotong supaya jawabannya tetap terbaca;
    // jumlahnya tetap utuh di `catatan`.
    if (laporan.rincianTidakDibayar.length > 40) {
      laporan.rincianTidakDibayar = laporan.rincianTidakDibayar.slice(0, 40);
    }

    return Response.json({ ok: true, ...laporan });
  } catch (e) {
    return Response.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
});
